/**
 * Copyright 2019, Optimizely
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
// TODO change this to use Managed from js-sdk-models when available
import { Managed } from './managed'
export type EventQueueSink<K> = (buffer: K[]) => Promise<any>

export interface EventQueue<K> extends Managed {
  enqueue(event: K): void
}

export interface EventQueueFactory<K> {
  createEventQueue(config: {
    sink: EventQueueSink<K>
    flushInterval: number
    maxQueueSize: number
  }): EventQueue<K>
}

class Timer {
  private timeout: number
  private callback: () => void
  private timeoutId?: number

  constructor({ timeout, callback }: { timeout: number; callback: () => void }) {
    this.timeout = timeout
    this.callback = callback
  }

  start(): void {
    this.timeoutId = setTimeout(this.callback, this.timeout) as any
  }

  refresh(): void {
    this.stop()
    this.start()
  }

  stop(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId as any)
    }
  }
}

export class SingleEventQueue<K> implements EventQueue<K> {
  private sink: EventQueueSink<K>

  constructor({ sink }: { sink: EventQueueSink<K> }) {
    this.sink = sink
  }

  start(): void {
    // no-op
  }

  stop(): Promise<any> {
    // no-op
    return Promise.resolve()
  }

  enqueue(event: K): void {
    this.sink([event])
  }
}

export class DefaultEventQueue<K> implements EventQueue<K> {
  // expose for testing
  public timer: Timer
  private buffer: K[]
  private maxQueueSize: number
  private sink: EventQueueSink<K>

  constructor({
    flushInterval,
    maxQueueSize,
    sink,
  }: {
    flushInterval: number
    maxQueueSize: number
    sink: EventQueueSink<K>
  }) {
    this.buffer = []
    this.maxQueueSize = Math.max(maxQueueSize, 1)
    this.sink = sink
    this.timer = new Timer({
      callback: this.flush.bind(this),
      timeout: flushInterval,
    })
  }

  start(): void {
    // dont start the timer until the first event is enqueued
  }

  stop(): Promise<any> {
    const result = this.sink(this.buffer)
    this.timer.stop()
    return result
  }

  enqueue(event: K): void {
    // start the timer when the first event is put in
    if (this.buffer.length === 0) {
      this.timer.refresh()
    }
    this.buffer.push(event)

    if (this.buffer.length >= this.maxQueueSize) {
      this.flush()
    }
  }

  flush() {
    this.sink(this.buffer)
    this.buffer = []
    this.timer.stop()
  }
}
