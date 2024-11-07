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
import { getMockRepeater } from '../tests/mock/mock_repeater';
import event from 'sinon/lib/sinon/util/event';
import { reset } from 'sinon/lib/sinon/collection';
import logger from '../modules/logging/logger';

const getMockDispatcher = () => {
  return {
    dispatchEvent: vi.fn(),
  };
};

const exhaustMicrotasks = async (loop: number = 100) => {
  for(let i = 0; i < loop; i++) {
    await Promise.resolve();
  }
}

describe('QueueingEventProcessor', async () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('start', () => {
    it('should resolve onRunning() when start() is called', async () => { 
      const eventDispatcher = getMockDispatcher();
      const processor = new QueueingEventProcessor({
        eventDispatcher,
        dispatchRepeater: getMockRepeater(),
        maxQueueSize: 1000,
      });
  
      processor.start();
      await expect(processor.onRunning()).resolves.not.toThrow();
    });

    it('should start dispatchRepeater and failedEventRepeater', () => {
      const eventDispatcher = getMockDispatcher();
      const dispatchRepeater = getMockRepeater();
      const failedEventRepeater = getMockRepeater();

      const processor = new QueueingEventProcessor({
        eventDispatcher,
        dispatchRepeater,
        failedEventRepeater,
        maxQueueSize: 1000,
      });
  
      processor.start();
      expect(dispatchRepeater.start).toHaveBeenCalledOnce();
      expect(failedEventRepeater.start).toHaveBeenCalledOnce();
    });

    it('should dispatch failed events in correct batch sizes and order', async () => {
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
        dispatchRepeater: getMockRepeater(),
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
  });

  it('should dispatch failed events in correct batch size and order when retryFailedEvents is called', async () => {
    const eventDispatcher = getMockDispatcher();
    const mockDispatch: MockInstance<typeof eventDispatcher.dispatchEvent> = eventDispatcher.dispatchEvent;
    mockDispatch.mockResolvedValue({});

    const cache = getMockSyncCache<EventWithId>();

    const processor = new QueueingEventProcessor({
      eventDispatcher,
      dispatchRepeater: getMockRepeater(),
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

    cache.clear();

    // this event is 
    await processor.process(createImpressionEvent('id-5'))
  });

  describe('process', () => {
    it('should enqueue event without dispatching immediately', async () => {
      const eventDispatcher = getMockDispatcher();
      const processor = new QueueingEventProcessor({
        eventDispatcher,
        dispatchRepeater: getMockRepeater(),
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
        dispatchRepeater: getMockRepeater(),
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
        dispatchRepeater: getMockRepeater(),
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

  it('should dispatch events when dispatchRepeater is triggered', async () => {
    const eventDispatcher = getMockDispatcher();
    const mockDispatch: MockInstance<typeof eventDispatcher.dispatchEvent> = eventDispatcher.dispatchEvent;
    mockDispatch.mockResolvedValue({});
    const dispatchRepeater = getMockRepeater();

    const processor = new QueueingEventProcessor({
      eventDispatcher,
      dispatchRepeater,
      maxQueueSize: 100,
    });

    processor.start();
    await processor.onRunning();

    let events: ProcessableEvent[] = [];
    for(let i = 0; i < 10; i++) {
      const event = createImpressionEvent(`id-${i}`);
      events.push(event);
      await processor.process(event);
    }

    expect(eventDispatcher.dispatchEvent).toHaveBeenCalledTimes(0);
    await dispatchRepeater.execute(0);

    expect(eventDispatcher.dispatchEvent).toHaveBeenCalledTimes(1);
    expect(eventDispatcher.dispatchEvent.mock.calls[0][0]).toEqual(formatEvents(events));

    events = [];
    for(let i = 1; i < 15; i++) {
      const event = createImpressionEvent(`id-${i}`);
      events.push(event);
      await processor.process(event);
    }

    await dispatchRepeater.execute(0);
    expect(eventDispatcher.dispatchEvent).toHaveBeenCalledTimes(2);
    expect(eventDispatcher.dispatchEvent.mock.calls[1][0]).toEqual(formatEvents(events));
  });

  it('should not retry failed dispatch if retryConfig is not provided', async () => {
    const eventDispatcher = getMockDispatcher();
    const mockDispatch: MockInstance<typeof eventDispatcher.dispatchEvent> = eventDispatcher.dispatchEvent;
    mockDispatch.mockRejectedValue(new Error());
    const dispatchRepeater = getMockRepeater();

    const processor = new QueueingEventProcessor({
      eventDispatcher,
      dispatchRepeater,
      maxQueueSize: 100,
    });

    processor.start();
    await processor.onRunning();

    let events: ProcessableEvent[] = [];
    for(let i = 0; i < 10; i++) {
      const event = createImpressionEvent(`id-${i}`);
      events.push(event);
      await processor.process(event);
    }

    expect(eventDispatcher.dispatchEvent).toHaveBeenCalledTimes(0);
    await dispatchRepeater.execute(0);

    expect(eventDispatcher.dispatchEvent).toHaveBeenCalledTimes(1);
  });

  it('should retry specified number of times using the provided backoffController', async () => {
    const eventDispatcher = getMockDispatcher();
    const mockDispatch: MockInstance<typeof eventDispatcher.dispatchEvent> = eventDispatcher.dispatchEvent;
    mockDispatch.mockRejectedValue(new Error());
    const dispatchRepeater = getMockRepeater();

    const backoffController = {
      backoff: vi.fn().mockReturnValue(1000),
      reset: vi.fn(),
    };

    const processor = new QueueingEventProcessor({
      eventDispatcher,
      dispatchRepeater,
      retryConfig: {
        retry: true,
        backoffProvider: () => backoffController,
        maxRetries: 3,
      },
      maxQueueSize: 100,
    });

    processor.start();
    await processor.onRunning();

    let events: ProcessableEvent[] = [];
    for(let i = 0; i < 10; i++) {
      const event = createImpressionEvent(`id-${i}`);
      events.push(event);
      await processor.process(event);
    }

    expect(eventDispatcher.dispatchEvent).toHaveBeenCalledTimes(0);
    await dispatchRepeater.execute(0);

    for(let i = 0; i < 10; i++) {
      await exhaustMicrotasks();
      await advanceTimersByTime(1000);
    }

    expect(eventDispatcher.dispatchEvent).toHaveBeenCalledTimes(4);
    expect(backoffController.backoff).toHaveBeenCalledTimes(3);

    const request = formatEvents(events);
    for(let i = 0; i < 4; i++) {
      expect(eventDispatcher.dispatchEvent.mock.calls[i][0]).toEqual(request);
    }
  });

  it('should retry indefinitely using the provided backoffController if maxRetry is undefined', async () => {
    const eventDispatcher = getMockDispatcher();
    const mockDispatch: MockInstance<typeof eventDispatcher.dispatchEvent> = eventDispatcher.dispatchEvent;
    mockDispatch.mockRejectedValue(new Error());
    const dispatchRepeater = getMockRepeater();

    const backoffController = {
      backoff: vi.fn().mockReturnValue(1000),
      reset: vi.fn(),
    };

    const processor = new QueueingEventProcessor({
      eventDispatcher,
      dispatchRepeater,
      retryConfig: {
        retry: true,
        backoffProvider: () => backoffController,
      },
      maxQueueSize: 100,
    });

    processor.start();
    await processor.onRunning();

    let events: ProcessableEvent[] = [];
    for(let i = 0; i < 10; i++) {
      const event = createImpressionEvent(`id-${i}`);
      events.push(event);
      await processor.process(event);
    }

    expect(eventDispatcher.dispatchEvent).toHaveBeenCalledTimes(0);
    await dispatchRepeater.execute(0);

    for(let i = 0; i < 200; i++) {
      await exhaustMicrotasks();
      await advanceTimersByTime(1000);
    }

    expect(eventDispatcher.dispatchEvent).toHaveBeenCalledTimes(201);
    expect(backoffController.backoff).toHaveBeenCalledTimes(200);

    const request = formatEvents(events);
    for(let i = 0; i < 201; i++) {
      expect(eventDispatcher.dispatchEvent.mock.calls[i][0]).toEqual(request);
    }
  });

  it('should remove the events from the eventStore after dispatch is successfull', async () => {
    const eventDispatcher = getMockDispatcher();
    const mockDispatch: MockInstance<typeof eventDispatcher.dispatchEvent> = eventDispatcher.dispatchEvent;
    const dispatchResponse = resolvablePromise();

    mockDispatch.mockResolvedValue(dispatchResponse.promise);

    const eventStore = getMockSyncCache<EventWithId>();
    const dispatchRepeater = getMockRepeater();

    const processor = new QueueingEventProcessor({
      eventDispatcher,
      dispatchRepeater,
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
    await dispatchRepeater.execute(0);

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    // the dispatch is not resolved yet, so all the events should still be in the store
    expect(eventStore.size()).toEqual(10);

    dispatchResponse.resolve({ statusCode: 200 });

    await exhaustMicrotasks();

    expect(eventStore.size()).toEqual(0);
  });

  it('should remove the events from the eventStore after dispatch is successfull', async () => {
    const eventDispatcher = getMockDispatcher();
    const mockDispatch: MockInstance<typeof eventDispatcher.dispatchEvent> = eventDispatcher.dispatchEvent;
    const dispatchResponse = resolvablePromise();

    mockDispatch.mockResolvedValue(dispatchResponse.promise);

    const eventStore = getMockSyncCache<EventWithId>();
    const dispatchRepeater = getMockRepeater();

    const processor = new QueueingEventProcessor({
      eventDispatcher,
      dispatchRepeater,
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
    await dispatchRepeater.execute(0);

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    // the dispatch is not resolved yet, so all the events should still be in the store
    expect(eventStore.size()).toEqual(10);

    dispatchResponse.resolve({ statusCode: 200 });

    await exhaustMicrotasks();

    expect(eventStore.size()).toEqual(0);
  });

  it('should remove the events from the eventStore after dispatch is successfull after retries', async () => {
    const eventDispatcher = getMockDispatcher();
    const mockDispatch: MockInstance<typeof eventDispatcher.dispatchEvent> = eventDispatcher.dispatchEvent;

    mockDispatch.mockResolvedValueOnce({ statusCode: 500 })
      .mockResolvedValueOnce({ statusCode: 500 })
      .mockResolvedValueOnce({ statusCode: 200 });

    const eventStore = getMockSyncCache<EventWithId>();
    const dispatchRepeater = getMockRepeater();

    const backoffController = {
      backoff: vi.fn().mockReturnValue(1000),
      reset: vi.fn(),
    };

    const processor = new QueueingEventProcessor({
      eventDispatcher,
      dispatchRepeater,
      maxQueueSize: 100,
      eventStore,
      retryConfig: {
        retry: true,
        backoffProvider: () => backoffController,
        maxRetries: 3,
      },
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
    await dispatchRepeater.execute(0);

    for(let i = 0; i < 10; i++) {
      await exhaustMicrotasks();
      await advanceTimersByTime(1000);
    }

    expect(mockDispatch).toHaveBeenCalledTimes(3);
    expect(eventStore.size()).toEqual(0);
  });

  it('should log error and keep events in store if dispatch return 5xx response', async () => {
    const eventDispatcher = getMockDispatcher();
    const mockDispatch: MockInstance<typeof eventDispatcher.dispatchEvent> = eventDispatcher.dispatchEvent;
    mockDispatch.mockResolvedValue({ statusCode: 500 });
    const dispatchRepeater = getMockRepeater();

    const backoffController = {
      backoff: vi.fn().mockReturnValue(1000),
      reset: vi.fn(),
    };

    const eventStore = getMockSyncCache<EventWithId>();
    const logger = getMockLogger();

    const processor = new QueueingEventProcessor({
      eventDispatcher,
      dispatchRepeater,
      eventStore,
      retryConfig: {
        retry: true,
        backoffProvider: () => backoffController,
        maxRetries: 3,
      },
      maxQueueSize: 100,
      logger,
    });

    processor.start();
    await processor.onRunning();

    let events: ProcessableEvent[] = [];
    for(let i = 0; i < 10; i++) {
      const event = createImpressionEvent(`id-${i}`);
      events.push(event);
      await processor.process(event);
    }

    expect(eventDispatcher.dispatchEvent).toHaveBeenCalledTimes(0);
    expect(eventStore.size()).toEqual(10);

    await dispatchRepeater.execute(0);

    for(let i = 0; i < 10; i++) {
      await exhaustMicrotasks();
      await advanceTimersByTime(1000);
    }

    expect(eventDispatcher.dispatchEvent).toHaveBeenCalledTimes(4);
    expect(backoffController.backoff).toHaveBeenCalledTimes(3);
    expect(eventStore.size()).toEqual(10);
    expect(logger.error).toHaveBeenCalledOnce();
  });

  it('should log error and keep events in store if dispatch promise fails', async () => {
    const eventDispatcher = getMockDispatcher(); 
    const mockDispatch: MockInstance<typeof eventDispatcher.dispatchEvent> = eventDispatcher.dispatchEvent;
    mockDispatch.mockRejectedValue(new Error());
    const dispatchRepeater = getMockRepeater();

    const backoffController = {
      backoff: vi.fn().mockReturnValue(1000),
      reset: vi.fn(),
    };

    const eventStore = getMockSyncCache<EventWithId>();
    const logger = getMockLogger();

    const processor = new QueueingEventProcessor({
      eventDispatcher,
      dispatchRepeater,
      eventStore,
      retryConfig: {
        retry: true,
        backoffProvider: () => backoffController,
        maxRetries: 3,
      },
      maxQueueSize: 100,
      logger,
    });

    processor.start();
    await processor.onRunning();

    let events: ProcessableEvent[] = [];
    for(let i = 0; i < 10; i++) {
      const event = createImpressionEvent(`id-${i}`);
      events.push(event);
      await processor.process(event);
    }

    expect(eventDispatcher.dispatchEvent).toHaveBeenCalledTimes(0);
    expect(eventStore.size()).toEqual(10);

    await dispatchRepeater.execute(0);

    for(let i = 0; i < 10; i++) {
      await exhaustMicrotasks();
      await advanceTimersByTime(1000);
    }

    expect(eventDispatcher.dispatchEvent).toHaveBeenCalledTimes(4);
    expect(backoffController.backoff).toHaveBeenCalledTimes(3);
    expect(eventStore.size()).toEqual(10);
    expect(logger.error).toHaveBeenCalledOnce();
  });

  it('should emit dispatch event when dispatching events', async () => {
    const eventDispatcher = getMockDispatcher();
    const dispatchRepeater = getMockRepeater();

    const processor = new QueueingEventProcessor({
      eventDispatcher,
      dispatchRepeater,
      maxQueueSize: 100,
    });

    const event = createImpressionEvent('id-1');
    const event2 = createImpressionEvent('id-2');

    const dispatchListener = vi.fn();
    processor.onDispatch(dispatchListener);

    processor.start();
    await processor.onRunning();

    await processor.process(event);
    await processor.process(event2);

    await dispatchRepeater.execute(0);

    expect(dispatchListener).toHaveBeenCalledTimes(1);
    expect(dispatchListener.mock.calls[0][0]).toEqual(formatEvents([event, event2]));
  });

  it('should remove event handler when function returned from onDispatch is called', async () => {
    const eventDispatcher = getMockDispatcher();
    const dispatchRepeater = getMockRepeater();

    const processor = new QueueingEventProcessor({
      eventDispatcher,
      dispatchRepeater,
      maxQueueSize: 100,
    });

    const dispatchListener = vi.fn();
    
    const unsub = processor.onDispatch(dispatchListener);

    processor.start();
    await processor.onRunning();

    const event = createImpressionEvent('id-1');
    const event2 = createImpressionEvent('id-2');

    await processor.process(event);
    await processor.process(event2);

    await dispatchRepeater.execute(0);

    expect(dispatchListener).toHaveBeenCalledTimes(1);
    expect(dispatchListener.mock.calls[0][0]).toEqual(formatEvents([event, event2]));

    unsub();

    const event3 = createImpressionEvent('id-3');
    const event4 = createImpressionEvent('id-4');
    
    await dispatchRepeater.execute(0);
    expect(dispatchListener).toHaveBeenCalledTimes(1);
  });

  describe('retry failed event', () => {

  });

  describe('stop', () => {
    it('should reject onRunning if stop is called before the processor is started', async () => {
      const eventDispatcher = getMockDispatcher();
      const dispatchRepeater = getMockRepeater();
  
      const processor = new QueueingEventProcessor({
        eventDispatcher,
        dispatchRepeater,
        maxQueueSize: 100,
      });

      processor.stop();
      
      await expect(processor.onRunning()).rejects.toThrow();
    });

    it('should ')
  });
});
