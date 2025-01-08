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
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { DefaultOdpEventManager } from './odp_event_manager';
import { getMockRepeater } from '../../tests/mock/mock_repeater';
import { getMockLogger } from '../../tests/mock/mock_logger';
import { ServiceState } from '../../service';
import { exhaustMicrotasks } from '../../tests/testUtils';
import { OdpEvent } from './odp_event';
import { OdpConfig } from '../odp_config';
import { EventDispatchResponse } from './odp_event_api_manager';
import { advanceTimersByTime } from '../../tests/testUtils';
import { FAILED_TO_DISPATCH_EVENTS } from '../../exception_messages';

const API_KEY = 'test-api-key';
const API_HOST = 'https://odp.example.com';
const PIXEL_URL = 'https://odp.pixel.com';
const SEGMENTS_TO_CHECK = ['segment1', 'segment2'];

const config = new OdpConfig(API_KEY, API_HOST, PIXEL_URL, SEGMENTS_TO_CHECK);

const makeEvent = (id: number) => {
  const identifiers = new Map<string, string>();
  identifiers.set('identifier1', 'value1-' + id);
  identifiers.set('identifier2', 'value2-' + id);

  const data = new Map<string, unknown>();
  data.set('data1', 'data-value1-' + id);
  data.set('data2', id);

  return new OdpEvent('test-type-' + id, 'test-action-' + id, identifiers, data);
};

const getMockApiManager = () => {
  return {
    sendEvents: vi.fn(),
  };
};

describe('DefaultOdpEventManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should be in new state after construction', () => {
    const odpEventManager = new DefaultOdpEventManager({
      repeater: getMockRepeater(),
      apiManager: getMockApiManager(),
      batchSize: 10,
      retryConfig: {
        maxRetries: 3,
        backoffProvider: vi.fn(),
      },
    });

    expect(odpEventManager.getState()).toBe(ServiceState.New);
  });

  it('should stay in starting state if started with a odpIntegationConfig and not resolve or reject onRunning', async () => {
    const odpEventManager = new DefaultOdpEventManager({
      repeater: getMockRepeater(),
      apiManager: getMockApiManager(),
      batchSize: 10,
      retryConfig: {
        maxRetries: 3,
        backoffProvider: vi.fn(),
      },
    });

    const onRunningHandler = vi.fn();
    odpEventManager.onRunning().then(onRunningHandler, onRunningHandler);

    odpEventManager.start();
    expect(odpEventManager.getState()).toBe(ServiceState.Starting);

    await exhaustMicrotasks();

    expect(odpEventManager.getState()).toBe(ServiceState.Starting);
    expect(onRunningHandler).not.toHaveBeenCalled();
  });

  it('should move to running state and resolve onRunning() is start() is called after updateConfig()', async () => {
    const odpEventManager = new DefaultOdpEventManager({
      repeater: getMockRepeater(),
      apiManager: getMockApiManager(),
      batchSize: 10,
      retryConfig: {
        maxRetries: 3,
        backoffProvider: vi.fn(),
      },
    });

    odpEventManager.updateConfig({
      integrated: false,
    });

    odpEventManager.start();
    await expect(odpEventManager.onRunning()).resolves.not.toThrow();
    expect(odpEventManager.getState()).toBe(ServiceState.Running);
  });

  it('should move to running state and resolve onRunning() is updateConfig() is called after start()', async () => {
    const odpEventManager = new DefaultOdpEventManager({
      repeater: getMockRepeater(),
      apiManager: getMockApiManager(),
      batchSize: 10,
      retryConfig: {
        maxRetries: 3,
        backoffProvider: vi.fn(),
      },
    });

    odpEventManager.start();

    odpEventManager.updateConfig({
      integrated: false,
    });

    await expect(odpEventManager.onRunning()).resolves.not.toThrow();
    expect(odpEventManager.getState()).toBe(ServiceState.Running);
  });

  it('should queue events until batchSize is reached', async () => {
    const apiManager = getMockApiManager();
    apiManager.sendEvents.mockResolvedValue({ statusCode: 200 });

    const odpEventManager = new DefaultOdpEventManager({
      repeater: getMockRepeater(),
      apiManager: apiManager,
      batchSize: 10,
      retryConfig: {
        maxRetries: 3,
        backoffProvider: vi.fn(),
      },
    });

    odpEventManager.updateConfig({
      integrated: true,
      odpConfig: config,
    });

    odpEventManager.start();
    await expect(odpEventManager.onRunning()).resolves.not.toThrow();

    const events: OdpEvent[] = [];
    for (let i = 0; i < 9; i++) {
      events.push(makeEvent(i));
      odpEventManager.sendEvent(events[i]);
    }

    await exhaustMicrotasks();
    expect(apiManager.sendEvents).not.toHaveBeenCalled();

    events.push(makeEvent(9));
    odpEventManager.sendEvent(events[9]);

    await exhaustMicrotasks();
    expect(apiManager.sendEvents).toHaveBeenCalledTimes(1);
    expect(apiManager.sendEvents).toHaveBeenNthCalledWith(1, config, events);
  });

  it('should send events immediately asynchronously if batchSize is 1', async () => {
    const apiManager = getMockApiManager();
    apiManager.sendEvents.mockResolvedValue({ statusCode: 200 });

    const odpEventManager = new DefaultOdpEventManager({
      repeater: getMockRepeater(),
      apiManager: apiManager,
      batchSize: 1,
      retryConfig: {
        maxRetries: 3,
        backoffProvider: vi.fn(),
      },
    });

    odpEventManager.updateConfig({
      integrated: true,
      odpConfig: config,
    });

    odpEventManager.start();
    await expect(odpEventManager.onRunning()).resolves.not.toThrow();

    for (let i = 0; i < 10; i++) {
      const event = makeEvent(i);
      odpEventManager.sendEvent(event);
      await exhaustMicrotasks();
      expect(apiManager.sendEvents).toHaveBeenCalledTimes(i + 1);
      expect(apiManager.sendEvents).toHaveBeenNthCalledWith(i + 1, config, [event]);
    }
  });

  it('should flush the queue immediately if disposable, regardless of the batchSize', async () => {
    const apiManager = getMockApiManager();
    const repeater = getMockRepeater()
    apiManager.sendEvents.mockResolvedValue({ statusCode: 200 });
    // spy on the flush method
    const odpEventManager = new DefaultOdpEventManager({
      repeater, 
      apiManager: apiManager,
      batchSize: 10,
      retryConfig: {
        maxRetries: 3,
        backoffProvider: vi.fn(),
      },
    });

    odpEventManager.updateConfig({
      integrated: true,
      odpConfig: config,
    });
    odpEventManager.makeDisposable();
    odpEventManager.start();

    await expect(odpEventManager.onRunning()).resolves.not.toThrow(); 

    const event = makeEvent(0);
    odpEventManager.sendEvent(event);
    await exhaustMicrotasks();

    expect(apiManager.sendEvents).toHaveBeenCalledTimes(1);
    expect(apiManager.sendEvents).toHaveBeenNthCalledWith(1, config, [event]);
    expect(repeater.reset).toHaveBeenCalledTimes(1);
  })

  it('drops events and logs if the state is not running', async () => {
    const apiManager = getMockApiManager();
    apiManager.sendEvents.mockResolvedValue({ statusCode: 200 });
    const logger = getMockLogger();
    const odpEventManager = new DefaultOdpEventManager({
      repeater: getMockRepeater(),
      apiManager: apiManager,
      batchSize: 10,
      retryConfig: {
        maxRetries: 3,
        backoffProvider: vi.fn(),
      },
    });

    odpEventManager.setLogger(logger);

    odpEventManager.updateConfig({
      integrated: true,
      odpConfig: config,
    });

    expect(odpEventManager.getState()).toBe(ServiceState.New);

    const event = makeEvent(0);
    odpEventManager.sendEvent(event);
    await exhaustMicrotasks();

    expect(apiManager.sendEvents).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('drops events and logs if odpIntegrationConfig is not integrated', async () => {
    const apiManager = getMockApiManager();
    apiManager.sendEvents.mockResolvedValue({ statusCode: 200 });
    const logger = getMockLogger();
    const odpEventManager = new DefaultOdpEventManager({
      repeater: getMockRepeater(),
      apiManager: apiManager,
      batchSize: 10,
      retryConfig: {
        maxRetries: 3,
        backoffProvider: vi.fn(),
      },
    });

    odpEventManager.setLogger(logger);

    odpEventManager.updateConfig({
      integrated: false,
    });

    odpEventManager.start();
    await expect(odpEventManager.onRunning()).resolves.not.toThrow();
    expect(odpEventManager.getState()).toBe(ServiceState.Running);

    const event = makeEvent(0);
    odpEventManager.sendEvent(event);
    await exhaustMicrotasks();
    expect(apiManager.sendEvents).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('drops event and logs if there is no identifier', async () => {
    const apiManager = getMockApiManager();
    apiManager.sendEvents.mockResolvedValue({ statusCode: 200 });
    const logger = getMockLogger();
    const odpEventManager = new DefaultOdpEventManager({
      repeater: getMockRepeater(),
      apiManager: apiManager,
      batchSize: 10,
      retryConfig: {
        maxRetries: 3,
        backoffProvider: vi.fn(),
      },
    });

    odpEventManager.setLogger(logger);

    odpEventManager.updateConfig({
      integrated: true,
      odpConfig: config,
    });

    odpEventManager.start();
    await expect(odpEventManager.onRunning()).resolves.not.toThrow();
    expect(odpEventManager.getState()).toBe(ServiceState.Running);

    const event = new OdpEvent('test-type', 'test-action', new Map(), new Map());
    odpEventManager.sendEvent(event);
    await exhaustMicrotasks();
    expect(apiManager.sendEvents).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('accepts string, number, boolean, and null values for data', async () => {
    const apiManager = getMockApiManager();
    apiManager.sendEvents.mockResolvedValue({ statusCode: 200 });
    const logger = getMockLogger();
    const odpEventManager = new DefaultOdpEventManager({
      repeater: getMockRepeater(),
      apiManager: apiManager,
      batchSize: 1,
      retryConfig: {
        maxRetries: 3,
        backoffProvider: vi.fn(),
      },
    });

    odpEventManager.setLogger(logger);

    odpEventManager.updateConfig({
      integrated: true,
      odpConfig: config,
    });

    odpEventManager.start();
    await expect(odpEventManager.onRunning()).resolves.not.toThrow();
    expect(odpEventManager.getState()).toBe(ServiceState.Running);

    const data = new Map<string, unknown>();
    data.set('string', 'string-value');
    data.set('number', 123);
    data.set('boolean', true);
    data.set('null', null);

    const event = new OdpEvent('test-type', 'test-action', new Map([['k', 'v']]), data);

    odpEventManager.sendEvent(event);
    await exhaustMicrotasks();

    expect(apiManager.sendEvents).toHaveBeenCalledTimes(1);
    expect(apiManager.sendEvents).toHaveBeenNthCalledWith(1, config, [event]);
  });

  it('should drop event and log if data contains values other than string, number, boolean, or null', async () => {
    const apiManager = getMockApiManager();
    apiManager.sendEvents.mockResolvedValue({ statusCode: 200 });
    const logger = getMockLogger();
    const odpEventManager = new DefaultOdpEventManager({
      repeater: getMockRepeater(),
      apiManager: apiManager,
      batchSize: 1,
      retryConfig: {
        maxRetries: 3,
        backoffProvider: vi.fn(),
      },
    });

    odpEventManager.setLogger(logger);

    odpEventManager.updateConfig({
      integrated: true,
      odpConfig: config,
    });

    odpEventManager.start();
    await expect(odpEventManager.onRunning()).resolves.not.toThrow();
    expect(odpEventManager.getState()).toBe(ServiceState.Running);

    const data = new Map<string, unknown>();
    data.set('string', 'string-value');
    data.set('number', 123);
    data.set('boolean', true);
    data.set('null', null);
    data.set('invalid', new Date());

    const event = new OdpEvent('test-type', 'test-action', new Map([['k', 'v']]), data);

    odpEventManager.sendEvent(event);
    await exhaustMicrotasks();

    expect(apiManager.sendEvents).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('should drop event and log if action is empty', async () => {
    const apiManager = getMockApiManager();
    apiManager.sendEvents.mockResolvedValue({ statusCode: 200 });
    const logger = getMockLogger();
    const odpEventManager = new DefaultOdpEventManager({
      repeater: getMockRepeater(),
      apiManager: apiManager,
      batchSize: 1,
      retryConfig: {
        maxRetries: 3,
        backoffProvider: vi.fn(),
      },
    });

    odpEventManager.setLogger(logger);

    odpEventManager.updateConfig({
      integrated: true,
      odpConfig: config,
    });

    odpEventManager.start();
    await expect(odpEventManager.onRunning()).resolves.not.toThrow();
    expect(odpEventManager.getState()).toBe(ServiceState.Running);

    const event = new OdpEvent('test-type', '', new Map([['k', 'v']]), new Map([['k', 'v']]));

    odpEventManager.sendEvent(event);
    await exhaustMicrotasks();

    expect(apiManager.sendEvents).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('should use fullstack as type if type is empty', async () => {
    const apiManager = getMockApiManager();
    apiManager.sendEvents.mockResolvedValue({ statusCode: 200 });
    const logger = getMockLogger();
    const odpEventManager = new DefaultOdpEventManager({
      repeater: getMockRepeater(),
      apiManager: apiManager,
      batchSize: 1,
      retryConfig: {
        maxRetries: 3,
        backoffProvider: vi.fn(),
      },
    });

    odpEventManager.setLogger(logger);

    odpEventManager.updateConfig({
      integrated: true,
      odpConfig: config,
    });

    odpEventManager.start();
    await expect(odpEventManager.onRunning()).resolves.not.toThrow();
    expect(odpEventManager.getState()).toBe(ServiceState.Running);

    const event = new OdpEvent('', 'test-action', new Map([['k', 'v']]), new Map([['k', 'v']]));

    odpEventManager.sendEvent(event);
    await exhaustMicrotasks();

    expect(apiManager.sendEvents).toHaveBeenCalledTimes(1);
    expect(apiManager.sendEvents.mock.calls[0][1][0].type).toBe('fullstack');
  });

  it('should transform identifiers with keys FS-USER-ID, fs-user-id and FS_USER_ID to fs_user_id', async () => {
    const apiManager = getMockApiManager();
    apiManager.sendEvents.mockResolvedValue({ statusCode: 200 });
    const logger = getMockLogger();
    const odpEventManager = new DefaultOdpEventManager({
      repeater: getMockRepeater(),
      apiManager: apiManager,
      batchSize: 3,
      retryConfig: {
        maxRetries: 3,
        backoffProvider: vi.fn(),
      },
    });

    odpEventManager.setLogger(logger);

    odpEventManager.updateConfig({
      integrated: true,
      odpConfig: config,
    });

    odpEventManager.start();
    await expect(odpEventManager.onRunning()).resolves.not.toThrow();
    expect(odpEventManager.getState()).toBe(ServiceState.Running);

    const event1 = new OdpEvent('test-type', 'test-action', new Map([['FS-USER-ID', 'value1']]), new Map([['k', 'v']]));
    const event2 = new OdpEvent('test-type', 'test-action', new Map([['fs-user-id', 'value2']]), new Map([['k', 'v']]));
    const event3 = new OdpEvent('test-type', 'test-action', new Map([['FS_USER_ID', 'value3']]), new Map([['k', 'v']]));

    odpEventManager.sendEvent(event1);
    odpEventManager.sendEvent(event2);
    odpEventManager.sendEvent(event3);
    await exhaustMicrotasks();

    expect(apiManager.sendEvents).toHaveBeenCalledTimes(1);
    expect(apiManager.sendEvents.mock.calls[0][1][0].identifiers.get('fs_user_id')).toBe('value1');
    expect(apiManager.sendEvents.mock.calls[0][1][1].identifiers.get('fs_user_id')).toBe('value2');
    expect(apiManager.sendEvents.mock.calls[0][1][2].identifiers.get('fs_user_id')).toBe('value3');
  });

  it('should start the repeater when the first event is sent', async () => {
    const repeater = getMockRepeater();

    const odpEventManager = new DefaultOdpEventManager({
      repeater: repeater,
      apiManager: getMockApiManager(),
      batchSize: 300,
      retryConfig: {
        maxRetries: 3,
        backoffProvider: vi.fn(),
      },
    });

    odpEventManager.updateConfig({
      integrated: true,
      odpConfig: config,
    });

    odpEventManager.start();
    await expect(odpEventManager.onRunning()).resolves.not.toThrow();
  
    expect(repeater.start).not.toHaveBeenCalled();

    for(let i = 0; i < 10; i++) {
      odpEventManager.sendEvent(makeEvent(i));
      await exhaustMicrotasks();
      expect(repeater.start).toHaveBeenCalledTimes(1);
    }
  });

  it('should flush the queue when the repeater triggers', async () => {
    const repeater = getMockRepeater();

    const apiManager = getMockApiManager();
    apiManager.sendEvents.mockResolvedValue({ statusCode: 200 });

    const odpEventManager = new DefaultOdpEventManager({
      repeater: repeater,
      apiManager: apiManager,
      batchSize: 30,
      retryConfig: {
        maxRetries: 3,
        backoffProvider: vi.fn(),
      },
    });

    odpEventManager.updateConfig({
      integrated: true,
      odpConfig: config,
    });

    odpEventManager.start();
    await expect(odpEventManager.onRunning()).resolves.not.toThrow();

    const events: OdpEvent[] = [];
    for(let i = 0; i < 10; i++) {
      events.push(makeEvent(i));
      odpEventManager.sendEvent(events[i]);
    }

    await exhaustMicrotasks();
    expect(apiManager.sendEvents).not.toHaveBeenCalled();

    await repeater.execute(0);
    await exhaustMicrotasks();
    expect(apiManager.sendEvents).toHaveBeenCalledTimes(1);
    expect(apiManager.sendEvents).toHaveBeenNthCalledWith(1, config, events);
  });

  it('should reset the repeater after flush', async () => {
    const repeater = getMockRepeater();

    const apiManager = getMockApiManager();
    apiManager.sendEvents.mockResolvedValue({ statusCode: 200 });

    const odpEventManager = new DefaultOdpEventManager({
      repeater: repeater,
      apiManager: apiManager,
      batchSize: 30,
      retryConfig: {
        maxRetries: 3,
        backoffProvider: vi.fn(),
      },
    });

    odpEventManager.updateConfig({
      integrated: true,
      odpConfig: config,
    });

    odpEventManager.start();
    await expect(odpEventManager.onRunning()).resolves.not.toThrow();

    const events: OdpEvent[] = [];
    for(let i = 0; i < 10; i++) {
      events.push(makeEvent(i));
      odpEventManager.sendEvent(events[i]);
    }

    await exhaustMicrotasks();
    expect(apiManager.sendEvents).not.toHaveBeenCalled();

    expect(repeater.reset).not.toHaveBeenCalled();

    await repeater.execute(0);
    await exhaustMicrotasks();
    expect(apiManager.sendEvents).toHaveBeenCalledTimes(1);
    expect(apiManager.sendEvents).toHaveBeenNthCalledWith(1, config, events);
    expect(repeater.reset).toHaveBeenCalledTimes(1);
  });

  it('should retry specified number of times with backoff if apiManager.sendEvents returns a rejecting promise', async () => {
    const repeater = getMockRepeater();

    const apiManager = getMockApiManager();
    apiManager.sendEvents.mockReturnValue(Promise.reject(new Error(FAILED_TO_DISPATCH_EVENTS)));

    const backoffController = {
      backoff: vi.fn().mockReturnValue(666),
      reset: vi.fn(),
    };

    const maxRetries = 5;
    const retryConfig = {
      maxRetries,
      backoffProvider: () => backoffController,
    };

    const odpEventManager = new DefaultOdpEventManager({
      repeater: repeater,
      apiManager: apiManager,
      batchSize: 30,
      retryConfig: retryConfig,
    });

    odpEventManager.updateConfig({
      integrated: true,
      odpConfig: config,
    });

    odpEventManager.start();
    await expect(odpEventManager.onRunning()).resolves.not.toThrow();

    const events: OdpEvent[] = [];
    for(let i = 0; i < 10; i++) {
      events.push(makeEvent(i));
      odpEventManager.sendEvent(events[i]);
    }

    await exhaustMicrotasks();
    expect(apiManager.sendEvents).not.toHaveBeenCalled();

    repeater.execute(0);
    for(let i = 1; i <= maxRetries; i++) {
      await exhaustMicrotasks();
      await advanceTimersByTime(666);
      expect(apiManager.sendEvents).toHaveBeenCalledTimes(i + 1);
      expect(apiManager.sendEvents).toHaveBeenNthCalledWith(i, config, events);
      expect(backoffController.backoff).toHaveBeenCalledTimes(i);
    }
  });

  it('should retry specified number of times with backoff if apiManager returns 5xx', async () => {
    const repeater = getMockRepeater();

    const apiManager = getMockApiManager();
    apiManager.sendEvents.mockReturnValue(Promise.resolve({ statusCode: 500 }));

    const backoffController = {
      backoff: vi.fn().mockReturnValue(666),
      reset: vi.fn(),
    };

    const maxRetries = 5;
    const retryConfig = {
      maxRetries,
      backoffProvider: () => backoffController,
    };

    const odpEventManager = new DefaultOdpEventManager({
      repeater: repeater,
      apiManager: apiManager,
      batchSize: 30,
      retryConfig: retryConfig,
    });

    odpEventManager.updateConfig({
      integrated: true,
      odpConfig: config,
    });

    odpEventManager.start();
    await expect(odpEventManager.onRunning()).resolves.not.toThrow();

    const events: OdpEvent[] = [];
    for(let i = 0; i < 10; i++) {
      events.push(makeEvent(i));
      odpEventManager.sendEvent(events[i]);
    }

    await exhaustMicrotasks();
    expect(apiManager.sendEvents).not.toHaveBeenCalled();

    repeater.execute(0);
    for(let i = 1; i <= maxRetries; i++) {
      await exhaustMicrotasks();
      await advanceTimersByTime(666);
      expect(apiManager.sendEvents).toHaveBeenCalledTimes(i + 1);
      expect(apiManager.sendEvents).toHaveBeenNthCalledWith(i, config, events);
      expect(backoffController.backoff).toHaveBeenCalledTimes(i);
    }
  });

  it('should log error if event sends fails even after retry', async () => {
    const repeater = getMockRepeater();

    const apiManager = getMockApiManager();
    apiManager.sendEvents.mockReturnValue(Promise.reject(new Error(FAILED_TO_DISPATCH_EVENTS)));

    const backoffController = {
      backoff: vi.fn().mockReturnValue(666),
      reset: vi.fn(),
    };

    const maxRetries = 5;
    const retryConfig = {
      maxRetries,
      backoffProvider: () => backoffController,
    };

    const logger = getMockLogger();
    const odpEventManager = new DefaultOdpEventManager({
      repeater: repeater,
      apiManager: apiManager,
      batchSize: 30,
      retryConfig: retryConfig,
    });

    odpEventManager.setLogger(logger);
    odpEventManager.updateConfig({
      integrated: true,
      odpConfig: config,
    });

    odpEventManager.start();
    await expect(odpEventManager.onRunning()).resolves.not.toThrow();

    const events: OdpEvent[] = [];
    for(let i = 0; i < 10; i++) {
      events.push(makeEvent(i));
      odpEventManager.sendEvent(events[i]);
    }

    await exhaustMicrotasks();
    expect(apiManager.sendEvents).not.toHaveBeenCalled();

    repeater.execute(0);
    for(let i = 1; i <= maxRetries; i++) {
      await exhaustMicrotasks();
      await advanceTimersByTime(666);
      expect(apiManager.sendEvents).toHaveBeenCalledTimes(i + 1);
      expect(apiManager.sendEvents).toHaveBeenNthCalledWith(i, config, events);
      expect(backoffController.backoff).toHaveBeenCalledTimes(i);
    }

    await exhaustMicrotasks();
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('flushes the queue with old config if updateConfig is called with a new config', async () => {
    const repeater = getMockRepeater();

    const apiManager = getMockApiManager();
    apiManager.sendEvents.mockResolvedValue({ statusCode: 200 });

    const odpEventManager = new DefaultOdpEventManager({
      repeater: repeater,
      apiManager: apiManager,
      batchSize: 30,
      retryConfig: {
        maxRetries: 3,
        backoffProvider: vi.fn(),
      },
    });

    odpEventManager.updateConfig({
      integrated: true,
      odpConfig: config,
    });

    odpEventManager.start();
    await expect(odpEventManager.onRunning()).resolves.not.toThrow();

    const events: OdpEvent[] = [];
    for(let i = 0; i < 10; i++) {
      events.push(makeEvent(i));
      odpEventManager.sendEvent(events[i]);
    }

    await exhaustMicrotasks();
    expect(apiManager.sendEvents).not.toHaveBeenCalled();

    const newConfig = new OdpConfig('new-api-key', 'https://new-odp.example.com', 'https://new-odp.pixel.com', ['new-segment']);
    odpEventManager.updateConfig({
      integrated: true,
      odpConfig: newConfig,
    });

    await exhaustMicrotasks();
    expect(apiManager.sendEvents).toHaveBeenCalledOnce();
    expect(apiManager.sendEvents).toHaveBeenCalledWith(config, events);
  });

  it('uses the new config after updateConfig is called', async () => {
    const repeater = getMockRepeater();

    const apiManager = getMockApiManager();
    apiManager.sendEvents.mockResolvedValue({ statusCode: 200 });

    const odpEventManager = new DefaultOdpEventManager({
      repeater: repeater,
      apiManager: apiManager,
      batchSize: 30,
      retryConfig: {
        maxRetries: 3,
        backoffProvider: vi.fn(),
      },
    });

    odpEventManager.updateConfig({
      integrated: true,
      odpConfig: config,
    });

    odpEventManager.start();
    await expect(odpEventManager.onRunning()).resolves.not.toThrow();

    const events: OdpEvent[] = [];
    for(let i = 0; i < 10; i++) {
      events.push(makeEvent(i));
      odpEventManager.sendEvent(events[i]);
    }

    await exhaustMicrotasks();
    expect(apiManager.sendEvents).not.toHaveBeenCalled();

    const newConfig = new OdpConfig('new-api-key', 'https://new-odp.example.com', 'https://new-odp.pixel.com', ['new-segment']);
    odpEventManager.updateConfig({
      integrated: true,
      odpConfig: newConfig,
    });

    const newEvents: OdpEvent[] = [];
    for(let i = 0; i < 10; i++) {
      newEvents.push(makeEvent(i + 10));
      odpEventManager.sendEvent(newEvents[i]);
    }

    repeater.execute(0);
    await exhaustMicrotasks();
    expect(apiManager.sendEvents).toHaveBeenCalledTimes(2);
    expect(apiManager.sendEvents).toHaveBeenNthCalledWith(1, config, events);
    expect(apiManager.sendEvents).toHaveBeenNthCalledWith(2, newConfig, newEvents);
  });

  it('should reject onRunning() if stop() is called in new state', async () => {
    const odpEventManager = new DefaultOdpEventManager({
      repeater: getMockRepeater(),
      apiManager: getMockApiManager(),
      batchSize: 10,
      retryConfig: {
        maxRetries: 3,
        backoffProvider: vi.fn(),
      },
    });

    odpEventManager.stop();
    await expect(odpEventManager.onRunning()).rejects.toThrow();
  });

  it('should flush the queue and reset the repeater if stop() is called in running state', async () => {
    const repeater = getMockRepeater();

    const apiManager = getMockApiManager();
    apiManager.sendEvents.mockResolvedValue({ statusCode: 200 });

    const odpEventManager = new DefaultOdpEventManager({
      repeater: repeater,
      apiManager: apiManager,
      batchSize: 30,
      retryConfig: {
        maxRetries: 3,
        backoffProvider: vi.fn(),
      },
    });

    odpEventManager.updateConfig({
      integrated: true,
      odpConfig: config,
    });

    odpEventManager.start();
    await expect(odpEventManager.onRunning()).resolves.not.toThrow();

    const events: OdpEvent[] = [];
    for(let i = 0; i < 10; i++) {
      events.push(makeEvent(i));
      odpEventManager.sendEvent(events[i]);
    }

    await exhaustMicrotasks();
    expect(apiManager.sendEvents).not.toHaveBeenCalled();

    odpEventManager.stop();
    await exhaustMicrotasks();
    expect(apiManager.sendEvents).toHaveBeenCalledTimes(1);
    expect(apiManager.sendEvents).toHaveBeenCalledWith(config, events);
    expect(repeater.reset).toHaveBeenCalledTimes(1);
  });

  it('resolve onTerminated() and go to Terminated state if stop() is called in running state', async () => {
    const repeater = getMockRepeater();

    const apiManager = getMockApiManager();
    apiManager.sendEvents.mockResolvedValue({ statusCode: 200 });

    const odpEventManager = new DefaultOdpEventManager({
      repeater: repeater,
      apiManager: apiManager,
      batchSize: 30,
      retryConfig: {
        maxRetries: 3,
        backoffProvider: vi.fn(),
      },
    });

    odpEventManager.updateConfig({
      integrated: true,
      odpConfig: config,
    });

    odpEventManager.start();
    await expect(odpEventManager.onRunning()).resolves.not.toThrow();

    odpEventManager.stop();
    await expect(odpEventManager.onTerminated()).resolves.not.toThrow();
    expect(odpEventManager.getState()).toBe(ServiceState.Terminated);
  });
});
