/**
 * Copyright 2022, Optimizely
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
import { EXECUTION_CONTEXT_TYPE } from '../enums';

/**
 * Determine the running or execution context for JavaScript
 * Note: React Native is considered a browser context
 */
export class ExecutionContext {
  /**
   * Holds the current value of the execution context
   * @private
   */
  private static _currentContext: EXECUTION_CONTEXT_TYPE = EXECUTION_CONTEXT_TYPE.NOT_DEFINED;

  /**
   * Gets the current running context
   * @constructor
   */
  public static get Current(): EXECUTION_CONTEXT_TYPE {
    return this._currentContext;
  }

  /**
   * Sets the current running context ideally from package initialization
   * @param newValue The new execution context
   * @constructor
   */
  public static set Current(newValue: EXECUTION_CONTEXT_TYPE) {
    this._currentContext = newValue;
  }
}
