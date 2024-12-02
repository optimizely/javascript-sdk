/**
 * Copyright 2023, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { OdpEventManager, DefaultOdpEventManager } from './odp_event_manager';
import { LogLevel } from '../../modules/logging';
import { OdpEvent } from './odp_event';

const DEFAULT_BROWSER_QUEUE_SIZE = 100;

export class BrowserOdpEventManager extends DefaultOdpEventManager implements OdpEventManager {
  protected initParams(
    batchSize: number | undefined,
    queueSize: number | undefined,
    flushInterval: number | undefined
  ): void {
    this.queueSize = queueSize || DEFAULT_BROWSER_QUEUE_SIZE;

    // disable event batching for browser
    this.batchSize = 1;
    this.flushInterval = 0;

    if (typeof batchSize !== 'undefined' && batchSize !== 1) {
      this.getLogger().log(LogLevel.WARNING, 'ODP event batch size must be 1 in the browser.');
    }

    if (typeof flushInterval !== 'undefined' && flushInterval !== 0) {
      this.getLogger().log(LogLevel.WARNING, 'ODP event flush interval must be 0 in the browser.');
    }
  }

  protected discardEventsIfNeeded(): void {
    // in Browser/client-side context, give debug message but leave events in queue
    this.getLogger().log(LogLevel.DEBUG, 'ODPConfig not ready. Leaving events in queue.');
  }

  protected hasNecessaryIdentifiers = (event: OdpEvent): boolean => event.identifiers.size >= 0;
}
