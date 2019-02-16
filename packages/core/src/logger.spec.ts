/// <reference types="jest" />
import {
  Logger,
  setLoggerBackend,
  setLogLevel,
  LogLevel,
  getLogger,
  createConsoleLogger,
  resetLogger,
  LoggerFacade,
} from './logger'

import { resetErrorHandler } from './errorHandler'
import { ErrorHandler, setErrorHandler } from './errorHandler'

describe('logger', () => {
  afterEach(() => {
    resetLogger()
    resetErrorHandler()
  })

  describe('OptimizelyLogger', () => {
    let stubLogger: Logger
    let logger: LoggerFacade
    let stubErrorHandler: ErrorHandler

    beforeEach(() => {
      stubLogger = {
        log: jest.fn(),
      }
      stubErrorHandler = {
        handleError: jest.fn(),
      }
      setLogLevel(LogLevel.DEBUG)
      setLoggerBackend(stubLogger)
      setErrorHandler(stubErrorHandler)
      logger = getLogger()
    })

    describe('getLogger(name)', () => {
      it('should prepend the name in the log messages', () => {
        const myLogger = getLogger('doit')
        myLogger.info('test')

        expect(stubLogger.log).toHaveBeenCalledTimes(1)
        expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.INFO, 'doit: test')
      })
    })

    describe('logger.log(level, msg)', () => {
      it('should call the loggerBackend when the message logLevel is equal to the configured logLevel threshold', () => {
        setLogLevel(LogLevel.INFO)
        logger.log(LogLevel.INFO, 'test')

        expect(stubLogger.log).toHaveBeenCalledTimes(1)
        expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.INFO, 'test')
      })

      it('should call the loggerBackend when the message logLevel is above to the configured logLevel threshold', () => {
        setLogLevel(LogLevel.INFO)
        logger.log(LogLevel.WARNING, 'test')

        expect(stubLogger.log).toHaveBeenCalledTimes(1)
        expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.WARNING, 'test')
      })

      it('should not call the loggerBackend when the message logLevel is above to the configured logLevel threshold', () => {
        setLogLevel(LogLevel.INFO)
        logger.log(LogLevel.DEBUG, 'test')

        expect(stubLogger.log).toHaveBeenCalledTimes(0)
      })

      it('should not throw if loggerBackend is not supplied', () => {
        setLogLevel(LogLevel.INFO)
        logger.log(LogLevel.ERROR, 'test')
      })
    })

    describe('logger.log(obj)', () => {
      it('should work with `log(obj)`', () => {
        setLogLevel(LogLevel.INFO)

        logger.log({
          level: LogLevel.INFO,
          message: '%s - %s',
          splat: ['foo', 'bar'],
        })

        expect(stubLogger.log).toHaveBeenCalledTimes(1)
        expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.INFO, 'foo - bar')
      })

      it('error should take an error and invoke the error handler', () => {
        class MyError extends Error {
          constructor(message: string) {
            super(message)
          }
        }

        try {
          throw new MyError('test')
        } catch (ex) {
          logger.log({
            level: LogLevel.ERROR,
            message: ex.message,
            error: ex,
          })
          expect(stubLogger.log).toHaveBeenCalledTimes(1)
          expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.ERROR, 'test')
          expect(stubErrorHandler.handleError).toHaveBeenCalledWith(ex)
        }
      })
    })

    describe('logger.info', () => {
      it('should handle info(message)', () => {
        logger.info('test')

        expect(stubLogger.log).toHaveBeenCalledTimes(1)
        expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.INFO, 'test')
      })
      it('should handle info(message, ...splat)', () => {
        logger.info('test: %s', 'hey')

        expect(stubLogger.log).toHaveBeenCalledTimes(1)
        expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.INFO, 'test: hey')
      })

      it('should handle info(message, ...splat, error)', () => {
        const error = new Error('hey')
        logger.info('test: %s', 'hey', error)

        expect(stubLogger.log).toHaveBeenCalledTimes(1)
        expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.INFO, 'test: hey')
        expect(stubErrorHandler.handleError).toHaveBeenCalledWith(error)
      })

      it('should handle info(error)', () => {
        const error = new Error('hey')
        logger.info(error)

        expect(stubLogger.log).toHaveBeenCalledTimes(1)
        expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.INFO, 'hey')
        expect(stubErrorHandler.handleError).toHaveBeenCalledWith(error)
      })
    })

    describe('logger.debug', () => {
      it('should handle debug(message)', () => {
        logger.debug('test')

        expect(stubLogger.log).toHaveBeenCalledTimes(1)
        expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.DEBUG, 'test')
      })

      it('should handle debug(message, ...splat)', () => {
        logger.debug('test: %s', 'hey')

        expect(stubLogger.log).toHaveBeenCalledTimes(1)
        expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.DEBUG, 'test: hey')
      })

      it('should handle debug(message, ...splat, error)', () => {
        const error = new Error('hey')
        logger.debug('test: %s', 'hey', error)

        expect(stubLogger.log).toHaveBeenCalledTimes(1)
        expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.DEBUG, 'test: hey')
        expect(stubErrorHandler.handleError).toHaveBeenCalledWith(error)
      })

      it('should handle debug(error)', () => {
        const error = new Error('hey')
        logger.debug(error)

        expect(stubLogger.log).toHaveBeenCalledTimes(1)
        expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.DEBUG, 'hey')
        expect(stubErrorHandler.handleError).toHaveBeenCalledWith(error)
      })
    })

    describe('logger.warn', () => {
      it('should handle warn(message)', () => {
        logger.warn('test')

        expect(stubLogger.log).toHaveBeenCalledTimes(1)
        expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.WARNING, 'test')
      })

      it('should handle warn(message, ...splat)', () => {
        logger.warn('test: %s', 'hey')

        expect(stubLogger.log).toHaveBeenCalledTimes(1)
        expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.WARNING, 'test: hey')
      })

      it('should handle warn(message, ...splat, error)', () => {
        const error = new Error('hey')
        logger.warn('test: %s', 'hey', error)

        expect(stubLogger.log).toHaveBeenCalledTimes(1)
        expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.WARNING, 'test: hey')
        expect(stubErrorHandler.handleError).toHaveBeenCalledWith(error)
      })

      it('should handle info(error)', () => {
        const error = new Error('hey')
        logger.warn(error)

        expect(stubLogger.log).toHaveBeenCalledTimes(1)
        expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.WARNING, 'hey')
        expect(stubErrorHandler.handleError).toHaveBeenCalledWith(error)
      })
    })

    describe('logger.error', () => {
      it('should handle error(message)', () => {
        logger.error('test')

        expect(stubLogger.log).toHaveBeenCalledTimes(1)
        expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.ERROR, 'test')
      })

      it('should handle error(message, ...splat)', () => {
        logger.error('test: %s', 'hey')

        expect(stubLogger.log).toHaveBeenCalledTimes(1)
        expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.ERROR, 'test: hey')
      })

      it('should handle error(message, ...splat, error)', () => {
        const error = new Error('hey')
        logger.error('test: %s', 'hey', error)

        expect(stubLogger.log).toHaveBeenCalledTimes(1)
        expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.ERROR, 'test: hey')
        expect(stubErrorHandler.handleError).toHaveBeenCalledWith(error)
      })

      it('should handle info(error)', () => {
        const error = new Error('hey')
        logger.error(error)

        expect(stubLogger.log).toHaveBeenCalledTimes(1)
        expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.ERROR, 'hey')
        expect(stubErrorHandler.handleError).toHaveBeenCalledWith(error)
      })
    })

    describe('with ConsoleLogger', () => {
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

        logger.log(LogLevel.INFO, 'hey')

        expect(console.info).toBeCalledTimes(1)
        expect(console.info).toBeCalledWith('[OPTIMIZELY] - INFO 12:00 hey')
      })

      it('should set logLevel to ERROR when setLogLevel is called with invalid value', () => {
        const logger = createConsoleLogger()
        logger.setLogLevel('invalid' as any)

        expect(logger.logLevel).toEqual(LogLevel.ERROR)
      })

      it('should set logLevel to ERROR when setLogLevel is called with no value', () => {
        const logger = createConsoleLogger()
        // @ts-ignore
        logger.setLogLevel()

        expect(logger.logLevel).toEqual(LogLevel.ERROR)
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
