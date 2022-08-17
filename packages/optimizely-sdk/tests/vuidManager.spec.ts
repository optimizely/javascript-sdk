/**
 * Copyright 2022, Optimizely
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

describe('VuidManager', () => {
  let mockCache: PersistentKeyValueCache;

  beforeAll(() => {
    mockCache = mock<PersistentKeyValueCache>();
    when(mockCache.contains(anyString())).thenResolve(true);
    when(mockCache.get(anyString())).thenResolve('');
    when(mockCache.remove(anyString())).thenResolve(true);
    when(mockCache.set(anyString(), anything())).thenResolve();
    VuidManager.instance(instance(mockCache));
  });
  
  beforeEach(()=>{
    resetCalls(mockCache);
    VuidManager._reset();
  })

  it('should make a VUID', async () => {
    const manager = await VuidManager.instance(instance(mockCache));

    const vuid = manager.makeVuid();

    expect(vuid.startsWith('vuid_')).toBe(true);
    expect(vuid.length).toEqual(32);
    expect(vuid).not.toContain('-');
  });

  it('should test if a VUID is valid', async () => {
    const manager = await VuidManager.instance(instance(mockCache));

    expect(manager.isVuid('vuid_123')).toBe(true);
    expect(manager.isVuid('vuid-123')).toBe(false);
    expect(manager.isVuid('123')).toBe(false);
  });

  it('should auto-save and auto-load', async () => {
    const cache = instance(mockCache);

    await cache.remove('optimizely-odp');

    const manager1 = await VuidManager.instance(cache);
    const vuid1 = manager1.vuid;

    const manager2 = await VuidManager.instance(cache);
    const vuid2 = manager2.vuid;

    expect(vuid1).toStrictEqual(vuid2);
    expect(manager2.isVuid(vuid1)).toBe(true);
    expect(manager1.isVuid(vuid2)).toBe(true);

    await cache.remove('optimizely-odp');

    // should end up being a new instance since we just removed it above
    await manager2.load(cache);
    const vuid3 = manager2.vuid;

    expect(vuid3).not.toStrictEqual(vuid1);
    expect(manager2.isVuid(vuid3)).toBe(true);
  });

  it('should handle no valid optimizely-vuid in the cache', async () => {
    when(mockCache.get(anyString())).thenResolve(null);

    const manager = await VuidManager.instance(instance(mockCache)); // load() called initially

    verify(mockCache.get(anyString())).once();
    verify(mockCache.set(anyString(), anything())).once();
    expect(manager.isVuid(manager.vuid)).toBe(true);
  });

  it('should create a new vuid if old VUID from cache is not valid', async () => {
    when(mockCache.get(anyString())).thenResolve('vuid-not-valid');

    const manager = await VuidManager.instance(instance(mockCache));

    verify(mockCache.get(anyString())).once();
    verify(mockCache.set(anyString(), anything())).once();
    expect(manager.isVuid(manager.vuid)).toBe(true);
  });
});

