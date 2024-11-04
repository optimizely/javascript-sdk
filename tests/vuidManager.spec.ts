/**
 * Copyright 2022, 2024, Optimizely
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

/// <reference types="jest" />

import { VuidManager } from '../lib/plugins/vuid_manager';
import PersistentKeyValueCache from '../lib/plugins/key_value_cache/persistentKeyValueCache';
import { anyString, anything, instance, mock, resetCalls, verify, when } from 'ts-mockito';
import { LogHandler } from '../lib/modules/logging/models';

describe('VuidManager', () => {
  let mockCache: PersistentKeyValueCache<string>;
  let mockLogger: LogHandler;

  beforeAll(() => {
    mockCache = mock<PersistentKeyValueCache>();
    when(mockCache.contains(anyString())).thenResolve(true);
    when(mockCache.get(anyString())).thenResolve('');
    when(mockCache.remove(anyString())).thenResolve(true);
    when(mockCache.set(anyString(), anything())).thenResolve();

    mockLogger = mock<LogHandler>();
  });

  beforeEach(() => {
    resetCalls(mockCache);
    resetCalls(mockLogger);
  });

  it('should make a VUID', async () => {
    const manager = new VuidManager(instance(mockCache));

    const vuid = manager['makeVuid']();

    expect(vuid.startsWith('vuid_')).toBe(true);
    expect(vuid.length).toEqual(32);
    expect(vuid).not.toContain('-');
  });

  it('should test if a VUID is valid', async () => {
    expect(VuidManager.isVuid('vuid_123')).toBe(true);
    expect(VuidManager.isVuid('vuid-123')).toBe(false);
    expect(VuidManager.isVuid('123')).toBe(false);
  });

  describe('when configure with enableVuid = true', () => {
    it('should handle no valid optimizely-vuid in the cache', async () => {
      when(mockCache.get(anyString())).thenResolve(undefined);
      const manager = new VuidManager(instance(mockCache))
      await manager.configure({ enableVuid: true });
  
      verify(mockCache.get(anyString())).once();
      verify(mockCache.set(anyString(), anything())).once();
      expect(VuidManager.isVuid(manager.vuid)).toBe(true);
    });
  
    it('should create a new vuid if old VUID from cache is not valid', async () => {
      when(mockCache.get(anyString())).thenResolve('vuid-not-valid');
      const manager = new VuidManager(instance(mockCache));
      await manager.configure({ enableVuid: true });
  
      verify(mockCache.get(anyString())).once();
      verify(mockCache.set(anyString(), anything())).once();
      expect(VuidManager.isVuid(manager.vuid)).toBe(true);
    });

    it('should never call remove when enableVuid is true', async () => {
      const manager = new VuidManager(instance(mockCache));
      await manager.configure({ enableVuid: true });
  
      verify(mockCache.remove(anyString())).never();
      expect(VuidManager.isVuid(manager.vuid)).toBe(true);
    });
  });

  it('should call remove when vuid is disabled', async () => {
    const manager = new VuidManager(instance(mockCache));
    await manager.configure({ enableVuid: false });

    verify(mockCache.remove(anyString())).once();
    expect(manager.vuid).toBeUndefined();
  });
});
