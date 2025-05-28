/**
 * Copyright 2025, Optimizely
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
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('./logger', async (importOriginal) => {
  const actual = await importOriginal()

  const MockLogger = vi.fn();
  const MockConsoleLogHandler = vi.fn();

  return { ...actual as any, OptimizelyLogger: MockLogger, ConsoleLogHandler: MockConsoleLogHandler };
});

import { OptimizelyLogger, ConsoleLogHandler, LogLevel } from './logger';
import { createLogger, extractLogger, INFO } from './logger_factory';
import { errorResolver, infoResolver } from '../message/message_resolver';

describe('createLogger', () => {
  const MockedOptimizelyLogger = vi.mocked(OptimizelyLogger);
  const MockedConsoleLogHandler = vi.mocked(ConsoleLogHandler);

  beforeEach(() => {
    MockedConsoleLogHandler.mockClear();
    MockedOptimizelyLogger.mockClear();
  });

  it('should throw an error if the provided logHandler is not a valid LogHandler', () => {
    expect(() => createLogger({
      level: INFO,
      logHandler: {} as any,
    })).toThrow('Invalid log handler');

    expect(() => createLogger({
      level: INFO,
      logHandler: { log: 'abc' } as any,
    })).toThrow('Invalid log handler');

    expect(() => createLogger({
      level: INFO,
      logHandler: 'abc' as any,
    })).toThrow('Invalid log handler');
  });

  it('should throw an error if the level is not a valid level preset', () => {
    expect(() => createLogger({
      level: null as any,
    })).toThrow('Invalid level preset');

    expect(() => createLogger({
      level: undefined as any,
    })).toThrow('Invalid level preset');

    expect(() => createLogger({
      level: 'abc' as any,
    })).toThrow('Invalid level preset');

    expect(() => createLogger({
      level: 123 as any,
    })).toThrow('Invalid level preset');

    expect(() => createLogger({
      level: {} as any,
    })).toThrow('Invalid level preset');
  });

  it('should use the passed in options and a default name Optimizely', () => {
    const mockLogHandler = { log: vi.fn() };

    const logger = extractLogger(createLogger({
      level: INFO,
      logHandler: mockLogHandler,
    }));

    expect(logger).toBe(MockedOptimizelyLogger.mock.instances[0]);
    const { name, level, infoMsgResolver, errorMsgResolver, logHandler } = MockedOptimizelyLogger.mock.calls[0][0];
    expect(name).toBe('Optimizely');
    expect(level).toBe(LogLevel.Info);
    expect(infoMsgResolver).toBe(infoResolver);
    expect(errorMsgResolver).toBe(errorResolver);
    expect(logHandler).toBe(mockLogHandler);
  });

  it('should use a ConsoleLogHandler if no logHandler is provided', () => {
    const logger = extractLogger(createLogger({
      level: INFO,
    }));

    expect(logger).toBe(MockedOptimizelyLogger.mock.instances[0]);
    const { logHandler } = MockedOptimizelyLogger.mock.calls[0][0];
    expect(logHandler).toBe(MockedConsoleLogHandler.mock.instances[0]);
  });
});