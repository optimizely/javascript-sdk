/**
 * Copyright 2017, 2020 Optimizely
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

import { validate } from './';
import { ERROR_MESSAGES } from'../enums';

describe('lib/utils/event_tags_validator', function() {
  describe('APIs', function() {
    describe('validate', function() {
      it('should validate the given event tags if event tags is an object', function() {
        assert.isTrue(validate({ testAttribute: 'testValue' }));
      });

      it('should throw an error if event tags is an array', function() {
        var eventTagsArray = ['notGonnaWork'];
        assert.throws(function() {
          validate(eventTagsArray);
        }, sprintf(ERROR_MESSAGES.INVALID_EVENT_TAGS, 'EVENT_TAGS_VALIDATOR'));
      });

      it('should throw an error if event tags is null', function() {
        assert.throws(function() {
          validate(null);
        }, sprintf(ERROR_MESSAGES.INVALID_EVENT_TAGS, 'EVENT_TAGS_VALIDATOR'));
      });

      it('should throw an error if event tags is a function', function() {
        function invalidInput() {
          console.log('This is an invalid input!');
        }
        assert.throws(function() {
          validate(invalidInput);
        }, sprintf(ERROR_MESSAGES.INVALID_EVENT_TAGS, 'EVENT_TAGS_VALIDATOR'));
      });
    });
  });
});
