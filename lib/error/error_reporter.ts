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
import { LoggerFacade } from "../logging/logger";
import { ErrorNotifier } from "./error_notifier";
import { OptimizelyError } from "./optimizly_error";

export class ErrorReporter {
  private logger?: LoggerFacade;
  private errorNotifier?: ErrorNotifier;

  constructor(logger?: LoggerFacade, errorNotifier?: ErrorNotifier) {
    this.logger = logger;
    this.errorNotifier = errorNotifier;
  }

  report(error: Error): void;
  report(baseMessage: string, ...params: any[]): void;

  report(error: Error | string, ...params: any[]): void {
    if (typeof error === 'string') {
      error = new OptimizelyError(error, ...params);
      this.report(error);
      return;
    }

    if (this.errorNotifier) {
      this.errorNotifier.notify(error);
    }

    if (this.logger) {
      this.logger.error(error);
    }
  }

  setLogger(logger: LoggerFacade): void {
    this.logger = logger;
  }

  setErrorNotifier(errorNotifier: ErrorNotifier): void {
    this.errorNotifier = errorNotifier;
  }
}
