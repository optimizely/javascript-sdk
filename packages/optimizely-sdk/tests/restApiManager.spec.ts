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
import { ErrorHandler, LogHandler } from '../lib/modules/logging';
import { RestApiManager } from '../lib/plugins/odp/rest_api_manager';
import { OdpEvent } from '../lib/plugins/odp/odp_event';

describe('RestApiManager', () => {
  const VALID_ODP_PUBLIC_KEY = 'not-real-api-key';
  const ODP_REST_API_HOST = 'https://api.example.com';
  const ODP_EVENTS = [
    new OdpEvent('t1', 'a1',
      new Map([['id-key-1', 'id-value-1']]),
      new Map(Object.entries({
        key11: 'value-1',
        key12: true,
        key13: 3.5,
        key14: null,
      }))),
    new OdpEvent('t2', 'a2',
      new Map([['id-key-2', 'id-value-2']]),
      new Map(Object.entries({
        key2: 'value-2',
      }))),
  ];

  const makeManagerInstance = () => new RestApiManager(instance(mockLogger), instance(mockOdpClient));

  let mockErrorHandler: ErrorHandler;
  let mockLogger: LogHandler;
  let mockOdpClient: IOdpClient;

  beforeAll(() => {
    mockErrorHandler = mock<ErrorHandler>();
    mockLogger = mock<LogHandler>();
    mockOdpClient = mock<OdpClient>();
  });

  beforeEach(() => {
    resetCalls(mockErrorHandler);
    resetCalls(mockLogger);
    resetCalls(mockOdpClient);
  });

  it('should should send events successfully and not suggest retry', async () => {
    when(mockOdpClient.sendEvents(anyString(), anyString(), anyString())).thenResolve(200);
    const manager = makeManagerInstance();

    const shouldRetry = await manager.sendEvents(VALID_ODP_PUBLIC_KEY, ODP_REST_API_HOST, ODP_EVENTS);

    expect(shouldRetry).toBe(false);
    verify(mockErrorHandler.handleError(anything())).never();
    verify(mockLogger.log(anything(), anyString())).never();
  });

  it('should not suggest a retry for 400 HTTP response', async () => {
    when(mockOdpClient.sendEvents(anyString(), anyString(), anyString())).thenResolve(400);
    const manager = makeManagerInstance();

    const shouldRetry = await manager.sendEvents(VALID_ODP_PUBLIC_KEY, ODP_REST_API_HOST, ODP_EVENTS);

    expect(shouldRetry).toBe(false);
    verify(mockErrorHandler.handleError(anything())).never();
    verify(mockLogger.log(anything(), anyString())).never();
  });

  it('should suggest a retry for 500 HTTP response', async () => {
    when(mockOdpClient.sendEvents(anyString(), anyString(), anyString())).thenResolve(500);
    const manager = makeManagerInstance();

    const shouldRetry = await manager.sendEvents(VALID_ODP_PUBLIC_KEY, ODP_REST_API_HOST, ODP_EVENTS);

    expect(shouldRetry).toBe(true);
    verify(mockErrorHandler.handleError(anything())).never();
    verify(mockLogger.log(anything(), anyString())).never();
  });

  it('should suggest a retry for network timeout', async () => {
    when(mockOdpClient.sendEvents(anyString(), anyString(), anyString())).thenResolve(0);
    const manager = makeManagerInstance();

    const shouldRetry = await manager.sendEvents(VALID_ODP_PUBLIC_KEY, ODP_REST_API_HOST, ODP_EVENTS);

    expect(shouldRetry).toBe(true);
    verify(mockErrorHandler.handleError(anything())).never();
    verify(mockLogger.log(anything(), anyString())).never();
  });
});

