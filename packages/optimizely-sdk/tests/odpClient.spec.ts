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

import { anyString, anything, instance, mock, resetCalls, verify } from 'ts-mockito';
import { ErrorHandler, LogHandler, LogLevel } from '../lib/modules/logging';
import { OdpClient } from '../lib/plugins/odp/odp_client';
import { QuerySegmentsParameters } from '../lib/plugins/odp/query_segments_parameters';

describe('OdpClient', () => {
  const MOCK_QUERY_PARAMETERS = new QuerySegmentsParameters({
    apiKey: 'not-real-api-key',
    apiHost: 'https://api.example.com/v3/graphql',
    userKey: 'fs_user_id',
    userValue: 'mock-user-id',
    segmentsToCheck: [
      'has_email',
      'has_email_opted_in',
      'push_on_sale',
    ],
  });

  const makeClientInstance = () => new OdpClient(instance(mockErrorHandler), instance(mockLogger));

  let mockErrorHandler: ErrorHandler;
  let mockLogger: LogHandler;

  beforeAll(() => {
    mockErrorHandler = mock<ErrorHandler>();
    mockLogger = mock<LogHandler>();
  });

  beforeEach(() => {
    resetCalls(mockErrorHandler);
    resetCalls(mockLogger);
  });

  it('should get mocked segments successfully', async () => {
    const responseJson = {
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
    //mockAxios.onPost(/.*/).reply(200, responseJson);
    const client = makeClientInstance();

    const response = await client.querySegments(MOCK_QUERY_PARAMETERS);

    expect(response).toEqual(responseJson);
    verify(mockErrorHandler.handleError(anything())).never();
    verify(mockLogger.log(anything(), anyString())).never();
  });

  it('should handle missing API Host', async () => {
    const missingApiHost = new QuerySegmentsParameters({
      apiKey: 'apiKey',
      apiHost: '',
      userKey: 'userKey',
      userValue: 'userValue',
      segmentsToCheck: ['segmentToCheck'],
    });
    const client = makeClientInstance();

    await client.querySegments(missingApiHost);

    verify(mockErrorHandler.handleError(anything())).never();
    verify(mockLogger.log(LogLevel.ERROR, 'No ApiHost or ApiKey set before querying segments')).once();
  });

  it('should handle missing API Key', async () => {
    const missingApiHost = new QuerySegmentsParameters({
      apiKey: '',
      apiHost: 'apiHost',
      userKey: 'userKey',
      userValue: 'userValue',
      segmentsToCheck: ['segmentToCheck'],
    });
    const client = makeClientInstance();

    await client.querySegments(missingApiHost);

    verify(mockErrorHandler.handleError(anything())).never();
    verify(mockLogger.log(LogLevel.ERROR, 'No ApiHost or ApiKey set before querying segments')).once();
  });

  it('should handle 400 HTTP response', async () => {
    //mockAxios.onPost(/.*/).reply(400, { throwAway: 'data' });
    const client = makeClientInstance();

    const responseJson = await client.querySegments(MOCK_QUERY_PARAMETERS);

    expect(responseJson).toBeNull();
    verify(mockErrorHandler.handleError(anything())).once();
    verify(mockLogger.log(LogLevel.ERROR, 'Audience segments fetch failed (400)')).once();
  });

  it('should handle 500 HTTP response', async () => {
    //mockAxios.onPost(/.*/).reply(500, { throwAway: 'data' });
    const client = makeClientInstance();

    const responseJson = await client.querySegments(MOCK_QUERY_PARAMETERS);

    expect(responseJson).toBeNull();
    verify(mockErrorHandler.handleError(anything())).once();
    verify(mockLogger.log(LogLevel.ERROR, 'Audience segments fetch failed (500)')).once();
  });

  it('should handle a network timeout', async () => {
    //mockAxios.onPost(/.*/).timeout();
    const client = makeClientInstance();

    const responseJson = await client.querySegments(MOCK_QUERY_PARAMETERS);

    expect(responseJson).toBeNull();
    verify(mockErrorHandler.handleError(anything())).once();
    verify(mockLogger.log(LogLevel.ERROR, 'Audience segments fetch failed (network error)')).once();
  });
});

