/**
 * Copyright 2022, 2024, Optimizely
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
import { describe, beforeEach, afterEach, it, vi, expect, Mock } from 'vitest';

import { LogTierV1EventProcessor } from '../lib/event_processor/v1/v1EventProcessor'
import {
  EventDispatcher,
  EventV1Request,
  EventDispatcherResponse,
} from '../lib/event_processor/eventDispatcher'
import { EventProcessor } from '../lib/event_processor/eventProcessor'
import { buildImpressionEventV1, makeBatchedEventV1 } from '../lib/event_processor/v1/buildEventV1'
import { NotificationCenter, NotificationSender } from '../lib/core/notification_center'
import { NOTIFICATION_TYPES } from '../lib/utils/enums'
import { resolvablePromise, ResolvablePromise } from '../lib/utils/promise/resolvablePromise';

function createImpressionEvent() {
  return {
    type: 'impression' as 'impression',
    timestamp: 69,
    uuid: 'uuid',

    context: {
      accountId: 'accountId',
      projectId: 'projectId',
      clientName: 'node-sdk',
      clientVersion: '3.0.0',
      revision: '1',
      botFiltering: true,
      anonymizeIP: true,
    },

    user: {
      id: 'userId',
      attributes: [{ entityId: 'attr1-id', key: 'attr1-key', value: 'attr1-value' }],
    },

    layer: {
      id: 'layerId',
    },

    experiment: {
      id: 'expId',
      key: 'expKey',
    },

    variation: {
      id: 'varId',
      key: 'varKey',
    },

    ruleKey: 'expKey',
    flagKey: 'flagKey1',
    ruleType: 'experiment',
    enabled: true,
  }
}

function createConversionEvent() {
  return {
    type: 'conversion' as 'conversion',
    timestamp: 69,
    uuid: 'uuid',

    context: {
      accountId: 'accountId',
      projectId: 'projectId',
      clientName: 'node-sdk',
      clientVersion: '3.0.0',
      revision: '1',
      botFiltering: true,
      anonymizeIP: true,
    },

    user: {
      id: 'userId',
      attributes: [{ entityId: 'attr1-id', key: 'attr1-key', value: 'attr1-value' }],
    },

    event: {
      id: 'event-id',
      key: 'event-key',
    },

    tags: {
      foo: 'bar',
      value: '123',
      revenue: '1000',
    },

    revenue: 1000,
    value: 123,
  }
}

describe('LogTierV1EventProcessor', () => {
  let stubDispatcher: EventDispatcher
  let dispatchStub: Mock
  // TODO change this to ProjectConfig when js-sdk-models is available
  let testProjectConfig: any

  beforeEach(() => {
    vi.useFakeTimers()

    testProjectConfig = {}
    dispatchStub = vi.fn()

    stubDispatcher = {
      dispatchEvent(event: EventV1Request): Promise<EventDispatcherResponse> {
        dispatchStub(event)
        return Promise.resolve({ statusCode: 200 })
      },
    }
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('stop()', () => {
    let resposePromise: ResolvablePromise<EventDispatcherResponse>
    beforeEach(() => {
      stubDispatcher = {
        dispatchEvent(event: EventV1Request): Promise<EventDispatcherResponse> {
          dispatchStub(event)
          return Promise.resolve({ statusCode: 200 })
        },
      }
      stubDispatcher = {
        dispatchEvent(event: EventV1Request): Promise<EventDispatcherResponse> {
          dispatchStub(event)
          resposePromise = resolvablePromise()
          return resposePromise.promise
        },
      }
    })

    it('should return a resolved promise when there is nothing in queue', () => 
      new Promise<void>((done) => {
        const processor = new LogTierV1EventProcessor({
          dispatcher: stubDispatcher,
          flushInterval: 100,
          batchSize: 100,
        })
  
        processor.stop().then(() => {
          done()
        })
      })
    )

    it('should return a promise that is resolved when the dispatcher callback returns a 200 response', () => 
      new Promise<void>((done) => {
        const processor = new LogTierV1EventProcessor({
          dispatcher: stubDispatcher,
          flushInterval: 100,
          batchSize: 100,
        })
        processor.start()

        const impressionEvent = createImpressionEvent()
        processor.process(impressionEvent)

        processor.stop().then(() => {
          done()
        })

        resposePromise.resolve({ statusCode: 200 })
      })
    )

    it('should return a promise that is resolved when the dispatcher callback returns a 400 response', () => 
      new Promise<void>((done) => {  
        // This test is saying that even if the request fails to send but
        // the `dispatcher` yielded control back, then the `.stop()` promise should be resolved
        stubDispatcher = {
          dispatchEvent(event: EventV1Request): Promise<EventDispatcherResponse> {
            dispatchStub(event)
            resposePromise = resolvablePromise()
            return Promise.resolve({statusCode: 400})
          },
        }

        const processor = new LogTierV1EventProcessor({
          dispatcher: stubDispatcher,
          flushInterval: 100,
          batchSize: 100,
        })
        processor.start()

        const impressionEvent = createImpressionEvent()
        processor.process(impressionEvent)

        processor.stop().then(() => {
          done()
        })
      })
    )

    it('should return a promise when multiple event batches are sent', () =>
      new Promise<void>((done) => {
        stubDispatcher = {
          dispatchEvent(event: EventV1Request): Promise<EventDispatcherResponse> {
            dispatchStub(event)
            return Promise.resolve({ statusCode: 200 })
          },
        }

        const processor = new LogTierV1EventProcessor({
          dispatcher: stubDispatcher,
          flushInterval: 100,
          batchSize: 100,
        })
        processor.start()

        const impressionEvent1 = createImpressionEvent()
        const impressionEvent2 = createImpressionEvent()
        impressionEvent2.context.revision = '2'
        processor.process(impressionEvent1)
        processor.process(impressionEvent2)

        processor.stop().then(() => {
          expect(dispatchStub).toBeCalledTimes(2)
          done()
        })
      })
    )

    it('should stop accepting events after stop is called', () => {
      const dispatcher = {
        dispatchEvent: vi.fn((event: EventV1Request) => {
          return new Promise<EventDispatcherResponse>((resolve) => {
            setTimeout(() => resolve({ statusCode: 204 }), 0)
          })
        })
      }
      const processor = new LogTierV1EventProcessor({
        dispatcher,
        flushInterval: 100,
        batchSize: 3,
      })
      processor.start()

      const impressionEvent1 = createImpressionEvent()
      processor.process(impressionEvent1)
      processor.stop()
      // calling stop should haver flushed the current batch of size 1
      expect(dispatcher.dispatchEvent).toBeCalledTimes(1)

      dispatcher.dispatchEvent.mockClear();

      // From now on, subsequent events should be ignored.
      // Process 3 more, which ordinarily would have triggered
      // a flush due to the batch size.
      const impressionEvent2 = createImpressionEvent()
      processor.process(impressionEvent2)
      const impressionEvent3 = createImpressionEvent()
      processor.process(impressionEvent3)
      const impressionEvent4 = createImpressionEvent()
      processor.process(impressionEvent4)
      // Since we already stopped the processor, the dispatcher should
      // not have been called again.
      expect(dispatcher.dispatchEvent).toBeCalledTimes(0)
    })

    it('should resolve the stop promise after all dispatcher requests are done', async () => {
      const dispatchPromises: Array<ResolvablePromise<EventDispatcherResponse>> = []
      const dispatcher = {
        dispatchEvent: vi.fn((event: EventV1Request) => {
          const response = resolvablePromise<EventDispatcherResponse>();
          dispatchPromises.push(response);
          return response.promise;
        })
      }

      const processor = new LogTierV1EventProcessor({
        dispatcher,
        flushInterval: 100,
        batchSize: 2,
      })
      processor.start()

      for (let i = 0; i < 4; i++) {
        processor.process(createImpressionEvent())
      }
      expect(dispatchPromises.length).toBe(2)

      let stopPromiseResolved = false
      const stopPromise = processor.stop().then(() => {
        stopPromiseResolved = true
      })
      expect(stopPromiseResolved).toBe(false)

      dispatchPromises[0].resolve({ statusCode: 204 })
      vi.advanceTimersByTime(100)
      expect(stopPromiseResolved).toBe(false)
      dispatchPromises[1].resolve({ statusCode: 204 })
      await stopPromise
      expect(stopPromiseResolved).toBe(true)
    })

    it('should use the provided closingDispatcher to dispatch events on stop', async () => {
      const dispatcher = {
        dispatchEvent: vi.fn(),
      }

      const closingDispatcher = {
        dispatchEvent: vi.fn(),
      }

      const processor = new LogTierV1EventProcessor({
        dispatcher,
        closingDispatcher,
        flushInterval: 100000,
        batchSize: 20,
      });

      processor.start()

      const events : any = [];

      for (let i = 0; i < 4; i++) {
        const event = createImpressionEvent();
        processor.process(event);
        events.push(event);
      }

      processor.stop();
      vi.runAllTimers();

      expect(dispatcher.dispatchEvent).not.toHaveBeenCalled();
      expect(closingDispatcher.dispatchEvent).toHaveBeenCalledTimes(1);

      const [data] = closingDispatcher.dispatchEvent.mock.calls[0];
      expect(data.params).toEqual(makeBatchedEventV1(events));
    })
  })

  describe('when batchSize = 1', () => {
    let processor: EventProcessor
    beforeEach(() => {
      processor = new LogTierV1EventProcessor({
        dispatcher: stubDispatcher,
        flushInterval: 100,
        batchSize: 1,
      })
      processor.start()
    })

    afterEach(() => {
      processor.stop()
    })

    it('should immediately flush events as they are processed', () => {
      const impressionEvent = createImpressionEvent()
      processor.process(impressionEvent)

      expect(dispatchStub).toHaveBeenCalledTimes(1)
      expect(dispatchStub).toHaveBeenCalledWith({
        url: 'https://logx.optimizely.com/v1/events',
        httpVerb: 'POST',
        params: buildImpressionEventV1(impressionEvent),
      })
    })
  })

  describe('when batchSize = 3, flushInterval = 100', () => {
    let processor: EventProcessor
    beforeEach(() => {
      processor = new LogTierV1EventProcessor({
        dispatcher: stubDispatcher,
        flushInterval: 100,
        batchSize: 3,
      })
      processor.start()
    })

    afterEach(() => {
      processor.stop()
    })

    it('should wait until 3 events to be in the queue before it flushes', () => {
      const impressionEvent1 = createImpressionEvent()
      const impressionEvent2 = createImpressionEvent()
      const impressionEvent3 = createImpressionEvent()

      processor.process(impressionEvent1)
      processor.process(impressionEvent2)

      expect(dispatchStub).toHaveBeenCalledTimes(0)

      processor.process(impressionEvent3)

      expect(dispatchStub).toHaveBeenCalledTimes(1)
      expect(dispatchStub).toHaveBeenCalledWith({
        url: 'https://logx.optimizely.com/v1/events',
        httpVerb: 'POST',
        params: makeBatchedEventV1([
          impressionEvent1,
          impressionEvent2,
          impressionEvent3,
        ]),
      })
    })

    it('should flush the current batch when it receives an event with a different context revision than the current batch', async () => {
      const impressionEvent1 = createImpressionEvent()
      const conversionEvent = createConversionEvent()
      const impressionEvent2 = createImpressionEvent()

      // createImpressionEvent and createConversionEvent create events with revision '1'
      // We modify this one's revision to '2' in order to test that the queue is flushed
      // when an event with a different revision is processed.
      impressionEvent2.context.revision = '2'

      processor.process(impressionEvent1)
      processor.process(conversionEvent)

      expect(dispatchStub).toHaveBeenCalledTimes(0)

      processor.process(impressionEvent2)

      expect(dispatchStub).toHaveBeenCalledTimes(1)
      expect(dispatchStub).toHaveBeenCalledWith({
        url: 'https://logx.optimizely.com/v1/events',
        httpVerb: 'POST',
        params: makeBatchedEventV1([impressionEvent1, conversionEvent]),
      })

      await processor.stop()

      expect(dispatchStub).toHaveBeenCalledTimes(2)

      expect(dispatchStub).toHaveBeenCalledWith({
        url: 'https://logx.optimizely.com/v1/events',
        httpVerb: 'POST',
        params: makeBatchedEventV1([impressionEvent2]),
      })
    })

    it('should flush the current batch when it receives an event with a different context projectId than the current batch', async () => {
      const impressionEvent1 = createImpressionEvent()
      const conversionEvent = createConversionEvent()
      const impressionEvent2 = createImpressionEvent()

      impressionEvent2.context.projectId = 'projectId2'

      processor.process(impressionEvent1)
      processor.process(conversionEvent)

      expect(dispatchStub).toHaveBeenCalledTimes(0)

      processor.process(impressionEvent2)

      expect(dispatchStub).toHaveBeenCalledTimes(1)
      expect(dispatchStub).toHaveBeenCalledWith({
        url: 'https://logx.optimizely.com/v1/events',
        httpVerb: 'POST',
        params: makeBatchedEventV1([impressionEvent1, conversionEvent]),
      })

      await processor.stop()

      expect(dispatchStub).toHaveBeenCalledTimes(2)

      expect(dispatchStub).toHaveBeenCalledWith({
        url: 'https://logx.optimizely.com/v1/events',
        httpVerb: 'POST',
        params: makeBatchedEventV1([impressionEvent2]),
      })
    })

    it('should flush the queue when the flush interval happens', () => {
      const impressionEvent1 = createImpressionEvent()

      processor.process(impressionEvent1)

      expect(dispatchStub).toHaveBeenCalledTimes(0)

      vi.advanceTimersByTime(100)

      expect(dispatchStub).toHaveBeenCalledTimes(1)
      expect(dispatchStub).toHaveBeenCalledWith({
        url: 'https://logx.optimizely.com/v1/events',
        httpVerb: 'POST',
        params: makeBatchedEventV1([impressionEvent1]),
      })

      processor.process(createImpressionEvent())
      processor.process(createImpressionEvent())
      // flushing should reset queue, at this point only has two events
      expect(dispatchStub).toHaveBeenCalledTimes(1)
    })

  })

  describe('when a notification center is provided', () => {
    it.only('should trigger a notification when the event dispatcher dispatches an event', async () => {
      const dispatcher: EventDispatcher = {
        dispatchEvent: vi.fn().mockResolvedValue({ statusCode: 200 })
      }

      const notificationCenter: NotificationSender = {
        sendNotifications: vi.fn()
      }

      const processor = new LogTierV1EventProcessor({
        dispatcher,
        notificationCenter,
        batchSize: 1,
      })
      await processor.start()

      const impressionEvent1 = createImpressionEvent()
      processor.process(impressionEvent1)

      expect(notificationCenter.sendNotifications).toBeCalledTimes(1)
      const event = (dispatcher.dispatchEvent as Mock).mock.calls[0][0]
      expect(notificationCenter.sendNotifications).toBeCalledWith(NOTIFICATION_TYPES.LOG_EVENT, event)
    })
  })

  describe('invalid flushInterval or batchSize', () => {
    it('should ignore a flushInterval of 0 and use the default', () => {
      const processor = new LogTierV1EventProcessor({
        dispatcher: stubDispatcher,
        flushInterval: 0,
        batchSize: 10,
      })
      processor.start()

      const impressionEvent1 = createImpressionEvent()
      processor.process(impressionEvent1)
      expect(dispatchStub).toHaveBeenCalledTimes(0)
      vi.advanceTimersByTime(30000)
      expect(dispatchStub).toHaveBeenCalledTimes(1)
      expect(dispatchStub).toHaveBeenCalledWith({
        url: 'https://logx.optimizely.com/v1/events',
        httpVerb: 'POST',
        params: makeBatchedEventV1([impressionEvent1]),
      })
    })

    it('should ignore a batchSize of 0 and use the default', () => {
      const processor = new LogTierV1EventProcessor({
        dispatcher: stubDispatcher,
        flushInterval: 30000,
        batchSize: 0,
      })
      processor.start()

      const impressionEvent1 = createImpressionEvent()
      processor.process(impressionEvent1)
      expect(dispatchStub).toHaveBeenCalledTimes(0)
      const impressionEvents = [impressionEvent1]
      for (let i = 0; i < 9; i++) {
        const evt = createImpressionEvent()
        processor.process(evt)
        impressionEvents.push(evt)
      }
      expect(dispatchStub).toHaveBeenCalledTimes(1)
      expect(dispatchStub).toHaveBeenCalledWith({
        url: 'https://logx.optimizely.com/v1/events',
        httpVerb: 'POST',
        params: makeBatchedEventV1(impressionEvents),
      })
    })
  })
})
