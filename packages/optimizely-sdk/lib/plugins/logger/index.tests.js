/**
 * Copyright 2016, Optimizely
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
var logger = require('./');
var chai = require('chai');
var enums = require('../../utils/enums');
var assert = chai.assert;
var expect = chai.expect;
var sinon = require('sinon');

var LOG_LEVEL = enums.LOG_LEVEL;
describe('lib/plugins/logger', function() {
  describe('APIs', function() {
    var defaultLogger;
    describe('createLogger', function() {
      it('should return an instance of the default logger', function() {
        defaultLogger = logger.createLogger({logLevel: LOG_LEVEL.NOTSET});
        assert.isObject(defaultLogger);
        expect(defaultLogger.logLevel).to.equal(LOG_LEVEL.NOTSET);
      });
    });

    describe('log', function() {
      beforeEach(function() {
        defaultLogger = logger.createLogger({logLevel: LOG_LEVEL.INFO});
        sinon.stub(defaultLogger, '__consoleLog');
      });

      it('should log a message at the threshold log level', function() {
        defaultLogger.log(LOG_LEVEL.INFO, 'message');
        sinon.assert.calledOnce(defaultLogger.__consoleLog);
        sinon.assert.calledWithExactly(
          defaultLogger.__consoleLog,
          LOG_LEVEL.INFO, [sinon.match(/.*INFO.*message.*/)]
        );
      });

      it('should log a message if its log level is higher than the threshold log level', function() {
        defaultLogger.log(LOG_LEVEL.WARNING, 'message');
        sinon.assert.calledOnce(defaultLogger.__consoleLog);
        sinon.assert.calledWithExactly(
          defaultLogger.__consoleLog,
          LOG_LEVEL.WARNING, [sinon.match(/.*WARNING.*message.*/)]
        );
      });

      it('should not log a message if its log level is lower than the threshold log level', function() {
        defaultLogger.log(LOG_LEVEL.DEBUG, 'message');
        sinon.assert.notCalled(defaultLogger.__consoleLog);
      });
    });

    describe('setLogLevel', function() {
      beforeEach(function() {
        defaultLogger = logger.createLogger({logLevel: LOG_LEVEL.NOTSET});
      });

      it('should set the log level to the specified log level', function() {
        expect(defaultLogger.logLevel).to.equal(LOG_LEVEL.NOTSET);

        defaultLogger.setLogLevel(LOG_LEVEL.DEBUG);
        expect(defaultLogger.logLevel).to.equal(LOG_LEVEL.DEBUG);

        defaultLogger.setLogLevel(LOG_LEVEL.INFO);
        expect(defaultLogger.logLevel).to.equal(LOG_LEVEL.INFO);
      });

      it('should set the log level to the ERROR when log level is not specified', function() {
        defaultLogger.setLogLevel();
        expect(defaultLogger.logLevel).to.equal(LOG_LEVEL.ERROR);
      });

      it('should set the log level to the ERROR when log level is not valid', function() {
        defaultLogger.setLogLevel(-123);
        expect(defaultLogger.logLevel).to.equal(LOG_LEVEL.ERROR);

        defaultLogger.setLogLevel(undefined);
        expect(defaultLogger.logLevel).to.equal(LOG_LEVEL.ERROR);

        defaultLogger.setLogLevel('abc');
        expect(defaultLogger.logLevel).to.equal(LOG_LEVEL.ERROR);
      });
    });
  });
});
