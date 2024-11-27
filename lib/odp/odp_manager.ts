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

import { LoggerFacade, LogLevel } from '../modules/logging';
import { ERROR_MESSAGES, ODP_USER_KEY } from '../utils/enums';

import { VuidManager } from '../plugins/vuid_manager';

import { OdpIntegrationConfig, odpIntegrationsAreEqual } from './odp_config';
import { OdpEventManager } from './event_manager/odp_event_manager';
import { OdpSegmentManager } from './segment_manager/odp_segment_manager';
import { OptimizelySegmentOption } from './segment_manager/optimizely_segment_option';
import { invalidOdpDataFound } from './odp_utils';
import { OdpEvent } from './event_manager/odp_event';
import { resolvablePromise, ResolvablePromise } from '../utils/promise/resolvablePromise';
import { BaseService, Service, ServiceState } from '../service';

export interface OdpManager extends Service {
  updateSettings(odpIntegrationConfig: OdpIntegrationConfig): boolean;
  fetchQualifiedSegments(userId: string, options?: Array<OptimizelySegmentOption>): Promise<string[] | null>;
  identifyUser(userId?: string, vuid?: string): void;
  sendEvent({ type, action, identifiers, data }: OdpEvent): void;
  setClientInfo(clientEngine: string, clientVersion: string): void;
}

export type OdpManagerConfig = {
  segmentManager: OdpSegmentManager;
  eventManager: OdpEventManager;
  logger?: LoggerFacade;
};

enum ActivityStatus {
  Activating,
  Active,
  Deactivating,
  Idle
};

export class DefaultOdpManager extends BaseService implements OdpManager {
  // status tracking whether the odp manager is active or idle.
  // this status is different from Service State. A odp manager 
  // can be in Running service state while being in idle activity status.
  // This status is used to track whether the odp manager is actively
  // working with a project config where odp is integrated, in which 
  // case it will be in active status, or if it is not integrated,
  // in which case it will be in idle status.
  private activityStatus: ActivityStatus = ActivityStatus.Idle;

  /**
   * Promise that resolves when odpIntegrationConfig becomes available
   */
  private configPromise: ResolvablePromise<void>;

  /**
   * ODP Segment Manager which provides an interface to the remote ODP server (GraphQL API) for audience segments mapping.
   * It fetches all qualified segments for the given user context and manages the segments cache for all user contexts.
   */
  private segmentManager: OdpSegmentManager;

  /**
   * ODP Event Manager which provides an interface to the remote ODP server (REST API) for events.
   * It will queue all pending events (persistent) and send them (in batches of up to 10 events) to the ODP server when possible.
   */
  private eventManager: OdpEventManager;

  /**
   * Handler for recording execution logs
   * @protected
   */
  protected logger?: LoggerFacade;

  /**
   * ODP configuration settings for identifying the target API and segments
   */
  odpIntegrationConfig?: OdpIntegrationConfig;

  // TODO: Consider accepting logger as a parameter and initializing it in constructor instead
  constructor(config: OdpManagerConfig) {
    super();
    this.segmentManager = config.segmentManager;
    this.eventManager = config.eventManager;
    this.logger = config.logger;

    this.configPromise = resolvablePromise();

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

  async stop(): Promise<void> {
    if (this.status === Status.Stopped) {
      return;
    }
    this.status = Status.Stopped;
    await this.eventManager.stop();
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

    // if (odpIntegrationConfig.integrated) {
    //   // already running, just propagate updated config to children;
    //   if (this.status === Status.Running) {
    //     this.segmentManager.updateSettings(odpIntegrationConfig.odpConfig);
    //     this.eventManager.updateSettings(odpIntegrationConfig.odpConfig);
    //   } else {
    //     this.start();
    //   }
    // } else {
    //   this.stop();
    // }
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

    if (VuidManager.isVuid(userId)) {
      return this.segmentManager.fetchQualifiedSegments(ODP_USER_KEY.VUID, userId, options);
    }

    return this.segmentManager.fetchQualifiedSegments(ODP_USER_KEY.FS_USER_ID, userId, options);
  }

  /**
   * Identifies a user via the ODP Event Manager
   * @param {string}  userId    (Optional) Custom unique identifier of a target user.
   * @param {string}  vuid      (Optional) Secondary unique identifier of a target user, primarily used by client SDKs.
   * @returns
   */
  identifyUser(userId?: string, vuid?: string): void {
    if (!this.odpIntegrationConfig) {
      this.logger.log(LogLevel.ERROR, ERROR_MESSAGES.ODP_CONFIG_NOT_AVAILABLE);
      return;
    }

    if (!this.odpIntegrationConfig.integrated) {
      this.logger.log(LogLevel.INFO, ERROR_MESSAGES.ODP_NOT_INTEGRATED);
      return;
    }

    if (userId && VuidManager.isVuid(userId)) {
      this.eventManager.identifyUser(undefined, userId);
      return;
    }

    this.eventManager.identifyUser(userId, vuid);
  }

  /**
   * Sends an event to the ODP Server via the ODP Events API
   * @param {OdpEvent}  > ODP Event to send to event manager
   */
  sendEvent({ type, action, identifiers, data }: OdpEvent): void {
    let mType = type;

    if (typeof mType !== 'string' || mType === '') {
      mType = 'fullstack';
    }

    if (!this.odpIntegrationConfig) {
      this.logger.log(LogLevel.ERROR, ERROR_MESSAGES.ODP_CONFIG_NOT_AVAILABLE);
      return;
    }

    if (!this.odpIntegrationConfig.integrated) {
      this.logger.log(LogLevel.ERROR, ERROR_MESSAGES.ODP_NOT_INTEGRATED);
      return;
    }

    if (invalidOdpDataFound(data)) {
      throw new Error(ERROR_MESSAGES.ODP_INVALID_DATA);
    }

    if (typeof action !== 'string' || action === '') {
      throw new Error('ODP action is not valid (cannot be empty).');
    }

    this.eventManager.sendEvent(new OdpEvent(mType, action, identifiers, data));
  }

  // /**
  //  * Identifies if the VUID feature is enabled
  //  */
  // abstract isVuidEnabled(): boolean;

  // /**
  //  * Returns VUID value if it exists
  //  */
  // abstract getVuid(): string | undefined;

  // protected initializeVuid(): Promise<void> {
  //   return Promise.resolve();
  // }

  // private registerVuid() {
  //   if (!this.odpIntegrationConfig) {
  //     this.logger.log(LogLevel.ERROR, ERROR_MESSAGES.ODP_CONFIG_NOT_AVAILABLE);
  //     return;
  //   }

  //   if (!this.odpIntegrationConfig.integrated) {
  //     this.logger.log(LogLevel.INFO, ERROR_MESSAGES.ODP_NOT_INTEGRATED);
  //     return;
  //   }

  //   const vuid = this.getVuid();
  //   if (!vuid) {
  //     return;
  //   }

  //   try {
  //     this.eventManager.registerVuid(vuid);
  //   } catch (e) {
  //     this.logger.log(LogLevel.ERROR, ERROR_MESSAGES.ODP_VUID_REGISTRATION_FAILED);
  //   }
  // }
}
