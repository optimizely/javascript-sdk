/**
 * Copyright 2022, Optimizely
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
 * CacheElement represents an individual generic item within the LRUCache
 */
export class CacheElement<V> {
  private _value: V | null;
  private _time: number;

  get value(): V | null {
    return this._value;
  }
  get time(): number {
    return this._time;
  }

  constructor(value: V | null = null) {
    this._value = value;
    this._time = Date.now();
  }

  public is_stale(timeout: number): boolean {
    if (timeout <= 0) return false;
    return Date.now() - this._time >= timeout;
  }
}

export default CacheElement;
