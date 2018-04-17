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
var userIdValidator = require('./');
var enums = require('../enums');
var sprintf = require('sprintf');

var ERROR_MESSAGES = enums.ERROR_MESSAGES;

describe('lib/utils/user_id_validator', function() {
  describe('APIs', function() {
    describe('validate', function() {
      it('should validate the given userId if userId is a valid string', function() {
        assert.isTrue(userIdValidator.validate('validUserId'));
      });

      it('should throw an error if userId is null', function() {
        assert.throws(function() {
          userIdValidator.validate(null);
        }, sprintf(ERROR_MESSAGES.INVALID_USER_ID, 'USER_ID_VALIDATOR'));
      });

      it('should throw an error if userId is undefined', function() {
        assert.throws(function() {
          userIdValidator.validate(undefined);
        }, sprintf(ERROR_MESSAGES.INVALID_USER_ID, 'USER_ID_VALIDATOR'));
      });

      it('should throw an error if userId is an empty string', function() {
        assert.throws(function() {
          userIdValidator.validate('');
        }, sprintf(ERROR_MESSAGES.INVALID_USER_ID, 'USER_ID_VALIDATOR'));
      });

      it('should throw an error if userId is int', function() {
        assert.throws(function() {
          userIdValidator.validate(3);
        }, sprintf(ERROR_MESSAGES.INVALID_USER_ID, 'USER_ID_VALIDATOR'));
      });

      it('should throw an error if userId is boolean', function() {
        assert.throws(function() {
          userIdValidator.validate(true);
        }, sprintf(ERROR_MESSAGES.INVALID_USER_ID, 'USER_ID_VALIDATOR'));
      });

      it('should throw an error if userId is array', function() {
        assert.throws(function() {
          userIdValidator.validate([]);
        }, sprintf(ERROR_MESSAGES.INVALID_USER_ID, 'USER_ID_VALIDATOR'));
      });
    });
  });
});
