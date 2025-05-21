/**
 * Copyright 2025, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { ConsoleLogHandler, LogHandler, LogLevel, OptimizelyLogger } from './logger';
import { errorResolver, infoResolver, MessageResolver } from '../message/message_resolver';
import { Maybe } from '../utils/type';

export const INVALID_LOG_HANDLER = 'Invalid log handler';
export const INVALID_LEVEL_PRESET = 'Invalid level preset';

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

export const DEBUG: OpaqueLevelPreset = {
  [levelPresetSymbol]: debugPreset,
};

export const INFO: OpaqueLevelPreset = {
  [levelPresetSymbol]: infoPreset,
};

export const WARN: OpaqueLevelPreset = {
  [levelPresetSymbol]: warnPreset,
};

export const ERROR: OpaqueLevelPreset = {
  [levelPresetSymbol]: errorPreset,
};

export const extractLevelPreset = (preset: OpaqueLevelPreset): LevelPreset => {
  if (!preset || typeof preset !== 'object' || !preset[levelPresetSymbol]) {
    throw new Error(INVALID_LEVEL_PRESET);
  }
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

const validateLogHandler = (logHandler: any) => {
  if (typeof logHandler !== 'object' || typeof logHandler.log !== 'function') {
    throw new Error(INVALID_LOG_HANDLER);
  }
}

export const createLogger = (config: LoggerConfig): OpaqueLogger => {
  const { level, infoResolver, errorResolver } = extractLevelPreset(config.level);

  if (config.logHandler) {
    validateLogHandler(config.logHandler);
  }
  
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

export const wrapLogger = (logger: OptimizelyLogger): OpaqueLogger => {
  return {
    [loggerSymbol]: logger,
  };
};

export const extractLogger = (logger: Maybe<OpaqueLogger>): Maybe<OptimizelyLogger> => {
  if (!logger || typeof logger !== 'object') {
    return undefined;
  }

  return logger[loggerSymbol] as Maybe<OptimizelyLogger>;
};
