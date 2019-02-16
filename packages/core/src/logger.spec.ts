/// <reference types="jest" />
import {
  Logger,
  setLoggerBackend,
  setLogLevel,
  LogLevel,
  getLogger,
  createConsoleLogger,
  resetLogger,
} from './logger'

import { resetErrorHandler} from './errorHandler'
import { ErrorHandler, setErrorHandler } from './errorHandler'

describe('logger', () => {
  afterEach(() => {
    resetLogger()
    resetErrorHandler()
  })

  describe('OptimizelyLogger', () => {
    let stubLogger: Logger
    beforeEach(() => {
      stubLogger = {
        log: jest.fn(),
      }
    })

    it('should call the loggerBackend when the message logLevel is equal to the configured logLevel threshold', () => {
      setLogLevel(LogLevel.INFO)
      setLoggerBackend(stubLogger)
      getLogger().log(LogLevel.INFO, 'test')

      expect(stubLogger.log).toHaveBeenCalledTimes(1)
      expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.INFO, 'test')
    })

    it('should call the loggerBackend when the message logLevel is above to the configured logLevel threshold', () => {
      setLogLevel(LogLevel.INFO)
      setLoggerBackend(stubLogger)
      getLogger().log(LogLevel.WARNING, 'test')

      expect(stubLogger.log).toHaveBeenCalledTimes(1)
      expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.WARNING, 'test')
    })

    it('should not call the loggerBackend when the message logLevel is above to the configured logLevel threshold', () => {
      setLogLevel(LogLevel.INFO)
      setLoggerBackend(stubLogger)
      getLogger().log(LogLevel.DEBUG, 'test')

      expect(stubLogger.log).toHaveBeenCalledTimes(0)
    })

    it('should not throw if loggerBackend is not supplied', () => {
      setLogLevel(LogLevel.INFO)
      getLogger().log(LogLevel.ERROR, 'test')
    })

    it('handleError should invoke the error handler with message', () => {
      const stubErrorHandler: ErrorHandler = {
        handleError: jest.fn(),
      }
      setLoggerBackend(stubLogger)
      setErrorHandler(stubErrorHandler)

      class MyError extends Error {
        constructor(message: string) {
          super(message)
        }
      }

      try {
        throw new MyError('test')
      } catch (ex) {
        getLogger().handleError(ex)

        expect(stubLogger.log).toHaveBeenCalledTimes(1)
        expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.ERROR, 'test')
        expect(stubErrorHandler.handleError).toHaveBeenCalledWith(ex)
      }
    })

    it('handleError should invoke the error handler with custom supplied message', () => {
      const stubErrorHandler: ErrorHandler = {
        handleError: jest.fn(),
      }
      setLoggerBackend(stubLogger)
      setErrorHandler(stubErrorHandler)

      class MyError extends Error {
        constructor(message: string) {
          super(message)
        }
      }

      try {
        throw new MyError('test')
      } catch (ex) {
        getLogger().handleError(ex, 'custom message')

        expect(stubLogger.log).toHaveBeenCalledTimes(1)
        expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.ERROR, 'custom message')
        expect(stubErrorHandler.handleError).toHaveBeenCalledWith(ex)
      }
    })

    it('should work with `log(obj)`', () => {
      setLogLevel(LogLevel.INFO)
      setLoggerBackend(stubLogger)
      getLogger().log({
        level: LogLevel.INFO,
        message: '%s - %s',
        splat: ['foo', 'bar'],
      })

      expect(stubLogger.log).toHaveBeenCalledTimes(1)
      expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.INFO, 'foo - bar')
    })

    describe('with BasicLogger', () => {
      beforeEach(() => {
        jest.spyOn(console, 'info').mockImplementation(() => {})
      })

      afterEach(() => {
        jest.resetAllMocks()
      })

      it('should work with BasicLogger', () => {
        const logger = createConsoleLogger()
        const TIME = '12:00'
        setLoggerBackend(logger)
        setLogLevel(LogLevel.INFO)
        jest.spyOn(logger, 'getTime').mockImplementation(() => TIME)

        getLogger().log(LogLevel.INFO, 'hey')

        expect(console.info).toBeCalledTimes(1)
        expect(console.info).toBeCalledWith('[OPTIMIZELY] - INFO 12:00 hey')
      })

      it('should set logLevel to ERROR when setLogLevel is called with invalid value', () => {
        const logger = createConsoleLogger()
        logger.setLogLevel('invalid' as any);

        expect(logger.logLevel).toEqual(LogLevel.ERROR);
      })

      it('should set logLevel to ERROR when setLogLevel is called with no value', () => {
        const logger = createConsoleLogger()
        // @ts-ignore
        logger.setLogLevel();

        expect(logger.logLevel).toEqual(LogLevel.ERROR);
      })
    })
  })

  describe('ConsoleLogger', function() {
    beforeEach(() => {
      jest.spyOn(console, 'info')
      jest.spyOn(console, 'log')
      jest.spyOn(console, 'warn')
      jest.spyOn(console, 'error')
    })

    afterEach(() => {
      jest.resetAllMocks()
    })

    it('should log to console.info for LogLevel.INFO', () => {
      const logger = createConsoleLogger({
        logLevel: LogLevel.DEBUG,
      })
      const TIME = '12:00'
      jest.spyOn(logger, 'getTime').mockImplementation(() => TIME)

      logger.log(LogLevel.INFO, 'test')

      expect(console.info).toBeCalledTimes(1)
      expect(console.info).toBeCalledWith('[OPTIMIZELY] - INFO 12:00 test')
    })

    it('should log to console.log for LogLevel.DEBUG', () => {
      const logger = createConsoleLogger({
        logLevel: LogLevel.DEBUG,
      })
      const TIME = '12:00'
      jest.spyOn(logger, 'getTime').mockImplementation(() => TIME)

      logger.log(LogLevel.DEBUG, 'debug')

      expect(console.log).toBeCalledTimes(1)
      expect(console.log).toBeCalledWith('[OPTIMIZELY] - DEBUG 12:00 debug')
    })

    it('should log to console.warn for LogLevel.WARNING', () => {
      const logger = createConsoleLogger({
        logLevel: LogLevel.DEBUG,
      })
      const TIME = '12:00'
      jest.spyOn(logger, 'getTime').mockImplementation(() => TIME)

      logger.log(LogLevel.WARNING, 'warning')

      expect(console.warn).toBeCalledTimes(1)
      expect(console.warn).toBeCalledWith('[OPTIMIZELY] - WARNING 12:00 warning')
    })

    it('should log to console.error for LogLevel.ERROR', () => {
      const logger = createConsoleLogger({
        logLevel: LogLevel.DEBUG,
      })
      const TIME = '12:00'
      jest.spyOn(logger, 'getTime').mockImplementation(() => TIME)

      logger.log(LogLevel.ERROR, 'error')

      expect(console.error).toBeCalledTimes(1)
      expect(console.error).toBeCalledWith('[OPTIMIZELY] - ERROR 12:00 error')
    })

    it('should not log if the configured logLevel is higher', () => {
      const logger = createConsoleLogger({
        logLevel: LogLevel.INFO,
      })

      logger.log(LogLevel.DEBUG, 'debug')

      expect(console.log).toBeCalledTimes(0)
    })
  })
})
