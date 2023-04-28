/**
 * Copyright 2022, Optimizely
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

jest.mock('../lib/utils/fns', () => ({
  __esModule: true,
  uuid: jest.fn(),
  getTimestamp: jest.fn(),
  objectValues: jest.requireActual('../lib/utils/fns').objectValues,
}))

import {
  LocalStoragePendingEventsDispatcher,
  PendingEventsDispatcher,
  DispatcherEntry,
} from '../lib/modules/event_processor/pendingEventsDispatcher'
import { EventDispatcher, EventV1Request } from '../lib/modules/event_processor/eventDispatcher'
import { EventV1 } from '../lib/modules/event_processor/v1/buildEventV1'
import { PendingEventsStore, LocalStorageStore } from '../lib/modules/event_processor/pendingEventsStore'
import { uuid, getTimestamp } from '../lib/utils/fns'

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
    ;((uuid as unknown) as jest.Mock).mockReturnValue('uuid')
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('should properly send the events to the passed in eventDispatcher, when callback statusCode=200', () => {
    const callback = jest.fn()
    const eventV1Request: EventV1Request = {
      url: 'http://cdn.com',
      httpVerb: 'POST',
      params: ({ id: 'event' } as unknown) as EventV1,
    }

    pendingEventsDispatcher.dispatchEvent(eventV1Request, callback)

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
  })

  it('should properly send the events to the passed in eventDispatcher, when callback statusCode=400', () => {
    const callback = jest.fn()
    const eventV1Request: EventV1Request = {
      url: 'http://cdn.com',
      httpVerb: 'POST',
      params: ({ id: 'event' } as unknown) as EventV1,
    }

    pendingEventsDispatcher.dispatchEvent(eventV1Request, callback)

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
    ;((uuid as unknown) as jest.Mock).mockReturnValue('uuid')
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('dispatch', () => {
    describe('when the dispatch is successful', () => {
      it('should save the pendingEvent to the store and remove it once dispatch is completed', () => {
        const callback = jest.fn()
        const eventV1Request: EventV1Request = {
          url: 'http://cdn.com',
          httpVerb: 'POST',
          params: ({ id: 'event' } as unknown) as EventV1,
        }

        pendingEventsDispatcher.dispatchEvent(eventV1Request, callback)

        expect(store.values()).toHaveLength(1)
        expect(store.get('uuid')).toEqual({
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

        expect(store.values()).toHaveLength(0)
      })
    })

    describe('when the dispatch is unsuccessful', () => {
      it('should save the pendingEvent to the store and remove it once dispatch is completed', () => {
        const callback = jest.fn()
        const eventV1Request: EventV1Request = {
          url: 'http://cdn.com',
          httpVerb: 'POST',
          params: ({ id: 'event' } as unknown) as EventV1,
        }

        pendingEventsDispatcher.dispatchEvent(eventV1Request, callback)

        expect(store.values()).toHaveLength(1)
        expect(store.get('uuid')).toEqual({
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

        expect(store.values()).toHaveLength(0)
      })
    })
  })

  describe('sendPendingEvents', () => {
    describe('when no pending events are in the store', () => {
      it('should not invoked dispatch', () => {
        expect(store.values()).toHaveLength(0)

        pendingEventsDispatcher.sendPendingEvents()
        expect(originalEventDispatcher.dispatchEvent).not.toHaveBeenCalled()
      })
    })

    describe('when there are multiple pending events in the store', () => {
      it('should dispatch all of the pending events, and remove them from store', () => {
        expect(store.values()).toHaveLength(0)

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

        store.set('uuid1', {
          uuid: 'uuid1',
          timestamp: 1,
          request: eventV1Request1,
        })
        store.set('uuid2', {
          uuid: 'uuid2',
          timestamp: 2,
          request: eventV1Request2,
        })

        expect(store.values()).toHaveLength(2)

        pendingEventsDispatcher.sendPendingEvents()
        expect(originalEventDispatcher.dispatchEvent).toHaveBeenCalledTimes(2)

        // manually invoke original eventDispatcher callback
        const internalDispatchCalls = ((originalEventDispatcher.dispatchEvent as unknown) as jest.Mock)
          .mock.calls
        internalDispatchCalls[0][1]({ statusCode: 200 })
        internalDispatchCalls[1][1]({ statusCode: 200 })

        expect(store.values()).toHaveLength(0)
      })
    })
  })
})
