

const { assert }  = require('chai');

const { ConfigCache, enums } = require('./config_cache');

describe('lib/utils/config_cache', () => {
  describe('ConfigCache', () => {
    let cache;

    it('throws if constructed in PUSH mode', () => {
      assert.throws(() => new ConfigCache({ mode: enums.modes.PUSH }));
    });

    describe('#get', () => {
      beforeEach(() => {
        cache = new ConfigCache({ mode: enums.modes.POLL });
      });

      context('entry is absent', () => {
        context('no override is given', () => {
          it('returns null', () => {
            assert.strictEqual(cache.get('missingKey'), null);
          });
        });
      });

      context('entry is present', () => {
        beforeEach(() => {
          // Set entry
          cache.seed('key', 'value');
        });

        it('returns that entry', () => {
          assert.equal(cache.get('key'), 'value');
        });
      });
    });

    describe('#getAsync', () => {
      context('mode is PUSH', () => {
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
});
