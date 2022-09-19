/**
 * Copyright 2022, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { OdpEvent } from './odp_event';
import { LogHandler, LogLevel } from '../../modules/logging';

export class OdpEventDispatcher {
  private shouldStop = false;
  private currentBatch = new Array<OdpEvent>();
  private nextFlushTime: number = Date.now();

  private readonly logger: LogHandler;
  private readonly flushInterval: number;
  private readonly batchSize: number;

  public constructor(logger: LogHandler, flushInterval: number, batchSize: number) {
    this.logger = logger;
    this.flushInterval = flushInterval;
    this.batchSize = batchSize;
  }

  public run(): void {
    while (!this.shouldStop) {
      try {
        let nextEvent: OdpEvent;

        // If batch has events, set the timeout to remaining time for flush interval,
        // otherwise wait for the new event indefinitely
        if (this.currentBatch.length > 0) {
          nextEvent = this.eventQueue.poll(this.nextFlushTime - new Date().getTime(), this.flushInterval);
        } else {
          nextEvent = this.eventQueue.poll();
        }

        if (nextEvent == null) {
          // null means no new events received and flush interval is over, dispatch whatever is in the batch.
          if (this.currentBatch.length > 0) {
            this.flush();
          }
          continue;
        }

        if (this.currentBatch.length == 0) {
          // Batch starting, create a new flush time
          this.nextFlushTime = Date.now() + this.flushInterval;
        }

        this.currentBatch.push(nextEvent);

        if (this.currentBatch.length >= this.batchSize) {
          this.flush();
        }
      } catch (e: any) {
        this.logger.log(LogLevel.ERROR, e.toString());
      }
    }

    this.logger.log(LogLevel.DEBUG, 'Exiting ODP Event Dispatcher Thread.');
  }

  private flush(): void {
    if (odpConfig.isReady()) {
      const payload = ODPJsonSerializerFactory.getSerializer().serializeEvents(this.currentBatch);
      const endpoint = odpConfig.getApiHost() + EVENT_URL_PATH;
      const statusCode: number;
      let numAttempts = 0;
      do {
        statusCode = apiManager.sendEvents(odpConfig.getApiKey(), endpoint, payload);
        numAttempts += 1;
      } while (numAttempts < MAX_RETRIES && statusCode != null && (statusCode == 0 || statusCode >= 500));
    } else {
      this.logger.log(LogLevel.DEBUG, 'ODPConfig not ready, discarding event batch');
    }
    this.currentBatch = new Array<OdpEvent>();
  }

  public signalStop(): void {
    this.shouldStop = true;
  }
}
