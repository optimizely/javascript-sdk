import { PROMISE_NOT_ALLOWED } from '../../message/error_message';
import { OptimizelyError } from '../../error/optimizly_error';
import { OpType, OpValue } from '../type';

export const isPromise = (val: any): boolean => {
  return val && typeof val.then === 'function';
}

export const opValue = <O extends OpType, V>(op: O, val: V | Promise<V>): OpValue<O, V> => {
  if (op === 'sync') {
    if (isPromise(val)) {
      throw new OptimizelyError(PROMISE_NOT_ALLOWED);
    }
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

export const opAll = <O extends OpType, V>(op: O, vals: OpValue<O, V>[]): OpValue<O, V[]> => {
  if (op === 'sync') {
    return vals as any;
  }
  return Promise.all(vals) as any;
}
