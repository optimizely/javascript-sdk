import { BaseService, Service } from "../service";
import { Executor } from "../utils/executor/executor";
import { EventDispatcher, EventV1Request } from "./eventDispatcher";
import { Cache } from "../utils/cache/cache";

export interface DispatchController extends Service {
  handleBatch(request: EventV1Request): Promise<unknown>
}

class DispatchControllerImpl extends BaseService implements DispatchController {
  private eventDispatcher: EventDispatcher;
  private executor: Executor;
  private cache: Cache<EventV1Request>;

  start(): void {
    throw new Error("Method not implemented.");
  }

  stop(): void {
    throw new Error("Method not implemented.");
  }

  getId(): string {
    throw new Error("Method not implemented.");
  }

  async addRequest(request: EventV1Request): Promise<void> {
    const id = this.getId();
    await this.cache.set(id, request);
    await this.executor.execute(() => this.eventDispatcher.dispatch(request));
  }
}
