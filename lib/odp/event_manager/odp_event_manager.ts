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

import { LogLevel } from '../../modules/logging';

import { OdpEvent } from './odp_event';
import { OdpConfig, OdpIntegrationConfig } from '../odp_config';
import { OdpEventApiManager } from './odp_event_api_manager';
import { BaseService, Service, ServiceState, StartupLog } from '../../service';
import { BackoffController, Repeater } from '../../utils/repeater/repeater';
import { Producer } from '../../utils/type';
import { runWithRetry } from '../../utils/executor/backoff_retry_runner';
import { isSuccessStatusCode } from '../../utils/http_request_handler/http_util';
import { ERROR_MESSAGES } from '../../utils/enums';
import { FS_USER_ID_ALIAS, ODP_DEFAULT_EVENT_TYPE, ODP_IDENTIFIER_KEY } from '../constant';

export interface OdpEventManager extends Service {
  updateConfig(odpIntegrationConfig: OdpIntegrationConfig): void;
  sendEvent(event: OdpEvent): void;
}

export type RetryConfig = {
  maxRetries: number;
  backoffProvider: Producer<BackoffController>;
}

export type OdpEventManagerConfig = {
  repeater: Repeater,
  apiManager: OdpEventApiManager,
  batchSize: number,
  startUpLogs?: StartupLog[],
  retryConfig: RetryConfig,
};

export class DefaultOdpEventManager extends BaseService implements OdpEventManager {
  private queue: OdpEvent[] = [];
  private repeater: Repeater;
  private odpIntegrationConfig?: OdpIntegrationConfig;
  private apiManager: OdpEventApiManager;
  private batchSize: number;

  private retryConfig: RetryConfig;

  // private readonly userAgentData?: Map<string, unknown>;

  constructor(config: OdpEventManagerConfig) {
    super(config.startUpLogs);

    this.apiManager = config.apiManager;
    this.batchSize = config.batchSize;
    this.retryConfig = config.retryConfig;

    this.repeater = config.repeater;
    this.repeater.setTask(() => this.flush());

    // if (config.userAgentParser) {
    //   const { os, device } = config.userAgentParser.parseUserAgentInfo();

    //   const userAgentInfo: Record<string, unknown> = {
    //     'os': os.name,
    //     'os_version': os.version,
    //     'device_type': device.type,
    //     'model': device.model,
    //   };

    //   this.userAgentData = new Map<string, unknown>(
    //     Object.entries(userAgentInfo).filter(([_, value]) => value != null && value != undefined)
    //   );
    // }
  }

  // setClientInfo(clientEngine: string, clientVersion: string): void {
  //   this.clientEngine = clientEngine;
  //   this.clientVersion = clientVersion;
  // }

  private async executeDispatch(odpConfig: OdpConfig, batch: OdpEvent[]): Promise<unknown> {
    const res = await this.apiManager.sendEvents(odpConfig, batch);
    if (res.statusCode && !isSuccessStatusCode(res.statusCode)) {
      // TODO: replace message with imported constants
      return Promise.reject(new Error(`Failed to dispatch events: ${res.statusCode}`));
    }
    return await Promise.resolve(res);
  }

  private async flush(): Promise<unknown> {
    if (!this.odpIntegrationConfig || !this.odpIntegrationConfig.integrated) {
      return;
    }

    const odpConfig = this.odpIntegrationConfig.odpConfig;

    const batch = this.queue;
    this.queue = [];

    // as the current queue has been emptied, stop repeating flus
    // until more events becomes availabe
    this.repeater.reset();

    return runWithRetry(
      () => this.executeDispatch(odpConfig, batch), this.retryConfig.backoffProvider(), this.retryConfig.maxRetries
    ).result.catch((err) => {
      // TODO: replace with imported constants
      this.logger?.error('failed to send odp events', err);
    });
  }

  start(): void {
    if (!this.isNew) {
      return;
    }

    super.start();
    if (this.odpIntegrationConfig) {
      this.goToRunningState();
    } else {
      this.state = ServiceState.Starting;
    }

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

  updateConfig(odpIntegrationConfig: OdpIntegrationConfig): void {
    if (this.isDone()) {
      return;
    }

    if (this.isNew()) {
      this.odpIntegrationConfig = odpIntegrationConfig;
      return;
    }

    if (this.isStarting()) {
      this.odpIntegrationConfig = odpIntegrationConfig;
      this.goToRunningState();
      return;
    }

    // already running, flush the queue using the previous config first before updating the config
    this.flush();
    this.odpIntegrationConfig = odpIntegrationConfig;
  }

  private goToRunningState() {
    this.state = ServiceState.Running;
    this.startPromise.resolve();
  }

  stop(): void {
    if (this.isDone()) {
      return;
    }

    if (this.isNew()) {
      this.startPromise.reject(new Error('odp event manager stopped before it could start'));
    }

    this.flush();
    this.state = ServiceState.Terminated;
    this.stopPromise.resolve();
  }

  // TODO: move this to ODP manager
  /**
   * Associate a full-stack userid with an established VUID
   * @param {string} userId   (Optional) Full-stack User ID
   * @param {string} vuid     (Optional) Visitor User ID
   */
  // identifyUser(userId?: string, vuid?: string): void {
  //   const identifiers = new Map<string, string>();
  //   if (!userId && !vuid) {
  //     this.logger.log(LogLevel.ERROR, ERROR_MESSAGES.ODP_SEND_EVENT_FAILED_UID_MISSING);
  //     return;
  //   }

  //   if (vuid) {
  //     identifiers.set(ODP_USER_KEY.VUID, vuid);
  //   }

  //   if (userId) {
  //     identifiers.set(ODP_USER_KEY.FS_USER_ID, userId);
  //   }

  //   const event = new OdpEvent(ODP_DEFAULT_EVENT_TYPE, ODP_EVENT_ACTION.IDENTIFIED, identifiers);
  //   this.sendEvent(event);
  // }

  sendEvent(event: OdpEvent): void {
    if (!this.isRunning()) {
      this.logger?.error('ODP event manager is not running.');
      return;
    }

    if (!this.odpIntegrationConfig?.integrated) {
       this.logger?.error(ERROR_MESSAGES.ODP_NOT_INTEGRATED);
       return;
    }

    if (event.identifiers.size === 0) {
      this.logger?.log(LogLevel.ERROR, 'ODP events should have at least one key-value pair in identifiers.');
      return;
    }

    if (!this.isDataValid(event.data)) {
      this.logger?.error('Event data found to be invalid.');
      return;
    } 

    if (!event.action ) {
      this.logger?.error('Event action invalid.');
      return;
    }

    if (event.type === '') {
      event.action = ODP_DEFAULT_EVENT_TYPE;
    }

    event.identifiers.forEach((key, value) => {
      // Catch for fs-user-id, FS-USER-ID, and FS_USER_ID and assign value to fs_user_id identifier.
      if (
        FS_USER_ID_ALIAS === key.toLowerCase() ||
        ODP_IDENTIFIER_KEY.FS_USER_ID === key.toLowerCase()
      ) {
        event.identifiers.delete(key);
        event.identifiers.set(ODP_IDENTIFIER_KEY.FS_USER_ID, value);
      }
    });
  
    this.processEvent(event);
  }

  private isDataValid(data: Map<string, any>): boolean {
    const validTypes: string[] = ['string', 'number', 'boolean'];
    return Array.from(data.values()).reduce(
      (valid, value) => valid && (value === null || validTypes.includes(typeof value)),
      true,
    );
  }

  private processEvent(event: OdpEvent): void {
    this.queue.push(event);

    if (this.queue.length === this.batchSize) {
      this.flush();
    } else if (!this.repeater.isRunning() && this.batchSize > 1) {
      // no need to repeatedly flush if batchSize is 1
      this.repeater.start();
    }
  }

  // TODO: move to ODP maanger
  /**
   * Add additional common data including an idempotent ID and execution context to event data
   * @param sourceData Existing event data to augment
   * @returns Augmented event data
   * @private
   */
  // private augmentCommonData(sourceData: Map<string, unknown>): Map<string, unknown> {
  //   const data = new Map<string, unknown>(this.userAgentData);
  
  //   data.set('idempotence_id', uuidV4());
  //   data.set('data_source_type', 'sdk');
  //   data.set('data_source', this.clientEngine);
  //   data.set('data_source_version', this.clientVersion);

  //   sourceData.forEach((value, key) => data.set(key, value));
  //   return data;
  // }
}
