/****************************************************************************
 * Copyright 2020, Optimizely, Inc. and contributors                   *
 *                                                                          *
 * Licensed under the Apache License, Version 2.0 (the "License");          *
 * you may not use this file except in compliance with the License.         *
 * You may obtain a copy of the License at                                  *
 *                                                                          *
 *    http://www.apache.org/licenses/LICENSE-2.0                            *
 *                                                                          *
 * Unless required by applicable law or agreed to in writing, software      *
 * distributed under the License is distributed on an "AS IS" BASIS,        *
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. *
 * See the License for the specific language governing permissions and      *
 * limitations under the License.                                           *
 ***************************************************************************/
declare module '@optimizely/optimizely-sdk/optimizely' {
  import { ErrorHandler, LogHandler, LogLevel } from '@optimizely/js-sdk-logging';
  import { ProjectConfig } from '@optimizely/optimizely-sdk/lib/core/project_config';
  interface OptimizelyConfig {
    datafile: ProjectConfig;
    errorHandler?: ErrorHandler;
    eventDispatcher: (...args: unknown[]) => unknown;
    logger?: LogHandler;
    logLevel?: LogLevel;
    userProfileService?: import('../shared_types').UserProfileService;
    eventBatchSize: number;
    eventFlushInterval: number;
    sdkKey: string;
    isValidInstance: boolean;
    clientEngine: string;
    clientVersion: string;
  }

  export class Optimizely {
    constructor(config: OptimizelyConfig);
  }
}
