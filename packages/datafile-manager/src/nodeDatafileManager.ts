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

import { getLogger } from '@optimizely/js-sdk-logging';
import { makeGetRequest } from './nodeRequest';
import HttpPollingDatafileManager from './httpPollingDatafileManager';
import { Headers, AbortableRequest } from './http';
import { NodeDatafileManagerConfig, DatafileManagerConfig } from './datafileManager';
import { DEFAULT_URL_TEMPLATE, DEFAULT_AUTHENTICATED_URL_TEMPLATE } from './config';

const logger = getLogger('NodeDatafileManager');

export default class NodeDatafileManager extends HttpPollingDatafileManager {
  private accessToken?: string;

  constructor(config: NodeDatafileManagerConfig) {
    const defaultUrlTemplate = config.datafileAccessToken ? DEFAULT_AUTHENTICATED_URL_TEMPLATE : DEFAULT_URL_TEMPLATE;
    super({
      ...config,
      urlTemplate: config.urlTemplate || defaultUrlTemplate,
    });
    this.accessToken = config.datafileAccessToken;
  }

  protected makeGetRequest(reqUrl: string, headers: Headers): AbortableRequest {
    const requestHeaders = Object.assign({}, headers);
    if (this.accessToken) {
      logger.debug('Adding Authorization header with Bearer Token');
      requestHeaders['Authorization'] = `Bearer ${this.accessToken}`;
    }
    return makeGetRequest(reqUrl, requestHeaders);
  }

  protected getConfigDefaults(): Partial<DatafileManagerConfig> {
    return {
      autoUpdate: true,
    };
  }
}
