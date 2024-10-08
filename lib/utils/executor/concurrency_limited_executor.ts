import { BaseService } from "../../service";
import { scheduleMicrotask } from "../microtask";
import { resolvablePromise, ResolvablePromise } from "../promise/resolvablePromise";
import { BackoffController } from "../repeater/repeater";
import { AsyncFn, Fn } from "../type";
import { RunResult, runWithRetry } from "./backoff_retry_runner";
import { SubmitResponse, Executor, RetryConfig } from "./executor";
import { TaskRunner } from "./task_runner";


type TaskDefiniton = {
  task: AsyncFn,
  response: ResolvablePromise<unknown>,
  retryConfig?: RetryConfig,
}

type RunningTask = {
  result: Promise<unknown>,
  cancel?: Fn,
}

class ConcurrencyLimitedExecutor extends BaseService implements Executor {
  private maxConcurrent: number;
  private queue: Queue<TaskDefiniton>;
  private nRunning = 0;
  private runningTask: Map<string, RunningTask> = new Map();
  private idGenerator: IdGenerator = new IdGenerator();

  constructor(maxConcurrent: number, maxQueueLength: number) {
    super();
    this.maxConcurrent = maxConcurrent;
    this.queue = new Queue(maxQueueLength);
  }

  forceExecuteAll(): Promise<unknown> {

  }

  start(): void {
    throw new Error("Method not implemented.");
  }

  stop(): void {
    throw new Error("Method not implemented.");
  }


  private handleTaskCompletion(id: string): void {
    this.runningTask.delete(id);
    this.nRunning--;
    this.runFromQueue();
  }

  private runFromQueue(ignoreMaxConcurrency = false): void {
    if (!this.isRunning()) {
      return;
    }

    if (!ignoreMaxConcurrency && this.nRunning >= this.maxConcurrent) {
      return;
    }

    const taskDefinition = this.queue.dequeue();
    if (!taskDefinition) {
      return;
    }

    const id = this.idGenerator.getId();

    const { cancelRetry: cancel, result } = taskDefinition.retryConfig ?
      runWithRetry(taskDefinition.task, taskDefinition.retryConfig.backoff, taskDefinition.retryConfig.maxRetries) :
      { result: taskDefinition.task() };

    this.runningTask.set(id, { result, cancel });
    this.nRunning++;
    result.finally(() => {
      this.handleTaskCompletion(id);
    });
  }

  submit(task: AsyncFn, retryConfig?: RetryConfig): SubmitResponse {
    if (!this.isRunning()) {
      return { accepted: false, error: new Error('Executor is not running') };
    }

    if (this.queue.isFull()) {
      return { accepted: false, error: new Error('Queue is full') };
    }

    const taskDefinition: TaskDefiniton = {
      task,
      response: resolvablePromise(),
      retryConfig,
    };

    this.queue.enqueue(taskDefinition);

    scheduleMicrotask(() => {
      this.runFromQueue();
    });

    return { accepted: true, result: taskDefinition.response.promise };
  }
}
