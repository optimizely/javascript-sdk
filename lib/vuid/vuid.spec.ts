/**
 * Copyright 2024, Optimizely
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

import { describe, expect, it } from 'vitest';

import { isVuid, makeVuid, VUID_MAX_LENGTH } from './vuid';

describe('isVuid', () => {
  it('should return true if and only if the value strats with the VUID_PREFIX and is longer than vuid_prefix', () => {
    expect(isVuid('vuid_a')).toBe(true);
    expect(isVuid('vuid_123')).toBe(true);
    expect(isVuid('vuid_')).toBe(false);
    expect(isVuid('vuid')).toBe(false);
    expect(isVuid('vui')).toBe(false);
    expect(isVuid('vu_123')).toBe(false);
    expect(isVuid('123')).toBe(false);
  })
});

describe('makeVuid', () => {
  it('should return a string that is a valid vuid and whose length is within VUID_MAX_LENGTH', () => {
    const vuid = makeVuid();
    expect(isVuid(vuid)).toBe(true);
    expect(vuid.length).toBeLessThanOrEqual(VUID_MAX_LENGTH);
  });
});
