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

import { LogHandler, LogLevel } from '../../modules/logging';
import { OdpEvent } from './odp_event';
import { uuid } from '../../utils/fns';
import { ODP_USER_KEY } from '../../utils/enums';
import { OdpConfig } from './odp_config';
import { RestApiManager } from './rest_api_manager';

const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_QUEUE_SIZE = 10000;
const DEFAULT_FLUSH_INTERVAL = 1000;
const MAX_RETRIES = 3;
const EVENT_URL_PATH = '/v3/events';

export interface IOdpEventManager {
  start(): void;

  updateSettings(odpConfig: OdpConfig): void;

  identifyUser(vuid: string, userId: string): void;

  sendEvents(events: [OdpEvent]): void;

  sendEvent(event: OdpEvent): void;

  stop(): void;
}

/**
 * Manager for persisting events to the Optimizely Data Platform
 */
export class OdpEventManager implements IOdpEventManager {
  private readonly apiManager: RestApiManager;
  private readonly logger: LogHandler;
  private readonly queueSize: number;
  private readonly batchSize: number;
  private readonly flushInterval: number;

  private isRunning = false;

  private odpConfig: OdpConfig;
  private eventQueue: Array<OdpEvent>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private eventDispatcher: any;

  public constructor(odpConfig: OdpConfig, apiManager: RestApiManager, logger: LogHandler,
                     batchSize: number,
                     queueSize: number,
                     flushInterval: number) {
    this.odpConfig = odpConfig;
    this.apiManager = apiManager;
    this.logger = logger;

    this.batchSize = (batchSize != null && batchSize > 1) ? batchSize : DEFAULT_BATCH_SIZE;
    this.queueSize = queueSize != null ? queueSize : DEFAULT_QUEUE_SIZE;
    this.flushInterval = (flushInterval != null && flushInterval > 0) ? flushInterval : DEFAULT_FLUSH_INTERVAL;

    this.eventDispatcher = new this.OdpEventDispatcher(this);
    this.eventQueue = new Array<OdpEvent>();
  }

  public start(): void {
    this.isRunning = true;
    this.eventDispatcher.run();
  }

  public updateSettings(odpConfig: OdpConfig): void {
    this.odpConfig = odpConfig;
  }

  public identifyUser(vuid: string, userId: string): void {
    const identifiers = new Map<string, string>();
    if (vuid != null) {
      identifiers.set(ODP_USER_KEY.VUID, vuid);
    }
    identifiers.set(ODP_USER_KEY.FS_USER_ID, userId);

    const event = new OdpEvent('fullstack', 'client_initialized', identifiers);
    this.sendEvent(event);
  }

  public sendEvents(events: [OdpEvent]): void {
    events.forEach(event => this.sendEvent(event));
  }

  public sendEvent(event: OdpEvent): void {
    event.data = this.augmentCommonData(event.data);
    this.processEvent(event);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private augmentCommonData(sourceData: Map<string, any>): Map<string, any> {
    let sourceVersion = '';
    if (window) {
      sourceVersion = window.navigator.userAgent;
    } else {
      if (process) {
        sourceVersion = process.version;
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = new Map<string, any>();
    data.set('idempotence_id', uuid());
    data.set('data_source_type', 'sdk');
    data.set('data_source', 'javascript-sdk');
    data.set('data_source_version', sourceVersion);
    sourceData.forEach(item => data.set(item.key, item.value));

    return data;
  }

  private processEvent(event: OdpEvent): void {
    if (!this.isRunning) {
      this.logger.log(LogLevel.WARNING, 'Failed to Process ODP Event. ODPEventManager is not running');
      return;
    }

    if (!this.odpConfig.isReady()) {
      this.logger.log(LogLevel.DEBUG, 'Unable to Process ODP Event. ODPConfig is not ready.');
      return;
    }

    if (this.eventQueue.length >= this.queueSize) {
      this.logger.log(LogLevel.WARNING, 'Failed to Process ODP Event. Event Queue full. queueSize = ' + this.queueSize);
      return;
    }

    if (!this.eventQueue.push(event)) {
      this.logger.log(LogLevel.ERROR, 'Failed to Process ODP Event. Event Queue is not accepting any more events');
    }
  }

  public stop(): void {
    this.logger.log(LogLevel.DEBUG, 'Sending stop signal to ODP Event Dispatcher');
    this.eventDispatcher.signalStop();
  }

  private OdpEventDispatcher = class {
    private shouldStop = false;
    private currentBatch = new Array<OdpEvent>();
    private nextFlushTime: number = Date.now();
    private readonly eventManager: OdpEventManager;

    public constructor(eventManager: OdpEventManager) {
      this.eventManager = eventManager;
    }

    public async run(): Promise<void> {
      while (!this.shouldStop) {
        try {
          let nextEvent: OdpEvent;

          // If batch has events, set the timeout to remaining time for flush interval,
          // otherwise wait for the new event indefinitely
          if (this.currentBatch.length > 0) {
            nextEvent = this.eventManager.eventQueue.poll(this.nextFlushTime - Date.now(), this.eventManager.flushInterval);
          } else {
            nextEvent = this.eventManager.eventQueue.poll();
          }

          if (nextEvent == null) {
            // null means no new events received and flush interval is over, dispatch whatever is in the batch.
            if (this.currentBatch.length > 0) {
              await this.flush();
            }
            continue;
          }

          if (this.currentBatch.length == 0) {
            // Batch starting, create a new flush time
            this.nextFlushTime = Date.now() + this.eventManager.flushInterval;
          }

          this.currentBatch.push(nextEvent);

          if (this.currentBatch.length >= this.eventManager.batchSize) {
            await this.flush();
          }
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
          this.eventManager.logger.log(LogLevel.ERROR, err.toString());
        }
      }

      this.eventManager.logger.log(LogLevel.DEBUG, 'Exiting ODP Event Dispatcher Thread.');
      this.eventManager.isRunning = false;
    }

    private async flush(): Promise<void> {
      if (this.eventManager.odpConfig.isReady()) {
        const payload = this.currentBatch;
        const endpoint = this.eventManager.odpConfig.apiHost + EVENT_URL_PATH;
        let shouldRetry: boolean;
        let numAttempts = 0;
        do {
          shouldRetry = await this.eventManager.apiManager.sendEvents(this.eventManager.odpConfig.apiKey, endpoint, payload);
          numAttempts += 1;
        } while (numAttempts < MAX_RETRIES && shouldRetry);
      } else {
        this.eventManager.logger.log(LogLevel.DEBUG, 'ODPConfig not ready, discarding event batch');
      }
      this.currentBatch = new Array<OdpEvent>();
    }

    public signalStop(): void {
      this.shouldStop = true;
    }
  };
}
