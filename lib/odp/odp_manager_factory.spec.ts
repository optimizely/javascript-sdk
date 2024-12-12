/**
 * Copyright 2024, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

vi.mock('./odp_manager', () => {
  return {
    DefaultOdpManager: vi.fn(),
  };
});

vi.mock('./segment_manager/odp_segment_manager', () => {
  return {
    DefaultOdpSegmentManager: vi.fn(),
  };
});

vi.mock('./segment_manager/odp_segment_api_manager', () => {
  return {
    DefaultOdpSegmentApiManager: vi.fn(),
  };
});

vi.mock('../utils/cache/in_memory_lru_cache', () => {
  return {
    InMemoryLruCache: vi.fn(),
  };
});

vi.mock('./event_manager/odp_event_manager', () => {
  return {
    DefaultOdpEventManager: vi.fn(),
  };
});

vi.mock('./event_manager/odp_event_api_manager', () => {
  return {
    DefaultOdpEventApiManager: vi.fn(),
  };
});

vi.mock( '../utils/repeater/repeater', () => {
  return {
    IntervalRepeater: vi.fn(),
    ExponentialBackoff: vi.fn(),
  };
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DefaultOdpManager } from './odp_manager';
import { DEFAULT_CACHE_SIZE, DEFAULT_CACHE_TIMEOUT, DEFAULT_EVENT_BATCH_SIZE, DEFAULT_EVENT_MAX_BACKOFF, DEFAULT_EVENT_MAX_RETRIES, DEFAULT_EVENT_MIN_BACKOFF, getOdpManager } from './odp_manager_factory';
import { getMockRequestHandler } from '../tests/mock/mock_request_handler';
import { DefaultOdpSegmentManager } from './segment_manager/odp_segment_manager';
import { DefaultOdpSegmentApiManager } from './segment_manager/odp_segment_api_manager';
import { InMemoryLruCache } from '../utils/cache/in_memory_lru_cache';
import { DefaultOdpEventManager } from './event_manager/odp_event_manager';
import { DefaultOdpEventApiManager } from './event_manager/odp_event_api_manager';
import { IntervalRepeater } from '../utils/repeater/repeater';
import { ExponentialBackoff } from '../utils/repeater/repeater';

describe('getOdpManager', () => {
  const MockDefaultOdpManager = vi.mocked(DefaultOdpManager);
  const MockDefaultOdpSegmentManager = vi.mocked(DefaultOdpSegmentManager);
  const MockDefaultOdpSegmentApiManager = vi.mocked(DefaultOdpSegmentApiManager);
  const MockInMemoryLruCache = vi.mocked(InMemoryLruCache);
  const MockDefaultOdpEventManager = vi.mocked(DefaultOdpEventManager);
  const MockDefaultOdpEventApiManager = vi.mocked(DefaultOdpEventApiManager);
  const MockIntervalRepeater = vi.mocked(IntervalRepeater);
  const MockExponentialBackoff = vi.mocked(ExponentialBackoff);

  beforeEach(() => {
    MockDefaultOdpManager.mockClear();
    MockDefaultOdpSegmentManager.mockClear();
    MockDefaultOdpSegmentApiManager.mockClear();
    MockInMemoryLruCache.mockClear();
    MockDefaultOdpEventManager.mockClear();
    MockDefaultOdpEventApiManager.mockClear();
    MockIntervalRepeater.mockClear();
    MockExponentialBackoff.mockClear();
  });

  it('should use provided segment manager', () => {
    const segmentManager = {} as any;

    const odpManager = getOdpManager({
      segmentManager,
      segmentRequestHandler: getMockRequestHandler(),
      eventRequestHandler: getMockRequestHandler(),
      eventRequestGenerator: vi.fn(),
    });

    expect(Object.is(odpManager, MockDefaultOdpManager.mock.instances[0])).toBe(true);
    const { segmentManager: usedSegmentManager } = MockDefaultOdpManager.mock.calls[0][0];
    expect(usedSegmentManager).toBe(segmentManager);
  });

  describe('when no segment manager is provided', () => {
    it('should create a default segment manager with default api manager using the passed eventRequestHandler', () => {
      const segmentRequestHandler = getMockRequestHandler();
      const odpManager = getOdpManager({
        segmentRequestHandler,
        eventRequestHandler: getMockRequestHandler(),
        eventRequestGenerator: vi.fn(),
      });

      expect(Object.is(odpManager, MockDefaultOdpManager.mock.instances[0])).toBe(true);
      const { segmentManager: usedSegmentManager } = MockDefaultOdpManager.mock.calls[0][0];
      expect(Object.is(usedSegmentManager, MockDefaultOdpSegmentManager.mock.instances[0])).toBe(true);
      const apiManager = MockDefaultOdpSegmentManager.mock.calls[0][1];
      expect(Object.is(apiManager, MockDefaultOdpSegmentApiManager.mock.instances[0])).toBe(true);
      const usedRequestHandler = MockDefaultOdpSegmentApiManager.mock.calls[0][0];
      expect(Object.is(usedRequestHandler, segmentRequestHandler)).toBe(true);
    });

    it('should create a default segment manager with the provided segment cache', () => {
      const segmentsCache = {} as any;

      const odpManager = getOdpManager({
        segmentsCache,
        segmentRequestHandler: getMockRequestHandler(),
        eventRequestHandler: getMockRequestHandler(),
        eventRequestGenerator: vi.fn(),
      });

      expect(Object.is(odpManager, MockDefaultOdpManager.mock.instances[0])).toBe(true);
      const { segmentManager: usedSegmentManager } = MockDefaultOdpManager.mock.calls[0][0];
      expect(Object.is(usedSegmentManager, MockDefaultOdpSegmentManager.mock.instances[0])).toBe(true);
      const usedCache = MockDefaultOdpSegmentManager.mock.calls[0][0];
      expect(usedCache).toBe(segmentsCache);
    });

    describe('when no segment cache is provided', () => {
      it('should use a InMemoryLruCache with the provided size', () => {
        const odpManager = getOdpManager({
          segmentRequestHandler: getMockRequestHandler(),
          eventRequestHandler: getMockRequestHandler(),
          eventRequestGenerator: vi.fn(),
          segmentsCacheSize: 3141,
        });

        expect(Object.is(odpManager, MockDefaultOdpManager.mock.instances[0])).toBe(true);
        const { segmentManager: usedSegmentManager } = MockDefaultOdpManager.mock.calls[0][0];
        expect(Object.is(usedSegmentManager, MockDefaultOdpSegmentManager.mock.instances[0])).toBe(true);
        const usedCache = MockDefaultOdpSegmentManager.mock.calls[0][0];
        expect(usedCache).toBe(MockInMemoryLruCache.mock.instances[0]);
        expect(MockInMemoryLruCache.mock.calls[0][0]).toBe(3141);
      });

      it('should use a InMemoryLruCache with default size if no segmentCacheSize is provided', () => {
        const odpManager = getOdpManager({
          segmentRequestHandler: getMockRequestHandler(),
          eventRequestHandler: getMockRequestHandler(),
          eventRequestGenerator: vi.fn(),
        });

        expect(Object.is(odpManager, MockDefaultOdpManager.mock.instances[0])).toBe(true);
        const { segmentManager: usedSegmentManager } = MockDefaultOdpManager.mock.calls[0][0];
        expect(Object.is(usedSegmentManager, MockDefaultOdpSegmentManager.mock.instances[0])).toBe(true);
        const usedCache = MockDefaultOdpSegmentManager.mock.calls[0][0];
        expect(usedCache).toBe(MockInMemoryLruCache.mock.instances[0]);
        expect(MockInMemoryLruCache.mock.calls[0][0]).toBe(DEFAULT_CACHE_SIZE);
      });

      it('should use a InMemoryLruCache with the provided timeout', () => {
        const odpManager = getOdpManager({
          segmentRequestHandler: getMockRequestHandler(),
          eventRequestHandler: getMockRequestHandler(),
          eventRequestGenerator: vi.fn(),
          segmentsCacheTimeout: 123456,
        });

        expect(Object.is(odpManager, MockDefaultOdpManager.mock.instances[0])).toBe(true);
        const { segmentManager: usedSegmentManager } = MockDefaultOdpManager.mock.calls[0][0];
        expect(Object.is(usedSegmentManager, MockDefaultOdpSegmentManager.mock.instances[0])).toBe(true);
        const usedCache = MockDefaultOdpSegmentManager.mock.calls[0][0];
        expect(usedCache).toBe(MockInMemoryLruCache.mock.instances[0]);
        expect(MockInMemoryLruCache.mock.calls[0][1]).toBe(123456);
      });

      it('should use a InMemoryLruCache with default timeout if no segmentsCacheTimeout is provided', () => {
        const odpManager = getOdpManager({
          segmentRequestHandler: getMockRequestHandler(),
          eventRequestHandler: getMockRequestHandler(),
          eventRequestGenerator: vi.fn(),
        });

        expect(Object.is(odpManager, MockDefaultOdpManager.mock.instances[0])).toBe(true);
        const { segmentManager: usedSegmentManager } = MockDefaultOdpManager.mock.calls[0][0];
        expect(Object.is(usedSegmentManager, MockDefaultOdpSegmentManager.mock.instances[0])).toBe(true);
        const usedCache = MockDefaultOdpSegmentManager.mock.calls[0][0];
        expect(usedCache).toBe(MockInMemoryLruCache.mock.instances[0]);
        expect(MockInMemoryLruCache.mock.calls[0][1]).toBe(DEFAULT_CACHE_TIMEOUT);
      });
    });
  });

  it('uses provided event manager', () => {
    const eventManager = {} as any;

    const odpManager = getOdpManager({
      eventManager,
      segmentRequestHandler: getMockRequestHandler(),
      eventRequestHandler: getMockRequestHandler(),
      eventRequestGenerator: vi.fn(),
    });

    expect(odpManager).toBe(MockDefaultOdpManager.mock.instances[0]);
    const { eventManager: usedEventManager } = MockDefaultOdpManager.mock.calls[0][0];
    expect(usedEventManager).toBe(eventManager);
  });

  describe('when no event manager is provided', () => {
    it('should use a default event manager with default api manager using the passed eventRequestHandler and eventRequestGenerator', () => {
      const eventRequestHandler = getMockRequestHandler();
      const eventRequestGenerator = vi.fn();
      const odpManager = getOdpManager({
        segmentRequestHandler: getMockRequestHandler(),
        eventRequestHandler,
        eventRequestGenerator,
      });

      expect(odpManager).toBe(MockDefaultOdpManager.mock.instances[0]);
      const { eventManager: usedEventManager } = MockDefaultOdpManager.mock.calls[0][0];
      expect(usedEventManager).toBe(MockDefaultOdpEventManager.mock.instances[0]);
      const apiManager = MockDefaultOdpEventManager.mock.calls[0][0].apiManager;
      expect(apiManager).toBe(MockDefaultOdpEventApiManager.mock.instances[0]);
      const usedRequestHandler = MockDefaultOdpEventApiManager.mock.calls[0][0];
      expect(usedRequestHandler).toBe(eventRequestHandler);
      const usedRequestGenerator = MockDefaultOdpEventApiManager.mock.calls[0][1];
      expect(usedRequestGenerator).toBe(eventRequestGenerator);
    });

    it('should use a default event manager with the provided event batch size', () => {
      const eventBatchSize = 1234;
      const odpManager = getOdpManager({
        segmentRequestHandler: getMockRequestHandler(),
        eventRequestHandler: getMockRequestHandler(),
        eventRequestGenerator: vi.fn(),
        eventBatchSize,
      });

      expect(odpManager).toBe(MockDefaultOdpManager.mock.instances[0]);
      const { eventManager: usedEventManager } = MockDefaultOdpManager.mock.calls[0][0];
      expect(usedEventManager).toBe(MockDefaultOdpEventManager.mock.instances[0]);
      const usedBatchSize = MockDefaultOdpEventManager.mock.calls[0][0].batchSize;
      expect(usedBatchSize).toBe(eventBatchSize);
    });

    it('should use a default event manager with the default batch size if no eventBatchSize is provided', () => {
      const odpManager = getOdpManager({
        segmentRequestHandler: getMockRequestHandler(),
        eventRequestHandler: getMockRequestHandler(),
        eventRequestGenerator: vi.fn(),
      });

      expect(odpManager).toBe(MockDefaultOdpManager.mock.instances[0]);
      const { eventManager: usedEventManager } = MockDefaultOdpManager.mock.calls[0][0];
      expect(usedEventManager).toBe(MockDefaultOdpEventManager.mock.instances[0]);
      const usedBatchSize = MockDefaultOdpEventManager.mock.calls[0][0].batchSize;
      expect(usedBatchSize).toBe(DEFAULT_EVENT_BATCH_SIZE);
    });

    it('should use a default event manager with an interval repeater with the provided flush interval', () => {
      const eventFlushInterval = 1234;
      const odpManager = getOdpManager({
        segmentRequestHandler: getMockRequestHandler(),
        eventRequestHandler: getMockRequestHandler(),
        eventRequestGenerator: vi.fn(),
        eventFlushInterval,
      });

      expect(odpManager).toBe(MockDefaultOdpManager.mock.instances[0]);
      const { eventManager: usedEventManager } = MockDefaultOdpManager.mock.calls[0][0];
      expect(usedEventManager).toBe(MockDefaultOdpEventManager.mock.instances[0]);
      const usedRepeater = MockDefaultOdpEventManager.mock.calls[0][0].repeater;
      expect(usedRepeater).toBe(MockIntervalRepeater.mock.instances[0]);
      const usedInterval = MockIntervalRepeater.mock.calls[0][0];
      expect(usedInterval).toBe(eventFlushInterval);
    });

    it('should use a default event manager with the provided max retries', () => {
      const eventMaxRetries = 7;
      const odpManager = getOdpManager({
        segmentRequestHandler: getMockRequestHandler(),
        eventRequestHandler: getMockRequestHandler(),
        eventRequestGenerator: vi.fn(),
        eventMaxRetries,
      });

      expect(odpManager).toBe(MockDefaultOdpManager.mock.instances[0]);
      const { eventManager: usedEventManager } = MockDefaultOdpManager.mock.calls[0][0];
      expect(usedEventManager).toBe(MockDefaultOdpEventManager.mock.instances[0]);
      const usedMaxRetries = MockDefaultOdpEventManager.mock.calls[0][0].retryConfig.maxRetries;
      expect(usedMaxRetries).toBe(eventMaxRetries);
    });

    it('should use a default event manager with the default max retries if no eventMaxRetries is provided', () => {
      const odpManager = getOdpManager({
        segmentRequestHandler: getMockRequestHandler(),
        eventRequestHandler: getMockRequestHandler(),
        eventRequestGenerator: vi.fn(),
      });

      expect(odpManager).toBe(MockDefaultOdpManager.mock.instances[0]);
      const { eventManager: usedEventManager } = MockDefaultOdpManager.mock.calls[0][0];
      expect(usedEventManager).toBe(MockDefaultOdpEventManager.mock.instances[0]);
      const usedMaxRetries = MockDefaultOdpEventManager.mock.calls[0][0].retryConfig.maxRetries;
      expect(usedMaxRetries).toBe(DEFAULT_EVENT_MAX_RETRIES);
    });

    it('should use a default event manager with ExponentialBackoff with provided minBackoff', () => {
      const eventMinBackoff = 1234;
      const odpManager = getOdpManager({
        segmentRequestHandler: getMockRequestHandler(),
        eventRequestHandler: getMockRequestHandler(),
        eventRequestGenerator: vi.fn(),
        eventMinBackoff,
      });

      expect(odpManager).toBe(MockDefaultOdpManager.mock.instances[0]);
      const { eventManager: usedEventManager } = MockDefaultOdpManager.mock.calls[0][0];
      expect(usedEventManager).toBe(MockDefaultOdpEventManager.mock.instances[0]);
      const usedBackoffProvider = MockDefaultOdpEventManager.mock.calls[0][0].retryConfig.backoffProvider;
      const backoff = usedBackoffProvider();
      expect(Object.is(backoff, MockExponentialBackoff.mock.instances[0])).toBe(true);
      expect(MockExponentialBackoff.mock.calls[0][0]).toBe(eventMinBackoff);
    });

    it('should use a default event manager with ExponentialBackoff with default min backoff if none provided', () => {
      const odpManager = getOdpManager({
        segmentRequestHandler: getMockRequestHandler(),
        eventRequestHandler: getMockRequestHandler(),
        eventRequestGenerator: vi.fn(),
      });

      expect(odpManager).toBe(MockDefaultOdpManager.mock.instances[0]);
      const { eventManager: usedEventManager } = MockDefaultOdpManager.mock.calls[0][0];
      expect(usedEventManager).toBe(MockDefaultOdpEventManager.mock.instances[0]);
      const usedBackoffProvider = MockDefaultOdpEventManager.mock.calls[0][0].retryConfig.backoffProvider;
      const backoff = usedBackoffProvider();
      expect(Object.is(backoff, MockExponentialBackoff.mock.instances[0])).toBe(true);
      expect(MockExponentialBackoff.mock.calls[0][0]).toBe(DEFAULT_EVENT_MIN_BACKOFF);
    });

    it('should use a default event manager with ExponentialBackoff with provided maxBackoff', () => {
      const eventMaxBackoff = 9999;
      const odpManager = getOdpManager({
        segmentRequestHandler: getMockRequestHandler(),
        eventRequestHandler: getMockRequestHandler(),
        eventRequestGenerator: vi.fn(),
        eventMaxBackoff: eventMaxBackoff,
      });

      expect(odpManager).toBe(MockDefaultOdpManager.mock.instances[0]);
      const { eventManager: usedEventManager } = MockDefaultOdpManager.mock.calls[0][0];
      expect(usedEventManager).toBe(MockDefaultOdpEventManager.mock.instances[0]);
      const usedBackoffProvider = MockDefaultOdpEventManager.mock.calls[0][0].retryConfig.backoffProvider;
      const backoff = usedBackoffProvider();
      expect(Object.is(backoff, MockExponentialBackoff.mock.instances[0])).toBe(true);
      expect(MockExponentialBackoff.mock.calls[0][1]).toBe(eventMaxBackoff);
    });

    it('should use a default event manager with ExponentialBackoff with default max backoff if none provided', () => {
      const odpManager = getOdpManager({
        segmentRequestHandler: getMockRequestHandler(),
        eventRequestHandler: getMockRequestHandler(),
        eventRequestGenerator: vi.fn(),
      });

      expect(odpManager).toBe(MockDefaultOdpManager.mock.instances[0]);
      const { eventManager: usedEventManager } = MockDefaultOdpManager.mock.calls[0][0];
      expect(usedEventManager).toBe(MockDefaultOdpEventManager.mock.instances[0]);
      const usedBackoffProvider = MockDefaultOdpEventManager.mock.calls[0][0].retryConfig.backoffProvider;
      const backoff = usedBackoffProvider();
      expect(Object.is(backoff, MockExponentialBackoff.mock.instances[0])).toBe(true);
      expect(MockExponentialBackoff.mock.calls[0][1]).toBe(DEFAULT_EVENT_MAX_BACKOFF);
    });
  });

  it('should use the provided userAgentParser', () => {
    const userAgentParser = {} as any;

    const odpManager = getOdpManager({
      segmentRequestHandler: getMockRequestHandler(),
      eventRequestHandler: getMockRequestHandler(),
      eventRequestGenerator: vi.fn(),
      userAgentParser,
    });

    expect(odpManager).toBe(MockDefaultOdpManager.mock.instances[0]);
    const { userAgentParser: usedUserAgentParser } = MockDefaultOdpManager.mock.calls[0][0];
    expect(usedUserAgentParser).toBe(userAgentParser);
  });
});
