/**
 * Copyright 2022-2023, Optimizely
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

import { uuid } from '../../utils/fns';
import { ERROR_MESSAGES, ODP_USER_KEY, ODP_DEFAULT_EVENT_TYPE, ODP_EVENT_ACTION } from '../../utils/enums';

import { OdpEvent } from './odp_event';
import { OdpConfig } from './odp_config';
import { OdpEventApiManager } from './odp_event_api_manager';
import { invalidOdpDataFound } from './odp_utils';

const MAX_RETRIES = 3;
const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_FLUSH_INTERVAL_MSECS = 1000;
const DEFAULT_BROWSER_QUEUE_SIZE = 100;
const DEFAULT_SERVER_QUEUE_SIZE = 10000;

/**
 * Event dispatcher's execution states
 */
export enum STATE {
  STOPPED,
  RUNNING,
  PROCESSING,
}

/**
 * Manager for persisting events to the Optimizely Data Platform (ODP)
 */
export interface IOdpEventManager {
  updateSettings(odpConfig: OdpConfig): void;

  start(): void;

  stop(): Promise<void>;

  registerVuid(vuid: string): void;

  identifyUser(userId: string, vuid?: string): void;

  sendEvent(event: OdpEvent): void;

  flush(): void;
}

/**
 * Concrete implementation of a manager for persisting events to the Optimizely Data Platform
 */
export class OdpEventManager implements IOdpEventManager {
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
  private readonly apiManager: OdpEventApiManager;
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
  /**
   * Type of execution context eg node, js, react
   * @private
   */
  private readonly clientEngine: string;
  /**
   * Version of the client being used
   * @private
   */
  private readonly clientVersion: string;

  public constructor({
    odpConfig,
    apiManager,
    logger,
    clientEngine,
    clientVersion,
    queueSize,
    batchSize,
    flushInterval,
  }: {
    odpConfig: OdpConfig;
    apiManager: OdpEventApiManager;
    logger: LogHandler;
    clientEngine: string;
    clientVersion: string;
    queueSize?: number;
    batchSize?: number;
    flushInterval?: number;
  }) {
    this.odpConfig = odpConfig;
    this.apiManager = apiManager;
    this.logger = logger;
    this.clientEngine = clientEngine;
    this.clientVersion = clientVersion;

    let defaultQueueSize = DEFAULT_BROWSER_QUEUE_SIZE;
    // browser only accepts batchSize = 1
    this.batchSize = 1

    if (typeof process  !== 'undefined') {
      defaultQueueSize = DEFAULT_SERVER_QUEUE_SIZE;
      this.batchSize = batchSize || DEFAULT_BATCH_SIZE;
    } else if (typeof batchSize !== 'undefined' && batchSize !== 1) {
      this.logger.log(LogLevel.WARNING, 'ODP event batch size must be 1 in the browser.');
    }

    this.queueSize = queueSize || defaultQueueSize;
    this.flushInterval = flushInterval || DEFAULT_FLUSH_INTERVAL_MSECS;

    this.state = STATE.STOPPED;
  }

  /**
   * Update ODP configuration settings.
   * @param newConfig New configuration to apply
   */
  public updateSettings(newConfig: OdpConfig): void {
    this.odpConfig = newConfig;
  }

  /**
   * Cleans up all pending events; occurs every time the ODP Config is updated.
   */
  public flush(): void {
    this.processQueue(true);
  }

  /**
   * Start processing events in the queue
   */
  public start(): void {
    this.state = STATE.RUNNING;

    this.setNewTimeout();
  }

  /**
   * Drain the queue sending all remaining events in batches then stop processing
   */
  public async stop(): Promise<void> {
    this.logger.log(LogLevel.DEBUG, 'Stop requested.');

    await this.processQueue(true);

    this.state = STATE.STOPPED;
    this.logger.log(LogLevel.DEBUG, 'Stopped. Queue Count: %s', this.queue.length);
  }

  /**
   * Register a new visitor user id (VUID) in ODP
   * @param vuid Visitor User ID to send
   */
  public registerVuid(vuid: string): void {
    const identifiers = new Map<string, string>();
    identifiers.set(ODP_USER_KEY.VUID, vuid);

    const event = new OdpEvent(ODP_DEFAULT_EVENT_TYPE, ODP_EVENT_ACTION.INITIALIZED, identifiers);
    this.sendEvent(event);
  }

  /**
   * Associate a full-stack userid with an established VUID
   * @param {string} userId   (Optional) Full-stack User ID
   * @param {string} vuid     (Optional) Visitor User ID
   */
  public identifyUser(userId?: string, vuid?: string): void {
    const identifiers = new Map<string, string>();
    if (!userId && !vuid) {
      this.logger.log(LogLevel.ERROR, ERROR_MESSAGES.ODP_SEND_EVENT_FAILED_UID_MISSING);
      return;
    }

    if (vuid) {
      identifiers.set(ODP_USER_KEY.VUID, vuid);
    }

    if (userId) {
      identifiers.set(ODP_USER_KEY.FS_USER_ID, userId);
    }

    const event = new OdpEvent(ODP_DEFAULT_EVENT_TYPE, ODP_EVENT_ACTION.IDENTIFIED, identifiers);
    this.sendEvent(event);
  }

  /**
   * Send an event to ODP via dispatch queue
   * @param event ODP Event to forward
   */
  public sendEvent(event: OdpEvent): void {
    if (invalidOdpDataFound(event.data)) {
      this.logger.log(LogLevel.ERROR, 'Event data found to be invalid.');
    } else {
      event.data = this.augmentCommonData(event.data);
      this.enqueue(event);
    }
  }

  /**
   * Add a new event to the main queue
   * @param event ODP Event to be queued
   * @private
   */
  private enqueue(event: OdpEvent): void {
    if (this.state === STATE.STOPPED) {
      this.logger.log(LogLevel.WARNING, 'Failed to Process ODP Event. ODPEventManager is not running.');
      return;
    }

    if (!this.odpConfig.isReady()) {
      this.logger.log(LogLevel.DEBUG, 'Unable to Process ODP Event. ODPConfig is not ready.');
      return;
    }

    if (this.queue.length >= this.queueSize) {
      this.logger.log(
        LogLevel.WARNING,
        'Failed to Process ODP Event. Event Queue full. queueSize = %s.',
        this.queue.length
      );
      return;
    }

    this.queue.push(event);

    this.processQueue();
  }

  /**
   * Process events in the main queue
   * @param shouldFlush Flush all events regardless of available queue event count
   * @private
   */
  private processQueue(shouldFlush = false): void {
    if (this.state !== STATE.RUNNING) {
      return;
    }

    if (!this.isOdpConfigurationReady()) {
      return;
    }

    // Flush interval occurred & queue has items
    if (shouldFlush) {
      // clear the queue completely
      this.clearCurrentTimeout();

      this.state = STATE.PROCESSING;

      while (this.queueContainsItems()) {
        this.makeAndSend1Batch();
      }
    }
    // Check if queue has a full batch available
    else if (this.queueHasBatches()) {
      this.clearCurrentTimeout();

      this.state = STATE.PROCESSING;

      while (this.queueHasBatches()) {
        this.makeAndSend1Batch();
      }
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
    this.timeoutId = setTimeout(() => this.processQueue(true), this.flushInterval);
  }

  /**
   * Make a batch and send it to ODP
   * @private
   */
  private makeAndSend1Batch(): void {
    const batch = new Array<OdpEvent>();

    // remove a batch from the queue
    for (let count = 0; count < this.batchSize; count += 1) {
      const event = this.queue.shift();
      if (event) {
        batch.push(event);
      } else {
        break;
      }
    }

    if (batch.length > 0) {
      // put sending the event on another event loop
      setTimeout(async () => {
        let shouldRetry: boolean;
        let attemptNumber = 0;
        do {
          shouldRetry = await this.apiManager.sendEvents(this.odpConfig.apiKey, this.odpConfig.apiHost, batch);
          attemptNumber += 1;
        } while (shouldRetry && attemptNumber < MAX_RETRIES);
      });
    }
  }

  /**
   * Check if main queue has any full/even batches available
   * @returns True if there are event batches available in the queue otherwise False
   * @private
   */
  private queueHasBatches(): boolean {
    return this.queueContainsItems() && this.queue.length % this.batchSize === 0;
  }

  /**
   * Check if main queue has any items
   * @returns True if there are any events in the queue otherwise False
   * @private
   */
  private queueContainsItems(): boolean {
    return this.queue.length > 0;
  }

  /**
   * Check if the ODP Configuration is ready and log if not.
   * Potentially clear queue if server-side
   * @returns True if the ODP configuration is ready otherwise False
   * @private
   */
  private isOdpConfigurationReady(): boolean {
    if (this.odpConfig.isReady()) {
      return true;
    }

    if (typeof process !== 'undefined') {
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
   * Add additional common data including an idempotent ID and execution context to event data
   * @param sourceData Existing event data to augment
   * @returns Augmented event data
   * @private
   */
  private augmentCommonData(sourceData: Map<string, unknown>): Map<string, unknown> {
    const data = new Map<string, unknown>();
    data.set('idempotence_id', uuid());
    data.set('data_source_type', 'sdk');
    data.set('data_source', this.clientEngine);
    data.set('data_source_version', this.clientVersion);

    sourceData.forEach((value, key) => data.set(key, value));
    return data;
  }
}
