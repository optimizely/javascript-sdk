/****************************************************************************
 * Copyright 2017, 2020, 2022, Optimizely, Inc. and contributors                  *
 *                                                                          *
 * Licensed under the Apache License, Version 2.0 (the "License");          *
 * you may not use this file except in compliance with the License.         *
 * You may obtain a copy of the License at                                  *
 *                                                                          *
 *    http://www.apache.org/licenses/LICENSE-2.0                            *
 *                                                                          *
 * Unless required by applicable law or agreed to in writing, software      *
 * distributed under the License is distributed on an "AS IS" BASIS,        *
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. *
 * See the License for the specific language governing permissions and      *
 * limitations under the License.                                           *
 ***************************************************************************/
import { assert } from 'chai';

import { validate } from './';
import { INVALID_USER_PROFILE_SERVICE } from 'error_message';

describe('lib/utils/user_profile_service_validator', function() {
  describe('APIs', function() {
    describe('validate', function() {
      it("should throw if the instance does not provide a 'lookup' function", function() {
        var missingLookupFunction = {
          save: function() {},
        };
        const ex = assert.throws(function() {
          validate(missingLookupFunction);
        });
        assert.equal(ex.baseMessage, INVALID_USER_PROFILE_SERVICE);
        assert.deepEqual(ex.params, ["Missing function 'lookup'"]);
      });

      it("should throw if 'lookup' is not a function", function() {
        var lookupNotFunction = {
          save: function() {},
          lookup: 'notGonnaWork',
        };
        const ex = assert.throws(function() {
          validate(lookupNotFunction);
        });
        assert.equal(ex.baseMessage, INVALID_USER_PROFILE_SERVICE);
        assert.deepEqual(ex.params, ["Missing function 'lookup'"]);
      });

      it("should throw if the instance does not provide a 'save' function", function() {
        var missingSaveFunction = {
          lookup: function() {},
        };
        const ex = assert.throws(function() {
          validate(missingSaveFunction);
        });
        assert.equal(ex.baseMessage, INVALID_USER_PROFILE_SERVICE);
        assert.deepEqual(ex.params, ["Missing function 'save'"]);
        // , sprintf(
        //   INVALID_USER_PROFILE_SERVICE,
        //   'USER_PROFILE_SERVICE_VALIDATOR',
        //   "Missing function 'save'"
        // ));
      });

      it("should throw if 'save' is not a function", function() {
        var saveNotFunction = {
          lookup: function() {},
          save: 'notGonnaWork',
        };
        const ex = assert.throws(function() {
          validate(saveNotFunction);
        });
        assert.equal(ex.baseMessage, INVALID_USER_PROFILE_SERVICE);
        assert.deepEqual(ex.params, ["Missing function 'save'"]);
      });

      it('should return true if the instance is valid', function() {
        var validInstance = {
          save: function() {},
          lookup: function() {},
        };
        assert.isTrue(validate(validInstance));
      });
    });
  });
});
