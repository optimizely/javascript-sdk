const rp = require('request-promise-native');

const { PollingConfigCache } = require('./config_cache');
const { ClientCache } = require('./client_cache');

const configCache = new PollingConfigCache({
  requester: (url, headers) => rp({
    uri: url,
    headers,
    simple: false, // Allow non-2xx responses (such as 304 Not Modified) to fulfill
    resolveWithFullResponse: true,
  }),
  //requester: (url, headers) => window.fetch(url, { headers });
});

const clientCache = new ClientCache();

const TEST_KEY = 'https://cdn.optimizely.com/json/8351122416.json';

async function main() {
  console.log(await clientCache.getAsync(TEST_KEY));
  console.log(await clientCache.getAsync(TEST_KEY));
}

main();

