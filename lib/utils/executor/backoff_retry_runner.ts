import { resolvablePromise, ResolvablePromise } from "../promise/resolvablePromise";
import { BackoffController } from "../repeater/repeater";
import { AsyncFn, Fn } from "../type";
import { scheduleMicrotask } from "../microtask";

export type RunResult = {
  result: Promise<unknown>;
  cancel: Fn;
};

const runTask = (
  task: AsyncFn, 
  returnPromise: ResolvablePromise<void>,
  backoff?: BackoffController,
  retryRemaining?: number,
): Fn => {
  let cancelled = false;
  
  const cancel = () => {
    cancelled = true;
  };

  task().then(() => {
    returnPromise.resolve();
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

export const runWithRetry = (
  task: AsyncFn,
  backoff?: BackoffController,
  maxRetries?: number
): RunResult => {
  const returnPromise = resolvablePromise<void>();
  const cancel = runTask(task, returnPromise, backoff, maxRetries);
  return { cancel, result: returnPromise.promise };
}
