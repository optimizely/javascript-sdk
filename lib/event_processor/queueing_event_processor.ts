import { EventProcessor, ProcessableEvent } from "./eventProcessor";
import { Cache } from "../utils/cache/cache";
import { EventV1Request } from "./eventDispatcher";
import { formatEvents } from "../core/event_builder/build_event_v1";
import { Repeater } from "../utils/repeater/repeater";
import { DispatchController } from "./dispatch_controller";
import { LoggerFacade } from "../modules/logging";

type EventWithId = {
  id: string;
  event: ProcessableEvent;
};

const idSuffixBase = 10_000;

export class QueueingEventProcessor implements EventProcessor {
  private eventQueue: Queue<EventWithId> = new Queue(1000);
  private maxQueueSize: number = 1000;
  private eventStore?: Cache<EventWithId>;
  private repeater: Repeater;
  private dispatchController: DispatchController;
  private logger?: LoggerFacade;
  private idSuffixOffset: number = 0;

  constructor() {
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

  // getId returns an Id that generally increases with each call
  // only exceptions are when idSuffix rotates back to 0 within the same millisecond
  // or when the clock goes back
  getId(): string {
    const idSuffix = idSuffixBase + this.idSuffixOffset;
    this.idSuffixOffset = (this.idSuffixOffset + 1) % idSuffixBase;
    const timestamp = Date.now();
    return `${timestamp}${idSuffix}`;
  }

  async process(event: ProcessableEvent): Promise<void> {
    if (this.eventQueue.size() == this.maxQueueSize) {
      this.dispatchNewBatch();
    }

    const eventWithId = {
      id: this.getId(),
      event: event,
    };
    
    await this.eventStore?.set(eventWithId.id, eventWithId);
    this.eventQueue.enqueue({
      id: this.getId(),
      event: event,
    });
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
