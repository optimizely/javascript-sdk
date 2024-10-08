import { resolvablePromise, ResolvablePromise } from "../promise/resolvablePromise";
import { BackoffController } from "../repeater/repeater";
import { AsyncFn, AsyncProducer, Fn } from "../type";
import { scheduleMicrotask } from "../microtask";

export type RunResult<T> = {
  result: Promise<T>;
  cancelRetry: Fn;
};

const runTask = <T>(
  task: AsyncProducer<T>, 
  returnPromise: ResolvablePromise<T>,
  backoff?: BackoffController,
  retryRemaining?: number,
): Fn => {
  let cancelled = false;
  
  const cancel = () => {
    cancelled = true;
  };

  task().then((res) => {
    returnPromise.resolve(res);
  }).catch((e) => {
    if (retryRemaining === 0) {
      returnPromise.reject(e);
      return;
    }
    if (cancelled) {
      returnPromise.reject(new Error('Retry cancelled'));
      return;
    }
    const delay = backoff?.backoff() ?? 0;
    setTimeout(() => {
      retryRemaining = retryRemaining === undefined ? undefined : retryRemaining - 1;
      runTask(task, returnPromise, backoff, retryRemaining);
    }, delay);
  });

  return cancel;
}

export const runWithRetry = <T>(
  task: AsyncProducer<T>,
  backoff?: BackoffController,
  maxRetries?: number
): RunResult<T> => {
  const returnPromise = resolvablePromise<T>();
  const cancel = runTask(task, returnPromise, backoff, maxRetries);
  return { cancelRetry: cancel, result: returnPromise.promise };
}
