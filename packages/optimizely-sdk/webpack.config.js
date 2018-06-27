const path = require('path');
const _ = require('lodash');

module.exports = env => {
  const r = {
    entry: `./lib/index.${env.platform}.js`,
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: `optimizely.${env.platform}${env.platform == 'browser' ? '.' + env.targ : ''}${env.mode == 'production' ? '.min' : ''}.js`,
      libraryTarget: (env.targ == 'cjs') ? ((env.platform == 'node') ? 'commonjs2' : 'commonjs') : 'umd'
    },
    target: (env.platform == 'node') ? 'node' : 'web',
    mode: env.mode
  }

  return (env.targ == 'umd') ? _.merge(r, {output: {library: 'optimizelyClient'}}) : r;
};

