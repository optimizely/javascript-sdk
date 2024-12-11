/**
 * Copyright 2022-2024, Optimizely
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
import { Service, StartupLog } from '../service';
import { Cache } from '../utils/cache/cache';
import { RequestHandler } from '../utils/http_request_handler/http';
import { Fn, Consumer } from '../utils/type';
import { Repeater } from '../utils/repeater/repeater';
import { LoggerFacade } from '../modules/logging';

export interface DatafileManager extends Service {
  get(): string | undefined;
  onUpdate(listener: Consumer<string>): Fn;
  setLogger(logger: LoggerFacade): void;
}

export type DatafileManagerConfig = {
  requestHandler: RequestHandler;
  autoUpdate?: boolean;
  sdkKey: string;
  urlTemplate?: string;
  cache?: Cache<string>;
  datafileAccessToken?: string;
  initRetry?: number;
  repeater: Repeater;
  logger?: LoggerFacade;
  startupLogs?: StartupLog[];
}
