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

import { OdpEvent } from './odp_event';
import { OdpConfig, OdpIntegrationConfig } from '../odp_config';
import { OdpEventApiManager } from './odp_event_api_manager';
import { BaseService, Service, ServiceState, StartupLog } from '../../service';
import { BackoffController, Repeater } from '../../utils/repeater/repeater';
import { Producer } from '../../utils/type';
import { runWithRetry } from '../../utils/executor/backoff_retry_runner';
import { isSuccessStatusCode } from '../../utils/http_request_handler/http_util';
import { ODP_DEFAULT_EVENT_TYPE, ODP_USER_KEY } from '../constant';
import {
  EVENT_ACTION_INVALID,
  EVENT_DATA_FOUND_TO_BE_INVALID,
  FAILED_TO_SEND_ODP_EVENTS,
  ODP_EVENT_MANAGER_IS_NOT_RUNNING,
  ODP_EVENTS_SHOULD_HAVE_ATLEAST_ONE_KEY_VALUE,
  ODP_NOT_INTEGRATED,
} from '../../error_messages';
import { sprintf } from '../../utils/fns';
import { FAILED_TO_DISPATCH_EVENTS_WITH_ARG, ODP_EVENT_MANAGER_STOPPED } from '../../exception_messages';

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

  constructor(config: OdpEventManagerConfig) {
    super(config.startUpLogs);

    this.apiManager = config.apiManager;
    this.batchSize = config.batchSize;
    this.retryConfig = config.retryConfig;

    this.repeater = config.repeater;
    this.repeater.setTask(() => this.flush());
  }

  private async executeDispatch(odpConfig: OdpConfig, batch: OdpEvent[]): Promise<unknown> {
    const res = await this.apiManager.sendEvents(odpConfig, batch);
    if (res.statusCode && !isSuccessStatusCode(res.statusCode)) {
      return Promise.reject(new Error(sprintf(FAILED_TO_DISPATCH_EVENTS_WITH_ARG, res.statusCode)));
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

    // as the queue has been emptied, stop repeating flush
    // until more events become available
    this.repeater.reset();

    return runWithRetry(
      () => this.executeDispatch(odpConfig, batch), this.retryConfig.backoffProvider(), this.retryConfig.maxRetries
    ).result.catch((err) => {
      this.logger?.error(FAILED_TO_SEND_ODP_EVENTS, err);
    });
  }

  start(): void {
    if (!this.isNew) {
      return;
    }
    // Override for disposable event manager 
    if(this.disposable) {
      this.retryConfig.maxRetries = 5;
      this.batchSize = 1
    }

    super.start();
    if (this.odpIntegrationConfig) {
      this.goToRunningState();
    } else {
      this.state = ServiceState.Starting;
    }
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
      this.startPromise.reject(new Error(ODP_EVENT_MANAGER_STOPPED));
    }

    this.flush();
    this.state = ServiceState.Terminated;
    this.stopPromise.resolve();
  }

  sendEvent(event: OdpEvent): void {
    if (!this.isRunning()) {
      this.logger?.error(ODP_EVENT_MANAGER_IS_NOT_RUNNING);
      return;
    }

    if (!this.odpIntegrationConfig?.integrated) {
       this.logger?.error(ODP_NOT_INTEGRATED);
       return;
    }

    if (event.identifiers.size === 0) {
      this.logger?.error(ODP_EVENTS_SHOULD_HAVE_ATLEAST_ONE_KEY_VALUE);
      return;
    }

    if (!this.isDataValid(event.data)) {
      this.logger?.error(EVENT_DATA_FOUND_TO_BE_INVALID);
      return;
    } 

    if (!event.action ) {
      this.logger?.error(EVENT_ACTION_INVALID);
      return;
    }

    if (event.type === '') {
      event.type = ODP_DEFAULT_EVENT_TYPE;
    }

    Array.from(event.identifiers.entries()).forEach(([key, value]) => {
      // Catch for fs-user-id, FS-USER-ID, and FS_USER_ID and assign value to fs_user_id identifier.
      if (
        ODP_USER_KEY.FS_USER_ID_ALIAS === key.toLowerCase() ||
        ODP_USER_KEY.FS_USER_ID === key.toLowerCase()
      ) {
        event.identifiers.delete(key);
        event.identifiers.set(ODP_USER_KEY.FS_USER_ID, value);
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
    } else if (!this.repeater.isRunning()) {
      this.repeater.start();
    }
  }
}
