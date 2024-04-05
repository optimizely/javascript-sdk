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
/// <reference types="jest" />
import * as logging from '../lib/modules/logging/logger';
import * as eventProcessor from '../lib//plugins/event_processor/index.react_native';

import Optimizely from '../lib/optimizely';
import testData from '../lib/tests/test_data';
import packageJSON from '../package.json';
import optimizelyFactory from '../lib/index.react_native';
import configValidator from '../lib/utils/config_validator';
import eventProcessorConfigValidator from '../lib/utils/event_processor_config_validator';

describe('javascript-sdk/react-native', () => {
  beforeEach(() => {
    jest.spyOn(optimizelyFactory.eventDispatcher, 'dispatchEvent');
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.resetAllMocks();
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
      var fakeErrorHandler = { handleError: function() {} };
      var fakeEventDispatcher = { dispatchEvent: function() {} };
      // @ts-ignore
      var silentLogger;

      beforeEach(() => {
        // @ts-ignore
        silentLogger = optimizelyFactory.logging.createLogger();
        jest.spyOn(console, 'error');
        jest.spyOn(configValidator, 'validate').mockImplementation(() => {
          throw new Error('Invalid config or something');
        });
      });

      afterEach(() => {
        jest.resetAllMocks();
      });

      it('should not throw if the provided config is not valid', () => {
        expect(function() {
          var optlyInstance = optimizelyFactory.createInstance({
            datafile: {},
            // @ts-ignore
            logger: silentLogger,
          });
          // Invalid datafile causes onReady Promise rejection - catch this error
          // @ts-ignore
          optlyInstance.onReady().catch(function() {});
        }).not.toThrow();
      });

      it('should create an instance of optimizely', () => {
        var optlyInstance = optimizelyFactory.createInstance({
          datafile: {},
          errorHandler: fakeErrorHandler,
          eventDispatcher: fakeEventDispatcher,
          // @ts-ignore
          logger: silentLogger,
        });
        // Invalid datafile causes onReady Promise rejection - catch this error
        // @ts-ignore
        optlyInstance.onReady().catch(function() {});

        expect(optlyInstance).toBeInstanceOf(Optimizely);
        // @ts-ignore
        expect(optlyInstance.clientVersion).toEqual('5.3.0');
      });

      it('should set the React Native JS client engine and javascript SDK version', () => {
        var optlyInstance = optimizelyFactory.createInstance({
          datafile: {},
          errorHandler: fakeErrorHandler,
          eventDispatcher: fakeEventDispatcher,
          // @ts-ignore
          logger: silentLogger,
        });
        // Invalid datafile causes onReady Promise rejection - catch this error
        // @ts-ignore
        optlyInstance.onReady().catch(function() {});
        // @ts-ignore
        expect('react-native-js-sdk').toEqual(optlyInstance.clientEngine);
        // @ts-ignore
        expect(packageJSON.version).toEqual(optlyInstance.clientVersion);
      });

      it('should allow passing of "react-sdk" as the clientEngine and convert it to "react-native-sdk"', () => {
        var optlyInstance = optimizelyFactory.createInstance({
          clientEngine: 'react-sdk',
          datafile: {},
          errorHandler: fakeErrorHandler,
          eventDispatcher: fakeEventDispatcher,
          // @ts-ignore
          logger: silentLogger,
        });
        // Invalid datafile causes onReady Promise rejection - catch this error
        // @ts-ignore
        optlyInstance.onReady().catch(function() {});
        // @ts-ignore
        expect('react-native-sdk').toEqual(optlyInstance.clientEngine);
      });

      describe('when passing in logLevel', () => {
        beforeEach(() => {
          jest.spyOn(logging, 'setLogLevel');
        });

        afterEach(() => {
          jest.resetAllMocks();
        });

        it('should call logging.setLogLevel', () => {
          optimizelyFactory.createInstance({
            datafile: testData.getTestProjectConfig(),
            logLevel: optimizelyFactory.enums.LOG_LEVEL.ERROR,
          });
          expect(logging.setLogLevel).toBeCalledTimes(1);
          expect(logging.setLogLevel).toBeCalledWith(optimizelyFactory.enums.LOG_LEVEL.ERROR);
        });
      });

      describe('when passing in logger', () => {
        beforeEach(() => {
          jest.spyOn(logging, 'setLogHandler');
        });

        afterEach(() => {
          jest.resetAllMocks();
        });

        it('should call logging.setLogHandler with the supplied logger', () => {
          var fakeLogger = { log: function() {} };
          optimizelyFactory.createInstance({
            datafile: testData.getTestProjectConfig(),
            // @ts-ignore
            logger: fakeLogger,
          });
          expect(logging.setLogHandler).toBeCalledTimes(1);
          expect(logging.setLogHandler).toBeCalledWith(fakeLogger);
        });
      });

      describe('event processor configuration', () => {
        // @ts-ignore
        var eventProcessorSpy;
        beforeEach(() => {
          eventProcessorSpy = jest.spyOn(eventProcessor, 'createEventProcessor');
        });

        afterEach(() => {
          jest.resetAllMocks();
        });

        it('should use default event flush interval when none is provided', () => {
          optimizelyFactory.createInstance({
            datafile: testData.getTestProjectConfigWithFeatures(),
            errorHandler: fakeErrorHandler,
            eventDispatcher: fakeEventDispatcher,
            // @ts-ignore
            logger: silentLogger,
          });

          expect(
            // @ts-ignore
            eventProcessorSpy
          ).toBeCalledWith(
            expect.objectContaining({
              flushInterval: 1000,
            })
          );
        });

        describe('with an invalid flush interval', () => {
          beforeEach(() => {
            jest.spyOn(eventProcessorConfigValidator, 'validateEventFlushInterval').mockImplementation(() => false);
          });

          afterEach(() => {
            jest.resetAllMocks();
          });

          it('should ignore the event flush interval and use the default instead', () => {
            optimizelyFactory.createInstance({
              datafile: testData.getTestProjectConfigWithFeatures(),
              errorHandler: fakeErrorHandler,
              eventDispatcher: fakeEventDispatcher,
              // @ts-ignore
              logger: silentLogger,
              // @ts-ignore
              eventFlushInterval: ['invalid', 'flush', 'interval'],
            });
            expect(
              // @ts-ignore
              eventProcessorSpy
            ).toBeCalledWith(
              expect.objectContaining({
                flushInterval: 1000,
              })
            );
          });
        });

        describe('with a valid flush interval', () => {
          beforeEach(() => {
            jest.spyOn(eventProcessorConfigValidator, 'validateEventFlushInterval').mockImplementation(() => true);
          });

          afterEach(() => {
            jest.resetAllMocks();
          });

          it('should use the provided event flush interval', () => {
            optimizelyFactory.createInstance({
              datafile: testData.getTestProjectConfigWithFeatures(),
              errorHandler: fakeErrorHandler,
              eventDispatcher: fakeEventDispatcher,
              // @ts-ignore
              logger: silentLogger,
              eventFlushInterval: 9000,
            });
            expect(
              // @ts-ignore
              eventProcessorSpy
            ).toBeCalledWith(
              expect.objectContaining({
                flushInterval: 9000,
              })
            );
          });
        });

        it('should use default event batch size when none is provided', () => {
          optimizelyFactory.createInstance({
            datafile: testData.getTestProjectConfigWithFeatures(),
            errorHandler: fakeErrorHandler,
            eventDispatcher: fakeEventDispatcher,
            // @ts-ignore
            logger: silentLogger,
          });
          expect(
            // @ts-ignore
            eventProcessorSpy
          ).toBeCalledWith(
            expect.objectContaining({
              batchSize: 10,
            })
          );
        });

        describe('with an invalid event batch size', () => {
          beforeEach(() => {
            jest.spyOn(eventProcessorConfigValidator, 'validateEventBatchSize').mockImplementation(() => false);
          });

          afterEach(() => {
            jest.resetAllMocks();
          });

          it('should ignore the event batch size and use the default instead', () => {
            optimizelyFactory.createInstance({
              datafile: testData.getTestProjectConfigWithFeatures(),
              errorHandler: fakeErrorHandler,
              eventDispatcher: fakeEventDispatcher,
              // @ts-ignore
              logger: silentLogger,
              // @ts-ignore
              eventBatchSize: null,
            });
            expect(
              // @ts-ignore
              eventProcessorSpy
            ).toBeCalledWith(
              expect.objectContaining({
                batchSize: 10,
              })
            );
          });
        });

        describe('with a valid event batch size', () => {
          beforeEach(() => {
            jest.spyOn(eventProcessorConfigValidator, 'validateEventBatchSize').mockImplementation(() => true);
          });

          afterEach(() => {
            jest.resetAllMocks();
          });

          it('should use the provided event batch size', () => {
            optimizelyFactory.createInstance({
              datafile: testData.getTestProjectConfigWithFeatures(),
              errorHandler: fakeErrorHandler,
              eventDispatcher: fakeEventDispatcher,
              // @ts-ignore
              logger: silentLogger,
              eventBatchSize: 300,
            });
            expect(
              // @ts-ignore
              eventProcessorSpy
            ).toBeCalledWith(
              expect.objectContaining({
                batchSize: 300,
              })
            );
          });
        });
      });
    });
  });
});
