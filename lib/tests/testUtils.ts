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
import { vi } from 'vitest';

export const exhaustMicrotasks = async (loop = 100): Promise<void> => {
  for(let i = 0; i < loop; i++) {
    await Promise.resolve();
  }
};

export const wait = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

export const advanceTimersByTime = (waitMs: number): Promise<void> => {
  const timeoutPromise: Promise<void> = new Promise(res => setTimeout(res, waitMs));
  vi.advanceTimersByTime(waitMs);
  return timeoutPromise;
}
