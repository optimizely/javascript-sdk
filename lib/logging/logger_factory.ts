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
