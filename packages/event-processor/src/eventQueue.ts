import { Managed } from '@optimizely/js-sdk-models'
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

export class DefaultEventQueueFactory<K> implements EventQueueFactory<K> {
  createEventQueue(config: {
    sink: EventQueueSink<K>
    flushInterval: number
    maxQueueSize: number
  }): EventQueue<K> {
    return new DefaultEventQueue(config)
  }
}

class IntervalTimer {
  private interval: number
  private callback: () => void
  private intervalId?: number

  constructor({ interval, callback }: { interval: number; callback: () => void }) {
    this.interval = interval
    this.callback = callback
  }

  start(): void {
    this.intervalId = setInterval(this.callback, this.interval) as any
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId as any)
    }
  }

  refresh(): void {
    this.stop()
    this.start()
  }
}

export class DefaultEventQueue<K> implements EventQueue<K> {
  // expose for testing
  public timer: IntervalTimer
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
    this.timer = new IntervalTimer({
      callback: this.flush.bind(this),
      interval: flushInterval,
    })
  }

  start(): void {
    if (this.maxQueueSize > 1) {
      this.timer.start()
    }
  }

  stop(): Promise<any> {
    const result = this.sink(this.buffer)
    this.timer.stop()
    return result
  }

  enqueue(event: K): void {
    this.buffer.push(event)

    if (this.buffer.length >= this.maxQueueSize) {
      this.flush()
      this.timer.refresh()
    }
  }

  flush() {
    this.sink(this.buffer)
    this.buffer = []
    this.timer.refresh()
  }
}
