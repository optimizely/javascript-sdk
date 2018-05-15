const { AsyncCache, enums } = require('./async_cache');

/**
 * A ConfigCache that syncs by polling the CDN.
 *
 * Parametrized by which requester to use as a default, since Node.js and browser
 * environments have different defaults.
 */
exports.PollingConfigCache = (defaultRequester) => class PollingConfigCache extends AsyncCache {
  constructor({
    // An async function (url: string, headers: Object) => Promise<{headers, body}, Error> to make HTTP requests.
    requester = defaultRequester,
    // A function that decides how to handle `getAsync` calls.
    onGetAsync = () => enums.refreshDirectives.YES_AWAIT,
    // The period of the polling, in ms.
    pollPeriod = 5000,
  } = {}) {

    super();
    this.__onGetAsync = onGetAsync;

    Object.assign(this, { requester, pollPeriod });
    this.__tracked = {};
  }

  __intervalFn() {
    for (let configId in this.__tracked) {
      this.__execRefresh(configId);
    }
  }

  __ensureIsTracked(configKey) {
    this.__tracked[configKey] = true;
    this.__ensureIntervalIsRunning();
  }

  __ensureIntervalIsRunning() {
    if (!this.__intervalId) {
      // Methods aren't bound to the class in which they're defined, surprisingly.
      // Without this .bind, the context is the global object!
      this.__intervalId = setInterval(this.__intervalFn.bind(this), this.pollPeriod);
    }
  }

  /**
   * Kick off a request, marking an entry as pending along the way.
   *
   * @param {string} configKey
   * @returns {Promise}
   *        Rejects with fetch or timeout errors.
   *        Fulfills otherwise, with a boolean indicating whether the config was updated.
   */
  async __refresh(configKey, currentValue = {}) {
    // For now, let configKeys be URLs to configs.
    const headers = currentValue.headers || {};
    console.log('Requesting with headers', headers);

    const response = await this.requester(configKey, headers);

    this.__ensureIsTracked(configKey);

    if (response.statusCode === 304) {
      return enums.UNCHANGED;
    }

    // TODO: Status codes other than 200 and 304?

    return {
      config: response.body,
      headers: this.__getNextReqHeaders(response.headers),
    };
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

  // TODO: Add interval on first entry, and #clear (which also kills interval)
}

//const LazyConfigCache = () => new PollingConfigCache({
//  __onGetAsync: () => enums.refreshDirectives.ONLY_IF_CACHE_MISS,
//});
//
//const StaleWhileRevalidateConfigCache = () => new PollingConfigCache({
//  __onGetAsync: () => enums.refreshDirectives.YES_DONT_AWAIT,
//});
//
//const StronglyConsistentConfigCache = () => new PollingConfigCache({
//  __onGetAsync: () => enums.refreshDirectives.YES_AWAIT,
//});

