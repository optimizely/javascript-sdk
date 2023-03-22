/**
 * Copyright 2023, Optimizely
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

import { BROWSER_CLIENT_VERSION, ERROR_MESSAGES, JAVASCRIPT_CLIENT_ENGINE, ODP_USER_KEY } from '../../utils/enums';
import { getLogger, LoggerFacade, LogHandler, LogLevel } from '../../modules/logging';

import { BrowserRequestHandler } from './../../utils/http_request_handler/browser_request_handler';

import BrowserAsyncStorageCache from '../key_value_cache/browserAsyncStorageCache';
import PersistentKeyValueCache from '../key_value_cache/persistentKeyValueCache';
import { BrowserLRUCache, LRUCache } from '../../utils/lru_cache';

import { VuidManager } from './../vuid_manager/index';

import { OdpManager } from '../../core/odp/odp_manager';
import { OdpEvent } from '../../core/odp/odp_event';
import { OdpOptions } from '../../shared_types';

interface BrowserOdpManagerConfig {
  disable: boolean;
  logger?: LogHandler;
  odpOptions?: OdpOptions;
}

// Client-side Browser Plugin for ODP Manager
export class BrowserOdpManager extends OdpManager {
  static cache = new BrowserAsyncStorageCache();
  vuid?: string;

  constructor({ disable, logger, odpOptions }: BrowserOdpManagerConfig) {
    const browserLogger = logger || getLogger('BrowserOdpManager');

    const browserDefaultRequestHandler = new BrowserRequestHandler(browserLogger);
    const browserClientEngine = JAVASCRIPT_CLIENT_ENGINE;
    const browserClientVersion = BROWSER_CLIENT_VERSION;

    super({
      disable,
      defaultRequestHandler: browserDefaultRequestHandler,
      logger: browserLogger,
      clientEngine: browserClientEngine,
      clientVersion: browserClientVersion,
      odpOptions,
    });

    this.logger = browserLogger;
    this.initializeVuid(BrowserOdpManager.cache);
  }

  /**
   * Upon initializing BrowserOdpManager, accesses or creates new VUID from Browser cache and registers it via the Event Manager
   */
  private async initializeVuid(cache: PersistentKeyValueCache): Promise<void> {
    const vuidManager = await VuidManager.instance(cache);
    this.vuid = vuidManager.vuid;
    this.registerVuid(this.vuid);
  }

  private registerVuid(vuid: string) {
    if (!this.eventManager) {
      this.logger.log(LogLevel.ERROR, ERROR_MESSAGES.ODP_VUID_REGISTRATION_FAILED_EVENT_MANAGER_MISSING);
      return;
    }

    try {
      this.eventManager.registerVuid(vuid);
    } catch (e) {
      this.logger.log(this.enabled ? LogLevel.ERROR : LogLevel.DEBUG, ERROR_MESSAGES.ODP_VUID_REGISTRATION_FAILED);
    }
  }

  /**
   * @override
   * - Still identifies a user via the ODP Event Manager
   * - Additionally, also passes VUID to help identify client-side users
   * @param fsUserId Unique identifier of a target user.
   */
  public identifyUser(fsUserId?: string, vuid?: string): void {
    if (fsUserId && VuidManager.isVuid(fsUserId)) {
      super.identifyUser(undefined, fsUserId);
      return;
    }

    if (fsUserId && vuid && VuidManager.isVuid(vuid)) {
      super.identifyUser(fsUserId, vuid);
      return;
    }

    super.identifyUser(fsUserId, vuid || this.vuid);
  }

  /**
   * @override
   * - Sends an event to the ODP Server via the ODP Events API
   * - Intercepts identifiers and injects VUID before sending event
   * - Identifiers must contain at least one key-value pair
   * @param {OdpEvent} odpEvent  > ODP Event to send to event manager
   */
  public sendEvent({ type, action, identifiers, data }: OdpEvent): void {
    const identifiersWithVuid = new Map<string, string>(identifiers);

    if (!identifiers.has(ODP_USER_KEY.VUID)) {
      if (this.vuid) {
        identifiersWithVuid.set(ODP_USER_KEY.VUID, this.vuid);
      } else {
        throw new Error(ERROR_MESSAGES.ODP_SEND_EVENT_FAILED_VUID_MISSING);
      }
    }

    super.sendEvent({ type, action, identifiers: identifiersWithVuid, data });
  }
}
