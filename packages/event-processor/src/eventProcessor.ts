import { Managed, ProjectConfig } from '@optimizely/js-sdk-models'
import { ConversionEvent, ImpressionEvent, SummaryEvent } from './events'
import { EventDispatcher } from './eventDispatcher'
import { EventQueue, EventQueueFactory, DefaultEventQueueFactory } from './eventQueue'
import { getLogger } from '@optimizely/js-sdk-logging'

const logger = getLogger('EventProcessor')

export type ProcessableEvents = ConversionEvent | ImpressionEvent | SummaryEvent

export type EventDispatchResult = { result: boolean; event: ProcessableEvents }

export type EventCallback = (result: EventDispatchResult) => void

export type EventTransformer = (
  event: ProcessableEvents,
  projectConfig: ProjectConfig,
) => Promise<any>

export type EventInterceptor = (
  event: ProcessableEvents,
  projectConfig: ProjectConfig,
) => Promise<ProcessableEvents | null>

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
    eventQueueFactory,
    transformers = [],
    interceptors = [],
    callbacks = [],
    flushInterval = 30000,
    maxQueueSize = 3000,
  }: {
    dispatcher: EventDispatcher
    eventQueueFactory?: EventQueueFactory<ProcessableEvents>
    transformers?: EventTransformer[]
    interceptors?: EventInterceptor[]
    callbacks?: EventCallback[]
    flushInterval?: number
    maxQueueSize?: number
  }) {
    this.dispatcher = dispatcher

    const factory = eventQueueFactory || new DefaultEventQueueFactory()

    this.transformers = transformers
    this.interceptors = interceptors
    this.callbacks = callbacks

    this.queue = factory.createEventQueue({
      flushInterval,
      maxQueueSize,
      sink: buffer => this.drainQueue(buffer),
    })
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

  // TODO pass 2nd argument EventMeta /w ProjectConfig
  async process(event: ProcessableEvents, projectConfig: ProjectConfig): Promise<void> {
    // loop and apply all transformers
    for (let transformer of this.transformers) {
      try {
        await transformer(event, projectConfig)
      } catch (ex) {
        logger.error('eventTransformer threw error', ex.message, ex)
        return
      }
    }
    Object.freeze(event)

    // loop and apply all interceptors
    for (let interceptor of this.interceptors) {
      let result
      try {
        result = await interceptor(event, projectConfig)
      } catch (ex) {
        logger.error('eventInterceptor threw error', ex.message, ex)
        return
      }
      if (result === null) {
        return
      }
      event = result
    }

    this.queue.enqueue(event)
  }

  stop(): Promise<any> {
    try {
      // swallow, an error stopping this queue should prevent this from stopping
      return this.queue.stop()
    } catch (e) {
      // TODO error
    }
    return Promise.resolve()
  }

  start(): void {
    this.queue.start()
  }

  protected abstract groupEvents(events: ProcessableEvents[]): ProcessableEvents[][]

  protected abstract formatEvents(events: ProcessableEvents[]): object
}
