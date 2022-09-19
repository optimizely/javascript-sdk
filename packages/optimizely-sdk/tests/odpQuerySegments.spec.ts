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

const MOCK_QUERY_PARAMETERS = new QuerySegmentsParameters(
  'not-real-api-key',
  'https://api.example.com/v3/graphql',
  'fs_user_id',
  'mock-user-id',
  [
    'has_email',
    'has_email_opted_in',
    'push_on_sale',
  ],
);
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

  it('should handle missing API Endpoint', () => {
    expect(() => {
      new QuerySegmentsParameters(
        'apiKey',
        '',
        'userKey',
        'userValue',
        ['segmentToCheck'],
      );
    }).toThrow('Parameters apiKey and apiEndpoint are required');
  });

  it('should handle missing API Key', () => {
    expect(() => {
      new QuerySegmentsParameters(
        '',
        'apiEndpoint',
        'userKey',
        'userValue',
        ['segmentToCheck'],
      );
    }).toThrow('Parameters apiKey and apiEndpoint are required');
  });

  it('should handle missing User Key', () => {
    expect(() => {
      new QuerySegmentsParameters(
        'apiKey',
        'apiEndpoint',
        '',
        'userValue',
        ['segmentToCheck'],
      );
    }).toThrow('Parameters userKey or userValue are required');
  });

  it('should handle missing User Value', () => {
    expect(() => {
      new QuerySegmentsParameters(
        'apiKey',
        'apiEndpoint',
        'userKey',
        '',
        ['segmentToCheck'],
      );
    }).toThrow('Parameters userKey or userValue are required');
  });

  it('should handle no segments being requested', () => {
    expect(() => {
      new QuerySegmentsParameters(
        'apiKey',
        'apiEndpoint',
        'userKey',
        'userValue',
        [],
      );
    }).toThrow('Parameter segmentsToCheck must have elements');
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

