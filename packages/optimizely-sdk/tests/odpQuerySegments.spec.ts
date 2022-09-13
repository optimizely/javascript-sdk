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
import { QuerySegmentsParameters } from '../lib/plugins/odp/query_segments_parameters';
import { BrowserRequestHandler } from '../lib/utils/http_request_handler/browser_request_handler';
import { NodeRequestHandler } from '../lib/utils/http_request_handler/node_request_handler';

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
              'state': 'not-ready',
            },
          },
        ],
      },
    },
  },
};
const BODY_FROM_ERROR = '';

describe('OdpClient Query Segments', () => {
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
    verify(mockLogger.log(LogLevel.ERROR, 'Audience segments fetch failed (network error)')).once();
  });
});

