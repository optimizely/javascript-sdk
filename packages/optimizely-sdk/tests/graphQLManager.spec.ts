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
import { IOdpClient, OdpClient } from '../lib/plugins/odp/odp_client';
import { LogHandler, LogLevel } from '../lib/modules/logging';
import { GraphqlManager } from '../lib/plugins/odp/graphql_manager';
import { Response } from '../lib/plugins/odp/odp_types';

describe('GraphQLManager', () => {
  const VALID_ODP_PUBLIC_KEY = 'W4WzcEs-ABgXorzY7h1LCQ';
  const ODP_GRAPHQL_URL = 'https://api.zaius.com/v3/graphql';
  const FS_USER_ID = 'fs_user_id';
  const VALID_FS_USER_ID = 'tester-101';
  const SEGMENTS_TO_CHECK = [
    'has_email',
    'has_email_opted_in',
    'push_on_sale',
  ];

  let mockLogger: LogHandler;
  let mockOdpClient: IOdpClient;

  beforeAll(() => {
    mockLogger = mock<LogHandler>();
    mockOdpClient = mock<OdpClient>();
  });

  beforeEach(() => {
    resetCalls(mockLogger);
    resetCalls(mockOdpClient);
  });

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
    const manager = new GraphqlManager(instance(mockLogger), instance(mockOdpClient));

    const response = manager['parseSegmentsResponseJson'](validJsonResponse) as Response;

    expect(response).not.toBeUndefined();
    expect(response?.errors?.length).toEqual(0);
    expect(response?.data?.customer?.audiences?.edges).not.toBeNull();
    expect(response.data.customer.audiences.edges.length).toEqual(2);
    let node = response.data.customer.audiences.edges[0].node;
    expect(node.name).toEqual('has_email');
    expect(node.state).toEqual('qualified');
    node = response.data.customer.audiences.edges[1].node;
    expect(node.name).toEqual('has_email_opted_in');
    expect(node.state).not.toEqual('qualified');
  });

  it('should parse an error response', () => {
    const errorJsonResponse = `{
   "errors": [
        {
            "message": "Exception while fetching data (/customer) : java.lang.RuntimeException: could not resolve _fs_user_id = asdsdaddddd",
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
    const manager = new GraphqlManager(instance(mockLogger), instance(mockOdpClient));

    const response = manager['parseSegmentsResponseJson'](errorJsonResponse) as Response;

    expect(response).not.toBeUndefined();
    expect(response.data.customer).toBeNull();
    expect(response?.errors).not.toBeNull();
    expect(response.errors[0].extensions.classification).toEqual('InvalidIdentifierException');
  });

  it('should fetch valid qualified segments', async () => {
    const responseJsonWithQualifiedSegments = '{"data":{"customer":{"audiences":' +
      '{"edges":[{"node":{"name":"has_email",' +
      '"state":"qualified"}},{"node":{"name":' +
      '"has_email_opted_in","state":"qualified"}}]}}}}';
    when(mockOdpClient.querySegments(anything())).thenResolve(responseJsonWithQualifiedSegments);
    const manager = new GraphqlManager(instance(mockLogger), instance(mockOdpClient));

    const segments = await manager.fetchSegments(VALID_ODP_PUBLIC_KEY, ODP_GRAPHQL_URL, FS_USER_ID, VALID_FS_USER_ID, SEGMENTS_TO_CHECK);

    expect(segments.length).toEqual(2);
    expect(segments).toContain('has_email');
    expect(segments).toContain('has_email_opted_in');
    verify(mockLogger.log(anything(), anyString())).never();
  });

  it('should handle empty qualified segments', async () => {
    const responseJsonWithNoQualifiedSegments = '{"data":{"customer":{"audiences":' +
      '{"edges":[ ]}}}}';
    when(mockOdpClient.querySegments(anything())).thenResolve(responseJsonWithNoQualifiedSegments);
    const manager = new GraphqlManager(instance(mockLogger), instance(mockOdpClient));

    const segments = await manager.fetchSegments(VALID_ODP_PUBLIC_KEY, ODP_GRAPHQL_URL, FS_USER_ID, VALID_FS_USER_ID, SEGMENTS_TO_CHECK);

    expect(segments.length).toEqual(0);
    verify(mockLogger.log(anything(), anyString())).never();
  });

  it('should handle error with invalid identifier', async () => {
    const INVALID_USER_ID = 'invalid-user';
    const errorJsonResponse = '{"errors":[{"message":' +
      '"Exception while fetching data (/customer) : ' +
      `java.lang.RuntimeException: could not resolve _fs_user_id = ${INVALID_USER_ID}",` +
      '"locations":[{"line":1,"column":8}],"path":["customer"],' +
      '"extensions":{"classification":"DataFetchingException"}}],' +
      '"data":{"customer":null}}';
    when(mockOdpClient.querySegments(anything())).thenResolve(errorJsonResponse);
    const manager = new GraphqlManager(instance(mockLogger), instance(mockOdpClient));

    const segments = await manager.fetchSegments(VALID_ODP_PUBLIC_KEY, ODP_GRAPHQL_URL, FS_USER_ID, INVALID_USER_ID, SEGMENTS_TO_CHECK);

    expect(segments.length).toEqual(0);
    verify(mockLogger.log(anything(), anyString())).once();
  });

  it('should handle unrecognized JSON responses', async () => {
    const unrecognizedJson = '{"unExpectedObject":{ "withSome": "value", "thatIsNotParseable": "true" }}';
    when(mockOdpClient.querySegments(anything())).thenResolve(unrecognizedJson);
    const manager = new GraphqlManager(instance(mockLogger), instance(mockOdpClient));

    const segments = await manager.fetchSegments(VALID_ODP_PUBLIC_KEY, ODP_GRAPHQL_URL, FS_USER_ID, VALID_FS_USER_ID, SEGMENTS_TO_CHECK);

    expect(segments.length).toEqual(0);
    verify(mockLogger.log(LogLevel.ERROR, 'Audience segments fetch failed (decode error)')).once();
  });

  it('should handle other exception types', async () => {
    const errorJsonResponse = '{"errors":[{"message":"Validation error of type ' +
      'UnknownArgument: Unknown field argument not_real_userKey @ ' +
      '\'customer\'","locations":[{"line":1,"column":17}],' +
      '"extensions":{"classification":"ValidationError"}}]}';
    when(mockOdpClient.querySegments(anything())).thenResolve(errorJsonResponse);
    const manager = new GraphqlManager(instance(mockLogger), instance(mockOdpClient));

    const segments = await manager.fetchSegments(VALID_ODP_PUBLIC_KEY, ODP_GRAPHQL_URL, FS_USER_ID, VALID_FS_USER_ID, SEGMENTS_TO_CHECK);

    expect(segments.length).toEqual(0);
    verify(mockLogger.log(anything(), anyString())).once();
  });

  it('should handle bad responses', async () => {
    const badResponse = '{"data":{ }}';
    when(mockOdpClient.querySegments(anything())).thenResolve(badResponse);
    const manager = new GraphqlManager(instance(mockLogger), instance(mockOdpClient));

    const segments = await manager.fetchSegments(VALID_ODP_PUBLIC_KEY, ODP_GRAPHQL_URL, FS_USER_ID, VALID_FS_USER_ID, SEGMENTS_TO_CHECK);

    expect(segments.length).toEqual(0);
    verify(mockLogger.log(LogLevel.ERROR, 'Audience segments fetch failed (decode error)')).once();
  });

  it('should handle non 200 HTTP status code response', async () => {
    when(mockOdpClient.querySegments(anything())).thenResolve(undefined);
    const manager = new GraphqlManager(instance(mockLogger), instance(mockOdpClient));

    const segments = await manager.fetchSegments(VALID_ODP_PUBLIC_KEY, ODP_GRAPHQL_URL, FS_USER_ID, VALID_FS_USER_ID, SEGMENTS_TO_CHECK);

    expect(segments.length).toEqual(0);
    verify(mockLogger.log(LogLevel.ERROR, 'Audience segments fetch failed (network error)')).once();
  });
});

