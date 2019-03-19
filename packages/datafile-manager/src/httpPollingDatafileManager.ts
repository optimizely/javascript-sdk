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
import { DatafileManager, DatafileManagerConfig, DatafileUpdate } from './datafileManager';
import EventEmitter from './eventEmitter'
import { AbortableRequest, Response, Headers } from './http';
import { DEFAULT_UPDATE_INTERVAL, MIN_UPDATE_INTERVAL, DEFAULT_URL_TEMPLATE, SDK_KEY_TOKEN } from './config'
import { TimeoutFactory, DEFAULT_TIMEOUT_FACTORY } from './timeoutFactory'

const logger = getLogger('DatafileManager')

const UPDATE_EVT = 'update'

function isValidUpdateInterval(updateInterval: number): boolean {
  return updateInterval >= MIN_UPDATE_INTERVAL
}

export default abstract class HTTPPollingDatafileManager implements DatafileManager {
  // Make an HTTP get request to the given URL with the given headers
  // Return an AbortableRequest, which has a promise for a Response.
  // If we can't get a response, the promise is rejected.
  // The request will be aborted if the manager is stopped while the request is in flight.
  protected abstract makeGetRequest(reqUrl: string, headers: Headers): AbortableRequest

  public readonly onReady: Promise<void>

  private currentDatafile: string | null

  private readonly sdkKey: string

  private isOnReadySettled: boolean

  private onReadyResolver: () => void

  private onReadyRejecter: (err: Error) => void

  private readonly emitter: EventEmitter

  private readonly liveUpdates: boolean

  private readonly updateInterval: number

  private cancelTimeout?: () => void

  private isStarted: boolean

  private lastResponseLastModified?: string

  private urlTemplate: string

  private timeoutFactory: TimeoutFactory

  private currentRequest?: AbortableRequest

  constructor(config: DatafileManagerConfig) {
    const {
      datafile,
      liveUpdates = true,
      sdkKey,
      timeoutFactory = DEFAULT_TIMEOUT_FACTORY,
      updateInterval = DEFAULT_UPDATE_INTERVAL,
      urlTemplate = DEFAULT_URL_TEMPLATE,
    } = config

    this.sdkKey = sdkKey

    if (typeof datafile !== 'undefined') {
      this.currentDatafile = datafile
    } else {
      this.currentDatafile = null
    }

    this.isOnReadySettled = false
    this.onReadyResolver = () => {}
    this.onReadyRejecter = () => {}
    this.onReady = new Promise((resolve, reject) => {
      this.onReadyResolver = resolve
      this.onReadyRejecter = reject
    })

    this.isStarted = false

    this.urlTemplate = urlTemplate
    if (this.urlTemplate.indexOf(SDK_KEY_TOKEN) === -1) {
      logger.debug(`urlTemplate does not contain replacement token ${SDK_KEY_TOKEN}`)
    }

    this.timeoutFactory = timeoutFactory
    this.emitter = new EventEmitter()
    this.liveUpdates = liveUpdates
    if (isValidUpdateInterval(updateInterval)) {
      this.updateInterval = updateInterval
    } else {
      logger.warn('Invalid updateInterval %s, defaulting to %s', updateInterval, DEFAULT_UPDATE_INTERVAL)
      this.updateInterval = DEFAULT_UPDATE_INTERVAL
    }
  }

  get(): string | null {
    return this.currentDatafile
  }

  start(): void {
    if (!this.isStarted) {
      logger.debug('Datafile manager started')
      this.isStarted = true
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

  on(eventName: string, listener: (datafileUpdate: DatafileUpdate) => void) {
    return this.emitter.on(eventName, listener)
  }

  private getUrl(sdkKey: string) {
    return this.urlTemplate.replace(SDK_KEY_TOKEN, sdkKey)
  }

  private logMakeGetRequestError(err: any): void {
    if (!this.isStarted) {
      return
    }

    if (err instanceof Error) {
      logger.error('Error fetching datafile: %s', err.message, err)
    } else if (typeof err === 'string') {
      logger.error('Error fetching datafile: %s', err)
    } else {
      logger.error('Error fetching datafile')
    }
  }

  private tryUpdatingDatafile(response: Response): void {
    if (!this.isStarted) {
      return
    }

    this.trySavingLastModified(response.headers)

    const datafile = this.getNextDatafileFromResponse(response)
    if (datafile !== null) {
      logger.info('Updating datafile from response')
      this.currentDatafile = datafile
      if (!this.isOnReadySettled) {
        this.resolveOnReady()
      } else if (this.liveUpdates) {
        const datafileUpdate: DatafileUpdate = {
          datafile,
        }
        this.emitter.emit(UPDATE_EVT, datafileUpdate)
      }
    }
  }

  private onFetchComplete(this: HTTPPollingDatafileManager): void {
    if (!this.isStarted) {
      return
    }

    this.currentRequest = undefined

    if (this.liveUpdates) {
      this.scheduleNextUpdate()
    }
    if (!this.isOnReadySettled && !this.liveUpdates) {
      // We will never resolve ready, so reject it
      this.rejectOnReady(new Error('Failed to become ready'))
    }
  }

  private syncDatafile(): void {
    const headers: Headers = {}
    if (this.lastResponseLastModified) {
      headers['if-modified-since'] = this.lastResponseLastModified
    }

    const datafileUrl = this.getUrl(this.sdkKey)

    logger.debug('Making datafile request to url %s with headers: %s', datafileUrl, () => JSON.stringify(headers))
    this.currentRequest = this.makeGetRequest(datafileUrl, headers)

    const onFetchComplete = () => {
      this.onFetchComplete()
    }
    const tryUpdatingDatafile = (response: Response) => {
      this.tryUpdatingDatafile(response)
    }
    const logMakeGetRequestError = (err: any) => {
      this.logMakeGetRequestError(err)
    }
    this.currentRequest.responsePromise
      .then(tryUpdatingDatafile, logMakeGetRequestError)
      .then(onFetchComplete, onFetchComplete)
  }

  private resolveOnReady(): void {
    this.onReadyResolver()
    this.isOnReadySettled = true
  }

  private rejectOnReady(err: Error): void {
    this.onReadyRejecter(err)
    this.isOnReadySettled = true
  }

  private scheduleNextUpdate(): void {
    logger.debug('Scheduling sync in %s ms', this.updateInterval)
    this.cancelTimeout = this.timeoutFactory.setTimeout(() => {
      this.syncDatafile()
    }, this.updateInterval)
  }

  private getNextDatafileFromResponse(response: Response): string | null {
    logger.debug('Response status code: %s', response.statusCode)
    if (typeof response.statusCode === 'undefined') {
      return null
    }
    if (response.statusCode === 304) {
      return null
    }
    if (response.statusCode >= 200 && response.statusCode < 400) {
      return response.body
    }
    return null
  }

  private trySavingLastModified(headers: Headers): void {
    const lastModifiedHeader = headers['last-modified'] || headers['Last-Modified']
    if (typeof lastModifiedHeader === 'string') {
      this.lastResponseLastModified = lastModifiedHeader
      logger.debug('Saved last modified header value from response: %s', this.lastResponseLastModified)
    } else if (typeof lastModifiedHeader === 'undefined') {
    } else { // array
      if (lastModifiedHeader.length === 1) {
        this.lastResponseLastModified = lastModifiedHeader[0]
        logger.debug('Saved last modified header value from response: %s', this.lastResponseLastModified)
      }
    }
  }
}
