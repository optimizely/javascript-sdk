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
import { errorResolver } from "../message/message_resolver";
import { Maybe } from "../utils/type";
import { ErrorHandler } from "./error_handler";
import { DefaultErrorNotifier, ErrorNotifier } from "./error_notifier";

export const INVALID_ERROR_HANDLER = 'Invalid error handler';

const errorNotifierSymbol = Symbol();
const errorNotifierKey = {};

export type OpaqueErrorNotifier = {
  [errorNotifierSymbol]: unknown;
};

const validateErrorHandler = (errorHandler: ErrorHandler) => {
  if (!errorHandler || typeof errorHandler !== 'object' || typeof errorHandler.handleError !== 'function') {
    throw new Error(INVALID_ERROR_HANDLER);
  }
}

export const createErrorNotifier = (errorHandler: ErrorHandler): OpaqueErrorNotifier => {
  validateErrorHandler(errorHandler);
  const weakMap = new WeakMap<object, ErrorNotifier>();
  weakMap.set(errorNotifierKey, new DefaultErrorNotifier(errorHandler, errorResolver));

  return {
    [errorNotifierSymbol]: weakMap,
  }
}

export const extractErrorNotifier = (errorNotifier: Maybe<OpaqueErrorNotifier>): Maybe<DefaultErrorNotifier> => {
  if (!errorNotifier || typeof errorNotifier !== 'object' ||
      !(errorNotifier[errorNotifierSymbol] instanceof WeakMap)) {
    return undefined;
  }

  const weakMap = errorNotifier[errorNotifierSymbol] as WeakMap<object, DefaultErrorNotifier>;
  return weakMap.get(errorNotifierKey);
}
