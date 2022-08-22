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
import { LogHandler, LogLevel } from '../lib/modules/logging';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import { OdpClient } from '../lib/plugins/odp/odp_client';
import { QuerySegmentsParameters } from '../lib/plugins/odp/query_segments_parameters';

describe('OdpClient', () => {
  const MOCK_QUERY_PARAMETERS = new QuerySegmentsParameters({
    ApiKey: 'not-real-api-key',
    ApiHost: 'https://api.example.com/v3/graphql',
    UserKey: 'fs_user_id',
    UserValue: 'mock-user-id',
    SegmentsToCheck: [
      'has_email',
      'has_email_opted_in',
      'push_on_sale',
    ],
  });

  let mockLogger: LogHandler;
  let mockAxios: MockAdapter;

  beforeAll(() => {
    mockLogger = mock<LogHandler>();
    mockAxios = new MockAdapter(axios);
  });

  beforeEach(() => {
    resetCalls(mockLogger);
    mockAxios.reset();
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
    mockAxios.onPost(/.*/).reply(200, responseJson);
    const client = new OdpClient(instance(mockLogger));

    const response = await client.querySegments(MOCK_QUERY_PARAMETERS);

    expect(response).toEqual(responseJson);
    verify(mockLogger.log(anything(), anyString())).never();
  });

  it('should handle missing API Host', async () => {
    const missingApiHost = new QuerySegmentsParameters({
      ApiKey: 'apiKey',
      ApiHost: '',
      UserKey: 'userKey',
      UserValue: 'userValue',
      SegmentsToCheck: ['segmentToCheck'],
    });
    const client = new OdpClient(instance(mockLogger));

    await client.querySegments(missingApiHost);

    verify(mockLogger.log(LogLevel.ERROR, 'No ApiHost or ApiKey set before querying segments')).once();
  });

  it('should handle missing API Key', async () => {
    const missingApiHost = new QuerySegmentsParameters({
      ApiKey: '',
      ApiHost: 'apiHost',
      UserKey: 'userKey',
      UserValue: 'userValue',
      SegmentsToCheck: ['segmentToCheck'],
    });
    const client = new OdpClient(instance(mockLogger));

    await client.querySegments(missingApiHost);

    verify(mockLogger.log(LogLevel.ERROR, 'No ApiHost or ApiKey set before querying segments')).once();
  });

  it('should handle 400 HTTP response', async () => {
    mockAxios.onPost(/.*/).reply(400, { throwAway: 'data' });
    const client = new OdpClient(instance(mockLogger));

    const responseJson = await client.querySegments(MOCK_QUERY_PARAMETERS);

    expect(responseJson).toBeUndefined();
    verify(mockLogger.log(LogLevel.ERROR, 'Audience segments fetch failed (400)')).once();
  });

  it('should handle 500 HTTP response', async () => {
    mockAxios.onPost(/.*/).reply(500, { throwAway: 'data' });
    const client = new OdpClient(instance(mockLogger));

    const responseJson = await client.querySegments(MOCK_QUERY_PARAMETERS);

    expect(responseJson).toBeUndefined();
    verify(mockLogger.log(LogLevel.ERROR, 'Audience segments fetch failed (500)')).once();
  });

  it('should handle a network timeout', async () => {
    mockAxios.onPost(/.*/).timeout();
    const client = new OdpClient(instance(mockLogger));

    const responseJson = await client.querySegments(MOCK_QUERY_PARAMETERS);

    expect(responseJson).toBeUndefined();
    verify(mockLogger.log(LogLevel.ERROR, 'Audience segments fetch failed (network error)')).once();
  });
});

