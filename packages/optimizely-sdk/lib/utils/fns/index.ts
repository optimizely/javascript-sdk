/**
 * Copyright 2017, 2019-2020, 2022, Optimizely
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
import _uuid from 'uuid';

const MAX_SAFE_INTEGER_LIMIT = Math.pow(2, 53);

// eslint-disable-next-line
export function assign(target: any, ...sources: any[]): any {
  if (!target) {
    return {};
  }
  if (typeof Object.assign === 'function') {
    return Object.assign(target, ...sources);
  } else {
    const to = Object(target);
    for (let index = 0; index < sources.length; index++) {
      const nextSource = sources[index];
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

function currentTimestamp(): number {
  return Math.round(new Date().getTime());
}

function isSafeInteger(number: unknown): boolean {
  return typeof number == 'number' && Math.abs(number) <= MAX_SAFE_INTEGER_LIMIT;
}

export function keyBy<K>(arr: K[], key: string): { [key: string]: K } {
  if (!arr) return {};
  return keyByUtil(arr, function (item) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (item as any)[key];
  });
}

function isNumber(value: unknown): boolean {
  return typeof value === 'number';
}

export function uuid(): string {
  return _uuid.v4()
}

export type Omit<T, K> = Pick<T, Exclude<keyof T, K>>

export function getTimestamp(): number {
  return new Date().getTime()
}

/**
* Validates a value is a valid TypeScript enum
*
* @export
* @param {object} enumToCheck
* @param {*} value
* @returns {boolean}
*/
// TODO[OASIS-6649]: Don't use any type
// eslint-disable-next-line  @typescript-eslint/no-explicit-any
export function isValidEnum(enumToCheck: { [key: string]: any }, value: number | string): boolean {
  let found = false

  const keys = Object.keys(enumToCheck)
  for (let index = 0; index < keys.length; index++) {
    if (value === enumToCheck[keys[index]]) {
      found = true
      break
    }
  }
  return found
}

export function groupBy<K>(arr: K[], grouperFn: (item: K) => string): Array<K[]> {
  const grouper: { [key: string]: K[] } = {}

  arr.forEach(item => {
    const key = grouperFn(item)
    grouper[key] = grouper[key] || []
    grouper[key].push(item)
  })

  return objectValues(grouper)
}

export function objectValues<K>(obj: { [key: string]: K }): K[] {
  return Object.keys(obj).map(key => obj[key])
}

export function objectEntries<K>(obj: { [key: string]: K }): [string, K][] {
  return Object.keys(obj).map(key => [key, obj[key]])
}

export function find<K>(arr: K[], cond: (arg: K) => boolean): K | undefined {
  let found

  for (const item of arr) {
    if (cond(item)) {
      found = item
      break
    }
  }

  return found
}

export function keyByUtil<K>(arr: K[], keyByFn: (item: K) => string): { [key: string]: K } {
  const map: { [key: string]: K } = {}
  arr.forEach(item => {
    const key = keyByFn(item)
    map[key] = item
  })
  return map
}

// TODO[OASIS-6649]: Don't use any type
// eslint-disable-next-line  @typescript-eslint/no-explicit-any
export function sprintf(format: string, ...args: any[]): string {
  let i = 0
  return format.replace(/%s/g, function() {
    const arg = args[i++]
    const type = typeof arg
    if (type === 'function') {
      return arg()
    } else if (type === 'string') {
      return arg
    } else {
      return String(arg)
    }
  })
}

export default {
  assign,
  currentTimestamp,
  isSafeInteger,
  keyBy,
  uuid,
  isNumber,
  getTimestamp,
  isValidEnum,
  groupBy,
  objectValues,
  objectEntries,
  find,
  keyByUtil,
  sprintf
}
