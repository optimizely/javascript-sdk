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

import { assert } from 'chai';
import { scheduleMicrotaskOrTimeout } from './';

describe('scheduleMicrotaskOrTimeout', () => {
  let called;

  beforeEach(() => {
    called = false;
  });

  it('should use queueMicrotask if available', (done) => {
    scheduleMicrotaskOrTimeout(() => {
      called = true;
      assert.isTrue(called, 'queueMicrotask was called');
      done();
    });
  });

  it('should fallback to setTimeout if queueMicrotask is not available', (done) => {
    const originalQueueMicrotask = window.queueMicrotask;
    window.queueMicrotask = undefined;

    scheduleMicrotaskOrTimeout(() => {
      assert.isTrue(true, 'setTimeout was called');
      window.queueMicrotask = originalQueueMicrotask;
      done();
    });
  });
});
