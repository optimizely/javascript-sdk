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
import { validate } from '.';
import testData from '../../tests/test_data';
import { NO_JSON_PROVIDED, INVALID_DATAFILE } from 'error_message';

describe('validate', () => {
  it('should throw an error if the object is not valid', () => {
    expect(() => validate({})).toThrow();

    try {
      validate({});
    } catch (err) {
      expect(err.baseMessage).toBe(INVALID_DATAFILE);
    }
  });

  it('should throw an error if no json object is passed in', () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(() => validate()).toThrow();

    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      validate();
    } catch (err) {
      expect(err.baseMessage).toBe(NO_JSON_PROVIDED);
    }
  });

  it('should validate specified Optimizely datafile', () => {
		expect(validate(testData.getTestProjectConfig())).toBe(true);
  });
});
