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

import { vi, describe, it, expect } from 'vitest';
import { ensureMultiGet } from './async-storage';

describe('ensureMultiGet', () => {
  it('should preserve multiGet when already present (v1/v2)', () => {
    const multiGet = vi.fn();
    const storage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      getAllKeys: vi.fn(),
      clear: vi.fn(),
      multiGet,
    };

    const result = ensureMultiGet(storage);

    expect(result.multiGet).toBe(multiGet);
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

    const result = ensureMultiGet(storage);

    expect(result.multiGet).toBeDefined();

    const pairs = await result.multiGet(['b', 'missing', 'a']);
    expect(pairs).toEqual([
      ['b', '2'],
      ['missing', null],
      ['a', '1'],
    ]);
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

    const result = ensureMultiGet(storage);
    const pairs = await result.multiGet(['z', 'x', 'y']);

    expect(pairs).toEqual([
      ['z', 'vz'],
      ['x', 'vx'],
      ['y', 'vy'],
    ]);
  });
});
