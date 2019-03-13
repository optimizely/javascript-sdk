/**
 * Copyright 2016, 2018-2019, Optimizely
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
var sprintf = require('@optimizely/js-sdk-utils').sprintf;
var attributesValidator = require('./');
var fns = require('./../fns/');

var ERROR_MESSAGES = require('../enums').ERROR_MESSAGES;

describe('lib/utils/attributes_validator', function() {
  describe('APIs', function() {
    describe('validate', function() {
      it('should validate the given attributes if attributes is an object', function() {
        assert.isTrue(attributesValidator.validate({testAttribute: 'testValue'}));
      });

      it('should throw an error if attributes is an array', function() {
        var attributesArray = ['notGonnaWork'];
        assert.throws(function() {
          attributesValidator.validate(attributesArray);
        }, sprintf(ERROR_MESSAGES.INVALID_ATTRIBUTES, 'ATTRIBUTES_VALIDATOR'));
      });

      it('should throw an error if attributes is null', function() {
        assert.throws(function() {
          attributesValidator.validate(null);
        }, sprintf(ERROR_MESSAGES.INVALID_ATTRIBUTES, 'ATTRIBUTES_VALIDATOR'));
      });

      it('should throw an error if attributes is a function', function() {
        function invalidInput() {
          console.log('This is an invalid input!');
        }
        assert.throws(function() {
          attributesValidator.validate(invalidInput);
        }, sprintf(ERROR_MESSAGES.INVALID_ATTRIBUTES, 'ATTRIBUTES_VALIDATOR'));
      });


      it('should throw an error if attributes contains a key with an undefined value', function() {
        var attributeKey = 'testAttribute';
        var attributes = {};
        attributes[attributeKey] = undefined;

        assert.throws(function() {
          attributesValidator.validate(attributes);
        }, sprintf(ERROR_MESSAGES.UNDEFINED_ATTRIBUTE, 'ATTRIBUTES_VALIDATOR', attributeKey));
      });
    });

    describe('isAttributeValid', function() {
      it('isAttributeValid returns true for valid values', function() {
        var userAttributes = {
          'browser_type': 'Chrome',
          'is_firefox': false,
          'num_users': 10,
          'pi_value': 3.14,
          '': 'javascript',
        };

        fns.forOwn(userAttributes, function(value, key) {
          assert.isTrue(attributesValidator.isAttributeValid(key, value));
        });
      });

      it('isAttributeValid returns false for invalid values', function() {
        var userAttributes = {
          'null': null,
          'objects': {a: 'b'},
          'array': [1, 2, 3],
          'infinity': Infinity,
          'negativeInfinity': -Infinity,
          'NaN': NaN,
          'outOfBound': Math.pow(2, 53) + 2,
        };

        fns.forOwn(userAttributes, function(value, key) {
          assert.isFalse(attributesValidator.isAttributeValid(key, value));
        });
      });
    });
  });
});
