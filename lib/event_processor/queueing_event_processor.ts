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

export class QueueingEventProcessor implements EventProcessor {
  private eventQueue: Queue<EventWithId> = new Queue(1000);
  private maxQueueSize: number = 1000;
  private eventStore?: Cache<EventWithId>;
  private repeater: Repeater;
  private dispatchController: DispatchController;
  private logger?: LoggerFacade;

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

  private async createNewEventBatch(): Promise<unknown> {
    return this.dispatchController.handleBatch(request).then(() => {
      events.forEach((event) => {
        this.eventStore?.remove(event.id);
      });
    }).catch((err) => {
      this.logger?.error('Failed to dispatch events', err);
    });
  }

  constructor() {

  }

  process(event: ProcessableEvent): Promise<void> {
    if (this.eventQueue.size() == this.maxQueueSize) {
      
    }
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
