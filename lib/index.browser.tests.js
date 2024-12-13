/**
 * Copyright 2016-2020, 2022-2024 Optimizely
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
import logging, { getLogger } from './modules/logging/logger';

import { assert } from 'chai';
import sinon from 'sinon';
import Optimizely from './optimizely';
import testData from './tests/test_data';
import packageJSON from '../package.json';
import optimizelyFactory from './index.browser';
import configValidator from './utils/config_validator';
import { getMockProjectConfigManager } from './tests/mock/mock_project_config_manager';
import { createProjectConfig } from './project_config/project_config';
import { ODP_EVENT_FAILED_ODP_MANAGER_MISSING } from './error_messages';
import { ODP_DISABLED, ODP_SEND_EVENT_IDENTIFIER_CONVERSION_FAILED } from './log_messages';
import { INVALID_CONFIG_OR_SOMETHING } from './exception_messages';


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

const pause = timeoutMilliseconds => {
  return new Promise(resolve => setTimeout(resolve, timeoutMilliseconds));
};

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
      });

      afterEach(function() {
        optimizelyFactory.__internalResetRetryState();
        console.error.restore();
        configValidator.validate.restore();
        delete global.XMLHttpRequest;
      });

      // TODO: pending event handling will be done by EventProcessor instead
      // describe('when an eventDispatcher is not passed in', function() {
      //   it('should wrap the default eventDispatcher and invoke sendPendingEvents', function() {
      //     var optlyInstance = optimizelyFactory.createInstance({
      //       projectConfigManager: getMockProjectConfigManager(),
      //       errorHandler: fakeErrorHandler,
      //       logger: silentLogger,
      //     });

      //     sinon.assert.calledOnce(LocalStoragePendingEventsDispatcher.prototype.sendPendingEvents);
      //   });
      // });

      describe('when an eventDispatcher is passed in', function() {
        it('should NOT wrap the default eventDispatcher and invoke sendPendingEvents', function() {
          var optlyInstance = optimizelyFactory.createInstance({
            projectConfigManager: getMockProjectConfigManager(),
            errorHandler: fakeErrorHandler,
            eventDispatcher: fakeEventDispatcher,
            logger: silentLogger,
          });
        });
      });

      // TODO: pending event handling should be part of the event processor
      // logic, not the dispatcher. Refactor accordingly.
      // it('should invoke resendPendingEvents at most once', function() {
      //   var optlyInstance = optimizelyFactory.createInstance({
      //     projectConfigManager: getMockProjectConfigManager(),
      //     errorHandler: fakeErrorHandler,
      //     logger: silentLogger,
      //   });

      //   sinon.assert.calledOnce(LocalStoragePendingEventsDispatcher.prototype.sendPendingEvents);

      //   optlyInstance = optimizelyFactory.createInstance({
      //     projectConfigManager: getMockProjectConfigManager(),
      //     errorHandler: fakeErrorHandler,
      //     logger: silentLogger,
      //   });
      //   optlyInstance.onReady().catch(function() {});

      //   sinon.assert.calledOnce(LocalStoragePendingEventsDispatcher.prototype.sendPendingEvents);
      // });

      it('should not throw if the provided config is not valid', function() {
        configValidator.validate.throws(new Error(INVALID_CONFIG_OR_SOMETHING));
        assert.doesNotThrow(function() {
          var optlyInstance = optimizelyFactory.createInstance({
            projectConfigManager: getMockProjectConfigManager(),
            logger: silentLogger,
          });
        });
      });

      it('should create an instance of optimizely', function() {
        var optlyInstance = optimizelyFactory.createInstance({
          projectConfigManager: getMockProjectConfigManager(),
          errorHandler: fakeErrorHandler,
          eventDispatcher: fakeEventDispatcher,
          logger: silentLogger,
        });

        assert.instanceOf(optlyInstance, Optimizely);
        assert.equal(optlyInstance.clientVersion, '5.3.4');
      });

      it('should set the JavaScript client engine and version', function() {
        var optlyInstance = optimizelyFactory.createInstance({
          projectConfigManager: getMockProjectConfigManager(),
          errorHandler: fakeErrorHandler,
          eventDispatcher: fakeEventDispatcher,
          logger: silentLogger,
        });

        assert.equal('javascript-sdk', optlyInstance.clientEngine);
        assert.equal(packageJSON.version, optlyInstance.clientVersion);
      });

      it('should allow passing of "react-sdk" as the clientEngine', function() {
        var optlyInstance = optimizelyFactory.createInstance({
          clientEngine: 'react-sdk',
          projectConfigManager: getMockProjectConfigManager(),
          errorHandler: fakeErrorHandler,
          eventDispatcher: fakeEventDispatcher,
          logger: silentLogger,
        });
        assert.equal('react-sdk', optlyInstance.clientEngine);
      });

      it('should activate with provided event dispatcher', function() {
        var optlyInstance = optimizelyFactory.createInstance({
          projectConfigManager: getMockProjectConfigManager({
            initConfig: createProjectConfig(testData.getTestProjectConfig()),
          }),
          errorHandler: fakeErrorHandler,
          eventDispatcher: optimizelyFactory.eventDispatcher,
          logger: silentLogger,
        });
        var activate = optlyInstance.activate('testExperiment', 'testUser');
        assert.strictEqual(activate, 'control');
      });

      it('should be able to set and get a forced variation', function() {
        var optlyInstance = optimizelyFactory.createInstance({
          projectConfigManager: getMockProjectConfigManager({
            initConfig: createProjectConfig(testData.getTestProjectConfig()),
          }),
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
          projectConfigManager: getMockProjectConfigManager({
            initConfig: createProjectConfig(testData.getTestProjectConfig()),
          }),
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
          projectConfigManager: getMockProjectConfigManager({
            initConfig: createProjectConfig(testData.getTestProjectConfig()),
          }),
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
          projectConfigManager: getMockProjectConfigManager({
            initConfig: createProjectConfig(testData.getTestProjectConfig()),
          }),
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
          projectConfigManager: getMockProjectConfigManager({
            initConfig: createProjectConfig(testData.getTestProjectConfig()),
          }),
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
          projectConfigManager: getMockProjectConfigManager({
            initConfig: createProjectConfig(testData.getTestProjectConfig()),
          }),
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
          projectConfigManager: getMockProjectConfigManager({
            initConfig: createProjectConfig(testData.getTestProjectConfig()),
          }),
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
    });

    describe('ODP/ATS', () => {
      var sandbox = sinon.sandbox.create();

      const fakeOptimizely = {
        onReady: () => Promise.resolve({ success: true }),
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
        sandbox.stub(logger, 'warn');
        clock = sinon.useFakeTimers(new Date());
      });

      afterEach(function() {
        sandbox.restore();
        clock.restore();
        requestParams.clear();
      });


      // TODO: these tests should be elsewhere
      // it('should send an odp event when calling sendOdpEvent with valid parameters', async () => {
      //   const fakeEventManager = {
      //     updateSettings: sinon.spy(),
      //     start: sinon.spy(),
      //     stop: sinon.spy(),
      //     registerVuid: sinon.spy(),
      //     identifyUser: sinon.spy(),
      //     sendEvent: sinon.spy(),
      //     flush: sinon.spy(),
      //   };

      //   const config = createProjectConfig(testData.getOdpIntegratedConfigWithoutSegments());
      //   const projectConfigManager = getMockProjectConfigManager({
      //     initConfig: config,
      //     onRunning: Promise.resolve(),
      //   });

      //   const client = optimizelyFactory.createInstance({
      //     projectConfigManager,
      //     errorHandler: fakeErrorHandler,
      //     eventDispatcher: fakeEventDispatcher,
      //     eventBatchSize: null,
      //     logger,
      //     odpOptions: {
      //       eventManager: fakeEventManager,
      //     },
      //   });

      //   projectConfigManager.pushUpdate(config);
      //   await client.onReady();

      //   client.sendOdpEvent(ODP_EVENT_ACTION.INITIALIZED);

      //   sinon.assert.notCalled(logger.error);
      //   sinon.assert.called(fakeEventManager.sendEvent);
      // });


      // it('should log an error when attempting to send an odp event when odp is disabled', async () => {
      //   const config = createProjectConfig(testData.getTestProjectConfigWithFeatures());
      //   const projectConfigManager = getMockProjectConfigManager({
      //     initConfig: config,
      //     onRunning: Promise.resolve(),
      //   });

      //   const client = optimizelyFactory.createInstance({
      //     projectConfigManager,
      //     errorHandler: fakeErrorHandler,
      //     eventDispatcher: fakeEventDispatcher,
      //     eventBatchSize: null,
      //     logger,
      //     odpOptions: {
      //       disabled: true,
      //     },
      //   });

      //   projectConfigManager.pushUpdate(config);

      //   await client.onReady();

      //   assert.isUndefined(client.odpManager);
      //   sinon.assert.calledWith(logger.log, optimizelyFactory.enums.LOG_LEVEL.INFO, 'ODP Disabled.');

      //   client.sendOdpEvent(ODP_EVENT_ACTION.INITIALIZED);

      //   sinon.assert.calledWith(
      //     logger.error,
      //     optimizelyFactory.enums.ERROR_MESSAGES.ODP_EVENT_FAILED_ODP_MANAGER_MISSING
      //   );
      // });

      // it('should send odp client_initialized on client instantiation', async () => {
      //   const odpConfig = new OdpConfig('key', 'host', 'pixel', []);
      //   const apiManager = new BrowserOdpEventApiManager(mockRequestHandler, logger);
      //   sinon.spy(apiManager, 'sendEvents');
      //   const eventManager = new BrowserOdpEventManager({
      //     odpConfig,
      //     apiManager,
      //     logger,
      //   });
      //   const datafile = testData.getOdpIntegratedConfigWithSegments();
      //   const config = createProjectConfig(datafile);
      //   const projectConfigManager = getMockProjectConfigManager({
      //     initConfig: config,
      //     onRunning: Promise.resolve(),
      //   });

      //   const client = optimizelyFactory.createInstance({
      //     projectConfigManager,
      //     errorHandler: fakeErrorHandler,
      //     eventDispatcher: fakeEventDispatcher,
      //     eventBatchSize: null,
      //     logger,
      //     odpOptions: {
      //       odpConfig,
      //       eventManager,
      //     },
      //   });

      //   projectConfigManager.pushUpdate(config);
      //   await client.onReady();

      //   clock.tick(100);

      //   const [_, events] = apiManager.sendEvents.getCall(0).args;

      //   const [firstEvent] = events;
      //   assert.equal(firstEvent.action, 'client_initialized');
      //   assert.equal(firstEvent.type, 'fullstack');
      // });
    });
  });
});
