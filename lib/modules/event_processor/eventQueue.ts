/**
 * Copyright 2022, Optimizely
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

import { getLogger } from '../logging';
// TODO change this to use Managed from js-sdk-models when available
import { Managed } from './managed';

const logger = getLogger('EventProcessor');

export type EventQueueSink<K> = (buffer: K[]) => Promise<any>;

export interface EventQueue<K> extends Managed {
  enqueue(event: K): void;
}

export interface EventQueueFactory<K> {
  createEventQueue(config: { sink: EventQueueSink<K>, flushInterval: number, maxQueueSize: number }): EventQueue<K>;
}

class Timer {
  private timeout: number;
  private callback: () => void;
  private timeoutId?: number;

  constructor({ timeout, callback }: { timeout: number; callback: () => void }) {
    this.timeout = Math.max(timeout, 0);
    this.callback = callback;
  }

  start(): void {
    this.timeoutId = setTimeout(this.callback, this.timeout) as any;
  }

  refresh(): void {
    this.stop();
    this.start();
  }

  stop(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId as any);
    }
  }
}

export class SingleEventQueue<K> implements EventQueue<K> {
  private sink: EventQueueSink<K>;

  constructor({ sink }: { sink: EventQueueSink<K> }) {
    this.sink = sink;
  }

  start(): Promise<any> {
    // no-op
    return Promise.resolve();
  }

  stop(): Promise<any> {
    // no-op
    return Promise.resolve();
  }

  enqueue(event: K): void {
    this.sink([event]);
  }
}

export class DefaultEventQueue<K> implements EventQueue<K> {
  // expose for testing
  public timer: Timer;
  private buffer: K[];
  private maxQueueSize: number;
  private sink: EventQueueSink<K>;
  private closingSink?: EventQueueSink<K>;
  // batchComparator is called to determine whether two events can be included
  // together in the same batch
  private batchComparator: (eventA: K, eventB: K) => boolean;
  private started: boolean;

  constructor({
    flushInterval,
    maxQueueSize,
    sink,
    closingSink,
    batchComparator,
  }: {
    flushInterval: number;
    maxQueueSize: number;
    sink: EventQueueSink<K>;
    closingSink?: EventQueueSink<K>;
    batchComparator: (eventA: K, eventB: K) => boolean;
  }) {
    this.buffer = [];
    this.maxQueueSize = Math.max(maxQueueSize, 1);
    this.sink = sink;
    this.closingSink = closingSink;
    this.batchComparator = batchComparator;
    this.timer = new Timer({
      callback: this.flush.bind(this),
      timeout: flushInterval,
    });
    this.started = false;
  }

  start(): Promise<any> {
    this.started = true;
    // dont start the timer until the first event is enqueued

    return Promise.resolve();
  }

  stop(): Promise<any> {
    this.started = false;
    const result = this.closingSink ? this.closingSink(this.buffer) : this.sink(this.buffer);
    this.buffer = [];
    this.timer.stop();
    return result;
  }

  enqueue(event: K): void {
    if (!this.started) {
      logger.warn('Queue is stopped, not accepting event');
      return;
    }

    // If new event cannot be included into the current batch, flush so it can
    // be in its own new batch.
    const bufferedEvent: K | undefined = this.buffer[0];
    if (bufferedEvent && !this.batchComparator(bufferedEvent, event)) {
      this.flush();
    }

    // start the timer when the first event is put in
    if (this.buffer.length === 0) {
      this.timer.refresh();
    }
    this.buffer.push(event);

    if (this.buffer.length >= this.maxQueueSize) {
      this.flush();
    }
  }

  flush(): void {
    this.sink(this.buffer);
    this.buffer = [];
    this.timer.stop();
  }
}
