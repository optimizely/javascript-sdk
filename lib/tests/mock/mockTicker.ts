import { vi } from 'vitest';

import { Ticker } from '../../utils/ticker/ticker';
import { AsyncTransformer } from '../../utils/type';

export class MockTicker implements Ticker {
  private handler?: AsyncTransformer<number, void>;

  start(immediateTick?: boolean): void {
  }

  stop(): void {
  }

  reset(): void {
  }

  onTick(handler: AsyncTransformer<number, void>): void {
    this.handler = handler;
  }

  pushTick(failureCount: number): void {
    this.handler?.(failureCount);
  }
}

export const getMockTicker = (): MockTicker => {
  const ticker = new MockTicker();
  vi.spyOn(ticker, 'start');
  vi.spyOn(ticker, 'stop');
  vi.spyOn(ticker, 'reset');
  return ticker;
}