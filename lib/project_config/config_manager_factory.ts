/**
 * Copyright 2024, Optimizely
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

import { RequestHandler } from "../utils/http_request_handler/http";
import { Transformer } from "../utils/type";
import { DatafileManagerConfig } from "./datafile_manager";
import { ProjectConfigManagerImpl, ProjectConfigManager } from "./project_config_manager";
import { PollingDatafileManager } from "./polling_datafile_manager";
import { Cache } from "../utils/cache/cache";
import { DEFAULT_UPDATE_INTERVAL } from './constant';
import { ExponentialBackoff, IntervalRepeater } from "../utils/repeater/repeater";
import { StartupLog } from "../service";
import { MIN_UPDATE_INTERVAL, UPDATE_INTERVAL_BELOW_MINIMUM_MESSAGE } from './constant';
import { LogLevel } from "../modules/logging";

export type StaticConfigManagerConfig = {
  datafile: string,
  jsonSchemaValidator?: Transformer<unknown, boolean>,
};

export const createStaticProjectConfigManager = (
  config: StaticConfigManagerConfig
): ProjectConfigManager => {
  return new ProjectConfigManagerImpl(config);
};

export type PollingConfigManagerConfig = {
  datafile?: string,
  sdkKey: string,
  jsonSchemaValidator?: Transformer<unknown, boolean>,
  autoUpdate?: boolean;
  updateInterval?: number;
  urlTemplate?: string;
  datafileAccessToken?: string;
  cache?: Cache<string>;
};

export type PollingConfigManagerFactoryOptions = PollingConfigManagerConfig & { requestHandler: RequestHandler };

export const getPollingConfigManager = (
  opt: PollingConfigManagerFactoryOptions
): ProjectConfigManager => {
  const updateInterval = opt.updateInterval ?? DEFAULT_UPDATE_INTERVAL;

  const backoff = new ExponentialBackoff(1000, updateInterval, 500);
  const repeater = new IntervalRepeater(updateInterval, backoff);

  let startupLogs: StartupLog[] = []

  if (updateInterval < MIN_UPDATE_INTERVAL) {
    startupLogs.push({
      level: LogLevel.WARNING,
      message: UPDATE_INTERVAL_BELOW_MINIMUM_MESSAGE,
      params: [],
    });
  }

  const datafileManagerConfig: DatafileManagerConfig = {
    sdkKey: opt.sdkKey,
    autoUpdate: opt.autoUpdate,
    urlTemplate: opt.urlTemplate,
    datafileAccessToken: opt.datafileAccessToken,
    requestHandler: opt.requestHandler,
    cache: opt.cache,
    repeater,
    startupLogs,
  };
  
  const datafileManager = new PollingDatafileManager(datafileManagerConfig);

  return new ProjectConfigManagerImpl({
    datafile: opt.datafile,
    datafileManager,
    jsonSchemaValidator: opt.jsonSchemaValidator,
  });
};
