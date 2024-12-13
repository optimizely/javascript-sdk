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

import * as logging from '../lib/modules/logging/logger';

import Optimizely from '../lib/optimizely';
import testData from '../lib/tests/test_data';
import packageJSON from '../package.json';
import optimizelyFactory from '../lib/index.react_native';
import configValidator from '../lib/utils/config_validator';
import { getMockProjectConfigManager } from '../lib/tests/mock/mock_project_config_manager';
import { createProjectConfig } from '../lib/project_config/project_config';
import { INVALID_CONFIG_OR_SOMETHING } from '../lib/exception_messages';

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
      // @ts-ignore
      let silentLogger;

      beforeEach(() => {
        // @ts-ignore
        silentLogger = optimizelyFactory.logging.createLogger();
        vi.spyOn(console, 'error');
        vi.spyOn(configValidator, 'validate').mockImplementation(() => {
          throw new Error(INVALID_CONFIG_OR_SOMETHING);
        });
      });

      afterEach(() => {
        vi.resetAllMocks();
      });

      it('should not throw if the provided config is not valid', () => {
        expect(function() {
          const optlyInstance = optimizelyFactory.createInstance({
            projectConfigManager: getMockProjectConfigManager(),
            // @ts-ignore
            logger: silentLogger,
          });
        }).not.toThrow();
      });

      it('should create an instance of optimizely', () => {
        const optlyInstance = optimizelyFactory.createInstance({
          projectConfigManager: getMockProjectConfigManager(),
          errorHandler: fakeErrorHandler,
          // @ts-ignore
          logger: silentLogger,
        });

        expect(optlyInstance).toBeInstanceOf(Optimizely);
        // @ts-ignore
        expect(optlyInstance.clientVersion).toEqual('5.3.4');
      });

      it('should set the React Native JS client engine and javascript SDK version', () => {
        const optlyInstance = optimizelyFactory.createInstance({
          projectConfigManager: getMockProjectConfigManager(),
          errorHandler: fakeErrorHandler,
          // @ts-ignore
          logger: silentLogger,
        });

        // @ts-ignore
        expect('react-native-js-sdk').toEqual(optlyInstance.clientEngine);
        // @ts-ignore
        expect(packageJSON.version).toEqual(optlyInstance.clientVersion);
      });

      it('should allow passing of "react-sdk" as the clientEngine and convert it to "react-native-sdk"', () => {
        const optlyInstance = optimizelyFactory.createInstance({
          clientEngine: 'react-sdk',
          projectConfigManager: getMockProjectConfigManager(),
          errorHandler: fakeErrorHandler,
          // @ts-ignore
          logger: silentLogger,
        });
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
            // @ts-ignore
            logger: fakeLogger,
          });
          expect(logging.setLogHandler).toBeCalledTimes(1);
          expect(logging.setLogHandler).toBeCalledWith(fakeLogger);
        });
      });

      // TODO: user will create and inject an event processor
      // these tests will be refactored accordingly
      // describe('event processor configuration', () => {
      //   // @ts-ignore
      //   let eventProcessorSpy;
      //   beforeEach(() => {
      //     eventProcessorSpy = vi.spyOn(eventProcessor, 'createEventProcessor');
      //   });

      //   afterEach(() => {
      //     vi.resetAllMocks();
      //   });

      //   it('should use default event flush interval when none is provided', () => {
      //     optimizelyFactory.createInstance({
      //       projectConfigManager: getMockProjectConfigManager({
      //         initConfig: createProjectConfig(testData.getTestProjectConfigWithFeatures()),
      //       }),
      //       errorHandler: fakeErrorHandler,
      //       eventDispatcher: fakeEventDispatcher,
      //       // @ts-ignore
      //       logger: silentLogger,
      //     });

      //     expect(
      //       // @ts-ignore
      //       eventProcessorSpy
      //     ).toBeCalledWith(
      //       expect.objectContaining({
      //         flushInterval: 1000,
      //       })
      //     );
      //   });

      //   describe('with an invalid flush interval', () => {
      //     beforeEach(() => {
      //       vi.spyOn(eventProcessorConfigValidator, 'validateEventFlushInterval').mockImplementation(() => false);
      //     });

      //     afterEach(() => {
      //       vi.resetAllMocks();
      //     });

      //     it('should ignore the event flush interval and use the default instead', () => {
      //       optimizelyFactory.createInstance({
      //         projectConfigManager: getMockProjectConfigManager({
      //           initConfig: createProjectConfig(testData.getTestProjectConfigWithFeatures()),
      //         }),
      //         errorHandler: fakeErrorHandler,
      //         eventDispatcher: fakeEventDispatcher,
      //         // @ts-ignore
      //         logger: silentLogger,
      //         // @ts-ignore
      //         eventFlushInterval: ['invalid', 'flush', 'interval'],
      //       });
      //       expect(
      //         // @ts-ignore
      //         eventProcessorSpy
      //       ).toBeCalledWith(
      //         expect.objectContaining({
      //           flushInterval: 1000,
      //         })
      //       );
      //     });
      //   });

      //   describe('with a valid flush interval', () => {
      //     beforeEach(() => {
      //       vi.spyOn(eventProcessorConfigValidator, 'validateEventFlushInterval').mockImplementation(() => true);
      //     });

      //     afterEach(() => {
      //       vi.resetAllMocks();
      //     });

      //     it('should use the provided event flush interval', () => {
      //       optimizelyFactory.createInstance({
      //         projectConfigManager: getMockProjectConfigManager({
      //           initConfig: createProjectConfig(testData.getTestProjectConfigWithFeatures()),
      //         }),
      //         errorHandler: fakeErrorHandler,
      //         eventDispatcher: fakeEventDispatcher,
      //         // @ts-ignore
      //         logger: silentLogger,
      //         eventFlushInterval: 9000,
      //       });
      //       expect(
      //         // @ts-ignore
      //         eventProcessorSpy
      //       ).toBeCalledWith(
      //         expect.objectContaining({
      //           flushInterval: 9000,
      //         })
      //       );
      //     });
      //   });

      //   it('should use default event batch size when none is provided', () => {
      //     optimizelyFactory.createInstance({
      //       projectConfigManager: getMockProjectConfigManager({
      //         initConfig: createProjectConfig(testData.getTestProjectConfigWithFeatures()),
      //       }),
      //       errorHandler: fakeErrorHandler,
      //       eventDispatcher: fakeEventDispatcher,
      //       // @ts-ignore
      //       logger: silentLogger,
      //     });
      //     expect(
      //       // @ts-ignore
      //       eventProcessorSpy
      //     ).toBeCalledWith(
      //       expect.objectContaining({
      //         batchSize: 10,
      //       })
      //     );
      //   });

      //   describe('with an invalid event batch size', () => {
      //     beforeEach(() => {
      //       vi.spyOn(eventProcessorConfigValidator, 'validateEventBatchSize').mockImplementation(() => false);
      //     });

      //     afterEach(() => {
      //       vi.resetAllMocks();
      //     });

      //     it('should ignore the event batch size and use the default instead', () => {
      //       optimizelyFactory.createInstance({
      //         datafile: testData.getTestProjectConfigWithFeatures(),
      //         errorHandler: fakeErrorHandler,
      //         eventDispatcher: fakeEventDispatcher,
      //         // @ts-ignore
      //         logger: silentLogger,
      //         // @ts-ignore
      //         eventBatchSize: null,
      //       });
      //       expect(
      //         // @ts-ignore
      //         eventProcessorSpy
      //       ).toBeCalledWith(
      //         expect.objectContaining({
      //           batchSize: 10,
      //         })
      //       );
      //     });
      //   });

      //   describe('with a valid event batch size', () => {
      //     beforeEach(() => {
      //       vi.spyOn(eventProcessorConfigValidator, 'validateEventBatchSize').mockImplementation(() => true);
      //     });

      //     afterEach(() => {
      //       vi.resetAllMocks();
      //     });

      //     it('should use the provided event batch size', () => {
      //       optimizelyFactory.createInstance({
      //         projectConfigManager: getMockProjectConfigManager({
      //           initConfig: createProjectConfig(testData.getTestProjectConfigWithFeatures()),
      //         }),
      //         errorHandler: fakeErrorHandler,
      //         eventDispatcher: fakeEventDispatcher,
      //         // @ts-ignore
      //         logger: silentLogger,
      //         eventBatchSize: 300,
      //       });
      //       expect(
      //         // @ts-ignore
      //         eventProcessorSpy
      //       ).toBeCalledWith(
      //         expect.objectContaining({
      //           batchSize: 300,
      //         })
      //       );
      //     });
      //   });
      // });
    });
  });
});
