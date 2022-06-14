/**
 * Copyright 2021-2022, Optimizely
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
import { LoggerFacade } from '@optimizely/js-sdk-logging';
import { HttpPollingDatafileManager } from '@optimizely/js-sdk-datafile-manager';
import { DatafileOptions, DatafileManagerConfig, DatafileManager } from '../../shared_types';
import { toDatafile, tryCreatingProjectConfig } from '../../core/project_config';
import fns from '../../utils/fns';

export function createHttpPollingDatafileManager(
  sdkKey: string,
  logger: LoggerFacade,
  // TODO[OASIS-6649]: Don't use object type
  // eslint-disable-next-line  @typescript-eslint/ban-types
  datafile?: string | object,
  datafileOptions?: DatafileOptions,
): DatafileManager {  
  const datafileManagerConfig: DatafileManagerConfig = { sdkKey };
  if (datafileOptions === undefined || (typeof datafileOptions === 'object' && datafileOptions !== null)) {
    fns.assign(datafileManagerConfig, datafileOptions);
  }
  if (datafile) {
    const { configObj, error } = tryCreatingProjectConfig({
      datafile: datafile,
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
  return new HttpPollingDatafileManager(datafileManagerConfig);
}
