/**
 * Copyright 2025-2026, Optimizely
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

import { vi, describe, it, expect } from 'vitest';
import Module from 'module';

// The shim requires the package when it loads, so each case loads a fresh copy of the shim with the
// package's require replaced by `load`. vi.mock does not intercept the shim's plain require.
const loadShimWith = async (load: () => unknown) => {
  const M = Module as unknown as { _load: (request: string, ...rest: unknown[]) => unknown };
  const originalLoad = M._load;
  M._load = function (this: unknown, request: string, ...rest: unknown[]) {
    if (request === '@react-native-async-storage/async-storage') return load();
    return originalLoad.call(this, request, ...rest);
  };
  try {
    vi.resetModules();
    return await import('./async-storage');
  } finally {
    M._load = originalLoad;
  }
};

const loadShimWithStorage = (storage: unknown) => loadShimWith(() => ({ default: storage }));

describe('@react-native-async-storage/async-storage shim', () => {
  it('should export isAvailable as false and an undefined default when the package is not installed', async () => {
    const shim = await loadShimWith(() => {
      throw new Error('Cannot find module');
    });

    expect(shim.isAvailable).toBe(false);
    expect(shim.default).toBeUndefined();
  });

  it('should export an undefined default when the package has no default export', async () => {
    const shim = await loadShimWithStorage(undefined);

    expect(shim.isAvailable).toBe(true);
    expect(shim.default).toBeUndefined();
  });

  it('should export the package default as-is when multiGet is present (v1/v2)', async () => {
    const multiGet = vi.fn();
    const storage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      getAllKeys: vi.fn(),
      clear: vi.fn(),
      multiGet,
    };

    const shim = await loadShimWithStorage(storage);

    expect(shim.isAvailable).toBe(true);
    expect(shim.default).toBe(storage);
    expect(shim.default?.multiGet).toBe(multiGet);
  });

  it('should construct multiGet from getMany when multiGet is absent (v3)', async () => {
    const items: Record<string, string> = { a: '1', b: '2' };
    const storage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      getAllKeys: vi.fn(),
      clear: vi.fn(),
      getMany: vi.fn((keys: readonly string[]) => {
        const record: Record<string, string | null> = {};
        for (const key of keys) { record[key] = items[key] ?? null; }
        return Promise.resolve(record);
      }),
    };

    const result = (await loadShimWithStorage(storage)).default;

    expect(result?.multiGet).toBeDefined();

    const pairs = await result?.multiGet(['b', 'missing', 'a']);
    expect(pairs).toEqual([
      ['b', '2'],
      ['missing', null],
      ['a', '1'],
    ]);
  });

  it('should not modify the original storage when constructing multiGet (v3)', async () => {
    const storage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      getAllKeys: vi.fn(),
      clear: vi.fn(),
      getMany: vi.fn(),
    };

    const result = (await loadShimWithStorage(storage)).default;

    expect(result).not.toBe(storage);
    expect('multiGet' in storage).toBe(false);
    expect(Object.getPrototypeOf(result)).toBe(storage);
    expect(result?.getItem).toBe(storage.getItem);
    expect(result?.setItem).toBe(storage.setItem);
    expect(result?.removeItem).toBe(storage.removeItem);
    expect(result?.getAllKeys).toBe(storage.getAllKeys);
    expect(result?.clear).toBe(storage.clear);
  });

  it('should return pairs in the requested key order regardless of getMany record order', async () => {
    const items: Record<string, string> = { x: 'vx', y: 'vy', z: 'vz' };
    const storage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      getAllKeys: vi.fn(),
      clear: vi.fn(),
      getMany: vi.fn((keys: readonly string[]) => {
        const record: Record<string, string | null> = {};
        const reversed = [...keys].reverse();
        for (const key of reversed) { record[key] = items[key] ?? null; }
        return Promise.resolve(record);
      }),
    };

    const result = (await loadShimWithStorage(storage)).default;
    const pairs = await result?.multiGet(['z', 'x', 'y']);

    expect(pairs).toEqual([
      ['z', 'vz'],
      ['x', 'vx'],
      ['y', 'vy'],
    ]);
  });
});
