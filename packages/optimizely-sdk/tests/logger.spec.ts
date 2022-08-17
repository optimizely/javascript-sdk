/// <reference types="jest" />
import {
  LogLevel,
  LogHandler,
  LoggerFacade,
} from '../lib/modules/logging/models'

import {
  setLogHandler,
  setLogLevel,
  getLogger,
  ConsoleLogHandler,
  resetLogger,
  getLogLevel,
} from '../lib/modules/logging/logger'

import { resetErrorHandler } from '../lib/modules/logging/errorHandler'
import { ErrorHandler, setErrorHandler } from '../lib/modules/logging/errorHandler'

describe('logger', () => {
  afterEach(() => {
    resetLogger()
    resetErrorHandler()
  })

  describe('OptimizelyLogger', () => {
    let stubLogger: LogHandler
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
      setLogHandler(stubLogger)
      setErrorHandler(stubErrorHandler)
      logger = getLogger()
    })

    describe('setLogLevel', () => {
      it('should coerce "debug"', () => {
        setLogLevel('debug')
        expect(getLogLevel()).toBe(LogLevel.DEBUG)
      })

      it('should coerce "deBug"', () => {
        setLogLevel('deBug')
        expect(getLogLevel()).toBe(LogLevel.DEBUG)
      })

      it('should coerce "INFO"', () => {
        setLogLevel('INFO')
        expect(getLogLevel()).toBe(LogLevel.INFO)
      })

      it('should coerce "WARN"', () => {
        setLogLevel('WARN')
        expect(getLogLevel()).toBe(LogLevel.WARNING)
      })

      it('should coerce "warning"', () => {
        setLogLevel('warning')
        expect(getLogLevel()).toBe(LogLevel.WARNING)
      })

      it('should coerce "ERROR"', () => {
        setLogLevel('WARN')
        expect(getLogLevel()).toBe(LogLevel.WARNING)
      })

      it('should default to error if invalid', () => {
        setLogLevel('invalid')
        expect(getLogLevel()).toBe(LogLevel.ERROR)
      })
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
      it('should work with a string logLevel', () => {
        setLogLevel(LogLevel.INFO)
        logger.log('info', 'test')

        expect(stubLogger.log).toHaveBeenCalledTimes(1)
        expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.INFO, 'test')
      })

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

    describe('logger.info', () => {
      it('should handle info(message)', () => {
        logger.info('test')

        expect(stubLogger.log).toHaveBeenCalledTimes(1)
        expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.INFO, 'test')
      })
      it('should handle info(message, ...splat)', () => {
        logger.info('test: %s %s', 'hey', 'jude')

        expect(stubLogger.log).toHaveBeenCalledTimes(1)
        expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.INFO, 'test: hey jude')
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

      it('should handle error(error)', () => {
        const error = new Error('hey')
        logger.error(error)

        expect(stubLogger.log).toHaveBeenCalledTimes(1)
        expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.ERROR, 'hey')
        expect(stubErrorHandler.handleError).toHaveBeenCalledWith(error)
      })

      it('should work with an insufficient amount of splat args error(msg, ...splat, message)', () => {
        const error = new Error('hey')
        logger.error('hey %s', error)

        expect(stubLogger.log).toHaveBeenCalledTimes(1)
        expect(stubLogger.log).toHaveBeenCalledWith(LogLevel.ERROR, 'hey undefined')
        expect(stubErrorHandler.handleError).toHaveBeenCalledWith(error)
      })
    })

    describe('using ConsoleLoggerHandler', () => {
      beforeEach(() => {
        jest.spyOn(console, 'info').mockImplementation(() => {})
      })

      afterEach(() => {
        jest.resetAllMocks()
      })

      it('should work with BasicLogger', () => {
        const logger = new ConsoleLogHandler()
        const TIME = '12:00'
        setLogHandler(logger)
        setLogLevel(LogLevel.INFO)
        jest.spyOn(logger, 'getTime').mockImplementation(() => TIME)

        logger.log(LogLevel.INFO, 'hey')

        expect(console.info).toBeCalledTimes(1)
        expect(console.info).toBeCalledWith('[OPTIMIZELY] - INFO  12:00 hey')
      })

      it('should set logLevel to ERROR when setLogLevel is called with invalid value', () => {
        const logger = new ConsoleLogHandler()
        logger.setLogLevel('invalid' as any)

        expect(logger.logLevel).toEqual(LogLevel.ERROR)
      })

      it('should set logLevel to ERROR when setLogLevel is called with no value', () => {
        const logger = new ConsoleLogHandler()
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
      const logger = new ConsoleLogHandler({
        logLevel: LogLevel.DEBUG,
      })
      const TIME = '12:00'
      jest.spyOn(logger, 'getTime').mockImplementation(() => TIME)

      logger.log(LogLevel.INFO, 'test')

      expect(console.info).toBeCalledTimes(1)
      expect(console.info).toBeCalledWith('[OPTIMIZELY] - INFO  12:00 test')
    })

    it('should log to console.log for LogLevel.DEBUG', () => {
      const logger = new ConsoleLogHandler({
        logLevel: LogLevel.DEBUG,
      })
      const TIME = '12:00'
      jest.spyOn(logger, 'getTime').mockImplementation(() => TIME)

      logger.log(LogLevel.DEBUG, 'debug')

      expect(console.log).toBeCalledTimes(1)
      expect(console.log).toBeCalledWith('[OPTIMIZELY] - DEBUG 12:00 debug')
    })

    it('should log to console.warn for LogLevel.WARNING', () => {
      const logger = new ConsoleLogHandler({
        logLevel: LogLevel.DEBUG,
      })
      const TIME = '12:00'
      jest.spyOn(logger, 'getTime').mockImplementation(() => TIME)

      logger.log(LogLevel.WARNING, 'warning')

      expect(console.warn).toBeCalledTimes(1)
      expect(console.warn).toBeCalledWith('[OPTIMIZELY] - WARN  12:00 warning')
    })

    it('should log to console.error for LogLevel.ERROR', () => {
      const logger = new ConsoleLogHandler({
        logLevel: LogLevel.DEBUG,
      })
      const TIME = '12:00'
      jest.spyOn(logger, 'getTime').mockImplementation(() => TIME)

      logger.log(LogLevel.ERROR, 'error')

      expect(console.error).toBeCalledTimes(1)
      expect(console.error).toBeCalledWith('[OPTIMIZELY] - ERROR 12:00 error')
    })

    it('should not log if the configured logLevel is higher', () => {
      const logger = new ConsoleLogHandler({
        logLevel: LogLevel.INFO,
      })

      logger.log(LogLevel.DEBUG, 'debug')

      expect(console.log).toBeCalledTimes(0)
    })
  })
})
