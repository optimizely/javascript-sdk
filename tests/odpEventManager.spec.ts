/**
 * Copyright 2022-2024, Optimizely
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
import { describe, beforeEach, afterEach, beforeAll, it, vi, expect } from 'vitest';

import { ODP_EVENT_ACTION, ODP_DEFAULT_EVENT_TYPE, ERROR_MESSAGES } from '../lib/utils/enums';
import { OdpConfig } from '../lib/odp/odp_config';
import { Status } from '../lib/odp/event_manager/odp_event_manager';
import { BrowserOdpEventManager } from '../lib/odp/event_manager/event_manager.browser';
import { NodeOdpEventManager } from '../lib/odp/event_manager/event_manager.node';
import { OdpEventManager } from '../lib/odp/event_manager/odp_event_manager';
import { anything, capture, instance, mock, resetCalls, spy, verify, when } from 'ts-mockito';
import { IOdpEventApiManager } from '../lib/odp/event_manager/odp_event_api_manager';
import { LogHandler, LogLevel } from '../lib/modules/logging';
import { OdpEvent } from '../lib/odp/event_manager/odp_event';
import { IUserAgentParser } from '../lib/odp/ua_parser/user_agent_parser';
import { UserAgentInfo } from '../lib/odp/ua_parser/user_agent_info';
import { resolve } from 'path';
import { advanceTimersByTime } from './testUtils';

const API_KEY = 'test-api-key';
const API_HOST = 'https://odp.example.com';
const PIXEL_URL = 'https://odp.pixel.com';
const MOCK_IDEMPOTENCE_ID = 'c1dc758e-f095-4f09-9b49-172d74c53880';
const EVENTS: OdpEvent[] = [
  new OdpEvent(
    't1',
    'a1',
    new Map([['id-key-1', 'id-value-1']]),
    new Map<string, unknown>([
        ['key-1', 'value1'],
        ['key-2', null],
        ['key-3', 3.3],
        ['key-4', true],
    ]),
  ),
  new OdpEvent(
    't2',
    'a2',
    new Map([['id-key-2', 'id-value-2']]),
    new Map(
      Object.entries({
        'key-2': 'value2',
        data_source: 'my-source',
      })
    )
  ),
];
// naming for object destructuring
const clientEngine = 'javascript-sdk';
const clientVersion = '4.9.3';
const PROCESSED_EVENTS: OdpEvent[] = [
  new OdpEvent(
    't1',
    'a1',
    new Map([['id-key-1', 'id-value-1']]),
    new Map(
      Object.entries({
        idempotence_id: MOCK_IDEMPOTENCE_ID,
        data_source_type: 'sdk',
        data_source: clientEngine,
        data_source_version: clientVersion,
        'key-1': 'value1',
        'key-2': null,
        'key-3': 3.3,
        'key-4': true,
      })
    )
  ),
  new OdpEvent(
    't2',
    'a2',
    new Map([['id-key-2', 'id-value-2']]),
    new Map(
      Object.entries({
        idempotence_id: MOCK_IDEMPOTENCE_ID,
        data_source_type: 'sdk',
        data_source: clientEngine,
        data_source_version: clientVersion,
        'key-2': 'value2',
      })
    )
  ),
];
const EVENT_WITH_EMPTY_IDENTIFIER  = new OdpEvent(
    't4',
    'a4',
    new Map(),
    new Map<string, unknown>([
      ['key-53f3', true],
      ['key-a04a', 123],
      ['key-2ab4', 'Linus Torvalds'],
    ]),
);
const EVENT_WITH_UNDEFINED_IDENTIFIER  = new OdpEvent(
    't4',
    'a4',
    undefined,
    new Map<string, unknown>([
      ['key-53f3', false],
      ['key-a04a', 456],
      ['key-2ab4', 'Bill Gates']
    ]),
);
const makeEvent = (id: number) => {
  const identifiers = new Map<string, string>();
  identifiers.set('identifier1', 'value1-' + id);
  identifiers.set('identifier2', 'value2-' + id);

  const data = new Map<string, unknown>();
  data.set('data1', 'data-value1-' + id);
  data.set('data2', id);

  return new OdpEvent('test-type-' + id, 'test-action-' + id, identifiers, data);
};
const pause = (timeoutMilliseconds: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, timeoutMilliseconds));
};
const abortableRequest = (statusCode: number, body: string) => {
  return {
    abort: () => {},
    responsePromise: Promise.resolve({
      statusCode,
      body,
      headers: {},
    }),
  };
};

class TestOdpEventManager extends OdpEventManager {
  constructor(options: any) {
    super(options);
  }
  protected initParams(batchSize: number, queueSize: number, flushInterval: number): void {
    this.queueSize = queueSize;
    this.batchSize = batchSize;
    this.flushInterval = flushInterval;
  }
  protected discardEventsIfNeeded(): void {
  }
  protected hasNecessaryIdentifiers = (event: OdpEvent): boolean => event.identifiers.size >= 0;
}

describe('OdpEventManager', () => {
  let mockLogger: LogHandler;
  let mockApiManager: IOdpEventApiManager;

  let odpConfig: OdpConfig;
  let logger: LogHandler;
  let apiManager: IOdpEventApiManager;

  beforeAll(() => {
    mockLogger = mock<LogHandler>();
    mockApiManager = mock<IOdpEventApiManager>();
    odpConfig = new OdpConfig(API_KEY, API_HOST, PIXEL_URL, []);
    logger = instance(mockLogger);
    apiManager = instance(mockApiManager);
  });

  beforeEach(() => {
    vi.useFakeTimers();
    resetCalls(mockLogger);
    resetCalls(mockApiManager);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('should log an error and not start if start() is called without a config', () => {
    const eventManager = new TestOdpEventManager({
      odpConfig: undefined,
      apiManager,
      logger,
      clientEngine,
      clientVersion,
    });

    eventManager.start();
    verify(mockLogger.log(LogLevel.ERROR, ERROR_MESSAGES.ODP_CONFIG_NOT_AVAILABLE)).once();
    expect(eventManager.status).toEqual(Status.Stopped);
  });

  it('should start() correctly after odpConfig is provided', () => {
    const eventManager = new TestOdpEventManager({
      odpConfig,
      apiManager,
      logger,
      clientEngine,
      clientVersion,
    });

    expect(eventManager.status).toEqual(Status.Stopped); 
    eventManager.updateSettings(odpConfig);
    eventManager.start();
    expect(eventManager.status).toEqual(Status.Running);
  });

  it('should log and discard events when event manager is not running', () => {
    const eventManager = new TestOdpEventManager({
      odpConfig,
      apiManager,
      logger,
      clientEngine,
      clientVersion,
    });

    expect(eventManager.status).toEqual(Status.Stopped);
    eventManager.sendEvent(EVENTS[0]);
    verify(mockLogger.log(LogLevel.WARNING, 'Failed to Process ODP Event. ODPEventManager is not running.')).once();
    expect(eventManager.getQueue().length).toEqual(0);
  });

  it('should discard events with invalid data', () => {
    const eventManager = new TestOdpEventManager({
      odpConfig,
      apiManager,
      logger,
      clientEngine,
      clientVersion,
    });
    eventManager.start();

    expect(eventManager.status).toEqual(Status.Running);

    // make an event with invalid data key-value entry
    const badEvent = new OdpEvent(
      't3',
      'a3',
      new Map([['id-key-3', 'id-value-3']]),
      new Map<string, unknown>([
          ['key-1', false],
          ['key-2', { random: 'object', whichShouldFail: true }],
      ]),
    );
    eventManager.sendEvent(badEvent);

    verify(mockLogger.log(LogLevel.ERROR, 'Event data found to be invalid.')).once();
    expect(eventManager.getQueue().length).toEqual(0);
  });

  it('should log a max queue hit and discard ', () => {
    // set queue to maximum of 1
    const eventManager = new TestOdpEventManager({
      odpConfig,
      apiManager,
      logger,
      clientEngine,
      clientVersion,
      queueSize: 1, // With max queue size set to 1...
    });

    eventManager.start();

    eventManager['queue'].push(EVENTS[0]); // simulate 1 event already in the queue then...
    // ...try adding the second event
    eventManager.sendEvent(EVENTS[1]);

    verify(
      mockLogger.log(LogLevel.WARNING, 'Failed to Process ODP Event. Event Queue full. queueSize = %s.', 1)
    ).once();
  });

  it('should add additional information to each event', () => {
    const eventManager = new TestOdpEventManager({
      odpConfig,
      apiManager,
      logger,
      clientEngine,
      clientVersion,
    });
    eventManager.start();

    const processedEventData = PROCESSED_EVENTS[0].data;

    const eventData = eventManager['augmentCommonData'](EVENTS[0].data);

    expect((eventData.get('idempotence_id') as string).length).toEqual(
      (processedEventData.get('idempotence_id') as string).length
    );
    expect(eventData.get('data_source_type')).toEqual(processedEventData.get('data_source_type'));
    expect(eventData.get('data_source')).toEqual(processedEventData.get('data_source'));
    expect(eventData.get('data_source_version')).toEqual(processedEventData.get('data_source_version'));
    expect(eventData.get('key-1')).toEqual(processedEventData.get('key-1'));
    expect(eventData.get('key-2')).toEqual(processedEventData.get('key-2'));
    expect(eventData.get('key-3')).toEqual(processedEventData.get('key-3'));
    expect(eventData.get('key-4')).toEqual(processedEventData.get('key-4'));
  });

  it('should attempt to flush an empty queue at flush intervals if batchSize is greater than 1', async () => {
    const eventManager = new TestOdpEventManager({
      odpConfig,
      apiManager,
      logger,
      clientEngine,
      clientVersion,
      batchSize: 10,
      flushInterval: 100,
    });

    //@ts-ignore
    const processQueueSpy = vi.spyOn(eventManager, 'processQueue');

    eventManager.start();
    // do not add events to the queue, but allow for...
    vi.advanceTimersByTime(350); // 3 flush intervals executions (giving a little longer)

    expect(processQueueSpy).toHaveBeenCalledTimes(3);
  });


  it('should not flush periodically if batch size is 1', async () => {
    const eventManager = new TestOdpEventManager({
      odpConfig,
      apiManager,
      logger,
      clientEngine,
      clientVersion,
      batchSize: 1,
      flushInterval: 100,
    });

    //@ts-ignore
    const processQueueSpy = vi.spyOn(eventManager, 'processQueue');

    eventManager.start();
    eventManager.sendEvent(EVENTS[0]);
    eventManager.sendEvent(EVENTS[1]);

    vi.advanceTimersByTime(350); // 3 flush intervals executions (giving a little longer)

    expect(processQueueSpy).toHaveBeenCalledTimes(2);
  });

  it('should dispatch events in correct batch sizes', async () => {
    when(mockApiManager.sendEvents(anything(), anything())).thenResolve(false);

    const apiManager = instance(mockApiManager);
    const eventManager = new TestOdpEventManager({
      odpConfig,
      apiManager,
      logger,
      clientEngine,
      clientVersion,
      batchSize: 10, // with batch size of 10...
      flushInterval: 250,
    });

    eventManager.start();

    for (let i = 0; i < 25; i += 1) {
      eventManager.sendEvent(makeEvent(i));
    }

    await Promise.resolve();

    // as we are not advancing the vi fake timers, no flush should occur
    // ...there should be 3 batches:
    // batch #1 with 10, batch #2 with 10, and batch #3 (after flushInterval lapsed) with 5 = 25 events
    verify(mockApiManager.sendEvents(anything(), anything())).twice();

    // rest of the events should now be flushed
    await advanceTimersByTime(250);
    verify(mockApiManager.sendEvents(anything(), anything())).thrice();
  });

  it('should dispatch events with correct payload', async () => {
    const eventManager = new TestOdpEventManager({
      odpConfig,
      apiManager,
      logger,
      clientEngine,
      clientVersion,
      batchSize: 10,
      flushInterval: 100,
    });

    eventManager.start();
    EVENTS.forEach(event => eventManager.sendEvent(event));

    await advanceTimersByTime(100);
    // sending 1 batch of 2 events after flushInterval since batchSize is 10
    verify(mockApiManager.sendEvents(anything(), anything())).once();
    const [_, events] = capture(mockApiManager.sendEvents).last();
    expect(events.length).toEqual(2);
    expect(events[0].identifiers.size).toEqual(PROCESSED_EVENTS[0].identifiers.size);
    expect(events[0].data.size).toEqual(PROCESSED_EVENTS[0].data.size);
    expect(events[1].identifiers.size).toEqual(PROCESSED_EVENTS[1].identifiers.size);
    expect(events[1].data.size).toEqual(PROCESSED_EVENTS[1].data.size);
  });

  it('should dispatch events with correct odpConfig', async () => {
    const eventManager = new TestOdpEventManager({
      odpConfig,
      apiManager,
      logger,
      clientEngine,
      clientVersion,
      batchSize: 10,
      flushInterval: 100,
    });

    eventManager.start();
    EVENTS.forEach(event => eventManager.sendEvent(event));

    await advanceTimersByTime(100);

    // sending 1 batch of 2 events after flushInterval since batchSize is 10
    verify(mockApiManager.sendEvents(anything(), anything())).once();
    const [usedOdpConfig] = capture(mockApiManager.sendEvents).last();
    expect(usedOdpConfig.equals(odpConfig)).toBeTruthy();
  });

  it('should augment events with data from user agent parser', async () => {
    const userAgentParser : IUserAgentParser = {
      parseUserAgentInfo: function (): UserAgentInfo {
        return {
          os: { 'name': 'windows', 'version': '11' },
          device: { 'type': 'laptop', 'model': 'thinkpad' },
        }
      }
    }

    const eventManager = new TestOdpEventManager({
      odpConfig,
      apiManager,
      logger,
      clientEngine,
      clientVersion,
      batchSize: 10,
      flushInterval: 100,
      userAgentParser,
    });

    eventManager.start();
    EVENTS.forEach(event => eventManager.sendEvent(event));
    await advanceTimersByTime(100);

    verify(mockApiManager.sendEvents(anything(), anything())).called();
    const [_, events] = capture(mockApiManager.sendEvents).last();
    const event = events[0];

    expect(event.data.get('os')).toEqual('windows');
    expect(event.data.get('os_version')).toEqual('11');
    expect(event.data.get('device_type')).toEqual('laptop');
    expect(event.data.get('model')).toEqual('thinkpad');
  });

  it('should retry failed events', async () => {
    when(mockApiManager.sendEvents(anything(), anything())).thenResolve(true)

    const retries = 3;
    const apiManager = instance(mockApiManager);
    const eventManager = new TestOdpEventManager({
      odpConfig,
      apiManager,
      logger,
      clientEngine,
      clientVersion,
      batchSize: 2, 
      flushInterval: 100,
      retries,
    });

    eventManager.start();
    for (let i = 0; i < 4; i += 1) {
      eventManager.sendEvent(makeEvent(i));
    }

    vi.runAllTicks();
    vi.useRealTimers();
    await pause(100);

    // retry 3x for 2 batches or 6 calls to attempt to process
    verify(mockApiManager.sendEvents(anything(), anything())).times(6);
  });

  it('should flush all queued events when flush() is called', async () => {
    when(mockApiManager.sendEvents(anything(), anything())).thenResolve(false);
  
    const apiManager = instance(mockApiManager);
    const eventManager = new TestOdpEventManager({
      odpConfig,
      apiManager,
      logger,
      clientEngine,
      clientVersion,
      batchSize: 200, 
      flushInterval: 100,
    });

    eventManager.start();
    for (let i = 0; i < 25; i += 1) {
      eventManager.sendEvent(makeEvent(i));
    }

    expect(eventManager.getQueue().length).toEqual(25);

    eventManager.flush();
    
    await Promise.resolve();

    verify(mockApiManager.sendEvents(anything(), anything())).once();
    expect(eventManager.getQueue().length).toEqual(0);
  });

  it('should flush all queued events before stopping', async () => {
    when(mockApiManager.sendEvents(anything(), anything())).thenResolve(false);
    const apiManager = instance(mockApiManager);
    const eventManager = new TestOdpEventManager({
      odpConfig,
      apiManager,
      logger,
      clientEngine,
      clientVersion,
      batchSize: 200,
      flushInterval: 100,
    });

    eventManager.start();
    for (let i = 0; i < 25; i += 1) {
      eventManager.sendEvent(makeEvent(i));
    }

    expect(eventManager.getQueue().length).toEqual(25);

    eventManager.flush();
  
    await Promise.resolve();

    verify(mockApiManager.sendEvents(anything(), anything())).once();
    expect(eventManager.getQueue().length).toEqual(0);
  });

  it('should flush all queued events using the old odpConfig when updateSettings is called()', async () => {
    when(mockApiManager.sendEvents(anything(), anything())).thenResolve(false);

    const odpConfig = new OdpConfig('old-key', 'old-host', 'https://new-odp.pixel.com', []);
    const updatedConfig = new OdpConfig('new-key', 'new-host', 'https://new-odp.pixel.com', []);

    const apiManager = instance(mockApiManager);
    const eventManager = new TestOdpEventManager({
      odpConfig,
      apiManager,
      logger,
      clientEngine,
      clientVersion,
      batchSize: 200,
      flushInterval: 100,
    });

    eventManager.start();
    for (let i = 0; i < 25; i += 1) {
      eventManager.sendEvent(makeEvent(i));
    }

    expect(eventManager.getQueue().length).toEqual(25);

    eventManager.updateSettings(updatedConfig);
  
    await Promise.resolve();

    verify(mockApiManager.sendEvents(anything(), anything())).once();
    expect(eventManager.getQueue().length).toEqual(0);
    const [usedOdpConfig] = capture(mockApiManager.sendEvents).last();
    expect(usedOdpConfig.equals(odpConfig)).toBeTruthy();
  });

  it('should use updated odpConfig to send events', async () => {
    when(mockApiManager.sendEvents(anything(), anything())).thenResolve(false);

    const odpConfig = new OdpConfig('old-key', 'old-host', 'https://new-odp.pixel.com', []);
    const updatedConfig = new OdpConfig('new-key', 'new-host', 'https://new-odp.pixel.com', []);

    const apiManager = instance(mockApiManager);
    const eventManager = new TestOdpEventManager({
      odpConfig,
      apiManager,
      logger,
      clientEngine,
      clientVersion,
      batchSize: 200,
      flushInterval: 100,
    });

    eventManager.start();
    for (let i = 0; i < 25; i += 1) {
      eventManager.sendEvent(makeEvent(i));
    }

    expect(eventManager.getQueue().length).toEqual(25);
  
    await advanceTimersByTime(100);

    expect(eventManager.getQueue().length).toEqual(0);
    let [usedOdpConfig] = capture(mockApiManager.sendEvents).first();
    expect(usedOdpConfig.equals(odpConfig)).toBeTruthy();

    eventManager.updateSettings(updatedConfig);

    for (let i = 0; i < 25; i += 1) {
      eventManager.sendEvent(makeEvent(i));
    }

    await advanceTimersByTime(100);

    expect(eventManager.getQueue().length).toEqual(0);
    ([usedOdpConfig] = capture(mockApiManager.sendEvents).last());
    expect(usedOdpConfig.equals(updatedConfig)).toBeTruthy();
  });

  it('should prepare correct payload for register VUID', async () => {
    when(mockApiManager.sendEvents(anything(), anything())).thenResolve(false);

    const apiManager = instance(mockApiManager);

    const eventManager = new TestOdpEventManager({
      odpConfig,
      apiManager,
      logger,
      clientEngine,
      clientVersion,
      batchSize: 10,
      flushInterval: 250,
    });

    const vuid = 'vuid_330e05cad15746d9af8a75b8d10';
    const fsUserId = 'test-fs-user-id';

    eventManager.start();
    eventManager.registerVuid(vuid);

    await advanceTimersByTime(250);

    const [_, events] = capture(mockApiManager.sendEvents).last();
    expect(events.length).toBe(1);

    const [event] = events;
    expect(event.type).toEqual('fullstack');
    expect(event.action).toEqual(ODP_EVENT_ACTION.INITIALIZED);
    expect(event.identifiers).toEqual(new Map([['vuid', vuid]]));
    expect((event.data.get("idempotence_id") as string).length).toBe(36); // uuid length
    expect((event.data.get("data_source_type") as string)).toEqual('sdk');
    expect((event.data.get("data_source") as string)).toEqual('javascript-sdk');
    expect(event.data.get("data_source_version") as string).not.toBeNull();
  });

  it('should send correct event payload for identify user', async () => {
    when(mockApiManager.sendEvents(anything(), anything())).thenResolve(false);

    const apiManager = instance(mockApiManager);

    const eventManager = new TestOdpEventManager({
      odpConfig,
      apiManager,
      logger,
      clientEngine,
      clientVersion,
      batchSize: 10,
      flushInterval: 250,
    });

    const vuid = 'vuid_330e05cad15746d9af8a75b8d10';
    const fsUserId = 'test-fs-user-id';

    eventManager.start();
    eventManager.identifyUser(fsUserId, vuid);

    await advanceTimersByTime(260);

    const [_, events] = capture(mockApiManager.sendEvents).last();
    expect(events.length).toBe(1);

    const [event] = events;
    expect(event.type).toEqual(ODP_DEFAULT_EVENT_TYPE);
    expect(event.action).toEqual(ODP_EVENT_ACTION.IDENTIFIED);
    expect(event.identifiers).toEqual(new Map([['vuid', vuid], ['fs_user_id', fsUserId]]));
    expect((event.data.get("idempotence_id") as string).length).toBe(36); // uuid length
    expect((event.data.get("data_source_type") as string)).toEqual('sdk');
    expect((event.data.get("data_source") as string)).toEqual('javascript-sdk');
    expect(event.data.get("data_source_version") as string).not.toBeNull();
  });

  it('should error when no identifiers are provided in Node', () => {
    const eventManager = new NodeOdpEventManager({
      odpConfig,
      apiManager,
      logger,
      clientEngine,
      clientVersion,
    });

    eventManager.start();
    eventManager.sendEvent(EVENT_WITH_EMPTY_IDENTIFIER);
    eventManager.sendEvent(EVENT_WITH_UNDEFINED_IDENTIFIER);
    eventManager.stop();

    vi.runAllTicks();

    verify(mockLogger.log(LogLevel.ERROR, 'ODP events should have at least one key-value pair in identifiers.')).twice();
  });

  it('should never error when no identifiers are provided in Browser', () => {
    const eventManager = new BrowserOdpEventManager({
      odpConfig,
      apiManager,
      logger,
      clientEngine,
      clientVersion,
    });

    eventManager.start();
    eventManager.sendEvent(EVENT_WITH_EMPTY_IDENTIFIER);
    eventManager.sendEvent(EVENT_WITH_UNDEFINED_IDENTIFIER);
    eventManager.stop();

    vi.runAllTicks();

    verify(mockLogger.log(LogLevel.ERROR, 'ODP events should have at least one key-value pair in identifiers.')).never();
  });
});
