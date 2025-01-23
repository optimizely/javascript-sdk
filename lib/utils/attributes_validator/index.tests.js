/**
 * Copyright 2016, 2018-2020, 2022, Optimizely
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
import { assert } from 'chai';
import { sprintf } from '../../utils/fns';

import * as attributesValidator from './';
import { INVALID_ATTRIBUTES, UNDEFINED_ATTRIBUTE } from 'error_message';

describe('lib/utils/attributes_validator', function() {
  describe('APIs', function() {
    describe('validate', function() {
      it('should validate the given attributes if attributes is an object', function() {
        assert.isTrue(attributesValidator.validate({ testAttribute: 'testValue' }));
      });

      it('should throw an error if attributes is an array', function() {
        var attributesArray = ['notGonnaWork'];
        const ex = assert.throws(function() {
          attributesValidator.validate(attributesArray);
        });
        assert.equal(ex.baseMessage, INVALID_ATTRIBUTES);
      });

      it('should throw an error if attributes is null', function() {
        const ex = assert.throws(function() {
          attributesValidator.validate(null);
        });
        assert.equal(ex.baseMessage, INVALID_ATTRIBUTES);
      });

      it('should throw an error if attributes is a function', function() {
        function invalidInput() {
          console.log('This is an invalid input!');
        }
        const ex = assert.throws(function() {
          attributesValidator.validate(invalidInput);
        });
        assert.equal(ex.baseMessage, INVALID_ATTRIBUTES);
      });

      it('should throw an error if attributes contains a key with an undefined value', function() {
        var attributeKey = 'testAttribute';
        var attributes = {};
        attributes[attributeKey] = undefined;

        const ex = assert.throws(function() {
          attributesValidator.validate(attributes);
        });
        assert.equal(ex.baseMessage, UNDEFINED_ATTRIBUTE);
        assert.deepEqual(ex.params, [attributeKey]);
      });
    });

    describe('isAttributeValid', function() {
      it('isAttributeValid returns true for valid values', function() {
        var userAttributes = {
          browser_type: 'Chrome',
          is_firefox: false,
          num_users: 10,
          pi_value: 3.14,
          '': 'javascript',
        };

        Object.keys(userAttributes).forEach(function(key) {
          var value = userAttributes[key];
          assert.isTrue(attributesValidator.isAttributeValid(key, value));
        });
      });

      it('isAttributeValid returns false for invalid values', function() {
        var userAttributes = {
          null: null,
          objects: { a: 'b' },
          array: [1, 2, 3],
          infinity: Infinity,
          negativeInfinity: -Infinity,
          NaN: NaN,
          outOfBound: Math.pow(2, 53) + 2,
        };

        Object.keys(userAttributes).forEach(function(key) {
          var value = userAttributes[key];
          assert.isFalse(attributesValidator.isAttributeValid(key, value));
        });
      });
    });
  });
});
