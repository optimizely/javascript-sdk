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

import { LogHandler } from '../../modules/logging';
import { OdpEvent } from './odp_event';
import { uuid } from '../../utils/fns';
import { ODP_USER_KEY } from '../../utils/enums';
import { OdpConfig } from './odp_config';
import { OdpEventDispatcher } from './odp_event_dispatcher';

export interface IOdpEventManager {
  start(): void;

  registerVuid(vuid: string): void;

  identifyUser(userId: string, vuid?: string): void;

  updateSettings(odpConfig: OdpConfig): void;

  sendEvent(event: OdpEvent): void;

  signalStop(): void;
}

/**
 * Manager for persisting events to the Optimizely Data Platform
 */
export class OdpEventManager implements IOdpEventManager {
  private readonly eventDispatcher: OdpEventDispatcher;
  private readonly logger: LogHandler;

  public constructor(eventDispatcher: OdpEventDispatcher, logger: LogHandler) {
    this.eventDispatcher = eventDispatcher;
    this.logger = logger;
  }

  public start(): void {
    this.eventDispatcher.start();
  }

  public registerVuid(vuid: string): void {
    const identifiers = new Map<string, string>();
    identifiers.set(ODP_USER_KEY.VUID, vuid);

    const event = new OdpEvent('fullstack', 'client_initialized', identifiers);
    this.sendEvent(event);
  }

  public identifyUser(userId: string, vuid?: string): void {
    const identifiers = new Map<string, string>();
    if (vuid) {
      identifiers.set(ODP_USER_KEY.VUID, vuid);
    }
    identifiers.set(ODP_USER_KEY.FS_USER_ID, userId);

    const event = new OdpEvent('fullstack', 'identified', identifiers);
    this.sendEvent(event);
  }

  public updateSettings(odpConfig: OdpConfig): void {
    this.eventDispatcher.updateSettings(odpConfig);
  }

  public sendEvent(event: OdpEvent): void {
    event.data = this.augmentCommonData(event.data);
    this.eventDispatcher.enqueue(event);
  }

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

  public async signalStop(): Promise<void> {
    await this.eventDispatcher.stop();
  }
}

