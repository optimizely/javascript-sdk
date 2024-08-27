import { Fn } from "../type";

export interface Timer {
  start(): void;
  resetAction(action: Fn): void;
  resetTimeout(timeout: number): void;
  stop(): void; 
}

class TimerImpl implements Timer {
  private timeout: number;
  private action: Fn;
  private timeoutId?: NodeJS.Timeout;

  constructor(action: Fn, timeout: number) {
    this.timeout = timeout;
    this.action = action;
  }

  resetAction(action: Fn) {
    this.action = action;
  }

  resetTimeout(timeout: number) {
    this.timeout = timeout;
  }

  start(): void {
    this.timeoutId = setTimeout(this.action, this.timeout);
  }

  stop(): void {
    clearTimeout(this.timeoutId);
  }
}
