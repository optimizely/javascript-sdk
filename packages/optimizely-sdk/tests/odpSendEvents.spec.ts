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

/// <reference types="jest" />

import { anyString, anything, instance, mock, resetCalls, verify, when } from 'ts-mockito';
import { ErrorHandler, LogHandler, LogLevel } from '../lib/modules/logging';
import { OdpClient } from '../lib/plugins/odp/odp_client';
import { BrowserRequestHandler } from '../lib/utils/http_request_handler/browser_request_handler';
import { NodeRequestHandler } from '../lib/utils/http_request_handler/node_request_handler';
import { SendEventsParameters } from '../lib/plugins/odp/send_events_parameters';
import { OdpEvent } from '../lib/plugins/odp/odp_event';

const MOCK_SEND_PARAMETERS = new SendEventsParameters(
  'not-real-api-key',
  'https://events.example.com/v2/api',
  [
    new OdpEvent('t1', 'a1',
      new Map([['id-key-1', 'id-value-1']]),
      new Map(Object.entries({
        key11: 'value-1',
        key12: true,
        key13: 3.5,
        key14: null,
      }))),
    new OdpEvent('t2', 'a2',
      new Map([['id-key-2', 'id-value-2']]),
      new Map(Object.entries({
        key2: 'value-2',
      }))),
  ],
);
const VALID_RESPONSE_CODE = 200;

describe('OdpClient Send Events', () => {
  let mockErrorHandler: ErrorHandler;
  let mockLogger: LogHandler;
  let mockBrowserRequestHandler: BrowserRequestHandler;
  let mockNodeRequestHandler: NodeRequestHandler;
  let mockOdpEvent: OdpEvent;

  beforeAll(() => {
    mockErrorHandler = mock<ErrorHandler>();
    mockLogger = mock<LogHandler>();
    mockBrowserRequestHandler = mock<BrowserRequestHandler>();
    mockNodeRequestHandler = mock<NodeRequestHandler>();
    mockOdpEvent = mock<OdpEvent>();
  });

  beforeEach(() => {
    resetCalls(mockErrorHandler);
    resetCalls(mockLogger);
    resetCalls(mockBrowserRequestHandler);
    resetCalls(mockNodeRequestHandler);
    resetCalls(mockOdpEvent);
  });

  it('should handle missing API Endpoint', () => {
    expect(() => {
      new SendEventsParameters(
        'apiKey',
        '',
        [instance(mockOdpEvent)],
      );
    }).toThrow('Parameters apiKey and apiEndpoint are required');
  });

  it('should handle missing API Key', () => {
    expect(() => {
      new SendEventsParameters(
        '',
        'https://some.example.com/endpoint',
        [instance(mockOdpEvent)],
      );
    }).toThrow('Parameters apiKey and apiEndpoint are required');
  });

  it('Browser: should send events successfully', async () => {
    when(mockBrowserRequestHandler.makeRequest(anything(), anything(), anything(), anything())).thenReturn({
      abort: () => {
      },
      responsePromise: Promise.resolve({
        statusCode: 200,
        body: JSON.stringify(MOCK_SEND_PARAMETERS),
        headers: {},
      }),
    });
    const client = new OdpClient(instance(mockErrorHandler), instance(mockLogger), instance(mockBrowserRequestHandler));

    const response = await client.sendEvents(MOCK_SEND_PARAMETERS) ?? '';

    expect(response).toEqual(VALID_RESPONSE_CODE);
    verify(mockErrorHandler.handleError(anything())).never();
    verify(mockLogger.log(anything(), anyString())).never();
  });

  it('Node: should send events successfully', async () => {
    when(mockNodeRequestHandler.makeRequest(anything(), anything(), anything(), anything())).thenReturn({
      abort: () => {
      },
      responsePromise: Promise.resolve({
        statusCode: 200,
        body: JSON.stringify(MOCK_SEND_PARAMETERS),
        headers: {},
      }),
    });
    const client = new OdpClient(instance(mockErrorHandler), instance(mockLogger), instance(mockNodeRequestHandler));

    const response = await client.sendEvents(MOCK_SEND_PARAMETERS) ?? '';

    expect(response).toEqual(VALID_RESPONSE_CODE);
    verify(mockErrorHandler.handleError(anything())).never();
    verify(mockLogger.log(anything(), anyString())).never();
  });

  it('Browser: should handle and return 400 HTTP response', async () => {
    when(mockBrowserRequestHandler.makeRequest(anything(), anything(), anything(), anything())).thenReturn({
      abort: () => {
      },
      responsePromise: Promise.resolve({
        statusCode: 400,
        body: '',
        headers: {},
      }),
    });
    const client = new OdpClient(instance(mockErrorHandler), instance(mockLogger), instance(mockBrowserRequestHandler));

    const statusCode = await client.sendEvents(MOCK_SEND_PARAMETERS);

    expect(statusCode).toEqual(400);
    verify(mockErrorHandler.handleError(anything())).never();
    verify(mockLogger.log(LogLevel.ERROR, anyString())).never();
  });

  it('Node: should handle and return 400 HTTP response', async () => {
    when(mockNodeRequestHandler.makeRequest(anything(), anything(), anything(), anything())).thenReturn({
      abort: () => {
      },
      responsePromise: Promise.resolve({
        statusCode: 400,
        body: '',
        headers: {},
      }),
    });
    const client = new OdpClient(instance(mockErrorHandler), instance(mockLogger), instance(mockNodeRequestHandler));

    const statusCode = await client.sendEvents(MOCK_SEND_PARAMETERS);

    expect(statusCode).toEqual(400);
    verify(mockErrorHandler.handleError(anything())).never();
    verify(mockLogger.log(LogLevel.ERROR, anyString())).never();
  });

  it('Browser: should handle and return 500 HTTP response', async () => {
    when(mockBrowserRequestHandler.makeRequest(anything(), anything(), anything(), anything())).thenReturn({
      abort: () => {
      },
      responsePromise: Promise.resolve({
        statusCode: 500,
        body: '',
        headers: {},
      }),
    });
    const client = new OdpClient(instance(mockErrorHandler), instance(mockLogger), instance(mockBrowserRequestHandler));

    const statusCode = await client.sendEvents(MOCK_SEND_PARAMETERS);

    expect(statusCode).toEqual(500);
    verify(mockErrorHandler.handleError(anything())).never();
    verify(mockLogger.log(LogLevel.ERROR, anyString())).never();
  });

  it('Node: should handle and return 500 HTTP response', async () => {
    when(mockNodeRequestHandler.makeRequest(anything(), anything(), anything(), anything())).thenReturn({
      abort: () => {
      },
      responsePromise: Promise.resolve({
        statusCode: 500,
        body: '',
        headers: {},
      }),
    });
    const client = new OdpClient(instance(mockErrorHandler), instance(mockLogger), instance(mockNodeRequestHandler));

    const statusCode = await client.sendEvents(MOCK_SEND_PARAMETERS);

    expect(statusCode).toEqual(500);
    verify(mockErrorHandler.handleError(anything())).never();
    verify(mockLogger.log(LogLevel.ERROR, anyString())).never();
  });

  it('should handle a network timeout', async () => {
    when(mockNodeRequestHandler.makeRequest(anything(), anything(), anything(), anything())).thenReturn({
      abort: () => {
      },
      responsePromise: Promise.reject(new Error('Request timed out')),
    });
    const client = new OdpClient(instance(mockErrorHandler), instance(mockLogger), instance(mockNodeRequestHandler), 10);

    const statusCode = await client.sendEvents(MOCK_SEND_PARAMETERS);

    expect(statusCode).toBe(0);
    verify(mockErrorHandler.handleError(anything())).once();
    verify(mockLogger.log(LogLevel.ERROR, 'ODP event send failed (network error)')).once();
  });
});

