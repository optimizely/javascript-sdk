/**
 * Copyright 2025, Optimizely
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
import { describe, it, expect } from 'vitest';
import { validate } from './';
import { INVALID_USER_PROFILE_SERVICE } from 'error_message';
import { OptimizelyError } from '../../error/optimizly_error';

describe('validate', () => {
  it("should throw if the instance does not provide a 'lookup' function", () => {
    const missingLookupFunction = {
      save: function() {},
    };

		expect(() => validate(missingLookupFunction)).toThrowError(OptimizelyError);

		try {
			validate(missingLookupFunction);
		} catch(err) {
			expect(err).instanceOf(OptimizelyError);	
			expect(err.baseMessage).toBe(INVALID_USER_PROFILE_SERVICE);
			expect(err.params).toEqual(["Missing function 'lookup'"]);
		}
  });

  it("should throw if 'lookup' is not a function", () => {
    const lookupNotFunction = {
      save: function() {},
      lookup: 'notGonnaWork',
    };

		expect(() => validate(lookupNotFunction)).toThrowError(OptimizelyError);

		try {
			validate(lookupNotFunction);
		} catch(err) {
			expect(err).instanceOf(OptimizelyError);	
			expect(err.baseMessage).toBe(INVALID_USER_PROFILE_SERVICE);
			expect(err.params).toEqual(["Missing function 'lookup'"]);
		}
  });

  it("should throw if the instance does not provide a 'save' function", () => {
    const missingSaveFunction = {
      lookup: function() {},
    };

		expect(() => validate(missingSaveFunction)).toThrowError(OptimizelyError);

		try {
			validate(missingSaveFunction);
		} catch(err) {
			expect(err).instanceOf(OptimizelyError);	
			expect(err.baseMessage).toBe(INVALID_USER_PROFILE_SERVICE);
			expect(err.params).toEqual(["Missing function 'save'"]);
		}
  });

  it("should throw if 'save' is not a function", () => {
    const saveNotFunction = {
      lookup: function() {},
      save: 'notGonnaWork',
    };

		expect(() => validate(saveNotFunction)).toThrowError(OptimizelyError);

		try {
			validate(saveNotFunction);
		} catch(err) {
			expect(err).instanceOf(OptimizelyError);	
			expect(err.baseMessage).toBe(INVALID_USER_PROFILE_SERVICE);
			expect(err.params).toEqual(["Missing function 'save'"]);
		}
  });

  it('should return true if the instance is valid', () => {
    const validInstance = {
      save: function() {},
      lookup: function() {},
    };

		expect(validate(validInstance)).toBe(true);
  });
});
