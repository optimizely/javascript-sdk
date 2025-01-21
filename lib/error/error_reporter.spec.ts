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

import { ErrorReporter } from './error_reporter';

import { OptimizelyError } from './optimizly_error';

const mockMessageResolver = (prefix = '') => {
  return {
    resolve: vi.fn().mockImplementation((message) => `${prefix} ${message}`),
  };
}

describe('ErrorReporter', () => {
  it('should call the logger and errorNotifier with the first argument if it is an Error object', () => {
    const logger = { error: vi.fn() };
    const errorNotifier = { notify: vi.fn() };
    const errorReporter = new ErrorReporter(logger as any, errorNotifier as any);

    const error = new Error('error');
    errorReporter.report(error);

    expect(logger.error).toHaveBeenCalledWith(error);
    expect(errorNotifier.notify).toHaveBeenCalledWith(error);
  });

  it('should create an OptimizelyError and call the logger and errorNotifier with it if the first argument is a string', () => {
    const logger = { error: vi.fn() };
    const errorNotifier = { notify: vi.fn() };
    const errorReporter = new ErrorReporter(logger as any, errorNotifier as any);

    errorReporter.report('message', 1, 2);

    expect(logger.error).toHaveBeenCalled();
    const loggedError = logger.error.mock.calls[0][0];
    expect(loggedError).toBeInstanceOf(OptimizelyError);
    expect(loggedError.baseMessage).toBe('message');
    expect(loggedError.params).toEqual([1, 2]);

    expect(errorNotifier.notify).toHaveBeenCalled();
    const notifiedError = errorNotifier.notify.mock.calls[0][0];
    expect(notifiedError).toBeInstanceOf(OptimizelyError);
    expect(notifiedError.baseMessage).toBe('message');
    expect(notifiedError.params).toEqual([1, 2]);
  });
});
