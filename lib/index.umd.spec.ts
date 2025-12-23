import { expect, describe, it } from 'vitest';

import * as optimizely from './index.browser';

type OptimizelySdk = typeof optimizely;

declare global {
  interface Window {
    optimizelySdk: OptimizelySdk;
  }
}

describe('UMD Bundle', () => {  
  // these are just intial tests to check the UMD bundle is loaded correctly
  // we will add more comprehensive umd tests later
  it('should have optimizelySdk on the window object', () => {
    expect(window.optimizelySdk).toBeDefined();
  });

  it('should export createInstance function', () => {
    expect(typeof window.optimizelySdk.createInstance).toBe('function');
  });
});
