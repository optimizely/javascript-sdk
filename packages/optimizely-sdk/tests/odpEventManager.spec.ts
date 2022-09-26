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
import { instance, mock, resetCalls, verify, when } from 'ts-mockito';
import { RestApiManager } from '../lib/plugins/odp/rest_api_manager';
import { LogHandler, LogLevel } from '../lib/modules/logging';
import { OdpEvent } from '../lib/plugins/odp/odp_event';

const API_KEY = 'test-api-key';
const API_HOST = 'https://odp.example.com/';
const MOCK_PROCESS_VERSION = 'v16.17.0';
const MOCK_IDEMPOTENCE_ID = 'c1dc758e-f095-4f09-9b49-172d74c53880';
const EVENTS: OdpEvent[] = [
  new OdpEvent(
    't1',
    'a1',
    new Map([['id-key-1', 'id-value-1']]),
    new Map(Object.entries({ 'key-1': 'value1', 'key-2': null, 'key-3': 3.3, 'key-4': true })),
  ),
  new OdpEvent(
    't2',
    'a2',
    new Map([['id-key-2', 'id-value-2']]),
    new Map(Object.entries({ 'key-2': 'value2' })),
  ),
];
const PROCESSED_EVENTS = [
  {
    'type': 't1',
    'action': 'a1',
    'identifiers': { 'id-key-1': 'id-value-1' },
    'data': {
      'idempotence_id': MOCK_IDEMPOTENCE_ID,
      'data_source_type': 'sdk',
      'data_source': 'javascript-sdk',
      'data_source_version': MOCK_PROCESS_VERSION,
      'key-1': 'value1',
      'key-2': null,
      'key-3': 3.3,
      'key-4': true,
    },
  },
  {
    'type': 't2',
    'action': 'a2',
    'identifiers': { 'id-key-2': 'id-value-2' },
    'data': {
      'idempotence_id': MOCK_IDEMPOTENCE_ID,
      'data_source_type': 'sdk',
      'data_source': 'javascript-sdk',
      'data_source_version': '',
      'key-2': 'value2',
    },
  },
];

describe('OdpEventManager', () => {
  let mockLogger: LogHandler;
  let mockOdpConfig: OdpConfig;
  let mockRestApiManager: RestApiManager;

  beforeAll(() => {
    mockLogger = mock<LogHandler>();
    mockOdpConfig = mock<OdpConfig>();
    mockRestApiManager = mock<RestApiManager>();
  });

  beforeEach(() => {
    resetCalls(mockLogger);
    resetCalls(mockOdpConfig);
    resetCalls(mockRestApiManager);
  });

  it('should log and discard events when event manager not running', () => {
    const eventManager = new OdpEventManager(instance(mockOdpConfig), instance(mockRestApiManager), instance(mockLogger));

    eventManager.sendEvent(EVENTS[0]);

    verify(mockLogger.log(LogLevel.WARNING, 'Failed to Process ODP Event. ODPEventManager is not running.')).once();
  });

  it('should log and discard events when event manager is not ready', () => {
    when(mockOdpConfig.isReady()).thenReturn(false);
    const eventManager = new OdpEventManager(instance(mockOdpConfig), instance(mockRestApiManager), instance(mockLogger));

    eventManager.sendEvent(EVENTS[0]);

    verify(mockLogger.log(LogLevel.DEBUG, 'Unable to Process ODP Event. ODPConfig is not ready.')).once();
  });

  it('should log a max queue hit and discard ', () => {
    when(mockOdpConfig.isReady()).thenReturn(true);
    const eventManager = new OdpEventManager(instance(mockOdpConfig), instance(mockRestApiManager), instance(mockLogger), 1, 1, 1);
    eventManager['isRunning'] = true; // simulate dispatcher already running
    eventManager['eventQueue'].push(EVENTS[0]); // simulate queue already having 1

    eventManager.sendEvent(EVENTS[1]); // try adding to queue

    verify(mockLogger.log(LogLevel.WARNING, 'Failed to Process ODP Event. Event Queue full. queueSize = 1.')).once();
  });

  it('should dispatch events in correct number of batches', () => {

  });

  it('should dispatch events with correct payload', () => {

  });

  it('should dispatch events with correct flush interval', () => {

  });

  it('should retry failed events', () => {

  });

  it('should flush all scheduled events before stopping', () => {

  });

  it('should prepare correct payload for identify user', () => {

  });

  it('should apply updated ODP configuration when available', () => {

  });
});
