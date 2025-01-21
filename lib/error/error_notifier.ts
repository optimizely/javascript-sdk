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
import { MessageResolver } from "../message/message_resolver";
import { ErrorHandler } from "./error_handler";
import { OptimizelyError } from "./optimizly_error";

export interface ErrorNotifier {
  notify(error: Error): void;
  child(name: string): ErrorNotifier;
}

export class DefaultErrorNotifier implements ErrorNotifier {
  private name: string;
  private errorHandler: ErrorHandler;
  private messageResolver: MessageResolver;

  constructor(errorHandler: ErrorHandler, messageResolver: MessageResolver, name?: string) {
    this.errorHandler = errorHandler;
    this.messageResolver = messageResolver;
    this.name = name || '';
  }

  notify(error: Error): void {
    if (error instanceof OptimizelyError) {
      error.setMessage(this.messageResolver);
    }
    this.errorHandler.handleError(error);
  }

  child(name: string): ErrorNotifier {
    return new DefaultErrorNotifier(this.errorHandler, this.messageResolver, name);
  }
}
