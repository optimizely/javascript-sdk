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
var logging = require('@optimizely/js-sdk-logging');
var configValidator = require('./utils/config_validator');
var enums = require('./utils/enums');
var loggerPlugin = require('./plugins/logger');
var Optimizely = require('./optimizely');
var optimizelyFactory = require('./index.node');

var chai = require('chai');
var assert = chai.assert;
var sinon = require('sinon');

describe('optimizelyFactory', function() {
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
      var fakeLogger;

      beforeEach(function() {
        fakeLogger = { log: sinon.spy(), setLogLevel: sinon.spy() };
        sinon.stub(loggerPlugin, 'createLogger').returns(fakeLogger);
        sinon.stub(configValidator, 'validate');
        sinon.stub(console, 'error');
      });

      afterEach(function() {
        loggerPlugin.createLogger.restore();
        configValidator.validate.restore();
        console.error.restore();
      });

      it('should not throw if the provided config is not valid and log an error if logger is passed in', function() {
        configValidator.validate.throws(new Error('Invalid config or something'));
        var localLogger = loggerPlugin.createLogger({ logLevel: enums.LOG_LEVEL.INFO });
        assert.doesNotThrow(function() {
          optimizelyFactory.createInstance({
            datafile: {},
            logger: localLogger,
          });
        });
        sinon.assert.calledWith(localLogger.log, enums.LOG_LEVEL.ERROR);
      });

      it('should not throw if the provided config is not valid and log an error if no logger is provided', function() {
        configValidator.validate.throws(new Error('Invalid config or something'));
        assert.doesNotThrow(function() {
          optimizelyFactory.createInstance({
            datafile: {},
          });
        });
        sinon.assert.calledOnce(console.error);
      });

      it('should create an instance of optimizely', function() {
        var optlyInstance = optimizelyFactory.createInstance({
          datafile: {},
          errorHandler: fakeErrorHandler,
          eventDispatcher: fakeEventDispatcher,
          logger: fakeLogger,
        });

        assert.instanceOf(optlyInstance, Optimizely);
        assert.equal(optlyInstance.clientVersion, '3.1.0-beta1');
      });
    });
  });
});
