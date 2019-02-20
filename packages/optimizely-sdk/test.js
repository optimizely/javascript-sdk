const optimizelySDK = require('./lib/index.node');

const optimizely = optimizelySDK.createInstance({
  datafile: require('./datafile.json'),
  logger: optimizelySDK.logger.createLogger({
    logLevel: 0,
  }),
  eventFlushInterval: 3000,
  eventMaxQueueSize: 1000,
});

console.log(optimizely.activate('abtest1', 'jordan', { gender: 'T' }));
console.log(optimizely.activate('abtest1', 'jordan1'));
console.log(optimizely.activate('abtest1', 'jordan2'));
console.log(optimizely.activate('abtest1', 'jordan'));

console.log(optimizely.track('win', 'jordan', { gender: '?' }));

optimizely.close()
// console.log(optimizely.configObj)
