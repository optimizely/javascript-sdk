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

/// <reference types="jest" />

import { anyString, anything, capture, instance, mock, resetCalls, verify, when } from 'ts-mockito';
import { LogHandler, LogLevel } from '../lib/modules/logging';
import { NodeOdpEventApiManager } from '../lib/plugins/odp/event_api_manager/index.node';
import { OdpEvent } from '../lib/core/odp/odp_event';
import { RequestHandler } from '../lib/utils/http_request_handler/http';
import { OdpConfig } from '../lib/core/odp/odp_config';

const data1 = new Map<string, unknown>();
data1.set('key11', 'value-1');
data1.set('key12', true);
data1.set('key12', 3.5);
data1.set('key14', null);
const data2 = new Map<string, unknown>();
data2.set('key2', 'value-2');
const ODP_EVENTS = [
  new OdpEvent('t1', 'a1', new Map([['id-key-1', 'id-value-1']]), data1),
  new OdpEvent('t2', 'a2', new Map([['id-key-2', 'id-value-2']]), data2),
];

const API_KEY = 'test-api-key';
const API_HOST = 'https://odp.example.com';

const odpConfig = new OdpConfig(API_KEY, API_HOST, []);

describe('NodeOdpEventApiManager', () => {
  let mockLogger: LogHandler;
  let mockRequestHandler: RequestHandler;

  beforeAll(() => {
    mockLogger = mock<LogHandler>();
    mockRequestHandler = mock<RequestHandler>();
  });

  beforeEach(() => {
    resetCalls(mockLogger);
    resetCalls(mockRequestHandler);
  });

  const managerInstance = () => {
    const manager = new NodeOdpEventApiManager(instance(mockRequestHandler), instance(mockLogger));
    manager.updateSettings(odpConfig);
    return manager;
  }

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

  it('should should send events successfully and not suggest retry', async () => {
    when(mockRequestHandler.makeRequest(anything(), anything(), anything(), anything())).thenReturn(
      abortableRequest(200, '')
    );
    const manager = managerInstance();

    const shouldRetry = await manager.sendEvents(ODP_EVENTS);

    expect(shouldRetry).toBe(false);
    verify(mockLogger.log(anything(), anyString())).never();
  });

  it('should not suggest a retry for 400 HTTP response', async () => {
    when(mockRequestHandler.makeRequest(anything(), anything(), anything(), anything())).thenReturn(
      abortableRequest(400, '')
    );
    const manager = managerInstance();

    const shouldRetry = await manager.sendEvents(ODP_EVENTS);

    expect(shouldRetry).toBe(false);
    verify(mockLogger.log(LogLevel.ERROR, 'ODP event send failed (400)')).once();
  });

  it('should suggest a retry for 500 HTTP response', async () => {
    when(mockRequestHandler.makeRequest(anything(), anything(), anything(), anything())).thenReturn(
      abortableRequest(500, '')
    );
    const manager = managerInstance();

    const shouldRetry = await manager.sendEvents(ODP_EVENTS);

    expect(shouldRetry).toBe(true);
    verify(mockLogger.log(LogLevel.ERROR, 'ODP event send failed (500)')).once();
  });

  it('should suggest a retry for network timeout', async () => {
    when(mockRequestHandler.makeRequest(anything(), anything(), anything(), anything())).thenReturn({
      abort: () => {},
      responsePromise: Promise.reject(new Error('Request timed out')),
    });
    const manager = managerInstance();

    const shouldRetry = await manager.sendEvents(ODP_EVENTS);

    expect(shouldRetry).toBe(true);
    verify(mockLogger.log(LogLevel.ERROR, 'ODP event send failed (Request timed out)')).once();
  });

  it('should send events to updated host on settings update', async () => {
    when(mockRequestHandler.makeRequest(anything(), anything(), anything(), anything())).thenReturn({
      abort: () => {},
      responsePromise: Promise.reject(new Error('Request timed out')),
    });

    const manager = managerInstance();

    await manager.sendEvents(ODP_EVENTS);

    const updatedOdpConfig = new OdpConfig(
      'updated-key',
      'https://updatedhost.test',
      ['updated-seg'],
    )
    
    manager.updateSettings(updatedOdpConfig);
    await manager.sendEvents(ODP_EVENTS);

    verify(mockRequestHandler.makeRequest(anything(), anything(), anything(), anything())).twice();

    const [initUrl] = capture(mockRequestHandler.makeRequest).first();
    expect(initUrl).toEqual(`${API_HOST}/v3/events`);

    const [finalUrl] = capture(mockRequestHandler.makeRequest).last();
    expect(finalUrl).toEqual(`${updatedOdpConfig.apiHost}/v3/events`);
  });
});
