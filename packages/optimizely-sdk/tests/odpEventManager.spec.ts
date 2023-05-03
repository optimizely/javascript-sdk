/**
 * Copyright 2022-2023, Optimizely
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

import { ODP_EVENT_ACTION, ODP_DEFAULT_EVENT_TYPE } from './../lib/utils/enums/index';

import { OdpConfig } from '../lib/core/odp/odp_config';
import { STATE } from '../lib/core/odp/odp_event_manager';
import { NodeOdpEventManager as OdpEventManager } from '../lib/plugins/odp/event_manager/index.node';
import { anything, capture, instance, mock, resetCalls, spy, verify, when } from 'ts-mockito';
import { NodeOdpEventApiManager as OdpEventApiManager } from '../lib/plugins/odp/event_api_manager/index.node';
import { LogHandler, LogLevel } from '../lib/modules/logging';
import { OdpEvent } from '../lib/core/odp/odp_event';
import { RequestHandler } from '../lib/utils/http_request_handler/http';

const API_KEY = 'test-api-key';
const API_HOST = 'https://odp.example.com';
const MOCK_IDEMPOTENCE_ID = 'c1dc758e-f095-4f09-9b49-172d74c53880';
const EVENTS: OdpEvent[] = [
  new OdpEvent(
    't1',
    'a1',
    new Map([['id-key-1', 'id-value-1']]),
    new Map(
      Object.entries({
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

describe('OdpEventManager', () => {
  let mockLogger: LogHandler;
  let mockApiManager: OdpEventApiManager;

  let odpConfig: OdpConfig;
  let logger: LogHandler;
  let apiManager: OdpEventApiManager;

  beforeAll(() => {
    mockLogger = mock<LogHandler>();
    mockApiManager = mock<OdpEventApiManager>();

    odpConfig = new OdpConfig(API_KEY, API_HOST, []);
    logger = instance(mockLogger);
    apiManager = instance(mockApiManager);
  });

  beforeEach(() => {
    resetCalls(mockLogger);
    resetCalls(mockApiManager);
  });

  it('should log and discard events when event manager not running', () => {
    const eventManager = new OdpEventManager({
      odpConfig,
      apiManager,
      logger,
      clientEngine,
      clientVersion,
    });
    // since we've not called start() then...

    eventManager.sendEvent(EVENTS[0]);

    // ...we should get a notice after trying to send an event
    verify(mockLogger.log(LogLevel.WARNING, 'Failed to Process ODP Event. ODPEventManager is not running.')).once();
  });

  it('should log and discard events when event manager config is not ready', () => {
    const mockOdpConfig = mock<OdpConfig>();
    when(mockOdpConfig.isReady()).thenReturn(false);
    const odpConfig = instance(mockOdpConfig);
    const eventManager = new OdpEventManager({
      odpConfig,
      apiManager,
      logger,
      clientEngine,
      clientVersion,
    });
    eventManager['state'] = STATE.RUNNING; // simulate running without calling start()

    eventManager.sendEvent(EVENTS[0]);

    // In a Node context, the events should be discarded
    verify(mockLogger.log(LogLevel.WARNING, 'ODPConfig not ready. Discarding events in queue.')).once();
  });

  it('should discard events with invalid data', () => {
    const eventManager = new OdpEventManager({
      odpConfig,
      apiManager,
      logger,
      clientEngine,
      clientVersion,
    });
    // make an event with invalid data key-value entry
    const badEvent = new OdpEvent(
      't3',
      'a3',
      new Map([['id-key-3', 'id-value-3']]),
      new Map(
        Object.entries({
          'key-1': false,
          'key-2': { random: 'object', whichShouldFail: true },
        })
      )
    );
    eventManager.sendEvent(badEvent);

    verify(mockLogger.log(LogLevel.ERROR, 'Event data found to be invalid.')).once();
  });

  it('should log a max queue hit and discard ', () => {
    // set queue to maximum of 1
    const eventManager = new OdpEventManager({
      odpConfig,
      apiManager,
      logger,
      clientEngine,
      clientVersion,
      queueSize: 1, // With max queue size set to 1...
    });
    eventManager['state'] = STATE.RUNNING;
    eventManager['queue'].push(EVENTS[0]); // simulate 1 event already in the queue then...

    // ...try adding the second event
    eventManager.sendEvent(EVENTS[1]);

    verify(
      mockLogger.log(LogLevel.WARNING, 'Failed to Process ODP Event. Event Queue full. queueSize = %s.', 1)
    ).once();
  });

  it('should add additional information to each event', () => {
    const eventManager = new OdpEventManager({
      odpConfig,
      apiManager,
      logger,
      clientEngine,
      clientVersion,
    });
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

  it('should attempt to flush an empty queue at flush intervals', async () => {
    const eventManager = new OdpEventManager({
      odpConfig,
      apiManager,
      logger,
      clientEngine,
      clientVersion,
      flushInterval: 100,
    });
    const spiedEventManager = spy(eventManager);

    eventManager.start();
    // do not add events to the queue, but allow for...
    await pause(400); // at least 3 flush intervals executions (giving a little longer)

    verify(spiedEventManager['processQueue'](anything())).atLeast(3);
  });

  it('should dispatch events in correct number of batches', async () => {
    when(mockApiManager.sendEvents(anything(), anything(), anything())).thenResolve(false);
    const apiManager = instance(mockApiManager);
    const eventManager = new OdpEventManager({
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
    await pause(1500);

    // ...there should be 3 batches:
    // batch #1 with 10, batch #2 with 10, and batch #3 (after flushInterval lapsed) with 5 = 25 events
    verify(mockApiManager.sendEvents(anything(), anything(), anything())).thrice();
  });

  it('should dispatch events with correct payload', async () => {
    const eventManager = new OdpEventManager({
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
    await pause(1000);

    // sending 1 batch of 2 events after flushInterval since batchSize is 10
    verify(mockApiManager.sendEvents(anything(), anything(), anything())).once();
    const [apiKey, apiHost, events] = capture(mockApiManager.sendEvents).last();
    expect(apiKey).toEqual(API_KEY);
    expect(apiHost).toEqual(API_HOST);
    expect(events.length).toEqual(2);
    expect(events[0].identifiers.size).toEqual(PROCESSED_EVENTS[0].identifiers.size);
    expect(events[0].data.size).toEqual(PROCESSED_EVENTS[0].data.size);
    expect(events[1].identifiers.size).toEqual(PROCESSED_EVENTS[1].identifiers.size);
    expect(events[1].data.size).toEqual(PROCESSED_EVENTS[1].data.size);
  });

  it('should retry failed events', async () => {
    // all events should fail ie shouldRetry = true
    when(mockApiManager.sendEvents(anything(), anything(), anything())).thenResolve(true);
    const apiManager = instance(mockApiManager);
    const eventManager = new OdpEventManager({
      odpConfig,
      apiManager,
      logger,
      clientEngine,
      clientVersion,
      batchSize: 2, // batch size of 2
      flushInterval: 100,
    });

    eventManager.start();
    // send 4 events
    for (let i = 0; i < 4; i += 1) {
      eventManager.sendEvent(makeEvent(i));
    }
    await pause(1500);

    // retry 3x (default) for 2 batches or 6 calls to attempt to process
    verify(mockApiManager.sendEvents(anything(), anything(), anything())).times(6);
  });

  it('should flush all scheduled events before stopping', async () => {
    when(mockApiManager.sendEvents(anything(), anything(), anything())).thenResolve(false);
    const apiManager = instance(mockApiManager);
    const eventManager = new OdpEventManager({
      odpConfig,
      apiManager,
      logger,
      clientEngine,
      clientVersion,
      batchSize: 2, // batches of 2 with...
      flushInterval: 100,
    });

    eventManager.start();
    // ...25 events should...
    for (let i = 0; i < 25; i += 1) {
      eventManager.sendEvent(makeEvent(i));
    }
    await pause(300);
    await eventManager.stop();

    verify(mockLogger.log(LogLevel.DEBUG, 'Stop requested.')).once();
    verify(mockLogger.log(LogLevel.DEBUG, 'Stopped. Queue Count: %s', 0)).once();
  });

  it('should prepare correct payload for register VUID', async () => {
    const mockRequestHandler: RequestHandler = mock<RequestHandler>();
    when(mockRequestHandler.makeRequest(anything(), anything(), anything(), anything())).thenReturn(
      abortableRequest(200, '')
    );
    const apiManager = new OdpEventApiManager(instance(mockRequestHandler), logger);
    const eventManager = new OdpEventManager({
      odpConfig,
      apiManager,
      logger,
      clientEngine,
      clientVersion,
      batchSize: 10,
      flushInterval: 100,
    });
    const vuid = 'vuid_330e05cad15746d9af8a75b8d10';

    eventManager.start();
    eventManager.registerVuid(vuid);
    await pause(1500);

    const [requestUrl, headers, method, data] = capture(mockRequestHandler.makeRequest).last();
    expect(requestUrl).toEqual(`${API_HOST}/v3/events`);
    expect(headers['Content-Type']).toEqual('application/json');
    expect(headers['x-api-key']).toEqual('test-api-key');
    expect(method).toEqual('POST');
    const events = JSON.parse(data as string);
    const event = events[0];
    expect(event.type).toEqual('fullstack');
    expect(event.action).toEqual(ODP_EVENT_ACTION.INITIALIZED);
    expect(event.identifiers).toEqual({ vuid: vuid });
    expect(event.data.idempotence_id.length).toBe(36); // uuid length
    expect(event.data.data_source_type).toEqual('sdk');
    expect(event.data.data_source).toEqual('javascript-sdk');
    expect(event.data.data_source_version).not.toBeNull();
  });

  it('should prepare correct payload for identify user', async () => {
    const mockRequestHandler: RequestHandler = mock<RequestHandler>();
    when(mockRequestHandler.makeRequest(anything(), anything(), anything(), anything())).thenReturn(
      abortableRequest(200, '')
    );
    const apiManager = new OdpEventApiManager(instance(mockRequestHandler), logger);
    const eventManager = new OdpEventManager({
      odpConfig,
      apiManager,
      logger,
      clientEngine,
      clientVersion,
      flushInterval: 100,
    });
    const vuid = 'vuid_330e05cad15746d9af8a75b8d10';
    const fsUserId = 'test-fs-user-id';

    eventManager.start();
    eventManager.identifyUser(fsUserId, vuid);
    await pause(1500);

    const [requestUrl, headers, method, data] = capture(mockRequestHandler.makeRequest).last();
    expect(requestUrl).toEqual(`${API_HOST}/v3/events`);
    expect(headers['Content-Type']).toEqual('application/json');
    expect(headers['x-api-key']).toEqual('test-api-key');
    expect(method).toEqual('POST');
    const events = JSON.parse(data as string);
    const event = events[0];
    expect(event.type).toEqual(ODP_DEFAULT_EVENT_TYPE);
    expect(event.action).toEqual(ODP_EVENT_ACTION.IDENTIFIED);
    expect(event.identifiers).toEqual({ vuid: vuid, fs_user_id: fsUserId });
    expect(event.data.idempotence_id.length).toBe(36); // uuid length
    expect(event.data.data_source_type).toEqual('sdk');
    expect(event.data.data_source).toEqual('javascript-sdk');
    expect(event.data.data_source_version).not.toBeNull();
  });

  it('should apply updated ODP configuration when available', () => {
    const eventManager = new OdpEventManager({
      odpConfig,
      apiManager,
      logger,
      clientEngine,
      clientVersion,
    });
    const apiKey = 'testing-api-key';
    const apiHost = 'https://some.other.example.com';
    const segmentsToCheck = ['empty-cart', '1-item-cart'];
    const differentOdpConfig = new OdpConfig(apiKey, apiHost, segmentsToCheck);

    eventManager.updateSettings(differentOdpConfig);

    expect(eventManager['odpConfig'].apiKey).toEqual(apiKey);
    expect(eventManager['odpConfig'].apiHost).toEqual(apiHost);
    expect(eventManager['odpConfig'].segmentsToCheck).toContain(Array.from(segmentsToCheck)[0]);
    expect(eventManager['odpConfig'].segmentsToCheck).toContain(Array.from(segmentsToCheck)[1]);
  });
});
