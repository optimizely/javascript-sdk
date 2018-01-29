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
var chai = require('chai');
var assert = chai.assert;
var configValidator = require('./');
var sprintf = require('sprintf');

var ERROR_MESSAGES = require('../enums').ERROR_MESSAGES;

describe('lib/utils/config_validator', function() {
  describe('APIs', function() {
    describe('validate', function() {
      it('should complain if the provided error handler is invalid', function() {
        assert.throws(function() {
          configValidator.validate({
            errorHandler: {},
          });
        }, sprintf(ERROR_MESSAGES.INVALID_ERROR_HANDLER, 'CONFIG_VALIDATOR'));
      });

      it('should complain if the provided event dispatcher is invalid', function() {
        assert.throws(function() {
          configValidator.validate({
            eventDispatcher: {},
          });
        }, sprintf(ERROR_MESSAGES.INVALID_EVENT_DISPATCHER, 'CONFIG_VALIDATOR'));
      });

      it('should complain if the provided logger is invalid', function() {
        assert.throws(function() {
          configValidator.validate({
            logger: {},
          });
        }, sprintf(ERROR_MESSAGES.INVALID_LOGGER, 'CONFIG_VALIDATOR'));
      });
    });
  });
});
