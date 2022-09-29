/**
 * Copyright 2022, Optimizely
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

import { OdpConfig } from '../lib/plugins/odp/odp_config';
import { OdpEventManager } from '../lib/plugins/odp/odp_event_manager';
import { anything, capture, instance, mock, resetCalls, verify, when } from 'ts-mockito';
import { RestApiManager } from '../lib/plugins/odp/rest_api_manager';
import { LogHandler, LogLevel } from '../lib/modules/logging';
import { OdpEvent } from '../lib/plugins/odp/odp_event';
import { RequestHandler } from '../lib/utils/http_request_handler/http';
import { OdpEventDispatcher, STATE } from '../lib/plugins/odp/odp_event_dispatcher';

const API_KEY = 'test-api-key';
const API_HOST = 'https://odp.example.com';
const MOCK_PROCESS_VERSION = 'v16.17.0';
const MOCK_IDEMPOTENCE_ID = 'c1dc758e-f095-4f09-9b49-172d74c53880';
const EVENTS: OdpEvent[] = [
  new OdpEvent(
    't1',
    'a1',
    new Map([['id-key-1', 'id-value-1']]),
    new Map(Object.entries({
      'key-1': 'value1',
      'key-2': null,
      'key-3': 3.3,
      'key-4': true,
    })),
  ),
  new OdpEvent(
    't2',
    'a2',
    new Map([['id-key-2', 'id-value-2']]),
    new Map(Object.entries({
      'key-2': 'value2',
    })),
  ),
];
const PROCESSED_EVENTS: OdpEvent[] = [
  new OdpEvent(
    't1',
    'a1',
    new Map([['id-key-1', 'id-value-1']]),
    new Map(Object.entries({
      'idempotence_id': MOCK_IDEMPOTENCE_ID,
      'data_source_type': 'sdk',
      'data_source': 'javascript-sdk',
      'data_source_version': MOCK_PROCESS_VERSION,
      'key-1': 'value1',
      'key-2': null,
      'key-3': 3.3,
      'key-4': true,
    })),
  ),
  new OdpEvent(
    't2',
    'a2',
    new Map([['id-key-2', 'id-value-2']]),
    new Map(Object.entries({
      'idempotence_id': MOCK_IDEMPOTENCE_ID,
      'data_source_type': 'sdk',
      'data_source': 'javascript-sdk',
      'data_source_version': MOCK_PROCESS_VERSION,
      'key-2': 'value2',
    })),
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
    abort: () => {
    },
    responsePromise: Promise.resolve({
      statusCode,
      body,
      headers: {},
    }),
  };
};

describe('OdpEventManager', () => {
  let mockLogger: LogHandler;
  let mockRestApiManager: RestApiManager;
  let odpConfig: OdpConfig;

  beforeAll(() => {
    mockLogger = mock<LogHandler>();
    mockRestApiManager = mock<RestApiManager>();
    odpConfig = new OdpConfig(API_KEY, API_HOST, []);
  });

  beforeEach(() => {
    resetCalls(mockLogger);
    resetCalls(mockRestApiManager);
  });

  it('should log and discard events when event manager not running', () => {
    const logger = instance(mockLogger);
    const eventDispatcher = new OdpEventDispatcher(odpConfig, instance(mockRestApiManager), logger);
    const eventManager = new OdpEventManager(eventDispatcher, logger);
    // since we've not called start() then...

    eventManager.sendEvent(EVENTS[0]);

    // ...we should get a notice after trying to send an event
    verify(mockLogger.log(LogLevel.WARNING, 'Failed to Process ODP Event. ODPEventManager is not running.')).once();
  });

  it('should log and discard events when event manager is not ready', () => {
    const logger = instance(mockLogger);
    const mockOdpConfig = mock<OdpConfig>();
    when(mockOdpConfig.isReady()).thenReturn(false);
    const eventDispatcher = new OdpEventDispatcher(instance(mockOdpConfig), instance(mockRestApiManager), logger);
    eventDispatcher['state'] = STATE.RUNNING; // simulate dispatcher already running
    const eventManager = new OdpEventManager(eventDispatcher, logger);

    eventManager.sendEvent(EVENTS[0]);

    verify(mockLogger.log(LogLevel.DEBUG, 'Unable to Process ODP Event. ODPConfig is not ready.')).once();
  });

  it('should log a max queue hit and discard ', () => {
    const logger = instance(mockLogger);
    const mockOdpConfig = mock<OdpConfig>();
    when(mockOdpConfig.isReady()).thenReturn(false);
    const eventDispatcher = new OdpEventDispatcher(mockOdpConfig, instance(mockRestApiManager), logger, 1);
    eventDispatcher['state'] = STATE.RUNNING; // simulate dispatcher already running
    eventDispatcher['queue'].push(EVENTS[0]);
    const eventManager = new OdpEventManager(eventDispatcher, logger);

    eventManager.sendEvent(EVENTS[1]);

    verify(mockLogger.log(LogLevel.WARNING, 'Failed to Process ODP Event. Event Queue full. queueSize = 1.')).once();
  });

  it('should add additional information to each event', () => {
    const logger = instance(mockLogger);
    const eventDispatcher = new OdpEventDispatcher(odpConfig, instance(mockRestApiManager), logger);
    const eventManager = new OdpEventManager(eventDispatcher, logger);
    const processedEventData = PROCESSED_EVENTS[0].data;

    const eventData = eventManager['augmentCommonData'](EVENTS[0].data);

    expect((eventData.get('idempotence_id') as string).length).toEqual((processedEventData.get('idempotence_id') as string).length);
    expect(eventData.get('data_source_type')).toEqual(processedEventData.get('data_source_type'));
    expect(eventData.get('data_source')).toEqual(processedEventData.get('data_source'));
    expect(eventData.get('data_source_version')).not.toBeNull();
    expect(eventData.get('key-1')).toEqual(processedEventData.get('key-1'));
    expect(eventData.get('key-2')).toEqual(processedEventData.get('key-2'));
    expect(eventData.get('key-3')).toEqual(processedEventData.get('key-3'));
    expect(eventData.get('key-4')).toEqual(processedEventData.get('key-4'));
  });

  it('should dispatch events in correct number of batches', async () => {
    const logger = instance(mockLogger);
    when(mockRestApiManager.sendEvents(anything(), anything(), anything())).thenResolve(false);
    const eventDispatcher = new OdpEventDispatcher(odpConfig, instance(mockRestApiManager), logger, 100, 10, 100);
    const eventManager = new OdpEventManager(eventDispatcher, logger);

    eventManager.start();
    for (let i = 0; i < 25; i += 1) {
      eventManager.sendEvent(makeEvent(i));
    }
    await pause(1500);

    // 3 batches:  batch #1 with 10, batch #2 with 10, and batch #3 with 5 = 25 events
    verify(mockRestApiManager.sendEvents(anything(), anything(), anything())).thrice();
  });

  it('should dispatch events with correct payload', async () => {
    const logger = instance(mockLogger);
    const eventDispatcher = new OdpEventDispatcher(odpConfig, instance(mockRestApiManager), logger, 100, 10, 100);
    const eventManager = new OdpEventManager(eventDispatcher, logger);

    eventManager.start();
    eventManager.sendEvents(EVENTS);
    await pause(1500);

    verify(mockRestApiManager.sendEvents(anything(), anything(), anything())).once();
    const [apiKey, apiHost, events] = capture(mockRestApiManager.sendEvents).last();
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
    when(mockRestApiManager.sendEvents(anything(), anything(), anything())).thenResolve(true);
    const logger = instance(mockLogger);
    // batch size of 2
    const eventDispatcher = new OdpEventDispatcher(odpConfig, instance(mockRestApiManager), logger, 100, 2, 100);
    const eventManager = new OdpEventManager(eventDispatcher, logger);

    eventManager.start();
    // send 4 events
    for (let i = 0; i < 4; i += 1) {
      eventManager.sendEvent(makeEvent(i));
    }
    await pause(1500);

    // retry 3x for 2 batches or 6 calls to attempt to process the 4 events
    verify(mockRestApiManager.sendEvents(anything(), anything(), anything())).times(6);
  });

  it('should flush all scheduled events before stopping', async () => {
    const logger = instance(mockLogger);
    when(mockRestApiManager.sendEvents(anything(), anything(), anything())).thenResolve(false);
    const eventDispatcher = new OdpEventDispatcher(odpConfig, instance(mockRestApiManager), logger, 100, 10, 100);
    const eventManager = new OdpEventManager(eventDispatcher, logger);

    eventManager.start();
    for (let i = 0; i < 25; i += 1) {
      eventManager.sendEvent(makeEvent(i));
    }
    await pause(1500);
    // eventManager.signalStop();
    // TODO: These can't be succeeding since signalStop() not called above
    verify(mockLogger.log(LogLevel.DEBUG, 'EventDispatcher stop requested.'));
    verify(mockLogger.log(LogLevel.DEBUG, 'EventDispatcher draining queue without flush interval.'));
  });

  it('should prepare correct payload for identify user', async () => {
    const mockRequestHandler: RequestHandler = mock<RequestHandler>();
    when(mockRequestHandler.makeRequest(anything(), anything(), anything(), anything())).thenReturn(abortableRequest(200, ''));
    const logger = instance(mockLogger);
    const restApiManager = new RestApiManager(instance(mockRequestHandler), logger);
    const eventDispatcher = new OdpEventDispatcher(odpConfig, restApiManager, logger, 100, 10, 100);
    const eventManager = new OdpEventManager(eventDispatcher, logger);
    const vuid = 'vuid_330e05cad15746d9af8a75b8d10';
    const fsUserId = 'test-fs-user-id';

    eventManager.start();
    eventManager.identifyUser(vuid, fsUserId);
    await pause(1500);

    const [requestUrl, headers, method, data] = capture(mockRequestHandler.makeRequest).last();
    expect(requestUrl).toEqual(`${API_HOST}/v3/events`);
    expect(headers['Content-Type']).toEqual('application/json');
    expect(headers['x-api-key']).toEqual('test-api-key');
    expect(method).toEqual('POST');
    const events = JSON.parse(data as string);
    const event = events[0];
    expect(event.type).toEqual('fullstack');
    expect(event.action).toEqual('client_initialized');
    expect(event.identifiers).toEqual({ 'vuid': vuid, 'fs_user_id': fsUserId });
    expect(event.data.idempotence_id.length).toBe(36); // uuid length
    expect(event.data.data_source_type).toEqual('sdk');
    expect(event.data.data_source).toEqual('javascript-sdk');
    expect(event.data.data_source_version).not.toBeNull();
  });

  it('should apply updated ODP configuration when available', () => {
    const eventDispatcher = new OdpEventDispatcher(odpConfig, instance(mockRestApiManager), instance(mockLogger));
    const eventManager = new OdpEventManager(eventDispatcher, mockLogger);
    const apiKey = 'testing-api-key';
    const apiHost = 'https://some.other.example.com';
    const segmentsToCheck = ['empty-cart', '1-item-cart'];
    const differentOdpConfig = new OdpConfig(apiKey, apiHost, segmentsToCheck);

    eventManager.updateSettings(differentOdpConfig);

    expect(eventManager['eventDispatcher']['odpConfig'].apiKey).toEqual(apiKey);
    expect(eventManager['eventDispatcher']['odpConfig'].apiHost).toEqual(apiHost);
    expect(eventManager['eventDispatcher']['odpConfig'].segmentsToCheck).toContain(segmentsToCheck[0]);
    expect(eventManager['eventDispatcher']['odpConfig'].segmentsToCheck).toContain(segmentsToCheck[1]);
  });
});
