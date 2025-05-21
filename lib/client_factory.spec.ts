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

import { describe, it, expect } from 'vitest';

import { getOptimizelyInstance } from './client_factory';
import { createStaticProjectConfigManager } from './project_config/config_manager_factory';
import Optimizely from './optimizely';

describe('getOptimizelyInstance', () => {
  it('should throw if the projectConfigManager is not a valid ProjectConfigManager', () => {
    expect(() => getOptimizelyInstance({
      projectConfigManager: undefined as any,
      requestHandler: {} as any,
    })).toThrow('Invalid config manager');

    expect(() => getOptimizelyInstance({
      projectConfigManager: null as any,
      requestHandler: {} as any,
    })).toThrow('Invalid config manager');

    expect(() => getOptimizelyInstance({
      projectConfigManager: 'abc' as any,
      requestHandler: {} as any,
    })).toThrow('Invalid config manager');

    expect(() => getOptimizelyInstance({
      projectConfigManager: 123 as any,
      requestHandler: {} as any,
    })).toThrow('Invalid config manager');

    expect(() => getOptimizelyInstance({
      projectConfigManager: {} as any,
      requestHandler: {} as any,
    })).toThrow('Invalid config manager');
  });

  it('should return an instance of Optimizely if a valid projectConfigManager is provided', () => {
    const optimizelyInstance = getOptimizelyInstance({
      projectConfigManager: createStaticProjectConfigManager({
        datafile: '{}',
      }),
      requestHandler: {} as any,
    });

    expect(optimizelyInstance).toBeInstanceOf(Optimizely);
  });
});
