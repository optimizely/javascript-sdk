/**
 * Copyright 2019, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { getErrorHandler } from './errorHandler'
import { isValidEnum, sprintf } from '../../lib/utils/fns'

import { LogLevel, LoggerFacade, LogManager, LogHandler } from './models'

type StringToLogLevel = {
  NOTSET: number,
  DEBUG: number,
  INFO: number,
  WARNING: number,
  ERROR: number,
}

const stringToLogLevel: StringToLogLevel = {
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

  if (!stringToLogLevel[level as keyof StringToLogLevel]) {
    return level
  }

  return stringToLogLevel[level as keyof StringToLogLevel]
}

type LogData = {
  message: string
  splat: any[]
  error?: Error
}

class DefaultLogManager implements LogManager {
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

type ConsoleLogHandlerConfig = {
  logLevel?: LogLevel | string
  logToConsole?: boolean
  prefix?: string
}

export class ConsoleLogHandler implements LogHandler {
  public logLevel: LogLevel
  private logToConsole: boolean
  private prefix: string

  /**
   * Creates an instance of ConsoleLogger.
   * @param {ConsoleLogHandlerConfig} config
   * @memberof ConsoleLogger
   */
  constructor(config: ConsoleLogHandlerConfig = {}) {
    this.logLevel = LogLevel.NOTSET
    if (config.logLevel !== undefined && isValidEnum(LogLevel, config.logLevel)) {
      this.setLogLevel(config.logLevel)
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
  setLogLevel(level: LogLevel | string) {
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
        return 'INFO '
      case LogLevel.WARNING:
        return 'WARN '
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
  private consoleLog(logLevel: LogLevel, logArguments: [string, ...string[]]) {
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
let globalLogHandler: LogHandler | null = null

class OptimizelyLogger implements LoggerFacade {
  private messagePrefix: string = ''

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
  log(level: LogLevel | string, message: string, ...splat: any[]): void {
    this.internalLog(coerceLogLevel(level), {
      message,
      splat,
    })
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
      ...data.splat,
    )}`
  }

  private internalLog(level: LogLevel, data: LogData): void {
    if (!globalLogHandler) {
      return
    }

    if (level < globalLogLevel) {
      return
    }

    globalLogHandler.log(level, this.format(data))

    if (data.error && data.error instanceof Error) {
      getErrorHandler().handleError(data.error)
    }
  }

  private namedLog(level: LogLevel, message: string | Error, splat: any[]): void {
    let error: Error | undefined

    if (message instanceof Error) {
      error = message
      message = error.message
      this.internalLog(level, {
        error,
        message,
        splat,
      })
      return
    }

    if (splat.length === 0) {
      this.internalLog(level, {
        message,
        splat,
      })
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

let globalLogManager: LogManager = new DefaultLogManager()

export function getLogger(name?: string): LoggerFacade {
  return globalLogManager.getLogger(name)
}

export function setLogHandler(logger: LogHandler | null) {
  globalLogHandler = logger
}

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
 * Resets all global logger state to it's original
 */
export function resetLogger() {
  globalLogManager = new DefaultLogManager()
  globalLogLevel = LogLevel.NOTSET
}
