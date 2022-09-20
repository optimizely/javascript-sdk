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
import { ErrorHandler, LogHandler, LogLevel } from '../lib/modules/logging';
import { GraphqlManager } from '../lib/plugins/odp/graphql_manager';
import { Response } from '../lib/plugins/odp/odp_types';
import { ODP_USER_KEY } from '../lib/utils/enums';
import { ResetApiManager } from '../lib/plugins/odp/rest_api_manager';

describe('RestApiManager', () => {
  const VALID_ODP_PUBLIC_KEY = 'not-real-api-key';
  const ODP_GRAPHQL_URL = 'https://api.example.com/data/';

  const makeManagerInstance = () => new ResetApiManager(instance(mockErrorHandler), instance(mockLogger), instance(mockOdpClient));

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

  it('should should send events successfully', async () => {
    const manager = makeManagerInstance();

  });

  it('should handle and return 400 HTTP response', async () => {
    const manager = makeManagerInstance();

  });

  it('should handle and return 500 HTTP response', async () => {
    const manager = makeManagerInstance();

  });

  it('should handle a network timeout', async () => {
    const manager = makeManagerInstance();

  });

});

