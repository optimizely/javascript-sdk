import * as uuid from 'uuid'

export type Omit<T, K> = Pick<T, Exclude<keyof T, K>>

export function getTimestamp(): number {
  return new Date().getTime()
}

export function generateUUID(): string {
  return uuid.v4()
}

/**
 * Validates a value is a valid TypeScript enum
 *
 * @export
 * @param {object} enumToCheck
 * @param {*} value
 * @returns {boolean}
 */
export function isValidEnum(enumToCheck: object, value: any): boolean {
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
  const grouper = {}

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

export function keyBy<K>(arr: K[], keyByFn: (item: K) => string): {[key: string]: K} {
  let map = {}
  arr.forEach(item => {
    const key = keyByFn(item)
    map[key] = item
  })
  return map
}
