import { RETRY_CANCELLED } from "../../exception_messages";
import { resolvablePromise, ResolvablePromise } from "../promise/resolvablePromise";
import { BackoffController } from "../repeater/repeater";
import { AsyncProducer, Fn } from "../type";

export type RunResult<T> = {
  result: Promise<T>;
  cancelRetry: Fn;
};

type CancelSignal = {
  cancelled: boolean;
}

const runTask = <T>(
  task: AsyncProducer<T>, 
  returnPromise: ResolvablePromise<T>,
  cancelSignal: CancelSignal,
  backoff?: BackoffController,
  retryRemaining?: number,
): void => {
  task().then((res) => {
    returnPromise.resolve(res);
  }).catch((e) => {
    if (retryRemaining === 0) {
      returnPromise.reject(e);
      return;
    }
    if (cancelSignal.cancelled) {
      returnPromise.reject(new Error(RETRY_CANCELLED));
      return;
    }
    const delay = backoff?.backoff() ?? 0;
    setTimeout(() => {
      retryRemaining = retryRemaining === undefined ? undefined : retryRemaining - 1;
      runTask(task, returnPromise, cancelSignal, backoff, retryRemaining);
    }, delay);
  });
}

export const runWithRetry = <T>(
  task: AsyncProducer<T>,
  backoff?: BackoffController,
  maxRetries?: number
): RunResult<T> => {
  const returnPromise = resolvablePromise<T>();
  const cancelSignal = { cancelled: false };
  const cancelRetry = () => {
    cancelSignal.cancelled = true;
  }
  runTask(task, returnPromise, cancelSignal, backoff, maxRetries);
  return { cancelRetry, result: returnPromise.promise };
}
