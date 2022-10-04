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
const DEFAULT_FLUSH_INTERVAL_MSECS = 1000;

/**
 * Event dispatcher's execution states
 */
export enum STATE {
  STOPPED,
  RUNNING,
  PROCESSING,
}

/**
 * Queue processor for dispatching events to the Optimizely Data Platform (ODP)
 */
export interface IOdpEventDispatcher {
  start(): void;

  updateSettings(odpConfig: OdpConfig): void;

  enqueue(event: OdpEvent): void;

  stop(): Promise<void>;
}

/**
 * Concreate implementation of a processor for dispatching events to the Optimizely Data Platform (ODP)
 */
export class OdpEventDispatcher implements IOdpEventDispatcher {
  /**
   * Current state of the event processor
   */
  public state: STATE = STATE.STOPPED;
  /**
   * Queue for holding all events to be eventually dispatched
   * @private
   */
  private queue = new Array<OdpEvent>();
  /**
   * Current batch of events being processed
   * @private
   */
  private batch = new Array<OdpEvent>();
  /**
   * Identifier of the currently running timeout so clearTimeout() can be called
   * @private
   */
  private timeoutId: ReturnType<typeof setTimeout> = setTimeout(() => {
  });
  /**
   * ODP configuration settings in used
   * @private
   */
  private odpConfig: OdpConfig;
  /**
   * Signal that the dispatcher should drain the queue and shutdown
   * @private
   */
  private shouldStopAndDrain = false;

  /**
   * REST API Manager used to send the events
   * @private
   */
  private readonly apiManager: RestApiManager;
  /**
   * Handler for recording execution logs
   * @private
   */
  private readonly logger: LogHandler;
  /**
   * Maximum queue size
   * @private
   */
  private readonly queueSize: number;
  /**
   * Maximum number of events to process at once
   * @private
   */
  private readonly batchSize: number;
  /**
   * Milliseconds between setTimeout() to process new batches
   * @private
   */
  private readonly flushInterval: number;

  public constructor(
    { odpConfig, apiManager, logger, queueSize, batchSize, flushInterval }: {
      odpConfig: OdpConfig,
      apiManager: RestApiManager,
      logger: LogHandler,
      queueSize?: number,
      batchSize?: number,
      flushInterval?: number
    }) {
    this.odpConfig = odpConfig;
    this.apiManager = apiManager;
    this.logger = logger;

    // if `process` exists Node/server-side execution context otherwise Browser
    this.queueSize = queueSize || (process ? 10000 : 100);
    this.batchSize = batchSize || DEFAULT_BATCH_SIZE;
    this.flushInterval = flushInterval || DEFAULT_FLUSH_INTERVAL_MSECS;

    this.state = STATE.STOPPED;
  }

  /**
   * Begin processing any events in the queue
   */
  public start(): void {
    this.state = STATE.RUNNING;
    (async () => await this.processQueue())();
  }

  /**
   * Update the ODP configuration in use
   * @param odpConfig New settings to apply
   */
  public updateSettings(odpConfig: OdpConfig): void {
    this.odpConfig = odpConfig;
  }

  /**
   * Add a new event to the main queue
   * @param event ODP Event to be queued
   */
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

  /**
   * Process any events in the main queue in batches
   * @private
   */
  private async processQueue(): Promise<void> {
    if (this.state !== STATE.RUNNING && !this.shouldStopAndDrain) {
      return;
    }

    clearTimeout(this.timeoutId);

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
        this.state = STATE.RUNNING;
      }

      if (this.shouldStopAndDrain && this.queue.length > 0) {
        this.logger.log(LogLevel.DEBUG, 'EventDispatcher draining queue without flush interval.');
        await this.processQueue();
      }
    } else {
      if (process) {
        // if Node/server-side context, empty queue items before ready state
        this.logger.log(LogLevel.WARNING, 'ODPConfig not ready. Leaving events in queue.');
        this.queue = new Array<OdpEvent>();
      } else {
        // in Browser/client-side context, give debug message but leave events in queue
        this.logger.log(LogLevel.DEBUG, 'ODPConfig not ready. Leaving events in queue.');
      }
    }

    if (!this.shouldStopAndDrain) {
      this.timeoutId = setTimeout(() => this.processQueue(), this.flushInterval);
    }
  }

  /**
   * Drain the event queue sending all remaining events in batches to ODP then shutdown processing
   */
  public async stop(): Promise<void> {
    this.logger.log(LogLevel.DEBUG, 'EventDispatcher stop requested.');
    this.shouldStopAndDrain = true;
    await this.processQueue();
    this.state = STATE.STOPPED;
    this.logger.log(LogLevel.DEBUG, `EventDispatcher stopped. Queue Count: ${this.queue.length}`);
  }
}
