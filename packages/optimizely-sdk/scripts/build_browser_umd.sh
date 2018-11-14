#!/usr/bin/env bash -e

BUNDLE_NAME="optimizelySdk"

npx webpack -p lib/index.browser.js dist/optimizely.browser.umd.min.js \
  --output-library-target=umd \
  --output-library="$BUNDLE_NAME"

# Append some backwards-compatibility code to the bundle
cat - >> dist/optimizely.browser.umd.min.js <<EOF


window._optimizelyClientWarningGiven = false;

Object.defineProperty(window, 'optimizelyClient', {
  get: function () {
    if (!window._optimizelyClientWarningGiven) {
      console.warn('Accessing the SDK via window.optimizelyClient is deprecated; please use window.optimizelySdk instead. This alias will be dropped in 3.0.0.');
      window._optimizelyClientWarningGiven = true;
    }

    return {
      createInstance: window.optimizelySdk.createInstance
    };
  }
});
EOF

# Builds the unminified bundle
npx webpack lib/index.browser.js dist/optimizely.browser.umd.js \
  --define process.env.NODE_ENV="production" \
  --output-library-target=umd \
  --output-library="$BUNDLE_NAME"

# Append some backwards-compatibility code to the bundle
cat - >> dist/optimizely.browser.umd.js <<EOF


window._optimizelyClientWarningGiven = false;

Object.defineProperty(window, 'optimizelyClient', {
  get: function () {
    if (!window._optimizelyClientWarningGiven) {
      console.warn('Accessing the SDK via window.optimizelyClient is deprecated; please use window.optimizelySdk instead. This alias will be dropped in 3.0.0.');
      window._optimizelyClientWarningGiven = true;
    }

    return {
      createInstance: window.optimizelySdk.createInstance
    };
  }
});
EOF
