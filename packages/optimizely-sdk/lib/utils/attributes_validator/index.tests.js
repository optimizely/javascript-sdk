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

import * as attributesValidator from './';
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
      it('should return 0 if user version and target version are equal', function() {
        var versions = [
          ['2.0.1', '2.0.1'],
          ['2.9.9-beta', '2.9.9-beta'],
          ['2.1', '2.1.0'],
          ['2', '2.12'],
          ['2.9', '2.9.1']
        ];
        for (let [targetVersion, userVersion] of versions) {
          var result = attributesValidator.compareVersion(targetVersion, userVersion)
          assert.equal(result, 0, `Got result ${result}. Failed for target version: ${targetVersion} and user version: ${userVersion}`);
        }
      });

      it('should return 1 target version is greater than user version are equal', function() {
        var versions = [
          ['2.0.0', '2.0.1'],
          ['2.0', '3.0.1'],
          ['2.1.2-beta', '2.1.2-release'],
          ['2.1.3-beta1', '2.1.3-beta2'],
          ['2.9.9-beta', '2.9.9'],
          ['2.9.9+beta', '2.9.9'],
          ['3.7.0-prerelease+build', '3.7.0-prerelease+rc'],
          ['2.2.3-beta-beta1', '2.2.3-beta-beta2'],
          ['2.2.3-beta+beta1', '2.2.3-beta+beta2'],
          ['2.2.3+beta2-beta1', '2.2.3+beta3-beta2']
        ];
        for (let [targetVersion, userVersion] of versions) {
          var result = attributesValidator.compareVersion(targetVersion, userVersion)
          assert.equal(result, 1, `Got result ${result}. Failed for target version: ${targetVersion} and user version: ${userVersion}`);
        }
      });

      it('should return 1 target version is greater than user version are equal', function() {
        var versions = [
          ['2.0.1', '2.0.0'],
          ['3.0', '2.0.1'],
          ['2.3', '2.0.1'],
          ['2.3.5', '2.3.1'],
          ['2.9.8', '2.9'],
          ['2.1.2-release', '2.1.2-beta'],
          ['2.1.3', '2.1.3-beta'],
          ['2.1.3', '2.1.3+beta'],
          ['2.9.9+beta', '2.9.9-beta'],
          ['3.7.0+build3.7.0-prerelease+build', '3.7.0-prerelease'],
          ['2.1.3-beta-beta2', '2.1.3-beta'],
          ['2.1.3-beta1+beta3', '2.1.3-beta1+beta2']
      ];
        for (let [targetVersion, userVersion] of versions) {
          var result = attributesValidator.compareVersion(targetVersion, userVersion)
          assert.equal(result, -1, `Got result ${result}. Failed for target version: ${targetVersion} and user version: ${userVersion}`);
        }
      });

      it('should return 1 target version is greater than user version are equal', function() {
        var versions = [
          ['2.0.0', '2.0.0'],
          ['3.0', '2.0.1'],
          ['2.3', '2.0.1'],
          ['2.3.5', '2.3.1'],
          ['2.9.8', '2.9'],
          ['2.1.2-release', '2.1.2-beta'],
          ['2.1.3', '2.1.3-beta'],
          ['2.1.3', '2.1.3+beta'],
          ['2.9.9+beta', '2.9.9-beta'],
          ['3.7.0+build3.7.0-prerelease+build', '3.7.0-prerelease'],
          ['2.1.3-beta-beta2', '2.1.3-beta'],
          ['2.1.3-beta1+beta3', '2.1.3-beta1+beta2']
      ];
        for (let [targetVersion, userVersion] of versions) {
          var result = attributesValidator.compareVersion(targetVersion, userVersion)
          assert.equal(result, -1, `Got result ${result}. Failed for target version: ${targetVersion} and user version: ${userVersion}`);
        }
      });

    });
  });
});
