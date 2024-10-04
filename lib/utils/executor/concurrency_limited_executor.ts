import { BaseService } from "../../service";
import { scheduleMicrotask } from "../microtask";
import { resolvablePromise, ResolvablePromise } from "../promise/resolvablePromise";
import { AsyncFn } from "../type";
import { Executor } from "./executor";
import { TaskRunner } from "./task_runner";

type RunnerFactory = () => TaskRunner;

class ConcurrencyLimitedExecutor extends BaseService implements Executor {
  private maxConcurrent: number;
  private queue: Queue<[AsyncFn, ResolvablePromise<void>]>;
  private nRunning = 0;
  private runnerFactory: RunnerFactory;

  constructor(maxConcurrent: number, maxQueueLength: number, runnerFactory: RunnerFactory) {
    super();
    this.maxConcurrent = maxConcurrent;
    this.runnerFactory = runnerFactory;
    this.queue = new Queue(maxQueueLength);
  }

  start(): void {
    throw new Error("Method not implemented.");
  }
  stop(): void {
    throw new Error("Method not implemented.");
  }

  private runFromQueue(): void {
    if (this.nRunning == this.maxConcurrent) {
      return;
    }

    const task = this.queue.dequeue();
    if (!task) {
      return;
    }

    this.nRunning++;
    this.runnerFactory().run(task[0]).then(() => {
      task[1].resolve();
    }).catch((e) => {
      task[1].reject(e);
    }).finally(() => {
      this.nRunning--;
      this.runFromQueue();
    });
  }

  async execute(task: AsyncFn): Promise<void> {
    const result = resolvablePromise<void>();
    this.queue.enqueue([task, result]);
    scheduleMicrotask(() => {
      this.runFromQueue();
    });
    return result.promise;
  }
}
