/**
 * Copyright 2020, Optimizely
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
 * This synchronizer makes sure the operations are atomic using promises.
 */
export class Synchronizer {
  private lockPromises: Promise<void>[] = []
  private resolvers: any[] = []

  // Adds a promise to the existing list and returns the promise so that the code block can wait for its turn
  public async getLock(): Promise<void> {
    this.lockPromises.push(new Promise(resolve => this.resolvers.push(resolve)))
    if (this.lockPromises.length === 1) {
      return
    }
    await this.lockPromises[this.lockPromises.length - 2]
  }

  // Resolves first promise in the array so that the code block waiting on the first promise can continue execution
  public releaseLock(): void {
    if (this.lockPromises.length > 0) {
      this.lockPromises.shift()
      const resolver = this.resolvers.shift()
      resolver()
      return
    }
  }
}
