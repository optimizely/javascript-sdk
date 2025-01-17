import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('./logger', async (importOriginal) => {
  const actual = await importOriginal()

  const MockLogger = vi.fn();
  const MockConsoleLogHandler = vi.fn();

  return { ...actual as any, OptimizelyLogger: MockLogger, ConsoleLogHandler: MockConsoleLogHandler };
});

import { OptimizelyLogger, ConsoleLogHandler, LogLevel } from './logger';
import { createLogger, extractLogger, InfoLog } from './logger_factory';
import { errorResolver, infoResolver } from '../message/message_resolver';

describe('create', () => {
  const MockedOptimizelyLogger = vi.mocked(OptimizelyLogger);
  const MockedConsoleLogHandler = vi.mocked(ConsoleLogHandler);

  beforeEach(() => {
    MockedConsoleLogHandler.mockClear();
    MockedOptimizelyLogger.mockClear();
  });

  it('should use the passed in options and a default name Optimizely', () => {
    const mockLogHandler = { log: vi.fn() };

    const logger = extractLogger(createLogger({
      level: InfoLog,
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
      level: InfoLog,
    }));

    expect(logger).toBe(MockedOptimizelyLogger.mock.instances[0]);
    const { logHandler } = MockedOptimizelyLogger.mock.calls[0][0];
    expect(logHandler).toBe(MockedConsoleLogHandler.mock.instances[0]);
  });
});