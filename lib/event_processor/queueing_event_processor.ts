import { EventProcessor, ProcessableEvent } from "./eventProcessor";
import { Cache } from "../utils/cache/cache";
import { EventV1Request } from "./eventDispatcher";
import { formatEvents } from "../core/event_builder/build_event_v1";
import { IntervalRepeater, Repeater } from "../utils/repeater/repeater";
import { DispatchController } from "./dispatch_controller";
import { LoggerFacade } from "../modules/logging";
import { BaseService, ServiceState } from "../service";
import { Consumer, Fn } from "../utils/type";

export type EventWithId = {
  id: string;
  event: ProcessableEvent;
};

export type QueueingEventProcessorConfig = {
  flushInterval: number,
  maxQueueSize: 1000,
  eventStore: Cache<EventWithId>,
  dispatchController: DispatchController,
  logger?: LoggerFacade,
};

export class QueueingEventProcessor extends BaseService implements EventProcessor {
  private eventQueue: Queue<EventWithId> = new Queue(1000);
  private maxQueueSize: number = 1000;
  private flushInterval: number = 1000;
  private eventStore?: Cache<EventWithId>;
  private repeater: Repeater;
  private dispatchController: DispatchController;
  private logger?: LoggerFacade;
  private idGenerator: IdGenerator = new IdGenerator();

  constructor(config: QueueingEventProcessorConfig) {
    super();
    this.flushInterval = config.flushInterval;
    this.maxQueueSize = config.maxQueueSize;
    this.eventStore = config.eventStore;
    this.dispatchController = config.dispatchController;
    this.logger = config.logger;

    this.repeater = new IntervalRepeater(this.flushInterval);
    this.repeater.setTask(this.dispatchNewBatch.bind(this));
  }

  onDispatch(handler: Consumer<EventV1Request>): Fn {
    throw new Error("Method not implemented.");
  }

  private createNewBatch(): [EventV1Request, Array<string>] | undefined {
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

    return [formatEvents(events), ids];
  }

  private async dispatchNewBatch(): Promise<unknown> {
    const batch = this.createNewBatch();
    if (!batch) {
      return;
    }

    const [request, ids] = batch;

    return this.dispatchController.handleBatch(request).then(() => {
      // if the dispatch controller succeeds, remove the events from the store
      ids.forEach((id) => {
        this.eventStore?.remove(id);
      });
    }).catch((err) => {
      // if the dispatch controller fails, the events will still be
      // in the store for future processing
      this.logger?.error('Failed to dispatch events', err);
    });
  }

  async process(event: ProcessableEvent): Promise<void> {
    if (this.eventQueue.size() == this.maxQueueSize) {
      this.dispatchNewBatch();
    }

    const eventWithId = {
      id: this.idGenerator.getId(),
      event: event,
    };
    
    await this.eventStore?.set(eventWithId.id, eventWithId);
    this.eventQueue.enqueue(eventWithId);
  }

  start(): Promise<any> {
    throw new Error("Method not implemented.");
  }

  stop(): Promise<any> {
    throw new Error("Method not implemented.");
  }

  public flushNow(): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
