import { vi, describe, expect, it } from 'vitest';

import { createVuidManager } from './vuid_manager_factory.node';

describe('createVuidManager', () => {
  it('should throw an error', () => {
    expect(() => createVuidManager({ enableVuid: true }))
      .toThrowError('VUID is not supported in Node.js environment');
  });
});
