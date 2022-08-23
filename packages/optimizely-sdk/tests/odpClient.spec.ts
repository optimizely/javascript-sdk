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

import fetchMock, { enableFetchMocks } from 'jest-fetch-mock';
import { anyString, anything, instance, mock, resetCalls, verify } from 'ts-mockito';
import { LogHandler, LogLevel } from '../lib/modules/logging';
import { OdpClient } from '../lib/plugins/odp/odp_client';
import { QuerySegmentsParameters } from '../lib/plugins/odp/query_segments_parameters';

enableFetchMocks();

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

  beforeAll(() => {
    mockLogger = mock<LogHandler>();
  });

  beforeEach(() => {
    resetCalls(mockLogger);
    fetchMock.resetMocks();
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
    jest.spyOn(global, 'fetch').mockImplementation(jest.fn(() => {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(responseJson),
      } as Response);
    }));
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
    const errorResponse = {
      ok: false,
      status: 400,
      statusText: 'Mock 400 error message which is still a Promise.resolve()',
    };
    jest.spyOn(global, 'fetch').mockImplementation(jest.fn(() => {
      return Promise.resolve(errorResponse as Response);
    }));
    const client = new OdpClient(instance(mockLogger));

    const responseJson = await client.querySegments(MOCK_QUERY_PARAMETERS);

    expect(responseJson).toBeUndefined();
    verify(mockLogger.log(LogLevel.ERROR, 'Audience segments fetch failed (400)')).once();
  });

  it('should handle 500 HTTP response', async () => {
    const errorResponse = {
      ok: false,
      status: 500,
      statusText: 'Mock 500 error message which is still a Promise.resolve()',
    };
    jest.spyOn(global, 'fetch').mockImplementation(jest.fn(() => {
      return Promise.resolve(errorResponse as Response);
    }));
    const client = new OdpClient(instance(mockLogger));

    const responseJson = await client.querySegments(MOCK_QUERY_PARAMETERS);

    expect(responseJson).toBeUndefined();
    verify(mockLogger.log(LogLevel.ERROR, 'Audience segments fetch failed (500)')).once();
  });

  it('should handle a network timeout', async () => {
    const errorResponse = {
      ok: false,
      statusText: 'Unexpected mock network issue which causes a Promise.reject()',
    };
    jest.spyOn(global, 'fetch').mockImplementation(jest.fn(() => {
      return Promise.reject(errorResponse as Response);
    }));
    const client = new OdpClient(instance(mockLogger));

    const responseJson = await client.querySegments(MOCK_QUERY_PARAMETERS);

    expect(responseJson).toBeUndefined();
    verify(mockLogger.log(LogLevel.ERROR, 'Audience segments fetch failed (network error)')).once();
  });
});

