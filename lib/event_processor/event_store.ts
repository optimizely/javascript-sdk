import { EventWithId } from "./batch_event_processor";
import { AsyncPrefixStore, OpStore, Store, SyncPrefixStore } from "../utils/cache/store";
import { Maybe, OpType, OpValue } from "../utils/type";

type StoredEvent = EventWithId & {
  storedAt?: number;
};

export class EventStore<OP extends OpType> implements OpStore<OP, EventWithId> {
  private store: OpStore<OP, StoredEvent>;
  readonly operation: OP;
  private keysSet?: Set<string>;

  constructor(store: OpStore<OP, EventWithId>) {
    if (store.operation === 'sync') {
      this.store = new SyncPrefixStore(store as OpStore<'sync', EventWithId>, 'optly_event:', a => a, a => a) as unknown as OpStore<OP, StoredEvent>;
    } else {
      this.store = new AsyncPrefixStore(store as OpStore<'async', EventWithId>, 'optly_event:', a => a, a => a) as unknown as OpStore<OP, StoredEvent>;
    }

    this.operation = store.operation;
  }

  set(key: string, value: EventWithId): OpValue<OP, unknown> {
    throw new Error("Method not implemented.");
  }

  get(key: string): OpValue<OP, Maybe<EventWithId>> {
    throw new Error("Method not implemented.");
  }

  remove(key: string): OpValue<OP, unknown> {
    throw new Error("Method not implemented.");
  }

  getKeys(): OpValue<OP, string[]> {
    throw new Error("Method not implemented.");
  }  
}
