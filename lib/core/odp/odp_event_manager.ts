/**
 * Copyright 2022-2024, Optimizely
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
import { IOdpEventApiManager } from './odp_event_api_manager';
import { invalidOdpDataFound } from './odp_utils';
import { IUserAgentParser } from './user_agent_parser';
import { scheduleMicrotaskOrTimeout } from '../../utils/microtask';

const MAX_RETRIES = 3;

/**
 * Event dispatcher's execution states
 */
export enum Status {
  Stopped,
  Running,
}

/**
 * Manager for persisting events to the Optimizely Data Platform (ODP)
 */
export interface IOdpEventManager {
  updateSettings(odpConfig: OdpConfig): void;

  start(): void;

  stop(): Promise<void>;

  sendInitializedEvent(vuid: string): void;

  identifyUser(userId?: string, vuid?: string): void;

  sendEvent(event: OdpEvent): void;

  flush(retry?: boolean): void;
}

/**
 * Concrete implementation of a manager for persisting events to the Optimizely Data Platform
 */
export abstract class OdpEventManager implements IOdpEventManager {
  /**
   * Current state of the event processor
   */
  status: Status = Status.Stopped;

  /**
   * Queue for holding all events to be eventually dispatched
   * @protected
   */
  protected queue = new Array<OdpEvent>();

  /**
   * Identifier of the currently running timeout so clearCurrentTimeout() can be called
   * @private
   */
  private timeoutId?: NodeJS.Timeout | number;

  /**
   * ODP configuration settings for identifying the target API and segments
   * @private
   */
  private odpConfig?: OdpConfig;

  /**
   * REST API Manager used to send the events
   * @private
   */
  private readonly apiManager: IOdpEventApiManager;

  /**
   * Handler for recording execution logs
   * @private
   */
  private readonly logger: LogHandler;

  /**
   * Maximum queue size
   * @protected
   */
  protected queueSize!: number;

  /**
   * Maximum number of events to process at once. Ignored in browser context
   * @protected
   */
  protected batchSize!: number;

  /**
   * Milliseconds between setTimeout() to process new batches. Ignored in browser context
   * @protected
   */
  protected flushInterval!: number;

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

  /**
   * Version of the client being used
   * @private
   */
  private readonly userAgentParser?: IUserAgentParser;

  private retries: number;


  /**
   * Information about the user agent
   * @private
   */
  private readonly userAgentData?: Map<string, unknown>;

  constructor({
    odpConfig,
    apiManager,
    logger,
    clientEngine,
    clientVersion,
    queueSize,
    batchSize,
    flushInterval,
    userAgentParser,
    retries,
  }: {
    odpConfig?: OdpConfig;
    apiManager: IOdpEventApiManager;
    logger: LogHandler;
    clientEngine: string;
    clientVersion: string;
    queueSize?: number;
    batchSize?: number;
    flushInterval?: number;
    userAgentParser?: IUserAgentParser;
    retries?: number;
  }) {
    this.apiManager = apiManager;
    this.logger = logger;
    this.clientEngine = clientEngine;
    this.clientVersion = clientVersion;
    this.initParams(batchSize, queueSize, flushInterval);
    this.status = Status.Stopped;
    this.userAgentParser = userAgentParser;
    this.retries = retries || MAX_RETRIES;

    if (userAgentParser) {
      const { os, device } = userAgentParser.parseUserAgentInfo();

      const userAgentInfo: Record<string, unknown> = {
        'os': os.name,
        'os_version': os.version,
        'device_type': device.type,
        'model': device.model,
      };

      this.userAgentData = new Map<string, unknown>(
        Object.entries(userAgentInfo).filter(([key, value]) => value != null && value != undefined)
      );
    }

    if (odpConfig) {
      this.updateSettings(odpConfig);
    }
  }

  protected abstract initParams(
    batchSize: number | undefined,
    queueSize: number | undefined,
    flushInterval: number | undefined
  ): void;

  /**
   * Update ODP configuration settings.
   * @param newConfig New configuration to apply
   */
  updateSettings(odpConfig: OdpConfig): void {
    // do nothing if config did not change
    if (this.odpConfig && this.odpConfig.equals(odpConfig)) {
      return;
    }

    this.flush();
    this.odpConfig = odpConfig;
  }

  /**
   * Cleans up all pending events;
   */
  flush(): void {
    this.processQueue(true);
  }

  /**
   * Start the event manager
   */
  start(): void {
    if (!this.odpConfig) {
      this.logger.log(LogLevel.ERROR, ERROR_MESSAGES.ODP_CONFIG_NOT_AVAILABLE);
      return;
    }

    this.status = Status.Running;

    // no need of periodic flush if batchSize is 1
    if (this.batchSize > 1) {
      this.setNewTimeout();
    }
  }

  /**
   * Drain the queue sending all remaining events in batches then stop processing
   */
  async stop(): Promise<void> {
    this.logger.log(LogLevel.DEBUG, 'Stop requested.');

    this.flush();
    this.clearCurrentTimeout();
    this.status = Status.Stopped;
    this.logger.log(LogLevel.DEBUG, 'Stopped. Queue Count: %s', this.queue.length);
  }

  /**
   * Register a new visitor user id (VUID) in ODP
   * @param vuid Visitor User ID to send
   */
  sendInitializedEvent(vuid: string): void {
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
  identifyUser(userId?: string, vuid?: string): void {
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
  sendEvent(event: OdpEvent): void {
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
    if (this.status === Status.Stopped) {
      this.logger.log(LogLevel.WARNING, 'Failed to Process ODP Event. ODPEventManager is not running.');
      return;
    }

    if (!this.hasNecessaryIdentifiers(event)) {
      this.logger.log(LogLevel.ERROR, 'ODP events should have at least one key-value pair in identifiers.');
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

  protected abstract hasNecessaryIdentifiers(event: OdpEvent): boolean;

  /**
   * Process events in the main queue
   * @param shouldFlush Flush all events regardless of available queue event count
   * @private
   */
  private processQueue(shouldFlush = false): void {
    if (this.status !== Status.Running) {
      return;
    }
    
    if (shouldFlush) {
      // clear the queue completely
      this.clearCurrentTimeout();

      while (this.queueContainsItems()) {
        this.makeAndSend1Batch();
      }
    } else if (this.queueHasBatches()) {
      // Check if queue has a full batch available
      this.clearCurrentTimeout();

      while (this.queueHasBatches()) {
        this.makeAndSend1Batch();
      }
    }

    // no need for periodic flush if batchSize is 1
    if (this.batchSize > 1) {
      this.setNewTimeout();
    }
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
    if (!this.odpConfig) {
      return;
    }

    const batch = this.queue.splice(0, this.batchSize);

    const odpConfig = this.odpConfig;

    if (batch.length > 0) {
      // put sending the event on another event loop
      scheduleMicrotaskOrTimeout(async () => {
        let shouldRetry: boolean;
        let attemptNumber = 0;
        do {
          shouldRetry = await this.apiManager.sendEvents(odpConfig, batch);
          attemptNumber += 1;
        } while (shouldRetry && attemptNumber < this.retries);
      })
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

  protected abstract discardEventsIfNeeded(): void;

  /**
   * Add additional common data including an idempotent ID and execution context to event data
   * @param sourceData Existing event data to augment
   * @returns Augmented event data
   * @private
   */
  private augmentCommonData(sourceData: Map<string, unknown>): Map<string, unknown> {
    const data = new Map<string, unknown>(this.userAgentData);
  
    data.set('idempotence_id', uuid());
    data.set('data_source_type', 'sdk');
    data.set('data_source', this.clientEngine);
    data.set('data_source_version', this.clientVersion);

    sourceData.forEach((value, key) => data.set(key, value));
    return data;
  }

  protected getLogger(): LogHandler {
    return this.logger;
  }

  getQueue(): OdpEvent[] {
    return this.queue;
  }
}
