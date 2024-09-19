/**
 * Copyright 2024, Optimizely
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

import { describe, it, expect, vi } from 'vitest';
import { scheduleMicrotask } from '.'; 

describe('scheduleMicrotask', () => {
  it('should use queueMicrotask if available', async () => {
    expect(typeof globalThis.queueMicrotask).toEqual('function');
    const cb = vi.fn();
    scheduleMicrotask(cb);
    await Promise.resolve();
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('should polyfill if queueMicrotask is not available', async () => {
    const originalQueueMicrotask = globalThis.queueMicrotask;
    globalThis.queueMicrotask = undefined as any; // as any to pacify TS

    expect(globalThis.queueMicrotask).toBeUndefined();

    const cb = vi.fn();
    scheduleMicrotask(cb);
    await Promise.resolve();
    expect(cb).toHaveBeenCalledTimes(1);

    expect(globalThis.queueMicrotask).toBeUndefined();
    globalThis.queueMicrotask = originalQueueMicrotask;
  });
});
