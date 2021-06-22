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
import HttpPollingDatafileManager from '../../../node_modules/@optimizely/js-sdk-datafile-manager/lib/HttpPollingDatafileManager';
// import { HttpPollingDatafileManager } from '@optimizely/js-sdk-datafile-manager';

interface DatafileManagerConfig {
  sdkKey: string,
  datafile?: string;
}

interface DatafileUpdate {
  datafile: string;
}

interface DatafileUpdateListener {
  (datafileUpdate: DatafileUpdate): void;
}

export interface DatafileManager {
  start(): void;
  get: () => string;
  on: (eventName: string, listener: DatafileUpdateListener) => () => void;
  onReady: () => Promise<void>;
  stop(): Promise<any>;
}

export class DefaultHttpPollingDatafileManager extends HttpPollingDatafileManager {
  protected makeGetRequest(): any {
  }

  protected getConfigDefaults(): any {
  }
}

export function createHttpPollingDatafileManager(
  config: DatafileManagerConfig
): DatafileManager {
  return new DefaultHttpPollingDatafileManager(config);
}
