import { EventProcessor, ProcessableEvent } from "./eventProcessor";
import { Cache } from "../utils/cache/cache";
import { EventDispatcher, EventDispatcherResponse, EventV1Request } from "./eventDispatcher";
import { formatEvents } from "../core/event_builder/build_event_v1";
import { BackoffController, ExponentialBackoff, IntervalRepeater, Repeater } from "../utils/repeater/repeater";
import { LoggerFacade } from "../modules/logging";
import { BaseService, ServiceState } from "../service";
import { Consumer, Fn, Producer } from "../utils/type";
import { RunResult, runWithRetry } from "../utils/executor/backoff_retry_runner";
import { isSuccessStatusCode } from "../utils/http_request_handler/http_util";
import { EventEmitter } from "../utils/event_emitter/event_emitter";
import { IdGenerator } from "../utils/id_generator";

export type EventWithId = {
  id: string;
  event: ProcessableEvent;
};

export type RetryConfig = {
  retry: false;
} | {
  retry: true;
  maxRetries?: number;
  backoffProvider: Producer<BackoffController>;
}

export type QueueingEventProcessorConfig = {
  dispatchRepeater: Repeater,
  failedEventRepeater?: Repeater,
  maxQueueSize: number,
  eventStore?: Cache<EventWithId>,
  eventDispatcher: EventDispatcher,
  closingEventDispatcher?: EventDispatcher,
  logger?: LoggerFacade,
  retryMinBackoff?: number,
  retryMaxBackoff?: number,
  retryConfig?: RetryConfig;
};

type EventBatch = {
  request: EventV1Request,
  ids: string[],
}

export class QueueingEventProcessor extends BaseService implements EventProcessor {
  private eventDispatcher: EventDispatcher;
  private closingEventDispatcher?: EventDispatcher;
  private eventQueue: EventWithId[] = [];
  private maxQueueSize: number;
  private eventStore?: Cache<EventWithId>;
  private dispatchRepeater: Repeater;
  private failedEventRepeater?: Repeater;
  private idGenerator: IdGenerator = new IdGenerator();
  private runningTask: Map<string, RunResult<EventDispatcherResponse>> = new Map();
  private activeEventIds: Set<string> = new Set();
  private logger?: LoggerFacade;
  private eventEmitter: EventEmitter<{ dispatch: EventV1Request }> = new EventEmitter();
  private retryConfig?: RetryConfig;

  constructor(config: QueueingEventProcessorConfig) {
    super();
    this.eventDispatcher = config.eventDispatcher;
    this.closingEventDispatcher = config.closingEventDispatcher;
    this.maxQueueSize = config.maxQueueSize;
    this.eventStore = config.eventStore;
    this.logger = config.logger;
    this.retryConfig = config.retryConfig;

    this.dispatchRepeater = config.dispatchRepeater;
    this.dispatchRepeater.setTask(() => this.flush());

    this.failedEventRepeater = config.failedEventRepeater;
    this.failedEventRepeater?.setTask(() => this.retryFailedEvents());    
  }

  onDispatch(handler: Consumer<EventV1Request>): Fn {
    return this.eventEmitter.on('dispatch', handler);
  }

  public async retryFailedEvents(): Promise<void> {
    const failedEvents = await this.eventStore?.getAll();
    if (!failedEvents) {
      return;
    }

    if (failedEvents.size == 0) {
      return;
    }

    const failedEventsArray = Array.from(failedEvents.values()).sort();

    let batches: EventBatch[] = [];
    let currentBatch: EventWithId[] = [];

    failedEventsArray.forEach((event) => {
      if (!this.activeEventIds.has(event.id)) {
        currentBatch.push(event);
        if (currentBatch.length === this.maxQueueSize) {
          batches.push({
            request: formatEvents(currentBatch.map((e) => e.event)),
            ids: currentBatch.map((e) => e.id),
          });
          currentBatch = [];
        }
      }
    });

    if (currentBatch.length > 0) {
      batches.push({
        request: formatEvents(currentBatch.map((e) => e.event)),
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
    let ids: string[] = [];

    this.eventQueue.forEach((event) => {
      events.push(event.event);
      ids.push(event.id);
    });

    this.eventQueue = [];
    return { request: formatEvents(events), ids };
  }

  private async executeDispatch(request: EventV1Request, closing = false): Promise<EventDispatcherResponse> {
    const dispatcher = closing && this.closingEventDispatcher ? this.closingEventDispatcher : this.eventDispatcher;
    return dispatcher.dispatchEvent(request).then((res) => {
      if (res.statusCode && !isSuccessStatusCode(res.statusCode)) {
        return Promise.reject(new Error(`Failed to dispatch events: ${res.statusCode}`));
      }
      return Promise.resolve(res);
    });
  }

  private dispatchBatch(batch: EventBatch, closing: boolean): void {
    const { request, ids } = batch;

    const runResult: RunResult<EventDispatcherResponse> = this.retryConfig?.retry
      ? runWithRetry(
        () => this.executeDispatch(request, closing), this.retryConfig.backoffProvider(), this.retryConfig.maxRetries
      ) : {
        result: this.executeDispatch(request, closing),
        cancelRetry: () => {},
      };

    this.eventEmitter.emit('dispatch', request);

    const taskId = this.idGenerator.getId();
    this.runningTask.set(taskId, runResult);

    console.log(runResult);

    runResult.result.then((res) => {
      ids.forEach((id) => {
        this.activeEventIds.delete(id);
        this.eventStore?.remove(id);
      });
      return Promise.resolve();
    }).catch((err) => {
      // if the dispatch fails, the events will still be
      // in the store for future processing
      this.logger?.error('Failed to dispatch events', err);
    }).finally(() => {
      this.runningTask.delete(taskId);
      ids.forEach((id) => this.activeEventIds.delete(id));
    });
  }

  private async flush(closing = false): Promise<void> {
    const batch = this.createNewBatch();
    if (!batch) {
      return;
    }

    this.dispatchBatch(batch, closing);
  }

  async process(event: ProcessableEvent): Promise<void> {
    if (this.eventQueue.length == this.maxQueueSize) {
      this.flush();
    }

    const eventWithId = {
      id: this.idGenerator.getId(),
      event: event,
    };
    
    await this.eventStore?.set(eventWithId.id, eventWithId);
    this.activeEventIds.add(eventWithId.id);
    this.eventQueue.push(eventWithId);
  }

  start(): void {
    if (!this.isNew()) {
      return;
    }
    this.state = ServiceState.Running;
    this.dispatchRepeater.start();
    this.failedEventRepeater?.start();

    this.retryFailedEvents();
    this.startPromise.resolve();
  }

  stop(): void {
    if (this.isDone()) {
      return;
    }

    if (this.isNew()) {
      // TOOD: replace message with imported constants
      this.startPromise.reject(new Error('Event processor stopped before it could be started'));
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
