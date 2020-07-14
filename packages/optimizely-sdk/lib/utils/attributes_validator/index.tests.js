/**
 * Copyright 2016, 2018-2020, Optimizely
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
import { sprintf } from '@optimizely/js-sdk-utils';

import attributesValidator from './';
import { ERROR_MESSAGES } from '../enums';

describe('lib/utils/attributes_validator', function() {
  describe('APIs', function() {
    describe('validate', function() {
      it('should validate the given attributes if attributes is an object', function() {
        assert.isTrue(attributesValidator.validate({ testAttribute: 'testValue' }));
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

    describe('compareVersion', function() {
      it('target string partially equal to conditions', function() {
        var target = '2.0';
        var version = '2.0.1';
        assert.equal(attributesValidator.compareVersion(target, version), 0);
      });

      it('target string less than conditions', function() {
        var target = '2.0.0';
        var version = '2.0.1';
        assert.equal(attributesValidator.compareVersion(target, version), -1);
      });

      it('target string great than conditions', function() {
        var target = '2.0.1';
        var version = '2.0.0';
        assert.equal(attributesValidator.compareVersion(target, version), 1);
      });

      it('target string exactly equal to conditions', function() {
        var target = '2.0.0';
        var version = '2.0.0';
        assert.equal(attributesValidator.compareVersion(target, version), 0);
      });

      it('target string exactly equal to conditions', function() {
        var target = '2.0.0';
        var version = '2.0.0';
        assert.equal(attributesValidator.compareVersion(target, version), 0);
      });

      it('target string major part is greater than conditions', function() {
        var target = '3.0';
        var version = '2.0.1';
        assert.equal(attributesValidator.compareVersion(target, version), 1);
      });

      it('target string major part is less than conditions', function() {
        var target = '2.0';
        var version = '3.0.1';
        assert.equal(attributesValidator.compareVersion(target, version), -1);
      });

      it('target string minor part is greater than conditions', function() {
        var target = '2.3';
        var version = '2.0.1';
        assert.equal(attributesValidator.compareVersion(target, version), 1);
      });

      it('target string minor part is less than conditions', function() {
        var target = '2.0';
        var version = '2.9.1';
        assert.equal(attributesValidator.compareVersion(target, version), -1);
      });

      it('target string minor part is equal to conditions', function() {
        var target = '2.9';
        var version = '2.9.1';
        assert.equal(attributesValidator.compareVersion(target, version), 0);
      });

      it('target string patch is greater to conditions', function() {
        var target = '2.3.5';
        var version = '2.3.1';
        assert.equal(attributesValidator.compareVersion(target, version), 1);
      });

      it('target string patch is less to conditions', function() {
        var target = '2.9.0';
        var version = '2.9.1';
        assert.equal(attributesValidator.compareVersion(target, version), -1);
      });

      it('target string patch is equal to conditions', function() {
        var target = '2.9.9';
        var version = '2.9.9';
        assert.equal(attributesValidator.compareVersion(target, version), 0);
      });

      it('target string patch with beta tag is equal to conditions', function() {
        var target = '2.9.9-beta';
        var version = '2.9.9-beta';
        assert.equal(attributesValidator.compareVersion(target, version), 0);
      });

      it('target string patch with beta tag with different delimiter is equal to conditions', function() {
        var target = '2.9.9-beta';
        var version = '2.9.9.beta';
        assert.equal(attributesValidator.compareVersion(target, version), 0);
      });

      it('conditions string partially equal to target', function() {
        var target = '2.9.8';
        var version = '2.9';
        assert.equal(attributesValidator.compareVersion(target, version), 1);
      });
    });
  });
});
