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

import { LogHandler, LogLevel } from '../../modules/logging';
import { OdpEvent } from './odp_event';
import { uuid } from '../../utils/fns';
import { ODP_USER_KEY } from '../../utils/enums';
import { OdpConfig } from './odp_config';
import { OdpEventDispatcher } from './odp_event_dispatcher';

/**
 * Manager for persisting events to the Optimizely Data Platform (ODP)
 */
export interface IOdpEventManager {
  updateSettings(odpConfig: OdpConfig): void;

  start(): void;

  registerVuid(vuid: string): void;

  identifyUser(userId: string, vuid?: string): void;

  sendEvent(event: OdpEvent): void;

  signalStop(): Promise<void>;
}

/**
 * Concrete implementation of a manager for persisting events to the Optimizely Data Platform
 */
export class OdpEventManager implements IOdpEventManager {
  private readonly eventDispatcher: OdpEventDispatcher;
  private readonly logger: LogHandler;

  public constructor(eventDispatcher: OdpEventDispatcher, logger: LogHandler) {
    this.eventDispatcher = eventDispatcher;
    this.logger = logger;
  }

  /**
   * Update ODP configuration settings
   * @param odpConfig New configuration to apply
   */
  public updateSettings(odpConfig: OdpConfig): void {
    this.eventDispatcher.updateSettings(odpConfig);
  }

  /**
   * Start processing events in the dispatcher's queue
   */
  public start(): void {
    this.eventDispatcher.start();
  }

  /**
   * Register a new visitor user id (VUID) in ODP
   * @param vuid Visitor User ID to send
   */
  public registerVuid(vuid: string): void {
    const identifiers = new Map<string, string>();
    identifiers.set(ODP_USER_KEY.VUID, vuid);

    const event = new OdpEvent('fullstack', 'client_initialized', identifiers);
    this.sendEvent(event);
  }

  /**
   * Associate a full-stack userid with an established VUID
   * @param userId Full-stack User ID
   * @param vuid Visitor User ID
   */
  public identifyUser(userId: string, vuid?: string): void {
    const identifiers = new Map<string, string>();
    if (vuid) {
      identifiers.set(ODP_USER_KEY.VUID, vuid);
    }
    identifiers.set(ODP_USER_KEY.FS_USER_ID, userId);

    const event = new OdpEvent('fullstack', 'identified', identifiers);
    this.sendEvent(event);
  }

  /**
   * Send an event to ODP via dispatch queue
   * @param event ODP Event to forward
   */
  public sendEvent(event: OdpEvent): void {
    const foundInvalidDataInKeys = this.findKeysWithInvalidData(event.data);
    if (foundInvalidDataInKeys.length > 0) {
      this.logger.log(LogLevel.ERROR, `Event data found to be invalid.`);
      this.logger.log(LogLevel.DEBUG, `Invalid event data keys (${foundInvalidDataInKeys.join(', ')})`);
    } else {
      event.data = this.augmentCommonData(event.data);
      this.eventDispatcher.enqueue(event);
    }
  }

  /**
   * Validate event data value types
   * @param data Event data to be validated
   * @returns Array of event data keys that were found to be invalid
   * @private
   */
  private findKeysWithInvalidData(data: Map<string, unknown>): string[] {
    const validTypes: string[] = ['string', 'number', 'boolean', 'bigint'];
    const invalidKeys: string[] = [];
    data.forEach((value, key) => {
      if (!validTypes.includes(typeof value) && value !== null) {
        invalidKeys.push(key);
      }
    });
    return invalidKeys;
  }

  /**
   * Add additional common data including an idempotent ID and execution context to event data
   * @param sourceData Existing event data to augment
   * @returns Augmented event data
   * @private
   */
  private augmentCommonData(sourceData: Map<string, unknown>): Map<string, unknown> {
    // Try to get information from the current execution context
    let sourceVersion = '';
    if (window) {
      sourceVersion = window.navigator.userAgent;
    } else {
      if (process) {
        sourceVersion = process.version;
      }
    }

    const data = new Map<string, unknown>();
    data.set('idempotence_id', uuid());
    data.set('data_source_type', 'sdk');
    data.set('data_source', 'javascript-sdk');
    if (sourceVersion) {
      data.set('data_source_version', sourceVersion);
    }
    sourceData.forEach((value, key) => data.set(key, value));

    return data;
  }

  /**
   * Signal to event dispatcher to drain the event queue and stop
   */
  public async signalStop(): Promise<void> {
    await this.eventDispatcher.stop();
  }
}
