import { BaseService, Service } from "../service";
import { Executor } from "../utils/executor/executor";
import { EventDispatcher, EventDispatcherResponse, EventV1Request } from "./eventDispatcher";
import { EventEmitter } from '../utils/event_emitter/event_emitter';
import { Consumer, Fn } from "../utils/type";
import { RunResult, runWithRetry } from "../utils/executor/backoff_retry_runner";
import { ExponentialBackoff } from "../utils/repeater/repeater";

export interface DispatchController extends Service {
  handleBatch(request: EventV1Request): Promise<unknown>
  onDispatch(handler: Consumer<EventV1Request>): Fn;
}

export type DispatchControllerConfig = {
  eventDispatcher: EventDispatcher;
}

class ImmediateDispatchDispatchController extends BaseService implements DispatchController {
  private eventDispatcher: EventDispatcher;
  private eventEmitter: EventEmitter<{ dispatch: EventV1Request }>;
  private runningTask: Map<string, RunResult<EventDispatcherResponse>> = new Map();
  private idGenerator: IdGenerator = new IdGenerator();

  constructor(config: DispatchControllerConfig) {
    super();
    this.eventDispatcher = config.eventDispatcher;
    this.eventEmitter = new EventEmitter();
  }

  onDispatch(handler: Consumer<EventV1Request>): Fn {
    return this.eventEmitter.on('dispatch', handler);
  }

  start(): void {
    throw new Error("Method not implemented.");
  }

  stop(): void {
    throw new Error("Method not implemented.");
  }

  async handleBatch(request: EventV1Request): Promise<unknown> {
    if (!this.isRunning()) {
      return;
    }

    const id = this.idGenerator.getId();

    const backoff = new ExponentialBackoff(1000, 30000, 2);
    const runResult = runWithRetry(() => this.eventDispatcher.dispatchEvent(request), backoff);

    this.runningTask.set(id, runResult);
    runResult.result.finally(() => {
      this.runningTask.delete(id);
    });

    return runResult.result;
  }
}
