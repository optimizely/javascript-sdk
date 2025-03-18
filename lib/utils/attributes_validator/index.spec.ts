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
import * as attributesValidator from './';
import { INVALID_ATTRIBUTES, UNDEFINED_ATTRIBUTE } from 'error_message';
import { OptimizelyError } from '../../error/optimizly_error';

describe('validate', () => {
  it('should validate the given attributes if attributes is an object', () => {
    expect(attributesValidator.validate({ testAttribute: 'testValue' })).toBe(true);
  });

  it('should throw an error if attributes is an array', () => {
    const attributesArray = ['notGonnaWork'];

    expect(() => attributesValidator.validate(attributesArray)).toThrowError(new OptimizelyError(INVALID_ATTRIBUTES));
  });

  it('should throw an error if attributes is null', () => {
    expect(() => attributesValidator.validate(null)).toThrowError(new OptimizelyError(INVALID_ATTRIBUTES));
  });

  it('should throw an error if attributes is a function', () => {
    function invalidInput() {
      console.log('This is an invalid input!');
    }

    expect(() => attributesValidator.validate(invalidInput)).toThrowError(new OptimizelyError(INVALID_ATTRIBUTES));
  });

  it('should throw an error if attributes contains a key with an undefined value', () => {
    const attributeKey = 'testAttribute';
    const attributes: Record<string, unknown> = {};
    attributes[attributeKey] = undefined;

    expect(() => attributesValidator.validate(attributes)).toThrowError(new OptimizelyError(UNDEFINED_ATTRIBUTE));
  });
});

describe('isAttributeValid', () => {
  it('isAttributeValid returns true for valid values', () => {
    const userAttributes: Record<string, unknown> = {
      browser_type: 'Chrome',
      is_firefox: false,
      num_users: 10,
      pi_value: 3.14,
      '': 'javascript',
    };

    Object.keys(userAttributes).forEach((key) =>	 {
      const value = userAttributes[key];

      expect(attributesValidator.isAttributeValid(key, value)).toBe(true);
    });
  });
  it('isAttributeValid returns false for invalid values', () => {
    const userAttributes: Record<string, unknown> = {
      null: null,
      objects: { a: 'b' },
      array: [1, 2, 3],
      infinity: Infinity,
      negativeInfinity: -Infinity,
      NaN: NaN,
    };

    Object.keys(userAttributes).forEach((key) => {
      const value = userAttributes[key];

			expect(attributesValidator.isAttributeValid(key, value)).toBe(false);
    });
  });
});
