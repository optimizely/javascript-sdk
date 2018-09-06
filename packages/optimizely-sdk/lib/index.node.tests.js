/**
 * Copyright 2016-2018, Optimizely
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
var testData = require('./tests/test_data');
var sprintf = require('sprintf-js').sprintf;
var LOG_LEVEL = require('./utils/enums').LOG_LEVEL;
var ERROR_MESSAGES = require('./utils/enums').ERROR_MESSAGES;

var chai = require('chai');
var assert = chai.assert;
var sinon = require('sinon');

describe('optimizelyFactory', function() {
  describe('APIs', function() {
    describe('createInstance', function() {
      var fakeErrorHandler = { handleError: function() {}};
      var fakeEventDispatcher = { dispatchEvent: function() {}};
      var fakeLogger = { log: function() {}};

      beforeEach(function() {
        sinon.spy(console, 'error');
        sinon.stub(configValidator, 'validate');
      });

      afterEach(function() {
        console.error.restore();
        configValidator.validate.restore();
      });

      it('should not throw if the provided config is not valid and call console.error if logger is passed in', function() {
        configValidator.validate.throws(new Error('Invalid config or something'));
        assert.doesNotThrow(function() {
          optimizelyFactory.createInstance({
            datafile: {},
            logger: logger.createLogger({ logLevel: enums.LOG_LEVEL.INFO }),
          });
        });
        assert.isTrue(console.error.called);
      });

      it('should not throw if the provided config is not valid and call console.error if no-op logger is used', function() {
        configValidator.validate.throws(new Error('Invalid config or something'));
        assert.doesNotThrow(function() {
          optimizelyFactory.createInstance({
            datafile: {},
          });
        });
        assert.isTrue(console.error.called);
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

    describe('datafile validations', function() {
      var createdLogger = logger.createLogger({logLevel: LOG_LEVEL.INFO});

      beforeEach(function() {
        sinon.stub(createdLogger, 'log');
      });

      afterEach(function() {
        createdLogger.log.restore();
      });

      it('should log an error when datafile is not provided', function() {
        optimizelyFactory.createInstance({
          logger: createdLogger
        });

        sinon.assert.called(createdLogger.log);
        var logMessage = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage, sprintf(ERROR_MESSAGES.NO_DATAFILE_SPECIFIED, 'CONFIG_VALIDATOR'));
      });

      it('should log an error when datafile is malformed', function() {
        var invalidDatafileJSON = 'abc';
        optimizelyFactory.createInstance({
          datafile: invalidDatafileJSON,
          logger: createdLogger
        });

        sinon.assert.called(createdLogger.log);
        var logMessage = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage, sprintf(ERROR_MESSAGES.INVALID_DATAFILE_MALFORMED, 'CONFIG_VALIDATOR'));
      });

      it('should log an error if the datafile version is not supported', function() {
        var datafileWithInvalidVersion = JSON.stringify(testData.getUnsupportedVersionConfig());
        optimizelyFactory.createInstance({
          datafile: datafileWithInvalidVersion,
          logger: createdLogger
        });

        sinon.assert.called(createdLogger.log);
        var logMessage = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage, sprintf(ERROR_MESSAGES.INVALID_DATAFILE_VERSION, 'CONFIG_VALIDATOR', '5'));
      });

      it('should create optimizely instance with valid datafile', function() {
        var optlyInstance = optimizelyFactory.createInstance({
          datafile: JSON.stringify(testData.getUnsupportedVersionConfig()),
          logger: createdLogger
        });

        assert.instanceOf(optlyInstance, Optimizely);
      });
    });
  });
});
