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
import { RestApiManager } from './rest_api_manager';
import { Observer } from './odp_event_dispatcher';

export interface IOdpEventManager {
  start(): void;

  updateSettings(odpConfig: OdpConfig): void;

  identifyUser(vuid: string, userId: string): void;

  sendEvents(events: OdpEvent[]): void;

  sendEvent(event: OdpEvent): void;

  stop(): void;
}

export interface Subject {
  attach(observer: Observer): void;

  detach(observer: Observer): void;

  enqueue(event: OdpEvent[]): void;

  flush(): void;
}

/**
 * Manager for persisting events to the Optimizely Data Platform
 */
export class OdpEventManager implements IOdpEventManager, Subject {
  private observers: Observer[] = [];
  public isRunning = false;
  private odpConfig: OdpConfig;

  private readonly apiManager: RestApiManager;
  private readonly logger: LogHandler;

  public constructor(odpConfig: OdpConfig, apiManager: RestApiManager, logger: LogHandler) {
    this.odpConfig = odpConfig;
    this.apiManager = apiManager;
    this.logger = logger;
  }

  public start(): void {
    this.isRunning = true;
    this.observers.forEach(observer => observer.start());
  }

  public updateSettings(odpConfig: OdpConfig): void {
    this.odpConfig = odpConfig;
  }

  public identifyUser(vuid: string, userId: string): void {
    const identifiers = new Map<string, string>();
    if (vuid != null) {
      identifiers.set(ODP_USER_KEY.VUID, vuid);
    }
    identifiers.set(ODP_USER_KEY.FS_USER_ID, userId);

    const event = new OdpEvent('fullstack', 'client_initialized', identifiers);
    this.sendEvent(event);
  }

  public sendEvents(events: OdpEvent[]): void {
    events.forEach(event => this.sendEvent(event));
  }

  public sendEvent(event: OdpEvent): void {
    event.data = this.augmentCommonData(event.data);
    this.processEvent(event);
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

  private processEvent(event: OdpEvent): void {
    if (!this.isRunning) {
      this.logger.log(LogLevel.WARNING, 'Failed to Process ODP Event. ODPEventManager is not running.');
      return;
    }

    if (!this.odpConfig.isReady()) {
      this.logger.log(LogLevel.DEBUG, 'Unable to Process ODP Event. ODPConfig is not ready.');
      return;
    }

    if (this.eventQueue.length >= this.queueSize) {
      this.logger.log(LogLevel.WARNING, `Failed to Process ODP Event. Event Queue full. queueSize = ${this.queueSize}.`);
      return;
    }

    this.observers.forEach(observer => observer.enqueue(event));
  }

  public stop(): void {
    this.isRunning = false;
    this.observers.forEach(observer => observer.stop());
  }

  public attach(observer: Observer): void {
    const isExist = this.observers.includes(observer);
    if (isExist) {
      return console.log('Observer already attached.');
    }

    console.log('Attached an observer.');
    this.observers.push(observer);
  }

  public detach(observer: Observer): void {
    const observerIndex = this.observers.indexOf(observer);
    if (observerIndex === -1) {
      return console.log('Observer does not exist.');
    }

    this.observers.splice(observerIndex, 1);
    console.log('Detached an observer.');
  }

  public enqueue(events: OdpEvent[]): void {
    this.observers.forEach(observer => observer.enqueue(events));
  }
}

