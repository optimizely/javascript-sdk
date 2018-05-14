const { PollingConfigCache } = require('./config_cache');
const { AsyncCache, enums } = require('./async_cache');
const Optimizely = require('../index.node');

exports.ClientCache = class ClientCache extends AsyncCache {
  constructor({
    clientArgsThunk = () => ({}),
    configCache = null,
  } = {}) {
    super();

    if (!configCache) {
      throw new Error('Need to supply a ConfigCache for now');
    }

    this.configCache = configCache;

    this.__clientArgsThunk = clientArgsThunk;
    this.__tracked = {};
  }

  // For ClientCache, a getAsync _always_ means getting whatever the underlying
  // ConfigCache is going to give you. That means always awaiting a refresh.
  __onGetAsync() {
    return enums.refreshDirectives.YES_AWAIT;
  }


  // TODO: Override seed

  /**
   * Ensure the cached Client for the given key is making decisions based on the config
   * within this.configCache. _May_ involve losing per-instance state. In particular,
   * forcedVariations and notificationListeners are lost. TODO: Fix this.
   */
  async __refresh(configKey, { client: currentClient, config: currentConfig } = {}) {
    const newConfig = await this.configCache.getAsync(configKey);

    if (newConfig === currentConfig) {
      return enums.UNCHANGED;
    }

    const newClient = Optimizely.createInstance({
      datafile: newConfig,
      ...this.__clientArgsThunk(),
    });

    // Now that this configKey is known to us, make sure we stay current with it
    // and update as the config changes.
    this.__ensureSubscribedToChanges(configKey);

    return {
      client: newClient,
      config: newConfig,
    };
  }

  get(key) {
    if (this.cache[key] && this.cache[key].value) {
      return this.cache[key].value.client;
    } else {
      return null;
    }
  }

  /**
   * @param {string} configKey
   *        Identifies the entry which this ClientCache should ensure that
   *        it will refresh whenever this.configCache emits a change event
   *        on the associated underlying config.
   */
  __ensureSubscribedToChanges(configKey) {
    if (this.__tracked[configKey]) {
      return;
    }

    this.configCache.on(configKey, (newConfig) => {
      this.__refresh(configKey, this.get(configKey));
    });

    this.__tracked[configKey] = true;
  }
}
