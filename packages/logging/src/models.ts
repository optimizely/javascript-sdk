export enum LogLevel {
  NOTSET = 0,
  DEBUG = 1,
  INFO = 2,
  WARNING = 3,
  ERROR = 4,
}

export interface LoggerFacade {
  log(level: LogLevel | string, message: string): void

  info(message: string | Error, ...splat: any[]): void

  debug(message: string | Error, ...splat: any[]): void

  warn(message: string | Error, ...splat: any[]): void

  error(message: string | Error, ...splat: any[]): void
}

export interface LogManager {
  getLogger(name?: string): LoggerFacade
}

export interface LogHandler {
  log(level: LogLevel, message: string): void
}