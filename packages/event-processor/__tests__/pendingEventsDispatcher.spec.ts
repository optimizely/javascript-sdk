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
/// <reference types="jest" />

jest.mock('@optimizely/js-sdk-utils', () => ({
  __esModule: true,
  generateUUID: jest.fn(),
  getTimestamp: jest.fn(),
  objectValues: jest.requireActual('@optimizely/js-sdk-utils').objectValues,
}))

import {
  LocalStoragePendingEventsDispatcher,
  PendingEventsDispatcher,
  DispatcherEntry,
} from '../src/pendingEventsDispatcher'
import { EventDispatcher, EventV1Request } from '../src/eventDispatcher'
import { EventV1 } from '../src/v1/buildEventV1'
import { PendingEventsStore, LocalStorageStore } from '../src/pendingEventsStore'
import { generateUUID, getTimestamp } from '@optimizely/js-sdk-utils'

describe('LocalStoragePendingEventsDispatcher', () => {
  let originalEventDispatcher: EventDispatcher
  let pendingEventsDispatcher: PendingEventsDispatcher

  beforeEach(() => {
    originalEventDispatcher = {
      dispatchEvent: jest.fn(),
    }
    pendingEventsDispatcher = new LocalStoragePendingEventsDispatcher({
      eventDispatcher: originalEventDispatcher,
    })
    ;((getTimestamp as unknown) as jest.Mock).mockReturnValue(1)
    ;((generateUUID as unknown) as jest.Mock).mockReturnValue('uuid')
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('should properly send the events to the passed in eventDispatcher, when callback statusCode=200', (done) => {
    const callback = jest.fn()
    const eventV1Request: EventV1Request = {
      url: 'http://cdn.com',
      httpVerb: 'POST',
      params: ({ id: 'event' } as unknown) as EventV1,
    }

    pendingEventsDispatcher.dispatchEvent(eventV1Request, callback)

    setTimeout(() => {
      expect(callback).not.toHaveBeenCalled()
      // manually invoke original eventDispatcher callback
      const internalDispatchCall = ((originalEventDispatcher.dispatchEvent as unknown) as jest.Mock)
        .mock.calls[0]
      internalDispatchCall[1]({ statusCode: 200 })

      // assert that the original dispatch function was called with the request
      expect((originalEventDispatcher.dispatchEvent as unknown) as jest.Mock).toBeCalledTimes(1)
      expect(internalDispatchCall[0]).toEqual(eventV1Request)

      // assert that the passed in callback to pendingEventsDispatcher was called
      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith({ statusCode: 200 })
      done()
    })
  })

  it('should properly send the events to the passed in eventDispatcher, when callback statusCode=400', (done) => {
    const callback = jest.fn()
    const eventV1Request: EventV1Request = {
      url: 'http://cdn.com',
      httpVerb: 'POST',
      params: ({ id: 'event' } as unknown) as EventV1,
    }

    pendingEventsDispatcher.dispatchEvent(eventV1Request, callback)

    setTimeout(() => {
      expect(callback).not.toHaveBeenCalled()
      // manually invoke original eventDispatcher callback
      const internalDispatchCall = ((originalEventDispatcher.dispatchEvent as unknown) as jest.Mock)
        .mock.calls[0]
      internalDispatchCall[1]({ statusCode: 400 })

      // assert that the original dispatch function was called with the request
      expect((originalEventDispatcher.dispatchEvent as unknown) as jest.Mock).toBeCalledTimes(1)
      expect(internalDispatchCall[0]).toEqual(eventV1Request)

      // assert that the passed in callback to pendingEventsDispatcher was called
      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith({ statusCode: 400})
      done()
    })
  })
})

describe('PendingEventsDispatcher', () => {
  let originalEventDispatcher: EventDispatcher
  let pendingEventsDispatcher: PendingEventsDispatcher
  let store: PendingEventsStore<DispatcherEntry>

  beforeEach(() => {
    originalEventDispatcher = {
      dispatchEvent: jest.fn(),
    }
    store = new LocalStorageStore({
      key: 'test',
      maxValues: 3,
    })
    pendingEventsDispatcher = new PendingEventsDispatcher({
      store,
      eventDispatcher: originalEventDispatcher,
    })
    ;((getTimestamp as unknown) as jest.Mock).mockReturnValue(1)
    ;((generateUUID as unknown) as jest.Mock).mockReturnValue('uuid')
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('dispatch', () => {
    describe('when the dispatch is successful', () => {
      it('should save the pendingEvent to the store and remove it once dispatch is completed', async () => {
        const callback = jest.fn()
        const eventV1Request: EventV1Request = {
          url: 'http://cdn.com',
          httpVerb: 'POST',
          params: ({ id: 'event' } as unknown) as EventV1,
        }

        pendingEventsDispatcher.dispatchEvent(eventV1Request, callback)

        expect(await store.values()).toHaveLength(1)
        expect(await store.get('uuid')).toEqual({
          uuid: 'uuid',
          timestamp: 1,
          request: eventV1Request,
        })
        expect(callback).not.toHaveBeenCalled()

        // manually invoke original eventDispatcher callback
        const internalDispatchCall = ((originalEventDispatcher.dispatchEvent as unknown) as jest.Mock)
          .mock.calls[0]
        const internalCallback = internalDispatchCall[1]({ statusCode: 200 })

        // assert that the original dispatch function was called with the request
        expect(
          (originalEventDispatcher.dispatchEvent as unknown) as jest.Mock,
        ).toBeCalledTimes(1)
        expect(internalDispatchCall[0]).toEqual(eventV1Request)

        // assert that the passed in callback to pendingEventsDispatcher was called
        expect(callback).toHaveBeenCalledTimes(1)
        expect(callback).toHaveBeenCalledWith({ statusCode: 200 })

        expect(await store.values()).toHaveLength(0)
      })
    })

    describe('when the dispatch is unsuccessful', () => {
      it('should save the pendingEvent to the store and remove it once dispatch is completed', async () => {
        const callback = jest.fn()
        const eventV1Request: EventV1Request = {
          url: 'http://cdn.com',
          httpVerb: 'POST',
          params: ({ id: 'event' } as unknown) as EventV1,
        }

        pendingEventsDispatcher.dispatchEvent(eventV1Request, callback)

        expect(await store.values()).toHaveLength(1)
        expect(await store.get('uuid')).toEqual({
          uuid: 'uuid',
          timestamp: 1,
          request: eventV1Request,
        })
        expect(callback).not.toHaveBeenCalled()

        // manually invoke original eventDispatcher callback
        const internalDispatchCall = ((originalEventDispatcher.dispatchEvent as unknown) as jest.Mock)
          .mock.calls[0]
        internalDispatchCall[1]({ statusCode: 400 })

        // assert that the original dispatch function was called with the request
        expect(
          (originalEventDispatcher.dispatchEvent as unknown) as jest.Mock,
        ).toBeCalledTimes(1)
        expect(internalDispatchCall[0]).toEqual(eventV1Request)

        // assert that the passed in callback to pendingEventsDispatcher was called
        expect(callback).toHaveBeenCalledTimes(1)
        expect(callback).toHaveBeenCalledWith({ statusCode: 400 })

        expect(await store.values()).toHaveLength(0)
      })
    })
  })

  describe('sendPendingEvents', () => {
    describe('when no pending events are in the store', () => {
      it('should not invoked dispatch', async () => {
        expect(await store.values()).toHaveLength(0)

        pendingEventsDispatcher.sendPendingEvents()
        expect(originalEventDispatcher.dispatchEvent).not.toHaveBeenCalled()
      })
    })

    describe('when there are multiple pending events in the store', () => {
      it('should dispatch all of the pending events, and remove them from store', async (done) => {
        expect(await store.values()).toHaveLength(0)

        const callback = jest.fn()
        const eventV1Request1: EventV1Request = {
          url: 'http://cdn.com',
          httpVerb: 'POST',
          params: ({ id: 'event1' } as unknown) as EventV1,
        }

        const eventV1Request2: EventV1Request = {
          url: 'http://cdn.com',
          httpVerb: 'POST',
          params: ({ id: 'event2' } as unknown) as EventV1,
        }

        await store.set('uuid1', {
          uuid: 'uuid1',
          timestamp: 1,
          request: eventV1Request1,
        })
        await store.set('uuid2', {
          uuid: 'uuid2',
          timestamp: 2,
          request: eventV1Request2,
        })

        expect(await store.values()).toHaveLength(2)

        pendingEventsDispatcher.sendPendingEvents()

        setTimeout(async () => {
          expect(originalEventDispatcher.dispatchEvent).toHaveBeenCalledTimes(2)

          // manually invoke original eventDispatcher callback
          const internalDispatchCalls = ((originalEventDispatcher.dispatchEvent as unknown) as jest.Mock)
            .mock.calls
          internalDispatchCalls[0][1]({ statusCode: 200 })
          internalDispatchCalls[1][1]({ statusCode: 200 })

          expect(await store.values()).toHaveLength(0)
          done()
        })
      })
    })
  })
})
