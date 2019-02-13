/**
 * Copyright 2018, Optimizely
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
var configValidator = require('./utils/config_validator');
var enums = require('./utils/enums');
var logger = require('./plugins/logger');
var Optimizely = require('./optimizely');
var packageJSON = require('../package.json');
var eventDispatcher = require('./plugins/event_dispatcher/index.browser');
var testData = require('./tests/test_data');

var chai = require('chai');
var assert = chai.assert;
var find = require('lodash/find');
var sinon = require('sinon');

describe('javascript-sdk', function() {
  describe('APIs', function() {
    var xhr;
    var requests;
    describe('createInstance', function() {
      var fakeErrorHandler = { handleError: function() {}};
      var fakeEventDispatcher = { dispatchEvent: function() {}};
      var silentLogger;

      beforeEach(function() {
        silentLogger = logger.createLogger({
          logLevel: enums.LOG_LEVEL.INFO,
          logToConsole: false,
        });
        sinon.spy(console, 'error');
        sinon.stub(configValidator, 'validate');

        xhr = sinon.useFakeXMLHttpRequest();
        global.XMLHttpRequest = xhr;
        requests = [];
        xhr.onCreate = function (req) {
            requests.push(req);
        };
      });

      afterEach(function() {
        console.error.restore();
        configValidator.validate.restore();
        xhr.restore();
      });

      it('should not throw if the provided config is not valid', function() {
        configValidator.validate.throws(new Error('Invalid config or something'));
        assert.doesNotThrow(function() {
          window.optimizelySdk.createInstance({
            datafile: {},
            logger: silentLogger,
          });
        });
      });

      it('should set the JavaScript client engine and version', function() {
        var optlyInstance = window.optimizelySdk.createInstance({
          datafile: {},
          errorHandler: fakeErrorHandler,
          eventDispatcher: fakeEventDispatcher,
          logger: silentLogger,
        });
        assert.equal('javascript-sdk', optlyInstance.clientEngine);
        assert.equal(packageJSON.version, optlyInstance.clientVersion);
      });

      it('should activate with provided event dispatcher', function() {
        var optlyInstance = window.optimizelySdk.createInstance({
          datafile: testData.getTestProjectConfig(),
          errorHandler: fakeErrorHandler,
          eventDispatcher: eventDispatcher,
          logger: silentLogger,
        });
        var activate = optlyInstance.activate('testExperiment', 'testUser');
        assert.strictEqual(activate, 'control');
      });

      it('should be able to set and get a forced variation', function() {
        var optlyInstance = window.optimizelySdk.createInstance({
          datafile: testData.getTestProjectConfig(),
          errorHandler: fakeErrorHandler,
          eventDispatcher: eventDispatcher,
          logger: silentLogger,
        });

        var didSetVariation = optlyInstance.setForcedVariation('testExperiment', 'testUser', 'control');
        assert.strictEqual(didSetVariation, true);

        var variation = optlyInstance.getForcedVariation('testExperiment', 'testUser');
        assert.strictEqual(variation, 'control');
      });

      it('should be able to set and unset a forced variation', function() {
        var optlyInstance = window.optimizelySdk.createInstance({
          datafile: testData.getTestProjectConfig(),
          errorHandler: fakeErrorHandler,
          eventDispatcher: eventDispatcher,
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
        var optlyInstance = window.optimizelySdk.createInstance({
          datafile: testData.getTestProjectConfig(),
          errorHandler: fakeErrorHandler,
          eventDispatcher: eventDispatcher,
          logger: silentLogger,
        });

        var didSetVariation = optlyInstance.setForcedVariation('testExperiment', 'testUser', 'control');
        assert.strictEqual(didSetVariation, true);

        var didSetVariation2 = optlyInstance.setForcedVariation('testExperimentLaunched', 'testUser', 'controlLaunched');
        assert.strictEqual(didSetVariation2, true);


        var variation = optlyInstance.getForcedVariation('testExperiment', 'testUser');
        assert.strictEqual(variation, 'control');

        var variation2 = optlyInstance.getForcedVariation('testExperimentLaunched', 'testUser');
        assert.strictEqual(variation2, 'controlLaunched');
      });

      it('should be able to set multiple experiments for one user, and unset one', function() {
        var optlyInstance = window.optimizelySdk.createInstance({
          datafile: testData.getTestProjectConfig(),
          errorHandler: fakeErrorHandler,
          eventDispatcher: eventDispatcher,
          logger: silentLogger,
        });

        var didSetVariation = optlyInstance.setForcedVariation('testExperiment', 'testUser', 'control');
        assert.strictEqual(didSetVariation, true);

        var didSetVariation2 = optlyInstance.setForcedVariation('testExperimentLaunched', 'testUser', 'controlLaunched');
        assert.strictEqual(didSetVariation2, true);

        var didSetVariation2 = optlyInstance.setForcedVariation('testExperimentLaunched', 'testUser', null);
        assert.strictEqual(didSetVariation2, true);

        var variation = optlyInstance.getForcedVariation('testExperiment', 'testUser');
        assert.strictEqual(variation, 'control');

        var variation2 = optlyInstance.getForcedVariation('testExperimentLaunched', 'testUser');
        assert.strictEqual(variation2, null);
      });

      it('should be able to set multiple experiments for one user, and reset one', function() {
        var optlyInstance = window.optimizelySdk.createInstance({
          datafile: testData.getTestProjectConfig(),
          errorHandler: fakeErrorHandler,
          eventDispatcher: eventDispatcher,
          logger: silentLogger,
        });

        var didSetVariation = optlyInstance.setForcedVariation('testExperiment', 'testUser', 'control');
        assert.strictEqual(didSetVariation, true);

        var didSetVariation2 = optlyInstance.setForcedVariation('testExperimentLaunched', 'testUser', 'controlLaunched');
        assert.strictEqual(didSetVariation2, true);

        var didSetVariation2 = optlyInstance.setForcedVariation('testExperimentLaunched', 'testUser', 'variationLaunched');
        assert.strictEqual(didSetVariation2, true);

        var variation = optlyInstance.getForcedVariation('testExperiment', 'testUser');
        assert.strictEqual(variation, 'control');

        var variation2 = optlyInstance.getForcedVariation('testExperimentLaunched', 'testUser');
        assert.strictEqual(variation2, 'variationLaunched');
      });

      it('should override bucketing when setForcedVariation is called', function() {
        var optlyInstance = window.optimizelySdk.createInstance({
          datafile: testData.getTestProjectConfig(),
          errorHandler: fakeErrorHandler,
          eventDispatcher: eventDispatcher,
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
        var optlyInstance = window.optimizelySdk.createInstance({
          datafile: testData.getTestProjectConfig(),
          errorHandler: fakeErrorHandler,
          eventDispatcher: eventDispatcher,
          logger: silentLogger,
        });

        var didSetVariation = optlyInstance.setForcedVariation('testExperimentNotRunning', 'testUser', 'controlNotRunning');
        assert.strictEqual(didSetVariation, true);

        var variation = optlyInstance.getVariation('testExperimentNotRunning', 'testUser');
        assert.strictEqual(variation, null);
      });

      describe('automatically created logger instances', function() {
        beforeEach(function() {
          sinon.spy(console, 'log');
          sinon.spy(console, 'info');
          sinon.spy(console, 'warn');
        });

        afterEach(function() {
          console.log.restore();
          console.info.restore();
          console.warn.restore();
        });

        it('should instantiate the logger with a custom logLevel when provided', function() {
          // checking that INFO logs do not log for a logLevel of ERROR
          var optlyInstance = window.optimizelySdk.createInstance({
            datafile: testData.getTestProjectConfig(),
            logLevel: enums.LOG_LEVEL.ERROR,
            skipJSONValidation: true
          });
          assert.strictEqual(console.log.getCalls().length, 0)

          // checking that ERROR logs do log for a logLevel of ERROR
          var optlyInstanceInvalid = window.optimizelySdk.createInstance({
            datafile: {},
            logLevel: enums.LOG_LEVEL.ERROR
          });
          optlyInstance.activate('testExperiment', 'testUser')
          assert.strictEqual(console.error.getCalls().length, 1)
        });

        it('should default to INFO when no logLevel is provided', function() {
          // checking that INFO logs log for an unspecified logLevel
          var optlyInstance = window.optimizelySdk.createInstance({
            datafile: testData.getTestProjectConfig(),
            skipJSONValidation: true
          });
          assert.strictEqual(console.info.getCalls().length, 1);
          call = console.info.getCalls()[0];
          assert.strictEqual(call.args.length, 1);
          assert(call.args[0].indexOf('OPTIMIZELY: Skipping JSON schema validation.') > -1);
        });
      });
    });
  });
});
