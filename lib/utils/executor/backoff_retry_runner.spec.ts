import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { runWithRetry } from './backoff_retry_runner';
import { advanceTimersByTime } from  '../../../tests/testUtils';

const exhaustMicrotasks = async (loop = 100) => {
  for(let i = 0; i < loop; i++) {
    await Promise.resolve();
  }
}

describe('runWithRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return the result of the task if it succeeds in first try', async () => {
    const task = async () => 1;
    const { result } = runWithRetry(task);
    expect(await result).toBe(1);
  });

  it('should retry the task if it fails', async () => {
    let count = 0;
    const task = async () => {
      count++;
      if (count === 1) {
        throw new Error('error');
      }
      return 1;
    };
    const { result } = runWithRetry(task);
    
    await exhaustMicrotasks();
    await advanceTimersByTime(0);

    expect(await result).toBe(1);
  });

  it('should retry the task up to the maxRetries before failing', async () => {
    let count = 0;
    const task = async () => {
      count++;
      throw new Error('error');
    };
    const { result } = runWithRetry(task, undefined, 5);

    for(let i = 0; i < 5; i++) {
      await exhaustMicrotasks();
      await advanceTimersByTime(0);
    }

    try {
      await result;
    } catch (e) {
      expect(count).toBe(6);
    }
  });

  it('should retry idefinitely if maxRetries is undefined', async () => {
    let count = 0;
    const task = async () => {
      count++;
      if (count < 500) {
        throw new Error('error');
      }
      return 1;
    };

    const { result } = runWithRetry(task);

    for(let i = 0; i < 500; i++) {
      await exhaustMicrotasks();
      await advanceTimersByTime(0);
    }
    expect(await result).toBe(1);
    expect(count).toBe(500);
  });

  it('should use the backoff controller to delay retries', async () => {
    const task = vi.fn().mockImplementation(async () => {
      throw new Error('error');
    });

    const delays = [7, 13, 19, 20, 27];
    
    let backoffCount = 0;
    const backoff = {
      backoff: () => {
        return delays[backoffCount++];
      },
      reset: () => {},
    };

    const { result } = runWithRetry(task, backoff, 5);
    result.catch(() => {});

    expect(task).toHaveBeenCalledTimes(1);

    for(let i = 1; i <= 5; i++) {
      await exhaustMicrotasks();
      await advanceTimersByTime(delays[i - 1] - 1);
      expect(task).toHaveBeenCalledTimes(i);
      await advanceTimersByTime(1);
      expect(task).toHaveBeenCalledTimes(i + 1);
    }
  });

  it('should cancel the retry if the cancel function is called', async () => {
    let count = 0;
    const task = async () => {
      count++;
      throw new Error('error');
    };

    const { result, cancelRetry } = runWithRetry(task, undefined, 100);

    for(let i = 0; i < 5; i++) {
      await exhaustMicrotasks();
      await advanceTimersByTime(0);
    }
    
    cancelRetry();

    for(let i = 0; i < 100; i++) {
      await exhaustMicrotasks();
      await advanceTimersByTime(0);
    }

    try {
      await result;
    } catch (e) {
      expect(count).toBe(6);
    }
  });
});
