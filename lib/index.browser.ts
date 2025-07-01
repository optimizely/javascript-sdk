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
import { Config, Client } from './shared_types';
import sendBeaconEventDispatcher from './event_processor/event_dispatcher/send_beacon_dispatcher.browser';
import { getOptimizelyInstance } from './client_factory';
import { EventDispatcher } from './event_processor/event_dispatcher/event_dispatcher';
import { JAVASCRIPT_CLIENT_ENGINE } from './utils/enums';
import { BrowserRequestHandler } from './utils/http_request_handler/request_handler.browser';

/**
 * Creates an instance of the Optimizely class
 * @param  {Config} config
 * @return {Client|null} the Optimizely client object
 *                           null on error
 */
export const createInstance = function(config: Config): Client {
  const client = getOptimizelyInstance({
    ...config,
    requestHandler: new BrowserRequestHandler(),
  });

  if (client) {
    const unloadEvent = 'onpagehide' in window ? 'pagehide' : 'unload';
    window.addEventListener(
      unloadEvent,
      () => {
        client.close();
      },
    );
  }

  return client;
};

export const getSendBeaconEventDispatcher = (): EventDispatcher | undefined => {
  return sendBeaconEventDispatcher;
};

export { default as eventDispatcher } from './event_processor/event_dispatcher/default_dispatcher.browser';

export { createPollingProjectConfigManager } from './project_config/config_manager_factory.browser';
export { createForwardingEventProcessor, createBatchEventProcessor } from './event_processor/event_processor_factory.browser';

export { createOdpManager } from './odp/odp_manager_factory.browser';
export { createVuidManager } from './vuid/vuid_manager_factory.browser';

export * from './common_exports';

export * from './export_types';

export const clientEngine: string = JAVASCRIPT_CLIENT_ENGINE;
