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
import { OdpClient, RETRY_ADVISED_BUT_NO_HTTP_STATUS_AVAILABLE } from '../lib/plugins/odp/odp_client';
import { QuerySegmentsParameters } from '../lib/plugins/odp/query_segments_parameters';
import { BrowserRequestHandler } from '../lib/utils/http_request_handler/browser_request_handler';
import { NodeRequestHandler } from '../lib/utils/http_request_handler/node_request_handler';
import { SendEventsParameters } from '../lib/plugins/odp/send_events_parameters';
import { OdpEvent } from '../lib/plugins/odp/odp_event';

describe('OdpClient', () => {
  let mockErrorHandler: ErrorHandler;
  let mockLogger: LogHandler;
  let mockBrowserRequestHandler: BrowserRequestHandler;
  let mockNodeRequestHandler: NodeRequestHandler;

  beforeAll(() => {
    mockErrorHandler = mock<ErrorHandler>();
    mockLogger = mock<LogHandler>();
    mockBrowserRequestHandler = mock<BrowserRequestHandler>();
    mockNodeRequestHandler = mock<NodeRequestHandler>();
  });

  beforeEach(() => {
    resetCalls(mockErrorHandler);
    resetCalls(mockLogger);
    resetCalls(mockBrowserRequestHandler);
    resetCalls(mockNodeRequestHandler);
  });

  describe('querySegments', () => {
    const MOCK_QUERY_PARAMETERS = new QuerySegmentsParameters({
      apiKey: 'not-real-api-key',
      apiEndpoint: 'https://api.example.com/v3/graphql',
      userKey: 'fs_user_id',
      userValue: 'mock-user-id',
      segmentsToCheck: [
        'has_email',
        'has_email_opted_in',
        'push_on_sale',
      ],
    });
    const VALID_RESPONSE_JSON = {
      'data': {
        'customer': {
          'audiences': {
            'edges': [
              {
                'node': {
                  'name': 'has_email',
                  'state': 'qualified',
                },
              },
              {
                'node': {
                  'name': 'has_email_opted_in',
                  'state': 'qualified',
                },
              },
            ],
          },
        },
      },
    };
    const BODY_FROM_ERROR = '';

    it('should handle missing API Host', async () => {
      const missingApiEndpoint = new QuerySegmentsParameters({
        apiKey: 'apiKey',
        apiEndpoint: '',
        userKey: 'userKey',
        userValue: 'userValue',
        segmentsToCheck: ['segmentToCheck'],
      });
      const client = new OdpClient(instance(mockErrorHandler), instance(mockLogger), instance(mockNodeRequestHandler));

      await client.querySegments(missingApiEndpoint);

      verify(mockErrorHandler.handleError(anything())).never();
      verify(mockLogger.log(LogLevel.ERROR, 'No ApiHost or ApiKey set before querying segments')).once();
    });

    it('should handle missing API Key', async () => {
      const missingApiHost = new QuerySegmentsParameters({
        apiKey: '',
        apiEndpoint: 'apiHost',
        userKey: 'userKey',
        userValue: 'userValue',
        segmentsToCheck: ['segmentToCheck'],
      });
      const client = new OdpClient(instance(mockErrorHandler), instance(mockLogger), instance(mockNodeRequestHandler));

      await client.querySegments(missingApiHost);

      verify(mockErrorHandler.handleError(anything())).never();
      verify(mockLogger.log(LogLevel.ERROR, 'No ApiHost or ApiKey set before querying segments')).once();
    });

    it('Browser: should get mocked segments successfully', async () => {
      when(mockBrowserRequestHandler.makeRequest(anything(), anything(), anything(), anything())).thenReturn({
        abort: () => {
        },
        responsePromise: Promise.resolve({
          statusCode: 200,
          body: JSON.stringify(VALID_RESPONSE_JSON),
          headers: {},
        }),
      });
      const client = new OdpClient(instance(mockErrorHandler), instance(mockLogger), instance(mockBrowserRequestHandler));

      const response = await client.querySegments(MOCK_QUERY_PARAMETERS) ?? '';

      expect(response).toEqual(JSON.stringify(VALID_RESPONSE_JSON));
      verify(mockErrorHandler.handleError(anything())).never();
      verify(mockLogger.log(anything(), anyString())).never();
    });

    it('Node: should get mocked segments successfully', async () => {
      when(mockNodeRequestHandler.makeRequest(anything(), anything(), anything(), anything())).thenReturn({
        abort: () => {
        },
        responsePromise: Promise.resolve({
          statusCode: 200,
          body: JSON.stringify(VALID_RESPONSE_JSON),
          headers: {},
        }),
      });
      const client = new OdpClient(instance(mockErrorHandler), instance(mockLogger), instance(mockNodeRequestHandler));

      const response = await client.querySegments(MOCK_QUERY_PARAMETERS) ?? '';

      expect(response).toEqual(JSON.stringify(VALID_RESPONSE_JSON));
      verify(mockErrorHandler.handleError(anything())).never();
      verify(mockLogger.log(anything(), anyString())).never();
    });

    it('Browser: should handle 400 HTTP response', async () => {
      when(mockBrowserRequestHandler.makeRequest(anything(), anything(), anything(), anything())).thenReturn({
        abort: () => {
        },
        responsePromise: Promise.resolve({
          statusCode: 400,
          body: BODY_FROM_ERROR,
          headers: {},
        }),
      });
      const client = new OdpClient(instance(mockErrorHandler), instance(mockLogger), instance(mockBrowserRequestHandler));

      const responseJson = await client.querySegments(MOCK_QUERY_PARAMETERS);

      expect(responseJson).toBe(BODY_FROM_ERROR);
      verify(mockErrorHandler.handleError(anything())).never();
      verify(mockLogger.log(LogLevel.ERROR, anyString())).never();
    });

    it('Node: should handle 400 HTTP response', async () => {
      when(mockNodeRequestHandler.makeRequest(anything(), anything(), anything(), anything())).thenReturn({
        abort: () => {
        },
        responsePromise: Promise.resolve({
          statusCode: 400,
          body: BODY_FROM_ERROR,
          headers: {},
        }),
      });
      const client = new OdpClient(instance(mockErrorHandler), instance(mockLogger), instance(mockNodeRequestHandler));

      const responseJson = await client.querySegments(MOCK_QUERY_PARAMETERS);

      expect(responseJson).toBe(BODY_FROM_ERROR);
      verify(mockErrorHandler.handleError(anything())).never();
      verify(mockLogger.log(LogLevel.ERROR, anyString())).never();
    });

    it('Browser: should handle 500 HTTP response', async () => {
      when(mockBrowserRequestHandler.makeRequest(anything(), anything(), anything(), anything())).thenReturn({
        abort: () => {
        },
        responsePromise: Promise.resolve({
          statusCode: 500,
          body: BODY_FROM_ERROR,
          headers: {},
        }),
      });
      const client = new OdpClient(instance(mockErrorHandler), instance(mockLogger), instance(mockBrowserRequestHandler));

      const responseJson = await client.querySegments(MOCK_QUERY_PARAMETERS);

      expect(responseJson).toBe(BODY_FROM_ERROR);
      verify(mockErrorHandler.handleError(anything())).never();
      verify(mockLogger.log(LogLevel.ERROR, anyString())).never();
    });

    it('Node: should handle 500 HTTP response', async () => {
      when(mockNodeRequestHandler.makeRequest(anything(), anything(), anything(), anything())).thenReturn({
        abort: () => {
        },
        responsePromise: Promise.resolve({
          statusCode: 500,
          body: BODY_FROM_ERROR,
          headers: {},
        }),
      });
      const client = new OdpClient(instance(mockErrorHandler), instance(mockLogger), instance(mockNodeRequestHandler));

      const responseJson = await client.querySegments(MOCK_QUERY_PARAMETERS);

      expect(responseJson).toBe(BODY_FROM_ERROR);
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

      const responseJson = await client.querySegments(MOCK_QUERY_PARAMETERS);

      expect(responseJson).toBeNull();
      verify(mockErrorHandler.handleError(anything())).once();
      verify(mockLogger.log(LogLevel.ERROR, 'Failed to query audience segments (network error)')).once();
    });
  });

  describe('sendOdpEvents', () => {
    const MOCK_SEND_PARAMETERS = new SendEventsParameters({
      apiKey: 'also-not-real-api-key',
      apiEndpoint: 'https://events.example.com/v2/api',
      events: [
        new OdpEvent('t1', 'a1',
          new Map([['id-key-1', 'id-value-1']]),
          new Map(Object.entries({
            key11: 'value-1',
            key12: true,
            key13: 3.5,
          }))),
        new OdpEvent('t2', 'a2',
          new Map([['id-key-2', 'id-value-2']]),
          new Map(Object.entries({
            key2: 'value-2',
          }))),
      ],
    });
    const VALID_RESPONSE_CODE = 200;

    it('should handle missing API Endpoint', async () => {
      const missingApiEndpoint = new SendEventsParameters({
        apiKey: 'apiKey',
        apiEndpoint: '',
        events: [],
      });
      const client = new OdpClient(instance(mockErrorHandler), instance(mockLogger), instance(mockNodeRequestHandler));

      const statusReturned = await client.sendOdpEvents(missingApiEndpoint);

      expect(statusReturned).toBeNull();
      verify(mockErrorHandler.handleError(anything())).never();
      verify(mockLogger.log(LogLevel.ERROR, 'No ApiEndpoint or ApiKey set before attempting to send ODP events')).once();
    });

    it('should handle missing API Key', async () => {
      const missingApiKey = new SendEventsParameters({
        apiKey: '',
        apiEndpoint: 'https://some.example.com/endpoint',
        events: [],
      });
      const client = new OdpClient(instance(mockErrorHandler), instance(mockLogger), instance(mockNodeRequestHandler));

      const statusReturned = await client.sendOdpEvents(missingApiKey);

      expect(statusReturned).toBeNull();
      verify(mockErrorHandler.handleError(anything())).never();
      verify(mockLogger.log(LogLevel.ERROR, 'No ApiEndpoint or ApiKey set before attempting to send ODP events')).once();
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

      const response = await client.sendOdpEvents(MOCK_SEND_PARAMETERS) ?? '';

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

      const response = await client.sendOdpEvents(MOCK_SEND_PARAMETERS) ?? '';

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

      const statusCode = await client.sendOdpEvents(MOCK_SEND_PARAMETERS);

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

      const statusCode = await client.sendOdpEvents(MOCK_SEND_PARAMETERS);

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

      const statusCode = await client.sendOdpEvents(MOCK_SEND_PARAMETERS);

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

      const statusCode = await client.sendOdpEvents(MOCK_SEND_PARAMETERS);

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

      const statusCode = await client.sendOdpEvents(MOCK_SEND_PARAMETERS);

      expect(statusCode).toBe(RETRY_ADVISED_BUT_NO_HTTP_STATUS_AVAILABLE);
      verify(mockErrorHandler.handleError(anything())).once();
      verify(mockLogger.log(LogLevel.ERROR, 'Failed to send ODP events (network error)')).once();
    });
  });
})

