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

import { LogHandler } from '../../modules/logging';
import { OdpClient } from './odp_client';
import { OdpEvent } from './odp_event';

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
  private static DEFAULT_BATCH_SIZE = 10;
  private static DEFAULT_QUEUE_SIZE = 10000;
  private static FLUSH_INTERVAL = 1000;
  private static MAX_RETRIES = 3;

  private readonly _logger: LogHandler;
  private readonly _batchSize: number;
  private readonly _queueSize: number;

  private _odpConfig: OdpConfig;
  private _isRunning = false;
  private eventDispatcherThread: EventDispatcherThread;

  public constructor(odpConfig: OdpConfig, odpClient: OdpClient, logger: LogHandler,
                     batchSize = OdpEventManager.DEFAULT_BATCH_SIZE,
                     queueSize = OdpEventManager.DEFAULT_QUEUE_SIZE) {
    this._odpConfig = odpConfig;
    this._logger = logger;
    this._batchSize = batchSize;
    this._queueSize = queueSize;
  }

  public start(): void {
    this._isRunning = true;
    eventDispatcherThread = new EventDispatcherThread();
    eventDispatcherThread.start();
  }

  public stop(): void {
    logger.debug('Sending stop signal to ODP Event Dispatcher Thread');
    eventDispatcherThread.signalStop();
  }

  public updateSettings(odpConfig: OdpConfig): void {
    this._odpConfig = odpConfig;
  }

  public sendEvents(events: [OdpEvent]): void {
    events.forEach(event => this.sendEvent(event));
  }

  public sendEvent(event: OdpEvent): void {
    event.setData(augmentCommonData(event.getData()));
    this.processEvent(event);
  }

  private processEvent(event: OdpEvent): void {

  }

  public registerVUID(vuid: string): void {

  }

  public identifyUser(vuid: string, userId: string): void {
  }
}
