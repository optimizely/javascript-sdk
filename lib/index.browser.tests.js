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
import { assert } from 'chai';
import sinon from 'sinon';
import Optimizely from './optimizely';
import testData from './tests/test_data';
import packageJSON from '../package.json';
import optimizelyFactory from './index.browser';
import configValidator from './utils/config_validator';
import { getMockProjectConfigManager } from './tests/mock/mock_project_config_manager';
import { createProjectConfig } from './project_config/project_config';

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
    console.error("Unable to overwrite global.window");
  }
}

const pause = timeoutMilliseconds => {
  return new Promise(resolve => setTimeout(resolve, timeoutMilliseconds));
};

var getLogger = () => ({
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  child: () => getLogger(),
})

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
    // it('should expose logger, errorHandler, eventDispatcher and enums', function() {
    //   assert.isDefined(optimizelyFactory.logging);
    //   assert.isDefined(optimizelyFactory.logging.createLogger);
    //   assert.isDefined(optimizelyFactory.logging.createNoOpLogger);
    //   assert.isDefined(optimizelyFactory.errorHandler);
    //   assert.isDefined(optimizelyFactory.eventDispatcher);
    //   assert.isDefined(optimizelyFactory.enums);
    // });

    describe('createInstance', function() {
      var fakeErrorHandler = { handleError: function() {} };
      var fakeEventDispatcher = { dispatchEvent: function() {} };
      var mockLogger;

      beforeEach(function() {
        mockLogger = getLogger();
        sinon.stub(mockLogger, 'error');

        sinon.stub(configValidator, 'validate');
        global.XMLHttpRequest = sinon.useFakeXMLHttpRequest();
      });

      afterEach(function() {
        optimizelyFactory.__internalResetRetryState();
        mockLogger.error.restore();
        configValidator.validate.restore();
        delete global.XMLHttpRequest;
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
        configValidator.validate.throws(new Error('INVALID_CONFIG_OR_SOMETHING'));
        assert.doesNotThrow(function() {
          var optlyInstance = optimizelyFactory.createInstance({
            projectConfigManager: getMockProjectConfigManager(),
            logger: mockLogger,
          });
        });
      });

      it('should create an instance of optimizely', function() {
        var optlyInstance = optimizelyFactory.createInstance({
          projectConfigManager: getMockProjectConfigManager(),
          errorHandler: fakeErrorHandler,
          eventDispatcher: fakeEventDispatcher,
          logger: mockLogger,
        });

        assert.instanceOf(optlyInstance, Optimizely);
        assert.equal(optlyInstance.clientVersion, '5.3.4');
      });

      it('should set the JavaScript client engine and version', function() {
        var optlyInstance = optimizelyFactory.createInstance({
          projectConfigManager: getMockProjectConfigManager(),
          errorHandler: fakeErrorHandler,
          eventDispatcher: fakeEventDispatcher,
          logger: mockLogger,
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
          logger: mockLogger,
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
          logger: mockLogger,
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
          logger: mockLogger,
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
          logger: mockLogger,
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
          logger: mockLogger,
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
          logger: mockLogger,
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
          logger: mockLogger,
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
          logger: mockLogger,
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
          logger: mockLogger,
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
    });
  });
});
