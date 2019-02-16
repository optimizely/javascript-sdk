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
type LogInputObject = LogData & { level: LogLevel }

/**
 * @export
 * @interface LoggerFacade
 */
export interface LoggerFacade {
  /**
   * @param {(LogLevel | LogInputObject)} levelOrObj
   * @param {string} [message]
   * @memberof LoggerFacade
   */
  log(levelOrObj: LogLevel | LogInputObject, message?: string): void

  info(data: LogData | string): void

  debug(data: LogData | string): void

  warn(data: LogData | string): void

  error(data: LogData | string): void
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
  log(levelOrObj: LogLevel | LogInputObject, message?: string): void {
    if (!globalLoggerBackend) {
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

    const logMessage = `${this.messagePrefix ? this.messagePrefix + ': ' : ''}${sprintf(
      opts.message,
      ...sprintfArgs,
    )}`
    globalLoggerBackend.log(opts.level, logMessage)

    if (opts.error && opts.error instanceof Error) {
      getErrorHandler().handleError(opts.error)
    }
  }

  info(data: LogData): void {
    const obj = typeof data === 'string' ? { message: data } : data
    this.log({
      ...obj,
      level: LogLevel.INFO,
    })
  }

  debug(data: LogData): void {
    const obj = typeof data === 'string' ? { message: data } : data
    this.log({
      ...obj,
      level: LogLevel.DEBUG,
    })
  }

  warn(data: LogData): void {
    const obj = typeof data === 'string' ? { message: data } : data
    this.log({
      ...obj,
      level: LogLevel.WARNING,
    })
  }

  error(data: LogData | Error): void {
    const obj = typeof data === 'string' ? { message: data } : data
    this.log({
      ...obj,
      level: LogLevel.ERROR,
    })
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
export function setLogLevel(level: LogLevel) {
  if (!isValidEnum(LogLevel, level) || level === undefined) {
    globalLogLevel = LogLevel.ERROR
  } else {
    globalLogLevel = level
  }
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
