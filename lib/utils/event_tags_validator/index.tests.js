/**
 * Copyright 2017, 2020, 2022 Optimizely
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

import { validate } from './';
import { INVALID_EVENT_TAGS } from 'error_message';

describe('lib/utils/event_tags_validator', function() {
  describe('APIs', function() {
    describe('validate', function() {
      it('should validate the given event tags if event tags is an object', function() {
        assert.isTrue(validate({ testAttribute: 'testValue' }));
      });

      it('should throw an error if event tags is an array', function() {
        var eventTagsArray = ['notGonnaWork'];
        const ex = assert.throws(function() {
          validate(eventTagsArray);
        });
        assert.equal(ex.baseMessage, INVALID_EVENT_TAGS);
      });

      it('should throw an error if event tags is null', function() {
        const ex = assert.throws(function() {
          validate(null);
        })
        assert.equal(ex.baseMessage, INVALID_EVENT_TAGS);
      });

      it('should throw an error if event tags is a function', function() {
        function invalidInput() {
          console.log('This is an invalid input!');
        }
        const ex = assert.throws(function() {
          validate(invalidInput);
        });
        assert.equal(ex.baseMessage, INVALID_EVENT_TAGS);
      });
    });
  });
});
