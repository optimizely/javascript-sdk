/**
 * Copyright 2017, 2019-2020, 2022-2023, Optimizely
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
import { v4 } from 'uuid';

const MAX_SAFE_INTEGER_LIMIT = Math.pow(2, 53);

export function currentTimestamp(): number {
  return Math.round(new Date().getTime());
}

export function isSafeInteger(number: unknown): boolean {
  return typeof number == 'number' && Math.abs(number) <= MAX_SAFE_INTEGER_LIMIT;
}

export function keyBy<K>(arr: K[], key: string): { [key: string]: K } {
  if (!arr) return {};
  return keyByUtil(arr, function(item) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (item as any)[key];
  });
}


function isNumber(value: unknown): boolean {
  return typeof value === 'number';
}

export function uuid(): string {
  return v4();
}

export type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;

export function getTimestamp(): number {
  return new Date().getTime();
}

export function groupBy<K>(arr: K[], grouperFn: (item: K) => string): Array<K[]> {
  const grouper: { [key: string]: K[] } = {};

  arr.forEach(item => {
    const key = grouperFn(item);
    grouper[key] = grouper[key] || [];
    grouper[key].push(item);
  });

  return objectValues(grouper);
}

export function objectValues<K>(obj: { [key: string]: K }): K[] {
  return Object.keys(obj).map(key => obj[key]);
}

export function objectEntries<K>(obj: { [key: string]: K }): [string, K][] {
  return Object.keys(obj).map(key => [key, obj[key]]);
}

export function find<K>(arr: K[], cond: (arg: K) => boolean): K | undefined {
  let found;

  for (const item of arr) {
    if (cond(item)) {
      found = item;
      break;
    }
  }

  return found;
}

export function keyByUtil<K>(arr: K[], keyByFn: (item: K) => string): { [key: string]: K } {
  const map: { [key: string]: K } = {};
  arr.forEach(item => {
    const key = keyByFn(item);
    map[key] = item;
  });
  return map;
}

// TODO[OASIS-6649]: Don't use any type
// eslint-disable-next-line  @typescript-eslint/no-explicit-any
export function sprintf(format: string, ...args: any[]): string {
  let i = 0;
  return format.replace(/%s/g, function() {
    const arg = args[i++];
    const type = typeof arg;
    if (type === 'function') {
      return arg();
    } else if (type === 'string') {
      return arg;
    } else {
      return String(arg);
    }
  });
}

/**
 * Checks two string arrays for equality.
 * @param arrayA First Array to be compared against.
 * @param arrayB Second Array to be compared against.
 * @returns {boolean} True if both arrays are equal, otherwise returns false.
 */
export function checkArrayEquality(arrayA: string[], arrayB: string[]): boolean {
  return arrayA.length === arrayB.length && arrayA.every((item, index) => item === arrayB[index]);
}

export default {
  checkArrayEquality,
  currentTimestamp,
  isSafeInteger,
  keyBy,
  uuid,
  isNumber,
  getTimestamp,
  groupBy,
  objectValues,
  objectEntries,
  find,
  keyByUtil,
  sprintf,
};
