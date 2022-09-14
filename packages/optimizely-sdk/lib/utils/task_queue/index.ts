/**
 * Copyright 2022, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { v4 } from 'uuid';

// Inspired by
// https://github.com/Bartozzz/queue-promise
// https://gitlab.com/-/snippets/1775781

enum State {
  IDLE = 0,
  RUNNING = 1,
  STOPPED = 2,
}

export enum ProcessMode {
  PARALLEL = 0,
  SERIAL = 1,
}

const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_QUEUE_SIZE = 10000;
const DEFAULT_FLUSH_INTERVAL = 1000;
const DEFAULT_MAX_RETRIES = 3;

export type TaskQueueConfiguration = {
  processMode: ProcessMode,
  batchSize: number,
  maxQueueSize: number,
  flushInterval: number,
  maxRetries: number,
  processAutomatically: boolean,
};

export class TaskQueue {
  private tasks: Map<string, () => any>;
  private lastRan = 0;
  private timeoutId: ReturnType<typeof setTimeout> | undefined;
  private currentlyHandled = 0;
  private state: State;

  private readonly options: TaskQueueConfiguration = {
    processMode: ProcessMode.PARALLEL,
    batchSize: DEFAULT_BATCH_SIZE,
    maxQueueSize: DEFAULT_QUEUE_SIZE,
    flushInterval: DEFAULT_FLUSH_INTERVAL,
    maxRetries: DEFAULT_MAX_RETRIES,
    processAutomatically: true,
  };

  public constructor(options: TaskQueueConfiguration) {
    this.options = { ...this.options, ...options };
    this.options.flushInterval = parseInt(String(this.options.flushInterval), 10);
    this.options.batchSize = parseInt(String(this.options.batchSize), 10);

    this.tasks = new Map<string, () => any>();
    this.state = this.options.processAutomatically ? State.RUNNING : State.STOPPED;
  }

  public start(): void {
    if (this.state !== State.RUNNING && !this.isEmpty) {
      this.state = State.RUNNING;

      (async () => {
        while (this.shouldRun) {
          await this.dequeue();
        }
      })();
    }
  }

  public stop(): void {
    clearTimeout(this.timeoutId);

    this.state = State.STOPPED;
  }

  public finalize(): void {
    if (this.isEmpty) {
      this.stop();
      this.state = State.IDLE;
    }
  }

  public async execute(): Promise<any> {
    const promises = new Array<Promise<any>>();

    this.tasks.forEach((fn, id) => {
      if (this.currentlyHandled < this.options.batchSize) {
        this.currentlyHandled++;
        this.tasks.delete(id);

        promises.push(this.retry(fn));
      }
    });

    if (this.options.processMode === ProcessMode.PARALLEL) {
      const results = await Promise.allSettled(promises);
      return this.options.batchSize === 1 ? results[0] : results;
    } else if (this.options.processMode === ProcessMode.SERIAL) {
      promises.every(async promise => {
        (await promise)();
        return (this.state !== State.STOPPED);
      });
    } else {
      throw new Error('ProcessMode not recognized');
    }
  }

  private async retry<T>(fn: () => Promise<T>,
                         retriesLeft = this.options.maxRetries,
                         interval = this.options.flushInterval): Promise<T> {
    try {
      const val = await fn();
      console.log('Resolved');
      return val;
    } catch {
      if (retriesLeft) {
        await new Promise(r => setTimeout(r, interval));
        return this.retry(fn, retriesLeft - 1, interval);
      } else {
        throw new Error(`Max retries reached for function ${fn.name}`);
      }
    } finally {
      this.finalize();
    }
  }

  public dequeue(): Promise<any> {
    const { flushInterval } = this.options;

    return new Promise<any>((resolve, reject) => {
      const timeout = Math.max(0, flushInterval - (Date.now() - this.lastRan));

      clearTimeout(this.timeoutId);
      this.timeoutId = setTimeout(() => {
        this.lastRan = Date.now();
        this.execute().then(resolve);
      }, timeout);
    });
  }

  public enqueue(tasks: () => any | Array<() => any>): void {
    if (Array.isArray(tasks)) {
      tasks.forEach((task) => this.enqueue(task));
      return;
    }

    this.tasks.set(v4(), tasks);

    if (this.options.processAutomatically && this.state !== State.STOPPED) {
      this.start();
    }
  }

  public clear(): void {
    this.tasks.clear();
  }

  get size(): number {
    return this.tasks.size;
  }

  get isEmpty(): boolean {
    return this.size === 0;
  }

  get shouldRun(): boolean {
    return !this.isEmpty && this.state !== State.STOPPED;
  }
}
