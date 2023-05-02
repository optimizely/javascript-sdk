/**
 * Copyright 2016-2020, 2022-2023 Optimizely
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
import logging, { getLogger } from './modules/logging/logger';

import { assert } from 'chai';
import sinon from 'sinon';
import { default as eventProcessor } from './plugins/event_processor';
import Optimizely from './optimizely';
import testData from './tests/test_data';
import packageJSON from '../package.json';
import optimizelyFactory from './index.browser';
import configValidator from './utils/config_validator';
import eventProcessorConfigValidator from './utils/event_processor_config_validator';
import OptimizelyUserContext from './optimizely_user_context';
import { LOG_MESSAGES, ODP_EVENT_ACTION, ODP_EVENT_BROWSER_ENDPOINT } from './utils/enums';
import { BrowserOdpManager } from './plugins/odp_manager/index.browser';
import { OdpConfig } from './core/odp/odp_config';
import { BrowserOdpEventManager } from './plugins/odp/event_manager/index.browser';
import { BrowserOdpEventApiManager } from './plugins/odp/event_api_manager/index.browser';

var LocalStoragePendingEventsDispatcher = eventProcessor.LocalStoragePendingEventsDispatcher;

class MockLocalStorage {
  store = {};

  constructor() {}

  getItem(key) {
    return this.store[key];
  }

  setItem(key, value) {
    this.store[key] = value.toString();
  }

  clear() {
    this.store = {};
  }

  removeItem(key) {
    delete this.store[key];
  }
}

if (!global.window) {
  try {
    global.window = {
      localStorage: new MockLocalStorage(),
    };
  } catch (e) {
    console.error('Unable to overwrite global.window.');
  }
}

describe('javascript-sdk (Browser)', function() {
  var clock;
  beforeEach(function() {
    sinon.stub(optimizelyFactory.eventDispatcher, 'dispatchEvent');
    clock = sinon.useFakeTimers(new Date());
  });

  afterEach(function() {
    optimizelyFactory.eventDispatcher.dispatchEvent.restore();
    clock.restore();
  });

  describe('APIs', function() {
    it('should expose logger, errorHandler, eventDispatcher and enums', function() {
      assert.isDefined(optimizelyFactory.logging);
      assert.isDefined(optimizelyFactory.logging.createLogger);
      assert.isDefined(optimizelyFactory.logging.createNoOpLogger);
      assert.isDefined(optimizelyFactory.errorHandler);
      assert.isDefined(optimizelyFactory.eventDispatcher);
      assert.isDefined(optimizelyFactory.enums);
    });

    describe('createInstance', function() {
      var fakeErrorHandler = { handleError: function() {} };
      var fakeEventDispatcher = { dispatchEvent: function() {} };
      var silentLogger;

      beforeEach(function() {
        silentLogger = optimizelyFactory.logging.createLogger({
          logLevel: optimizelyFactory.enums.LOG_LEVEL.INFO,
          logToConsole: false,
        });
        sinon.spy(console, 'error');
        sinon.stub(configValidator, 'validate');

        global.XMLHttpRequest = sinon.useFakeXMLHttpRequest();

        sinon.stub(LocalStoragePendingEventsDispatcher.prototype, 'sendPendingEvents');
      });

      afterEach(function() {
        LocalStoragePendingEventsDispatcher.prototype.sendPendingEvents.restore();
        optimizelyFactory.__internalResetRetryState();
        console.error.restore();
        configValidator.validate.restore();
        delete global.XMLHttpRequest;
      });

      describe('when an eventDispatcher is not passed in', function() {
        it('should wrap the default eventDispatcher and invoke sendPendingEvents', function() {
          var optlyInstance = optimizelyFactory.createInstance({
            datafile: {},
            errorHandler: fakeErrorHandler,
            logger: silentLogger,
          });
          // Invalid datafile causes onReady Promise rejection - catch this error
          optlyInstance.onReady().catch(function() {});

          sinon.assert.calledOnce(LocalStoragePendingEventsDispatcher.prototype.sendPendingEvents);
        });
      });

      describe('when an eventDispatcher is passed in', function() {
        it('should NOT wrap the default eventDispatcher and invoke sendPendingEvents', function() {
          var optlyInstance = optimizelyFactory.createInstance({
            datafile: {},
            errorHandler: fakeErrorHandler,
            eventDispatcher: fakeEventDispatcher,
            logger: silentLogger,
          });
          // Invalid datafile causes onReady Promise rejection - catch this error
          optlyInstance.onReady().catch(function() {});

          sinon.assert.notCalled(LocalStoragePendingEventsDispatcher.prototype.sendPendingEvents);
        });
      });

      it('should invoke resendPendingEvents at most once', function() {
        var optlyInstance = optimizelyFactory.createInstance({
          datafile: {},
          errorHandler: fakeErrorHandler,
          logger: silentLogger,
        });
        // Invalid datafile causes onReady Promise rejection - catch this error
        optlyInstance.onReady().catch(function() {});

        sinon.assert.calledOnce(LocalStoragePendingEventsDispatcher.prototype.sendPendingEvents);

        optlyInstance = optimizelyFactory.createInstance({
          datafile: {},
          errorHandler: fakeErrorHandler,
          logger: silentLogger,
        });
        optlyInstance.onReady().catch(function() {});

        sinon.assert.calledOnce(LocalStoragePendingEventsDispatcher.prototype.sendPendingEvents);
      });

      it('should not throw if the provided config is not valid', function() {
        configValidator.validate.throws(new Error('Invalid config or something'));
        assert.doesNotThrow(function() {
          var optlyInstance = optimizelyFactory.createInstance({
            datafile: {},
            logger: silentLogger,
          });
          // Invalid datafile causes onReady Promise rejection - catch this error
          optlyInstance.onReady().catch(function() {});
        });
      });

      it('should create an instance of optimizely', function() {
        var optlyInstance = optimizelyFactory.createInstance({
          datafile: {},
          errorHandler: fakeErrorHandler,
          eventDispatcher: fakeEventDispatcher,
          logger: silentLogger,
        });
        // Invalid datafile causes onReady Promise rejection - catch this error
        optlyInstance.onReady().catch(function() {});

        assert.instanceOf(optlyInstance, Optimizely);
        assert.equal(optlyInstance.clientVersion, '4.9.3');
      });

      it('should set the JavaScript client engine and version', function() {
        var optlyInstance = optimizelyFactory.createInstance({
          datafile: {},
          errorHandler: fakeErrorHandler,
          eventDispatcher: fakeEventDispatcher,
          logger: silentLogger,
        });
        // Invalid datafile causes onReady Promise rejection - catch this error
        optlyInstance.onReady().catch(function() {});
        assert.equal('javascript-sdk', optlyInstance.clientEngine);
        assert.equal(packageJSON.version, optlyInstance.clientVersion);
      });

      it('should allow passing of "react-sdk" as the clientEngine', function() {
        var optlyInstance = optimizelyFactory.createInstance({
          clientEngine: 'react-sdk',
          datafile: {},
          errorHandler: fakeErrorHandler,
          eventDispatcher: fakeEventDispatcher,
          logger: silentLogger,
        });
        // Invalid datafile causes onReady Promise rejection - catch this error
        optlyInstance.onReady().catch(function() {});
        assert.equal('react-sdk', optlyInstance.clientEngine);
      });

      it('should activate with provided event dispatcher', function() {
        var optlyInstance = optimizelyFactory.createInstance({
          datafile: testData.getTestProjectConfig(),
          errorHandler: fakeErrorHandler,
          eventDispatcher: optimizelyFactory.eventDispatcher,
          logger: silentLogger,
        });
        var activate = optlyInstance.activate('testExperiment', 'testUser');
        assert.strictEqual(activate, 'control');
      });

      it('should be able to set and get a forced variation', function() {
        var optlyInstance = optimizelyFactory.createInstance({
          datafile: testData.getTestProjectConfig(),
          errorHandler: fakeErrorHandler,
          eventDispatcher: optimizelyFactory.eventDispatcher,
          logger: silentLogger,
        });

        var didSetVariation = optlyInstance.setForcedVariation('testExperiment', 'testUser', 'control');
        assert.strictEqual(didSetVariation, true);

        var variation = optlyInstance.getForcedVariation('testExperiment', 'testUser');
        assert.strictEqual(variation, 'control');
      });

      it('should be able to set and unset a forced variation', function() {
        var optlyInstance = optimizelyFactory.createInstance({
          datafile: testData.getTestProjectConfig(),
          errorHandler: fakeErrorHandler,
          eventDispatcher: optimizelyFactory.eventDispatcher,
          logger: silentLogger,
        });

        var didSetVariation = optlyInstance.setForcedVariation('testExperiment', 'testUser', 'control');
        assert.strictEqual(didSetVariation, true);

        var variation = optlyInstance.getForcedVariation('testExperiment', 'testUser');
        assert.strictEqual(variation, 'control');

        var didSetVariation2 = optlyInstance.setForcedVariation('testExperiment', 'testUser', null);
        assert.strictEqual(didSetVariation2, true);

        var variation2 = optlyInstance.getForcedVariation('testExperiment', 'testUser');
        assert.strictEqual(variation2, null);
      });

      it('should be able to set multiple experiments for one user', function() {
        var optlyInstance = optimizelyFactory.createInstance({
          datafile: testData.getTestProjectConfig(),
          errorHandler: fakeErrorHandler,
          eventDispatcher: optimizelyFactory.eventDispatcher,
          logger: silentLogger,
        });

        var didSetVariation = optlyInstance.setForcedVariation('testExperiment', 'testUser', 'control');
        assert.strictEqual(didSetVariation, true);

        var didSetVariation2 = optlyInstance.setForcedVariation(
          'testExperimentLaunched',
          'testUser',
          'controlLaunched'
        );
        assert.strictEqual(didSetVariation2, true);

        var variation = optlyInstance.getForcedVariation('testExperiment', 'testUser');
        assert.strictEqual(variation, 'control');

        var variation2 = optlyInstance.getForcedVariation('testExperimentLaunched', 'testUser');
        assert.strictEqual(variation2, 'controlLaunched');
      });

      it('should be able to set multiple experiments for one user, and unset one', function() {
        var optlyInstance = optimizelyFactory.createInstance({
          datafile: testData.getTestProjectConfig(),
          errorHandler: fakeErrorHandler,
          eventDispatcher: optimizelyFactory.eventDispatcher,
          logger: silentLogger,
        });

        var didSetVariation = optlyInstance.setForcedVariation('testExperiment', 'testUser', 'control');
        assert.strictEqual(didSetVariation, true);

        var didSetVariation2 = optlyInstance.setForcedVariation(
          'testExperimentLaunched',
          'testUser',
          'controlLaunched'
        );
        assert.strictEqual(didSetVariation2, true);

        var didSetVariation2 = optlyInstance.setForcedVariation('testExperimentLaunched', 'testUser', null);
        assert.strictEqual(didSetVariation2, true);

        var variation = optlyInstance.getForcedVariation('testExperiment', 'testUser');
        assert.strictEqual(variation, 'control');

        var variation2 = optlyInstance.getForcedVariation('testExperimentLaunched', 'testUser');
        assert.strictEqual(variation2, null);
      });

      it('should be able to set multiple experiments for one user, and reset one', function() {
        var optlyInstance = optimizelyFactory.createInstance({
          datafile: testData.getTestProjectConfig(),
          errorHandler: fakeErrorHandler,
          eventDispatcher: optimizelyFactory.eventDispatcher,
          logger: silentLogger,
        });

        var didSetVariation = optlyInstance.setForcedVariation('testExperiment', 'testUser', 'control');
        assert.strictEqual(didSetVariation, true);

        var didSetVariation2 = optlyInstance.setForcedVariation(
          'testExperimentLaunched',
          'testUser',
          'controlLaunched'
        );
        assert.strictEqual(didSetVariation2, true);

        var didSetVariation2 = optlyInstance.setForcedVariation(
          'testExperimentLaunched',
          'testUser',
          'variationLaunched'
        );
        assert.strictEqual(didSetVariation2, true);

        var variation = optlyInstance.getForcedVariation('testExperiment', 'testUser');
        assert.strictEqual(variation, 'control');

        var variation2 = optlyInstance.getForcedVariation('testExperimentLaunched', 'testUser');
        assert.strictEqual(variation2, 'variationLaunched');
      });

      it('should override bucketing when setForcedVariation is called', function() {
        var optlyInstance = optimizelyFactory.createInstance({
          datafile: testData.getTestProjectConfig(),
          errorHandler: fakeErrorHandler,
          eventDispatcher: optimizelyFactory.eventDispatcher,
          logger: silentLogger,
        });

        var didSetVariation = optlyInstance.setForcedVariation('testExperiment', 'testUser', 'control');
        assert.strictEqual(didSetVariation, true);

        var variation = optlyInstance.getVariation('testExperiment', 'testUser');
        assert.strictEqual(variation, 'control');

        var didSetVariation2 = optlyInstance.setForcedVariation('testExperiment', 'testUser', 'variation');
        assert.strictEqual(didSetVariation2, true);

        var variation = optlyInstance.getVariation('testExperiment', 'testUser');
        assert.strictEqual(variation, 'variation');
      });

      it('should override bucketing when setForcedVariation is called for a not running experiment', function() {
        var optlyInstance = optimizelyFactory.createInstance({
          datafile: testData.getTestProjectConfig(),
          errorHandler: fakeErrorHandler,
          eventDispatcher: optimizelyFactory.eventDispatcher,
          logger: silentLogger,
        });

        var didSetVariation = optlyInstance.setForcedVariation(
          'testExperimentNotRunning',
          'testUser',
          'controlNotRunning'
        );
        assert.strictEqual(didSetVariation, true);

        var variation = optlyInstance.getVariation('testExperimentNotRunning', 'testUser');
        assert.strictEqual(variation, null);
      });

      describe('when passing in logLevel', function() {
        beforeEach(function() {
          sinon.stub(logging, 'setLogLevel');
        });

        afterEach(function() {
          logging.setLogLevel.restore();
        });

        it('should call logging.setLogLevel', function() {
          optimizelyFactory.createInstance({
            datafile: testData.getTestProjectConfig(),
            logLevel: optimizelyFactory.enums.LOG_LEVEL.ERROR,
          });
          sinon.assert.calledOnce(logging.setLogLevel);
          sinon.assert.calledWithExactly(logging.setLogLevel, optimizelyFactory.enums.LOG_LEVEL.ERROR);
        });
      });

      describe('when passing in logger', function() {
        beforeEach(function() {
          sinon.stub(logging, 'setLogHandler');
        });

        afterEach(function() {
          logging.setLogHandler.restore();
        });

        it('should call logging.setLogHandler with the supplied logger', function() {
          var fakeLogger = { log: function() {} };
          optimizelyFactory.createInstance({
            datafile: testData.getTestProjectConfig(),
            logger: fakeLogger,
          });
          sinon.assert.calledOnce(logging.setLogHandler);
          sinon.assert.calledWithExactly(logging.setLogHandler, fakeLogger);
        });
      });

      describe('event processor configuration', function() {
        beforeEach(function() {
          sinon.stub(eventProcessor, 'createEventProcessor');
        });

        afterEach(function() {
          eventProcessor.createEventProcessor.restore();
        });

        it('should use default event flush interval when none is provided', function() {
          optimizelyFactory.createInstance({
            datafile: testData.getTestProjectConfigWithFeatures(),
            errorHandler: fakeErrorHandler,
            eventDispatcher: fakeEventDispatcher,
            logger: silentLogger,
          });
          sinon.assert.calledWithExactly(
            eventProcessor.createEventProcessor,
            sinon.match({
              flushInterval: 1000,
            })
          );
        });

        describe('with an invalid flush interval', function() {
          beforeEach(function() {
            sinon.stub(eventProcessorConfigValidator, 'validateEventFlushInterval').returns(false);
          });

          afterEach(function() {
            eventProcessorConfigValidator.validateEventFlushInterval.restore();
          });

          it('should ignore the event flush interval and use the default instead', function() {
            optimizelyFactory.createInstance({
              datafile: testData.getTestProjectConfigWithFeatures(),
              errorHandler: fakeErrorHandler,
              eventDispatcher: fakeEventDispatcher,
              logger: silentLogger,
              eventFlushInterval: ['invalid', 'flush', 'interval'],
            });
            sinon.assert.calledWithExactly(
              eventProcessor.createEventProcessor,
              sinon.match({
                flushInterval: 1000,
              })
            );
          });
        });

        describe('with a valid flush interval', function() {
          beforeEach(function() {
            sinon.stub(eventProcessorConfigValidator, 'validateEventFlushInterval').returns(true);
          });

          afterEach(function() {
            eventProcessorConfigValidator.validateEventFlushInterval.restore();
          });

          it('should use the provided event flush interval', function() {
            optimizelyFactory.createInstance({
              datafile: testData.getTestProjectConfigWithFeatures(),
              errorHandler: fakeErrorHandler,
              eventDispatcher: fakeEventDispatcher,
              logger: silentLogger,
              eventFlushInterval: 9000,
            });
            sinon.assert.calledWithExactly(
              eventProcessor.createEventProcessor,
              sinon.match({
                flushInterval: 9000,
              })
            );
          });
        });

        it('should use default event batch size when none is provided', function() {
          optimizelyFactory.createInstance({
            datafile: testData.getTestProjectConfigWithFeatures(),
            errorHandler: fakeErrorHandler,
            eventDispatcher: fakeEventDispatcher,
            logger: silentLogger,
          });
          sinon.assert.calledWithExactly(
            eventProcessor.createEventProcessor,
            sinon.match({
              batchSize: 10,
            })
          );
        });

        describe('with an invalid event batch size', function() {
          beforeEach(function() {
            sinon.stub(eventProcessorConfigValidator, 'validateEventBatchSize').returns(false);
          });

          afterEach(function() {
            eventProcessorConfigValidator.validateEventBatchSize.restore();
          });

          it('should ignore the event batch size and use the default instead', function() {
            optimizelyFactory.createInstance({
              datafile: testData.getTestProjectConfigWithFeatures(),
              errorHandler: fakeErrorHandler,
              eventDispatcher: fakeEventDispatcher,
              logger: silentLogger,
              eventBatchSize: null,
            });
            sinon.assert.calledWithExactly(
              eventProcessor.createEventProcessor,
              sinon.match({
                batchSize: 10,
              })
            );
          });
        });

        describe('with a valid event batch size', function() {
          beforeEach(function() {
            sinon.stub(eventProcessorConfigValidator, 'validateEventBatchSize').returns(true);
          });

          afterEach(function() {
            eventProcessorConfigValidator.validateEventBatchSize.restore();
          });

          it('should use the provided event batch size', function() {
            optimizelyFactory.createInstance({
              datafile: testData.getTestProjectConfigWithFeatures(),
              errorHandler: fakeErrorHandler,
              eventDispatcher: fakeEventDispatcher,
              logger: silentLogger,
              eventBatchSize: 300,
            });
            sinon.assert.calledWithExactly(
              eventProcessor.createEventProcessor,
              sinon.match({
                batchSize: 300,
              })
            );
          });
        });
      });
    });

    describe('ODP/ATS', () => {
      var sandbox = sinon.sandbox.create();

      const fakeOptimizely = {
        identifyUser: sinon.stub().returns(),
      };

      const fakeErrorHandler = { handleError: function() {} };
      const fakeEventDispatcher = { dispatchEvent: function() {} };
      let logger = getLogger();

      const testFsUserId = 'fs_test_user';
      const testVuid = 'vuid_test_user';
      var clock;
      const requestParams = new Map();
      const mockRequestHandler = {
        makeRequest: (endpoint, headers, method, data) => {
          requestParams.set('endpoint', endpoint);
          requestParams.set('headers', headers);
          requestParams.set('method', method);
          requestParams.set('data', data);
          return {
            responsePromise: (async () => {
              return { statusCode: 200 };
            })(),
          };
        },
        args: requestParams,
      };

      beforeEach(function() {
        sandbox.stub(logger, 'log');
        sandbox.stub(logger, 'error');
        clock = sinon.useFakeTimers(new Date());
      });

      afterEach(function() {
        sandbox.restore();
        clock.restore();
        requestParams.clear();
      });

      it('should send identify event by default when initialized', () => {
        new OptimizelyUserContext({
          optimizely: fakeOptimizely,
          userId: testFsUserId,
        });

        sinon.assert.calledOnce(fakeOptimizely.identifyUser);

        sinon.assert.calledWith(fakeOptimizely.identifyUser, testFsUserId);
      });

      it('should log info when odp is disabled', () => {
        const disabledClient = optimizelyFactory.createInstance({
          datafile: testData.getTestProjectConfigWithFeatures(),
          errorHandler: fakeErrorHandler,
          eventDispatcher: fakeEventDispatcher,
          eventBatchSize: null,
          logger,
          odpManager: new BrowserOdpManager({
            logger,
            odpOptions: {
              disabled: true,
            },
          }),
        });

        sinon.assert.calledWith(logger.log, optimizelyFactory.enums.LOG_LEVEL.INFO, LOG_MESSAGES.ODP_DISABLED);
      });

      it('should accept a valid custom cache size', () => {
        const client = optimizelyFactory.createInstance({
          datafile: testData.getTestProjectConfigWithFeatures(),
          errorHandler: fakeErrorHandler,
          eventDispatcher: fakeEventDispatcher,
          eventBatchSize: null,
          logger,
          odpManager: new BrowserOdpManager({
            logger,
            odpOptions: {
              segmentsCacheSize: 10,
            },
          }),
        });

        sinon.assert.calledWith(
          logger.log,
          optimizelyFactory.enums.LOG_LEVEL.DEBUG,
          'Provisioning cache with maxSize of 10'
        );
      });

      it('should accept a custom cache timeout', () => {
        const client = optimizelyFactory.createInstance({
          datafile: testData.getTestProjectConfigWithFeatures(),
          errorHandler: fakeErrorHandler,
          eventDispatcher: fakeEventDispatcher,
          eventBatchSize: null,
          logger,
          odpManager: new BrowserOdpManager({
            logger,
            odpOptions: {
              segmentsCacheTimeout: 10,
            },
          }),
        });

        sinon.assert.calledWith(
          logger.log,
          optimizelyFactory.enums.LOG_LEVEL.DEBUG,
          'Provisioning cache with timeout of 10'
        );
      });

      it('should accept both a custom cache size and timeout', () => {
        const client = optimizelyFactory.createInstance({
          datafile: testData.getTestProjectConfigWithFeatures(),
          errorHandler: fakeErrorHandler,
          eventDispatcher: fakeEventDispatcher,
          eventBatchSize: null,
          logger,
          odpOptions: {
            segmentsCacheSize: 10,
            segmentsCacheTimeout: 10,
          },
        });

        sinon.assert.calledWith(
          logger.log,
          optimizelyFactory.enums.LOG_LEVEL.DEBUG,
          'Provisioning cache with maxSize of 10'
        );

        sinon.assert.calledWith(
          logger.log,
          optimizelyFactory.enums.LOG_LEVEL.DEBUG,
          'Provisioning cache with timeout of 10'
        );
      });

      it('should accept a valid custom odp segment manager', async () => {
        const fakeSegmentManager = {
          fetchQualifiedSegments: sinon.spy(),
          updateSettings: sinon.spy(),
        };

        const client = optimizelyFactory.createInstance({
          datafile: testData.getTestProjectConfigWithFeatures(),
          errorHandler: fakeErrorHandler,
          eventDispatcher: fakeEventDispatcher,
          eventBatchSize: null,
          logger,
          odpOptions: {
            segmentManager: fakeSegmentManager,
          },
        });

        sinon.assert.called(fakeSegmentManager.updateSettings);

        const readyData = await client.onReady();
        assert.equal(readyData.success, true);
        assert.isUndefined(readyData.reason);

        await client.fetchQualifiedSegments(testVuid);

        sinon.assert.notCalled(logger.error);
        sinon.assert.called(fakeSegmentManager.fetchQualifiedSegments);
      });

      it('should accept a valid custom odp event manager', async () => {
        const fakeEventManager = {
          start: sinon.spy(),
          updateSettings: sinon.spy(),
          flush: sinon.spy(),
          stop: sinon.spy(),
          registerVuid: sinon.spy(),
          identifyUser: sinon.spy(),
          sendEvent: sinon.spy(),
        };

        const client = optimizelyFactory.createInstance({
          datafile: testData.getTestProjectConfigWithFeatures(),
          errorHandler: fakeErrorHandler,
          eventDispatcher: fakeEventDispatcher,
          eventBatchSize: null,
          logger,
          odpOptions: {
            disabled: false,
            eventManager: fakeEventManager,
          },
        });
        const readyData = await client.onReady();
        assert.equal(readyData.success, true);
        assert.isUndefined(readyData.reason);

        sinon.assert.called(fakeEventManager.start);
      });

      it('should send an odp event with sendOdpEvent', async () => {
        const fakeEventManager = {
          updateSettings: sinon.spy(),
          start: sinon.spy(),
          stop: sinon.spy(),
          registerVuid: sinon.spy(),
          identifyUser: sinon.spy(),
          sendEvent: sinon.spy(),
          flush: sinon.spy(),
        };

        const client = optimizelyFactory.createInstance({
          datafile: testData.getOdpIntegratedConfigWithSegments(),
          errorHandler: fakeErrorHandler,
          eventDispatcher: fakeEventDispatcher,
          eventBatchSize: null,
          logger,
          odpOptions: {
            eventManager: fakeEventManager,
          },
        });

        const readyData = await client.onReady();
        assert.equal(readyData.success, true);
        assert.isUndefined(readyData.reason);

        client.sendOdpEvent(ODP_EVENT_ACTION.INITIALIZED);

        sinon.assert.notCalled(logger.error);
        sinon.assert.called(fakeEventManager.sendEvent);
      });

      it('should log an error when attempting to send an odp event when odp is disabled', async () => {
        const client = optimizelyFactory.createInstance({
          datafile: testData.getTestProjectConfigWithFeatures(),
          errorHandler: fakeErrorHandler,
          eventDispatcher: fakeEventDispatcher,
          eventBatchSize: null,
          logger,
          odpOptions: {
            disabled: true,
          },
        });

        const readyData = await client.onReady();
        assert.equal(readyData.success, true);
        assert.isUndefined(readyData.reason);

        client.sendOdpEvent(ODP_EVENT_ACTION.INITIALIZED);

        sinon.assert.calledWith(logger.error, 'ODP event send failed.');
        sinon.assert.calledWith(logger.log, optimizelyFactory.enums.LOG_LEVEL.INFO, 'ODP Disabled.');
      });

      it('should log a warning when attempting to use an event batch size other than 1', async () => {
        const client = optimizelyFactory.createInstance({
          datafile: testData.getOdpIntegratedConfigWithSegments(),
          errorHandler: fakeErrorHandler,
          eventDispatcher: fakeEventDispatcher,
          eventBatchSize: null,
          logger,
          odpOptions: {
            eventBatchSize: 5,
          },
        });

        const readyData = await client.onReady();
        assert.equal(readyData.success, true);
        assert.isUndefined(readyData.reason);

        client.sendOdpEvent(ODP_EVENT_ACTION.INITIALIZED);

        sinon.assert.calledWith(
          logger.log,
          optimizelyFactory.enums.LOG_LEVEL.WARNING,
          'ODP event batch size must be 1 in the browser.'
        );
        assert(client.odpManager.eventManager.batchSize, 1);
      });

      it('should send an odp event to the browser endpoint', async () => {
        const odpConfig = new OdpConfig();
        const apiManager = new BrowserOdpEventApiManager(mockRequestHandler, logger);
        const eventManager = new BrowserOdpEventManager({
          odpConfig,
          apiManager,
          logger,
          clientEngine: 'javascript-sdk',
          clientVersion: 'great',
        });

        let datafile = testData.getOdpIntegratedConfigWithSegments();

        const client = optimizelyFactory.createInstance({
          datafile,
          errorHandler: fakeErrorHandler,
          eventDispatcher: fakeEventDispatcher,
          eventBatchSize: null,
          logger,
          odpOptions: {
            odpConfig,
            eventManager,
          },
        });

        const readyData = await client.onReady();
        assert.equal(readyData.success, true);
        assert.isUndefined(readyData.reason);

        client.sendOdpEvent(ODP_EVENT_ACTION.INITIALIZED);

        // wait for request to be sent
        clock.tick(100);

        let publicKey = datafile.integrations[0].publicKey;

        let requestEndpoint = new URL(requestParams.get('endpoint'));
        assert.equal(requestEndpoint.origin + requestEndpoint.pathname, ODP_EVENT_BROWSER_ENDPOINT);
        assert.equal(requestParams.get('method'), 'GET');

        let searchParams = requestEndpoint.searchParams;
        assert.lengthOf(searchParams.get('idempotence_id'), 36);
        assert.equal(searchParams.get('data_source'), 'javascript-sdk');
        assert.equal(searchParams.get('data_source_type'), 'sdk');
        assert.equal(searchParams.get('data_source_version'), 'great');
        assert.equal(searchParams.get('tracker_id'), publicKey);
        assert.equal(searchParams.get('event_type'), 'fullstack');
        assert.equal(searchParams.get('vdl_action'), ODP_EVENT_ACTION.INITIALIZED);
        assert.isTrue(searchParams.get('vuid').startsWith('vuid_'));
        assert.isNotNull(searchParams.get('data_source_version'));

        sinon.assert.notCalled(logger.error);
      });

      it('should send odp client_initialized on client instantiation', async () => {
        const odpConfig = new OdpConfig();
        const apiManager = new BrowserOdpEventApiManager(mockRequestHandler, logger);
        apiManager.sendEvents = sinon.spy();
        const eventManager = new BrowserOdpEventManager({
           odpConfig,
           apiManager,
           logger,
        });
        const datafile = testData.getOdpIntegratedConfigWithSegments();
        const client = optimizelyFactory.createInstance({
          datafile,
          errorHandler: fakeErrorHandler,
          eventDispatcher: fakeEventDispatcher,
          eventBatchSize: null,
          logger,
          odpOptions: {
            odpConfig,
            eventManager,
          },
        });

        const readyData = await client.onReady();
        assert.equal(readyData.success, true);
        assert.isUndefined(readyData.reason);

        setTimeout(() => sinon.assert.callCount(apiManager.sendEvents, 1), 100);
      });
    });
  });
});
