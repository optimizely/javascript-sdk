import { OpType, OpValue } from '../type';

export const opValue = <O extends OpType, V>(op: O, val: V): OpValue<O, V> => {
  if (op === 'sync') {
    return val as any;
  }
  return Promise.resolve(val) as any;
}

export const opThen = <O extends OpType, V, NV>(op: O, val: OpValue<O, V>, fn: (v: V) => OpValue<O, NV>): OpValue<O, NV> => {
  if (op === 'sync') {
    return fn(val as any) as any;
  }
  return (val as Promise<V>).then(fn) as any;
}
