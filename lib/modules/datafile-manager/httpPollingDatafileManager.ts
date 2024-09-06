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

import { getLogger } from '../logging';
import { sprintf } from '../../utils/fns';
import { DatafileManager, DatafileManagerConfig, DatafileUpdate } from './datafileManager';
import { EventEmitter } from '../../utils/event_emitter/eventEmitter';
import { DEFAULT_UPDATE_INTERVAL, MIN_UPDATE_INTERVAL, DEFAULT_URL_TEMPLATE, UPDATE_INTERVAL_BELOW_MINIMUM_MESSAGE } from './config';
import BackoffController from './backoffController';
import PersistentKeyValueCache from '../../plugins/key_value_cache/persistentKeyValueCache';

import { NotificationRegistry } from './../../core/notification_center/notification_registry';
import { NOTIFICATION_TYPES } from '../../utils/enums';
import { ServiceState } from '../../service';
import { RequestHandler, AbortableRequest, Headers, Response } from '../../utils/http_request_handler/http';
import { resolvablePromise, ResolvablePromise } from '../../utils/promise/resolvablePromise';
import { Ticker, ExponentialBackoff, IntervalTicker } from '../../utils/ticker/ticker';
import { promises } from 'dns';
import { Consumer, Fn } from '../../utils/type';

const logger = getLogger('DatafileManager');

function isSuccessStatusCode(statusCode: number): boolean {
  return statusCode >= 200 && statusCode < 400;
}

export class HttpPollingDatafileManager implements DatafileManager {
  private requestHandler: RequestHandler;
  private currentDatafile?: string;
  private startPromise: ResolvablePromise<void>;
  private stopPrommise: ResolvablePromise<void>;
  private readonly emitter: EventEmitter<{ update: string }>;
  private readonly autoUpdate: boolean;
  private ticker: Ticker;
  private state: ServiceState;
  private initRetryRemaining?: number;

  // private currentTimeout: any;

  // private isStarted: boolean;

  private lastResponseLastModified?: string;
  private datafileUrl: string;
  private currentRequest?: AbortableRequest;
  private cacheKey: string;
  private cache?: PersistentKeyValueCache;
  private sdkKey: string;
  private datafileAccessToken?: string;

  // When true, this means the update interval timeout fired before the current
  // sync completed. In that case, we should sync again immediately upon
  // completion of the current request, instead of waiting another update
  // interval.
  // private syncOnCurrentRequestComplete: boolean;

  constructor(config: DatafileManagerConfig) {
    // const configWithDefaultsApplied: DatafileManagerConfig = {
    //   ...this.getConfigDefaults(),
    //   ...config,
    // };
    const {
      autoUpdate = false,
      sdkKey,
      datafileAccessToken,
      updateInterval = DEFAULT_UPDATE_INTERVAL,
      urlTemplate = DEFAULT_URL_TEMPLATE,
      cache,
      initRetry,
    } = config;
    this.state = ServiceState.New;

    this.cache = cache;
    this.cacheKey = 'opt-datafile-' + sdkKey;
    this.sdkKey = sdkKey;
    this.datafileAccessToken = datafileAccessToken;
    this.startPromise = resolvablePromise();
    this.stopPrommise = resolvablePromise();
    this.requestHandler = config.requestHandler;
    this.datafileUrl = sprintf(urlTemplate, sdkKey);
    this.emitter = new EventEmitter();
    this.autoUpdate = autoUpdate;
    this.initRetryRemaining = initRetry;
    
    this.ticker = new IntervalTicker(updateInterval, new ExponentialBackoff(1, updateInterval, 1000));
    if (updateInterval < MIN_UPDATE_INTERVAL) {
      logger.warn(UPDATE_INTERVAL_BELOW_MINIMUM_MESSAGE);
    }
  }
  
  onUpdate(listener: Consumer<string>): Fn {
    return this.emitter.on('update', listener);
  }

  getState(): ServiceState {
    return this.state;
  }

  onRunning(): Promise<void> {
    return this.startPromise.promise;
  }

  onTerminated(): Promise<void> {
    return this.stopPrommise.promise;
  }

  get(): string | undefined{
    return this.currentDatafile;
  }

  start(): void {
    if (this.state != ServiceState.New) {
      return;
    }

    this.state = ServiceState.Starting;
    this.setDatafileFromCacheIfAvailable();
    this.ticker.onTick(this.syncDatafile.bind(this));
    this.ticker.start();
    // if (!this.isStarted) {
    //   logger.debug('Datafile manager started');
    //   this.isStarted = true;
    //   this.backoffController.reset();
    //   this.setDatafileFromCacheIfAvailable();
    //   this.syncDatafile();
    // }
  }

  stop(): void {
    logger.debug('Datafile manager stopped');
    this.state = ServiceState.Terminated;
    this.ticker.stop();
    this.emitter.removeAllListeners();
    this.stopPrommise.resolve();
  }


  // on(eventName: string, listener: (datafileUpdate: DatafileUpdate) => void): Disposer {
  //   return this.emitter.on(eventName, listener);
  // }

  private async handleInitFailure(): Promise<void> {
    this.state = ServiceState.Failed;
    this.ticker.stop();
    this.startPromise.reject(new Error('Failed to fetch datafile'));
  }

  private async handleError(errorOrStatus: Error | number): Promise<void> {
    if (this.isDone()) {
      return;
    }

    // TODO: replace message with imported constants
    if (errorOrStatus instanceof Error) {
      logger.error('Error fetching datafile: %s', errorOrStatus.message, errorOrStatus);
    } else {
      logger.error(`Datafile fetch request failed with status: ${errorOrStatus}`);
    }

    if(this.isNew() && this.initRetryRemaining !== undefined) {
      if (this.initRetryRemaining === 0) {
        return this.handleInitFailure();
      } else {
        this.initRetryRemaining--;
        return Promise.reject(new Error());
      }
    } else {
      return Promise.reject(new Error());
    }
  }

  private async onRequestRejected(err: any): Promise<void> {
    return this.handleError(err);
  }

  private async onRequestResolved(response: Response): Promise<void> {
    if (this.isDone()) {
      return;
    }
    // if (!this.isStarted) {
    //   return;
    // }

    // if (typeof response.statusCode !== 'undefined' && isSuccessStatusCode(response.statusCode)) {
    //   this.backoffController.reset();
    // } else {
    //   this.backoffController.countError();
    // }

    this.saveLastModified(response.headers);
    
    if (!isSuccessStatusCode(response.statusCode)) {
      return this.handleError(response.statusCode);
    }

    const datafile = this.getDatafileFromResponse(response);
    if (datafile) {
      this.handleDatafile(datafile);
      // if autoUpdate is off, don't need to fetch datafile any more
      if (!this.autoUpdate) {
        this.ticker.stop();
      }
    }

    // const datafile = this.getDatafileFromResponse(response);
    // if (datafile !== '') {
    //   logger.info('Updating datafile from response');
    //   this.currentDatafile = datafile;
    //   this.cache.set(this.cacheKey, datafile);
    //   if (!this.isReadyPromiseSettled) {
    //     this.resolveReadyPromise();
    //   } else {
    //     const datafileUpdate: DatafileUpdate = {
    //       datafile,
    //     };
    //     NotificationRegistry.getNotificationCenter(this.sdkKey, logger)?.sendNotifications(
    //       NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE
    //     );
    //     this.emitter.emit(UPDATE_EVT, datafileUpdate);
    //   }
    // }
  }

  // private onRequestComplete(this: HttpPollingDatafileManager): void {
  //   if (!this.isStarted) {
  //     return;
  //   }

  //   this.currentRequest = null;

  //   if (!this.isReadyPromiseSettled && !this.autoUpdate) {
  //     // We will never resolve ready, so reject it
  //     this.rejectReadyPromise(new Error('Failed to become ready'));
  //   }

  //   if (this.autoUpdate && this.syncOnCurrentRequestComplete) {
  //     this.syncDatafile();
  //   }
  //   this.syncOnCurrentRequestComplete = false;
  // }

  private async syncDatafile(): Promise<void> {
    const headers: Headers = {};
    if (this.lastResponseLastModified) {
      headers['if-modified-since'] = this.lastResponseLastModified;
    }

    if (this.datafileAccessToken) {
      logger.debug('Adding Authorization header with Bearer Token');
      headers['Authorization'] = `Bearer ${this.datafileAccessToken}`;
    }

    logger.debug('Making datafile request to url %s with headers: %s', this.datafileUrl, () => JSON.stringify(headers));
    this.currentRequest = this.requestHandler.makeRequest(this.datafileUrl, headers, 'GET');

    // const onRequestComplete = (): void => {
    //   this.onRequestComplete();
    // };
    // const onRequestResolved = (response: Response): void => {
    //   this.onRequestResolved(response);
    // };
    // const onRequestRejected = (err: any): void => {
    //   this.onRequestRejected(err);
    // };
    return this.currentRequest.responsePromise
      .then(this.onRequestResolved.bind(this), this.onRequestRejected.bind(this));
      // .then(onRequestComplete, onRequestComplete);

    // if (this.autoUpdate) {
    //   this.scheduleNextUpdate();
    // }
  }

  // private resolveReadyPromise(): void {
  //   this.startPromise.resolve();
  //   this.state = ServiceState.Running;
  // }

  // private rejectReadyPromise(err: Error): void {
  //   this.startPromise.reject(err);
  //   this.state = ServiceState.Failed;
  // }

  private isNew(): boolean {
    return this.state === ServiceState.New;
  }

  private isDone(): boolean {
    return [
      ServiceState.Stopping,
      ServiceState.Terminated,
      ServiceState.Failed
    ].includes(this.state);
  }

  private handleDatafile(datafile: string): void {
    if (this.isDone()) {
      return;
    }

    this.currentDatafile = datafile;
    this.cache?.set(this.cacheKey, datafile);

    if (this.state === ServiceState.New) {
      this.startPromise.resolve();
      this.state = ServiceState.Running;
    }
    this.emitter.emit('update', datafile);  
  }
  
  // private scheduleNextUpdate(): void {
  //   const currentBackoffDelay = this.backoffController.getDelay();
  //   const nextUpdateDelay = Math.max(currentBackoffDelay, this.updateInterval);
  //   logger.debug('Scheduling sync in %s ms', nextUpdateDelay);
  //   this.currentTimeout = setTimeout(() => {
  //     if (this.currentRequest) {
  //       this.syncOnCurrentRequestComplete = true;
  //     } else {
  //       this.syncDatafile();
  //     }
  //   }, nextUpdateDelay);
  // }

  private getDatafileFromResponse(response: Response): string | undefined{
    logger.debug('Response status code: %s', response.statusCode);
    if (response.statusCode === 304) {
      return undefined;
    }
    return response.body;
  }

  private saveLastModified(headers: Headers): void {
    const lastModifiedHeader = headers['last-modified'] || headers['Last-Modified'];
    if (typeof lastModifiedHeader !== 'undefined') {
      this.lastResponseLastModified = lastModifiedHeader;
      logger.debug('Saved last modified header value from response: %s', this.lastResponseLastModified);
    }
  }

  setDatafileFromCacheIfAvailable(): void {
    this.cache?.get(this.cacheKey).then(datafile => {
      if (datafile && this.state === ServiceState.New) {
        this.handleDatafile(datafile);
      }
    }).catch(() => {});
  }
}
