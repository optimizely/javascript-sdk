/**
 * Copyright 2018, 2020, Optimizely
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

describe('lib/utils/string_input_validator', function() {
  describe('APIs', function() {
    describe('validate', function() {
      it('should validate the given value is valid string', function() {
        assert.isTrue(validate('validStringValue'));
      });

      it('should return false if given value is invalid string', function() {
        assert.isFalse(validate(null));
        assert.isFalse(validate(undefined));
        assert.isFalse(validate(''));
        assert.isFalse(validate(5));
        assert.isFalse(validate(true));
        assert.isFalse(validate([]));
      });
    });
  });
});
