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
var logger = require('./plugins/logger');
var Optimizely = require('./optimizely');
var optimizelyFactory = require('./index.node');

var chai = require('chai');
var assert = chai.assert;
var sinon = require('sinon');

describe('optimizelyFactory', function() {
  describe('APIs', function() {
    describe('createInstance', function() {
      var fakeErrorHandler = { handleError: function() {}};
      var fakeEventDispatcher = { dispatchEvent: function() {}};
      var fakeLogger;

      beforeEach(function() {
        sinon.stub(configValidator, 'validate');

        fakeLogger = { log: sinon.spy() };
        sinon.stub(logger, 'createLogger').returns(fakeLogger);
      });

      afterEach(function() {
        logger.createLogger.restore();
        configValidator.validate.restore();
      });

      context('config fails validation', function() {
        beforeEach(function() {
          configValidator.validate.throws(new Error('Invalid config or something'));
        });

        it('catches internal errors', function() {
          assert.doesNotThrow(function() {
            optimizelyFactory.createInstance({});
          });
        });

        context('a logger was supplied', function() {
          it('an error message is submitted to the supplied logger', function() {
            var customLogger = { log: sinon.spy() };

            optimizelyFactory.createInstance({
              datafile: {},
              logger: customLogger,
            });

            sinon.assert.notCalled(fakeLogger.log);
            // Once for config failing validation, and again within the `Optimizely`
            // constructor for not supplying a valid datafile.
            sinon.assert.calledTwice(customLogger.log);
            sinon.assert.alwaysCalledWith(customLogger.log, enums.LOG_LEVEL.ERROR);
          });
        });

        context('a logger was not supplied', function() {
          it('an error message is submitted to a simple logger', function() {
            optimizelyFactory.createInstance({});

            // Only the validation error is logged.
            // The `Optimizely` constructor error is submitted to a NoOpLogger.
            sinon.assert.calledOnce(fakeLogger.log);
            sinon.assert.calledWith(fakeLogger.log, enums.LOG_LEVEL.ERROR);
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
    });
  });
});
