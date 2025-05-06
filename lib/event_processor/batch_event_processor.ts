/**
 * Copyright 2024, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { EventProcessor, ProcessableEvent } from "./event_processor";
import { Cache } from "../utils/cache/cache";
import { EventDispatcher, EventDispatcherResponse, LogEvent } from "./event_dispatcher/event_dispatcher";
import { buildLogEvent } from "./event_builder/log_event";
import { BackoffController, ExponentialBackoff, IntervalRepeater, Repeater } from "../utils/repeater/repeater";
import { LoggerFacade } from '../logging/logger';
import { BaseService, ServiceState, StartupLog } from "../service";
import { Consumer, Fn, Producer } from "../utils/type";
import { RunResult, runWithRetry } from "../utils/executor/backoff_retry_runner";
import { isSuccessStatusCode } from "../utils/http_request_handler/http_util";
import { EventEmitter } from "../utils/event_emitter/event_emitter";
import { IdGenerator } from "../utils/id_generator";
import { areEventContextsEqual } from "./event_builder/user_event";
import { FAILED_TO_DISPATCH_EVENTS, SERVICE_NOT_RUNNING } from "error_message";
import { OptimizelyError } from "../error/optimizly_error";
import { sprintf } from "../utils/fns";
import { SERVICE_STOPPED_BEFORE_RUNNING } from "../service";

export const DEFAULT_MIN_BACKOFF = 1000;
export const DEFAULT_MAX_BACKOFF = 32000;

export type EventWithId = {
  id: string;
  event: ProcessableEvent;
};

export type RetryConfig = {
  maxRetries?: number;
  backoffProvider: Producer<BackoffController>;
}

export type BatchEventProcessorConfig = {
  dispatchRepeater: Repeater,
  failedEventRepeater?: Repeater,
  batchSize: number,
  eventStore?: Cache<EventWithId>,
  eventDispatcher: EventDispatcher,
  closingEventDispatcher?: EventDispatcher,
  logger?: LoggerFacade,
  retryConfig?: RetryConfig;
  startupLogs?: StartupLog[];
};

type EventBatch = {
  request: LogEvent,
  ids: string[],
}

export const LOGGER_NAME = 'BatchEventProcessor';

export class BatchEventProcessor extends BaseService implements EventProcessor {
  private eventDispatcher: EventDispatcher;
  private closingEventDispatcher?: EventDispatcher;
  private eventQueue: EventWithId[] = [];
  private batchSize: number;
  private eventStore?: Cache<EventWithId>;
  private dispatchRepeater: Repeater;
  private failedEventRepeater?: Repeater;
  private idGenerator: IdGenerator = new IdGenerator();
  private runningTask: Map<string, RunResult<EventDispatcherResponse>> = new Map();
  private dispatchingEventIds: Set<string> = new Set();
  private eventEmitter: EventEmitter<{ dispatch: LogEvent }> = new EventEmitter();
  private retryConfig?: RetryConfig;

  constructor(config: BatchEventProcessorConfig) {
    super(config.startupLogs);
    this.eventDispatcher = config.eventDispatcher;
    this.closingEventDispatcher = config.closingEventDispatcher;
    this.batchSize = config.batchSize;
    this.eventStore = config.eventStore;
    this.retryConfig = config.retryConfig;

    this.dispatchRepeater = config.dispatchRepeater;
    this.dispatchRepeater.setTask(() => this.flush());

    this.failedEventRepeater = config.failedEventRepeater;
    this.failedEventRepeater?.setTask(() => this.retryFailedEvents());
    if (config.logger) {
      this.setLogger(config.logger);
    }
  }

  setLogger(logger: LoggerFacade): void {
    this.logger = logger;
    this.logger.setName(LOGGER_NAME);
  }

  onDispatch(handler: Consumer<LogEvent>): Fn {
    return this.eventEmitter.on('dispatch', handler);
  }

  public async retryFailedEvents(): Promise<void> {
    if (!this.eventStore) {
      return;
    }

    const keys = (await this.eventStore.getKeys()).filter(
      (k) => !this.dispatchingEventIds.has(k) && !this.eventQueue.find((e) => e.id === k)
    );

    const events = await this.eventStore.getBatched(keys);
    const failedEvents: EventWithId[] = [];
    events.forEach((e) => {
      if(e) {
        failedEvents.push(e);
      }
    });

    if (failedEvents.length == 0) { 
      return;
    }

    failedEvents.sort((a, b) => a.id < b.id ? -1 : 1);

    const batches: EventBatch[] = [];
    let currentBatch: EventWithId[] = [];

    failedEvents.forEach((event) => {
      if (currentBatch.length === this.batchSize ||
           (currentBatch.length > 0 && !areEventContextsEqual(currentBatch[0].event, event.event))) {
        batches.push({
          request: buildLogEvent(currentBatch.map((e) => e.event)),
          ids: currentBatch.map((e) => e.id),
        });
        currentBatch = [];
      }
      currentBatch.push(event);
    });

    if (currentBatch.length > 0) {
      batches.push({
        request: buildLogEvent(currentBatch.map((e) => e.event)),
        ids: currentBatch.map((e) => e.id),
      });
    }

    batches.forEach((batch) => {
      this.dispatchBatch(batch, false);
    });
  }

  private createNewBatch(): EventBatch | undefined {
    if (this.eventQueue.length == 0) {
      return
    }
    
    const events: ProcessableEvent[] = [];
    const ids: string[] = [];

    this.eventQueue.forEach((event) => {
      events.push(event.event);
      ids.push(event.id);
    });

    this.eventQueue = [];
    return { request: buildLogEvent(events), ids };
  }

  private async executeDispatch(request: LogEvent, closing = false): Promise<EventDispatcherResponse> {
    const dispatcher = closing && this.closingEventDispatcher ? this.closingEventDispatcher : this.eventDispatcher;
    return dispatcher.dispatchEvent(request).then((res) => {
      if (res.statusCode && !isSuccessStatusCode(res.statusCode)) {
        return Promise.reject(new OptimizelyError(FAILED_TO_DISPATCH_EVENTS, res.statusCode));
      }
      return Promise.resolve(res);
    });
  }

  private dispatchBatch(batch: EventBatch, closing: boolean): void {
    const { request, ids } = batch;
    
    ids.forEach((id) => {
      this.dispatchingEventIds.add(id);
    });

    const runResult: RunResult<EventDispatcherResponse> = this.retryConfig
      ? runWithRetry(
        () => this.executeDispatch(request, closing), this.retryConfig.backoffProvider(), this.retryConfig.maxRetries
      ) : {
        result: this.executeDispatch(request, closing),
        cancelRetry: () => {},
      };

    this.eventEmitter.emit('dispatch', request);

    const taskId = this.idGenerator.getId();
    this.runningTask.set(taskId, runResult);

    runResult.result.then((res) => {
      ids.forEach((id) => {
        this.dispatchingEventIds.delete(id);
        this.eventStore?.remove(id);
      });
      return Promise.resolve();
    }).catch((err) => {
      // if the dispatch fails, the events will still be
      // in the store for future processing
      this.logger?.error(err);
    }).finally(() => {
      this.runningTask.delete(taskId);
      ids.forEach((id) => this.dispatchingEventIds.delete(id));
    });
  }

  private async flush(closing = false): Promise<void> {
    const batch = this.createNewBatch();
    if (!batch) {
      return;
    }
    
    this.dispatchRepeater.reset();
    this.dispatchBatch(batch, closing);
  }

  async process(event: ProcessableEvent): Promise<void> {
    if (!this.isRunning()) {
      return Promise.reject(new OptimizelyError(SERVICE_NOT_RUNNING, 'BatchEventProcessor'));
    }

    const eventWithId = {
      id: this.idGenerator.getId(),
      event: event,
    };
    
    await this.eventStore?.set(eventWithId.id, eventWithId);
    
    if (this.eventQueue.length > 0 && !areEventContextsEqual(this.eventQueue[0].event, event)) {
      this.flush();
    }

    this.eventQueue.push(eventWithId); 

    if (this.eventQueue.length == this.batchSize) {
      this.flush();
    } else if (!this.dispatchRepeater.isRunning()) {
      this.dispatchRepeater.start();
    }

  }

  start(): void {
    if (!this.isNew()) {
      return;
    }

    super.start();
    this.state = ServiceState.Running;
    
    if(!this.disposable) {
      this.failedEventRepeater?.start();
    }

    this.retryFailedEvents();
    this.startPromise.resolve();
  }

  makeDisposable(): void {
    super.makeDisposable();
    this.batchSize = 1;
    this.retryConfig = {
      maxRetries: Math.min(this.retryConfig?.maxRetries ?? 5, 5),
      backoffProvider:
        this.retryConfig?.backoffProvider ||
        (() => new ExponentialBackoff(DEFAULT_MIN_BACKOFF, DEFAULT_MAX_BACKOFF, 500)),
    }
  }

  stop(): void {
    if (this.isDone()) {
      return;
    }

    if (this.isNew()) {
      this.startPromise.reject(new Error(
        sprintf(SERVICE_STOPPED_BEFORE_RUNNING, 'BatchEventProcessor')
      ));
    }

    this.state = ServiceState.Stopping;
    this.dispatchRepeater.stop();
    this.failedEventRepeater?.stop();

    this.flush(true);
    this.runningTask.forEach((task) => task.cancelRetry());

    Promise.allSettled(Array.from(this.runningTask.values()).map((task) => task.result)).then(() => {
      this.state = ServiceState.Terminated;
      this.stopPromise.resolve();
    });
  }
}
