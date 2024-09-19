import { vi } from 'vitest';

import { Repeater } from '../../utils/repeater/repeater';
import { AsyncTransformer } from '../../utils/type';

export class MockRepeater implements Repeater {
  private handler?: AsyncTransformer<number, void>;

  start(): void {
  }

  stop(): void {
  }

  reset(): void {
  }

  setTask(handler: AsyncTransformer<number, void>): void {
    this.handler = handler;
  }

  pushTick(failureCount: number): void {
    this.handler?.(failureCount);
  }
}

//ignore ts no return type error
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const getMockRepeater = () => {
  const mock = {
    isRunning: false,
    handler: undefined as any,
    start: vi.fn(),
    stop: vi.fn(),
    reset: vi.fn(),
    setTask(handler: AsyncTransformer<number, void>) {
      this.handler = handler;
    },
    // throw if not running. This ensures tests cannot 
    // do mock exection when the repeater is supposed to be not running.
    execute(failureCount: number): Promise<void> {
      if (!this.isRunning) throw new Error();
      const ret = this.handler?.(failureCount);
      ret?.catch(() => {});
      return ret;
    },
  };
  mock.start.mockImplementation(() => mock.isRunning = true);
  mock.stop.mockImplementation(() => mock.isRunning = false);
  return mock;
}
