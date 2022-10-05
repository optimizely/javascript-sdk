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
  updateSettings(odpConfig: OdpConfig): void;

  start(): void;

  enqueue(event: OdpEvent): void;

  stop(): Promise<void>;
}

/**
 * Concrete implementation of a processor for dispatching events to the Optimizely Data Platform (ODP)
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
   * Identifier of the currently running timeout so clearCurrentTimeout() can be called
   * @private
   */
  private timeoutId?: NodeJS.Timeout | number;
  /**
   * ODP configuration settings in used
   * @private
   */
  private odpConfig: OdpConfig;
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
   * Update the ODP configuration in use
   * @param odpConfig New settings to apply
   */
  public updateSettings(odpConfig: OdpConfig): void {
    this.odpConfig = odpConfig;
  }

  /**
   * Begin processing any events in the queue
   */
  public start(): void {
    this.state = STATE.RUNNING;

    this.setNewTimeout();
  }

  /**
   * Add a new event to the main queue
   * @param event ODP Event to be queued
   */
  public enqueue(event: OdpEvent): void {
    if (this.state === STATE.STOPPED) {
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

    this.processQueue();
  }

  /**
   * Process any events in the main queue in batches
   * @private
   */
  private async processQueue(): Promise<void> {
    if (this.state !== STATE.RUNNING) {
      return;
    }

    if (!this.isOdpConfigurationReady()) {
      return;
    }

    if (!this.queueHasBatches()) {
      return;
    }

    this.clearCurrentTimeout();

    this.state = STATE.PROCESSING;

    while (this.queueHasBatches()) {
      await this.makeAndSendBatch();
    }

    this.state = STATE.RUNNING;

    this.setNewTimeout();
  }

  /**
   * Process all events in the main queue in batches until empty
   * @private
   */
  private async flushQueue(): Promise<void> {
    if (this.state !== STATE.RUNNING) {
      return;
    }

    if (!this.isOdpConfigurationReady()) {
      return;
    }

    if (!this.queueContainsItems()) {
      return;
    }

    this.clearCurrentTimeout();

    this.state = STATE.PROCESSING;

    while (this.queueContainsItems()) {
      await this.makeAndSendBatch();
    }

    this.state = STATE.RUNNING;

    this.setNewTimeout();
  }

  /**
   * Clear the currently running timout
   * @private
   */
  private clearCurrentTimeout(): void {
    clearTimeout(this.timeoutId);
    this.timeoutId = undefined;
  }

  /**
   * Start a new timeout
   * @private
   */
  private setNewTimeout(): void {
    if (this.timeoutId !== undefined) {
      return;
    }
    this.timeoutId = setTimeout(() => this.flushQueue(), this.flushInterval);
  }

  /**
   * Make a batch and send it to ODP
   * @private
   */
  private async makeAndSendBatch(): Promise<void> {
    const batch = new Array<OdpEvent>();

    for (let count = 0; count < this.batchSize; count += 1) {
      const event = this.queue.shift();
      if (event) {
        batch.push(event);
      } else {
        break;
      }
    }

    if (batch.length > 0) {
      let shouldRetry: boolean;
      let attemptNumber = 0;
      do {
        shouldRetry = await this.apiManager.sendEvents(this.odpConfig.apiKey, this.odpConfig.apiHost, batch);
        attemptNumber += 1;
      } while (shouldRetry && attemptNumber < MAX_RETRIES);
    }
  }

  /**
   * Check if main queue has any full/even batches available
   * @private
   */
  private queueHasBatches(): boolean {
    return this.queueContainsItems() && this.queue.length % this.batchSize === 0;
  }

  /**
   * Check if main queue has any items
   * @private
   */
  private queueContainsItems(): boolean {
    return this.queue.length > 0;
  }

  /**
   * Check if the ODP Configuration is ready and log if not.
   * Potentially clear queue if server-side
   * @private
   */
  private isOdpConfigurationReady(): boolean {
    if (this.odpConfig.isReady()) {
      return true;
    }

    if (process) {
      // if Node/server-side context, empty queue items before ready state
      this.logger.log(LogLevel.WARNING, 'ODPConfig not ready. Discarding events in queue.');
      this.queue = new Array<OdpEvent>();
    } else {
      // in Browser/client-side context, give debug message but leave events in queue
      this.logger.log(LogLevel.DEBUG, 'ODPConfig not ready. Leaving events in queue.');
    }
    return false;
  }

  /**
   * Drain the queue sending all remaining events in batches then stop processing
   */
  public async stop(): Promise<void> {
    this.logger.log(LogLevel.DEBUG, 'EventDispatcher stop requested.');

    await this.flushQueue();

    this.state = STATE.STOPPED;
    this.logger.log(LogLevel.DEBUG, `EventDispatcher stopped. Queue Count: ${this.queue.length}`);
  }
}
