/**
 * Copyright 2025, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { expect, describe, it } from 'vitest';
import { sprintf } from '../../utils/fns';
import { generateBucketValue } from './bucket_value_generator';
import { OptimizelyError } from '../../error/optimizly_error';
import { INVALID_BUCKETING_ID } from 'error_message';

describe('generateBucketValue', () => {
  it('should return a bucket value for different inputs', () => {
    const experimentId = 1886780721;
    const bucketingKey1 = sprintf('%s%s', 'ppid1', experimentId);
    const bucketingKey2 = sprintf('%s%s', 'ppid2', experimentId);
    const bucketingKey3 = sprintf('%s%s', 'ppid2', 1886780722);
    const bucketingKey4 = sprintf('%s%s', 'ppid3', experimentId);

    expect(generateBucketValue(bucketingKey1)).toBe(5254);
    expect(generateBucketValue(bucketingKey2)).toBe(4299);
    expect(generateBucketValue(bucketingKey3)).toBe(2434);
    expect(generateBucketValue(bucketingKey4)).toBe(5439);
  });

  it('should return an error if it cannot generate the hash value', () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(() => generateBucketValue(null)).toThrowError(
      new OptimizelyError(INVALID_BUCKETING_ID)
    );
  });
});
