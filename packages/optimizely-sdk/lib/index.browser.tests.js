/**
 * Copyright 2016-2017, Optimizely
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
var Optimizely = require('./optimizely');
var optimizelyFactory = require('./index.browser');
var packageJSON = require('../package.json');
var eventDispatcher = require('./plugins/event_dispatcher/index.browser');
var testData = require('./tests/test_data');

var chai = require('chai');
var assert = chai.assert;
var sinon = require('sinon');

describe('javascript-sdk', function() {
  describe('APIs', function() {
    var xhr;
    var requests;
    describe('createInstance', function() {
      var fakeErrorHandler = { handleError: function() {}};
      var fakeEventDispatcher = { dispatchEvent: function() {}};
      var fakeLogger = { log: function() {}};

      beforeEach(function() {
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
          optimizelyFactory.createInstance({
            datafile: {},
          });
        });
      });

      it('should create an instance of optimizely', function() {
        var optlyInstance = optimizelyFactory.createInstance({
          datafile: {},
          errorHandler: fakeErrorHandler,
          eventDispatcher: fakeEventDispatcher,
          logger: fakeLogger,
        });

        assert.instanceOf(optlyInstance, Optimizely);
      });

      it('should set the JavaScript client engine and version', function() {
        var optlyInstance = optimizelyFactory.createInstance({
          datafile: {},
          errorHandler: fakeErrorHandler,
          eventDispatcher: fakeEventDispatcher,
          logger: fakeLogger,
        });
        assert.equal('javascript-sdk', optlyInstance.clientEngine);
        assert.equal(packageJSON.version, optlyInstance.clientVersion);
      });

      it('should instantiate the logger with a custom logLevel when provided', function() {
        var optlyInstance = optimizelyFactory.createInstance({
          datafile: {},
          logLevel: enums.LOG_LEVEL.ERROR,
        });

        assert.equal(optlyInstance.logger.logLevel, enums.LOG_LEVEL.ERROR);
      });

      it('should default to INFO when no logLevel is provided', function() {
        var optlyInstance = optimizelyFactory.createInstance({
          datafile: {},
        });

        assert.equal(optlyInstance.logger.logLevel, enums.LOG_LEVEL.INFO);
      });

      it('should activate with provided event dispatcher', function(done) {
        var optlyInstance = optimizelyFactory.createInstance({
          datafile: testData.getTestProjectConfig(),
          errorHandler: fakeErrorHandler,
          eventDispatcher: eventDispatcher,
          logger: fakeLogger,
        });
        var activate = optlyInstance.activate('testExperiment', 'testUser');
        assert.strictEqual(activate, 'control');
        done();
      });

      it('should be able to set and get a forced variation', function(done) {
        var optlyInstance = optimizelyFactory.createInstance({
          datafile: testData.getTestProjectConfig(),
          errorHandler: fakeErrorHandler,
          eventDispatcher: eventDispatcher,
          logger: fakeLogger,
        });

        var didSetVariation = optlyInstance.setForcedVariation('testExperiment', 'testUser', 'control');
        assert.strictEqual(didSetVariation, true);

        var variation = optlyInstance.getForcedVariation('testExperiment', 'testUser');
        assert.strictEqual(variation, 'control');
        done();
      });

      it('should be able to set and unset a forced variation', function(done) {
        var optlyInstance = optimizelyFactory.createInstance({
          datafile: testData.getTestProjectConfig(),
          errorHandler: fakeErrorHandler,
          eventDispatcher: eventDispatcher,
          logger: fakeLogger,
        });

        var didSetVariation = optlyInstance.setForcedVariation('testExperiment', 'testUser', 'control');
        assert.strictEqual(didSetVariation, true);

        var variation = optlyInstance.getForcedVariation('testExperiment', 'testUser');
        assert.strictEqual(variation, 'control');

        var didSetVariation2 = optlyInstance.setForcedVariation('testExperiment', 'testUser', null);
        assert.strictEqual(didSetVariation2, true);

        var variation2 = optlyInstance.getForcedVariation('testExperiment', 'testUser');
        assert.strictEqual(variation2, null);
        done();
      });

      it('should be able to set multiple experiments for one user', function(done) {
        var optlyInstance = optimizelyFactory.createInstance({
          datafile: testData.getTestProjectConfig(),
          errorHandler: fakeErrorHandler,
          eventDispatcher: eventDispatcher,
          logger: fakeLogger,
        });

        var didSetVariation = optlyInstance.setForcedVariation('testExperiment', 'testUser', 'control');
        assert.strictEqual(didSetVariation, true);

        var didSetVariation2 = optlyInstance.setForcedVariation('testExperimentLaunched', 'testUser', 'controlLaunched');
        assert.strictEqual(didSetVariation2, true);


        var variation = optlyInstance.getForcedVariation('testExperiment', 'testUser');
        assert.strictEqual(variation, 'control');

        var variation2 = optlyInstance.getForcedVariation('testExperimentLaunched', 'testUser');
        assert.strictEqual(variation2, 'controlLaunched');
        done();
      });

      it('should be able to set multiple experiments for one user, and unset one', function(done) {
        var optlyInstance = optimizelyFactory.createInstance({
          datafile: testData.getTestProjectConfig(),
          errorHandler: fakeErrorHandler,
          eventDispatcher: eventDispatcher,
          logger: fakeLogger,
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
        done();
      });

      it('should be able to set multiple experiments for one user, and reset one', function(done) {
        var optlyInstance = optimizelyFactory.createInstance({
          datafile: testData.getTestProjectConfig(),
          errorHandler: fakeErrorHandler,
          eventDispatcher: eventDispatcher,
          logger: fakeLogger,
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
        done();
      });

      it('should override bucketing when setForcedVariation is called', function(done) {
        var optlyInstance = optimizelyFactory.createInstance({
          datafile: testData.getTestProjectConfig(),
          errorHandler: fakeErrorHandler,
          eventDispatcher: eventDispatcher,
          logger: fakeLogger,
        });

        var didSetVariation = optlyInstance.setForcedVariation('testExperiment', 'testUser', 'control');
        assert.strictEqual(didSetVariation, true);

        var variation = optlyInstance.getVariation('testExperiment', 'testUser');
        assert.strictEqual(variation, 'control');

        var didSetVariation2 = optlyInstance.setForcedVariation('testExperiment', 'testUser', 'variation');
        assert.strictEqual(didSetVariation2, true);

        var variation = optlyInstance.getVariation('testExperiment', 'testUser');
        assert.strictEqual(variation, 'variation');
        done();
      });

      it('should override bucketing when setForcedVariation is called for a not running experiment', function(done) {
        var optlyInstance = optimizelyFactory.createInstance({
          datafile: testData.getTestProjectConfig(),
          errorHandler: fakeErrorHandler,
          eventDispatcher: eventDispatcher,
          logger: fakeLogger,
        });

        var didSetVariation = optlyInstance.setForcedVariation('testExperimentNotRunning', 'testUser', 'controlNotRunning');
        assert.strictEqual(didSetVariation, true);

        var variation = optlyInstance.getVariation('testExperimentNotRunning', 'testUser');
        assert.strictEqual(variation, null);

        done();
      });
    });
  });
});
