export function find<K>(arr: Array<K>, pred: (item: K) => boolean): K | undefined {
  for (let i = 0; i < arr.length; i++) {
    if (pred(arr[i])) {
      return arr[i]
    }
  }
  return undefined
}

export function isPlainObject(someValue: any): boolean {
  return someValue != null && Object.prototype.toString.call(someValue) === '[object Object]'
}
