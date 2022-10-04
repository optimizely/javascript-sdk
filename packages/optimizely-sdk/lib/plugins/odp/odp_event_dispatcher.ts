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
import { OdpConfig } from './odp_config';
import { RestApiManager } from './rest_api_manager';

const MAX_RETRIES = 3;
const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_QUEUE_SIZE = 10000;
const DEFAULT_FLUSH_INTERVAL = 1000;

export enum STATE {
  STOPPED,
  RUNNING,
  PROCESSING,
}

export interface IOdpEventDispatcher {
  start(): void;

  updateSettings(odpConfig: OdpConfig): void;

  enqueue(event: OdpEvent): void;

  stop(): Promise<void>;
}

export class OdpEventDispatcher implements IOdpEventDispatcher {
  public state: STATE = STATE.STOPPED;

  private queue = new Array<OdpEvent>();
  private batch = new Array<OdpEvent>();
  private intervalId: number | NodeJS.Timer;
  private odpConfig: OdpConfig;
  private shouldStopAndDrain = false;

  private readonly apiManager: RestApiManager;
  private readonly logger: LogHandler;
  private readonly queueSize: number;
  private readonly batchSize: number;
  private readonly flushInterval: number;

  public constructor(odpConfig: OdpConfig,
                     apiManager: RestApiManager,
                     logger: LogHandler,
                     queueSize?: number,
                     batchSize?: number,
                     flushInterval?: number) {
    this.odpConfig = odpConfig;
    this.apiManager = apiManager;
    this.logger = logger;

    this.queueSize = queueSize || DEFAULT_QUEUE_SIZE;
    this.batchSize = batchSize || DEFAULT_BATCH_SIZE;
    this.flushInterval = flushInterval || DEFAULT_FLUSH_INTERVAL;

    this.state = STATE.STOPPED;
    // initialize this way due to different types based on execution context
    this.intervalId = setInterval(() => {
    });
  }

  public start(): void {
    this.state = STATE.RUNNING;
    (async () => await this.processQueue())();
  }

  public updateSettings(odpConfig: OdpConfig): void {
    this.odpConfig = odpConfig;
  }

  public enqueue(event: OdpEvent): void {
    if (this.state != STATE.RUNNING) {
      this.logger.log(LogLevel.WARNING, 'Failed to Process ODP Event. ODPEventManager is not running.');
      return;
    }

    if (!this.odpConfig.isReady()) {
      this.logger.log(LogLevel.DEBUG, 'Unable to Process ODP Event. ODPConfig is not ready.');
      return;
    }

    if (this.queue.length >= this.queueSize) {
      this.logger.log(LogLevel.WARNING, `Failed to Process ODP Event. Event Queue full. queueSize = ${this.queueSize}.`);
      return;
    }

    this.queue.push(event);
  }

  private async processQueue(): Promise<void> {
    if (this.state !== STATE.RUNNING && !this.shouldStopAndDrain) {
      return;
    }

    clearInterval(this.intervalId);

    if (this.odpConfig.isReady()) {
      if (this.queue.length > 0) {

        this.state = STATE.PROCESSING;

        for (let count = 0; count < this.batchSize; count += 1) {
          const event = this.queue.shift();
          if (event) {
            this.batch.push(event);
          } else {
            break;
          }
        }

        if (this.batch.length > 0) {
          let shouldRetry: boolean;
          let numAttempts = 0;
          do {
            shouldRetry = await this.apiManager.sendEvents(this.odpConfig.apiKey, this.odpConfig.apiHost, this.batch);
            numAttempts += 1;
          } while (shouldRetry && numAttempts < MAX_RETRIES);
        }

        this.batch = new Array<OdpEvent>();
      }

      if (this.shouldStopAndDrain && this.queue.length > 0) {
        this.logger.log(LogLevel.DEBUG, 'EventDispatcher draining queue without flush interval.');
        await this.processQueue();
      }
    } else {
      this.logger.log(LogLevel.DEBUG, 'ODPConfig not ready, discarding event batch.');
    }

    if (!this.shouldStopAndDrain) {
      this.intervalId = setInterval(() => this.processQueue(), this.flushInterval);
    }

    this.state = STATE.RUNNING;
  }

  public async stop(): Promise<void> {
    this.logger.log(LogLevel.DEBUG, 'EventDispatcher stop requested.');
    this.shouldStopAndDrain = true;
    await this.processQueue();
    this.state = STATE.STOPPED;
    this.logger.log(LogLevel.DEBUG, `EventDispatcher stopped. Queue Count: ${this.queue.length}`);
  }
}
