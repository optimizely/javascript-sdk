/**
 * Copyright 2019, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
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
