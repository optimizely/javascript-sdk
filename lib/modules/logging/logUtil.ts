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
import { isValidEnum, sprintf } from '../../utils/fns'

import { LogLevel, LoggerFacade, LogManager, LogHandler, LoggerFactory } from './models'

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

function coerceLogLevel(level: LogLevel | string): LogLevel {
  if (typeof level !== 'string') {
    return level
  }

  level = level.toUpperCase()
  if (level === 'WARN') {
    level = 'WARNING'
  }

  return stringToLogLevel[level as keyof StringToLogLevel]
}

type LogData = {
  message: string
  splat: any[]
  error?: Error
}

export class ConsoleLogHandler implements LogHandler {
  private prefix: string

  /**
   * Creates an instance of ConsoleLogger.
   * @param {ConsoleLogHandlerConfig} config
   * @memberof ConsoleLogger
   */
  constructor(prefix?: string) {
    this.prefix = prefix ?? '[OPTIMIZELY]'
  }

  /**
   * @param {LogLevel} level
   * @param {string} message
   * @memberof ConsoleLogger
   */
  log(level: LogLevel, message: string) : void {
    const logMessage = `${this.prefix} - ${LogLevel[level]} ${this.getTime()} ${message}`
    this.output(level, [logMessage])
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
   * @param {LogLevel} logLevel
   * @param {string[]} logArguments
   * @memberof ConsoleLogger
   */
  private output(logLevel: LogLevel, logArguments: [string, ...string[]]) {
    const methodName = LogLevel[logLevel].toLowerCase();
    const method = (console as any)[methodName] || console.log;
    method.bind(console)(...logArguments);
  }
}

class OptimizelyLogger implements Logger {
  private messagePrefix: string;
  private level: LogLevel;
  private logHandler: LogHandler;

  constructor(opts: { level: LogLevel, messagePrefix?: string, logHandler?: LogHandler }) {
    this.messagePrefix = opts.messagePrefix ?? '';
    this.logHandler = opts.logHandler ?? new ConsoleLogHandler();
    this.level = opts.level;
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

export function getLogger(name?: string): LoggerFacade {
  return globalLogManager.getLogger(name)
}

