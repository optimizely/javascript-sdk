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
import { sprintf } from "../utils/fns";

export class OptimizelyError extends Error {
  baseMessage: string;
  params: any[];
  private resolved = false;
  constructor(baseMessage: string, ...params: any[]) {
    super();
    this.name = 'OptimizelyError';
    this.baseMessage = baseMessage;
    this.params = params;
  }

  getMessage(resolver?: MessageResolver): string {
    if (this.resolved) {
      return this.message;
    }

    if (resolver) {
      this.setMessage(resolver);
      return this.message;
    }

    return this.baseMessage;
  }
  
  setMessage(resolver: MessageResolver): void {
    this.message = sprintf(resolver.resolve(this.baseMessage), ...this.params);
    this.resolved = true;
  }
}
