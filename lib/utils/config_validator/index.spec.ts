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
import configValidator from './';
import testData from '../../tests/test_data';
import { INVALID_DATAFILE_MALFORMED, INVALID_DATAFILE_VERSION, NO_DATAFILE_SPECIFIED } from 'error_message';
import { OptimizelyError } from '../../error/optimizly_error';

describe('validate', () => {
  it('should complain if datafile is not provided', () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(() => configValidator.validateDatafile()).toThrowError(new OptimizelyError(NO_DATAFILE_SPECIFIED));
  });

  it('should complain if datafile is malformed', () => {
    expect(() => configValidator.validateDatafile('abc')).toThrowError(new OptimizelyError(INVALID_DATAFILE_MALFORMED));
  });

  it('should complain if datafile version is not supported', () => {
    expect(() =>
      configValidator
        .validateDatafile(JSON.stringify(testData.getUnsupportedVersionConfig()))
        .toThrowError(new OptimizelyError(INVALID_DATAFILE_VERSION))
    );
  });

  it('should not complain if datafile is valid', function() {
    expect(() => configValidator.validateDatafile(JSON.stringify(testData.getTestProjectConfig())).not.toThrowError());
  });
});
