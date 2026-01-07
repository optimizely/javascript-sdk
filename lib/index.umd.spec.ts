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

import * as optimizely from './index.browser';

type OptimizelySdk = typeof optimizely;

declare global {
  interface Window {
    optimizelySdk: OptimizelySdk;
  }
}

describe('UMD Bundle', () => {  
  // these are just initial tests to check the UMD bundle is loaded correctly
  // we will add more comprehensive umd tests later
  it('should have optimizelySdk on the window object', () => {
    expect(window.optimizelySdk).toBeDefined();
  });

  it('should export createInstance function', () => {
    expect(typeof window.optimizelySdk.createInstance).toBe('function');
  });
});
