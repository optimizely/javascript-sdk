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

  it.only('should resolve the message of an OptimizelyError before calling the error handler', () => {
    const errorHandler = { handleError: vi.fn() };
    const messageResolver = mockMessageResolver('err');
    const errorNotifier = new DefaultErrorNotifier(errorHandler, messageResolver);

    const error = new OptimizelyError('test %s', 'one');
    errorNotifier.notify(error);

    expect(errorHandler.handleError).toHaveBeenCalledWith(error);
    expect(error.message).toBe('err test one');
  });
});
