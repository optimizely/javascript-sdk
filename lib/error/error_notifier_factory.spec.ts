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
import { createErrorNotifier } from './error_notifier_factory';

describe('createErrorNotifier', () => {
  it('should throw errors for invalid error handlers', () => {
    expect(() => createErrorNotifier(null as any)).toThrow('Invalid error handler');
    expect(() => createErrorNotifier(undefined as any)).toThrow('Invalid error handler');


    expect(() => createErrorNotifier('abc' as any)).toThrow('Invalid error handler');
    expect(() => createErrorNotifier(123 as any)).toThrow('Invalid error handler');

    expect(() => createErrorNotifier({} as any)).toThrow('Invalid error handler');

    expect(() => createErrorNotifier({ handleError: 'abc' } as any)).toThrow('Invalid error handler');
  });
});
