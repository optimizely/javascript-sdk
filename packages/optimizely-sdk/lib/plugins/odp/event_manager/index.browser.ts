import { OdpEventManager } from "../../../../lib/core/odp/odp_event_manager";
import { LogLevel } from '../../../modules/logging';

const DEFAULT_BROWSER_QUEUE_SIZE = 100;

export class BrowserOdpEventManager extends OdpEventManager {
  protected initParams(batchSize: number | undefined, queueSize: number | undefined, flushInterval: number | undefined): void {
    this.queueSize = queueSize || DEFAULT_BROWSER_QUEUE_SIZE;

    // disable event batching for browser
    this.batchSize = 1;
    this.flushInterval = 0;
    
    if (typeof batchSize !== 'undefined' && batchSize !== 1) {
      this.getLogger().log(LogLevel.WARNING, 'ODP event batch size must be 1 in the browser.');
    }

    if (typeof flushInterval !== 'undefined' && flushInterval !== 0) {
      this.getLogger().log(LogLevel.WARNING, 'ODP event flush interval must be 0 in the browser.');
    }
  }

  protected discardEventsIfNeeded(): void {
    // in Browser/client-side context, give debug message but leave events in queue
    this.getLogger().log(LogLevel.DEBUG, 'ODPConfig not ready. Leaving events in queue.');
  }
}