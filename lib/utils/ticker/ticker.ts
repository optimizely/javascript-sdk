import exp from "constants";
import { AsyncTransformer, AsyncProducer } from "../type";

export interface Ticker {
  start(): void;
  stop(): void;
  onTick(handler: AsyncTransformer<boolean, void>): void;
}

export interface BackoffController {
  backoff(): number;
  reset(): void;
}

export class ExponentialBackoff implements BackoffController {
  private base: number;
  private max: number;
  private current: number;
  private maxJitter: number;

  constructor(base: number, max: number, maxJitter: number) {
    this.base = base;
    this.max = max;
    this.maxJitter = maxJitter;
    this.current = base;
  }

  backoff() {
    this.current = Math.min(this.current * 2, this.max);
    return this.current + this.maxJitter * Math.random();
  }

  reset() {
    this.current = this.base;
  }
}

export class IntervalTicker implements Ticker {
  private timeoutId?: NodeJS.Timeout;
  private handler?: AsyncTransformer<boolean, void>;
  private interval: number;
  private prevSuccess: boolean = true;
  private backoffController?: BackoffController;

  constructor(interval: number, backoffController?: BackoffController) {
    this.interval = interval;
    this.backoffController = backoffController;
  }

  private setTimer(timeout: number) {
    this.timeoutId = setTimeout(() => {
      if(!this.handler) return;
      this.handler(this.prevSuccess).then(() => {
        this.prevSuccess = true;
        this.backoffController?.reset();
        this.setTimer(this.interval);
      }, () => {
        this.prevSuccess = false;
        let time = this.backoffController?.backoff() ?? this.interval;
        this.setTimer(time);
      });
    }, timeout);
  }

  start(): void {
    this.setTimer(this.interval);
  }

  stop(): void {
    clearInterval(this.timeoutId);
  }

  onTick(handler: AsyncTransformer<boolean, void>) {
    this.handler = handler;
  }
}
