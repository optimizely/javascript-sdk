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
import { LogHandler } from '../../modules/logging';

const MAX_RETRIES = 3;
const EVENT_URL_PATH = '/v3/events';
const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_QUEUE_SIZE = 10000;
const DEFAULT_FLUSH_INTERVAL = 1000;

export enum STATE {
  STOPPED,
  RUNNING,
  FLUSHING,
}

/**
 * The Observer interface declares the update method, used by subjects.
 */
export interface Observer {
  start(): void;

  enqueue(events: OdpEvent): void;

  flush(): void;

  stop(): void;
}

export class OdpEventDispatcher implements Observer {
  public state: STATE = STATE.STOPPED;
  private currentBatch = new Array<OdpEvent>();
  private nextFlushTime: number = Date.now();
  private intervalId: typeof setInterval;

  private readonly logger: LogHandler;
  private readonly queueSize: number;
  private readonly batchSize: number;
  private readonly flushInterval: number;

  public constructor(logger: LogHandler,
                     batchSize?: number,
                     queueSize?: number,
                     flushInterval?: number) {
    this.logger = logger;

    this.batchSize = batchSize && batchSize > 0 ? batchSize : DEFAULT_BATCH_SIZE;
    this.queueSize = queueSize && queueSize > 0 ? queueSize : DEFAULT_QUEUE_SIZE;
    this.flushInterval = flushInterval && flushInterval > 0 ? flushInterval : DEFAULT_FLUSH_INTERVAL;

    this.intervalId = setInterval(() => {
    }, 1);
  }

  public start(): void {
    this.state = STATE.RUNNING;
  }

  public async enqueue(event: OdpEvent): Promise<void> {
    this.currentBatch.push(event);

    if (this.currentBatch.length >= this.batchSize) {
      clearInterval(this.intervalId);
      await this.flush();
      this.intervalId = setInterval(this.flush, this.flushInterval);
    }
  }

  public async flush(): Promise<void> {
    this.state = STATE.FLUSHING;
    // if (this.eventManager.odpConfig.isReady()) {
    //   const payload = this.currentBatch;
    //   const endpoint = this.eventManager.odpConfig.apiHost + EVENT_URL_PATH;
    //   let shouldRetry: boolean;
    //   let numAttempts = 0;
    //   do {
    //     shouldRetry = await this.eventManager.apiManager.sendEvents(this.eventManager.odpConfig.apiKey, endpoint, payload);
    //     numAttempts += 1;
    //   } while (numAttempts < MAX_RETRIES && shouldRetry);
    // } else {
    //   this.eventManager.logger.log(LogLevel.DEBUG, 'ODPConfig not ready, discarding event batch');
    // }
    this.currentBatch = new Array<OdpEvent>();
    this.state = STATE.RUNNING;
  }


  private async dispatch(): Promise<void> {

  }

  public async stop(): Promise<void> {
    this.state = STATE.FLUSHING;
    await this.flush();
    this.state = STATE.STOPPED;
  }

  // public async run(): Promise<void> {
  //     try {
  //       if (this.currentBatch.length > 0) {
  //         const remainingTimeout = this.nextFlushTime - Date.now();
  //         await this.pause(remainingTimeout);
  //       }
  //
  //       if (this.currentBatch.length === 0) {
  //         this.nextFlushTime = Date.now() + this.eventManager.flushInterval;
  //       }
  //
  //       this.currentBatch.push(nextEvent);
  //
  //       if (this.currentBatch.length >= this.eventManager.batchSize) {
  //         await this.flush();
  //       }
  //     } catch (err) {
  //       this.eventManager.logger.log(LogLevel.ERROR, err as string);
  //     }
  //   }
  //
  //   this.eventManager.logger.log(LogLevel.DEBUG, 'Exiting ODP Event Dispatcher Thread.');
  //   this.eventManager.isRunning = false;
  // }

  // private pause(timeoutMilliseconds: number): Promise<void> {
  //   return new Promise(resolve => setTimeout(resolve, timeoutMilliseconds));
  // }
}
