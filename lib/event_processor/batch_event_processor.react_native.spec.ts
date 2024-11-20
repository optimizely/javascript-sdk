import { vi, describe, it, expect, beforeEach } from 'vitest';

const mockNetInfo = vi.hoisted(() => {
  const netInfo = {
    listeners: [],
    unsubs: [],
    addEventListener(fn: any) {
      this.listeners.push(fn);
      const unsub = vi.fn();
      this.unsubs.push(unsub);
      return unsub;
    },
    pushState(state: boolean) {
      for (const listener of this.listeners) {
        listener({ isInternetReachable: state });
      }
    },
    clear() {
      this.listeners = [];
      this.unsubs = [];
    }
  };
  return netInfo;
});

vi.mock('@react-native-community/netinfo', () => {
  return {
    addEventListener: mockNetInfo.addEventListener.bind(mockNetInfo),
  };
});

import { ReactNativeNetInfoEventProcessor } from './batch_event_processor.react_native';
import { getMockLogger } from '../tests/mock/mock_logger';
import { getMockRepeater } from '../tests/mock/mock_repeater';
import { getMockAsyncCache } from '../tests/mock/mock_cache';

import { EventWithId } from './batch_event_processor';
import { EventDispatcher } from './eventDispatcher';
import { formatEvents } from './v1/buildEventV1';
import { createImpressionEvent } from '../tests/mock/create_event';
import { ProcessableEvent } from './eventProcessor';

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


describe('ReactNativeNetInfoEventProcessor', () => {
  beforeEach(() => {
    mockNetInfo.clear();
  });

  it('should not retry failed events when reachable state does not change', async () => {
    const eventDispatcher = getMockDispatcher();
    const dispatchRepeater = getMockRepeater();
    const failedEventRepeater = getMockRepeater();

    const cache = getMockAsyncCache<EventWithId>();
    const events: ProcessableEvent[] = [];

    for(let i = 0; i < 5; i++) {
      const id = `id-${i}`;
      const event = createImpressionEvent(id);
      events.push(event);
      await cache.set(id, { id, event });
    }

    const processor = new ReactNativeNetInfoEventProcessor({
      eventDispatcher,
      dispatchRepeater,
      failedEventRepeater,
      batchSize: 1000,
      eventStore: cache,
    });

    processor.start();
    await processor.onRunning();

    mockNetInfo.pushState(true);
    expect(eventDispatcher.dispatchEvent).not.toHaveBeenCalled();

    mockNetInfo.pushState(true);
    expect(eventDispatcher.dispatchEvent).not.toHaveBeenCalled();
  });

  it('should retry failed events when network becomes reachable', async () => {
    const eventDispatcher = getMockDispatcher();
    const dispatchRepeater = getMockRepeater();
    const failedEventRepeater = getMockRepeater();

    const cache = getMockAsyncCache<EventWithId>();
    const events: ProcessableEvent[] = [];

    for(let i = 0; i < 5; i++) {
      const id = `id-${i}`;
      const event = createImpressionEvent(id);
      events.push(event);
      await cache.set(id, { id, event });
    }

    const processor = new ReactNativeNetInfoEventProcessor({
      eventDispatcher,
      dispatchRepeater,
      failedEventRepeater,
      batchSize: 1000,
      eventStore: cache,
    });

    processor.start();
    await processor.onRunning();

    mockNetInfo.pushState(false);
    expect(eventDispatcher.dispatchEvent).not.toHaveBeenCalled();

    mockNetInfo.pushState(true);

    await exhaustMicrotasks();

    expect(eventDispatcher.dispatchEvent).toHaveBeenCalledWith(formatEvents(events));
  });

  it('should unsubscribe from netinfo listener when stopped', async () => {
    const eventDispatcher = getMockDispatcher();
    const dispatchRepeater = getMockRepeater();
    const failedEventRepeater = getMockRepeater();

    const cache = getMockAsyncCache<EventWithId>();

    const processor = new ReactNativeNetInfoEventProcessor({
      eventDispatcher,
      dispatchRepeater,
      failedEventRepeater,
      batchSize: 1000,
      eventStore: cache,
    });

    processor.start();
    await processor.onRunning();

    mockNetInfo.pushState(false);

    processor.stop();
    await processor.onTerminated();

    expect(mockNetInfo.unsubs[0]).toHaveBeenCalled();
  });
});
