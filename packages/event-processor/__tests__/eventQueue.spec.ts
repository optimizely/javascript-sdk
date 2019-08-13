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
/// <reference types="jest" />

import { DefaultEventQueue, SingleEventQueue } from '../src/eventQueue'

describe('eventQueue', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
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
        batchComparator: () => true
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
        batchComparator: () => true
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
        batchComparator: () => true
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
        batchComparator: () => true
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

    it('should invoke the sink function when an item incompatable with the current batch (according to batchComparator) is received', () => {
      const sinkFn = jest.fn()
      const queue = new DefaultEventQueue<string>({
        flushInterval: 100,
        maxQueueSize: 100,
        sink: sinkFn,
        // This batchComparator returns true when the argument strings start with the same letter
        batchComparator: (s1, s2) => s1[0] === s2[0]
      })

      queue.start()

      queue.enqueue('a1')
      queue.enqueue('a2')
      // After enqueuing these strings, both starting with 'a', the sinkFn should not yet be called. Thus far all the items enqueued are
      // compatible according to the batchComparator.
      expect(sinkFn).not.toHaveBeenCalled()

      // Enqueuing a string starting with 'b' should cause the sinkFn to be called
      queue.enqueue('b1')
      expect(sinkFn).toHaveBeenCalledTimes(1)
      expect(sinkFn).toHaveBeenCalledWith(['a1', 'a2'])
    })

    it('stop() should flush the existing queue and call timer.stop()', () => {
      const sinkFn = jest.fn()
      const queue = new DefaultEventQueue<number>({
        flushInterval: 100,
        maxQueueSize: 100,
        sink: sinkFn,
        batchComparator: () => true
      })

      jest.spyOn(queue.timer, 'stop')

      queue.start()
      queue.enqueue(1)

      // stop + start is called when the first item is enqueued
      expect(queue.timer.stop).toHaveBeenCalledTimes(1)

      queue.stop()

      expect(sinkFn).toHaveBeenCalledTimes(1)
      expect(sinkFn).toHaveBeenCalledWith([1])
      expect(queue.timer.stop).toHaveBeenCalledTimes(2)
    })

    it('flush() should clear the current batch', () => {
      const sinkFn = jest.fn()
      const queue = new DefaultEventQueue<number>({
        flushInterval: 100,
        maxQueueSize: 100,
        sink: sinkFn,
        batchComparator: () => true
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
        batchComparator: () => true
      })

      expect(queue.stop()).toBe(promise)
    })

    it('should start the timer when the first event is put into the queue', () => {
      const sinkFn = jest.fn()
      const queue = new DefaultEventQueue<number>({
        flushInterval: 100,
        maxQueueSize: 100,
        sink: sinkFn,
        batchComparator: () => true
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
      // ensure sink function wasnt called again since no events have
      // been added
      expect(sinkFn).toHaveBeenCalledTimes(1)

      queue.enqueue(2)

      jest.advanceTimersByTime(100)
      expect(sinkFn).toHaveBeenCalledTimes(2)
      expect(sinkFn).toHaveBeenLastCalledWith([2])

      queue.stop()

    })
  })
})
