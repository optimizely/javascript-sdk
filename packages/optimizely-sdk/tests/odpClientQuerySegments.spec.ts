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
import { LogHandler, LogLevel } from '../lib/modules/logging';
import { OdpClient } from '../lib/plugins/odp/odp_client';
import { BrowserRequestHandler } from '../lib/utils/http_request_handler/browser_request_handler';
import { NodeRequestHandler } from '../lib/utils/http_request_handler/node_request_handler';
import { ODP_USER_KEY } from '../lib/utils/enums';

const API_KEY = 'not-real-api-key';
const GRAPHQL_ENDPOINT = 'https://api.example.com/v3/graphql';
const USER_KEY = ODP_USER_KEY.FS_USER_ID;
const USER_VALUE = 'mock-user-id';
const GRAPHQL_QUERY = `{"query" : "query {customer"(fs_user_id : "mock-user-id") {audiences(subset: [\\"has_email\\", \\"has_email_opted_in\\", \\"push_on_sale\\"] {edges {node {name state}}}}}"}`;
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
const BROWSER = 'browser';
const NODE = 'node';

describe('OdpClient Query Segments', () => {
  const client = (type: string) => type === BROWSER ?
    new OdpClient(instance(mockLogger), instance(mockBrowserRequestHandler)) :
    new OdpClient(instance(mockLogger), instance(mockNodeRequestHandler));

  let mockLogger: LogHandler;
  let mockBrowserRequestHandler: BrowserRequestHandler;
  let mockNodeRequestHandler: NodeRequestHandler;

  beforeAll(() => {
    mockLogger = mock<LogHandler>();
    mockBrowserRequestHandler = mock<BrowserRequestHandler>();
    mockNodeRequestHandler = mock<NodeRequestHandler>();
  });

  beforeEach(() => {
    resetCalls(mockLogger);
    resetCalls(mockBrowserRequestHandler);
    resetCalls(mockNodeRequestHandler);
  });

  it('(browser) should get mocked segments successfully', async () => {
    when(mockBrowserRequestHandler.makeRequest(anything(), anything(), anything(), anything())).thenReturn({
      abort: () => {
      },
      responsePromise: Promise.resolve({
        statusCode: 200,
        body: JSON.stringify(VALID_RESPONSE_JSON),
        headers: {},
      }),
    });

    const response = await client(BROWSER).querySegments(API_KEY, GRAPHQL_ENDPOINT, USER_KEY, USER_VALUE, GRAPHQL_QUERY);

    expect(response).toEqual(JSON.stringify(VALID_RESPONSE_JSON));
    verify(mockLogger.log(anything(), anyString())).never();
  });

  it('(node) should get mocked segments successfully', async () => {
    when(mockNodeRequestHandler.makeRequest(anything(), anything(), anything(), anything())).thenReturn({
      abort: () => {
      },
      responsePromise: Promise.resolve({
        statusCode: 200,
        body: JSON.stringify(VALID_RESPONSE_JSON),
        headers: {},
      }),
    });

    const response = await client(NODE).querySegments(API_KEY, GRAPHQL_ENDPOINT, USER_KEY, USER_VALUE, GRAPHQL_QUERY);

    expect(response).toEqual(JSON.stringify(VALID_RESPONSE_JSON));
    verify(mockLogger.log(anything(), anyString())).never();
  });

  it('(browser) should handle 400 HTTP response', async () => {
    when(mockBrowserRequestHandler.makeRequest(anything(), anything(), anything(), anything())).thenReturn({
      abort: () => {
      },
      responsePromise: Promise.resolve({
        statusCode: 400,
        body: BODY_FROM_ERROR,
        headers: {},
      }),
    });

    const responseJson = await client(BROWSER).querySegments(API_KEY, GRAPHQL_ENDPOINT, USER_KEY, USER_VALUE, GRAPHQL_QUERY);

    expect(responseJson).toBe(BODY_FROM_ERROR);
    verify(mockLogger.log(LogLevel.ERROR, anyString())).never();
  });

  it('(node) should handle 400 HTTP response', async () => {
    when(mockNodeRequestHandler.makeRequest(anything(), anything(), anything(), anything())).thenReturn({
      abort: () => {
      },
      responsePromise: Promise.resolve({
        statusCode: 400,
        body: BODY_FROM_ERROR,
        headers: {},
      }),
    });

    const responseJson = await client(NODE).querySegments(API_KEY, GRAPHQL_ENDPOINT, USER_KEY, USER_VALUE, GRAPHQL_QUERY);

    expect(responseJson).toBe(BODY_FROM_ERROR);
    verify(mockLogger.log(LogLevel.ERROR, anyString())).never();
  });

  it('(browser) should handle 500 HTTP response', async () => {
    when(mockBrowserRequestHandler.makeRequest(anything(), anything(), anything(), anything())).thenReturn({
      abort: () => {
      },
      responsePromise: Promise.resolve({
        statusCode: 500,
        body: BODY_FROM_ERROR,
        headers: {},
      }),
    });

    const responseJson = await client(BROWSER).querySegments(API_KEY, GRAPHQL_ENDPOINT, USER_KEY, USER_VALUE, GRAPHQL_QUERY);

    expect(responseJson).toBe(BODY_FROM_ERROR);
    verify(mockLogger.log(LogLevel.ERROR, anyString())).never();
  });

  it('(node) should handle 500 HTTP response', async () => {
    when(mockNodeRequestHandler.makeRequest(anything(), anything(), anything(), anything())).thenReturn({
      abort: () => {
      },
      responsePromise: Promise.resolve({
        statusCode: 500,
        body: BODY_FROM_ERROR,
        headers: {},
      }),
    });

    const responseJson = await client(NODE).querySegments(API_KEY, GRAPHQL_ENDPOINT, USER_KEY, USER_VALUE, GRAPHQL_QUERY);

    expect(responseJson).toBe(BODY_FROM_ERROR);
    verify(mockLogger.log(LogLevel.ERROR, anyString())).never();
  });

  it('should handle a network timeout', async () => {
    when(mockNodeRequestHandler.makeRequest(anything(), anything(), anything(), anything())).thenReturn({
      abort: () => {
      },
      responsePromise: Promise.reject(new Error('Request timed out')),
    });
    const client = new OdpClient(instance(mockLogger), instance(mockNodeRequestHandler), 10);

    const responseJson = await client.querySegments(API_KEY, GRAPHQL_ENDPOINT, USER_KEY, USER_VALUE, GRAPHQL_QUERY);

    expect(responseJson).toBeNull();
    verify(mockLogger.log(LogLevel.ERROR, 'Audience segments fetch failed (network error)')).once();
  });
});

