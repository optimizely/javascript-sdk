/**
 * Copyright 2021-2022, 2024, Optimizely
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
import configValidator from './utils/config_validator';
import defaultErrorHandler from './plugins/error_handler';
import * as enums from './utils/enums';
import Optimizely from './optimizely';
import { createNotificationCenter } from './notification_center';
import { OptimizelyDecideOption, Client, Config } from './shared_types';
import * as commonExports from './common_exports';
  
/**
 * Creates an instance of the Optimizely class
 * @param  {ConfigLite} config
 * @return {Client|null} the Optimizely client object
 *                           null on error 
 */
 const createInstance = function(config: Config): Client | null {
  try {
    configValidator.validate(config);
    
    const optimizelyOptions = {
      clientEngine: enums.JAVASCRIPT_CLIENT_ENGINE,
      ...config,
    };

    const optimizely = new Optimizely(optimizelyOptions);
    return optimizely;
  } catch (e: any) {
    config.logger?.error(e);
    return null;
  }
};

export {
  defaultErrorHandler as errorHandler,
  enums,
  createInstance,
  OptimizelyDecideOption,
};

export * from './common_exports';

export default {
  ...commonExports,
  errorHandler: defaultErrorHandler,
  enums,
  createInstance,
  OptimizelyDecideOption,
};

export * from './export_types'
