import { sprintf } from 'sprintf-js'
import { getErrorHandler } from './errorHandler'
import { isValidEnum } from './utils'

/**
 * @export
 * @enum {number}
 */
export enum LogLevel {
  NOTSET = 0,
  DEBUG = 1,
  INFO = 2,
  WARNING = 3,
  ERROR = 4,
}

const stringToLogLevel = {
  NOTSET: 0,
  DEBUG: 1,
  INFO: 2,
  WARNING: 3,
  ERROR: 4,
}

function coerceLogLevel(level: any): LogLevel {
  if (typeof level !== 'string') {
    return level
  }

  level = level.toUpperCase()
  if (level === 'WARN') {
    level = 'WARNING'
  }

  if (!stringToLogLevel[level]) {
    return level
  }

  return stringToLogLevel[level]
}

/**
 * @export
 * @interface Logger
 */
export interface Logger {
  log(level: LogLevel, message: string): void
}

type LogData = {
  message: string
  splat?: any[]
  error?: Error
}

/**
 * @export
 * @interface LoggerFacade
 */
export interface LoggerFacade {
  log(level: LogLevel, message: string): void

  info(message: string | Error, ...splat: any[]): void

  debug(message: string | Error, ...splat: any[]): void

  warn(message: string | Error, ...splat: any[]): void

  error(message: string | Error, ...splat: any[]): void
}

interface LoggerFactory {
  getLogger(name?: string): LoggerFacade
}

class DefaultLoggerFactory {
  private loggers: {
    [name: string]: LoggerFacade
  }
  private defaultLoggerFacade = new OptimizelyLogger()

  constructor() {
    this.loggers = {}
  }

  getLogger(name?: string): LoggerFacade {
    if (!name) {
      return this.defaultLoggerFacade
    }

    if (!this.loggers[name]) {
      this.loggers[name] = new OptimizelyLogger({ messagePrefix: name })
    }

    return this.loggers[name]
  }
}

type ConsoleLoggerConfig = {
  logLevel?: LogLevel
  logToConsole?: boolean
  prefix?: string
}

class NoopLogger implements Logger {
  log(level: LogLevel, message: string): void {
    return
  }
}

/**
 * @class ConsoleLogger
 * @implements {Logger}
 */
class ConsoleLogger implements Logger {
  public logLevel: LogLevel
  private logToConsole: boolean
  private prefix: string

  /**
   * Creates an instance of ConsoleLogger.
   * @param {ConsoleLoggerConfig} config
   * @memberof ConsoleLogger
   */
  constructor(config: ConsoleLoggerConfig) {
    if (config.logLevel !== undefined && isValidEnum(LogLevel, config.logLevel)) {
      // TODO should it set the global log level here?
      this.setLogLevel(config.logLevel)
    } else {
      this.logLevel = LogLevel.NOTSET
    }

    this.logToConsole = config.logToConsole !== undefined ? !!config.logToConsole : true
    this.prefix = config.prefix !== undefined ? config.prefix : '[OPTIMIZELY]'
  }

  /**
   * @param {LogLevel} level
   * @param {string} message
   * @memberof ConsoleLogger
   */
  log(level: LogLevel, message: string) {
    if (!this.shouldLog(level) || !this.logToConsole) {
      return
    }

    let logMessage: string = `${this.prefix} - ${this.getLogLevelName(
      level,
    )} ${this.getTime()} ${message}`

    this.consoleLog(level, [logMessage])
  }

  /**
   * @param {LogLevel} level
   * @memberof ConsoleLogger
   */
  setLogLevel(level: LogLevel) {
    level = coerceLogLevel(level)
    if (!isValidEnum(LogLevel, level) || level === undefined) {
      this.logLevel = LogLevel.ERROR
    } else {
      this.logLevel = level
    }
  }

  /**
   * @returns {string}
   * @memberof ConsoleLogger
   */
  getTime(): string {
    return new Date().toISOString()
  }

  /**
   * @private
   * @param {LogLevel} targetLogLevel
   * @returns {boolean}
   * @memberof ConsoleLogger
   */
  private shouldLog(targetLogLevel: LogLevel): boolean {
    return targetLogLevel >= this.logLevel
  }

  /**
   * @private
   * @param {LogLevel} logLevel
   * @returns {string}
   * @memberof ConsoleLogger
   */
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

  /**
   * @private
   * @param {LogLevel} logLevel
   * @param {string[]} logArguments
   * @memberof ConsoleLogger
   */
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

let globalLogLevel: LogLevel = LogLevel.NOTSET
let globalLoggerBackend: Logger | null = null

/**
 * @class OptimizelyLogger
 * @implements {LoggerFacade}
 */
class OptimizelyLogger implements LoggerFacade {
  private messagePrefix: string

  constructor(opts: { messagePrefix?: string } = {}) {
    if (opts.messagePrefix) {
      this.messagePrefix = opts.messagePrefix
    }
  }

  /**
   * @param {(LogLevel | LogInputObject)} levelOrObj
   * @param {string} [message]
   * @memberof OptimizelyLogger
   */
  log(level: LogLevel, message: string): void {
    this.internalLog(level, { message })
  }

  info(message: string | Error, ...splat: any[]): void {
    this.namedLog(LogLevel.INFO, message, splat)
  }

  debug(message: string | Error, ...splat: any[]): void {
    this.namedLog(LogLevel.DEBUG, message, splat)
  }

  warn(message: string | Error, ...splat: any[]): void {
    this.namedLog(LogLevel.WARNING, message, splat)
  }

  error(message: string | Error, ...splat: any[]): void {
    this.namedLog(LogLevel.ERROR, message, splat)
  }

  private format(data: LogData): string {
    return `${this.messagePrefix ? this.messagePrefix + ': ' : ''}${sprintf(
      data.message,
      data.splat,
    )}`
  }

  private internalLog(level: LogLevel, data: LogData): void {
    if (!globalLoggerBackend) {
      return
    }

    if (level < globalLogLevel) {
      return
    }

    // TODO turn this into a format log function
    globalLoggerBackend.log(level, this.format(data))

    if (data.error && data.error instanceof Error) {
      getErrorHandler().handleError(data.error)
    }
  }

  private namedLog(level: LogLevel, message: string | Error, splat: any[]): void {
    let error: Error | undefined

    if (message instanceof Error) {
      error = message
      message = error.message
      this.internalLog(level, { error, message })
      return
    }

    if (splat.length === 0) {
      this.internalLog(level, { message })
      return
    }

    const last = splat[splat.length - 1]
    if (last instanceof Error) {
      error = last
      splat.splice(-1)
    }

    this.internalLog(level, { message, error, splat })
  }
}

let globalLoggerFactory: LoggerFactory = new DefaultLoggerFactory()

// TODO figure out if we want to support passing a string to `getLogger`
/**
 * Always returns the global LoggerFacade
 * @export
 * @returns {LoggerFacade}
 */
export function getLogger(name?: string): LoggerFacade {
  return globalLoggerFactory.getLogger(name)
}

/**
 * @export
 * @param {(Logger | null)} logger
 */
export function setLoggerBackend(logger: Logger | null) {
  globalLoggerBackend = logger
}

/**
 * @export
 * @param {LogLevel} level
 */
export function setLogLevel(level: LogLevel | string) {
  level = coerceLogLevel(level)
  if (!isValidEnum(LogLevel, level) || level === undefined) {
    globalLogLevel = LogLevel.ERROR
  } else {
    globalLogLevel = level
  }
}

export function getLogLevel(): LogLevel {
  return globalLogLevel
}

/**
 * @export
 * @param {ConsoleLoggerConfig} [config={}]
 * @returns {ConsoleLogger}
 */
export function createConsoleLogger(config: ConsoleLoggerConfig = {}): ConsoleLogger {
  return new ConsoleLogger(config)
}

/**
 * @export
 * @returns {NoopLogger}
 */
export function createNoOpLogger(): NoopLogger {
  return new NoopLogger()
}

/**
 * Resets all global logger state to it's original
 */
export function resetLogger() {
  globalLoggerFactory = new DefaultLoggerFactory()
  globalLogLevel = LogLevel.NOTSET
}
