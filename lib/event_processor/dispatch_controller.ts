import { BaseService, Service } from "../service";
import { Executor } from "../utils/executor/executor";
import { EventDispatcher, EventV1Request } from "./eventDispatcher";
import { Cache } from "../utils/cache/cache";
import { EventEmitter } from '../utils/event_emitter/event_emitter';
import { Consumer, Fn } from "../utils/type";

export interface DispatchController extends Service {
  handleBatch(request: EventV1Request): Promise<unknown>
  onDispatch(handler: Consumer<EventV1Request>): Fn;
}

export type EventRequestWithId = {
  id: string;
  event: EventV1Request;
};

export type DispatchControllerConfig = {
  eventDispatcher: EventDispatcher;
  executor: Executor;
  requestStore?: Cache<EventRequestWithId>;
}

class DispatchControllerImpl extends BaseService implements DispatchController {
  private eventDispatcher: EventDispatcher;
  private executor: Executor;
  private eventEmitter: EventEmitter<{ dispatch: EventV1Request }>;

  constructor(config: DispatchControllerConfig) {
    super();
    this.eventDispatcher = config.eventDispatcher;
    this.executor = config.executor;
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
    const executorResponse = this.executor.submit(() => {
      const dispatchRes = this.eventDispatcher.dispatchEvent(request);
      this.eventEmitter.emit('dispatch', request);
      return dispatchRes;
    });

    if (executorResponse.accepted) {
      return executorResponse.result;
    }

    return Promise.reject(executorResponse.error);
  }
}
