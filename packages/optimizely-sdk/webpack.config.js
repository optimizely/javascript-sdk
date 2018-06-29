const path = require('path');
const _ = require('lodash');

module.exports = env => {
  const r = {
    entry: `./lib/index.${env.platform}.js`,
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: `optimizely.${env.platform}${env.platform == 'browser' ? '.' + env.target : ''}${env.mode == 'production' ? '.min' : ''}.js`,
      libraryTarget: (env.target == 'cjs') ? ((env.platform == 'node') ? 'commonjs2' : 'commonjs') : 'umd'
    },
    target: (env.platform == 'node') ? 'node' : 'web',
    // mode: env.mode || when webpack upgrades to v4, uncomment and remove -p
  }

  return (env.target == 'umd') ? _.merge(r, {output: {library: 'optimizelyClient'}}) : r;
};

