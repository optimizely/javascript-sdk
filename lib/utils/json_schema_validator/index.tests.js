/**
 * Copyright 2016-2020, 2022, 2024, Optimizely
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
import { sprintf } from '../fns';
import { assert } from 'chai';

import { validate } from './';
import testData from '../../tests/test_data';
import { NO_JSON_PROVIDED } from '../../error_messages';


describe('lib/utils/json_schema_validator', function() {
  describe('APIs', function() {
    describe('validate', function() {
      it('should throw an error if the object is not valid', function() {
        assert.throws(function() {
          validate({});
        });
      });

      it('should throw an error if no json object is passed in', function() {
        const ex = assert.throws(function() {
          validate();
        });
        assert.equal(ex.baseMessage, NO_JSON_PROVIDED);
      });

      it('should validate specified Optimizely datafile', function() {
        assert.isTrue(validate(testData.getTestProjectConfig()));
      });
    });
  });
});
