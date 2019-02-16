/**
 * @export
 * @interface ErrorHandler
 */
export interface ErrorHandler {
  /**
   * @param {Error} exception
   * @memberof ErrorHandler
   */
  handleError(exception: Error): void
}

/**
 * @export
 * @class NoopErrorHandler
 * @implements {ErrorHandler}
 */
export class NoopErrorHandler implements ErrorHandler {
  /**
   * @param {Error} exception
   * @memberof NoopErrorHandler
   */
  handleError(exception: Error): void {
    // no-op
    return
  }
}

let globalErrorHandler: ErrorHandler = new NoopErrorHandler()

/**
 * @export
 * @param {ErrorHandler} handler
 */
export function setErrorHandler(handler: ErrorHandler): void {
  globalErrorHandler = handler
}

/**
 * @export
 * @returns {ErrorHandler}
 */
export function getErrorHandler(): ErrorHandler {
  return globalErrorHandler
}

/**
 * @export
 */
export function resetErrorHandler(): void {
  globalErrorHandler = new NoopErrorHandler()
}
