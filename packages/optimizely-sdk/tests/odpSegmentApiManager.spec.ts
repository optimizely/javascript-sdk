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

import { expect, beforeAll, describe, beforeEach, it } from '@jest/globals';
import { anyString, anything, instance, mock, resetCalls, verify, when } from 'ts-mockito';
import { LogHandler, LogLevel } from '../lib/modules/logging';
import { OdpSegmentApiManager } from '../lib/core/odp/odp_segment_api_manager';
import { RequestHandler } from '../lib/utils/http_request_handler/http';
import { ODP_USER_KEY } from '../lib/utils/enums';

const API_key = 'not-real-api-key';
const GRAPHQL_ENDPOINT = 'https://some.example.com/graphql/endpoint';
const USER_KEY = ODP_USER_KEY.FS_USER_ID;
const USER_VALUE = 'tester-101';
const SEGMENTS_TO_CHECK = ['has_email', 'has_email_opted_in', 'push_on_sale'];

describe('OdpSegmentApiManager', () => {
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

  const managerInstance = () => new OdpSegmentApiManager(instance(mockRequestHandler), instance(mockLogger));

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

  it('should parse a successful response', () => {
    const validJsonResponse = `{
      "data": {
        "customer": {
          "audiences": {
            "edges": [
              {
                "node": {
                  "name": "has_email",
                  "state": "qualified"
                }
              },
              {
                "node": {
                  "name": "has_email_opted_in",
                  "state": "not-qualified"
                }
              }
            ]
          }
        }
      }
    }`;
    const manager = managerInstance();

    const response = manager['parseSegmentsResponseJson'](validJsonResponse);

    expect(response).not.toBeUndefined();
    expect(response?.errors).toHaveLength(0);
    expect(response?.data?.customer?.audiences?.edges).not.toBeNull();
    expect(response?.data.customer.audiences.edges).toHaveLength(2);
    let node = response?.data.customer.audiences.edges[0].node;
    expect(node?.name).toEqual('has_email');
    expect(node?.state).toEqual('qualified');
    node = response?.data.customer.audiences.edges[1].node;
    expect(node?.name).toEqual('has_email_opted_in');
    expect(node?.state).not.toEqual('qualified');
  });

  it('should parse an error response', () => {
    const errorJsonResponse = `{
   "errors": [
        {
            "message": "Exception while fetching data (/customer) : Exception: could not resolve _fs_user_id = mock_user_id",
            "locations": [
                {
                    "line": 2,
                    "column": 3
                }
            ],
            "path": [
                "customer"
            ],
            "extensions": {
                "classification": "InvalidIdentifierException"
            }
        }
    ],
    "data": {
        "customer": null
    }
}`;
    const manager = managerInstance();

    const response = manager['parseSegmentsResponseJson'](errorJsonResponse);

    expect(response).not.toBeUndefined();
    expect(response?.data.customer).toBeNull();
    expect(response?.errors).not.toBeNull();
    expect(response?.errors[0].extensions.classification).toEqual('InvalidIdentifierException');
  });

  it('should construct a valid GraphQL query string', () => {
    const manager = managerInstance();

    const response = manager['toGraphQLJson'](USER_KEY, USER_VALUE, SEGMENTS_TO_CHECK);

    expect(response).toBe(
      `{"query" : "query {customer"(${USER_KEY} : "${USER_VALUE}") {audiences(subset: [\\"has_email\\",\\"has_email_opted_in\\",\\"push_on_sale\\"] {edges {node {name state}}}}}"}`
    );
  });

  it('should fetch valid qualified segments', async () => {
    const responseJsonWithQualifiedSegments =
      '{"data":{"customer":{"audiences":' +
      '{"edges":[{"node":{"name":"has_email",' +
      '"state":"qualified"}},{"node":{"name":' +
      '"has_email_opted_in","state":"qualified"}}]}}}}';
    when(mockRequestHandler.makeRequest(anything(), anything(), anything(), anything())).thenReturn(
      abortableRequest(200, responseJsonWithQualifiedSegments)
    );
    const manager = managerInstance();

    const segments = await manager.fetchSegments(API_key, GRAPHQL_ENDPOINT, USER_KEY, USER_VALUE, SEGMENTS_TO_CHECK);

    expect(segments?.length).toEqual(2);
    expect(segments).toContain('has_email');
    expect(segments).toContain('has_email_opted_in');
    verify(mockLogger.log(anything(), anyString())).never();
  });

  it('should handle a request to query no segments', async () => {
    const manager = managerInstance();

    const segments = await manager.fetchSegments(API_key, GRAPHQL_ENDPOINT, ODP_USER_KEY.FS_USER_ID, USER_VALUE, []);

    expect(segments?.length).toEqual(0);
    verify(mockLogger.log(anything(), anyString())).never();
  });

  it('should handle empty qualified segments', async () => {
    const responseJsonWithNoQualifiedSegments = '{"data":{"customer":{"audiences":' + '{"edges":[ ]}}}}';
    when(mockRequestHandler.makeRequest(anything(), anything(), anything(), anything())).thenReturn(
      abortableRequest(200, responseJsonWithNoQualifiedSegments)
    );
    const manager = managerInstance();

    const segments = await manager.fetchSegments(API_key, GRAPHQL_ENDPOINT, USER_KEY, USER_VALUE, SEGMENTS_TO_CHECK);

    expect(segments?.length).toEqual(0);
    verify(mockLogger.log(anything(), anyString())).never();
  });

  it('should handle error with invalid identifier', async () => {
    const INVALID_USER_ID = 'invalid-user';
    const errorJsonResponse =
      '{"errors":[{"message":' +
      '"Exception while fetching data (/customer) : ' +
      `Exception: could not resolve _fs_user_id = ${INVALID_USER_ID}",` +
      '"locations":[{"line":1,"column":8}],"path":["customer"],' +
      '"extensions":{"classification":"DataFetchingException"}}],' +
      '"data":{"customer":null}}';
    when(mockRequestHandler.makeRequest(anything(), anything(), anything(), anything())).thenReturn(
      abortableRequest(200, errorJsonResponse)
    );
    const manager = managerInstance();

    const segments = await manager.fetchSegments(
      API_key,
      GRAPHQL_ENDPOINT,
      USER_KEY,
      INVALID_USER_ID,
      SEGMENTS_TO_CHECK
    );

    expect(segments).toBeNull();
    verify(mockLogger.log(anything(), anyString())).once();
  });

  it('should handle unrecognized JSON responses', async () => {
    const unrecognizedJson = '{"unExpectedObject":{ "withSome": "value", "thatIsNotParseable": "true" }}';
    when(mockRequestHandler.makeRequest(anything(), anything(), anything(), anything())).thenReturn(
      abortableRequest(200, unrecognizedJson)
    );
    const manager = managerInstance();

    const segments = await manager.fetchSegments(API_key, GRAPHQL_ENDPOINT, USER_KEY, USER_VALUE, SEGMENTS_TO_CHECK);

    expect(segments).toBeNull();
    verify(mockLogger.log(LogLevel.ERROR, 'Audience segments fetch failed (decode error)')).once();
  });

  it('should handle other exception types', async () => {
    const errorJsonResponse =
      '{"errors":[{"message":"Validation error of type ' +
      'UnknownArgument: Unknown field argument not_real_userKey @ ' +
      '\'customer\'","locations":[{"line":1,"column":17}],' +
      '"extensions":{"classification":"ValidationError"}}]}';
    when(mockRequestHandler.makeRequest(anything(), anything(), anything(), anything())).thenReturn(
      abortableRequest(200, errorJsonResponse)
    );
    const manager = managerInstance();

    const segments = await manager.fetchSegments(API_key, GRAPHQL_ENDPOINT, USER_KEY, USER_VALUE, SEGMENTS_TO_CHECK);

    expect(segments).toBeNull();
    verify(mockLogger.log(anything(), anyString())).once();
  });

  it('should handle bad responses', async () => {
    const badResponse = '{"data":{ }}';
    when(mockRequestHandler.makeRequest(anything(), anything(), anything(), anything())).thenReturn(
      abortableRequest(200, badResponse)
    );
    const manager = managerInstance();

    const segments = await manager.fetchSegments(API_key, GRAPHQL_ENDPOINT, USER_KEY, USER_VALUE, SEGMENTS_TO_CHECK);

    expect(segments).toBeNull();
    verify(mockLogger.log(LogLevel.ERROR, 'Audience segments fetch failed (decode error)')).once();
  });

  it('should handle non 200 HTTP status code response', async () => {
    when(mockRequestHandler.makeRequest(anything(), anything(), anything(), anything())).thenReturn(
      abortableRequest(400, '')
    );
    const manager = managerInstance();

    const segments = await manager.fetchSegments(API_key, GRAPHQL_ENDPOINT, USER_KEY, USER_VALUE, SEGMENTS_TO_CHECK);

    expect(segments).toBeNull();
    verify(mockLogger.log(LogLevel.ERROR, 'Audience segments fetch failed (network error)')).once();
  });

  it('should handle a timeout', async () => {
    when(mockRequestHandler.makeRequest(anything(), anything(), anything(), anything())).thenReturn({
      abort: () => {},
      responsePromise: Promise.reject(new Error('Request timed out')),
    });
    const manager = managerInstance();

    const segments = await manager.fetchSegments(API_key, GRAPHQL_ENDPOINT, USER_KEY, USER_VALUE, SEGMENTS_TO_CHECK);

    expect(segments).toBeNull();
    verify(mockLogger.log(LogLevel.ERROR, 'Audience segments fetch failed (network error)')).once();
  });
});
