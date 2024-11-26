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

import { OdpEvent } from './odp_event';
import { IOdpEventManager, OdpEventManager } from './odp_event_manager';
import { LogLevel } from '../../modules/logging';

const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_FLUSH_INTERVAL_MSECS = 1000;
const DEFAULT_SERVER_QUEUE_SIZE = 10000;

export class NodeOdpEventManager extends OdpEventManager implements IOdpEventManager {
  protected initParams(
    batchSize: number | undefined,
    queueSize: number | undefined,
    flushInterval: number | undefined
  ): void {
    this.queueSize = queueSize || DEFAULT_SERVER_QUEUE_SIZE;
    this.batchSize = batchSize || DEFAULT_BATCH_SIZE;

    if (flushInterval === 0) {
      // disable event batching
      this.batchSize = 1;
      this.flushInterval = 0;
    } else {
      this.flushInterval = flushInterval || DEFAULT_FLUSH_INTERVAL_MSECS;
    }
  }

  protected discardEventsIfNeeded(): void {
    // if Node/server-side context, empty queue items before ready state
    this.getLogger().log(LogLevel.WARNING, 'ODPConfig not ready. Discarding events in queue.');
    this.queue = new Array<OdpEvent>();
  }

  protected hasNecessaryIdentifiers = (event: OdpEvent): boolean => event.identifiers.size >= 1;
}
