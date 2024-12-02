/**
 * Copyright 2024 Optimizely
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
import { AsyncTransformer } from '../../utils/type';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const getMockRepeater = () => {
  const mock = {
    running: false,
    handler: undefined as any,
    start: vi.fn(),
    stop: vi.fn(),
    reset: vi.fn(),
    setTask(handler: AsyncTransformer<number, void>) {
      this.handler = handler;
    },
    // throw if not running. This ensures tests cannot 
    // do mock exection when the repeater is supposed to be not running.
    execute(failureCount: number): Promise<void> {
      if (!this.isRunning) throw new Error();
      const ret = this.handler?.(failureCount);
      ret?.catch(() => {});
      return ret;
    },
    isRunning: () => mock.running,
  };
  mock.start.mockImplementation(() => mock.running = true);
  mock.stop.mockImplementation(() => mock.running = false);
  return mock;
}
