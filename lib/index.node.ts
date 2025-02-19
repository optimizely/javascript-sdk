/**
 * Copyright 2016-2017, 2019-2025 Optimizely
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
import { NODE_CLIENT_ENGINE } from './utils/enums';
import { Client, Config } from './shared_types';
import { getOptimizelyInstance } from './client_factory';
import { EventDispatcher } from './event_processor/event_dispatcher/event_dispatcher';

/**
 * Creates an instance of the Optimizely class
 * @param  {Config} config
 * @return {Client|null} the Optimizely client object
 *                           null on error
 */
export const createInstance = function(config: Config): Client | null {
  const nodeConfig = {
    ...config,
    clientEnging: config.clientEngine || NODE_CLIENT_ENGINE,
  }

  return getOptimizelyInstance(nodeConfig);
};

export const getSendBeaconEventDispatcher = function(): EventDispatcher {
  throw new Error('Send beacon event dispatcher is not supported in NodeJS');
};

export { default as eventDispatcher } from './event_processor/event_dispatcher/default_dispatcher.node';

export { createPollingProjectConfigManager } from './project_config/config_manager_factory.node';
export { createForwardingEventProcessor, createBatchEventProcessor } from './event_processor/event_processor_factory.node';

export { createOdpManager } from './odp/odp_manager_factory.node';
export { createVuidManager } from './vuid/vuid_manager_factory.node';

export * from './common_exports';

export * from './export_types';

export const clientEngine: string = NODE_CLIENT_ENGINE;
