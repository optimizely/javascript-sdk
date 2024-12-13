/**
 * Copyright 2019-2020, 2022-2024 Optimizely
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
import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';

import * as logging from './modules/logging/logger';

import Optimizely from './optimizely';
import testData from './tests/test_data';
import packageJSON from '../package.json';
import optimizelyFactory from './index.react_native';
import configValidator from './utils/config_validator';
import { getMockProjectConfigManager } from './tests/mock/mock_project_config_manager';
import { createProjectConfig } from './project_config/project_config';

vi.mock('@react-native-community/netinfo');
vi.mock('react-native-get-random-values')
vi.mock('fast-text-encoding')

describe('javascript-sdk/react-native', () => {
  beforeEach(() => {
    vi.spyOn(optimizelyFactory.eventDispatcher, 'dispatchEvent');
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('APIs', () => {
    it('should expose logger, errorHandler, eventDispatcher and enums', () => {
      expect(optimizelyFactory.logging).toBeDefined();
      expect(optimizelyFactory.logging.createLogger).toBeDefined();
      expect(optimizelyFactory.logging.createNoOpLogger).toBeDefined();
      expect(optimizelyFactory.errorHandler).toBeDefined();
      expect(optimizelyFactory.eventDispatcher).toBeDefined();
      expect(optimizelyFactory.enums).toBeDefined();
    });

    describe('createInstance', () => {
      const fakeErrorHandler = { handleError: function() {} };
      const fakeEventDispatcher = { dispatchEvent: async function() {
        return Promise.resolve({});
      } };
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      let silentLogger;

      beforeEach(() => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        silentLogger = optimizelyFactory.logging.createLogger();
        vi.spyOn(console, 'error');
        vi.spyOn(configValidator, 'validate').mockImplementation(() => {
          throw new Error('Invalid config or something');
        });
      });

      afterEach(() => {
        vi.resetAllMocks();
      });

      it('should not throw if the provided config is not valid', () => {
        expect(function() {
          const optlyInstance = optimizelyFactory.createInstance({
            projectConfigManager: getMockProjectConfigManager(),
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            logger: silentLogger,
          });
        }).not.toThrow();
      });

      it('should create an instance of optimizely', () => {
        const optlyInstance = optimizelyFactory.createInstance({
          projectConfigManager: getMockProjectConfigManager(),
          errorHandler: fakeErrorHandler,
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          logger: silentLogger,
        });

        expect(optlyInstance).toBeInstanceOf(Optimizely);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        expect(optlyInstance.clientVersion).toEqual('5.3.4');
      });

      it('should set the React Native JS client engine and javascript SDK version', () => {
        const optlyInstance = optimizelyFactory.createInstance({
          projectConfigManager: getMockProjectConfigManager(),
          errorHandler: fakeErrorHandler,
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          logger: silentLogger,
        });
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        expect('react-native-js-sdk').toEqual(optlyInstance.clientEngine);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        expect(packageJSON.version).toEqual(optlyInstance.clientVersion);
      });

      it('should allow passing of "react-sdk" as the clientEngine and convert it to "react-native-sdk"', () => {
        const optlyInstance = optimizelyFactory.createInstance({
          clientEngine: 'react-sdk',
          projectConfigManager: getMockProjectConfigManager(),
          errorHandler: fakeErrorHandler,
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          logger: silentLogger,
        });
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        expect('react-native-sdk').toEqual(optlyInstance.clientEngine);
      });

      describe('when passing in logLevel', () => {
        beforeEach(() => {
          vi.spyOn(logging, 'setLogLevel');
        });

        afterEach(() => {
          vi.resetAllMocks();
        });

        it('should call logging.setLogLevel', () => {
          optimizelyFactory.createInstance({
            projectConfigManager: getMockProjectConfigManager({
              initConfig: createProjectConfig(testData.getTestProjectConfig()),
            }),
            logLevel: optimizelyFactory.enums.LOG_LEVEL.ERROR,
          });
          expect(logging.setLogLevel).toBeCalledTimes(1);
          expect(logging.setLogLevel).toBeCalledWith(optimizelyFactory.enums.LOG_LEVEL.ERROR);
        });
      });

      describe('when passing in logger', () => {
        beforeEach(() => {
          vi.spyOn(logging, 'setLogHandler');
        });

        afterEach(() => {
          vi.resetAllMocks();
        });

        it('should call logging.setLogHandler with the supplied logger', () => {
          const fakeLogger = { log: function() {} };
          optimizelyFactory.createInstance({
            projectConfigManager: getMockProjectConfigManager({
              initConfig: createProjectConfig(testData.getTestProjectConfig()),
            }),
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            logger: fakeLogger,
          });
          expect(logging.setLogHandler).toBeCalledTimes(1);
          expect(logging.setLogHandler).toBeCalledWith(fakeLogger);
        });
      });
    });
  });
});
