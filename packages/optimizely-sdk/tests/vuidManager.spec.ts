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
import InMemoryStringCache from '../lib/plugins/key_value_cache/inMemoryStringCache';
import PersistentKeyValueCache from '../lib/plugins/key_value_cache/persistentKeyValueCache';

describe('VUID Manager', () => {
  let cache: PersistentKeyValueCache;

  beforeEach(() => {
    cache = InMemoryStringCache.getInstance();
  });

  it('should make a VUID', async () => {
    // arrange
    const manager = await VuidManager.getInstance(cache);

    // act
    const vuid = manager.makeVuid();

    // assert
    expect(vuid.startsWith('vuid_')).toBe(true);
    expect(vuid.length).toBeGreaterThan(20);
    expect(vuid).not.toContain('-');
  });

  it('should test if a VUID is valid', async () => {
    const manager = await VuidManager.getInstance(cache);

    expect(manager.isVuid('vuid_123')).toBeTruthy();
    expect(manager.isVuid('vuid-123')).toBeFalsy();
    expect(manager.isVuid('123')).toBeFalsy();
  });

  it('should auto-save and auto-load', async () => {
    await cache.remove("optimizely-odp");

    let manager = await VuidManager.getInstance(cache);
    const vuid1 = manager.vuid;

    manager = await VuidManager.getInstance(cache);
    const vuid2 = manager.vuid;

    expect(vuid1).toStrictEqual(vuid2);
    expect(manager.isVuid(vuid1)).toBeTruthy();
    expect(manager.isVuid(vuid2)).toBeTruthy();

    await cache.remove("optimizely-odp");

    // should end up being a new instance since we just removed it above
    await manager.load(cache);
    const vuid3 = manager.vuid;

    expect(vuid3).not.toStrictEqual(vuid1);
  });
});
