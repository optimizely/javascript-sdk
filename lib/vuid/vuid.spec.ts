import { vi, describe, expect, it } from 'vitest';

import { VUID_PREFIX, VUID_MAX_LENGTH, isVuid, makeVuid } from './vuid';

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
