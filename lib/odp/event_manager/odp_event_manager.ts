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

import { v4 as uuidV4 } from 'uuid';
import { ERROR_MESSAGES, ODP_USER_KEY, ODP_DEFAULT_EVENT_TYPE, ODP_EVENT_ACTION } from '../../utils/enums';

import { OdpEvent } from './odp_event';
import { OdpConfig, OdpIntegrationConfig } from '../odp_config';
import { OdpEventApiManager } from './odp_event_api_manager';
import { invalidOdpDataFound } from '../odp_utils';
import { UserAgentParser } from '../ua_parser/user_agent_parser';
import { scheduleMicrotask } from '../../utils/microtask';
import { BaseService, Service, StartupLog } from '../../service';
import { BackoffController, Repeater } from '../../utils/repeater/repeater';
import { Maybe, Producer } from '../../utils/type';
import { RunResult, runWithRetry } from '../../utils/executor/backoff_retry_runner';
import { IdGenerator } from '../../utils/id_generator';
import { isSuccessStatusCode } from '../../utils/http_request_handler/http_util';

const MAX_RETRIES = 3;

export interface OdpEventManager extends Service {
  updateConfig(odpIntegrationConfig: OdpIntegrationConfig): void;
  identifyUser(userId?: string, vuid?: string): void;
  sendEvent(event: OdpEvent): void;
  setClientInfo(clientEngine: string, clientVersion: string): void;
}

export type RetryConfig = {
  maxRetries: number;
  backoffProvider: Producer<BackoffController>;
}

export type OdpEventManagerConfig = {
  repeater: Repeater,
  apiManager: OdpEventApiManager,
  batchSize: number,
  userAgentParser?: UserAgentParser,
  startUpLogs?: StartupLog[],
  retryConfig: RetryConfig,
};


export class DefaultOdpEventManager extends BaseService implements OdpEventManager {
  private queue: OdpEvent[] = [];
  private repeater: Repeater;
  private odpIntegrationConfig?: OdpIntegrationConfig;
  private apiManager: OdpEventApiManager;
  private batchSize: number;
  private clientEngine?: string;
  private clientVersion?: string;
  private retryConfig: RetryConfig;

  private readonly userAgentData?: Map<string, unknown>;

  constructor(config: OdpEventManagerConfig) {
    super(config.startUpLogs);

    this.apiManager = config.apiManager;
    this.batchSize = config.batchSize;
    this.retryConfig = config.retryConfig;

    this.repeater = config.repeater;
    this.repeater.setTask(() => this.flush());

    if (config.userAgentParser) {
      const { os, device } = config.userAgentParser.parseUserAgentInfo();

      const userAgentInfo: Record<string, unknown> = {
        'os': os.name,
        'os_version': os.version,
        'device_type': device.type,
        'model': device.model,
      };

      this.userAgentData = new Map<string, unknown>(
        Object.entries(userAgentInfo).filter(([_, value]) => value != null && value != undefined)
      );
    }
  }

  setClientInfo(clientEngine: string, clientVersion: string): void {
    this.clientEngine = clientEngine;
    this.clientVersion = clientVersion;
  }

  updateConfig(odpIntegrationConfig: OdpIntegrationConfig): void {
    this.flush();
    this.odpIntegrationConfig = odpIntegrationConfig;
  }

  private async executeDispatch(odpConfig: OdpConfig, batch: OdpEvent[]): Promise<unknown> {
    return this.apiManager.sendEvents(odpConfig, batch).then((res) => {
      if (res.statusCode && !isSuccessStatusCode(res.statusCode)) {
        return Promise.reject(new Error(`Failed to dispatch events: ${res.statusCode}`));
      }
      return Promise.resolve(res);
    });
  }

  private async flush(): Promise<unknown> {
    let odpConfig: Maybe<OdpConfig>;

    if (!this.odpIntegrationConfig || !this.odpIntegrationConfig.integrated) {
      return;
    } else {
      odpConfig = this.odpIntegrationConfig.odpConfig;
    }

    const batch = this.queue;
    this.queue = [];

    return runWithRetry(
      () => this.executeDispatch(odpConfig, batch), this.retryConfig.backoffProvider(), this.retryConfig.maxRetries
    ).result.catch((err) => {
      // TODO: replace with imported constants
      this.logger?.error('failed to send odp events', err);
    });
  }

  start(): void {
    // if (!this.odpIntegrationConfig) {
    //   this.logger.log(LogLevel.ERROR, ERROR_MESSAGES.ODP_CONFIG_NOT_AVAILABLE);
    //   return;
    // }

    // this.status = Status.Running;

    // // no need of periodic flush if batchSize is 1
    // if (this.batchSize > 1) {
    //   this.setNewTimeout();
    // }
  }

  async stop(): Promise<void> {
    this.logger.log(LogLevel.DEBUG, 'Stop requested.');

    this.flush();
    this.clearCurrentTimeout();
    this.status = Status.Stopped;
    this.logger.log(LogLevel.DEBUG, 'Stopped. Queue Count: %s', this.queue.length);
  }

  // TODO: move this to ODP manager
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

    if (this.queue.length >= this.batchSize) {
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
    if (!this.odpIntegrationConfig) {
      return;
    }

    const batch = this.queue.splice(0, this.batchSize);

    const odpConfig = this.odpIntegrationConfig;

    if (batch.length > 0) {
      // put sending the event on another event loop
      scheduleMicrotask(async () => {
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
  
    data.set('idempotence_id', uuidV4());
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
