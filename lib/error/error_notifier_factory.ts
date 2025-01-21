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
import { ErrorHandler } from "./error_handler";
import { DefaultErrorNotifier } from "./error_notifier";

const errorNotifierSymbol = Symbol();

export type OpaqueErrorNotifier = {
  [errorNotifierSymbol]: unknown;
};

export const createErrorNotifier = (errorHandler: ErrorHandler): OpaqueErrorNotifier => {
  return {
    [errorNotifierSymbol]: new DefaultErrorNotifier(errorHandler, errorResolver),
  }
}

export const extractErrorNotifier = (errorNotifier: OpaqueErrorNotifier): DefaultErrorNotifier => {
  return errorNotifier[errorNotifierSymbol] as DefaultErrorNotifier;
}
