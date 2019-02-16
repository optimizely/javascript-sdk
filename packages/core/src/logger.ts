import { sprintf } from 'sprintf-js'
import { getErrorHandler } from './errorHandler'
import { isValidEnum } from './utils'

export enum LogLevel {
  NOTSET = 0,
  DEBUG = 1,
  INFO = 2,
  WARNING = 3,
  ERROR = 4,
}

export interface Logger {
  log(level: LogLevel, message: string): void
}

export interface LoggerFacade {
  log(levelOrObj: LogLevel | LogInputObject, message?: string): void

  handleError(ex: Error, message?: string): void
}

type BasicLoggerConfig = {
  logLevel?: LogLevel
  logToConsole?: boolean
  prefix?: string
}

class NoopLogger implements Logger {
  log(level: LogLevel, message: string): void {
    return
  }
}

class BasicLogger implements Logger {
  private logToConsole: boolean
  private prefix: string
  private logLevel: LogLevel

  constructor(config: BasicLoggerConfig) {
    if (config.logLevel !== undefined && isValidEnum(LogLevel, config.logLevel)) {
      // TODO should it set the global log level here?
      this.setLogLevel(config.logLevel)
    } else {
      this.logLevel = LogLevel.NOTSET
    }

    this.logToConsole = config.logToConsole !== undefined ? !!config.logToConsole : true
    this.prefix = config.prefix !== undefined ? config.prefix : '[OPTIMIZELY]'
  }

  log(level: LogLevel, message: string) {
    if (!this.shouldLog(level) || !this.logToConsole) {
      return
    }

    let logMessage: string = `${this.prefix} - ${this.getLogLevelName(
      level,
    )} ${this.getTime()} ${message}`

    this.consoleLog(level, [logMessage])
  }

  setLogLevel(level: LogLevel) {
    if (isValidEnum(LogLevel, level)) {
      this.logLevel = level
    }
  }

  getTime(): string {
    return new Date().toISOString()
  }

  private shouldLog(targetLogLevel: LogLevel): boolean {
    return targetLogLevel >= this.logLevel
  }

  private getLogLevelName(logLevel: LogLevel): string {
    switch (logLevel) {
      case LogLevel.DEBUG:
        return 'DEBUG'
      case LogLevel.INFO:
        return 'INFO'
      case LogLevel.WARNING:
        return 'WARNING'
      case LogLevel.ERROR:
        return 'ERROR'
      default:
        return 'NOTSET'
    }
  }

  private consoleLog(logLevel: LogLevel, logArguments: string[]) {
    switch (logLevel) {
      case LogLevel.DEBUG:
        console.log.apply(console, logArguments)
        break
      case LogLevel.INFO:
        console.info.apply(console, logArguments)
        break
      case LogLevel.WARNING:
        console.warn.apply(console, logArguments)
        break
      case LogLevel.ERROR:
        console.error.apply(console, logArguments)
        break
      default:
        console.log.apply(console, logArguments)
    }
  }
}

type LogInputObject = { level: LogLevel; message: string; splat?: any[] }

let globalLogLevel: LogLevel = LogLevel.ERROR

class OptimizelyLogger implements LoggerFacade {
  private loggerBackend: Logger

  log(levelOrObj: LogLevel | LogInputObject, message?: string): void {
    if (!this.loggerBackend) {
      return
    }

    let opts: LogInputObject
    if (arguments.length === 1 && typeof levelOrObj === 'object') {
      opts = levelOrObj as LogInputObject
    } else if (arguments.length === 2 && typeof message === 'string') {
      opts = {
        level: levelOrObj as LogLevel,
        message,
      }
    } else {
      return
    }

    if (opts.level < globalLogLevel) {
      return
    }

    let sprintfArgs = opts.splat || []

    const logMessage = sprintf(opts.message, ...sprintfArgs)
    this.loggerBackend.log(opts.level, logMessage)
  }

  handleError(ex: Error, message?: string): void {
    if (message === undefined) {
      message = ex.message
    }
    this.log({
      level: LogLevel.ERROR,
      message,
    })

    const errorHandler = getErrorHandler()
    if (errorHandler && errorHandler.handleError) {
      errorHandler.handleError(ex)
    }
  }

  setLoggerBackend(logger: Logger | null): void {
    if (logger === null) {
      delete this.loggerBackend
    } else {
      this.loggerBackend = logger
    }
  }
}

let globalLogger = new OptimizelyLogger()

// TODO figure out if we want to support passing a string to `getLogger`
export function getLogger(): LoggerFacade {
  return globalLogger
}

export function setLoggerBackend(logger: Logger | null) {
  globalLogger.setLoggerBackend(logger)
}

export function setLogLevel(level: LogLevel) {
  if (!isValidEnum(LogLevel, level)) {
    return
  }
  globalLogLevel = level
}

export function createLogger(config: BasicLoggerConfig = {}): BasicLogger {
  return new BasicLogger(config)
}

export function createNoOpLogger(): NoopLogger {
  return new NoopLogger()
}
