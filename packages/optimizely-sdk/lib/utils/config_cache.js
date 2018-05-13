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
};

exports.enums = enums;

/**
 * A ConfigCache that syncs by polling the CDN.
 */
exports.PollingConfigCache = class PollingConfigCache {
  constructor({
    // An async function (url: string, headers: Object) => Promise<{headers, body}, Error> to make HTTP requests.
    requester,
    // A function that decides how to handle `getAsync` calls.
    onGetAsync = () => enums.refreshDirectives.YES_AWAIT,
    // The period of the polling, in ms.
    pollPeriod = 5000,
  } = {}) {
    Object.assign(this, { requester, onGetAsync, pollPeriod });

    // Map key -> { value, lastModified, pendingPromise, headers }
    this.cache = {};
    // Map key -> Array<function>
    this.listeners = {};
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
      this.cache[configKey].value = initialValue;
      return;
    }

    // Never-before-seen configKey => make a new entry.
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
   * Use this after the cache is warm to quickly get configs.
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
   *
   * @param {string} configKey
   * @param {refreshDirective=} override
   *        If defined, overrides this.onGetAsync's directive.
   * @param {number=} timeout
   *        How long to wait for a response, if refreshing.
   * @returns {Promise<Client, Error>}
   *        Fulfills ASAP in accord with the result of `onGetAsync` or the given override.
   *        Rejects on network error or timeout.
   */
  async getAsync(configKey, override, timeout = 5000) {
    const currentEntry = this.cache[configKey];

    if (!this.get('configKey')) {
      // In all cases, a cache miss means awaiting until a value is obtained.
      await this.__refresh(configKey, timeout);
      return this.cache[configKey].value;
    }

    // Cache hit! But depending on the onGetAsync-computed directive (or a provided
    // override), we may do different things.
    const directive = override || this.onGetAsync(configKey, currentEntry);

    switch (directive) {
      case enums.refreshDirectives.ONLY_IF_CACHE_MISS:
        return Promise.resolve(this.get(configKey));

      case enums.refreshDirectives.YES_DONT_AWAIT:
        this.__refresh(configKey, timeout);
        return this.get(configKey);

      case enums.refreshDirectives.YES_AWAIT:
        await this.__refresh(configKey, timeout);
        return this.get(configKey);
    }
  }

  // Register subscribers to events named after config keys, to be invoked on entry update
  // with the old, new, and metadata values of the entry.
  on(configKey, fn) {
    if (!this.listeners[configKey]) {
      this.listeners[configKey] = [];
    }

    this.listeners[configKey].push(fn);
  }

  /**
   * Form the headers to send with a subsequent request, based on those from a
   * previous response.
   */
  __getNextReqHeaders(resHeaders) {
    // Normalize the casing of headers.
    const lowercaseResHeaders = {};
    for (let header in resHeaders) {
      lowercaseResHeaders[header.toLowerCase()] = resHeaders[header];
    }

    return {
      'If-None-Match': lowercaseResHeaders['etag'],
      'If-Modified-Since': lowercaseResHeaders['last-modified'],
    };
  }

  /**
   * Kick off a request, marking an entry as pending along the way. Idempotent.
   *
   * @param {string} configKey
   * @param {number} timeout
   *        How long to wait for a response from the CDN before resolving in rejection, in ms.
   * @returns {Promise}
   *        Rejects with fetch or timeout errors.
   *        Fulfills otherwise, with a boolean indicating whether the config was updated.
   */
  async __refresh(configKey, timeout) {
    // Idempotency: An entry has at most one pending request at any moment.
    if (this.__isPending(configKey)) {
      return this.cache[configKey].pendingPromise;
    }

    // TODO: Do something with timeout, maybe.

    // Ensure there's an entry to mark pending at all.
    if (!this.cache[configKey]) {
      this.cache[configKey] = {};
    }

    // For now, let configKeys be URLs to configs.
    console.log('Requesting with headers', this.cache[configKey].headers || {})
    const start = Date.now();
    const request = this.requester(configKey, this.cache[configKey].headers || {});

    this.cache[configKey].pendingPromise = request;

    const response = await request;
    const end = Date.now();

    if (response.statusCode === 304) {
      console.log('Not modified');
      this.cache[configKey].pendingPromise = null;
      return false;
    }

    // TODO: Status codes other than 200 and 304?

    const oldEntry = this.cache[configKey];
    const newEntry = {
      value: response.body,
      lastModified: Date.now(),
      pendingPromise: null,
      headers: this.__getNextReqHeaders(response.headers),
    };

    this.cache[configKey] = newEntry;

    this.__emit(configKey, newEntry, { start, end });

    console.log('Refreshed');
    return true;
  }

  __emit(eventName, ...args) {
    for (let fn of this.listeners[eventName] || []) {
      fn(...args);
    }
  }

  // TODO: Add interval on first entry, and #clear (which also kills interval)
}

const LazyConfigCache = () => new PollingConfigCache({
  onGetAsync: () => enums.refreshDirectives.ONLY_IF_CACHE_MISS,
});

const StaleWhileRevalidateConfigCache = () => new PollingConfigCache({
  onGetAsync: () => enums.refreshDirectives.YES_DONT_AWAIT,
});

const StronglyConsistentConfigCache = () => new PollingConfigCache({
  onGetAsync: () => enums.refreshDirectives.YES_AWAIT,
});

