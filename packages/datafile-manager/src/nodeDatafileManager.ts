/**
 * Copyright 2019-2020, Optimizely
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

import { makeGetRequest } from './nodeRequest';
import HttpPollingDatafileManager from './httpPollingDatafileManager';
import { Headers, AbortableRequest } from './http';
import { DatafileManagerConfig } from './datafileManager';
import {
  DEFAULT_URL_TEMPLATE,
  DEFAULT_AUTHENTICATED_DATAFILE_URL_TEMPLATE,
} from './config';

export default class NodeDatafileManager extends HttpPollingDatafileManager {

  private authToken?: string;

  constructor(config: DatafileManagerConfig) {  
    const defaultUrlTemplate = config.authDatafileToken ? DEFAULT_AUTHENTICATED_DATAFILE_URL_TEMPLATE : DEFAULT_URL_TEMPLATE;
    super({
      ... config,
      urlTemplate: config.urlTemplate || defaultUrlTemplate,
    });
    this.authToken = config.authDatafileToken;
  }

  protected makeGetRequest(reqUrl: string, headers: Headers): AbortableRequest {
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;      
    }
    return makeGetRequest(reqUrl, headers);
  }

  protected getConfigDefaults(): Partial<DatafileManagerConfig> {
    return {
      autoUpdate: true,
    };
  }
}
