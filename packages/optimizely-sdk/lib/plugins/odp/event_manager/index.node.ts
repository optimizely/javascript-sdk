
import { OdpEvent } from "../../../../lib/core/odp/odp_event";
import { OdpEventManager } from "../../../../lib/core/odp/odp_event_manager";
import { LogLevel } from "../../../../lib/modules/logging";

const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_FLUSH_INTERVAL_MSECS = 1000;
const DEFAULT_SERVER_QUEUE_SIZE = 10000;

export class NodeOdpEventManager extends OdpEventManager {
  protected initParams(batchSize: number | undefined, queueSize: number | undefined, flushInterval: number | undefined): void {
    this.queueSize = queueSize || DEFAULT_SERVER_QUEUE_SIZE;
    this.batchSize = batchSize || DEFAULT_BATCH_SIZE;

    if (flushInterval === 0) {
      // disable event batching
      this.batchSize = 1;
      this.flushInterval = 0;
    } else {
      this.flushInterval = flushInterval || DEFAULT_FLUSH_INTERVAL_MSECS;
    }
  }

  protected discardEventsIfNeeded(): void {
    // if Node/server-side context, empty queue items before ready state
    this.getLogger().log(LogLevel.WARNING, 'ODPConfig not ready. Discarding events in queue.');
    this.queue = new Array<OdpEvent>();
  }
}