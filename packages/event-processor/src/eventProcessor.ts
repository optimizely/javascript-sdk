import { Managed, ProjectConfig } from '@optimizely/js-sdk-models'
import { ConversionEvent, ImpressionEvent } from './events'
import { EventDispatcher } from './eventDispatcher'
import { EventQueue, DefaultEventQueue, SingleEventQueue } from './eventQueue'
import { getLogger } from '@optimizely/js-sdk-logging'

const logger = getLogger('EventProcessor')

export type ProcessableEvents = ConversionEvent | ImpressionEvent

export type EventDispatchResult = { result: boolean; event: ProcessableEvents }

export type EventCallback = (result: EventDispatchResult) => void

export type EventTransformer = (
  event: ProcessableEvents,
  projectConfig: ProjectConfig,
) => Promise<any>

export type EventInterceptor = (
  event: ProcessableEvents,
  projectConfig: ProjectConfig,
) => Promise<boolean>

export interface EventProcessor extends Managed {
  process(event: ProcessableEvents, projectConfig: ProjectConfig): void
}

export abstract class AbstractEventProcessor implements EventProcessor {
  static DEFAULT_FLUSH_INTERVAL = 30000

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
        flushInterval,
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
        this.dispatcher.dispatch(formattedEvent, result => {
          // loop through every event in the group and run the callback handler
          // with result
          eventGroup.forEach(event => {
            this.callbacks.forEach(handler => {
              handler({
                result,
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

  async process(event: ProcessableEvents, projectConfig: ProjectConfig): Promise<void> {
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

  protected abstract formatEvents(events: ProcessableEvents[]): object
}
