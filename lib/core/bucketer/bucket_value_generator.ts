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
import murmurhash from 'murmurhash';
import { INVALID_BUCKETING_ID } from 'error_message';
import { OptimizelyError } from '../../error/optimizly_error';

const HASH_SEED = 1;
const MAX_HASH_VALUE = Math.pow(2, 32);
const MAX_TRAFFIC_VALUE = 10000;

/**
 * Helper function to generate bucket value in half-closed interval [0, MAX_TRAFFIC_VALUE)
 * @param  {string}               bucketingKey          String value for bucketing
 * @return {number}               The generated bucket value
 * @throws                        If bucketing value is not a valid string
 */
export const generateBucketValue = function(bucketingKey: string): number {
  try {
    // NOTE: the mmh library already does cast the hash value as an unsigned 32bit int
    // https://github.com/perezd/node-murmurhash/blob/master/murmurhash.js#L115
    const hashValue = murmurhash.v3(bucketingKey, HASH_SEED);
    const ratio = hashValue / MAX_HASH_VALUE;
    return Math.floor(ratio * MAX_TRAFFIC_VALUE);
  } catch (ex) {
    throw new OptimizelyError(INVALID_BUCKETING_ID, bucketingKey, ex.message);
  }
};
