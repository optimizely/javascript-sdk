import { ConsoleLogHandler, LogHandler, LogLevel, OptimizelyLogger } from './logger';
import { errorResolver, infoResolver, MessageResolver } from '../message/message_resolver';

type LevelPreset = {
  level: LogLevel,
  infoResolver?: MessageResolver,
  errorResolver: MessageResolver,
}

const debugPreset: LevelPreset = {
  level: LogLevel.Debug,
  infoResolver,
  errorResolver,
};

const infoPreset: LevelPreset = {
  level: LogLevel.Info,
  infoResolver,
  errorResolver,
}

const warnPreset: LevelPreset = {
  level: LogLevel.Warn,
  errorResolver,
}

const errorPreset: LevelPreset = {
  level: LogLevel.Error,
  errorResolver,
}

const levelPresetSymbol = Symbol();

export type OpaqueLevelPreset = {
  [levelPresetSymbol]: unknown;
};

export const DebugLog: OpaqueLevelPreset = {
  [levelPresetSymbol]: debugPreset,
};

export const InfoLog: OpaqueLevelPreset = {
  [levelPresetSymbol]: infoPreset,
};

export const WarnLog: OpaqueLevelPreset = {
  [levelPresetSymbol]: warnPreset,
};

export const ErrorLog: OpaqueLevelPreset = {
  [levelPresetSymbol]: errorPreset,
};

export const extractLevelPreset = (preset: OpaqueLevelPreset): LevelPreset => {
  return preset[levelPresetSymbol] as LevelPreset;
}

const loggerSymbol = Symbol();

export type OpaqueLogger = {
  [loggerSymbol]: unknown;
};

export type LoggerConfig = {
  level: OpaqueLevelPreset,
  logHandler?: LogHandler,
};

export const createLogger = (config: LoggerConfig): OpaqueLogger => {
  const { level, infoResolver, errorResolver } = extractLevelPreset(config.level);
  
  const loggerName = 'Optimizely';

  return {
    [loggerSymbol]: new OptimizelyLogger({
      name: loggerName,
      level,
      infoMsgResolver: infoResolver,
      errorMsgResolver: errorResolver,
      logHandler: config.logHandler || new ConsoleLogHandler(),
    }),
  };
};

export const extractLogger = (logger: OpaqueLogger): OptimizelyLogger => {
  return logger[loggerSymbol] as OptimizelyLogger;
}
