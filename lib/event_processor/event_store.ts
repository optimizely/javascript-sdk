import { OptimizelyError } from "../error/optimizly_error";
import { LoggerFacade } from "../logging/logger";
import { EVENT_STORE_FULL } from "error_message";
import {
  AsyncPrefixStore,
  AsyncStore, 
  AsyncStoreWithBatchedGet, 
  Store,
  StoreWithBatchedGet,
  SyncPrefixStore
} from "../utils/cache/store";
import { SerialRunner } from "../utils/executor/serial_runner";
import { Maybe } from "../utils/type";
import { EventWithId } from "./batch_event_processor";

export type StoredEvent = EventWithId & {
  _time?: {
    storedAt: number;
    ttl: number;
  };
};

const identity = <T>(v: T): T => v;

const LOGGER_NAME = 'EventStore';
export const DEFAULT_MAX_EVENTS_IN_STORE = 500;
export const DEFAULT_STORE_TTL = 10 * 24 * 60 * 60 * 1000; // 10 days

export const EVENT_STORE_PREFIX = 'optly_event:';

export type EventStoreConfig = {
  maxSize?: number;
  ttl?: number,
  store: Store<EventWithId>,
  logger?: LoggerFacade,
};

export class EventStore extends AsyncStoreWithBatchedGet<EventWithId> implements AsyncStore<EventWithId> {
  readonly operation = 'async';

  private store: StoreWithBatchedGet<StoredEvent>;
  private serializer: SerialRunner = new SerialRunner();
  private logger?: LoggerFacade;
  private maxSize: number;
  private ttl: number;
  private keys?: Set<string>;

  constructor(config: EventStoreConfig) {
    super();

    const {
      maxSize,
      ttl,
      store,
      logger
    } = config;

    if (store.operation === 'sync') {
      this.store = new SyncPrefixStore(store, EVENT_STORE_PREFIX, identity, identity);
    } else {
      this.store = new AsyncPrefixStore(store, EVENT_STORE_PREFIX, identity, identity);
    }

    if (logger) {
      logger.setName(LOGGER_NAME);
      this.logger = logger;
    }

    this.maxSize = maxSize || DEFAULT_MAX_EVENTS_IN_STORE;    
    this.ttl = ttl || DEFAULT_STORE_TTL;
  }

  private async readKeys() {
    return this.serializer.run(async () => {
      if (this.keys !== undefined) {
        return;
      }

      try {
        this.keys = new Set(await this.getKeys());
      } catch (err) {
        this.logger?.error(err);
      }
    });
  }

  async set(key: string, event: EventWithId): Promise<unknown> {
    await this.readKeys();

    // readKeys might have failed, in that case we cannot enforce max size
    // that means, the store might grow beyond max size in failure scenarios
    if (this.keys !== undefined && this.keys.size >= this.maxSize) {
      return Promise.reject(new OptimizelyError(EVENT_STORE_FULL, event.event.uuid));
    }

    // this.store.set() might fail and cause the in memory set of keys to 
    // diverge from the actual stored key list. But the in memory set needs
    // to be updated before the store set to limit the eventCount
    // when concurrent set are present. Even if the store set fails, it will 
    // still keep the stored event count below maxSize (it will underfill the store).
    // next getKeys() should fix the discrepency. 
    this.keys?.add(key);
    return this.store.set(key, { ...event, _time: { storedAt: Date.now(), ttl: this.ttl } });
  }

  private processStoredEvent(key: string, value: StoredEvent | undefined): Maybe<EventWithId> {
    if (!value) return undefined;

    // if there is events in the stored saved by old version of the sdk, 
    // they will not have the storedAt time, update them with the current time
    // before returning

    if (value._time === undefined) {
      value._time = { storedAt: Date.now(), ttl: this.ttl };
      this.set(key, value).catch(() => {});
      return value;
    }

    // use the ttl of the current store even if the stored event has a different ttl
    // this ensures that if the store ttl is reduced, old events will also expire sooner
    // and if the store ttl is increased, old events will stay longer
    // the ttl at the time of save is still stored with the event for potential future use
    if (value._time.storedAt + this.ttl <= Date.now()) {
      this.remove(key).catch(() => {});
      return undefined;
    }

    return value;
  }

  async get(key: string): Promise<EventWithId | undefined> {
    const value = await this.store.get(key);
    
    return this.processStoredEvent(key, value);
  }

  async remove(key: string): Promise<unknown> {
    await this.store.remove(key);
    this.keys?.delete(key);
    return;
  }

  async getKeys(): Promise<string[]>{
    const keys = await this.store.getKeys();
    this.keys = new Set(keys);
    return keys;
  }

  async getBatched(keys: string[]): Promise<Maybe<EventWithId>[]> {
    const values = await this.store.getBatched(keys);
    return values.map((value, index) => this.processStoredEvent(keys[index], value));
  }
}
