const enums = {
  modes: {
    POLL: 'poll',
    PUSH: 'push',
  },

  // Possible directives for `getAsync`; only meaningful when mode === POLL.
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
};

exports.enums = enums;

exports.ConfigCache = class ConfigCache {
  constructor({
    mode = enums.modes.PUSH,

    // The following two params are only used if mode === POLL.
    onGetAsync = () => enums.refreshDirectives.YES_DONT_AWAIT,
    intervalPeriod = 5000,
  }) {
    if (mode === enums.modes.PUSH) {
      throw new Error('enums.modes.PUSH is not implemented yet; use POLL instead');
    }

    // Map key -> { value, lastModified, pendingPromise: Promise= }
    this.cache = {};

    this.intervalPeriod = intervalPeriod;
  }

  /**
   * Add an entry to the cache, which will be maintained fresh per the cache's
   * synchronization mechanism. If called with an inital value, that value can be read
   * back via `get` synchronously after this method returns.
   *
   * No effect if a cached value already exists for the given key.
   *
   * @param {string} configKey
   *        The config to add to the cache.
   * @param {Config} initialValue
   *        An initial value to put in the cache, enabling immediate use of `get`.
   */
  seed(configKey, initialValue) {
    // Entry already exists and has a value => no-op.
    if (this.get(configKey)) {
      return;
    }

    // Pending entries => just set the initial value, if one was given.
    if (this.__isPending(configKey)) {
      this.cache[configKey] = initialValue;
      return;
    }

    // Never-before-seen configKey => make a new entry
    this.cache[configKey] = {
      value: initialValue,
      lastModified: Date.now(),
    };

    return;
  }

  /**
   * @returns {boolean}
   *        True iff the cache is aware of the key and has a sync in progress.
   */
  __isPending(configKey) {
    return this.cache[configKey] && this.cache[configKey].pendingPromise;
  }

  /**
   * Synchronous cache access. 
   * Main use case: After the cache is warm, to quickly get configs.
   *
   * @param {string} configKey
   * @returns {Config=}
   *        If cache hit, the value from cache.
   *        Otherwise, null.
   */
  get(configKey) {
    if (this.cache[configKey] && this.cache[configKey].value) {
      return this.cache[configKey].value;
    } else {
      return null;
    }
  }

  /**
   * The thing to use if you're willing to risk added latency from network I/O for
   * (generally) surely getting _some_ revision of the requested config.
   * Main use case: 
   *
   * @param {string} configKey
   * @param {refreshDirective=} override
   *        If defined, overrides this.onGetAsync's directive.
   * @param {number=} timeout
   *        How long to wait for a response, if refreshing.
   * @returns {Promise<Client, Error>}
   *        If mode === POLL, fulfills ASAP in accord with the result of `onGetAsync` or
   *          the given override.
   *        If mode === PUSH, fulfills ASAP after at least one whole config has been received.
   *        In both modes, rejects on network or timeout error.
   */
  async getAsync(configKey, override, timeout = 5000) {
    const currentEntry = this.cache[configKey];

    // In all cases, a cache miss means awaiting until a value is obtained.
    if (!currentEntry) {
      await this.refreshWithPull(configKey);
      return this.cache[configKey];
    }

    // Cache hit! But depending on the onGetAsync-computed directive (or a provided
    // override), we may do different things.
    const directive = override || this.onGetAsync(configKey, currentEntry);

    switch (directive) {
      case enums.refreshDirectives.ONLY_IF_CACHE_MISS:
        return Promise.resolve(this.get(configKey));

      case enums.refreshDirectives.YES_DONT_AWAIT:
        this.refreshWithPull(configKey);
        return this.get(configKey);

      case enums.refreshDirectives.YES_AWAIT:
        await this.refreshWithPull(configKey);
        return this.get(configKey);
    }
  }

  // Register subscribers to events named after config keys, to be invoked on entry update
  // with the old, new, and metadata values of the entry.
  on(configKey, fn) {
    throw new Error('Not yet implemented');
  }

  async __refreshWithPull(configKey) {
    // request from CDN and store in cache
  }
}

const LazyConfigCache = () => new ConfigCache({
  mode: enums.modes.POLL,
  onGetAsync: () => enums.refreshDirectives.ONLY_IF_CACHE_MISS,
});

const StaleWhileRevalidateConfigCache = () => new ConfigCache({
  mode: enums.modes.POLL,
  onGetAsync: () => enums.refreshDirectives.YES_DONT_AWAIT,
});

const StronglyConsistentConfigCache = () => new ConfigCache({
  mode: enums.modes.POLL,
  onGetAsync: () => enums.refreshDirectives.YES_AWAIT,
});

