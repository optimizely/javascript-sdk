import { SyncCache } from "./cache";

export interface LRUCacheConfig {
  maxSize: number;
  ttl: number;
}

export class InMemoryLruCache<V> implements SyncCache<V> {
  private data: Map<String, CacheElement<V>> = new Map();
  private _maxSize; // Defines maximum size of _map
  private _timeout; // Milliseconds each entry has before it becomes stale

  get map(): Map<K, CacheElement<V>> {
    return this._map;
  }

  get maxSize(): number {
    return this._maxSize;
  }

  get timeout(): number {
    return this._timeout;
  }

  constructor({ maxSize, timeout }: LRUCacheConfig) {
    const logger = getLogger();

    logger.debug(`Provisioning cache with maxSize of ${maxSize}`);
    logger.debug(`Provisioning cache with timeout of ${timeout}`);

    this._maxSize = maxSize;
    this._timeout = timeout;
  }

  /**
   * Returns a valid, non-stale value from LRU Cache based on an input key.
   * Additionally moves the element to the end of the cache and removes from cache if stale.
   */
  lookup(key: K): V | null {
    if (this._maxSize <= 0) {
      return null;
    }

    const element: CacheElement<V> | undefined = this._map.get(key);

    if (!element) return null;

    if (element.is_stale(this._timeout)) {
      this._map.delete(key);
      return null;
    }

    this._map.delete(key);
    this._map.set(key, element);

    return element.value;
  }

  /**
   * Inserts/moves an input key-value pair to the end of the LRU Cache.
   * Removes the least-recently used element if the cache exceeds it's maxSize.
   */
  save({ key, value }: { key: K; value: V }): void {
    if (this._maxSize <= 0) return;

    const element: CacheElement<V> | undefined = this._map.get(key);
    if (element) this._map.delete(key);
    this._map.set(key, new CacheElement(value));

    if (this._map.size > this._maxSize) {
      const firstMapEntryKey = this._map.keys().next().value;
      this._map.delete(firstMapEntryKey);
    }
  }

  /**
   * Clears the LRU Cache
   */
  reset(): void {
    if (this._maxSize <= 0) return;

    this._map.clear();
  }

  /**
   * Reads value from specified key without moving elements in the LRU Cache.
   * @param {K} key
   */
  peek(key: K): V | null {
    if (this._maxSize <= 0) return null;

    const element: CacheElement<V> | undefined = this._map.get(key);

    return element?.value ?? null;
  }
}

export interface ISegmentsCacheConfig {
  DEFAULT_CAPACITY: number;
  DEFAULT_TIMEOUT_SECS: number;
}

export default LRUCache;
