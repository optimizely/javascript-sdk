/**
 * Copyright 2019, 2024, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the License");
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
import { OptimizelyError } from '../error/optimizly_error';
import { MessageResolver } from '../message/message_resolver';
import { sprintf } from '../utils/fns'

export enum LogLevel {
  Debug,
  Info,
  Warn,
  Error,
}

export const LogLevelToUpper: Record<LogLevel, string> = {
  [LogLevel.Debug]: 'DEGUB',
  [LogLevel.Info]: 'INFO',
  [LogLevel.Warn]: 'WARN',
  [LogLevel.Error]: 'ERROR',
};

export const LogLevelToLower: Record<LogLevel, string> = {
  [LogLevel.Debug]: 'debug',
  [LogLevel.Info]: 'info',
  [LogLevel.Warn]: 'warn',
  [LogLevel.Error]: 'error',
};

export interface LoggerFacade {
  info(message: string | Error, ...args: any[]): void;
  debug(message: string | Error, ...args: any[]): void;
  warn(message: string | Error, ...args: any[]): void;
  error(message: string | Error, ...args: any[]): void;
  child(name: string): LoggerFacade;
}

export interface LogHandler {
  log(level: LogLevel, message: string, ...args: any[]): void
}

export class ConsoleLogHandler implements LogHandler {
  private prefix: string

  constructor(prefix?: string) {
    this.prefix = prefix || '[OPTIMIZELY]'
  }

  log(level: LogLevel, message: string) : void {
    const log = `${this.prefix} - ${LogLevelToUpper[level]} ${this.getTime()} ${message}`
    this.consoleLog(level, log)
  }

  private getTime(): string {
    return new Date().toISOString()
  }

  private consoleLog(logLevel: LogLevel, log: string) : void {
    const methodName: string = LogLevelToLower[logLevel];

    const method: any = console[methodName as keyof Console] || console.log;
    method.call(console, log);
  }
}

type OptimizelyLoggerConfig = {
  logHandler: LogHandler,
  infoMsgResolver?: MessageResolver,
  errorMsgResolver: MessageResolver,
  level: LogLevel,
  name?: string,
};

export class OptimizelyLogger implements LoggerFacade {
  private name?: string;
  private prefix: string;
  private logHandler: LogHandler;
  private infoResolver?: MessageResolver;
  private errorResolver: MessageResolver;
  private level: LogLevel;

  constructor(config: OptimizelyLoggerConfig) {
    this.logHandler = config.logHandler;
    this.infoResolver = config.infoMsgResolver;
    this.errorResolver = config.errorMsgResolver;
    this.level = config.level;
    this.name = config.name;
    this.prefix = this.name ? `${this.name}: ` : '';
  }

  child(name: string): OptimizelyLogger {
    return new OptimizelyLogger({
      logHandler: this.logHandler,
      infoMsgResolver: this.infoResolver,
      errorMsgResolver: this.errorResolver,
      level: this.level,
      name,
    });
  }

  info(message: string | Error, ...args: any[]): void {
    this.log(LogLevel.Info, message, args)
  }

  debug(message: string | Error, ...args: any[]): void {
    this.log(LogLevel.Debug, message, args)
  }

  warn(message: string | Error, ...args: any[]): void {
    this.log(LogLevel.Warn, message, args)
  }

  error(message: string | Error, ...args: any[]): void {
    this.log(LogLevel.Error, message, args)
  }

  private handleLog(level: LogLevel, message: string, args: any[]) {
    const log = args.length > 0 ? `${this.prefix}${sprintf(message, ...args)}`
      : `${this.prefix}${message}`;
      
    this.logHandler.log(level, log);
  }

  private log(level: LogLevel, message: string | Error, args: any[]): void {
    console.log('level', level, 'this.level', this.level, message)

    if (level < this.level) {
      return;
    }

    if (message instanceof Error) {
      if (message instanceof OptimizelyError) {
        message.setMessage(this.errorResolver);
      }
      this.handleLog(level, message.message, []);
      return;
    }

    let resolver = this.errorResolver;

    if (level < LogLevel.Warn) {
      if (!this.infoResolver) {
        return;
      }
      resolver = this.infoResolver;
    }

    const resolvedMessage = resolver.resolve(message);
    this.handleLog(level, resolvedMessage, args);
  }
}
