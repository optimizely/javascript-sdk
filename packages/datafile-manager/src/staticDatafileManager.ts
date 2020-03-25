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

import { DatafileManager, DatafileUpdate } from './datafileManager';

const doNothing = () => {};

export default class StaticDatafileManager implements DatafileManager {
  private readonly datafile: object | null

  private readyPromise: Promise<void>

  constructor(datafile: object | null) {
    this.datafile = datafile
    this.readyPromise = Promise.resolve();
  }

  get() {
    return this.datafile
  }

  onReady() {
    return this.readyPromise
  }

  start() {
    return Promise.resolve();
  }

  stop() {
    return Promise.resolve();
  }

  on(eventName: string, listener: (datafileUpdate: DatafileUpdate) => void) {
    return doNothing
  }
}
