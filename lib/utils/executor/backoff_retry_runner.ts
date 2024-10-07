import { resolvablePromise, ResolvablePromise } from "../promise/resolvablePromise";
import { BackoffController } from "../repeater/repeater";
import { AsyncFn } from "../type";
import { scheduleMicrotask } from "../microtask";

const runTask = (
  task: AsyncFn, 
  returnPromise: ResolvablePromise<void>,
  backoff?: BackoffController,
  retryRemaining?: number,
): void => {
  task().then(() => {
    returnPromise.resolve();
  }).catch((e) => {
    if (retryRemaining === 0) {
      returnPromise.reject(e);
      return;
    }
    const delay = backoff?.backoff() ?? 0;
    setTimeout(() => {
      retryRemaining = retryRemaining === undefined ? undefined : retryRemaining - 1;
      runTask(task, returnPromise, backoff, retryRemaining);
    }, delay);
  });
}

export const runWithRetry = (
  task: AsyncFn,
  backoff?: BackoffController,
  maxRetries?: number
) => {
  const returnPromise = resolvablePromise<void>();
  scheduleMicrotask(() => runTask(task, returnPromise, backoff, maxRetries));
  return returnPromise.promise;
}
