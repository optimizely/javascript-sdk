/**
 * Copyright 2022-2024 Optimizely
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

import { describe, it, expect } from 'vitest';

import { ODP_USER_KEY } from '../constant';
import { getMockRequestHandler } from '../../tests/mock/mock_request_handler';
import { getMockLogger } from '../../tests/mock/mock_logger';
import { DefaultOdpSegmentApiManager } from './odp_segment_api_manager';
import { REQUEST_TIMEOUT } from '../../exception_messages';

const API_KEY = 'not-real-api-key';
const GRAPHQL_ENDPOINT = 'https://some.example.com/graphql/endpoint';
const USER_KEY = ODP_USER_KEY.FS_USER_ID;
const USER_VALUE = 'tester-101';
const SEGMENTS_TO_CHECK = ['has_email', 'has_email_opted_in', 'push_on_sale'];

describe('DefaultOdpSegmentApiManager', () => {
    it('should return empty list without calling api when segmentsToCheck is empty', async () => {
      const requestHandler = getMockRequestHandler();
      requestHandler.makeRequest.mockReturnValue({
        abort: () => {},
        responsePromise: Promise.resolve({ statusCode: 200, body: '' }),
      });
      const logger = getMockLogger();
      const manager = new DefaultOdpSegmentApiManager(requestHandler, logger);
      const segments = await manager.fetchSegments(API_KEY, GRAPHQL_ENDPOINT, USER_KEY, USER_VALUE, []);

      expect(segments).toEqual([]);
      expect(requestHandler.makeRequest).not.toHaveBeenCalled();
  });

  it('should return null and log error if requestHandler promise rejects', async () => {
    const requestHandler = getMockRequestHandler();
    requestHandler.makeRequest.mockReturnValue({
      abort: () => {},
      responsePromise: Promise.reject(new Error(REQUEST_TIMEOUT)),
    });
    const logger = getMockLogger();
    const manager = new DefaultOdpSegmentApiManager(requestHandler, logger);
    const segments = await manager.fetchSegments(API_KEY, GRAPHQL_ENDPOINT, USER_KEY, USER_VALUE, SEGMENTS_TO_CHECK);

    expect(segments).toBeNull();
    expect(logger.error).toHaveBeenCalledOnce();
  });

  it('should log error and return null in case of non 200 HTTP status code response', async () => {
    const requestHandler = getMockRequestHandler();
    requestHandler.makeRequest.mockReturnValue({
      abort: () => {},
      responsePromise: Promise.resolve({ statusCode: 500, body: '' }),
    });
    const logger = getMockLogger();
    const manager = new DefaultOdpSegmentApiManager(requestHandler, logger);
    const segments = await manager.fetchSegments(API_KEY, GRAPHQL_ENDPOINT, USER_KEY, USER_VALUE, SEGMENTS_TO_CHECK);

    expect(segments).toBeNull();
    expect(logger.error).toHaveBeenCalledOnce();
  });

  it('should return null and log error if response body is invalid JSON', async () => {
    const invalidJsonResponse = 'not-a-valid-json-response';
    const requestHandler = getMockRequestHandler();
    requestHandler.makeRequest.mockReturnValue({
      abort: () => {},
      responsePromise: Promise.resolve({ statusCode: 200, body: invalidJsonResponse }),
    });

    const logger = getMockLogger();
    const manager = new DefaultOdpSegmentApiManager(requestHandler, logger);
    const segments = await manager.fetchSegments(API_KEY, GRAPHQL_ENDPOINT, USER_KEY, USER_VALUE, SEGMENTS_TO_CHECK);

    expect(segments).toBeNull();
    expect(logger.error).toHaveBeenCalledOnce();
  });

  it('should return null and log error if response body is unrecognized JSON', async () => {
    const invalidJsonResponse = '{"a":1}';
    const requestHandler = getMockRequestHandler();
    requestHandler.makeRequest.mockReturnValue({
      abort: () => {},
      responsePromise: Promise.resolve({ statusCode: 200, body: invalidJsonResponse }),
    });

    const logger = getMockLogger();
    const manager = new DefaultOdpSegmentApiManager(requestHandler, logger);
    const segments = await manager.fetchSegments(API_KEY, GRAPHQL_ENDPOINT, USER_KEY, USER_VALUE, SEGMENTS_TO_CHECK);

    expect(segments).toBeNull();
    expect(logger.error).toHaveBeenCalledOnce();
  });

  it('should log error and return null in case of invalid identifier error response', async () => {
    const INVALID_USER_ID = 'invalid-user';
    const errorJsonResponse =
      '{"errors":[{"message":' +
      '"Exception while fetching data (/customer) : ' +
      `Exception: could not resolve _fs_user_id = ${INVALID_USER_ID}",` +
      '"locations":[{"line":1,"column":8}],"path":["customer"],' +
      '"extensions":{"code": "INVALID_IDENTIFIER_EXCEPTION","classification":"DataFetchingException"}}],' +
      '"data":{"customer":null}}';

    const requestHandler = getMockRequestHandler();
    requestHandler.makeRequest.mockReturnValue({
      abort: () => {},
      responsePromise: Promise.resolve({ statusCode: 200, body: errorJsonResponse }),
    });

    const logger = getMockLogger();
    const manager = new DefaultOdpSegmentApiManager(requestHandler, logger);
    const segments = await manager.fetchSegments(API_KEY, GRAPHQL_ENDPOINT, USER_KEY, 'mock_user_id', SEGMENTS_TO_CHECK);
    expect(segments).toBeNull();
    expect(logger.error).toHaveBeenCalledWith('Audience segments fetch failed (invalid identifier)');
  });

  it('should log error and return null in case of errors other than invalid identifier error', async () => {
    const INVALID_USER_ID = 'invalid-user';
    const errorJsonResponse =
      '{"errors":[{"message":' +
      '"Exception while fetching data (/customer) : ' +
      `Exception: could not resolve _fs_user_id = ${INVALID_USER_ID}",` +
      '"locations":[{"line":1,"column":8}],"path":["customer"],' +
      '"extensions":{"classification":"DataFetchingException"}}],' +
      '"data":{"customer":null}}';

    const requestHandler = getMockRequestHandler();
    requestHandler.makeRequest.mockReturnValue({
      abort: () => {},
      responsePromise: Promise.resolve({ statusCode: 200, body: errorJsonResponse }),
    });

    const logger = getMockLogger();
    const manager = new DefaultOdpSegmentApiManager(requestHandler, logger);
    const segments = await manager.fetchSegments(API_KEY, GRAPHQL_ENDPOINT, USER_KEY, 'mock_user_id', SEGMENTS_TO_CHECK);
    expect(segments).toBeNull();
    expect(logger.error).toHaveBeenCalledWith('Audience segments fetch failed (DataFetchingException)');
  });

  it('should log error and return null in case of response with invalid falsy edges field', async () => {
    const jsonResponse = `{
      "data": {
        "customer": {
          "audiences": {
          }
        }
      }
    }`;

    const requestHandler = getMockRequestHandler();
    requestHandler.makeRequest.mockReturnValue({
      abort: () => {},
      responsePromise: Promise.resolve({ statusCode: 200, body: jsonResponse }),
    });

    const logger = getMockLogger();
    const manager = new DefaultOdpSegmentApiManager(requestHandler, logger);
    const segments = await manager.fetchSegments(API_KEY, GRAPHQL_ENDPOINT, USER_KEY, USER_VALUE, SEGMENTS_TO_CHECK);

    expect(segments).toBeNull();
    expect(logger.error).toHaveBeenCalledOnce();
  });

  it('should parse a success response and return qualified segments', async () => {
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

    const requestHandler = getMockRequestHandler();
    requestHandler.makeRequest.mockReturnValue({
      abort: () => {},
      responsePromise: Promise.resolve({ statusCode: 200, body: validJsonResponse }),
    });

    const manager = new DefaultOdpSegmentApiManager(requestHandler);
    const segments = await manager.fetchSegments(API_KEY, GRAPHQL_ENDPOINT, USER_KEY, USER_VALUE, SEGMENTS_TO_CHECK);

    expect(segments).toEqual(['has_email']);
  });

  it('should handle empty qualified segments', async () => {
    const responseJsonWithNoQualifiedSegments = '{"data":{"customer":{"audiences":' + '{"edges":[ ]}}}}';
    const requestHandler = getMockRequestHandler();
    requestHandler.makeRequest.mockReturnValue({
      abort: () => {},
      responsePromise: Promise.resolve({ statusCode: 200, body: responseJsonWithNoQualifiedSegments }),
    });

    const manager = new DefaultOdpSegmentApiManager(requestHandler);
    const segments = await manager.fetchSegments(API_KEY, GRAPHQL_ENDPOINT, USER_KEY, USER_VALUE, SEGMENTS_TO_CHECK);

    expect(segments).toEqual([]);
  });

  it('should construct a valid GraphQL query request', async () => {
    const requestHandler = getMockRequestHandler();
    requestHandler.makeRequest.mockReturnValue({
      abort: () => {},
      responsePromise: Promise.resolve({ statusCode: 200, body: '' }),
    });

    const manager = new DefaultOdpSegmentApiManager(requestHandler);
    await manager.fetchSegments(API_KEY, GRAPHQL_ENDPOINT, USER_KEY, USER_VALUE, SEGMENTS_TO_CHECK);

    expect(requestHandler.makeRequest).toHaveBeenCalledWith(
      `${GRAPHQL_ENDPOINT}/v3/graphql`,
      {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      'POST',
      `{"query" : "query {customer(${USER_KEY} : \\"${USER_VALUE}\\") {audiences(subset: [\\"has_email\\",\\"has_email_opted_in\\",\\"push_on_sale\\"]) {edges {node {name state}}}}}"}`
    );
  });
});
