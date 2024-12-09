/**
 * Copyright 2019, 2024, Optimizely
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
import { sprintf } from '../../utils/fns'

export enum LogLevel {
  Debug,
  Info,
  Warn,
  Error,
}

export interface LoggerFacade {
  info(message: string | Error, ...splat: any[]): void
  debug(message: string | Error, ...splat: any[]): void
  warn(message: string | Error, ...splat: any[]): void
  error(message: string | Error, ...splat: any[]): void
}

export interface LogHandler {
  log(level: LogLevel, message: string, ...splat: any[]): void
}

export class ConsoleLogHandler implements LogHandler {
  private prefix: string

  constructor(prefix?: string) {
    this.prefix = prefix || '[OPTIMIZELY]'
  }

  log(level: LogLevel, message: string) : void {
    const log = `${this.prefix} - ${level} ${this.getTime()} ${message}`
    this.consoleLog(level, log)
  }

  private getTime(): string {
    return new Date().toISOString()
  }

  private consoleLog(logLevel: LogLevel, log: string) : void {
    const methodName = LogLevel[logLevel].toLowerCase()
    const method: any = console[methodName as keyof Console] || console.log;
    method.bind(console)(log);
  }
}

export interface LogResolver {
  log(msg: string): string;
  err(msg: string): string;
}

type OptimizelyLoggerConfig = {
  logHandler: LogHandler,
  logResolver?: LogResolver,
  level: LogLevel,
  name?: string,
};

export class OptimizelyLogger implements LoggerFacade {
  private name?: string;
  private prefix: string;
  private logHandler: LogHandler;
  private logResolver?: LogResolver;
  private level: LogLevel;

  constructor(config: OptimizelyLoggerConfig) {
    this.logHandler = config.logHandler;
    this.logResolver = config.logResolver;
    this.level = config.level;
    this.name = config.name;
    this.prefix = this.name ? `${this.name}: ` : '';
  }

  info(message: string | Error, ...splat: any[]): void {
    this.log(LogLevel.Info, message, splat)
  }

  debug(message: string | Error, ...splat: any[]): void {
    this.log(LogLevel.Debug, message, splat)
  }

  warn(message: string | Error, ...splat: any[]): void {
    this.log(LogLevel.Warn, message, splat)
  }

  error(message: string | Error, ...splat: any[]): void {
    this.log(LogLevel.Error, message, splat)
  }

  private handleLog(level: LogLevel, message: string, ...splat: any[]) {
    const log = `${this.prefix}${sprintf(message, splat)}`
    this.logHandler.log(level, log);
  }

  private log(level: LogLevel, message: string | Error, splat: any[]): void {
    if (level < this.level) {
      return;
    }

    if (message instanceof Error) {
      this.handleLog(level, message.toString());
      return;
    }

    if (!this.logResolver) {
      this.handleLog(level, message, ...splat);
      return;
    }

    const resolvedMessage = level < LogLevel.Warn ? this.logResolver.log(message)
      : this.logResolver.err(message);
    
    if (resolvedMessage) {
      this.handleLog(level, resolvedMessage, ...splat);
    }
  }
}
