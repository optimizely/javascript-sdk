export function find<K>(arr: Array<K>, pred: (item: K) => boolean): K | undefined {
  for (let i = 0; i < arr.length; i++) {
    if (pred(arr[i])) {
      return arr[i]
    }
  }
  return undefined
}
