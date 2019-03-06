/// <reference types="jest" />

import { LogTierV1EventProcessor } from '../src/v1/v1EventProcessor'
import { HttpEventDispatcher, EventV1Request } from '../src/eventDispatcher'
import { ProjectConfig, TestProjectConfig } from '@optimizely/js-sdk-models'
import { EventProcessor } from '../src/eventProcessor'
import { buildImpressionEventV1, makeBatchedEventV1 } from '../src/v1/buildEventV1'

function sleep(time = 0): Promise<any> {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve()
    }, time)
  })
}

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

describe('LogTierV1EventProcessor', () => {
  let stubDispatcher: HttpEventDispatcher
  let dispatchStub: jest.Mock
  let testProjectConfig: ProjectConfig

  beforeEach(() => {
    jest.useFakeTimers()

    testProjectConfig = new TestProjectConfig()
    dispatchStub = jest.fn()

    stubDispatcher = {
      dispatch(event: EventV1Request, callback: (success: boolean) => void): void {
        dispatchStub(event)
        callback(true)
      },
    }
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('stop()', () => {
    let localCallback: (result: boolean) => void
    beforeEach(() => {
      stubDispatcher = {
        dispatch(event: EventV1Request, callback: (success: boolean) => void): void {
          dispatchStub(event)
          localCallback = callback
        },
      }
    })


    it('should return a resolved promise when there is nothing in queue', (done) => {
      const processor = new LogTierV1EventProcessor({
        dispatcher: stubDispatcher,
        flushInterval: 100,
        maxQueueSize: 100,
      })

      processor.stop().then(() => {
        done()
      })
    })

    it('should return a promise that is resolved when the dispatcher callback fires true', done => {
      const processor = new LogTierV1EventProcessor({
        dispatcher: stubDispatcher,
        flushInterval: 100,
        maxQueueSize: 100,
      })

      const impressionEvent = createImpressionEvent()
      processor.process(impressionEvent, testProjectConfig)

      processor.stop().then(() => {
        done()
      })

      localCallback(true)
    })

    it('should return a promise that is resolved when the dispatcher callback fires false', done => {
      let localCallback: any
      stubDispatcher = {
        dispatch(event: EventV1Request, callback: (success: boolean) => void): void {
          dispatchStub(event)
          localCallback = callback
        },
      }

      const processor = new LogTierV1EventProcessor({
        dispatcher: stubDispatcher,
        flushInterval: 100,
        maxQueueSize: 100,
      })

      const impressionEvent = createImpressionEvent()
      processor.process(impressionEvent, testProjectConfig)

      processor.stop().then(() => {
        done()
      })

      localCallback(false)
    })

    it('should return a promise when multiple event batches are sent', done => {
      stubDispatcher = {
        dispatch(event: EventV1Request, callback: (success: boolean) => void): void {
          dispatchStub(event)
          callback(true)
        },
      }

      const processor = new LogTierV1EventProcessor({
        dispatcher: stubDispatcher,
        flushInterval: 100,
        maxQueueSize: 100,
      })

      const impressionEvent1 = createImpressionEvent()
      const impressionEvent2 = createImpressionEvent()
      impressionEvent2.context.revision = '2'
      processor.process(impressionEvent1, testProjectConfig)
      processor.process(impressionEvent2, testProjectConfig)

      processor.stop().then(() => {
        expect(dispatchStub).toBeCalledTimes(2)
        done()
      })
    })
  })

  describe('when maxQueueSize = 1', () => {
    let processor: EventProcessor
    beforeEach(() => {
      processor = new LogTierV1EventProcessor({
        dispatcher: stubDispatcher,
        flushInterval: 100,
        maxQueueSize: 1,
      })
      processor.start()
    })

    afterEach(() => {
      processor.stop()
    })

    it('should immediately flush events as they are processed', () => {
      const impressionEvent = createImpressionEvent()
      processor.process(impressionEvent, testProjectConfig)

      expect(dispatchStub).toHaveBeenCalledTimes(1)
      expect(dispatchStub).toHaveBeenCalledWith({
        url: 'https://logx.optimizely.com/v1/events',
        method: 'POST',
        headers: {},
        event: buildImpressionEventV1(impressionEvent),
      })
    })
  })

  describe('when maxQueueSize = 3, flushInterval = 100', () => {
    let processor: EventProcessor
    beforeEach(() => {
      processor = new LogTierV1EventProcessor({
        dispatcher: stubDispatcher,
        flushInterval: 100,
        maxQueueSize: 3,
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

      processor.process(impressionEvent1, testProjectConfig)
      processor.process(impressionEvent2, testProjectConfig)

      expect(dispatchStub).toHaveBeenCalledTimes(0)

      processor.process(impressionEvent3, testProjectConfig)

      expect(dispatchStub).toHaveBeenCalledTimes(1)
      expect(dispatchStub).toHaveBeenCalledWith({
        url: 'https://logx.optimizely.com/v1/events',
        method: 'POST',
        headers: {},
        event: makeBatchedEventV1([
          impressionEvent1,
          impressionEvent2,
          impressionEvent3,
        ]),
      })
    })

    it("should flush two batches if the event context isn't the same", () => {
      const impressionEvent1 = createImpressionEvent()
      const impressionEvent2 = createImpressionEvent()
      const conversionEvent = createConversionEvent()

      impressionEvent2.context.revision = '2'

      processor.process(impressionEvent1, testProjectConfig)
      processor.process(impressionEvent2, testProjectConfig)

      expect(dispatchStub).toHaveBeenCalledTimes(0)

      processor.process(conversionEvent, testProjectConfig)

      expect(dispatchStub).toHaveBeenCalledTimes(2)
      expect(dispatchStub).toHaveBeenCalledWith({
        url: 'https://logx.optimizely.com/v1/events',
        method: 'POST',
        headers: {},
        event: makeBatchedEventV1([impressionEvent1, conversionEvent]),
      })

      expect(dispatchStub).toHaveBeenCalledWith({
        url: 'https://logx.optimizely.com/v1/events',
        method: 'POST',
        headers: {},
        event: makeBatchedEventV1([impressionEvent2]),
      })
    })

    it('should flush the queue when the flush interval happens', () => {
      const impressionEvent1 = createImpressionEvent()

      processor.process(impressionEvent1, testProjectConfig)

      expect(dispatchStub).toHaveBeenCalledTimes(0)

      jest.advanceTimersByTime(100)

      expect(dispatchStub).toHaveBeenCalledTimes(1)
      expect(dispatchStub).toHaveBeenCalledWith({
        url: 'https://logx.optimizely.com/v1/events',
        method: 'POST',
        headers: {},
        event: makeBatchedEventV1([impressionEvent1]),
      })

      processor.process(createImpressionEvent(), testProjectConfig)
      processor.process(createImpressionEvent(), testProjectConfig)
      // flushing should reset queue, at this point only has two events
      expect(dispatchStub).toHaveBeenCalledTimes(1)
    })
  })

  describe('plugins', () => {
    let processor: EventProcessor

    describe('transformers', () => {
      beforeEach(() => {
        jest.useRealTimers()
      })

      afterEach(() => {
        processor.stop()
      })

      it('should should invoke the transformer with the event and projectConfig', async () => {
        const transformer = jest.fn()
        processor = new LogTierV1EventProcessor({
          transformers: [
            async (event, projectConfig) => {
              transformer(event, projectConfig)
            },
          ],
          dispatcher: stubDispatcher,
          maxQueueSize: 1,
        })
        processor.start()

        const impressionEvent = createImpressionEvent()
        processor.process(impressionEvent, testProjectConfig)

        // sleep to let async functions run
        await sleep(0)

        expect(transformer).toHaveBeenCalledTimes(1)
        expect(transformer).toHaveBeenCalledWith(impressionEvent, testProjectConfig)
      })

      it('should allow augmentation of the Event', async () => {
        processor = new LogTierV1EventProcessor({
          transformers: [
            async (event, projectConfig) => {
              event.uuid = 'new uuid'
            },
          ],
          dispatcher: stubDispatcher,
          maxQueueSize: 1,
        })
        processor.start()

        const impressionEvent = createImpressionEvent()
        processor.process(
          // spread here for dereference
          {
            ...impressionEvent,
          },
          testProjectConfig,
        )

        // sleep to let async functions run
        await sleep(0)

        const modifiedEvent = {
          ...impressionEvent,
          uuid: 'new uuid',
        }
        expect(dispatchStub).toHaveBeenCalledTimes(1)
        expect(dispatchStub).toHaveBeenCalledWith({
          url: 'https://logx.optimizely.com/v1/events',
          method: 'POST',
          headers: {},
          event: makeBatchedEventV1([modifiedEvent]),
        })
      })

      it('should continue with the event if a transformer throws an error', async () => {
        processor = new LogTierV1EventProcessor({
          transformers: [
            async (event, projectConfig) => {
              throw new Error('transformer error')
            },
          ],
          dispatcher: stubDispatcher,
          maxQueueSize: 1,
        })
        processor.start()

        const impressionEvent = createImpressionEvent()
        processor.process(impressionEvent, testProjectConfig)

        // sleep to let async functions run
        await sleep(0)

        expect(dispatchStub).toHaveBeenCalledTimes(1)
        expect(dispatchStub).toHaveBeenCalledWith({
          url: 'https://logx.optimizely.com/v1/events',
          method: 'POST',
          headers: {},
          event: makeBatchedEventV1([impressionEvent]),
        })
      })
    })

    describe('interceptors', () => {
      beforeEach(() => {
        jest.useRealTimers()
      })

      afterEach(() => {
        processor.stop()
      })

      it('should should invoke the interceptor with the event and projectConfig', async () => {
        const interceptor = jest.fn()
        processor = new LogTierV1EventProcessor({
          interceptors: [
            async (event, projectConfig) => {
              interceptor(event, projectConfig)
              return true
            },
          ],
          dispatcher: stubDispatcher,
          maxQueueSize: 1,
        })
        processor.start()

        const impressionEvent = createImpressionEvent()
        processor.process(impressionEvent, testProjectConfig)

        // sleep to let async functions run
        await sleep(0)

        expect(interceptor).toHaveBeenCalledTimes(1)
        expect(interceptor).toHaveBeenCalledWith(impressionEvent, testProjectConfig)
      })

      it('should continue with the event if a interceptor throws an error', async () => {
        processor = new LogTierV1EventProcessor({
          interceptors: [
            async (event, projectConfig) => {
              throw new Error('interceptor error')
            },
          ],
          dispatcher: stubDispatcher,
          maxQueueSize: 1,
        })
        processor.start()

        const impressionEvent = createImpressionEvent()
        processor.process(impressionEvent, testProjectConfig)

        // sleep to let async functions run
        await sleep(0)

        expect(dispatchStub).toHaveBeenCalledTimes(1)
        expect(dispatchStub).toHaveBeenCalledWith({
          url: 'https://logx.optimizely.com/v1/events',
          method: 'POST',
          headers: {},
          event: makeBatchedEventV1([impressionEvent]),
        })
      })

      it('should drop the event if a interceptor returns false', async () => {
        processor = new LogTierV1EventProcessor({
          interceptors: [
            async (event, projectConfig) => {
              return false
            },
          ],
          dispatcher: stubDispatcher,
          maxQueueSize: 1,
        })
        processor.start()

        const impressionEvent = createImpressionEvent()
        processor.process(impressionEvent, testProjectConfig)

        // sleep to let async functions run
        await sleep(0)

        expect(dispatchStub).toHaveBeenCalledTimes(0)
      })
    })

    describe('callbacks', () => {
      beforeEach(() => {
        jest.useRealTimers()
      })

      afterEach(() => {
        processor.stop()
      })

      it('should invoke the callback with the result of dispatcher and the event', async () => {
        const callback = jest.fn()
        processor = new LogTierV1EventProcessor({
          callbacks: [callback],
          dispatcher: stubDispatcher,
          maxQueueSize: 3,
        })
        processor.start()

        const impressionEvent1 = createImpressionEvent()
        const impressionEvent2 = createImpressionEvent()
        const impressionEvent3 = createImpressionEvent()
        processor.process(impressionEvent1, testProjectConfig)
        processor.process(impressionEvent2, testProjectConfig)
        processor.process(impressionEvent3, testProjectConfig)

        // sleep to let async functions run
        await sleep(0)

        expect(callback).toHaveBeenCalledTimes(3)
        expect(callback).toHaveBeenCalledWith({
          event: impressionEvent1,
          result: true,
        })
        expect(callback).toHaveBeenCalledWith({
          event: impressionEvent2,
          result: true,
        })
        expect(callback).toHaveBeenCalledWith({
          event: impressionEvent3,
          result: true,
        })
      })

      it('should return result == false when the dispatcher fails', async () => {
        const callback = jest.fn()
        const dispatcher = {
          dispatch(event: EventV1Request, callback: (success: boolean) => void): void {
            dispatchStub(event)
            callback(false)
          },
        }

        processor = new LogTierV1EventProcessor({
          callbacks: [callback],
          dispatcher,
          maxQueueSize: 1,
        })
        processor.start()

        const impressionEvent1 = createImpressionEvent()
        processor.process(impressionEvent1, testProjectConfig)

        // sleep to let async functions run
        await sleep(0)

        expect(callback).toHaveBeenCalledTimes(1)
        expect(callback).toHaveBeenCalledWith({
          event: impressionEvent1,
          result: false,
        })
      })
    })
  })
})
