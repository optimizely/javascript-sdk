/// <reference types="jest" />

import { DefaultEventQueue, SingleEventQueue } from '../src/eventQueue'

describe('eventQueue', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('SingleEventQueue', () => {
    it('should immediately invoke the sink function when items are enqueued', () => {
      const sinkFn = jest.fn()
      const queue = new SingleEventQueue<number>({
        sink: sinkFn,
      })

      queue.start()

      queue.enqueue(1)

      expect(sinkFn).toBeCalledTimes(1)
      expect(sinkFn).toHaveBeenLastCalledWith([1])

      queue.enqueue(2)
      expect(sinkFn).toBeCalledTimes(2)
      expect(sinkFn).toHaveBeenLastCalledWith([2])

      queue.stop()
    })
  })

  describe('DefaultEventQueue', () => {
    it('should treat maxQueueSize = -1 as 1', () => {
      const sinkFn = jest.fn()
      const queue = new DefaultEventQueue<number>({
        flushInterval: 100,
        maxQueueSize: -1,
        sink: sinkFn,
      })

      queue.start()

      queue.enqueue(1)
      expect(sinkFn).toHaveBeenCalledTimes(1)
      expect(sinkFn).toHaveBeenCalledWith([1])
      queue.enqueue(2)
      expect(sinkFn).toHaveBeenCalledTimes(2)
      expect(sinkFn).toHaveBeenCalledWith([2])

      queue.stop()
    })

    it('should treat maxQueueSize = 0 as 1', () => {
      const sinkFn = jest.fn()
      const queue = new DefaultEventQueue<number>({
        flushInterval: 100,
        maxQueueSize: 0,
        sink: sinkFn,
      })

      queue.start()

      queue.enqueue(1)
      expect(sinkFn).toHaveBeenCalledTimes(1)
      expect(sinkFn).toHaveBeenCalledWith([1])
      queue.enqueue(2)
      expect(sinkFn).toHaveBeenCalledTimes(2)
      expect(sinkFn).toHaveBeenCalledWith([2])

      queue.stop()
    })

    it('should invoke the sink function when maxQueueSize is reached', () => {
      const sinkFn = jest.fn()
      const queue = new DefaultEventQueue<number>({
        flushInterval: 100,
        maxQueueSize: 3,
        sink: sinkFn,
      })

      queue.start()

      queue.enqueue(1)
      queue.enqueue(2)
      expect(sinkFn).not.toHaveBeenCalled()

      queue.enqueue(3)
      expect(sinkFn).toHaveBeenCalledTimes(1)
      expect(sinkFn).toHaveBeenCalledWith([1, 2, 3])

      queue.enqueue(4)
      queue.enqueue(5)
      queue.enqueue(6)
      expect(sinkFn).toHaveBeenCalledTimes(2)
      expect(sinkFn).toHaveBeenCalledWith([4, 5, 6])

      queue.stop()
    })

    it('should invoke the sink function when the interval has expired', () => {
      const sinkFn = jest.fn()
      const queue = new DefaultEventQueue<number>({
        flushInterval: 100,
        maxQueueSize: 100,
        sink: sinkFn,
      })

      queue.start()

      queue.enqueue(1)
      queue.enqueue(2)
      expect(sinkFn).not.toHaveBeenCalled()

      jest.advanceTimersByTime(100)

      expect(sinkFn).toHaveBeenCalledTimes(1)
      expect(sinkFn).toHaveBeenCalledWith([1, 2])

      queue.enqueue(3)
      jest.advanceTimersByTime(100)

      expect(sinkFn).toHaveBeenCalledTimes(2)
      expect(sinkFn).toHaveBeenCalledWith([3])

      queue.stop()
    })

    it('should flush the queue and invoke clearInterval', () => {
      const sinkFn = jest.fn()
      const queue = new DefaultEventQueue<number>({
        flushInterval: 100,
        maxQueueSize: 100,
        sink: sinkFn,
      })

      jest.spyOn(queue.timer, 'stop')

      queue.start()
      queue.enqueue(1)
      queue.stop()

      expect(sinkFn).toHaveBeenCalledTimes(1)
      expect(sinkFn).toHaveBeenCalledWith([1])
    })

    it('flush() should clear the current batch', () => {
      const sinkFn = jest.fn()
      const queue = new DefaultEventQueue<number>({
        flushInterval: 100,
        maxQueueSize: 100,
        sink: sinkFn,
      })

      jest.spyOn(queue.timer, 'refresh')

      queue.start()
      queue.enqueue(1)
      queue.flush()

      expect(sinkFn).toHaveBeenCalledTimes(1)
      expect(sinkFn).toHaveBeenCalledWith([1])
      expect(queue.timer.refresh).toBeCalledTimes(1)

      queue.stop()
    })

    it('stop() should return a promise', () => {
      const promise = Promise.resolve()
      const sinkFn = jest.fn().mockReturnValue(promise)
      const queue = new DefaultEventQueue<number>({
        flushInterval: 100,
        maxQueueSize: 100,
        sink: sinkFn,
      })

      expect(queue.stop()).toBe(promise)
    })

    it('should start the timer when the first event is put into the queue', () => {
      const sinkFn = jest.fn()
      const queue = new DefaultEventQueue<number>({
        flushInterval: 100,
        maxQueueSize: 100,
        sink: sinkFn,
      })

      queue.start()
      jest.advanceTimersByTime(99)
      queue.enqueue(1)

      jest.advanceTimersByTime(2)
      expect(sinkFn).toHaveBeenCalledTimes(0)
      jest.advanceTimersByTime(98)

      expect(sinkFn).toHaveBeenCalledTimes(1)
      expect(sinkFn).toHaveBeenCalledWith([1])

      jest.advanceTimersByTime(500)

      queue.enqueue(2)

      jest.advanceTimersByTime(100)

      expect(sinkFn).toHaveBeenCalledTimes(2)
      expect(sinkFn).toHaveBeenLastCalledWith([2])

      queue.stop()

    })
  })
})
