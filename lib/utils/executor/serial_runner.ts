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

import { AsyncProducer } from "../type";

class SerialRunner {
  private waitPromise: Promise<unknown> = Promise.resolve();

  // each call to serialize adds a new function to the end of the promise chain
  // the function is called when the previous promise resolves
  // if the function throws, the error is caught and ignored to allow the chain to continue
  // the result of the function is returned as a promise
  // if multiple calls to serialize are made, they will be executed in order
  // even if some of them throw errors

  run<T>(fn: AsyncProducer<T>): Promise<T> {
    const resultPromise = this.waitPromise.then(fn);
    this.waitPromise = resultPromise.catch(() => {});
    return resultPromise;
  }
}

export { SerialRunner };
