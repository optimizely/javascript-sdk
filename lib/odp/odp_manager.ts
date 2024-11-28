/**
 * Copyright 2023-2024, Optimizely
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

import { v4 as uuidV4} from 'uuid';
import { LoggerFacade } from '../modules/logging';

import { OdpIntegrationConfig, odpIntegrationsAreEqual } from './odp_config';
import { OdpEventManager } from './event_manager/odp_event_manager';
import { OdpSegmentManager } from './segment_manager/odp_segment_manager';
import { OptimizelySegmentOption } from './segment_manager/optimizely_segment_option';
import { OdpEvent } from './event_manager/odp_event';
import { resolvablePromise, ResolvablePromise } from '../utils/promise/resolvablePromise';
import { BaseService, Service, ServiceState } from '../service';
import { UserAgentParser } from './ua_parser/user_agent_parser';
import { ERROR_MESSAGES } from '../utils/enums';
import { ODP_DEFAULT_EVENT_TYPE, ODP_EVENT_ACTION, ODP_IDENTIFIER_KEY } from './constant';
import { isVuid } from '../vuid/vuid';

export interface OdpManager extends Service {
  updateSettings(odpIntegrationConfig: OdpIntegrationConfig): boolean;
  fetchQualifiedSegments(userId: string, options?: Array<OptimizelySegmentOption>): Promise<string[] | null>;
  identifyUser(userId?: string, vuid?: string): void;
  sendEvent(event: OdpEvent): void;
  setClientInfo(clientEngine: string, clientVersion: string): void;
}

export type OdpManagerConfig = {
  segmentManager: OdpSegmentManager;
  eventManager: OdpEventManager;
  logger?: LoggerFacade;
  userAgentParser?: UserAgentParser;
};

export class DefaultOdpManager extends BaseService implements OdpManager {
  private configPromise: ResolvablePromise<void>;
  private segmentManager: OdpSegmentManager;
  private eventManager: OdpEventManager;
  private odpIntegrationConfig?: OdpIntegrationConfig;
  private vuid?: string;
  private clientEngine?: string;
  private clientVersion?: string;
  private userAgentData?: Map<string, unknown>;

  constructor(config: OdpManagerConfig) {
    super();
    this.segmentManager = config.segmentManager;
    this.eventManager = config.eventManager;
    this.logger = config.logger;

    this.configPromise = resolvablePromise();

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

    // const readinessDependencies: PromiseLike<unknown>[] = [this.configPromise, this.on];

    // if (this.isVuidEnabled()) {
    //   readinessDependencies.push(this.initializeVuid());
    // }
    // this.initPromise = Promise.all(readinessDependencies);

    // this.onReady().then(() => {
    //   this.ready = true;
    //   if (this.isVuidEnabled() && this.status === Status.Running) {
    //     this.registerVuid();
    //   }
    // });

    // if (odpIntegrationConfig) {
    //   this.updateSettings(odpIntegrationConfig);
    // }
  }

  // private async activate(): Promise<void> {
  //   if (!this.odpIntegrationConfig) {
  //     return;
  //   }

  //   if (!this.odpIntegrationConfig.integrated) {
  //     return;
  //   }

  //   this.activityStatus = ActivityStatus.Activating;
    
  //   this.segmentManager.updateSettings(this.odpIntegrationConfig.odpConfig);
  //   this.eventManager.updateSettings(this.odpIntegrationConfig.odpConfig);
  //   this.eventManager.start();
  //   return Promise.resolve();
  // }

  setClientInfo(clientEngine: string, clientVersion: string): void {
    this.clientEngine = clientEngine;
    this.clientVersion = clientVersion;
  }

  start(): void {
    if (!this.isNew()) {
      return;
    }

    this.state = ServiceState.Starting;

    this.segmentManager.start();
    this.eventManager.start();

    const startDependencies = [
      this.configPromise,
      this.segmentManager.onRunning(),
      this.eventManager.onRunning(),
    ];

    Promise.all(startDependencies)
      .then(() => {
        this.handleStartSuccess();
      }).catch((err) => {
        this.handleStartFailure(err);
      });
    // this.segmentManager.updateSettings(this.odpIntegrationConfig.odpConfig);
    // this.eventManager.updateSettings(this.odpIntegrationConfig.odpConfig);
    // this.eventManager.start();
    // return Promise.resolve();
  }

  private handleStartSuccess() {
    if (this.isDone()) {
      return;
    }
    this.state = ServiceState.Running;
    this.startPromise.resolve();
  }

  private handleStartFailure(error: Error) {
    if (this.isDone()) {
      return;
    }

    this.state = ServiceState.Failed;
    this.startPromise.reject(error);
    this.stopPromise.reject(error);
  }

  stop(): void {
    // if (this.status === Status.Stopped) {
    //   return;
    // }
    // this.status = Status.Stopped;
    // await this.eventManager.stop();
  }

  /**
   * Provides a method to update ODP Manager's ODP Config
   */
  updateSettings(odpIntegrationConfig: OdpIntegrationConfig): boolean {
    // do nothing if config did not change
    if (this.odpIntegrationConfig && odpIntegrationsAreEqual(this.odpIntegrationConfig, odpIntegrationConfig)) {
      return false;
    }

    if (this.isDone()) {
      return false;
    }

    this.odpIntegrationConfig = odpIntegrationConfig;

    if (this.isStarting()) {
      this.configPromise.resolve();
    }

    this.segmentManager.updateSettings(odpIntegrationConfig)
    this.eventManager.updateConfig(odpIntegrationConfig);

    return true;
  }

  /**
   * Attempts to fetch and return a list of a user's qualified segments from the local segments cache.
   * If no cached data exists for the target user, this fetches and caches data from the ODP server instead.
   * @param {string}                          userId  - Unique identifier of a target user.
   * @param {Array<OptimizelySegmentOption>}  options - An array of OptimizelySegmentOption used to ignore and/or reset the cache.
   * @returns {Promise<string[] | null>}      A promise holding either a list of qualified segments or null.
   */
  async fetchQualifiedSegments(userId: string, options: Array<OptimizelySegmentOption> = []): Promise<string[] | null> {
    // if (!this.odpIntegrationConfig) {
    //   this.logger.log(LogLevel.ERROR, ERROR_MESSAGES.ODP_CONFIG_NOT_AVAILABLE);
    //   return null;
    // }

    // if (!this.odpIntegrationConfig.integrated) {
    //   this.logger.log(LogLevel.ERROR, ERROR_MESSAGES.ODP_NOT_INTEGRATED);
    //   return null;
    // }

    if (isVuid(userId)) {
      return this.segmentManager.fetchQualifiedSegments(ODP_IDENTIFIER_KEY.VUID, userId, options);
    }

    return this.segmentManager.fetchQualifiedSegments(ODP_IDENTIFIER_KEY.FS_USER_ID, userId, options);
  }

  identifyUser(userId?: string, vuid?: string): void {
    const identifiers = new Map<string, string>();
    if (!userId && !vuid) {
      this.logger?.error(ERROR_MESSAGES.ODP_SEND_EVENT_FAILED_UID_MISSING);
      return;
    }

    if (vuid) {
      identifiers.set(ODP_IDENTIFIER_KEY.VUID, vuid);
    }

    if (userId) {
      identifiers.set(ODP_IDENTIFIER_KEY.FS_USER_ID, userId);
    }

    const event = new OdpEvent(ODP_DEFAULT_EVENT_TYPE, ODP_EVENT_ACTION.IDENTIFIED, identifiers);
    this.sendEvent(event);
  }

  sendEvent(event: OdpEvent): void {
    if (!event.identifiers.has(ODP_IDENTIFIER_KEY.VUID) && this.vuid) {
      event.identifiers.set(ODP_IDENTIFIER_KEY.VUID, this.vuid);
    }

    event.data = this.augmentCommonData(event.data);
    this.eventManager.sendEvent(event);
  }

  private augmentCommonData(sourceData: Map<string, unknown>): Map<string, unknown> {
    const data = new Map<string, unknown>(this.userAgentData);
  
    data.set('idempotence_id', uuidV4());
    data.set('data_source_type', 'sdk');
    data.set('data_source', this.clientEngine || '');
    data.set('data_source_version', this.clientVersion || '');

    sourceData.forEach((value, key) => data.set(key, value));
    return data;
  }

  setVuid(vuid: string): void {
    this.vuid = vuid;
    this.onRunning().then(() => {
      const event = new OdpEvent(ODP_DEFAULT_EVENT_TYPE, ODP_EVENT_ACTION.INITIALIZED);
      this.sendEvent(event);
    });
  }
}
