/**
 * Copyright 2024, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { AsyncTransformer } from "../type";
import { scheduleMicrotask } from "../microtask";

// A repeater will invoke the task repeatedly. The time at which the task is invoked
// is determined by the implementation.
// The task is a function that takes a number as an argument and returns a promise.
// The number argument is the number of times the task previously failed consecutively.
// If the retuned promise resolves, the repeater will assume the task succeeded,
// and will reset the failure count. If the promise is rejected, the repeater will
// assume the task failed and will increase the current consecutive failure count.
export interface Repeater {
  // If immediateExecution is true, the first exection of 
  // the task will be immediate but asynchronous.
  start(immediateExecution?: boolean): void;
  stop(): void;
  reset(): void;
  setTask(task: AsyncTransformer<number, unknown>): void;
  isRunning(): boolean;
}

export interface BackoffController {
  backoff(): number;
  reset(): void;
}

export class ExponentialBackoff implements BackoffController {
  private base: number;
  private max: number;
  private current: number;
  private maxJitter: number;

  constructor(base: number, max: number, maxJitter: number) {
    this.base = base;
    this.max = max;
    this.maxJitter = maxJitter;
    this.current = base;
  }

  backoff(): number {
    const ret = this.current + this.maxJitter * Math.random();
    this.current = Math.min(this.current * 2, this.max);
    return ret;
  }

  reset(): void {
    this.current = this.base;
  }
}

// IntervalRepeater is a Repeater that invokes the task at a fixed interval 
// after the completion of the previous task invocation. If a backoff controller
// is provided, the repeater will use the backoff controller to determine the
// time between invocations after a failure instead. It will reset the backoffController
// on success.

export class IntervalRepeater implements Repeater {
  private timeoutId?: NodeJS.Timeout;
  private task?: AsyncTransformer<number, void>;
  private interval: number;
  private failureCount = 0;
  private backoffController?: BackoffController;
  private running = false;

  constructor(interval: number, backoffController?: BackoffController) {
    this.interval = interval;
    this.backoffController = backoffController;
  }

  isRunning(): boolean {
    return this.running;
  }

  private handleSuccess() {
    this.failureCount = 0;
    this.backoffController?.reset();
    this.setTimer(this.interval);
  }

  private handleFailure() {
    this.failureCount++;
    const time = this.backoffController?.backoff() ?? this.interval;
    this.setTimer(time);
  }

  private setTimer(timeout: number) {
    if (!this.running){
      return;
    }
    this.timeoutId = setTimeout(this.executeTask.bind(this), timeout);
  }

  private executeTask() {
    if (!this.task) {
      return;
    }
    this.task(this.failureCount).then(
      this.handleSuccess.bind(this),
      this.handleFailure.bind(this)
    );
  }

  start(immediateExecution?: boolean): void {
    this.running = true;
    if(immediateExecution) {
      scheduleMicrotask(this.executeTask.bind(this));
    } else {
      this.setTimer(this.interval);
    }
  }

  stop(): void {
    this.running = false;
    clearInterval(this.timeoutId);
  }

  reset(): void {
    this.failureCount = 0;
    this.backoffController?.reset();
    this.stop();
  }

  setTask(task: AsyncTransformer<number, void>): void {
    this.task = task;
  }
}
