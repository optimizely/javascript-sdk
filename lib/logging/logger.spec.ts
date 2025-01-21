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
import { describe, beforeEach, afterEach, it, expect, vi, afterAll } from 'vitest';

import { ConsoleLogHandler, LogLevel, OptimizelyLogger } from './logger';
import { OptimizelyError } from '../error/optimizly_error';

describe('ConsoleLogHandler', () => {
  const logSpy = vi.spyOn(console, 'log');
  const debugSpy = vi.spyOn(console, 'debug');
  const infoSpy = vi.spyOn(console, 'info');
  const warnSpy = vi.spyOn(console, 'warn');
  const errorSpy = vi.spyOn(console, 'error');
  
  beforeEach(() => {
    logSpy.mockClear();
    debugSpy.mockClear();
    infoSpy.mockClear();
    warnSpy.mockClear();
    vi.useFakeTimers().setSystemTime(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  afterAll(() => {
    logSpy.mockRestore();
    debugSpy.mockRestore();
    infoSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();

    vi.useRealTimers();
  });

  it('should call console.info for LogLevel.Info', () => {
    const logger = new ConsoleLogHandler();
    logger.log(LogLevel.Info, 'test');

    expect(infoSpy).toHaveBeenCalledTimes(1);
  });

  it('should call console.debug for LogLevel.Debug', () => {
    const logger = new ConsoleLogHandler();
    logger.log(LogLevel.Debug, 'test');

    expect(debugSpy).toHaveBeenCalledTimes(1);
  });


  it('should call console.warn for LogLevel.Warn', () => {
    const logger = new ConsoleLogHandler();
    logger.log(LogLevel.Warn, 'test');

    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('should call console.error for LogLevel.Error', () => {
    const logger = new ConsoleLogHandler();
    logger.log(LogLevel.Error, 'test');

    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('should format the log message', () => {
    const logger = new ConsoleLogHandler();
    logger.log(LogLevel.Info, 'info message');
    logger.log(LogLevel.Debug, 'debug message');
    logger.log(LogLevel.Warn, 'warn message');
    logger.log(LogLevel.Error, 'error message');

    expect(infoSpy).toHaveBeenCalledWith('[OPTIMIZELY] - INFO 1970-01-01T00:00:00.000Z info message');
    expect(debugSpy).toHaveBeenCalledWith('[OPTIMIZELY] - DEBUG 1970-01-01T00:00:00.000Z debug message');
    expect(warnSpy).toHaveBeenCalledWith('[OPTIMIZELY] - WARN 1970-01-01T00:00:00.000Z warn message');
    expect(errorSpy).toHaveBeenCalledWith('[OPTIMIZELY] - ERROR 1970-01-01T00:00:00.000Z error message');
  });

  it('should use the prefix if provided', () => {
    const logger = new ConsoleLogHandler('PREFIX');
    logger.log(LogLevel.Info, 'info message');
    logger.log(LogLevel.Debug, 'debug message');
    logger.log(LogLevel.Warn, 'warn message');
    logger.log(LogLevel.Error, 'error message');

    expect(infoSpy).toHaveBeenCalledWith('PREFIX - INFO 1970-01-01T00:00:00.000Z info message');
    expect(debugSpy).toHaveBeenCalledWith('PREFIX - DEBUG 1970-01-01T00:00:00.000Z debug message');
    expect(warnSpy).toHaveBeenCalledWith('PREFIX - WARN 1970-01-01T00:00:00.000Z warn message');
    expect(errorSpy).toHaveBeenCalledWith('PREFIX - ERROR 1970-01-01T00:00:00.000Z error message');
  });
});


const mockMessageResolver = (prefix = '') => {
  return {
    resolve: vi.fn().mockImplementation((message) => `${prefix} ${message}`),
  };
}

const mockLogHandler = () => {
  return {
    log: vi.fn(),
  };
}

describe('OptimizelyLogger', () => {
  it('should only log error when level is set to error', () => {
    const logHandler = mockLogHandler();
    const messageResolver = mockMessageResolver();

    const logger = new OptimizelyLogger({
      logHandler,
      errorMsgResolver: messageResolver,
      level: LogLevel.Error,
    });
    
    logger.error('test');
    expect(logHandler.log).toHaveBeenCalledTimes(1);
    expect(logHandler.log.mock.calls[0][0]).toBe(LogLevel.Error);

    logger.warn('test');
    expect(logHandler.log).toHaveBeenCalledTimes(1);

    logger.info('test');
    expect(logHandler.log).toHaveBeenCalledTimes(1);

    logger.debug('test');
    expect(logHandler.log).toHaveBeenCalledTimes(1);
  });

  it('should only log warn and error when level is set to warn', () => {
    const logHandler = mockLogHandler();
    const messageResolver = mockMessageResolver();

    const logger = new OptimizelyLogger({
      logHandler,
      errorMsgResolver: messageResolver,
      level: LogLevel.Warn,
    });
    
    logger.error('test');
    expect(logHandler.log).toHaveBeenCalledTimes(1);
    expect(logHandler.log.mock.calls[0][0]).toBe(LogLevel.Error);

    logger.warn('test');
    expect(logHandler.log).toHaveBeenCalledTimes(2);
    expect(logHandler.log.mock.calls[1][0]).toBe(LogLevel.Warn);

    logger.info('test');
    expect(logHandler.log).toHaveBeenCalledTimes(2);

    logger.debug('test');
    expect(logHandler.log).toHaveBeenCalledTimes(2);
  });

  it('should only log info, warn and error when level is set to info', () => {
    const logHandler = mockLogHandler();
    const messageResolver = mockMessageResolver();

    const logger = new OptimizelyLogger({
      logHandler,
      infoMsgResolver: messageResolver,
      errorMsgResolver: messageResolver,
      level: LogLevel.Info,
    });
    
    logger.error('test');
    expect(logHandler.log).toHaveBeenCalledTimes(1);
    expect(logHandler.log.mock.calls[0][0]).toBe(LogLevel.Error);

    logger.warn('test');
    expect(logHandler.log).toHaveBeenCalledTimes(2);
    expect(logHandler.log.mock.calls[1][0]).toBe(LogLevel.Warn);

    logger.info('test');
    expect(logHandler.log).toHaveBeenCalledTimes(3);
    expect(logHandler.log.mock.calls[2][0]).toBe(LogLevel.Info);

    logger.debug('test');
    expect(logHandler.log).toHaveBeenCalledTimes(3);
  });

  it('should log all levels when level is set to debug', () => {
    const logHandler = mockLogHandler();
    const messageResolver = mockMessageResolver();

    const logger = new OptimizelyLogger({
      logHandler,
      infoMsgResolver: messageResolver,
      errorMsgResolver: messageResolver,
      level: LogLevel.Debug,
    });
    
    logger.error('test');
    expect(logHandler.log).toHaveBeenCalledTimes(1);
    expect(logHandler.log.mock.calls[0][0]).toBe(LogLevel.Error);

    logger.warn('test');
    expect(logHandler.log).toHaveBeenCalledTimes(2);
    expect(logHandler.log.mock.calls[1][0]).toBe(LogLevel.Warn);

    logger.info('test');
    expect(logHandler.log).toHaveBeenCalledTimes(3);
    expect(logHandler.log.mock.calls[2][0]).toBe(LogLevel.Info);

    logger.debug('test');
    expect(logHandler.log).toHaveBeenCalledTimes(4);
    expect(logHandler.log.mock.calls[3][0]).toBe(LogLevel.Debug);
  });

  it('should skip logging debug/info levels if not infoMessageResolver is available', () => {
    const logHandler = mockLogHandler();
    const messageResolver = mockMessageResolver();

    const logger = new OptimizelyLogger({
      logHandler,
      errorMsgResolver: messageResolver,
      level: LogLevel.Debug,
    });
    
    logger.info('test');
    logger.debug('test');
    expect(logHandler.log).not.toHaveBeenCalled();
  });

  it('should resolve debug/info messages using the infoMessageResolver', () => {
    const logHandler = mockLogHandler();

    const logger = new OptimizelyLogger({
      logHandler,
      infoMsgResolver: mockMessageResolver('info'),
      errorMsgResolver: mockMessageResolver('err'),
      level: LogLevel.Debug,
    });

    logger.debug('msg one');
    logger.info('msg two');
    expect(logHandler.log).toHaveBeenCalledTimes(2);
    expect(logHandler.log).toHaveBeenNthCalledWith(1, LogLevel.Debug, 'info msg one');
    expect(logHandler.log).toHaveBeenNthCalledWith(2, LogLevel.Info, 'info msg two');
  });

  it('should resolve warn/error messages using the infoMessageResolver', () => {
    const logHandler = mockLogHandler();

    const logger = new OptimizelyLogger({
      logHandler,
      infoMsgResolver: mockMessageResolver('info'),
      errorMsgResolver: mockMessageResolver('err'),
      level: LogLevel.Debug,
    });

    logger.warn('msg one');
    logger.error('msg two');
    expect(logHandler.log).toHaveBeenCalledTimes(2);
    expect(logHandler.log).toHaveBeenNthCalledWith(1, LogLevel.Warn, 'err msg one');
    expect(logHandler.log).toHaveBeenNthCalledWith(2, LogLevel.Error, 'err msg two');
  });

  it('should use the provided name as message prefix', () => {
    const logHandler = mockLogHandler();

    const logger = new OptimizelyLogger({
      name: 'EventManager',
      logHandler,
      infoMsgResolver: mockMessageResolver('info'),
      errorMsgResolver: mockMessageResolver('err'),
      level: LogLevel.Debug,
    });

    logger.warn('msg one');
    logger.error('msg two');
    logger.debug('msg three');
    logger.info('msg four');
    expect(logHandler.log).toHaveBeenCalledTimes(4);
    expect(logHandler.log).toHaveBeenNthCalledWith(1, LogLevel.Warn, 'EventManager: err msg one');
    expect(logHandler.log).toHaveBeenNthCalledWith(2, LogLevel.Error, 'EventManager: err msg two');
    expect(logHandler.log).toHaveBeenNthCalledWith(3, LogLevel.Debug, 'EventManager: info msg three');
    expect(logHandler.log).toHaveBeenNthCalledWith(4, LogLevel.Info, 'EventManager: info msg four');
  });

  it('should format the message with the give parameters', () => {
    const logHandler = mockLogHandler();

    const logger = new OptimizelyLogger({
      name: 'EventManager',
      logHandler,
      infoMsgResolver: mockMessageResolver('info'),
      errorMsgResolver: mockMessageResolver('err'),
      level: LogLevel.Debug,
    });

    logger.warn('msg %s, %s', 'one', 1);
    logger.error('msg %s', 'two');
    logger.debug('msg three', 9999);
    logger.info('msg four%s%s', '!', '!');
    expect(logHandler.log).toHaveBeenCalledTimes(4);
    expect(logHandler.log).toHaveBeenNthCalledWith(1, LogLevel.Warn, 'EventManager: err msg one, 1');
    expect(logHandler.log).toHaveBeenNthCalledWith(2, LogLevel.Error, 'EventManager: err msg two');
    expect(logHandler.log).toHaveBeenNthCalledWith(3, LogLevel.Debug, 'EventManager: info msg three');
    expect(logHandler.log).toHaveBeenNthCalledWith(4, LogLevel.Info, 'EventManager: info msg four!!');
  });

  it('should log the message of the error object and ignore other arguments if first argument is an error object \
        other that OptimizelyError', () => {
    const logHandler = mockLogHandler();

    const logger = new OptimizelyLogger({
      name: 'EventManager',
      logHandler,
      infoMsgResolver: mockMessageResolver('info'),
      errorMsgResolver: mockMessageResolver('err'),
      level: LogLevel.Debug,
    });
    logger.debug(new Error('msg debug %s'), 'a');
    logger.info(new Error('msg info %s'), 'b');
    logger.warn(new Error('msg warn %s'), 'c');
    logger.error(new Error('msg error %s'), 'd');

    expect(logHandler.log).toHaveBeenCalledTimes(4);
    expect(logHandler.log).toHaveBeenNthCalledWith(1, LogLevel.Debug, 'EventManager: msg debug %s');
    expect(logHandler.log).toHaveBeenNthCalledWith(2, LogLevel.Info, 'EventManager: msg info %s');
    expect(logHandler.log).toHaveBeenNthCalledWith(3, LogLevel.Warn, 'EventManager: msg warn %s');
    expect(logHandler.log).toHaveBeenNthCalledWith(4, LogLevel.Error, 'EventManager: msg error %s');
  });

  it('should resolve and log the message of an OptimizelyError using error resolver and ignore other arguments', () => {
    const logHandler = mockLogHandler();

    const logger = new OptimizelyLogger({
      name: 'EventManager',
      logHandler,
      infoMsgResolver: mockMessageResolver('info'),
      errorMsgResolver: mockMessageResolver('err'),
      level: LogLevel.Debug,
    });

    const err = new OptimizelyError('msg %s %s', 1, 2);
    logger.debug(err, 'a');
    logger.info(err, 'a');
    logger.warn(err, 'a');
    logger.error(err, 'a');

    expect(logHandler.log).toHaveBeenCalledTimes(4);
    expect(logHandler.log).toHaveBeenNthCalledWith(1, LogLevel.Debug, 'EventManager: err msg 1 2');
    expect(logHandler.log).toHaveBeenNthCalledWith(2, LogLevel.Info, 'EventManager: err msg 1 2');
    expect(logHandler.log).toHaveBeenNthCalledWith(3, LogLevel.Warn, 'EventManager: err msg 1 2');
    expect(logHandler.log).toHaveBeenNthCalledWith(4, LogLevel.Error, 'EventManager: err msg 1 2');
  });

  it('should return a new logger with the new name but same level, handler and resolvers when child() is called', () => {
    const logHandler = mockLogHandler();

    const logger = new OptimizelyLogger({
      name: 'EventManager',
      logHandler,
      infoMsgResolver: mockMessageResolver('info'),
      errorMsgResolver: mockMessageResolver('err'),
      level: LogLevel.Info,
    });

    const childLogger = logger.child('ChildLogger');
    childLogger.debug('msg one %s', 1);
    childLogger.info('msg two %s', 2);
    childLogger.warn('msg three %s', 3);
    childLogger.error('msg four %s', 4);

    expect(logHandler.log).toHaveBeenCalledTimes(3);
    expect(logHandler.log).toHaveBeenNthCalledWith(1, LogLevel.Info, 'ChildLogger: info msg two 2');
    expect(logHandler.log).toHaveBeenNthCalledWith(2, LogLevel.Warn, 'ChildLogger: err msg three 3');
    expect(logHandler.log).toHaveBeenNthCalledWith(3, LogLevel.Error, 'ChildLogger: err msg four 4');
  });
});
