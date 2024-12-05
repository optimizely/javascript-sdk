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
import { CLIENT_VERSION, ERROR_MESSAGES, JAVASCRIPT_CLIENT_ENGINE } from '../utils/enums';
import { ODP_DEFAULT_EVENT_TYPE, ODP_EVENT_ACTION, ODP_USER_KEY } from './constant';
import { isVuid } from '../vuid/vuid';
import { Maybe } from '../utils/type';

export interface OdpManager extends Service {
  updateConfig(odpIntegrationConfig: OdpIntegrationConfig): boolean;
  fetchQualifiedSegments(userId: string, options?: Array<OptimizelySegmentOption>): Promise<string[] | null>;
  identifyUser(userId: string, vuid?: string): void;
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
  private clientEngine = JAVASCRIPT_CLIENT_ENGINE;
  private clientVersion = CLIENT_VERSION;
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
  }

  setClientInfo(clientEngine: string, clientVersion: string): void {
    this.clientEngine = clientEngine;
    this.clientVersion = clientVersion;
  }

  start(): void {
    if (!this.isNew()) {
      return;
    }

    this.state = ServiceState.Starting;

    this.eventManager.start();

    const startDependencies = [
      this.configPromise,
      this.eventManager.onRunning(),
    ];

    Promise.all(startDependencies)
      .then(() => {
        this.handleStartSuccess();
      }).catch((err) => {
        this.handleStartFailure(err);
      });
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
    if (this.isDone()) {
      return;
    }

    if (!this.isRunning()) {
      this.startPromise.reject(new Error('odp manager stopped before running'));
    }

    this.state = ServiceState.Stopping;
    this.eventManager.stop();

    this.eventManager.onTerminated().then(() => {
      this.state = ServiceState.Terminated;
      this.stopPromise.resolve();
    }).catch((err) => {
      this.state = ServiceState.Failed;
      this.stopPromise.reject(err);
    });
  }

  updateConfig(odpIntegrationConfig: OdpIntegrationConfig): boolean {
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

    this.segmentManager.updateConfig(odpIntegrationConfig)
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
    if (isVuid(userId)) {
      return this.segmentManager.fetchQualifiedSegments(ODP_USER_KEY.VUID, userId, options);
    }

    return this.segmentManager.fetchQualifiedSegments(ODP_USER_KEY.FS_USER_ID, userId, options);
  }

  identifyUser(userId: string, vuid?: string): void {
    const identifiers = new Map<string, string>();
    
    let finalUserId: Maybe<string> = userId;
    let finalVuid: Maybe<string> = vuid;

    if (!vuid && isVuid(userId)) {
      finalVuid = userId;
      finalUserId = undefined;
    }

    if (finalVuid) {
      identifiers.set(ODP_USER_KEY.VUID, finalVuid);
    }

    if (finalUserId) {
      identifiers.set(ODP_USER_KEY.FS_USER_ID, finalUserId);
    }

    const event = new OdpEvent(ODP_DEFAULT_EVENT_TYPE, ODP_EVENT_ACTION.IDENTIFIED, identifiers);
    this.sendEvent(event);
  }

  sendEvent(event: OdpEvent): void {
    if (!event.identifiers.has(ODP_USER_KEY.VUID) && this.vuid) {
      event.identifiers.set(ODP_USER_KEY.VUID, this.vuid);
    }

    event.data = this.augmentCommonData(event.data);
    this.eventManager.sendEvent(event);
  }

  private augmentCommonData(sourceData: Map<string, unknown>): Map<string, unknown> {
    const data = new Map<string, unknown>(this.userAgentData);
  
    data.set('idempotence_id', uuidV4());
    data.set('data_source_type', 'sdk');
    data.set('data_source', this.clientEngine);
    data.set('data_source_version', this.clientVersion);

    sourceData.forEach((value, key) => data.set(key, value));
    return data;
  }

  setVuid(vuid: string): void {
    this.vuid = vuid;
    this.onRunning().then(() => {
      if (this.odpIntegrationConfig?.integrated) {
        const event = new OdpEvent(ODP_DEFAULT_EVENT_TYPE, ODP_EVENT_ACTION.INITIALIZED);
        this.sendEvent(event);
      }
    });
  }
}
