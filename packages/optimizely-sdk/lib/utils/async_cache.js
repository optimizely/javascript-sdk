const enums = {
  // Possible directives for `getAsync`.
  // In all variants, a cache miss => await and fulfill with the refreshed entry.
  refreshDirectives: {
    // On hit, fulfill with the cached entry.
    ONLY_IF_CACHE_MISS: 'only',

    // On hit, fulfill with cached entry and asynchronously refresh the cache,
    // akin to 'stale-while-revalidate'.
    YES_DONT_AWAIT: 'dontawait',

    // On hit, await and fulfill with the refreshed entry.
    YES_AWAIT: 'await',
  },

  // Use a plain object as a unique value, against which to compare strict equality.
  // Symbols were invented for this purpose, but those are non-transpilable ES2015.
  UNCHANGED: {},
};

exports.enums = enums;

/**
 * A read-through cache for any kinds of values which require async work to refresh.
 * AsyncCache...
 *   - lets you synchronously seed a cache entry with a given value,
 *   - offers configurable semantics for async entry access, and
 *   - ensures at most one pending refresh per entry at a time.
 *
 * It is an abstract class; implementations must define at least two extra methods,
 * lest things blow up:
 *   1) __refresh, a function (key, currentValue) => Promise<value>
 *   2) __onGetAsync, which decides how to handle `getAsync` calls.
 *
 * Additionally, concrete subclasses may invoke __execRefresh(key) to trigger the
 * refresh of an entry.
 */
exports.AsyncCache = class AsyncCache {
  constructor() {
    // Map key -> { value, lastModified, pendingPromise }
    this.cache = {};
    // Map key -> Array<function>
    this.listeners = {};

    // TODO: Fail fast if extra methods aren't defined.
  }

  /**
   * Seed a cache entry with an initial value.
   * The entry will then be maintained fresh via the cache's synchronization mechanism.
   * The given inital value can be read back via `get` synchronously after this method returns.
   *
   * If you want to seed the cache but don't have access to a value (say, from localStorage
   * or the filesystem), then you're probably looking to fetch it from the network.
   * `cache.getAsync(key)` is what you want to do then.
   *
   * No effect if a cached value already exists for the given key.
   *
   * @param {string} key
   *        The new entry to add to the chace.
   * @param {Config} initialValue
   *        An initial value to put in the cache, enabling immediate use of `get`.
   */
  seed(key, initialValue) {
    // Entry already exists and has a value => no-op.
    if (this.get(key)) {
      return;
    }

    // Pending entries => just set the initial value, if one was given.
    if (this.__isPending(key)) {
      this.__set(key, initialValue, false);
      return;
    }

    // Never-before-seen key => make a new entry.
    this.__set(key, initialValue);

    return;
  }

  /**
   * @returns {boolean}
   *        True iff the cache is aware of the key and has a sync in progress.
   */
  __isPending(key) {
    return this.cache[key] && this.cache[key].pendingPromise;
  }

  /**
   * Synchronous cache access. 
   * Use this after the cache is warm to quickly get values.
   *
   * @param {string} key
   * @returns {*=}
   *        If cache hit, the value from cache.
   *        Otherwise, null.
   */
  get(key) {
    if (this.cache[key] && this.cache[key].value) {
      return this.cache[key].value;
    } else {
      return null;
    }
  }

  __set(key, value, clearPending = true) {
    // Ensure there's an entry to set at all.
    if (!this.cache[key]) {
      this.cache[key] = {};
    }

    const entry = this.cache[key];

    entry.value = value;
    entry.lastModified = Date.now();

    if (clearPending) {
      entry.pendingPromise = null;
    }
  }

  /**
   * The thing to use if you're willing to risk added latency from I/O for (generally)
   * surely getting _some_ value.
   *
   * @param {string} key
   * @param {refreshDirective=} override
   *        If defined, overrides this.__onGetAsync's directive.
   * @returns {Promise<Client, Error>}
   *        Fulfills ASAP in accord with the result of `__onGetAsync` or the given override.
   *        Rejects on refresh error.
   */
  async getAsync(key, override) {
    if (!this.get(key)) {
      // In all cases, a cache miss means awaiting until a value is obtained.
      await this.__execRefresh(key);
      return this.get(key);
    }

    const currentEntry = this.cache[key];

    // Cache hit! But depending on the __onGetAsync-computed directive (or a provided
    // override), we may do different things.
    const directive = override || this.__onGetAsync(key, currentEntry);

    switch (directive) {
      case enums.refreshDirectives.ONLY_IF_CACHE_MISS:
        return Promise.resolve(this.get(key));

      case enums.refreshDirectives.YES_DONT_AWAIT:
        this.__execRefresh(key);
        return this.get(key);

      case enums.refreshDirectives.YES_AWAIT:
        await this.__execRefresh(key);
        return this.get(key);
    }
  }

  /**
   * Kick off a refresh, marking an entry as pending along the way. Idempotent.
   *
   * @param {string} key
   * @returns {Promise}
   *        Rejects with refresh error.
   *        Fulfills otherwise, with a boolean indicating whether the config was updated.
   */
  async __execRefresh(key) {
    // Idempotency: An entry has at most one pending request at any moment.
    if (this.__isPending(key)) {
      return this.cache[key].pendingPromise;
    }

    // Ensure there's an entry to mark pending at all.
    if (!this.cache[key]) {
      this.cache[key] = {};
    }

    // For now, let keys be URLs to configs.
    const request = this.__refresh(key, this.cache[key].value);

    this.cache[key].pendingPromise = request;

    const value = await request;

    if (value === enums.UNCHANGED) {
      console.log('Not modified');
      this.cache[key].pendingPromise = null;
      return enums.UNCHANGED;
    }

    this.__set(key, value);
    this.__emit(key, value);

    return value;
  }

  __emit(eventName, ...args) {
    for (let fn of this.listeners[eventName] || []) {
      fn(...args);
    }
  }

  /**
   * Register subscribers to events named after keys, to be invoked on entry update
   * with the old, new, and metadata values of the entry.
   */
  on(key, fn) {
    if (!this.listeners[key]) {
      this.listeners[key] = [];
    }

    this.listeners[key].push(fn);
  }

  /**
   * Invoke listeners that are subscribed to the given event.
   */
  __emit(eventName, ...args) {
    for (let fn of this.listeners[eventName] || []) {
      fn(...args);
    }
  }
}

