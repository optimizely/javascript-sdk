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
import { v4 } from 'uuid'

export type Omit<T, K> = Pick<T, Exclude<keyof T, K>>

export function getTimestamp(): number {
  return new Date().getTime()
}

export function generateUUID(): string {
  return v4()
}

/**
 * Validates a value is a valid TypeScript enum
 *
 * @export
 * @param {object} enumToCheck
 * @param {*} value
 * @returns {boolean}
 */
export function isValidEnum(enumToCheck: { [key: string]: any }, value: any): boolean {
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

  for (let item of arr) {
    if (cond(item)) {
      found = item
      break
    }
  }

  return found
}

export function keyBy<K>(arr: K[], keyByFn: (item: K) => string): { [key: string]: K } {
  let map: { [key: string]: K } = {}
  arr.forEach(item => {
    const key = keyByFn(item)
    map[key] = item
  })
  return map
}

export function sprintf(format: string, ...args: any[]): string {
  var i = 0
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

export { default as EventEmitter } from './eventEmitter';
