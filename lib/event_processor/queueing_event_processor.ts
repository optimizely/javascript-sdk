import { EventProcessor, ProcessableEvent } from "./eventProcessor";
import { Cache } from "../utils/cache/cache";
import { EventDispatcher, EventDispatcherResponse, EventV1Request } from "./eventDispatcher";
import { formatEvents } from "../core/event_builder/build_event_v1";
import { ExponentialBackoff, IntervalRepeater, Repeater } from "../utils/repeater/repeater";
import { LoggerFacade } from "../modules/logging";
import { BaseService, ServiceState } from "../service";
import { Consumer, Fn } from "../utils/type";
import { RunResult, runWithRetry } from "../utils/executor/backoff_retry_runner";
import { isSuccessStatusCode } from "../utils/http_request_handler/http_util";
import { EventEmitter } from "../utils/event_emitter/event_emitter";

export type EventWithId = {
  id: string;
  event: ProcessableEvent;
};

export type QueueingEventProcessorConfig = {
  flushInterval: number,
  maxQueueSize: 1000,
  eventStore: Cache<EventWithId>,
  eventDispatcher: EventDispatcher,
  closingEventDispatcher?: EventDispatcher,
  logger?: LoggerFacade,
  retryMinBackoff?: number,
  retryMaxBackoff?: number,
  maxRetries?: number,
};

type EventBatch = {
  request: EventV1Request,
  ids: string[],
}

const DEFAULT_RETRY_MIN_BACKOFF = 1000;
const DEFAULT_RETRY_MAX_BACKOFF = 30000;

export class QueueingEventProcessor extends BaseService implements EventProcessor {
  private eventDispatcher: EventDispatcher;
  private closingEventDispatcher?: EventDispatcher;
  private eventQueue: Queue<EventWithId> = new Queue(1000);
  private maxQueueSize: number = 1000;
  private flushInterval: number = 1000;
  private eventStore?: Cache<EventWithId>;
  private dispatchRepeater: Repeater;
  private failedEventRepeater: Repeater;
  private idGenerator: IdGenerator = new IdGenerator();
  private runningTask: Map<string, RunResult<EventDispatcherResponse>> = new Map();
  private dispatchingIds: Set<string> = new Set();
  private retryMinBackoff: number;
  private retryMaxBackoff: number;
  private maxRetries?: number;
  private logger?: LoggerFacade;
  private eventEmitter: EventEmitter<{ dispatch: EventV1Request }> = new EventEmitter();

  constructor(config: QueueingEventProcessorConfig) {
    super();
    this.eventDispatcher = config.eventDispatcher;
    this.closingEventDispatcher = config.closingEventDispatcher;
    this.flushInterval = config.flushInterval;
    this.maxQueueSize = config.maxQueueSize;
    this.eventStore = config.eventStore;
    this.logger = config.logger;
    this.retryMinBackoff = config.retryMinBackoff || DEFAULT_RETRY_MIN_BACKOFF;
    this.retryMaxBackoff = config.retryMaxBackoff || DEFAULT_RETRY_MAX_BACKOFF;
    this.maxRetries = config.maxRetries;

    this.dispatchRepeater = new IntervalRepeater(this.flushInterval);
    this.dispatchRepeater.setTask(() => this.flush());

    this.failedEventRepeater = new IntervalRepeater(this.flushInterval * 4);
    this.failedEventRepeater.setTask(() => this.retryFailedEvents());    
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
      if (!this.dispatchingIds.has(event.id)) {
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
    if (this.eventQueue.isEmpty()) {
      return
    }
    
    const events: ProcessableEvent[] = [];
    let event: EventWithId | undefined;
    let ids: string[] = []
    while(event = this.eventQueue.dequeue()) {
      events.push(event.event);
      ids.push(event.id);
    }

    return { request: formatEvents(events), ids };
  }

  private dispatchBatch(batch: EventBatch, closing: boolean): void {
    const { request, ids } = batch;
    ids.forEach((id) => this.dispatchingIds.add(id));

    const dispatcher = closing && this.closingEventDispatcher ? this.closingEventDispatcher : this.eventDispatcher;
    const backoff = new ExponentialBackoff(this.retryMinBackoff, this.retryMaxBackoff, 500);
    const runResult = runWithRetry(() => dispatcher.dispatchEvent(request), backoff, this.maxRetries);

    const taskId = this.idGenerator.getId();
    this.runningTask.set(taskId, runResult);

    runResult.result.then((res) => {
      if (res.statusCode && !isSuccessStatusCode(res.statusCode)) {
        return Promise.reject(new Error(`Failed to dispatch events: ${res.statusCode}`));
      }
      ids.forEach((id) => {
        this.eventStore?.remove(id);
      });
      return Promise.resolve();
    }).catch((err) => {
      // if the dispatch fails, the events will still be
      // in the store for future processing
      this.logger?.error('Failed to dispatch events', err);
    }).finally(() => {
      this.runningTask.delete(taskId);
      ids.forEach((id) => this.dispatchingIds.delete(id));
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
    if (this.eventQueue.size() == this.maxQueueSize) {
      this.flush();
    }

    const eventWithId = {
      id: this.idGenerator.getId(),
      event: event,
    };
    
    await this.eventStore?.set(eventWithId.id, eventWithId);
    this.eventQueue.enqueue(eventWithId);
  }

  start(): void {
    if (!this.isNew()) {
      return;
    }
    this.state = ServiceState.Running;
    this.dispatchRepeater.start();
    this.failedEventRepeater.start();

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
    this.failedEventRepeater.stop();

    this.flush(true);
    this.runningTask.forEach((task) => task.cancelRetry());

    Promise.allSettled(Array.from(this.runningTask.values()).map((task) => task.result)).then(() => {
      this.state = ServiceState.Terminated;
      this.stopPromise.resolve();
    })
  }
}
