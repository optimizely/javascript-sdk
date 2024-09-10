/**
 * Copyright 2022, 2024, Optimizely
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
import { expect, vi, it, beforeEach, afterEach, describe } from 'vitest';
import { ExponentialBackoff, IntervalTicker } from './ticker';
import { advanceTimersByTime } from '../../../tests/testUtils';
import { ad } from 'vitest/dist/chunks/reporters.C_zwCd4j';
import { resolvablePromise } from '../promise/resolvablePromise';

describe("ExponentialBackoff", () => {
  it("should return the base with jitter on the first call", () => {
    const exponentialBackoff = new ExponentialBackoff(5000, 10000, 1000);
    const time = exponentialBackoff.backoff();

    expect(time).toBeGreaterThanOrEqual(5000);
    expect(time).toBeLessThanOrEqual(6000);
  });

  it('should use a random jitter within the specified limit', () => {
    const exponentialBackoff1 = new ExponentialBackoff(5000, 10000, 1000);
    const exponentialBackoff2 = new ExponentialBackoff(5000, 10000, 1000);

    const time = exponentialBackoff1.backoff();
    const time2 = exponentialBackoff2.backoff();

    expect(time).toBeGreaterThanOrEqual(5000);
    expect(time).toBeLessThanOrEqual(6000);

    expect(time2).toBeGreaterThanOrEqual(5000);
    expect(time2).toBeLessThanOrEqual(6000);

    expect(time).not.toEqual(time2);
  });

  it("should double the time when backoff() is called", () => {
    const exponentialBackoff = new ExponentialBackoff(5000, 20000, 1000);
    const time = exponentialBackoff.backoff();

    expect(time).toBeGreaterThanOrEqual(5000);
    expect(time).toBeLessThanOrEqual(6000);

    const time2 = exponentialBackoff.backoff();
    expect(time2).toBeGreaterThanOrEqual(10000);
    expect(time2).toBeLessThanOrEqual(11000);

    const time3 = exponentialBackoff.backoff();
    expect(time3).toBeGreaterThanOrEqual(20000);
    expect(time3).toBeLessThanOrEqual(21000);
  });

  it('should not exceed the max time', () => {
    const exponentialBackoff = new ExponentialBackoff(5000, 10000, 1000);
    const time = exponentialBackoff.backoff();
    expect(time).toBeGreaterThanOrEqual(5000);
    expect(time).toBeLessThanOrEqual(6000);

    const time2 = exponentialBackoff.backoff();
    expect(time2).toBeGreaterThanOrEqual(10000);
    expect(time2).toBeLessThanOrEqual(11000);

    const time3 = exponentialBackoff.backoff();
    expect(time3).toBeGreaterThanOrEqual(10000);
    expect(time3).toBeLessThanOrEqual(11000);
  });

  it('should reset the backoff time when reset() is called', () => {
    const exponentialBackoff = new ExponentialBackoff(5000, 10000, 1000);
    const time = exponentialBackoff.backoff();
    expect(time).toBeGreaterThanOrEqual(5000);
    expect(time).toBeLessThanOrEqual(6000);

    exponentialBackoff.reset();
    const time2 = exponentialBackoff.backoff();
    expect(time2).toBeGreaterThanOrEqual(5000);
    expect(time2).toBeLessThanOrEqual(6000);
  });
});


describe("IntervalTicker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should call the handler at the specified interval', async() => {
    const handler = vi.fn().mockResolvedValue(undefined);

    const intervalTicker = new IntervalTicker(2000);
    intervalTicker.onTick(handler);

    intervalTicker.start();

    await advanceTimersByTime(2000);
    expect(handler).toHaveBeenCalledTimes(1);
    await advanceTimersByTime(2000);
    expect(handler).toHaveBeenCalledTimes(2);
    await advanceTimersByTime(2000);
    expect(handler).toHaveBeenCalledTimes(3);
  });

  it('should call the handler with correct prevSuccess value', async() => {
    const handler = vi.fn().mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error())
      .mockResolvedValueOnce(undefined)
      .mockResolvedValue(undefined);

    const intervalTicker = new IntervalTicker(2000);
    intervalTicker.onTick(handler);

    intervalTicker.start();

    await advanceTimersByTime(2000);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toBe(true);

    await advanceTimersByTime(2000);
    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler.mock.calls[1][0]).toBe(true);

    await advanceTimersByTime(2000);
    expect(handler).toHaveBeenCalledTimes(3);
    expect(handler.mock.calls[2][0]).toBe(false);

    await advanceTimersByTime(2000);
    expect(handler).toHaveBeenCalledTimes(4);
    expect(handler.mock.calls[3][0]).toBe(true);
  });

  it('should backoff when the handler fails if backoffController is provided', async() => {
    const handler = vi.fn().mockRejectedValue(new Error());

    const backoffController = {
      backoff: vi.fn().mockReturnValue(1100),
      reset: vi.fn(),
    };

    const intervalTicker = new IntervalTicker(30000, backoffController);
    intervalTicker.onTick(handler);

    intervalTicker.start();

    await advanceTimersByTime(30000);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(backoffController.backoff).toHaveBeenCalledTimes(1);

    await advanceTimersByTime(1100);
    expect(handler).toHaveBeenCalledTimes(2);
    expect(backoffController.backoff).toHaveBeenCalledTimes(2);

    await advanceTimersByTime(1100);
    expect(handler).toHaveBeenCalledTimes(3);
    expect(backoffController.backoff).toHaveBeenCalledTimes(3);
  });

  it('should use the regular interval when the handler fails if backoffController is not provided', async() => {
    const handler = vi.fn().mockRejectedValue(new Error());

    const intervalTicker = new IntervalTicker(30000);
    intervalTicker.onTick(handler);

    intervalTicker.start();

    await advanceTimersByTime(30000);
    expect(handler).toHaveBeenCalledTimes(1);

    await advanceTimersByTime(10000);
    expect(handler).toHaveBeenCalledTimes(1);
    await advanceTimersByTime(20000);
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('should reset the backoffController after handler success', async () => {
    const handler = vi.fn().mockRejectedValueOnce(new Error)
      .mockRejectedValueOnce(new Error())
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);

    const backoffController = {
    
      backoff: vi.fn().mockReturnValue(1100),
      reset: vi.fn(),
    };

    const intervalTicker = new IntervalTicker(30000, backoffController);
    intervalTicker.onTick(handler);

    intervalTicker.start();

    await advanceTimersByTime(30000);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(backoffController.backoff).toHaveBeenCalledTimes(1);

    await advanceTimersByTime(1100);
    expect(handler).toHaveBeenCalledTimes(2);
    expect(backoffController.backoff).toHaveBeenCalledTimes(2);

    await advanceTimersByTime(1100);
    expect(handler).toHaveBeenCalledTimes(3);

    expect(backoffController.backoff).toHaveBeenCalledTimes(2); // backoff should not be called again
    expect(backoffController.reset).toHaveBeenCalledTimes(1); // reset should be called once

    await advanceTimersByTime(1100);
    expect(handler).toHaveBeenCalledTimes(3); // handler should be called after 30000ms
    await advanceTimersByTime(30000 - 1100);
    expect(handler).toHaveBeenCalledTimes(4); // handler should be called after 30000ms
  });


  it('should wait for handler promise to resolve before scheduling another tick', async() => {
    const ret = resolvablePromise();
    const handler = vi.fn().mockReturnValue(ret);

    const intervalTicker = new IntervalTicker(2000);
    intervalTicker.onTick(handler);

    intervalTicker.start();

    await advanceTimersByTime(2000);
    expect(handler).toHaveBeenCalledTimes(1);

    // should not schedule another call cause promise is pending
    await advanceTimersByTime(2000);
    expect(handler).toHaveBeenCalledTimes(1);
    await advanceTimersByTime(2000);
    expect(handler).toHaveBeenCalledTimes(1);

    ret.resolve(undefined);
    await ret.promise;

    // Advance the timers to the next tick
    await advanceTimersByTime(2000);
    // The handler should be called again after the promise has resolved
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('should not call the handler after stop is called', async() => {
    const ret = resolvablePromise();
    const handler = vi.fn().mockReturnValue(ret);

    const intervalTicker = new IntervalTicker(2000);
    intervalTicker.onTick(handler);

    intervalTicker.start();

    await advanceTimersByTime(2000);
    expect(handler).toHaveBeenCalledTimes(1);

    intervalTicker.stop();

    ret.resolve(undefined);
    await ret.promise;

    await advanceTimersByTime(2000);
    await advanceTimersByTime(2000);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
