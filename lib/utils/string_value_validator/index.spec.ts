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

describe('validate', () => {
  it('should validate the given value is valid string', () => {
		expect(validate('validStringValue')).toBe(true);
  });

  it('should return false if given value is invalid string', () => {
		expect(validate(null)).toBe(false);
		expect(validate(undefined)).toBe(false);
		expect(validate('')).toBe(false);
		expect(validate(5)).toBe(false);
		expect(validate(true)).toBe(false);
		expect(validate([])).toBe(false);
  });
});
