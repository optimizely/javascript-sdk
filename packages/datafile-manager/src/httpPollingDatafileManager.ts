/**
 * Copyright 2019, Optimizely
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

import { getLogger } from '@optimizely/js-sdk-logging'
import { sprintf } from '@optimizely/js-sdk-utils';
import { DatafileManager, DatafileManagerConfig, DatafileUpdate } from './datafileManager';
import EventEmitter from './eventEmitter'
import { AbortableRequest, Response, Headers } from './http';
import { DEFAULT_UPDATE_INTERVAL, MIN_UPDATE_INTERVAL, DEFAULT_URL_TEMPLATE } from './config'
import { TimeoutFactory, DEFAULT_TIMEOUT_FACTORY } from './timeoutFactory'
import BackoffController from './backoffController';

const logger = getLogger('DatafileManager')

const UPDATE_EVT = 'update'

function isValidUpdateInterval(updateInterval: number): boolean {
  return updateInterval >= MIN_UPDATE_INTERVAL
}

function isSuccessStatusCode(statusCode: number): boolean {
  return statusCode >= 200 && statusCode < 400
}

export default abstract class HTTPPollingDatafileManager implements DatafileManager {
  // Make an HTTP get request to the given URL with the given headers
  // Return an AbortableRequest, which has a promise for a Response.
  // If we can't get a response, the promise is rejected.
  // The request will be aborted if the manager is stopped while the request is in flight.
  protected abstract makeGetRequest(reqUrl: string, headers: Headers): AbortableRequest

  // Return any default configuration options that should be applied
  protected abstract getConfigDefaults(): Partial<DatafileManagerConfig>

  private currentDatafile: object | null

  private readonly readyPromise: Promise<void>

  private isReadyPromiseSettled: boolean

  private readyPromiseResolver: () => void

  private readyPromiseRejecter: (err: Error) => void

  private readonly emitter: EventEmitter

  private readonly autoUpdate: boolean

  private readonly updateInterval: number

  private cancelTimeout?: () => void

  private isStarted: boolean

  private lastResponseLastModified?: string

  private datafileUrl: string

  private timeoutFactory: TimeoutFactory

  private currentRequest?: AbortableRequest

  private backoffController: BackoffController

  // When true, this means the update interval timeout fired before the current
  // sync completed. In that case, we should sync again immediately upon
  // completion of the current request, instead of waiting another update
  // interval.
  private syncOnCurrentRequestComplete: boolean

  constructor(config: DatafileManagerConfig) {
    const configWithDefaultsApplied: DatafileManagerConfig = {
      ...this.getConfigDefaults(),
      ...config
    }
    const {
      datafile,
      autoUpdate = false,
      sdkKey,
      timeoutFactory = DEFAULT_TIMEOUT_FACTORY,
      updateInterval = DEFAULT_UPDATE_INTERVAL,
      urlTemplate = DEFAULT_URL_TEMPLATE,
    } = configWithDefaultsApplied

    this.isReadyPromiseSettled = false
    this.readyPromiseResolver = () => {}
    this.readyPromiseRejecter = () => {}
    this.readyPromise = new Promise((resolve, reject) => {
      this.readyPromiseResolver = resolve
      this.readyPromiseRejecter = reject
    })

    if (datafile) {
      this.currentDatafile = datafile
      this.resolveReadyPromise()
    } else {
      this.currentDatafile = null
    }

    this.isStarted = false

    this.datafileUrl = sprintf(urlTemplate, sdkKey)

    this.timeoutFactory = timeoutFactory
    this.emitter = new EventEmitter()
    this.autoUpdate = autoUpdate
    if (isValidUpdateInterval(updateInterval)) {
      this.updateInterval = updateInterval
    } else {
      logger.warn('Invalid updateInterval %s, defaulting to %s', updateInterval, DEFAULT_UPDATE_INTERVAL)
      this.updateInterval = DEFAULT_UPDATE_INTERVAL
    }
    this.backoffController = new BackoffController()
    this.syncOnCurrentRequestComplete = false
  }

  get(): object | null {
    return this.currentDatafile
  }

  start(): void {
    if (!this.isStarted) {
      logger.debug('Datafile manager started')
      this.isStarted = true
      this.backoffController.reset()
      this.syncDatafile()
    }
  }

  stop(): Promise<void> {
    logger.debug('Datafile manager stopped')
    this.isStarted = false
    if (this.cancelTimeout) {
      this.cancelTimeout()
      this.cancelTimeout = undefined
    }

    this.emitter.removeAllListeners()

    if (this.currentRequest) {
      this.currentRequest.abort()
      this.currentRequest = undefined
    }

    return Promise.resolve()
  }

  onReady(): Promise<void> {
    return this.readyPromise
  }

  on(eventName: string, listener: (datafileUpdate: DatafileUpdate) => void) {
    return this.emitter.on(eventName, listener)
  }

  private onRequestRejected(err: any): void {
    if (!this.isStarted) {
      return
    }

    this.backoffController.countError()

    if (err instanceof Error) {
      logger.error('Error fetching datafile: %s', err.message, err)
    } else if (typeof err === 'string') {
      logger.error('Error fetching datafile: %s', err)
    } else {
      logger.error('Error fetching datafile')
    }
  }

  private onRequestResolved(response: Response): void {
    if (!this.isStarted) {
      return
    }

    if (typeof response.statusCode !== 'undefined' &&
        isSuccessStatusCode(response.statusCode)) {
      this.backoffController.reset()
    } else {
      this.backoffController.countError()
    }

    this.trySavingLastModified(response.headers)

    const datafile = this.getNextDatafileFromResponse(response)
    if (datafile !== null) {
      logger.info('Updating datafile from response')
      this.currentDatafile = datafile
      if (!this.isReadyPromiseSettled) {
        this.resolveReadyPromise()
      } else {
        const datafileUpdate: DatafileUpdate = {
          datafile,
        }
        this.emitter.emit(UPDATE_EVT, datafileUpdate)
      }
    }
  }

  private onRequestComplete(this: HTTPPollingDatafileManager): void {
    if (!this.isStarted) {
      return
    }

    this.currentRequest = undefined

    if (!this.isReadyPromiseSettled && !this.autoUpdate) {
      // We will never resolve ready, so reject it
      this.rejectReadyPromise(new Error('Failed to become ready'))
    }

    if (this.autoUpdate && this.syncOnCurrentRequestComplete) {
      this.syncDatafile()
    }
    this.syncOnCurrentRequestComplete = false
  }

  private syncDatafile(): void {
    const headers: Headers = {}
    if (this.lastResponseLastModified) {
      headers['if-modified-since'] = this.lastResponseLastModified
    }

    logger.debug('Making datafile request to url %s with headers: %s', this.datafileUrl, () => JSON.stringify(headers))
    this.currentRequest = this.makeGetRequest(this.datafileUrl, headers)

    const onRequestComplete = () => {
      this.onRequestComplete()
    }
    const onRequestResolved = (response: Response) => {
      this.onRequestResolved(response)
    }
    const onRequestRejected = (err: any) => {
      this.onRequestRejected(err)
    }
    this.currentRequest.responsePromise
      .then(onRequestResolved, onRequestRejected)
      .then(onRequestComplete, onRequestComplete)

    if (this.autoUpdate) {
      this.scheduleNextUpdate()
    }
  }

  private resolveReadyPromise(): void {
    this.readyPromiseResolver()
    this.isReadyPromiseSettled = true
  }

  private rejectReadyPromise(err: Error): void {
    this.readyPromiseRejecter(err)
    this.isReadyPromiseSettled = true
  }

  private scheduleNextUpdate(): void {
    const currentBackoffDelay = this.backoffController.getDelay()
    const nextUpdateDelay = Math.max(currentBackoffDelay, this.updateInterval)
    logger.debug('Scheduling sync in %s ms', nextUpdateDelay)
    this.cancelTimeout = this.timeoutFactory.setTimeout(() => {
      if (this.currentRequest) {
        this.syncOnCurrentRequestComplete = true
      } else {
        this.syncDatafile()
      }
    }, nextUpdateDelay)
  }

  private getNextDatafileFromResponse(response: Response): object | null {
    logger.debug('Response status code: %s', response.statusCode)
    if (typeof response.statusCode === 'undefined') {
      return null
    }
    if (response.statusCode === 304) {
      return null
    }
    if (isSuccessStatusCode(response.statusCode)) {
      return this.tryParsingBodyAsJSON(response.body);
    }
    return null
  }

  private tryParsingBodyAsJSON(body: string): object | null {
    let parseResult: any
    try {
      parseResult = JSON.parse(body)
    } catch (err) {
      logger.error('Error parsing response body: %s', err.message, err)
      return null
    }
    let datafileObj: object | null = null
    if (typeof parseResult === 'object' && parseResult !== null) {
      datafileObj = parseResult
    } else {
      logger.error('Error parsing response body: was not an object')
    }
    return datafileObj
  }

  private trySavingLastModified(headers: Headers): void {
    const lastModifiedHeader = headers['last-modified'] || headers['Last-Modified']
    if (typeof lastModifiedHeader !== 'undefined') {
      this.lastResponseLastModified = lastModifiedHeader
      logger.debug('Saved last modified header value from response: %s', this.lastResponseLastModified)
    }
  }
}
