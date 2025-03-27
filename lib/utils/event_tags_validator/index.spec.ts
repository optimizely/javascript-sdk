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
import { describe, it, expect, beforeEach } from 'vitest';
import { validate } from '.';
import { OptimizelyError } from '../../error/optimizly_error';
import { INVALID_EVENT_TAGS } from 'error_message';

describe('validate', () => {
  it('should validate the given event tags if event tag is an object', () => {
    expect(validate({ testAttribute: 'testValue' })).toBe(true);
  });

  it('should throw an error if event tags is an array', () => {
    const eventTagsArray = ['notGonnaWork'];

		expect(() => validate(eventTagsArray)).toThrow(OptimizelyError)

    try {
      validate(eventTagsArray);
    } catch(err) {
      expect(err).toBeInstanceOf(OptimizelyError);
      expect(err.baseMessage).toBe(INVALID_EVENT_TAGS);
    }
  });

  it('should throw an error if event tags is null', () => {
		expect(() => validate(null)).toThrow(OptimizelyError);

    try {
      validate(null);
    } catch(err) {
      expect(err).toBeInstanceOf(OptimizelyError);
      expect(err.baseMessage).toBe(INVALID_EVENT_TAGS);
    }
  });

  it('should throw an error if event tags is a function', () => {
    function invalidInput() {
      console.log('This is an invalid input!');
    }
		expect(() => validate(invalidInput)).toThrow(OptimizelyError);

    try {
      validate(invalidInput);
    } catch(err) {
      expect(err).toBeInstanceOf(OptimizelyError);
      expect(err.baseMessage).toBe(INVALID_EVENT_TAGS);
    }
  });
});
