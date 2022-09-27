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
import { anything, capture, instance, mock, resetCalls, spy, verify, when } from 'ts-mockito';
import { RestApiManager } from '../lib/plugins/odp/rest_api_manager';
import { LogHandler, LogLevel } from '../lib/modules/logging';
import { OdpEvent } from '../lib/plugins/odp/odp_event';
import { RequestHandler } from '../lib/utils/http_request_handler/http';
import { OdpEventDispatcher } from '../lib/plugins/odp/odp_event_dispatcher';

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
  let spiedOdpConfig: OdpConfig;
  let mockRestApiManager: RestApiManager;

  beforeAll(() => {
    mockLogger = mock<LogHandler>();
    spiedOdpConfig = spy(new OdpConfig(API_KEY, API_HOST, []));
    mockRestApiManager = mock<RestApiManager>();
  });

  beforeEach(() => {
    resetCalls(mockLogger);

    resetCalls(spiedOdpConfig);

    resetCalls(mockRestApiManager);
    // all sendEvents should succeed ie shouldRetry = false unless specified by test
    when(mockRestApiManager.sendEvents(anything(), anything(), anything())).thenResolve(false);
  });

  const managerInstance = () => new OdpEventManager(spiedOdpConfig, instance(mockRestApiManager), instance(mockLogger));

  it('should log and discard events when event manager not running', () => {
    const eventManager = managerInstance();

    eventManager.sendEvent(EVENTS[0]);

    verify(mockLogger.log(LogLevel.WARNING, 'Failed to Process ODP Event. ODPEventManager is not running.')).once();
  });

  it('should log and discard events when event manager is not ready', () => {
    when(spiedOdpConfig.isReady()).thenReturn(false);
    const eventManager = managerInstance();
    eventManager['isRunning'] = true; // simulate dispatcher already running

    eventManager.sendEvent(EVENTS[0]);

    verify(mockLogger.log(LogLevel.DEBUG, 'Unable to Process ODP Event. ODPConfig is not ready.')).once();
  });

  it('should log a max queue hit and discard ', () => {
    const eventManager = new OdpEventManager(spiedOdpConfig, instance(mockRestApiManager), instance(mockLogger), 1, 1, 1);
    eventManager['isRunning'] = true; // simulate dispatcher already running
    eventManager['eventQueue'].push(EVENTS[0]); // simulate queue already having 1

    eventManager.sendEvent(EVENTS[1]); // try adding to queue

    verify(mockLogger.log(LogLevel.WARNING, 'Failed to Process ODP Event. Event Queue full. queueSize = 1.')).once();
  });

  it('should add additional information to each event', () => {
    const eventManager = managerInstance();
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
    const eventManager = managerInstance();

    eventManager.start();
    for (let i = 0; i < 25; i += 1) {
      eventManager.sendEvent(makeEvent(i));
    }
    await pause(1500);
    eventManager.stop();

    verify(mockRestApiManager.sendEvents(anything(), anything(), anything())).thrice();
  });

  it('should dispatch events with correct payload', async () => {
    const eventManager = new OdpEventManager(spiedOdpConfig, instance(mockRestApiManager), instance(mockLogger), 1);
    const eventDispatcher = new OdpEventDispatcher();
    eventManager.attach(eventDispatcher);
    const processedEvent = PROCESSED_EVENTS[0];

    eventManager.start();
    eventManager.sendEvent(EVENTS[0]);
    //await pause(1500);

    verify(mockRestApiManager.sendEvents(anything(), anything(), anything())).once();
    const [apiKey, apiHost, events] = capture(mockRestApiManager.sendEvents).last();
    expect(apiKey).toEqual(API_KEY);
    expect(apiHost).toEqual(API_HOST);
    expect(events.length).toEqual(2);
    const expectedEvent = events[0];
    expect(expectedEvent.identifiers.size).toEqual(processedEvent.identifiers.size);
    expect(expectedEvent.data.size).toEqual(processedEvent.data.size);
  });

  it('should retry failed events', async () => {
    // all events should fail ie shouldRetry = true
    when(mockRestApiManager.sendEvents(anything(), anything(), anything())).thenResolve(true);
    const eventManager = managerInstance();

    eventManager.start();
    for (let i = 0; i < 25; i += 1) {
      eventManager.sendEvent(makeEvent(i));
    }
    await pause(500);

    verify(mockRestApiManager.sendEvents(anything(), anything(), anything())).times(6);

    await pause(1500);
    verify(mockRestApiManager.sendEvents(anything(), anything(), anything())).times(9);
  });

  it('should flush all scheduled events before stopping', async () => {
    const eventManager = managerInstance();

    eventManager.start();
    for (let i = 0; i < 25; i += 1) {
      eventManager.sendEvent(makeEvent(i));
    }
    eventManager.stop();
    await pause(1500);

    verify(mockLogger.log(LogLevel.DEBUG, 'Exiting ODP Event Dispatcher Thread.'));
  });

  it('should prepare correct payload for identify user', async () => {
    const mockRequestHandler: RequestHandler = mock<RequestHandler>();
    when(mockRequestHandler.makeRequest(anything(), anything(), anything(), anything())).thenReturn(abortableRequest(200, ''));
    const spiedRestApiManager = spy(new RestApiManager(instance(mockRequestHandler), instance(mockLogger)));
    const eventManager = new OdpEventManager(spiedOdpConfig, spiedRestApiManager, instance(mockLogger), 1);
    const vuid = 'vuid_330e05cad15746d9af8a75b8d10';
    const fsUserId = 'test-fs-user-id';

    eventManager.start();
    eventManager.identifyUser(vuid, fsUserId);
    await pause(1500);

    verify(spiedRestApiManager.sendEvents(anything(), anything(), anything())).thrice();
    const [requestUrl, headers, method, data] = capture(mockRequestHandler.makeRequest).last();
    expect(requestUrl).toEqual(API_HOST);
    expect(headers).toContain('Content-Type');
    expect(headers).toContain('x-api-key');
    expect(method).toEqual('POST');
    expect((data as string).includes(vuid)).toBe(true);
    expect((data as string).includes(fsUserId)).toBe(true);
  });

  it('should apply updated ODP configuration when available', () => {
    const eventManager = managerInstance();
    const apiKey = 'testing-api-key';
    const apiHost = 'https://some.other.example.com';
    const segmentsToCheck = ['empty-cart', '1-item-cart'];
    const differentOdpConfig = new OdpConfig(apiKey, apiHost, segmentsToCheck);

    eventManager.updateSettings(differentOdpConfig);

    expect(eventManager['odpConfig'].apiKey).toEqual(apiKey);
    expect(eventManager['odpConfig'].apiHost).toEqual(apiHost);
    expect(eventManager['odpConfig'].segmentsToCheck).toContain(segmentsToCheck[0]);
    expect(eventManager['odpConfig'].segmentsToCheck).toContain(segmentsToCheck[1]);
  });
});
