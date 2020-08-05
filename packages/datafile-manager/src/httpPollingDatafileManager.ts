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
import { sprintf } from '@optimizely/js-sdk-utils';
import { DatafileManager, DatafileManagerConfig, DatafileUpdate } from './datafileManager';
import EventEmitter, { Disposer } from './eventEmitter';
import { AbortableRequest, Response, Headers } from './http';
import { DEFAULT_UPDATE_INTERVAL, MIN_UPDATE_INTERVAL, DEFAULT_URL_TEMPLATE } from './config';
import BackoffController from './backoffController';
import PersistentKeyValueCache from './persistentKeyValueCache';

const logger = getLogger('DatafileManager');

const UPDATE_EVT = 'update';

function isValidUpdateInterval(updateInterval: number): boolean {
  return updateInterval >= MIN_UPDATE_INTERVAL;
}

function isSuccessStatusCode(statusCode: number): boolean {
  return statusCode >= 200 && statusCode < 400;
}

const noOpKeyValueCache: PersistentKeyValueCache = {
  get(): Promise<string> {
    return Promise.resolve('');
  },

  set(): Promise<void> {
    return Promise.resolve();
  },

  contains(): Promise<boolean> {
    return Promise.resolve(false);
  },

  remove(): Promise<void> {
    return Promise.resolve();
  },
};

export default abstract class HttpPollingDatafileManager implements DatafileManager {
  // Make an HTTP get request to the given URL with the given headers
  // Return an AbortableRequest, which has a promise for a Response.
  // If we can't get a response, the promise is rejected.
  // The request will be aborted if the manager is stopped while the request is in flight.
  protected abstract makeGetRequest(reqUrl: string, headers: Headers): AbortableRequest;

  // Return any default configuration options that should be applied
  protected abstract getConfigDefaults(): Partial<DatafileManagerConfig>;

  private currentDatafile: string;

  private readonly readyPromise: Promise<void>;

  private isReadyPromiseSettled: boolean;

  private readyPromiseResolver: () => void;

  private readyPromiseRejecter: (err: Error) => void;

  private readonly emitter: EventEmitter;

  private readonly autoUpdate: boolean;

  private readonly updateInterval: number;

  private currentTimeout: any;

  private isStarted: boolean;

  private lastResponseLastModified?: string;

  private datafileUrl: string;

  private currentRequest: AbortableRequest | null;

  private backoffController: BackoffController;

  private cacheKey: string;

  private cache: PersistentKeyValueCache;

  // When true, this means the update interval timeout fired before the current
  // sync completed. In that case, we should sync again immediately upon
  // completion of the current request, instead of waiting another update
  // interval.
  private syncOnCurrentRequestComplete: boolean;

  constructor(config: DatafileManagerConfig) {
    const configWithDefaultsApplied: DatafileManagerConfig = {
      ...this.getConfigDefaults(),
      ...config,
    };
    const {
      datafile,
      autoUpdate = false,
      sdkKey,
      updateInterval = DEFAULT_UPDATE_INTERVAL,
      urlTemplate = DEFAULT_URL_TEMPLATE,
      cache = noOpKeyValueCache,
    } = configWithDefaultsApplied;

    this.cache = cache;
    this.cacheKey = 'opt-datafile-' + sdkKey;
    this.isReadyPromiseSettled = false;
    this.readyPromiseResolver = (): void => {};
    this.readyPromiseRejecter = (): void => {};
    this.readyPromise = new Promise((resolve, reject) => {
      this.readyPromiseResolver = resolve;
      this.readyPromiseRejecter = reject;
    });

    if (datafile) {
      this.currentDatafile = datafile;
      if (!sdkKey) {
        this.resolveReadyPromise();
      }
    } else {
      this.currentDatafile = '';
    }

    this.isStarted = false;

    this.datafileUrl = sprintf(urlTemplate, sdkKey);

    this.emitter = new EventEmitter();
    this.autoUpdate = autoUpdate;
    if (isValidUpdateInterval(updateInterval)) {
      this.updateInterval = updateInterval;
    } else {
      logger.warn('Invalid updateInterval %s, defaulting to %s', updateInterval, DEFAULT_UPDATE_INTERVAL);
      this.updateInterval = DEFAULT_UPDATE_INTERVAL;
    }
    this.currentTimeout = null;
    this.currentRequest = null;
    this.backoffController = new BackoffController();
    this.syncOnCurrentRequestComplete = false;
  }

  get(): string {
    return this.currentDatafile;
  }

  start(): void {
    if (!this.isStarted) {
      logger.debug('Datafile manager started');
      this.isStarted = true;
      this.backoffController.reset();
      this.setDatafileFromCacheIfAvailable();
      this.syncDatafile();
    }
  }

  stop(): Promise<void> {
    logger.debug('Datafile manager stopped');
    this.isStarted = false;
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }

    this.emitter.removeAllListeners();

    if (this.currentRequest) {
      this.currentRequest.abort();
      this.currentRequest = null;
    }

    return Promise.resolve();
  }

  onReady(): Promise<void> {
    return this.readyPromise;
  }

  on(eventName: string, listener: (datafileUpdate: DatafileUpdate) => void): Disposer {
    return this.emitter.on(eventName, listener);
  }

  private onRequestRejected(err: any): void {
    if (!this.isStarted) {
      return;
    }

    this.backoffController.countError();

    if (err instanceof Error) {
      logger.error('Error fetching datafile: %s', err.message, err);
    } else if (typeof err === 'string') {
      logger.error('Error fetching datafile: %s', err);
    } else {
      logger.error('Error fetching datafile');
    }
  }

  private onRequestResolved(response: Response): void {
    if (!this.isStarted) {
      return;
    }

    if (typeof response.statusCode !== 'undefined' && isSuccessStatusCode(response.statusCode)) {
      this.backoffController.reset();
    } else {
      this.backoffController.countError();
    }

    this.trySavingLastModified(response.headers);

    const datafile = this.getNextDatafileFromResponse(response);
    if (datafile !== '') {
      logger.info('Updating datafile from response');
      this.currentDatafile = datafile;
      this.cache.set(this.cacheKey, datafile);
      if (!this.isReadyPromiseSettled) {
        this.resolveReadyPromise();
      } else {
        const datafileUpdate: DatafileUpdate = {
          datafile,
        };
        this.emitter.emit(UPDATE_EVT, datafileUpdate);
      }
    }
  }

  private onRequestComplete(this: HttpPollingDatafileManager): void {
    if (!this.isStarted) {
      return;
    }

    this.currentRequest = null;

    if (!this.isReadyPromiseSettled && !this.autoUpdate) {
      // We will never resolve ready, so reject it
      this.rejectReadyPromise(new Error('Failed to become ready'));
    }

    if (this.autoUpdate && this.syncOnCurrentRequestComplete) {
      this.syncDatafile();
    }
    this.syncOnCurrentRequestComplete = false;
  }

  private syncDatafile(): void {
    const headers: Headers = {};
    if (this.lastResponseLastModified) {
      headers['if-modified-since'] = this.lastResponseLastModified;
    }

    logger.debug('Making datafile request to url %s with headers: %s', this.datafileUrl, () => JSON.stringify(headers));
    this.currentRequest = this.makeGetRequest(this.datafileUrl, headers);

    const onRequestComplete = (): void => {
      this.onRequestComplete();
    };
    const onRequestResolved = (response: Response): void => {
      this.onRequestResolved(response);
    };
    const onRequestRejected = (err: any): void => {
      this.onRequestRejected(err);
    };
    this.currentRequest.responsePromise
      .then(onRequestResolved, onRequestRejected)
      .then(onRequestComplete, onRequestComplete);

    if (this.autoUpdate) {
      this.scheduleNextUpdate();
    }
  }

  private resolveReadyPromise(): void {
    this.readyPromiseResolver();
    this.isReadyPromiseSettled = true;
  }

  private rejectReadyPromise(err: Error): void {
    this.readyPromiseRejecter(err);
    this.isReadyPromiseSettled = true;
  }

  private scheduleNextUpdate(): void {
    const currentBackoffDelay = this.backoffController.getDelay();
    const nextUpdateDelay = Math.max(currentBackoffDelay, this.updateInterval);
    logger.debug('Scheduling sync in %s ms', nextUpdateDelay);
    this.currentTimeout = setTimeout(() => {
      if (this.currentRequest) {
        this.syncOnCurrentRequestComplete = true;
      } else {
        this.syncDatafile();
      }
    }, nextUpdateDelay);
  }

  private getNextDatafileFromResponse(response: Response): string {
    logger.debug('Response status code: %s', response.statusCode);
    if (typeof response.statusCode === 'undefined') {
      return '';
    }
    if (response.statusCode === 304) {
      return '';
    }
    if (isSuccessStatusCode(response.statusCode)) {
      return response.body;
    }
    return '';
  }

  private trySavingLastModified(headers: Headers): void {
    const lastModifiedHeader = headers['last-modified'] || headers['Last-Modified'];
    if (typeof lastModifiedHeader !== 'undefined') {
      this.lastResponseLastModified = lastModifiedHeader;
      logger.debug('Saved last modified header value from response: %s', this.lastResponseLastModified);
    }
  }

  setDatafileFromCacheIfAvailable(): void {
    this.cache.get(this.cacheKey).then(datafile => {
      if (this.isStarted && !this.isReadyPromiseSettled && datafile !== '') {
        logger.debug('Using datafile from cache');
        this.currentDatafile = datafile;
        this.resolveReadyPromise();
      }
    });
  }
}
