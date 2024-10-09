/**
 * Copyright 2024, Optimizely
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
import { expect, describe, it, vi, beforeEach, afterEach, MockInstance } from 'vitest';

import { EventWithId, QueueingEventProcessor } from './queueing_event_processor';
import { getMockSyncCache } from '../tests/mock/mock_cache';
import { createImpressionEvent } from '../tests/mock/create_event';
import { ProcessableEvent } from './eventProcessor';
import { EventDispatcher } from './eventDispatcher';
import { formatEvents } from './v1/buildEventV1';
import { resolvablePromise } from '../utils/promise/resolvablePromise';
import { advanceTimersByTime } from  '../../tests/testUtils';
import { getMockLogger } from '../tests/mock/mock_logger';
import exp from 'constants';

const getMockDispatcher = () => {
  return {
    dispatchEvent: vi.fn(),
  };
};

describe('QueueingEventProcessor', async () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should resolve onRunning() when start() is called', async () => { 
    const eventDispatcher = getMockDispatcher();
    const processor = new QueueingEventProcessor({
      eventDispatcher,
      flushInterval: 2000,
      maxQueueSize: 1000,
    });

    processor.start();
    await expect(processor.onRunning()).resolves.not.toThrow();
  });

  it('should dispatch failed events in correct batch size and order when start is called', async () => {
    const eventDispatcher = getMockDispatcher();
    const mockDispatch: MockInstance<typeof eventDispatcher.dispatchEvent> = eventDispatcher.dispatchEvent;
    mockDispatch.mockResolvedValue({});

    const cache = getMockSyncCache<EventWithId>();
    let events: ProcessableEvent[] = [];

    for(let i = 0; i < 5; i++) {
      const id = `id-${i}`;
      const event = createImpressionEvent(id);
      events.push(event);
      cache.set(id, { id, event });
    }

    const processor = new QueueingEventProcessor({
      eventDispatcher,
      flushInterval: 2000,
      maxQueueSize: 2,
      eventStore: cache,
    });

    processor.start();
    await processor.onRunning();

    expect(mockDispatch).toHaveBeenCalledTimes(3);
    expect(mockDispatch.mock.calls[0][0]).toEqual(formatEvents([events[0], events[1]]));
    expect(mockDispatch.mock.calls[1][0]).toEqual(formatEvents([events[2], events[3]]));
    expect(mockDispatch.mock.calls[2][0]).toEqual(formatEvents([events[4]]));
  });

  it('should dispatch failed events in correct batch size and order when retryFailedEvents is called', async () => {
    const eventDispatcher = getMockDispatcher();
    const mockDispatch: MockInstance<typeof eventDispatcher.dispatchEvent> = eventDispatcher.dispatchEvent;
    mockDispatch.mockResolvedValue({});

    const cache = getMockSyncCache<EventWithId>();

    const processor = new QueueingEventProcessor({
      eventDispatcher,
      flushInterval: 2000,
      maxQueueSize: 2,
      eventStore: cache,
    });

    processor.start();
    await processor.onRunning();

    expect(mockDispatch).toHaveBeenCalledTimes(0);

    let events: ProcessableEvent[] = [];

    for(let i = 0; i < 5; i++) {
      const id = `id-${i}`;
      const event = createImpressionEvent(id);
      events.push(event);
      cache.set(id, { id, event });
    }

    await processor.retryFailedEvents();

    expect(mockDispatch).toHaveBeenCalledTimes(3);
    expect(mockDispatch.mock.calls[0][0]).toEqual(formatEvents([events[0], events[1]]));
    expect(mockDispatch.mock.calls[1][0]).toEqual(formatEvents([events[2], events[3]]));
    expect(mockDispatch.mock.calls[2][0]).toEqual(formatEvents([events[4]]));
  });

  describe('process', () => {
    it('should enqueue event without dispatching immediately', async () => {
      const eventDispatcher = getMockDispatcher();
      const processor = new QueueingEventProcessor({
        eventDispatcher,
        flushInterval: 2000,
        maxQueueSize: 100,
      });

      processor.start();
      await processor.onRunning();
      for(let i = 0; i < 100; i++) {
        const event = createImpressionEvent(`id-${i}`);
        await processor.process(event);
      }

      expect(eventDispatcher.dispatchEvent).toHaveBeenCalledTimes(0);
    });

    it('should dispatch events if queue is full and clear queue', async () => {
      const eventDispatcher = getMockDispatcher();
      const mockDispatch: MockInstance<typeof eventDispatcher.dispatchEvent> = eventDispatcher.dispatchEvent;
      mockDispatch.mockResolvedValue({});

      const processor = new QueueingEventProcessor({
        eventDispatcher,
        flushInterval: 2000,
        maxQueueSize: 100,
      });

      processor.start();
      await processor.onRunning();

      let events: ProcessableEvent[] = [];
      for(let i = 0; i < 100; i++) {
        const event = createImpressionEvent(`id-${i}`);
        events.push(event);
        await processor.process(event);
      }

      expect(eventDispatcher.dispatchEvent).toHaveBeenCalledTimes(0);

      // we are using fake timers, so no dispatch will occur due to timeout
      let event = createImpressionEvent('id-100');
      await processor.process(event);

      expect(eventDispatcher.dispatchEvent).toHaveBeenCalledTimes(1);
      expect(eventDispatcher.dispatchEvent.mock.calls[0][0]).toEqual(formatEvents(events));

      events = [event];
      for(let i = 101; i < 200; i++) {
        const event = createImpressionEvent(`id-${i}`);
        events.push(event);
        await processor.process(event);
      }

      expect(eventDispatcher.dispatchEvent).toHaveBeenCalledTimes(1);

      event = createImpressionEvent('id-200');
      await processor.process(event);

      expect(eventDispatcher.dispatchEvent).toHaveBeenCalledTimes(2);
      expect(eventDispatcher.dispatchEvent.mock.calls[1][0]).toEqual(formatEvents(events));
    });

    it('should store the event in the eventStore with increasing ids', async () => {
      const eventDispatcher = getMockDispatcher();
      const eventStore = getMockSyncCache<EventWithId>();

      const processor = new QueueingEventProcessor({
        eventDispatcher,
        flushInterval: 2000,
        maxQueueSize: 100,
        eventStore,
      });

      processor.start();
      await processor.onRunning();

      const events: ProcessableEvent[] = [];
      for(let i = 0; i < 10; i++) {
        const event = createImpressionEvent(`id-${i}`);
        events.push(event);
        await processor.process(event)
      }

      expect(eventStore.size()).toEqual(10);
      
      const eventsInStore = Array.from(eventStore.getAll().values())
        .sort((a, b) => a < b ? -1 : 1).map(e => e.event);

      expect(events).toEqual(eventsInStore);
    });
  });

  // TODO: test retry of dispatch: specified number of times and infinite retry
  
  it('should remove the events from the eventStore after dispatch is successfull', async () => {
    const eventDispatcher = getMockDispatcher();
    const mockDispatch: MockInstance<typeof eventDispatcher.dispatchEvent> = eventDispatcher.dispatchEvent;
    const dispatchResponse = resolvablePromise();

    mockDispatch.mockResolvedValue(dispatchResponse.promise);

    const eventStore = getMockSyncCache<EventWithId>();

    const processor = new QueueingEventProcessor({
      eventDispatcher,
      flushInterval: 2000,
      maxQueueSize: 10,
      eventStore,
    });

    processor.start();
    await processor.onRunning();

    const events: ProcessableEvent[] = [];
    for(let i = 0; i < 10; i++) {
      const event = createImpressionEvent(`id-${i}`);
      events.push(event);
      await processor.process(event)
    }

    expect(eventStore.size()).toEqual(10);

    const event = createImpressionEvent('id-10');
    await processor.process(event);

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    // the dispatch is not resolved yet, so all the events should still be in the store
    expect(eventStore.size()).toEqual(11);

    dispatchResponse.resolve({ statusCode: 200 });

    // to ensure that microtask queue is cleared several times
    for(let i = 0; i < 100; i++) {
      await Promise.resolve();
    }

    expect(eventStore.size()).toEqual(1);
  });

  it('should log error and keep events in store if dispatch return 5xx response', async () => {
    const eventDispatcher = getMockDispatcher();
    const mockDispatch: MockInstance<typeof eventDispatcher.dispatchEvent> = eventDispatcher.dispatchEvent;
    const dispatchResponse = resolvablePromise();
    const logger = getMockLogger();

    mockDispatch.mockResolvedValue(dispatchResponse.promise);

    const eventStore = getMockSyncCache<EventWithId>();

    const processor = new QueueingEventProcessor({
      eventDispatcher,
      flushInterval: 2000,
      maxQueueSize: 10,
      eventStore,
      logger,
    });

    processor.start();
    await processor.onRunning();

    const events: ProcessableEvent[] = [];
    for(let i = 0; i < 10; i++) {
      const event = createImpressionEvent(`id-${i}`);
      events.push(event);
      await processor.process(event)
    }

    expect(eventStore.size()).toEqual(10);

    const event = createImpressionEvent('id-10');
    await processor.process(event);

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    // the dispatch is not resolved yet, so all the events should still be in the store
    expect(eventStore.size()).toEqual(11);

    dispatchResponse.resolve({ statusCode: 500 });

    // to ensure that microtask queue is cleared several times
    for(let i = 0; i < 100; i++) {
      await Promise.resolve();
    }

    expect(eventStore.size()).toEqual(11);
    expect(logger.error).toHaveBeenCalledTimes(1);
  });
});
