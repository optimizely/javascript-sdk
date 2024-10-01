import { EventProcessor, ProcessableEvent } from "./eventProcessor";
import { Cache } from "../utils/cache/cache";
import { EventV1Request } from "./eventDispatcher";
import { formatEvents } from "../core/event_builder/build_event_v1";
export class QueueingEventProcessor implements EventProcessor {
  private eventQueue: ProcessableEvent[] = [];
  private readonly maxQueueSize: number;
  private eventCache: Cache<ProcessableEvent>;
  private pendingEventsCache: Cache<EventV1Request>
  private maxPendingEvents: number;

  private async createNewEventBatch(): Promise<void> {
    const request = formatEvents(this.eventQueue);
    const dispatchId = this.getDispatchId();
    await this.pendingEventsCache.set(dispatchId, request);
  }

  private getDispatchId(): string {
    const time = Date.now();
    return `${time}-${Math.random().toFixed(2)}`;
  }

  process(event: ProcessableEvent): Promise<void> {
    if (this.eventQueue.length == this.maxQueueSize) {

    }
  }

  start(): Promise<any> {
    throw new Error("Method not implemented.");
  }

  stop(): Promise<any> {
    throw new Error("Method not implemented.");
  }
}
