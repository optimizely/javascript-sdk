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
import { sprintf } from '../utils/fns';
import { DatafileManager, DatafileManagerConfig } from './datafile_manager';
import { EventEmitter } from '../utils/event_emitter/event_emitter';
import { DEFAULT_AUTHENTICATED_URL_TEMPLATE, DEFAULT_URL_TEMPLATE } from './constant';
import { Cache } from '../utils/cache/cache';
import { BaseService, ServiceState } from '../service';
import { RequestHandler, AbortableRequest, Headers, Response } from '../utils/http_request_handler/http';
import { Repeater } from '../utils/repeater/repeater';
import { Consumer, Fn } from '../utils/type';
import { isSuccessStatusCode } from '../utils/http_request_handler/http_util';
import { DATAFILE_MANAGER_STOPPED, FAILED_TO_FETCH_DATAFILE } from '../exception_messages';
import { DATAFILE_FETCH_REQUEST_FAILED, ERROR_FETCHING_DATAFILE } from '../error_messages';
import {
  ADDING_AUTHORIZATION_HEADER_WITH_BEARER_TOKEN,
  MAKING_DATAFILE_REQ_TO_URL_WITH_HEADERS,
  RESPONSE_STATUS_CODE,
  SAVED_LAST_MODIFIED_HEADER_VALUE_FROM_RESPONSE,
} from '../log_messages';

export class PollingDatafileManager extends BaseService implements DatafileManager {
  private requestHandler: RequestHandler;
  private currentDatafile?: string;
  private emitter: EventEmitter<{ update: string }>;
  private autoUpdate: boolean;
  private initRetryRemaining?: number;
  private repeater: Repeater;
  private lastResponseLastModified?: string;
  private datafileUrl: string;
  private currentRequest?: AbortableRequest;
  private cacheKey: string;
  private cache?: Cache<string>;
  private sdkKey: string;
  private datafileAccessToken?: string;

  constructor(config: DatafileManagerConfig) {
    super(config.startupLogs);
    const {
      autoUpdate = false,
      sdkKey,
      datafileAccessToken,
      urlTemplate,
      cache,
      initRetry,
      repeater,
      requestHandler,
      logger,
    } = config;
    this.cache = cache;
    this.cacheKey = 'opt-datafile-' + sdkKey;
    this.sdkKey = sdkKey;
    this.datafileAccessToken = datafileAccessToken;
    this.requestHandler = requestHandler;
    this.emitter = new EventEmitter();
    this.autoUpdate = autoUpdate;
    this.initRetryRemaining = initRetry;
    this.repeater = repeater;
    this.logger = logger;

    const urlTemplateToUse = urlTemplate || 
      (datafileAccessToken ? DEFAULT_AUTHENTICATED_URL_TEMPLATE : DEFAULT_URL_TEMPLATE);
    this.datafileUrl = sprintf(urlTemplateToUse, this.sdkKey);
  }
  
  onUpdate(listener: Consumer<string>): Fn {
    return this.emitter.on('update', listener);
  }

  get(): string | undefined {
    return this.currentDatafile;
  }

  start(): void {
    if (!this.isNew()) {
      return;
    }

    super.start();
    this.state = ServiceState.Starting;
    this.setDatafileFromCacheIfAvailable();
    this.repeater.setTask(this.syncDatafile.bind(this));
    this.repeater.start(true);
  }

  makeDisposable(): void {
    super.makeDisposable();
    this.initRetryRemaining = Math.min(this.initRetryRemaining ?? 5, 5);
  }

  stop(): void {
    if (this.isDone()) {
      return;
    }

    if (this.isNew() || this.isStarting()) {
      this.startPromise.reject(new Error(DATAFILE_MANAGER_STOPPED));
    }
    
    this.logger?.debug(DATAFILE_MANAGER_STOPPED);
    this.state = ServiceState.Terminated;
    this.repeater.stop();
    this.currentRequest?.abort();
    this.emitter.removeAllListeners();
    this.stopPromise.resolve();
  }

  private handleInitFailure(): void {
    this.state = ServiceState.Failed;
    this.repeater.stop();
    const error = new Error(FAILED_TO_FETCH_DATAFILE);
    this.startPromise.reject(error);
    this.stopPromise.reject(error);
  }

  private handleError(errorOrStatus: Error | number): void {
    if (this.isDone()) {
      return;
    }

    if (errorOrStatus instanceof Error) {
      this.logger?.error(ERROR_FETCHING_DATAFILE, errorOrStatus.message, errorOrStatus);
    } else {
      this.logger?.error(DATAFILE_FETCH_REQUEST_FAILED, errorOrStatus);
    }

    if(this.isStarting() && this.initRetryRemaining !== undefined) {
      if (this.initRetryRemaining === 0) {
        this.handleInitFailure();
      } else {
        this.initRetryRemaining--;
      }
    }
  }

  private async onRequestRejected(err: any): Promise<void> {
    this.handleError(err);
    return Promise.reject(err);
  }

  private async onRequestResolved(response: Response): Promise<void> {
    if (this.isDone()) {
      return;
    }

    this.saveLastModified(response.headers);
    
    if (!isSuccessStatusCode(response.statusCode)) {
      this.handleError(response.statusCode);
      return Promise.reject(new Error());
    }

    const datafile = this.getDatafileFromResponse(response);
    if (datafile) {
      this.handleDatafile(datafile);
      // if autoUpdate is off, don't need to sync datafile any more
      // if disposable, stop the repeater after the first successful fetch
      if (!this.autoUpdate || this.disposable) {
        this.repeater.stop();
      }
    }
  }

  private makeDatafileRequest(): AbortableRequest {
    const headers: Headers = {};
    if (this.lastResponseLastModified) {
      headers['if-modified-since'] = this.lastResponseLastModified;
    }

    if (this.datafileAccessToken) {
      this.logger?.debug(ADDING_AUTHORIZATION_HEADER_WITH_BEARER_TOKEN);
      headers['Authorization'] = `Bearer ${this.datafileAccessToken}`;
    }

    this.logger?.debug(MAKING_DATAFILE_REQ_TO_URL_WITH_HEADERS, this.datafileUrl, () => JSON.stringify(headers));
    return this.requestHandler.makeRequest(this.datafileUrl, headers, 'GET');
  }

  private async syncDatafile(): Promise<void> {
    this.currentRequest = this.makeDatafileRequest();
    return this.currentRequest.responsePromise
      .then(this.onRequestResolved.bind(this), this.onRequestRejected.bind(this))
      .finally(() => this.currentRequest = undefined);
  }

  private handleDatafile(datafile: string): void {
    if (this.isDone()) {
      return;
    }

    this.currentDatafile = datafile;
    this.cache?.set(this.cacheKey, datafile);

    if (this.isStarting()) {
      this.startPromise.resolve();
      this.state = ServiceState.Running;
    }
    this.emitter.emit('update', datafile);  
  }
  
  private getDatafileFromResponse(response: Response): string | undefined{
    this.logger?.debug(RESPONSE_STATUS_CODE, response.statusCode);
    if (response.statusCode === 304) {
      return undefined;
    }
    return response.body;
  }

  private saveLastModified(headers: Headers): void {
    const lastModifiedHeader = headers['last-modified'] || headers['Last-Modified'];
    if (lastModifiedHeader !== undefined) {
      this.lastResponseLastModified = lastModifiedHeader;
      this.logger?.debug(SAVED_LAST_MODIFIED_HEADER_VALUE_FROM_RESPONSE, this.lastResponseLastModified);
    }
  }

  private async setDatafileFromCacheIfAvailable(): Promise<void> {
    if (!this.cache) {
      return;
    }
    try {
      const datafile = await this.cache.get(this.cacheKey);
      if (datafile  && this.isStarting()) {
        this.handleDatafile(datafile);
      }
    } catch {
      // ignore error
    }
  }
}
