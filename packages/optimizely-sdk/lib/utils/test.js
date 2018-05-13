const rp = require('request-promise-native');

const { PollingConfigCache } = require('./config_cache');

const configCache = new PollingConfigCache({
  requester: (url, headers) => rp({
    uri: url,
    headers,
    simple: false, // Allow non-2xx responses (such as 304 Not Modified) to fulfill
    resolveWithFullResponse: true,
  }),
  //requester: (url, headers) => window.fetch(url, { headers });
});

const TEST_KEY = 'https://cdn.optimizely.com/json/8351122416.json';

async function main() {
  configCache.getAsync(TEST_KEY);
  configCache.on(TEST_KEY, () => {
    console.log('TEST_KEY listener invoked');
  });
}

main();

