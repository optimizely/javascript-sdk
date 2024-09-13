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

export const getMockRepeater = () => {
  const mock = {
    handler: undefined as any,
    start: vi.fn(),
    stop: vi.fn(),
    reset: vi.fn(),
    setTask(handler: AsyncTransformer<number, void>) {
      this.handler = handler;
    },
    execute(failureCount: number): Promise<void> {
      const ret = this.handler?.(failureCount);
      ret?.catch(() => {});
      return ret;
    },
  };
  return mock;
}
