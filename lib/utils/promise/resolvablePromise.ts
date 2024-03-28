const noop = () => {};

export type ResolvablePromise<T> = {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
  then: Promise<T>['then'];
};

export function resolvablePromise<T>(): ResolvablePromise<T> {
  let resolve: (value: T | PromiseLike<T>) => void = noop;
  let reject: (reason?: any) => void = noop;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject, then: promise.then.bind(promise) };
}
