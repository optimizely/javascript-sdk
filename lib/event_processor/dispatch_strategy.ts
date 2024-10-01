import { ExponentialBackoff } from '../utils/repeater/repeater';
import { AsyncProducer } from '../utils/type';

export interface DispatchStrategy {
  close(): void;
  registerDispatcher(dispatcher: AsyncProducer<boolean>): void;
  notifyBatch(): void;
}

enum State {
  Idle,
  BackingOff,
  Dispatching,
}

export class BackoffDispatchStrategy implements DispatchStrategy {
  private dispatcher: AsyncProducer<boolean>;
  private backoff: ExponentialBackoff;
  private state: State = State.Idle;

  constructor(backoff: ExponentialBackoff) {
    this.backoff = backoff;
  }

  public stop(): void {
  }

  private async executeDispatcher(): Promise<void> {
    this.state = State.Dispatching;
    this.dispatcher().then((hasMoreBatches) => {
      this.state = State.Idle;
      this.backoff.reset();
      if (hasMoreBatches) {
        this.executeDispatcher();
      }
    }).catch((err) => {
      this.state = State.BackingOff;
      setTimeout(() => {
        this.executeDispatcher();
      }, this.backoff.backoff());
    });
  }

  public registerDispatcher(dispatcher: AsyncProducer<boolean>): void {
    this.dispatcher = dispatcher;
  }

  public notifyBatch(): void {
    if (this.state !== State.Idle) {
      return;
    }

    this.executeDispatcher();
  }
}
