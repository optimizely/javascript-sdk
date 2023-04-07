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

import { NodeRequestHandler } from '../../utils/http_request_handler/node_request_handler';

import { ServerLRUCache } from './../../utils/lru_cache/server_lru_cache';

import { OdpManager } from '../../core/odp/odp_manager';
import { getLogger, LogHandler } from '../../modules/logging';
import { NODE_CLIENT_ENGINE, NODE_CLIENT_VERSION } from '../../utils/enums';
import { OdpOptions } from '../../../lib/shared_types';
import { NodeOdpEventApiManager } from '../odp/event_api_manager/index.node';
import { NodeOdpEventManager } from '../odp/event_manager/index.node';

interface NodeOdpManagerConfig {
  disable: boolean;
  logger?: LogHandler;
  odpOptions?: OdpOptions;
}

/**
 * Server-side Node Plugin for ODP Manager.
 * Note: As this is still a work-in-progress. Please avoid using the Node ODP Manager.
 */
export class NodeOdpManager extends OdpManager {
  constructor({ logger, odpOptions }: NodeOdpManagerConfig) {
    const nodeLogger = logger || getLogger();

    const nodeRequestHandler = new NodeRequestHandler(nodeLogger);
    const nodeClientEngine = NODE_CLIENT_ENGINE;
    const nodeClientVersion = NODE_CLIENT_VERSION;

    super({
      segmentLRUCache:
        odpOptions?.segmentsCache ||
        new ServerLRUCache<string, string[]>({
          maxSize: odpOptions?.segmentsCacheSize,
          timeout: odpOptions?.segmentsCacheTimeout,
        }),
      segmentRequestHandler: nodeRequestHandler,
      eventRequestHandler: nodeRequestHandler,
      logger: nodeLogger,
      clientEngine: nodeClientEngine,
      clientVersion: nodeClientVersion,
      odpOptions,
    });

    // Set up Events Manager (Events REST API Interface)
    if (odpOptions?.eventManager) {
      this.eventManager = odpOptions.eventManager;
      this.eventManager.updateSettings(this.odpConfig);
    } else {
      this.eventManager = new NodeOdpEventManager({
        odpConfig: this.odpConfig,
        apiManager: new NodeOdpEventApiManager(nodeRequestHandler, this.logger),
        logger: this.logger,
        clientEngine: nodeClientEngine,
        clientVersion: nodeClientVersion,
        flushInterval: odpOptions?.eventFlushInterval,
        batchSize: odpOptions?.eventBatchSize,
        queueSize: odpOptions?.eventQueueSize,
      });
    }

    this.eventManager!.start();    
  }
}
