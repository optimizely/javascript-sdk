export interface ErrorHandler {
  handleError(exception: Error): void
}

export class NoopErrorHandler implements ErrorHandler {
  handleError(exception: Error): void {
    // no-op
    return
  }
}

let globalErrorHandler: ErrorHandler = new NoopErrorHandler()

export function setErrorHandler(handler: ErrorHandler):void {
  globalErrorHandler = handler
}

export function getErrorHandler(): ErrorHandler {
  return globalErrorHandler
}
