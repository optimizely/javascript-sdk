import { describe, beforeEach, afterEach, it, expect, vi, afterAll } from 'vitest';

import { ConsoleLogHandler, LogLevel, OptimizelyLogger } from './logger';

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
    vi.useFakeTimers().setSystemTime((0));
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
    expect(debugSpy).toHaveBeenCalledWith('[OPTIMIZELY] - DEGUB 1970-01-01T00:00:00.000Z debug message');
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
    expect(debugSpy).toHaveBeenCalledWith('PREFIX - DEGUB 1970-01-01T00:00:00.000Z debug message');
    expect(warnSpy).toHaveBeenCalledWith('PREFIX - WARN 1970-01-01T00:00:00.000Z warn message');
    expect(errorSpy).toHaveBeenCalledWith('PREFIX - ERROR 1970-01-01T00:00:00.000Z error message');
  });
});


const mockMessageResolver = (prefix: string = '') => {
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
});

// describe('logger', () => {
//   afterEach(() => {
//     resetLogger()
//     resetErrorHandler()
//   })

//   describe('OptimizelyLogger', () => {
//     let stubLogger: LogHandler
//     let logger: LoggerFacade
//     let stubErrorHandler: ErrorHandler

//     beforeEach(() => {
//       stubLogger = {
//         log: vi.fn(),
//       }
//       stubErrorHandler = {
//         handleError: vi.fn(),
//       }
//       setLogLevel(LogLevel.DEBUG)
//       setLogHandler(stubLogger)
//       setErrorHandler(stubErrorHandler)
//       logger = getLogger()
//     })

//     describe('setLogLevel', () => {
//       it('should coerce "debug"', () => {
//         setLogLevel('debug')
//         expect(getLogLevel()).toBe(LogLevel.DEBUG)
//       })

//       it('should coerce "deBug"', () => {
//         setLogLevel('deBug')
//         expect(getLogLevel()).toBe(LogLevel.DEBUG)
//       })

//       it('should coerce "INFO"', () => {
//         setLogLevel('INFO')
//         expect(getLogLevel()).toBe(LogLevel.INFO)
//       })

//       it('should coerce "WARN"', () => {
//         setLogLevel('WARN')
//         expect(getLogLevel()).toBe(LogLevel.WARNING)
//       })

//       it('should coerce "warning"', () => {
//         setLogLevel('warning')
//         expect(getLogLevel()).toBe(LogLevel.WARNING)
//       })

//       it('should coerce "ERROR"', () => {
//         setLogLevel('WARN')
//         expect(getLogLevel()).toBe(LogLevel.WARNING)
//       })

//       it('should default to error if invalid', () => {
//         setLogLevel('invalid')
//         expect(getLogLevel()).toBe(LogLevel.ERROR)
//       })
//     })

//     describe('getLogger(name)', () => {
//       it('should prepend the name in the log messages', () => {
//         const myLogger = getLogger('doit')
//         myLogger.info('test')

//         expect(stubLogger.log).toHaveBeenCalledTimes(1)
//         expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.INFO, 'doit: test')
//       })
//     })

//     describe('logger.log(level, msg)', () => {
//       it('should work with a string logLevel', () => {
//         setLogLevel(LogLevel.INFO)
//         logger.log('info', 'test')

//         expect(stubLogger.log).toHaveBeenCalledTimes(1)
//         expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.INFO, 'test')
//       })

//       it('should call the loggerBackend when the message logLevel is equal to the configured logLevel threshold', () => {
//         setLogLevel(LogLevel.INFO)
//         logger.log(LogLevel.INFO, 'test')

//         expect(stubLogger.log).toHaveBeenCalledTimes(1)
//         expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.INFO, 'test')
//       })

//       it('should call the loggerBackend when the message logLevel is above to the configured logLevel threshold', () => {
//         setLogLevel(LogLevel.INFO)
//         logger.log(LogLevel.WARNING, 'test')

//         expect(stubLogger.log).toHaveBeenCalledTimes(1)
//         expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.WARNING, 'test')
//       })

//       it('should not call the loggerBackend when the message logLevel is above to the configured logLevel threshold', () => {
//         setLogLevel(LogLevel.INFO)
//         logger.log(LogLevel.DEBUG, 'test')

//         expect(stubLogger.log).toHaveBeenCalledTimes(0)
//       })

//       it('should not throw if loggerBackend is not supplied', () => {
//         setLogLevel(LogLevel.INFO)
//         logger.log(LogLevel.ERROR, 'test')
//       })
//     })

//     describe('logger.info', () => {
//       it('should handle info(message)', () => {
//         logger.info('test')

//         expect(stubLogger.log).toHaveBeenCalledTimes(1)
//         expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.INFO, 'test')
//       })
//       it('should handle info(message, ...splat)', () => {
//         logger.info('test: %s %s', 'hey', 'jude')

//         expect(stubLogger.log).toHaveBeenCalledTimes(1)
//         expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.INFO, 'test: hey jude')
//       })

//       it('should handle info(message, ...splat, error)', () => {
//         const error = new Error('hey')
//         logger.info('test: %s', 'hey', error)

//         expect(stubLogger.log).toHaveBeenCalledTimes(1)
//         expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.INFO, 'test: hey')
//         expect(stubErrorHandler.handleError).toHaveBeenCalledWith(error)
//       })

//       it('should handle info(error)', () => {
//         const error = new Error('hey')
//         logger.info(error)

//         expect(stubLogger.log).toHaveBeenCalledTimes(1)
//         expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.INFO, 'hey')
//         expect(stubErrorHandler.handleError).toHaveBeenCalledWith(error)
//       })
//     })

//     describe('logger.debug', () => {
//       it('should handle debug(message)', () => {
//         logger.debug('test')

//         expect(stubLogger.log).toHaveBeenCalledTimes(1)
//         expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.DEBUG, 'test')
//       })

//       it('should handle debug(message, ...splat)', () => {
//         logger.debug('test: %s', 'hey')

//         expect(stubLogger.log).toHaveBeenCalledTimes(1)
//         expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.DEBUG, 'test: hey')
//       })

//       it('should handle debug(message, ...splat, error)', () => {
//         const error = new Error('hey')
//         logger.debug('test: %s', 'hey', error)

//         expect(stubLogger.log).toHaveBeenCalledTimes(1)
//         expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.DEBUG, 'test: hey')
//         expect(stubErrorHandler.handleError).toHaveBeenCalledWith(error)
//       })

//       it('should handle debug(error)', () => {
//         const error = new Error('hey')
//         logger.debug(error)

//         expect(stubLogger.log).toHaveBeenCalledTimes(1)
//         expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.DEBUG, 'hey')
//         expect(stubErrorHandler.handleError).toHaveBeenCalledWith(error)
//       })
//     })

//     describe('logger.warn', () => {
//       it('should handle warn(message)', () => {
//         logger.warn('test')

//         expect(stubLogger.log).toHaveBeenCalledTimes(1)
//         expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.WARNING, 'test')
//       })

//       it('should handle warn(message, ...splat)', () => {
//         logger.warn('test: %s', 'hey')

//         expect(stubLogger.log).toHaveBeenCalledTimes(1)
//         expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.WARNING, 'test: hey')
//       })

//       it('should handle warn(message, ...splat, error)', () => {
//         const error = new Error('hey')
//         logger.warn('test: %s', 'hey', error)

//         expect(stubLogger.log).toHaveBeenCalledTimes(1)
//         expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.WARNING, 'test: hey')
//         expect(stubErrorHandler.handleError).toHaveBeenCalledWith(error)
//       })

//       it('should handle info(error)', () => {
//         const error = new Error('hey')
//         logger.warn(error)

//         expect(stubLogger.log).toHaveBeenCalledTimes(1)
//         expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.WARNING, 'hey')
//         expect(stubErrorHandler.handleError).toHaveBeenCalledWith(error)
//       })
//     })

//     describe('logger.error', () => {
//       it('should handle error(message)', () => {
//         logger.error('test')

//         expect(stubLogger.log).toHaveBeenCalledTimes(1)
//         expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.ERROR, 'test')
//       })

//       it('should handle error(message, ...splat)', () => {
//         logger.error('test: %s', 'hey')

//         expect(stubLogger.log).toHaveBeenCalledTimes(1)
//         expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.ERROR, 'test: hey')
//       })

//       it('should handle error(message, ...splat, error)', () => {
//         const error = new Error('hey')
//         logger.error('test: %s', 'hey', error)

//         expect(stubLogger.log).toHaveBeenCalledTimes(1)
//         expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.ERROR, 'test: hey')
//         expect(stubErrorHandler.handleError).toHaveBeenCalledWith(error)
//       })

//       it('should handle error(error)', () => {
//         const error = new Error('hey')
//         logger.error(error)

//         expect(stubLogger.log).toHaveBeenCalledTimes(1)
//         expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.ERROR, 'hey')
//         expect(stubErrorHandler.handleError).toHaveBeenCalledWith(error)
//       })

//       it('should work with an insufficient amount of splat args error(msg, ...splat, message)', () => {
//         const error = new Error('hey')
//         logger.error('hey %s', error)

//         expect(stubLogger.log).toHaveBeenCalledTimes(1)
//         expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.ERROR, 'hey undefined')
//         expect(stubErrorHandler.handleError).toHaveBeenCalledWith(error)
//       })
//     })

//     describe('using ConsoleLoggerHandler', () => {
//       beforeEach(() => {
//         vi.spyOn(console, 'info').mockImplementation(() => {})
//       })

//       afterEach(() => {
//         vi.resetAllMocks()
//       })

//       it('should work with BasicLogger', () => {
//         const logger = new ConsoleLogHandler()
//         const TIME = '12:00'
//         setLogHandler(logger)
//         setLogLevel(LogLevel.INFO)
//         vi.spyOn(logger, 'getTime').mockImplementation(() => TIME)

//         logger.log(LogLevel.INFO, 'hey')

//         expect(console.info).toBeCalledTimes(1)
//         expect(console.info).toBeCalledWith('[OPTIMIZELY] - INFO  12:00 hey')
//       })

//       it('should set logLevel to ERROR when setLogLevel is called with invalid value', () => {
//         const logger = new ConsoleLogHandler()
//         logger.setLogLevel('invalid' as any)

//         expect(logger.logLevel).toEqual(LogLevel.ERROR)
//       })

//       it('should set logLevel to ERROR when setLogLevel is called with no value', () => {
//         const logger = new ConsoleLogHandler()
//         // eslint-disable-next-line @typescript-eslint/ban-ts-comment
//         // @ts-ignore
//         logger.setLogLevel()

//         expect(logger.logLevel).toEqual(LogLevel.ERROR)
//       })
//     })
//   })

//   describe('ConsoleLogger', function() {
//     beforeEach(() => {
//       vi.spyOn(console, 'info')
//       vi.spyOn(console, 'log')
//       vi.spyOn(console, 'warn')
//       vi.spyOn(console, 'error')
//     })

//     afterEach(() => {
//       vi.resetAllMocks()
//     })

//     it('should log to console.info for LogLevel.INFO', () => {
//       const logger = new ConsoleLogHandler({
//         logLevel: LogLevel.DEBUG,
//       })
//       const TIME = '12:00'
//       vi.spyOn(logger, 'getTime').mockImplementation(() => TIME)

//       logger.log(LogLevel.INFO, 'test')

//       expect(console.info).toBeCalledTimes(1)
//       expect(console.info).toBeCalledWith('[OPTIMIZELY] - INFO  12:00 test')
//     })

//     it('should log to console.log for LogLevel.DEBUG', () => {
//       const logger = new ConsoleLogHandler({
//         logLevel: LogLevel.DEBUG,
//       })
//       const TIME = '12:00'
//       vi.spyOn(logger, 'getTime').mockImplementation(() => TIME)

//       logger.log(LogLevel.DEBUG, 'debug')

//       expect(console.log).toBeCalledTimes(1)
//       expect(console.log).toBeCalledWith('[OPTIMIZELY] - DEBUG 12:00 debug')
//     })

//     it('should log to console.warn for LogLevel.WARNING', () => {
//       const logger = new ConsoleLogHandler({
//         logLevel: LogLevel.DEBUG,
//       })
//       const TIME = '12:00'
//       vi.spyOn(logger, 'getTime').mockImplementation(() => TIME)

//       logger.log(LogLevel.WARNING, 'warning')

//       expect(console.warn).toBeCalledTimes(1)
//       expect(console.warn).toBeCalledWith('[OPTIMIZELY] - WARN  12:00 warning')
//     })

//     it('should log to console.error for LogLevel.ERROR', () => {
//       const logger = new ConsoleLogHandler({
//         logLevel: LogLevel.DEBUG,
//       })
//       const TIME = '12:00'
//       vi.spyOn(logger, 'getTime').mockImplementation(() => TIME)

//       logger.log(LogLevel.ERROR, 'error')

//       expect(console.error).toBeCalledTimes(1)
//       expect(console.error).toBeCalledWith('[OPTIMIZELY] - ERROR 12:00 error')
//     })

//     it('should not log if the configured logLevel is higher', () => {
//       const logger = new ConsoleLogHandler({
//         logLevel: LogLevel.INFO,
//       })

//       logger.log(LogLevel.DEBUG, 'debug')

//       expect(console.log).toBeCalledTimes(0)
//     })
//   })
// })
