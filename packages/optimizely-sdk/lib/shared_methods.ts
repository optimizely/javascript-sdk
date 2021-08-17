/**
 * Copyright 2021, Optimizely
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
 import { HttpPollingDatafileManager } from '@optimizely/js-sdk-datafile-manager';
 import { toDatafile, tryCreatingProjectConfig } from './core/project_config';
 import { DatafileManager } from './core/datafile_manager/datafile_manager';
 import { SDKOptions, DatafileManagerConfig, DatafileOptions } from './shared_types';
 import fns from './utils/fns';
 import { LoggerFacade } from '@optimizely/js-sdk-logging';

 export function getDatafileManagerForConfig(
   config: SDKOptions,
   logger: LoggerFacade,
   datafileOptions?: DatafileOptions
 ): DatafileManager | undefined {
   let datafileManager: DatafileManager | undefined = undefined;

   if (config.sdkKey) {
     const datafileManagerConfig: DatafileManagerConfig = {
       sdkKey: config.sdkKey,
     };
     if (datafileOptions === undefined || (typeof datafileOptions === 'object' && datafileOptions !== null)) {
       fns.assign(datafileManagerConfig, datafileOptions);
     }
     if (config.datafile) {
       const { configObj, error } = tryCreatingProjectConfig({
         datafile: config.datafile,
         jsonSchemaValidator: undefined,
         logger: logger,
       });
       
       if (error) {
         logger.error(error);
       }
       if (configObj) {
         datafileManagerConfig.datafile = toDatafile(configObj);
       }
     }
     datafileManager = new HttpPollingDatafileManager(datafileManagerConfig);
   }
   return datafileManager;
 }