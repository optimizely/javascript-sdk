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

import { anyString, anything, mock, resetCalls, verify } from 'ts-mockito';
import { LogHandler, LogLevel } from '../lib/modules/logging';

describe('OdpClient', () => {
  let mockLogger: LogHandler;

  beforeAll(() => {
    mockLogger = mock<LogHandler>();
  });

  beforeEach(() => {
    resetCalls(mockLogger);
  });

  it('should segments successfully', () => {

    verify(mockLogger.log(anything(), anyString())).never();
  });

  it('should handle missing API Host', () => {

    verify(mockLogger.log(LogLevel.ERROR, 'No ApiHost or ApiKey set before querying segments')).once();
  });

  it('should handle missing API Key', () => {

    verify(mockLogger.log(LogLevel.ERROR, 'No ApiHost or ApiKey set before querying segments')).once();
  });

  it('should handle 400 HTTP response', () => {

    verify(mockLogger.log(LogLevel.ERROR, 'Audience segments fetch failed (400)')).once();
  });

  it('should handle 500 HTTP response', () => {

    verify(mockLogger.log(LogLevel.ERROR, 'Audience segments fetch failed (500)')).once();
  });

  it('should other types of unsuccessful HTTP responses', () => {

    verify(mockLogger.log(LogLevel.ERROR, 'Audience segments fetch failed (network error)')).once();
  });
});

