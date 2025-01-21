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
import { describe, it, expect, vi } from 'vitest';

import { DefaultErrorNotifier } from './error_notifier';
import { OptimizelyError } from './optimizly_error';

const mockMessageResolver = (prefix = '') => {
  return {
    resolve: vi.fn().mockImplementation((message) => `${prefix} ${message}`),
  };
}

describe('DefaultErrorNotifier', () => {
  it('should call the error handler with the error if the error is not an OptimizelyError', () => {
    const errorHandler = { handleError: vi.fn() };
    const messageResolver = mockMessageResolver();
    const errorNotifier = new DefaultErrorNotifier(errorHandler, messageResolver);

    const error = new Error('error');
    errorNotifier.notify(error);

    expect(errorHandler.handleError).toHaveBeenCalledWith(error);
  });

  it('should resolve the message of an OptimizelyError before calling the error handler', () => {
    const errorHandler = { handleError: vi.fn() };
    const messageResolver = mockMessageResolver('err');
    const errorNotifier = new DefaultErrorNotifier(errorHandler, messageResolver);

    const error = new OptimizelyError('test %s', 'one');
    errorNotifier.notify(error);

    expect(errorHandler.handleError).toHaveBeenCalledWith(error);
    expect(error.message).toBe('err test one');
  });
});
