import { Platform } from './../../platform_support';
import { PROMISE_NOT_ALLOWED } from '../../message/error_message';
import { OptimizelyError } from '../../error/optimizly_error';
import { OpType, OpValue } from '../type';


export const __platforms: Platform[] = ['__universal__'];

const isPromise = (val: any): boolean => {
  return val && typeof val.then === 'function';
}

/**
 * A class that wraps a value that can be either a synchronous value or a promise and provides 
 * a promise like interface. This class is used to handle both synchronous and asynchronous values 
 * in a uniform way.
 */
export class Value<OP extends OpType, V> {
  constructor(public op: OP, public val: OpValue<OP, V>) {}

  get(): OpValue<OP, V> {
    return this.val;
  }

  then<NV>(fn: (v: V) => Value<OP, NV>): Value<OP, NV> {
    if (this.op === 'sync') {
      const newVal = fn(this.val as V);
      return Value.of(this.op, newVal.get() as NV);
    }
    return Value.of(this.op, (this.val as Promise<V>).then(fn) as Promise<NV>);
  }

  static all = <OP extends OpType, V>(op: OP, vals: Value<OP, V>[]): Value<OP, V[]> => {
    if (op === 'sync') {
      const values = vals.map(v => v.get() as V);
      return Value.of(op, values);
    }

    const promises = vals.map(v => v.get() as Promise<V>);
    return Value.of(op, Promise.all(promises));
  }

  static of<OP extends OpType, V>(op: OP, val: V | Promise<V>): Value<OP, V> {
    if (op === 'sync') {
      if (isPromise(val)) {
        throw new OptimizelyError(PROMISE_NOT_ALLOWED);
      }
      return new Value(op, val as OpValue<OP, V>);
    }

    return new Value(op, Promise.resolve(val) as OpValue<OP, V>);
  }
}
