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
import { describe, beforeEach, afterEach, it, expect, vi, MockInstance } from 'vitest';

vi.mock('../lib/utils/fns', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    __esModule: true,
    uuid: vi.fn(),
    getTimestamp: vi.fn(),
    objectValues: actual.objectValues,
  }
});

import {
  LocalStoragePendingEventsDispatcher,
  PendingEventsDispatcher,
  DispatcherEntry,
} from '../lib/event_processor/pendingEventsDispatcher'
import { EventDispatcher, EventDispatcherResponse, EventV1Request } from '../lib/event_processor/eventDispatcher'
import { EventV1 } from '../lib/event_processor/v1/buildEventV1'
import { PendingEventsStore, LocalStorageStore } from '../lib/event_processor/pendingEventsStore'
import { uuid, getTimestamp } from '../lib/utils/fns'
import { resolvablePromise, ResolvablePromise } from '../lib/utils/promise/resolvablePromise';

describe('LocalStoragePendingEventsDispatcher', () => {
  let originalEventDispatcher: EventDispatcher
  let pendingEventsDispatcher: PendingEventsDispatcher
  let eventDispatcherResponses: Array<ResolvablePromise<EventDispatcherResponse>>

  beforeEach(() => {
    eventDispatcherResponses = [];
    originalEventDispatcher = {
      dispatchEvent: vi.fn().mockImplementation(() => {
        const response = resolvablePromise<EventDispatcherResponse>()
        eventDispatcherResponses.push(response)
        return response.promise
      }),
    }

    pendingEventsDispatcher = new LocalStoragePendingEventsDispatcher({
      eventDispatcher: originalEventDispatcher,
    })
    ;((getTimestamp as unknown) as MockInstance).mockReturnValue(1)
    ;((uuid as unknown) as MockInstance).mockReturnValue('uuid')
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('should properly send the events to the passed in eventDispatcher, when callback statusCode=200', async () => {
    const eventV1Request: EventV1Request = {
      url: 'http://cdn.com',
      httpVerb: 'POST',
      params: ({ id: 'event' } as unknown) as EventV1,
    }

    pendingEventsDispatcher.dispatchEvent(eventV1Request)

    eventDispatcherResponses[0].resolve({ statusCode: 200 })

    const internalDispatchCall = ((originalEventDispatcher.dispatchEvent as unknown) as MockInstance)
      .mock.calls[0]
    
      // assert that the original dispatch function was called with the request
    expect((originalEventDispatcher.dispatchEvent as unknown) as MockInstance).toBeCalledTimes(1)
    expect(internalDispatchCall[0]).toEqual(eventV1Request)
  })

  it('should properly send the events to the passed in eventDispatcher, when callback statusCode=400', () => {
    const eventV1Request: EventV1Request = {
      url: 'http://cdn.com',
      httpVerb: 'POST',
      params: ({ id: 'event' } as unknown) as EventV1,
    }

    pendingEventsDispatcher.dispatchEvent(eventV1Request)

    eventDispatcherResponses[0].resolve({ statusCode: 400 })

    const internalDispatchCall = ((originalEventDispatcher.dispatchEvent as unknown) as MockInstance)
      .mock.calls[0]

    eventDispatcherResponses[0].resolve({ statusCode: 400 })

    // assert that the original dispatch function was called with the request
    expect((originalEventDispatcher.dispatchEvent as unknown) as MockInstance).toBeCalledTimes(1)
    expect(internalDispatchCall[0]).toEqual(eventV1Request)
  })
})

describe('PendingEventsDispatcher', () => {
  let originalEventDispatcher: EventDispatcher
  let pendingEventsDispatcher: PendingEventsDispatcher
  let store: PendingEventsStore<DispatcherEntry>
  let eventDispatcherResponses: Array<ResolvablePromise<EventDispatcherResponse>>

  beforeEach(() => {
    eventDispatcherResponses = [];

    originalEventDispatcher = {
      dispatchEvent: vi.fn().mockImplementation(() => {
        const response = resolvablePromise<EventDispatcherResponse>()
        eventDispatcherResponses.push(response)
        return response.promise
      }),
    }

    store = new LocalStorageStore({
      key: 'test',
      maxValues: 3,
    })
    pendingEventsDispatcher = new PendingEventsDispatcher({
      store,
      eventDispatcher: originalEventDispatcher,
    });
    ((getTimestamp as unknown) as MockInstance).mockReturnValue(1);
    ((uuid as unknown) as MockInstance).mockReturnValue('uuid');
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('dispatch', () => {
    describe('when the dispatch is successful', () => {
      it('should save the pendingEvent to the store and remove it once dispatch is completed', async () => {
        const eventV1Request: EventV1Request = {
          url: 'http://cdn.com',
          httpVerb: 'POST',
          params: ({ id: 'event' } as unknown) as EventV1,
        }

        pendingEventsDispatcher.dispatchEvent(eventV1Request)

        expect(store.values()).toHaveLength(1)
        expect(store.get('uuid')).toEqual({
          uuid: 'uuid',
          timestamp: 1,
          request: eventV1Request,
        })

        eventDispatcherResponses[0].resolve({ statusCode: 200 })
        await eventDispatcherResponses[0].promise

        const internalDispatchCall = ((originalEventDispatcher.dispatchEvent as unknown) as MockInstance)
          .mock.calls[0]

        // assert that the original dispatch function was called with the request
        expect(
          (originalEventDispatcher.dispatchEvent as unknown) as MockInstance,
        ).toBeCalledTimes(1)
        expect(internalDispatchCall[0]).toEqual(eventV1Request)

        expect(store.values()).toHaveLength(0)
      })
    })

    describe('when the dispatch is unsuccessful', () => {
      it('should save the pendingEvent to the store and remove it once dispatch is completed', async () => {
        const eventV1Request: EventV1Request = {
          url: 'http://cdn.com',
          httpVerb: 'POST',
          params: ({ id: 'event' } as unknown) as EventV1,
        }

        pendingEventsDispatcher.dispatchEvent(eventV1Request)

        expect(store.values()).toHaveLength(1)
        expect(store.get('uuid')).toEqual({
          uuid: 'uuid',
          timestamp: 1,
          request: eventV1Request,
        })

        eventDispatcherResponses[0].resolve({ statusCode: 400 })
        await eventDispatcherResponses[0].promise

        // manually invoke original eventDispatcher callback
        const internalDispatchCall = ((originalEventDispatcher.dispatchEvent as unknown) as MockInstance)
          .mock.calls[0]
          
        // assert that the original dispatch function was called with the request
        expect(
          (originalEventDispatcher.dispatchEvent as unknown) as MockInstance,
        ).toBeCalledTimes(1)
        expect(internalDispatchCall[0]).toEqual(eventV1Request)

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
      it('should dispatch all of the pending events, and remove them from store', async () => {
        expect(store.values()).toHaveLength(0)

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

        eventDispatcherResponses[0].resolve({ statusCode: 200 })
        eventDispatcherResponses[1].resolve({ statusCode: 200 })
        await Promise.all([eventDispatcherResponses[0].promise, eventDispatcherResponses[1].promise])
        expect(store.values()).toHaveLength(0)
      })
    })
  })
})
