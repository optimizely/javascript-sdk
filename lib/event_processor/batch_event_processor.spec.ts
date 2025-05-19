/**
 * Copyright 2024-2025, Optimizely
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

import { EventWithId, BatchEventProcessor, LOGGER_NAME } from './batch_event_processor';
import { getMockAsyncCache, getMockSyncCache } from '../tests/mock/mock_cache';
import { createImpressionEvent } from '../tests/mock/create_event';
import { ProcessableEvent } from './event_processor';
import { buildLogEvent } from './event_builder/log_event';
import { ResolvablePromise, resolvablePromise } from '../utils/promise/resolvablePromise';
import { advanceTimersByTime } from  '../tests/testUtils';
import { getMockLogger } from '../tests/mock/mock_logger';
import { getMockRepeater } from '../tests/mock/mock_repeater';
import * as retry from '../utils/executor/backoff_retry_runner';
import { ServiceState, StartupLog } from '../service';
import { LogLevel } from '../logging/logger';
import { IdGenerator } from '../utils/id_generator';

const getMockDispatcher = () => {
  return {
    dispatchEvent: vi.fn(),
  };
};

const exhaustMicrotasks = async (loop = 100) => {
  for(let i = 0; i < loop; i++) {
    await Promise.resolve();
  }
}

describe('BatchEventProcessor', async () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should set name on the logger passed into the constructor', () => {
    const logger = getMockLogger();
        
    const processor = new BatchEventProcessor({
      eventDispatcher: getMockDispatcher(),
      dispatchRepeater: getMockRepeater(),
      batchSize: 1000,
      logger,
    });

    expect(logger.setName).toHaveBeenCalledWith(LOGGER_NAME);
  });

  it('should set name on the logger set by setLogger', () => {
    const logger = getMockLogger();
        
    const processor = new BatchEventProcessor({
      eventDispatcher: getMockDispatcher(),
      dispatchRepeater: getMockRepeater(),
      batchSize: 1000,
    });

    processor.setLogger(logger);
    expect(logger.setName).toHaveBeenCalledWith(LOGGER_NAME);
  });

  describe('start', () => {
    it('should log startupLogs on start', () => {
      const startupLogs: StartupLog[] = [
        {
          level: LogLevel.Warn,
          message: 'warn message',
          params: [1, 2]
        },
        {
          level: LogLevel.Error,
          message: 'error message',
          params: [3, 4]
        },
      ];
      
      const logger = getMockLogger();

      const processor = new BatchEventProcessor({
        eventDispatcher: getMockDispatcher(),
        dispatchRepeater: getMockRepeater(),
        batchSize: 1000,
        startupLogs,
      });

      processor.setLogger(logger);
      processor.start();

      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith('warn message', 1, 2);
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith('error message', 3, 4);
    });
    
    it('should resolve onRunning() when start() is called', async () => { 
      const eventDispatcher = getMockDispatcher();
      const processor = new BatchEventProcessor({
        eventDispatcher,
        dispatchRepeater: getMockRepeater(),
        batchSize: 1000,
      });
  
      processor.start();
      await expect(processor.onRunning()).resolves.not.toThrow();
    });

    it('should start failedEventRepeater', () => {
      const eventDispatcher = getMockDispatcher();
      const dispatchRepeater = getMockRepeater();
      const failedEventRepeater = getMockRepeater();

      const processor = new BatchEventProcessor({
        eventDispatcher,
        dispatchRepeater,
        failedEventRepeater,
        batchSize: 1000,
      });
  
      processor.start();
      expect(failedEventRepeater.start).toHaveBeenCalledOnce();
    });

    it('should dispatch failed events in correct batch sizes and order', async () => {
      const eventDispatcher = getMockDispatcher();
      const mockDispatch: MockInstance<typeof eventDispatcher.dispatchEvent> = eventDispatcher.dispatchEvent;
      mockDispatch.mockResolvedValue({});
  
      const cache = getMockSyncCache<EventWithId>();
      const events: ProcessableEvent[] = [];
  
      for(let i = 0; i < 5; i++) {
        const id = `id-${i}`;
        const event = createImpressionEvent(id);
        events.push(event);
        cache.set(id, { id, event });
      }
  
      const processor = new BatchEventProcessor({
        eventDispatcher,
        dispatchRepeater: getMockRepeater(),
        batchSize: 2,
        eventStore: cache,
      });
  
      processor.start();
      await processor.onRunning();
  
      await exhaustMicrotasks();

      expect(mockDispatch).toHaveBeenCalledTimes(3);
      expect(mockDispatch.mock.calls[0][0]).toEqual(buildLogEvent([events[0], events[1]]));
      expect(mockDispatch.mock.calls[1][0]).toEqual(buildLogEvent([events[2], events[3]]));
      expect(mockDispatch.mock.calls[2][0]).toEqual(buildLogEvent([events[4]]));
    });
  });

  describe('process', () => {
    it('should return a promise that rejects if processor is not running', async () => {
      const eventDispatcher = getMockDispatcher();
      const processor = new BatchEventProcessor({
        eventDispatcher,
        dispatchRepeater: getMockRepeater(),
        batchSize: 100,
      });

      await expect(processor.process(createImpressionEvent('id-1'))).rejects.toThrow();
    });

    it('should enqueue event without dispatching immediately', async () => {
      const eventDispatcher = getMockDispatcher();
      const processor = new BatchEventProcessor({
        eventDispatcher,
        dispatchRepeater: getMockRepeater(),
        batchSize: 100,
      });

      processor.start();
      await processor.onRunning();
      for(let i = 0; i < 99; i++) {
        const event = createImpressionEvent(`id-${i}`);
        await processor.process(event);
      }

      expect(eventDispatcher.dispatchEvent).toHaveBeenCalledTimes(0);
    });

    it('should start the dispatchRepeater if it is not running', async () => {
      const eventDispatcher = getMockDispatcher();
      const dispatchRepeater = getMockRepeater();

      const processor = new BatchEventProcessor({
        eventDispatcher,
        dispatchRepeater,
        batchSize: 100,
      });

      processor.start();
      await processor.onRunning();

      const event = createImpressionEvent('id-1');
      await processor.process(event);

      expect(dispatchRepeater.start).toHaveBeenCalledOnce();
    });

    it('should dispatch events if queue is full and clear queue', async () => {
      const eventDispatcher = getMockDispatcher();
      const mockDispatch: MockInstance<typeof eventDispatcher.dispatchEvent> = eventDispatcher.dispatchEvent;
      mockDispatch.mockResolvedValue({});

      const processor = new BatchEventProcessor({
        eventDispatcher,
        dispatchRepeater: getMockRepeater(),
        batchSize: 100,
      });

      processor.start();
      await processor.onRunning();

      let events: ProcessableEvent[] = [];
      for(let i = 0; i < 99; i++){
        const event = createImpressionEvent(`id-${i}`);
        events.push(event);
        await processor.process(event);
      }

      expect(eventDispatcher.dispatchEvent).toHaveBeenCalledTimes(0);

      let event = createImpressionEvent('id-99');
      events.push(event);
      await processor.process(event);
 
      expect(eventDispatcher.dispatchEvent).toHaveBeenCalledTimes(1);
      expect(eventDispatcher.dispatchEvent.mock.calls[0][0]).toEqual(buildLogEvent(events));

      events = [];

      for(let i = 100; i < 199; i++) {
        const event = createImpressionEvent(`id-${i}`);
        events.push(event);
        await processor.process(event);
      }

      expect(eventDispatcher.dispatchEvent).toHaveBeenCalledTimes(1);

      event = createImpressionEvent('id-199');
      events.push(event);
      await processor.process(event);

      expect(eventDispatcher.dispatchEvent).toHaveBeenCalledTimes(2);
      expect(eventDispatcher.dispatchEvent.mock.calls[1][0]).toEqual(buildLogEvent(events));
    });

    it('should flush queue is context of the new event is different and enqueue the new event', async () => {
      const eventDispatcher = getMockDispatcher();
      const mockDispatch: MockInstance<typeof eventDispatcher.dispatchEvent> = eventDispatcher.dispatchEvent;
      mockDispatch.mockResolvedValue({});

      const dispatchRepeater = getMockRepeater();

      const processor = new BatchEventProcessor({
        eventDispatcher,
        dispatchRepeater,
        batchSize: 100,
      });

      processor.start();
      await processor.onRunning();

      const events: ProcessableEvent[] = [];
      for(let i = 0; i < 80; i++) {
        const event = createImpressionEvent(`id-${i}`);
        events.push(event);
        await processor.process(event);
      }

      expect(eventDispatcher.dispatchEvent).toHaveBeenCalledTimes(0);

      const newEvent = createImpressionEvent('id-a');
      newEvent.context.accountId = 'account-' + Math.random();
      await processor.process(newEvent);

      expect(eventDispatcher.dispatchEvent).toHaveBeenCalledTimes(1);
      expect(eventDispatcher.dispatchEvent.mock.calls[0][0]).toEqual(buildLogEvent(events));

      await dispatchRepeater.execute(0);
      expect(eventDispatcher.dispatchEvent).toHaveBeenCalledTimes(2);
      expect(eventDispatcher.dispatchEvent.mock.calls[1][0]).toEqual(buildLogEvent([newEvent]));
    });

    it('should flush queue immediately regardless of batchSize, if event processor is disposable', async () => {
      const eventDispatcher = getMockDispatcher();
      const mockDispatch: MockInstance<typeof eventDispatcher.dispatchEvent> = eventDispatcher.dispatchEvent;
      mockDispatch.mockResolvedValue({});

      const dispatchRepeater = getMockRepeater();
      const failedEventRepeater = getMockRepeater();

      const processor = new BatchEventProcessor({
        eventDispatcher,
        dispatchRepeater,
        failedEventRepeater,
        batchSize: 100,
      });

      processor.makeDisposable();
      processor.start();
      await processor.onRunning();

      const events: ProcessableEvent[] = [];
      const event = createImpressionEvent('id-1');
      events.push(event);
      await processor.process(event);

      expect(eventDispatcher.dispatchEvent).toHaveBeenCalledTimes(1);
      expect(eventDispatcher.dispatchEvent.mock.calls[0][0]).toEqual(buildLogEvent(events));
      expect(dispatchRepeater.reset).toHaveBeenCalledTimes(1);
      expect(dispatchRepeater.start).not.toHaveBeenCalled();
      expect(failedEventRepeater.start).not.toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      expect(processor.retryConfig?.maxRetries).toEqual(5);
    });

    it('should store the event in the eventStore with increasing ids', async () => {
      const eventDispatcher = getMockDispatcher();
      const eventStore = getMockSyncCache<EventWithId>();

      const processor = new BatchEventProcessor({
        eventDispatcher,
        dispatchRepeater: getMockRepeater(),
        batchSize: 100,
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

    it('should not store the event in the eventStore but still dispatch if the \
        number of pending events is greater than the limit', async () => {
      const eventDispatcher = getMockDispatcher();
      const mockDispatch: MockInstance<typeof eventDispatcher.dispatchEvent> = eventDispatcher.dispatchEvent;
      mockDispatch.mockResolvedValue(resolvablePromise().promise);

      const eventStore = getMockSyncCache<EventWithId>();

      const idGenerator = new IdGenerator();

      for (let i = 0; i < 505; i++) {
        const event = createImpressionEvent(`id-${i}`);
        const cacheId = idGenerator.getId();
        await eventStore.set(cacheId, { id: cacheId, event });
      }

      expect(eventStore.size()).toEqual(505);

      const processor = new BatchEventProcessor({
        eventDispatcher,
        dispatchRepeater: getMockRepeater(),
        batchSize: 1,
        eventStore,
      });

      processor.start();
      await processor.onRunning();

      const events: ProcessableEvent[] = [];
      for(let i = 0; i < 2; i++) {
        const event = createImpressionEvent(`id-${i}`);
        events.push(event);
        await processor.process(event)
      }

      expect(eventStore.size()).toEqual(505);
      expect(eventDispatcher.dispatchEvent).toHaveBeenCalledTimes(507);
      expect(eventDispatcher.dispatchEvent.mock.calls[505][0]).toEqual(buildLogEvent([events[0]]));
      expect(eventDispatcher.dispatchEvent.mock.calls[506][0]).toEqual(buildLogEvent([events[1]]));
    });

    it('should store events in the eventStore when the number of events in the store\
        becomes lower than the limit', async () => {
      const eventDispatcher = getMockDispatcher();

      const dispatchResponses: ResolvablePromise<any>[] = [];

      const mockDispatch: MockInstance<typeof eventDispatcher.dispatchEvent> = eventDispatcher.dispatchEvent;
      mockDispatch.mockImplementation((arg) => {
        const dispatchResponse = resolvablePromise();
        dispatchResponses.push(dispatchResponse);
        return dispatchResponse.promise;
      });

      const eventStore = getMockSyncCache<EventWithId>();

      const idGenerator = new IdGenerator();

      for (let i = 0; i < 502; i++) {
        const event = createImpressionEvent(`id-${i}`);
        const cacheId = String(i);
        await eventStore.set(cacheId, { id: cacheId, event });
      }

      expect(eventStore.size()).toEqual(502);

      const processor = new BatchEventProcessor({
        eventDispatcher,
        dispatchRepeater: getMockRepeater(),
        batchSize: 1,
        eventStore,
      });

      processor.start();
      await processor.onRunning();

      let events: ProcessableEvent[] = [];
      for(let i = 0; i < 2; i++) {
        const event = createImpressionEvent(`id-${i + 502}`);
        events.push(event);
        await processor.process(event)
      }

      expect(eventStore.size()).toEqual(502);
      expect(eventDispatcher.dispatchEvent).toHaveBeenCalledTimes(504);

      expect(eventDispatcher.dispatchEvent.mock.calls[502][0]).toEqual(buildLogEvent([events[0]]));
      expect(eventDispatcher.dispatchEvent.mock.calls[503][0]).toEqual(buildLogEvent([events[1]]));

      // resolve the dispatch for events not saved in the store
      dispatchResponses[502].resolve({ statusCode: 200 });
      dispatchResponses[503].resolve({ statusCode: 200 });

      await exhaustMicrotasks();
      expect(eventStore.size()).toEqual(502);

      // resolve the dispatch for 3 events in store, making the store size 499 which is lower than the limit
      dispatchResponses[0].resolve({ statusCode: 200 });
      dispatchResponses[1].resolve({ statusCode: 200 });
      dispatchResponses[2].resolve({ statusCode: 200 });

      await exhaustMicrotasks();
      expect(eventStore.size()).toEqual(499);

      // process 2 more events
      events = [];
      for(let i = 0; i < 2; i++) {
        const event = createImpressionEvent(`id-${i + 504}`);
        events.push(event);
        await processor.process(event)
      }

      expect(eventStore.size()).toEqual(500);
      expect(eventDispatcher.dispatchEvent).toHaveBeenCalledTimes(506);
      expect(eventDispatcher.dispatchEvent.mock.calls[504][0]).toEqual(buildLogEvent([events[0]]));
      expect(eventDispatcher.dispatchEvent.mock.calls[505][0]).toEqual(buildLogEvent([events[1]]));      
    });

    it('should still dispatch events even if the store save fails', async () => {
      const eventDispatcher = getMockDispatcher();
      const mockDispatch: MockInstance<typeof eventDispatcher.dispatchEvent> = eventDispatcher.dispatchEvent;
      mockDispatch.mockResolvedValue({});

      const eventStore = getMockAsyncCache<EventWithId>();
      // Simulate failure in saving to store
      eventStore.set = vi.fn().mockRejectedValue(new Error('Failed to save'));

      const dispatchRepeater = getMockRepeater();

      const processor = new BatchEventProcessor({
        eventDispatcher,
        dispatchRepeater,
        batchSize: 100,
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

      expect(eventDispatcher.dispatchEvent).toHaveBeenCalledTimes(0);

      await dispatchRepeater.execute(0);

      expect(eventDispatcher.dispatchEvent).toHaveBeenCalledTimes(1);
      expect(eventDispatcher.dispatchEvent.mock.calls[0][0]).toEqual(buildLogEvent(events));
    });
  });

  it('should dispatch events when dispatchRepeater is triggered', async () => {
    const eventDispatcher = getMockDispatcher();
    const mockDispatch: MockInstance<typeof eventDispatcher.dispatchEvent> = eventDispatcher.dispatchEvent;
    mockDispatch.mockResolvedValue({});
    const dispatchRepeater = getMockRepeater();

    const processor = new BatchEventProcessor({
      eventDispatcher,
      dispatchRepeater,
      batchSize: 100,
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
    expect(eventDispatcher.dispatchEvent.mock.calls[0][0]).toEqual(buildLogEvent(events));

    events = [];
    for(let i = 1; i < 15; i++) {
      const event = createImpressionEvent(`id-${i}`);
      events.push(event);
      await processor.process(event);
    }

    await dispatchRepeater.execute(0);
    expect(eventDispatcher.dispatchEvent).toHaveBeenCalledTimes(2);
    expect(eventDispatcher.dispatchEvent.mock.calls[1][0]).toEqual(buildLogEvent(events));
  });

  it('should not retry failed dispatch if retryConfig is not provided', async () => {
    const eventDispatcher = getMockDispatcher();
    const mockDispatch: MockInstance<typeof eventDispatcher.dispatchEvent> = eventDispatcher.dispatchEvent;
    mockDispatch.mockRejectedValue(new Error());
    const dispatchRepeater = getMockRepeater();

    const processor = new BatchEventProcessor({
      eventDispatcher,
      dispatchRepeater,
      batchSize: 100,
    });

    processor.start();
    await processor.onRunning();

    const events: ProcessableEvent[] = [];
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

    const processor = new BatchEventProcessor({
      eventDispatcher,
      dispatchRepeater,
      retryConfig: {
        backoffProvider: () => backoffController,
        maxRetries: 3,
      },
      batchSize: 100,
    });

    processor.start();
    await processor.onRunning();

    const events: ProcessableEvent[] = [];
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

    const request = buildLogEvent(events);
    for(let i = 0; i < 4; i++) {
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

    const processor = new BatchEventProcessor({
      eventDispatcher,
      dispatchRepeater,
      batchSize: 100,
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

    const processor = new BatchEventProcessor({
      eventDispatcher,
      dispatchRepeater,
      batchSize: 100,
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

    const processor = new BatchEventProcessor({
      eventDispatcher,
      dispatchRepeater,
      batchSize: 100,
      eventStore,
      retryConfig: {
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

    const processor = new BatchEventProcessor({
      eventDispatcher,
      dispatchRepeater,
      eventStore,
      retryConfig: {
        backoffProvider: () => backoffController,
        maxRetries: 3,
      },
      batchSize: 100,
      logger,
    });

    processor.start();
    await processor.onRunning();

    const events: ProcessableEvent[] = [];
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

    const processor = new BatchEventProcessor({
      eventDispatcher,
      dispatchRepeater,
      eventStore,
      retryConfig: {
        backoffProvider: () => backoffController,
        maxRetries: 3,
      },
      batchSize: 100,
      logger,
    });

    processor.start();
    await processor.onRunning();

    const events: ProcessableEvent[] = [];
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

  describe('retryFailedEvents', () => {
    it('should disptach only failed events from the store and not dispatch queued events', async () => {
      const eventDispatcher = getMockDispatcher();
      const mockDispatch: MockInstance<typeof eventDispatcher.dispatchEvent> = eventDispatcher.dispatchEvent;
      mockDispatch.mockResolvedValue({});
  
      const cache = getMockSyncCache<EventWithId>();
      const dispatchRepeater = getMockRepeater();
  
      const processor = new BatchEventProcessor({
        eventDispatcher,
        dispatchRepeater,
        batchSize: 100,
        eventStore: cache,
      });
  
      processor.start();
      await processor.onRunning();
  
      // these events should be in queue and should not be reomoved from store or dispatched with failed events
      const eventA = createImpressionEvent('id-A');
      const eventB = createImpressionEvent('id-B');
      await processor.process(eventA);
      await processor.process(eventB);
  
      const failedEvents: ProcessableEvent[] = [];
  
      for(let i = 0; i < 5; i++) {
        const id = `id-${i}`;
        const event = createImpressionEvent(id);
        failedEvents.push(event);
        cache.set(id, { id, event });
      }
  
      await processor.retryFailedEvents();
      await exhaustMicrotasks();

      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch.mock.calls[0][0]).toEqual(buildLogEvent(failedEvents));

      const eventsInStore = [...cache.getAll().values()].sort((a, b) => a.id < b.id ? -1 : 1).map(e => e.event);
      expect(eventsInStore).toEqual(expect.arrayContaining([
        expect.objectContaining(eventA),
        expect.objectContaining(eventB),
      ]));
    });

    it('should disptach only failed events from the store and not dispatch events that are being dispatched', async () => {
      const eventDispatcher = getMockDispatcher();
      const mockDispatch: MockInstance<typeof eventDispatcher.dispatchEvent> = eventDispatcher.dispatchEvent;
      const mockResult1 = resolvablePromise();
      const mockResult2 = resolvablePromise();
      mockDispatch.mockResolvedValueOnce(mockResult1.promise).mockRejectedValueOnce(mockResult2.promise);
  
      const cache = getMockSyncCache<EventWithId>();
      const dispatchRepeater = getMockRepeater();
  
      const processor = new BatchEventProcessor({
        eventDispatcher,
        dispatchRepeater,
        batchSize: 100,
        eventStore: cache,
      });
  
      processor.start();
      await processor.onRunning();
  
      // these events should be in dispatch and should not be reomoved from store or dispatched with failed events
      const eventA = createImpressionEvent('id-A');
      const eventB = createImpressionEvent('id-B');
      await processor.process(eventA);
      await processor.process(eventB);

      dispatchRepeater.execute(0);
      await exhaustMicrotasks();
      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch.mock.calls[0][0]).toEqual(buildLogEvent([eventA, eventB]));
  
      const failedEvents: ProcessableEvent[] = [];
  
      for(let i = 0; i < 5; i++) {
        const id = `id-${i}`;
        const event = createImpressionEvent(id);
        failedEvents.push(event);
        cache.set(id, { id, event });
      }
  
      await processor.retryFailedEvents();
      await exhaustMicrotasks();

      expect(mockDispatch).toHaveBeenCalledTimes(2);
      expect(mockDispatch.mock.calls[1][0]).toEqual(buildLogEvent(failedEvents));

      mockResult2.resolve({});
      await exhaustMicrotasks();

      const eventsInStore = [...cache.getAll().values()].sort((a, b) => a.id < b.id ? -1 : 1).map(e => e.event);
      expect(eventsInStore).toEqual(expect.arrayContaining([
        expect.objectContaining(eventA),
        expect.objectContaining(eventB),
      ]));
    });

    it('should disptach events in correct batch size and separate events with differnt contexts in separate batch', async () => {
      const eventDispatcher = getMockDispatcher();
      const mockDispatch: MockInstance<typeof eventDispatcher.dispatchEvent> = eventDispatcher.dispatchEvent;
      mockDispatch.mockResolvedValue({});
  
      const cache = getMockSyncCache<EventWithId>();
      const dispatchRepeater = getMockRepeater();
  
      const processor = new BatchEventProcessor({
        eventDispatcher,
        dispatchRepeater,
        batchSize: 3,
        eventStore: cache,
      });
  
      processor.start();
      await processor.onRunning();
  
      const failedEvents: ProcessableEvent[] = [];
  
      for(let i = 0; i < 8; i++) {
        const id = `id-${i}`;
        const event = createImpressionEvent(id);

        if (i == 2 || i == 3) {
          event.context.accountId = 'new-account';
        }

        failedEvents.push(event);
        cache.set(id, { id, event });
      }
  
      await processor.retryFailedEvents();
      await exhaustMicrotasks();

      // events  0 1 4 5 6 7 have one context, and 2 3 have different context
      // batches should be [0, 1], [2, 3], [4, 5, 6], [7]
      expect(mockDispatch).toHaveBeenCalledTimes(4);
      expect(mockDispatch.mock.calls[0][0]).toEqual(buildLogEvent([failedEvents[0], failedEvents[1]]));
      expect(mockDispatch.mock.calls[1][0]).toEqual(buildLogEvent([failedEvents[2], failedEvents[3]]));
      expect(mockDispatch.mock.calls[2][0]).toEqual(buildLogEvent([failedEvents[4], failedEvents[5], failedEvents[6]]));
      expect(mockDispatch.mock.calls[3][0]).toEqual(buildLogEvent([failedEvents[7]]));
    });
  });
 
  describe('when failedEventRepeater is fired', () => {
    it('should disptach only failed events from the store and not dispatch queued events', async () => {
      const eventDispatcher = getMockDispatcher();
      const mockDispatch: MockInstance<typeof eventDispatcher.dispatchEvent> = eventDispatcher.dispatchEvent;
      mockDispatch.mockResolvedValue({});
  
      const cache = getMockSyncCache<EventWithId>();
      const dispatchRepeater = getMockRepeater();
      const failedEventRepeater = getMockRepeater();
  
      const processor = new BatchEventProcessor({
        eventDispatcher,
        dispatchRepeater,
        failedEventRepeater,
        batchSize: 100,
        eventStore: cache,
      });
  
      processor.start();
      await processor.onRunning();
  
      // these events should be in queue and should not be reomoved from store or dispatched with failed events
      const eventA = createImpressionEvent('id-A');
      const eventB = createImpressionEvent('id-B');
      await processor.process(eventA);
      await processor.process(eventB);
  
      const failedEvents: ProcessableEvent[] = [];
  
      for(let i = 0; i < 5; i++) {
        const id = `id-${i}`;
        const event = createImpressionEvent(id);
        failedEvents.push(event);
        cache.set(id, { id, event });
      }
  
      failedEventRepeater.execute(0);
      await exhaustMicrotasks();

      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch.mock.calls[0][0]).toEqual(buildLogEvent(failedEvents));

      const eventsInStore = [...cache.getAll().values()].sort((a, b) => a.id < b.id ? -1 : 1).map(e => e.event);
      expect(eventsInStore).toEqual(expect.arrayContaining([
        expect.objectContaining(eventA),
        expect.objectContaining(eventB),
      ]));
    });

    it('should disptach only failed events from the store and not dispatch events that are being dispatched', async () => {
      const eventDispatcher = getMockDispatcher();
      const mockDispatch: MockInstance<typeof eventDispatcher.dispatchEvent> = eventDispatcher.dispatchEvent;
      const mockResult1 = resolvablePromise();
      const mockResult2 = resolvablePromise();
      mockDispatch.mockResolvedValueOnce(mockResult1.promise).mockRejectedValueOnce(mockResult2.promise);
  
      const cache = getMockSyncCache<EventWithId>();
      const dispatchRepeater = getMockRepeater();
      const failedEventRepeater = getMockRepeater();

      const processor = new BatchEventProcessor({
        eventDispatcher,
        dispatchRepeater,
        failedEventRepeater,
        batchSize: 100,
        eventStore: cache,
      });
  
      processor.start();
      await processor.onRunning();
  
      // these events should be in dispatch and should not be reomoved from store or dispatched with failed events
      const eventA = createImpressionEvent('id-A');
      const eventB = createImpressionEvent('id-B');
      await processor.process(eventA);
      await processor.process(eventB);

      dispatchRepeater.execute(0);
      await exhaustMicrotasks();
      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch.mock.calls[0][0]).toEqual(buildLogEvent([eventA, eventB]));
  
      const failedEvents: ProcessableEvent[] = [];
  
      for(let i = 0; i < 5; i++) {
        const id = `id-${i}`;
        const event = createImpressionEvent(id);
        failedEvents.push(event);
        cache.set(id, { id, event });
      }
  
      failedEventRepeater.execute(0);
      await exhaustMicrotasks();

      expect(mockDispatch).toHaveBeenCalledTimes(2);
      expect(mockDispatch.mock.calls[1][0]).toEqual(buildLogEvent(failedEvents));

      mockResult2.resolve({});
      await exhaustMicrotasks();

      const eventsInStore = [...cache.getAll().values()].sort((a, b) => a.id < b.id ? -1 : 1).map(e => e.event);
      expect(eventsInStore).toEqual(expect.arrayContaining([
        expect.objectContaining(eventA),
        expect.objectContaining(eventB),
      ]));
    });

    it('should disptach events in correct batch size and separate events with differnt contexts in separate batch', async () => {
      const eventDispatcher = getMockDispatcher();
      const mockDispatch: MockInstance<typeof eventDispatcher.dispatchEvent> = eventDispatcher.dispatchEvent;
      mockDispatch.mockResolvedValue({});
  
      const cache = getMockSyncCache<EventWithId>();
      const dispatchRepeater = getMockRepeater();
      const failedEventRepeater = getMockRepeater();

      const processor = new BatchEventProcessor({
        eventDispatcher,
        dispatchRepeater,
        failedEventRepeater,
        batchSize: 3,
        eventStore: cache,
      });
  
      processor.start();
      await processor.onRunning();
  
      const failedEvents: ProcessableEvent[] = [];
  
      for(let i = 0; i < 8; i++) {
        const id = `id-${i}`;
        const event = createImpressionEvent(id);

        if (i == 2 || i == 3) {
          event.context.accountId = 'new-account';
        }

        failedEvents.push(event);
        cache.set(id, { id, event });
      }
  
      failedEventRepeater.execute(0);
      await exhaustMicrotasks();

      // events  0 1 4 5 6 7 have one context, and 2 3 have different context
      // batches should be [0, 1], [2, 3], [4, 5, 6], [7]
      expect(mockDispatch).toHaveBeenCalledTimes(4);
      expect(mockDispatch.mock.calls[0][0]).toEqual(buildLogEvent([failedEvents[0], failedEvents[1]]));
      expect(mockDispatch.mock.calls[1][0]).toEqual(buildLogEvent([failedEvents[2], failedEvents[3]]));
      expect(mockDispatch.mock.calls[2][0]).toEqual(buildLogEvent([failedEvents[4], failedEvents[5], failedEvents[6]]));
      expect(mockDispatch.mock.calls[3][0]).toEqual(buildLogEvent([failedEvents[7]]));
    });
  });

  it('should emit dispatch event when dispatching events', async () => {
    const eventDispatcher = getMockDispatcher();
    const dispatchRepeater = getMockRepeater();

    const processor = new BatchEventProcessor({
      eventDispatcher,
      dispatchRepeater,
      batchSize: 100,
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
    expect(dispatchListener.mock.calls[0][0]).toEqual(buildLogEvent([event, event2]));
  });

  it('should remove event handler when function returned from onDispatch is called', async () => {
    const eventDispatcher = getMockDispatcher();
    const dispatchRepeater = getMockRepeater();

    const processor = new BatchEventProcessor({
      eventDispatcher,
      dispatchRepeater,
      batchSize: 100,
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
    expect(dispatchListener.mock.calls[0][0]).toEqual(buildLogEvent([event, event2]));

    unsub();

    const event3 = createImpressionEvent('id-3');
    const event4 = createImpressionEvent('id-4');
    
    await dispatchRepeater.execute(0);
    expect(dispatchListener).toHaveBeenCalledTimes(1);
  });

  describe('stop', () => {
    it('should reject onRunning if stop is called before the processor is started', async () => {
      const eventDispatcher = getMockDispatcher();
      const dispatchRepeater = getMockRepeater();
  
      const processor = new BatchEventProcessor({
        eventDispatcher,
        dispatchRepeater,
        batchSize: 100,
      });

      processor.stop();
      
      await expect(processor.onRunning()).rejects.toThrow();
    });

    it('should stop dispatchRepeater and failedEventRepeater', async () => {
      const eventDispatcher = getMockDispatcher();
      const dispatchRepeater = getMockRepeater();
      const failedEventRepeater = getMockRepeater();

      const processor = new BatchEventProcessor({
        eventDispatcher,
        dispatchRepeater,
        failedEventRepeater,
        batchSize: 100,
      });

      processor.start();
      await processor.onRunning();

      processor.stop();
      expect(dispatchRepeater.stop).toHaveBeenCalledOnce();
      expect(failedEventRepeater.stop).toHaveBeenCalledOnce();
    });

    it('should disptach the events in queue using the closing dispatcher if available', async () => {
      const eventDispatcher = getMockDispatcher();
      const closingEventDispatcher = getMockDispatcher();
      closingEventDispatcher.dispatchEvent.mockResolvedValue({});

      const dispatchRepeater = getMockRepeater();
      const failedEventRepeater = getMockRepeater();

      const processor = new BatchEventProcessor({
        eventDispatcher,
        closingEventDispatcher,
        dispatchRepeater,
        failedEventRepeater,
        batchSize: 100,
      });

      processor.start();
      await processor.onRunning();

      const events: ProcessableEvent[] = [];
      for(let i = 0; i < 10; i++) {
        const event = createImpressionEvent(`id-${i}`);
        events.push(event);
        await processor.process(event);
      }
  
      expect(eventDispatcher.dispatchEvent).toHaveBeenCalledTimes(0);
      expect(closingEventDispatcher.dispatchEvent).toHaveBeenCalledTimes(0);

      processor.stop();
      expect(closingEventDispatcher.dispatchEvent).toHaveBeenCalledTimes(1);
      expect(closingEventDispatcher.dispatchEvent).toHaveBeenCalledWith(buildLogEvent(events));
    });

    it('should cancel retry of active dispatches', async () => {
      const runWithRetrySpy = vi.spyOn(retry, 'runWithRetry');
      const cancel1 = vi.fn();
      const cancel2 = vi.fn();
      runWithRetrySpy.mockReturnValueOnce({
        cancelRetry: cancel1,
        result: resolvablePromise().promise,
      }).mockReturnValueOnce({
        cancelRetry: cancel2,
        result: resolvablePromise().promise,
      });

      const eventDispatcher = getMockDispatcher();
      const dispatchRepeater = getMockRepeater();

      const backoffController = {
        backoff: vi.fn().mockReturnValue(1000),
        reset: vi.fn(),
      };

      const processor = new BatchEventProcessor({
        eventDispatcher,
        dispatchRepeater,
        batchSize: 100,
        retryConfig: {
          backoffProvider: () => backoffController,
          maxRetries: 3,
        }
      });

      processor.start();
      await processor.onRunning();

      await processor.process(createImpressionEvent('id-1'));
      await dispatchRepeater.execute(0);

      expect(runWithRetrySpy).toHaveBeenCalledTimes(1);

      await processor.process(createImpressionEvent('id-2'));
      await dispatchRepeater.execute(0);

      expect(runWithRetrySpy).toHaveBeenCalledTimes(2);

      processor.stop();

      expect(cancel1).toHaveBeenCalledOnce();
      expect(cancel2).toHaveBeenCalledOnce();

      runWithRetrySpy.mockReset();
    });

    it('should resolve onTerminated when all active dispatch requests settles' , async () => {
      const eventDispatcher = getMockDispatcher();
      const dispatchRes1 = resolvablePromise<void>();
      const dispatchRes2 = resolvablePromise<void>();
      eventDispatcher.dispatchEvent.mockReturnValueOnce(dispatchRes1.promise)
        .mockReturnValueOnce(dispatchRes2.promise);

      const dispatchRepeater = getMockRepeater();

      const backoffController = {
        backoff: vi.fn().mockReturnValue(1000),
        reset: vi.fn(),
      };

      const processor = new BatchEventProcessor({
        eventDispatcher,
        dispatchRepeater,
        batchSize: 100,
      });

      processor.start()
      await processor.onRunning();

      await processor.process(createImpressionEvent('id-1'));
      await dispatchRepeater.execute(0);      
      expect(eventDispatcher.dispatchEvent).toHaveBeenCalledTimes(1);

      await processor.process(createImpressionEvent('id-2'));
      await dispatchRepeater.execute(0);
      expect(eventDispatcher.dispatchEvent).toHaveBeenCalledTimes(2);

      const onStop = vi.fn();
      processor.onTerminated().then(onStop);

      processor.stop();

      await exhaustMicrotasks();
      expect(onStop).not.toHaveBeenCalled();
      expect(processor.getState()).toEqual(ServiceState.Stopping);

      dispatchRes1.resolve();
      dispatchRes2.reject(new Error());

      await expect(processor.onTerminated()).resolves.not.toThrow();
    });
  });
});
