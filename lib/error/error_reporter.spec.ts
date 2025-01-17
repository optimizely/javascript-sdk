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
