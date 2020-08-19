/**
 * Copyright 2017, 2019-2020, Optimizely
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
import { generateUUID as uuid, keyBy as keyByUtil } from '@optimizely/js-sdk-utils';

const MAX_SAFE_INTEGER_LIMIT = Math.pow(2, 53);

type Config = {
  [key: string]: unknown;
};

export function assign(...args: [Config, ...Config[]]): Config {
  if (!args[0]) {
    return {};
  }
  if (typeof Object.assign === 'function') {
    return Object.assign(...args);
  } else {
    const to = Object(args[0]);
    for (let index = 1; index < args.length; index++) {
      const nextSource = args[index];
      if (nextSource !== null && nextSource !== undefined) {
        for (const nextKey in nextSource) {
          // Avoid bugs when hasOwnProperty is shadowed
          if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
            to[nextKey] = nextSource[nextKey];
          }
        }
      }
    }
    return to;
  }
}

export function currentTimestamp(): number {
  return Math.round(new Date().getTime());
}

export function isSafeInteger(number: unknown): boolean {
  return typeof number == 'number' && Math.abs(number) <= MAX_SAFE_INTEGER_LIMIT;
}

export function keyBy<K>(arr: K[], key: string): { [key: string]: K } {
  if (!arr) return {};
  return keyByUtil(arr, function (item) {
    return item[key];
  });
}

export { uuid };

export function isNumber(value: unknown): boolean {
  return typeof value === 'number';
}
