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
// TODO change this to use Managed from js-sdk-models when available
import { Managed } from './managed'
import { ConversionEvent, ImpressionEvent } from './events'
import {
  EventDispatcher,
  EventV1Request,
  EventDispatcherResponse,
} from './eventDispatcher'
import { EventQueue, DefaultEventQueue, SingleEventQueue } from './eventQueue'
import { getLogger } from '@optimizely/js-sdk-logging'

const logger = getLogger('EventProcessor')

export type ProcessableEvents = ConversionEvent | ImpressionEvent

export type EventDispatchResult = { result: boolean; event: ProcessableEvents }

export type EventCallback = (result: EventDispatchResult) => void

export type EventTransformer = (
  event: ProcessableEvents,
  // TODO change this to ProjectConfig when js-sdk-models is available
  projectConfig: any,
) => Promise<void>

export type EventInterceptor = (
  event: ProcessableEvents,
  // TODO change this to ProjectConfig when js-sdk-models is available
  projectConfig: any,
) => Promise<boolean>

export interface EventProcessor extends Managed {
  // TODO change this to ProjectConfig when js-sdk-models is available
  process(event: ProcessableEvents, projectConfig: any): void
}

const MIN_FLUSH_INTERVAL = 100
export abstract class AbstractEventProcessor implements EventProcessor {
  protected transformers: EventTransformer[]
  protected interceptors: EventInterceptor[]
  protected callbacks: EventCallback[]
  protected dispatcher: EventDispatcher
  protected queue: EventQueue<ProcessableEvents>

  constructor({
    dispatcher,
    transformers = [],
    interceptors = [],
    callbacks = [],
    flushInterval = 30000,
    maxQueueSize = 3000,
  }: {
    dispatcher: EventDispatcher
    transformers?: EventTransformer[]
    interceptors?: EventInterceptor[]
    callbacks?: EventCallback[]
    flushInterval?: number
    maxQueueSize?: number
  }) {
    this.dispatcher = dispatcher

    maxQueueSize = Math.max(1, maxQueueSize)
    if (maxQueueSize > 1) {
      this.queue = new DefaultEventQueue({
        flushInterval: Math.max(flushInterval, MIN_FLUSH_INTERVAL),
        maxQueueSize,
        sink: buffer => this.drainQueue(buffer),
      })
    } else {
      this.queue = new SingleEventQueue({
        sink: buffer => this.drainQueue(buffer),
      })
    }

    this.transformers = transformers
    this.interceptors = interceptors
    this.callbacks = callbacks
  }

  drainQueue(buffer: ProcessableEvents[]): Promise<any> {
    logger.debug('draining queue with %s events', buffer.length)

    const promises = this.groupEvents(buffer).map(eventGroup => {
      const formattedEvent = this.formatEvents(eventGroup)

      return new Promise((resolve, reject) => {
        this.dispatcher.dispatchEvent(formattedEvent, response => {
          // loop through every event in the group and run the callback handler
          // with result
          eventGroup.forEach(event => {
            this.callbacks.forEach(handler => {
              handler({
                result: isResponseSuccess(response),
                event,
              })
            })
          })

          resolve()
        })
      })
    })

    return Promise.all(promises)
  }

  // TODO change this to ProjectConfig when js-sdk-models is available
  async process(event: ProcessableEvents, projectConfig: any): Promise<void> {
    // loop and apply all transformers
    for (let transformer of this.transformers) {
      try {
        await transformer(event, projectConfig)
      } catch (ex) {
        // swallow error and move on
        logger.error('eventTransformer threw error', ex.message, ex)
      }
    }
    Object.freeze(event)

    // loop and apply all interceptors
    for (let interceptor of this.interceptors) {
      let result
      try {
        result = await interceptor(event, projectConfig)
      } catch (ex) {
        // swallow and continue
        logger.error('eventInterceptor threw error', ex.message, ex)
      }
      if (result === false) {
        return
      }
    }

    this.queue.enqueue(event)
  }

  stop(): Promise<any> {
    try {
      // swallow, an error stopping this queue should prevent this from stopping
      return this.queue.stop()
    } catch (e) {
      logger.error('Error stopping EventProcessor: "%s"', e.message, e)
    }
    return Promise.resolve()
  }

  start(): void {
    this.queue.start()
  }

  protected abstract groupEvents(events: ProcessableEvents[]): ProcessableEvents[][]

  protected abstract formatEvents(events: ProcessableEvents[]): EventV1Request
}

function isResponseSuccess(response: EventDispatcherResponse): boolean {
  try {
    let statusCode: number
    if ('statusCode' in response) {
      statusCode = response.statusCode
    } else if ('status' in response) {
      statusCode = response.status
    } else {
      return false
    }

    return statusCode >= 200 && statusCode < 300
  } catch (e) {
    return false
  }
}
