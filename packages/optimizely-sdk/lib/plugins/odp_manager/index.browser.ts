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

import { BrowserRequestHandler } from './../../utils/http_request_handler/browser_request_handler';
import { VuidManager } from './../vuid_manager/index';

import { LRUCache } from '../../utils/lru_cache';
import { OdpManager } from '../../core/odp/odp_manager';
import { OdpSegmentManager } from '../../core/odp/odp_segment_manager';
import { OdpEventManager } from '../../core/odp/odp_event_manager';
import { getLogger, LogHandler } from '../../modules/logging';
import BrowserAsyncStorageCache from '../key_value_cache/browserAsyncStorageCache';
import { JAVASCRIPT_CLIENT_ENGINE } from '../../utils/enums';

// Client-side Browser Plugin for ODP Manager
export class BrowserOdpManager extends OdpManager {
  static cache = new BrowserAsyncStorageCache();

  constructor(
    disable: boolean,
    logger?: LogHandler,
    segmentsCache?: LRUCache<string, Set<string>>,
    segmentManager?: OdpSegmentManager,
    eventManager?: OdpEventManager
  ) {
    const browserLogger = logger || getLogger('OdpManager');
    const browserRequestHandler = new BrowserRequestHandler(browserLogger);
    const browserClientEngine = JAVASCRIPT_CLIENT_ENGINE;
    const browserClientVersion = '4.9.2';

    super(
      disable,
      browserRequestHandler,
      browserLogger,
      segmentsCache,
      segmentManager,
      eventManager,
      browserClientEngine,
      browserClientVersion
    );

    this.initializeVuid();
  }

  /**
   * Upon initializing BrowserOdpManager, accesses or creates new VUID from Browser cache and registers it via the Event Manager
   */
  public async initializeVuid(): Promise<void> {
    const vuidManager = await VuidManager.instance(BrowserOdpManager.cache);
    this.eventManager?.registerVuid(vuidManager.vuid);
    return;
  }
}
