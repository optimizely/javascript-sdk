import { resolvablePromise, ResolvablePromise } from "../promise/resolvablePromise";
import { BackoffController } from "../repeater/repeater";
import { AsyncFn } from "../type";
import { scheduleMicrotask } from "../microtask";
import { TaskRunner } from "./task_runner";

class BackoffRetryRunner implements TaskRunner {
  private maxRetries?: number;
  private backoff: BackoffController;
  
  constructor(backoff: BackoffController, maxRetries?: number) {
    this.maxRetries = maxRetries;
    this.backoff = backoff;
  }

  private exectueWithBackoff(task: AsyncFn, nTry: number, backoff: BackoffController, returnPromise: ResolvablePromise<void>): void {
    if (this.maxRetries && nTry > this.maxRetries) {
      returnPromise.reject(new Error(`Task failed after ${nTry} retries`));
      return;
    }

    task().then(() => {
      returnPromise.resolve();
    }).catch((e) => {
      const delay = backoff.backoff();
      setTimeout(() => {
        this.exectueWithBackoff(task, nTry + 1, backoff, returnPromise);
      }, delay);
    });
  }

  async run(task: AsyncFn): Promise<void> {
    const returnPromise = resolvablePromise<void>();
    scheduleMicrotask(() => {
      this.exectueWithBackoff(task, 1, this.backoff, returnPromise);
    });
    return returnPromise.promise;
  }

  async close(): Promise<void> {
    // this.backoff.close();
  }
}
