/**
 * Copyright 2020, Optimizely
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
/// <reference types="jest" />
import { NotificationCenter, NOTIFICATION_TYPES } from '@optimizely/js-sdk-utils'

import { LogTierV1EventProcessor } from '../src/v1/v1EventProcessor.react_native'
import {
  EventDispatcher,
  EventV1Request,
  EventDispatcherCallback,
} from '../src/eventDispatcher'
import { EventProcessor } from '../src/eventProcessor'
import { buildImpressionEventV1, makeBatchedEventV1 } from '../src/v1/buildEventV1'
import AsyncStorage from '../__mocks__/@react-native-community/async-storage'

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

describe('LogTierV1EventProcessorReactNative', () => {
  let stubDispatcher: EventDispatcher
  let dispatchStub: jest.Mock
  // TODO change this to ProjectConfig when js-sdk-models is available
  let testProjectConfig: any

  beforeEach(() => {
    //jest.useFakeTimers()    
    testProjectConfig = {}
    dispatchStub = jest.fn()

    stubDispatcher = {
      dispatchEvent(event: EventV1Request, callback: EventDispatcherCallback): void {
        dispatchStub(event)
        callback({ statusCode: 200 })
      },
    }
  })

  afterEach(() => {
    jest.resetAllMocks()
    AsyncStorage.clearStore()
  })

  describe('stop()', () => {
    let localCallback: EventDispatcherCallback
    beforeEach(async () => {
      stubDispatcher = {
        dispatchEvent(event: EventV1Request, callback: EventDispatcherCallback): void {          
          dispatchStub(event)
          localCallback = callback
        },
      }
    })

    it('should return a resolved promise when there is nothing in queue', async () => {
      const processor = new LogTierV1EventProcessor({
        dispatcher: stubDispatcher,
        flushInterval: 100,
        batchSize: 100,
      })

      await processor.start()

      await processor.stop()
    })

    it('should return a promise that is resolved when the dispatcher callback returns a 200 response', async (done) => {
      const processor = new LogTierV1EventProcessor({
        dispatcher: stubDispatcher,
        flushInterval: 100,
        batchSize: 100,
      })
      await processor.start()
      const impressionEvent = createImpressionEvent()
      processor.process(impressionEvent)

      await new Promise(resolve => setTimeout(resolve, 150))
      processor.stop().then(() => {
        done()
      })

      localCallback({ statusCode: 200 })
    })

    it('should return a promise that is resolved when the dispatcher callback returns a 400 response', async (done) => {
      // This test is saying that even if the request fails to send but
      // the `dispatcher` yielded control back, then the `.stop()` promise should be resolved
      let localCallback: any
      stubDispatcher = {
        dispatchEvent(event: EventV1Request, callback: EventDispatcherCallback): void {
          dispatchStub(event)
          localCallback = callback
        },
      }

      const processor = new LogTierV1EventProcessor({
        dispatcher: stubDispatcher,
        flushInterval: 100,
        batchSize: 100,
      })
      await processor.start()

      const impressionEvent = createImpressionEvent()
      processor.process(impressionEvent)

      await new Promise(resolve => setTimeout(resolve, 150))
      processor.stop().then(() => {
        done()
      })

      localCallback({ statusCode: 400 })
    })

    it('should return a promise when multiple event batches are sent', async () => {
      await new Promise(resolve => setTimeout(resolve, 2000))
      stubDispatcher = {
        dispatchEvent(event: EventV1Request, callback: EventDispatcherCallback): void {
          dispatchStub(event)
          callback({ statusCode: 200 })
        },
      }

      const processor = new LogTierV1EventProcessor({
        dispatcher: stubDispatcher,
        flushInterval: 100,
        batchSize: 100,
      })

      await processor.start()

      const impressionEvent1 = createImpressionEvent()
      const impressionEvent2 = createImpressionEvent()
      impressionEvent2.context.revision = '2'
      processor.process(impressionEvent1)
      processor.process(impressionEvent2)
      
      await new Promise(resolve => setTimeout(resolve, 150))
      await processor.stop()
      expect(dispatchStub).toBeCalledTimes(2)
    })

    it('should stop accepting events after stop is called', async () => {
      const dispatcher = {
        dispatchEvent: jest.fn((event: EventV1Request, callback: EventDispatcherCallback) => {
          setTimeout(() => callback({ statusCode: 204 }), 0)
        })
      }
      const processor = new LogTierV1EventProcessor({
        dispatcher,
        flushInterval: 100,
        batchSize: 3,
      })
      await processor.start()

      const impressionEvent1 = createImpressionEvent()
      processor.process(impressionEvent1)
      await new Promise(resolve => setTimeout(resolve, 200))

      await processor.stop()
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
      await new Promise(resolve => setTimeout(resolve, 150))
      expect(dispatcher.dispatchEvent).toBeCalledTimes(0)
    })
  })

  describe('when batchSize = 1', () => {
    let processor: EventProcessor
    beforeEach(async () => {
      processor = new LogTierV1EventProcessor({
        dispatcher: stubDispatcher,
        flushInterval: 100,
        batchSize: 1,
      })
      await processor.start()
    })

    afterEach(async () => {
      await processor.stop()
    })

    it('should immediately flush events as they are processed', async () => {
      const impressionEvent = createImpressionEvent()
      processor.process(impressionEvent)

      await new Promise(resolve => setTimeout(resolve, 50))

      expect(dispatchStub).toHaveBeenCalledTimes(1)
      expect(dispatchStub).toHaveBeenCalledWith({
        url: 'https://logx.optimizely.com/v1/events',
        httpVerb: 'POST',
        params: buildImpressionEventV1(impressionEvent),
      })
    })
  })

  describe('when batchSize = 3, flushInterval = 300', () => {
    let processor: EventProcessor
    beforeEach(async () => {
      processor = new LogTierV1EventProcessor({
        dispatcher: stubDispatcher,
        flushInterval: 300,
        batchSize: 3,
      })
      await processor.start()
    })

    afterEach(async () => {
      await processor.stop()
    })

    it('should wait until 3 events to be in the queue before it flushes', async () => {
      const impressionEvent1 = createImpressionEvent()
      const impressionEvent2 = createImpressionEvent()
      const impressionEvent3 = createImpressionEvent()

      processor.process(impressionEvent1)
      processor.process(impressionEvent2)

      await new Promise(resolve => setTimeout(resolve, 150))
      expect(dispatchStub).toHaveBeenCalledTimes(0)

      processor.process(impressionEvent3)

      await new Promise(resolve => setTimeout(resolve, 150))
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

      await new Promise(resolve => setTimeout(resolve, 150))
      expect(dispatchStub).toHaveBeenCalledTimes(0)

      processor.process(impressionEvent2)

      await new Promise(resolve => setTimeout(resolve, 150))
      expect(dispatchStub).toHaveBeenCalledTimes(1)
      expect(dispatchStub).toHaveBeenCalledWith({
        url: 'https://logx.optimizely.com/v1/events',
        httpVerb: 'POST',
        params: makeBatchedEventV1([impressionEvent1, conversionEvent]),
      })      
    })

    it('should flush the current batch when it receives an event with a different context projectId than the current batch', async () => {      
      const impressionEvent1 = createImpressionEvent()
      const conversionEvent = createConversionEvent()
      const impressionEvent2 = createImpressionEvent()

      impressionEvent2.context.projectId = 'projectId2'

      processor.process(impressionEvent1)
      processor.process(conversionEvent)

      await new Promise(resolve => setTimeout(resolve, 150))
      expect(dispatchStub).toHaveBeenCalledTimes(0)

      processor.process(impressionEvent2)

      await new Promise(resolve => setTimeout(resolve, 150))
      expect(dispatchStub).toHaveBeenCalledTimes(1)
      expect(dispatchStub).toHaveBeenCalledWith({
        url: 'https://logx.optimizely.com/v1/events',
        httpVerb: 'POST',
        params: makeBatchedEventV1([impressionEvent1, conversionEvent]),
      })
    })

    it('should flush the queue when the flush interval happens', async () => {
      const impressionEvent1 = createImpressionEvent()

      processor.process(impressionEvent1)

      expect(dispatchStub).toHaveBeenCalledTimes(0)

      await new Promise(resolve => setTimeout(resolve, 350))

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
    it('should trigger a notification when the event dispatcher dispatches an event', async () => {
      const dispatcher: EventDispatcher = {
        dispatchEvent: jest.fn()
      }

      const notificationCenter: NotificationCenter = {
        sendNotifications: jest.fn()
      }
      
      const processor = new LogTierV1EventProcessor({
        dispatcher,
        notificationCenter,
        batchSize: 1,
      })
      await processor.start()

      const impressionEvent1 = createImpressionEvent()
      processor.process(impressionEvent1)

      await new Promise(resolve => setTimeout(resolve, 150))
      expect(notificationCenter.sendNotifications).toBeCalledTimes(1)
      const event = (dispatcher.dispatchEvent as jest.Mock).mock.calls[0][0]
      expect(notificationCenter.sendNotifications).toBeCalledWith(NOTIFICATION_TYPES.LOG_EVENT, event)
    })
  })

  describe('invalid flushInterval or batchSize', () => {
    it.skip('should ignore a flushInterval of 0 and use the default', () => {
      const processor = new LogTierV1EventProcessor({
        dispatcher: stubDispatcher,
        flushInterval: 0,
        batchSize: 10,
      })
      processor.start()

      const impressionEvent1 = createImpressionEvent()
      processor.process(impressionEvent1)      
      expect(dispatchStub).toHaveBeenCalledTimes(0)
      jest.advanceTimersByTime(30000)
      expect(dispatchStub).toHaveBeenCalledTimes(1)
      expect(dispatchStub).toHaveBeenCalledWith({
        url: 'https://logx.optimizely.com/v1/events',
        httpVerb: 'POST',
        params: makeBatchedEventV1([impressionEvent1]),
      })
    })

    it('should ignore a batchSize of 0 and use the default', async () => {
      const processor = new LogTierV1EventProcessor({
        dispatcher: stubDispatcher,
        flushInterval: 30000,
        batchSize: 0,
      })
      await processor.start()

      const impressionEvent1 = createImpressionEvent()
      processor.process(impressionEvent1)

      await new Promise(resolve => setTimeout(resolve, 150))
      expect(dispatchStub).toHaveBeenCalledTimes(0)
      const impressionEvents = [impressionEvent1]
      for (let i = 0; i < 9; i++) {
        const evt = createImpressionEvent()
        processor.process(evt)
        impressionEvents.push(evt)
      }

      await new Promise(resolve => setTimeout(resolve, 150))
      expect(dispatchStub).toHaveBeenCalledTimes(1)
      expect(dispatchStub).toHaveBeenCalledWith({
        url: 'https://logx.optimizely.com/v1/events',
        httpVerb: 'POST',
        params: makeBatchedEventV1(impressionEvents),
      })
    })
  })
})

describe.skip('LogTierV1EventProcessorReactNative2', () => {
  describe('Sequence', () => {
    it('should dispatch pending events in correct sequence', () => {
      // Add Pending events to the store and that try dispatching them and check the sequence
    })
    it('should dispatch new event after pending events', () => {
      // Add pending events to the store and 
    })
  })

  describe('Retry Pending Events', () => {
    describe('App start', () => {
      it('should dispatch all the pending events in correct order', () => {
        // store some events in the store.
        // call start
        // verify if all dispatched
        // verify they dispatched in correct order
      })

      it('should process all the events left in buffer when the app closed last time', () => {
        // add events to buffer store
        // call start
        // wait for the flush interval
        // verify correct event was dispatched based on the buffer
      })

      it('should dispatch pending events first and then process events in buffer store', () => {
        
      })
    })
    
    describe('When a new event is dispatched', () => {
      it('should dispatch all the pending events first', () => {

      })

      it('should dispatch pending events and new event in correct order', () => {
        
      })

      it('should skip dispatching subsequent events if an event fails to dispatch', () => {
        
      })
    })

    describe('When internet connection is restored', () => {
      it('should dispatch all the pending events in correct order when internet connection is restored', () => {

      })

      it('should not dispatch duplicate events if internet is lost and restored twice in a short interval', () => {

      })
    })
  })

  describe('Race Conditions', () => {
    it('should not dispatch pending events twice if retyring is triggered simultenously from internet connection and new event', () => {
      
    })

    it('should dispatch pending events in correct order if retyring is triggered from multiple sources simultenously', () => {

    })
  })
})