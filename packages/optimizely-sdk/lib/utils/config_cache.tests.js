

const { assert }  = require('chai');

const { PollingConfigCache, enums } = require('./config_cache');

describe('lib/utils/config_cache', () => {
  describe('ConfigCache', () => {
    let cache;

    describe('#seed', () => {
      context('on a new cache', () => {
        beforeEach(() => {
          cache = new PollingConfigCache();
        });

        it('sets the value and can be synchronously accessed later', () => {
          cache.seed('key', 'seed');
          assert(cache.get('key'), 'seed');
        });
      });

      // value is pending but unset, this sets it and then pending overwrites
      context('entry is pending', () => {
        beforeEach(() => {
          cache.cache = { 'key': { pendingPromise: true }};
        });

        context('and does not have a value yet', () => {
          it('sets the seed value', () => {
            assert.strictEqual(cache.get('key'), null);
            cache.seed('key', 'seed');
            assert.strictEqual(cache.get('key'), 'seed');
          });
        });

        context('and already has a value', () => {
          beforeEach(() => {
            cache.seed('key', 'seed');
          });

          it('seeding has no effect', () => {
            assert.strictEqual(cache.get('key'), 'seed');
            cache.seed('key', 'newseed');
            assert.strictEqual(cache.get('key'), 'seed');
          });
        });
      });
    });

    describe('#get', () => {
      beforeEach(() => {
        cache = new PollingConfigCache();
      });

      context('entry is absent', () => {
        it('returns null', () => {
          assert.strictEqual(cache.get('missingKey'), null);
        });
      });

      context('entry is present', () => {
        beforeEach(() => {
          cache.seed('key', 'value');
        });

        it('returns that entry', () => {
          assert.equal(cache.get('key'), 'value');
        });
      });
    });

    describe('#getAsync', () => {
      context('onGetAsync is ONLY_IF_CACHE_MISS', () => {
        context('cache hit', () => {
          it('fulfills ASAP');
        });
        context('cache miss', () => {
          it('fetches');
        });

        // ...
      });
    });
  });
});
