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
import { OdpClient } from './odp_client';
import { OdpEvent } from './odp_event';
import { OdpEventDispatcher } from './odp_event_dispatcher';
import { DEFAULT_FLUSH_INTERVAL } from '../../modules/event_processor';
import { uuid } from '../../utils/fns';

const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_QUEUE_SIZE = 10000;
const FLUSH_INTERVAL = 1000;
const MAX_RETRIES = 3;

export interface IOdpEventManager {
  start(): void;

  sendEvent(event: OdpEvent): void;

  sendEvents(events: [OdpEvent]): void;

  registerVUID(vuid: string): void;

  identifyUser(vuid: string, userId: string): void;
}

/**
 * Manager for persisting events to the Optimizely Data Platform
 */
export class OdpEventManager implements IOdpEventManager {

  private readonly apiManager: OdpClient;
  private readonly logger: LogHandler;
  private readonly queueSize: number;
  private readonly batchSize: number;
  private readonly flushInterval: number;

  private isRunning = false;

  private odpConfig: OdpConfig;
  private eventQueue: Array<OdpEvent>;
  private eventDispatcher: OdpEventDispatcher;

  public constructor(odpConfig: OdpConfig, odpClient: OdpClient, logger: LogHandler,
                     batchSize = DEFAULT_BATCH_SIZE,
                     queueSize = DEFAULT_QUEUE_SIZE,
                     flushInterval = DEFAULT_FLUSH_INTERVAL) {
    this.apiManager = odpClient;
    this.logger = logger;
    this.queueSize = queueSize;
    this.batchSize = batchSize;
    this.flushInterval = flushInterval;

    this.odpConfig = odpConfig;
    this.eventQueue = new Array<OdpEvent>();
    this.eventDispatcher = new OdpEventDispatcher(this.logger, this.flushInterval, this.batchSize);
  }

  public registerVUID(vuid: string): void {

  }

  public identifyUser(vuid: string, userId: string): void {
  }

  public start(): void {
    this.isRunning = true;
    this.eventDispatcher.run();
  }

  public stop(): void {
    this.logger.log(LogLevel.DEBUG, 'Sending stop signal to ODP Event Dispatcher');
    this.eventDispatcher.signalStop();
  }

  public updateSettings(odpConfig: OdpConfig): void {
    this.odpConfig = odpConfig;
  }

  public sendEvents(events: [OdpEvent]): void {
    events.forEach(event => this.sendEvent(event));
  }

  public sendEvent(event: OdpEvent): void {
    event.data = this.augmentCommonData(event.data);
    this.processEvent(event);
  }

  private processEvent(event: OdpEvent): void {

  }

  private augmentCommonData(sourceData: Map<string, any>): Map<string, any> {
    let sourceVersion = '';
    if (window) {
      sourceVersion = window.navigator.userAgent;
    } else {
      if (process) {
        sourceVersion = process.version;
      }
    }

    const data = new Map<string, any>();
    data.set('idempotence_id', uuid());
    data.set('data_source_type', 'sdk');
    data.set('data_source', 'javascript-sdk');
    data.set('data_source_version', sourceVersion);
    sourceData.forEach(item => data.set(item.key, item.value));

    return data;
  }
}
