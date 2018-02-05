# Optimizely JavaScript SDK

This repository houses the JavaScript SDK for Optimizely X Full Stack.

## Getting Started

### Installing the SDK

The SDK is available through [npm](https://npmjs.com/package/optimizely-sdk). To install:

```
npm install @optimizely/optimizely-sdk --save
```

Or to use in a non CommonJS fashion:

1. Run `npm run build`
2. Pull in `dist/optimizely.browser.umd.min.js` as a `<script>`
3. Use as global variable `window.optimizelyClient`

### Using the SDK
See the Optimizely X Full Stack testing [developer documentation](http://developers.optimizely.com/server/reference/index.html) to learn how to set up your first JavaScript project and use the SDK.

## Development

### Installing dependencies

```npm install```

### Unit tests

You can run all unit tests with:
```
npm test
```

### Build distribution packages

```
npm run build
```

This command will build several distribution bundles under the `dist` directory:
1. optimizely.browser.cjs.js - This is the main entry point for browser/client-side bundles
2. optimizely.browser.umd.js - This is used when not packaging the optimizely-sdk with your own JS bundles. Instead you would load this script as a `<script>` tag and reference it via the global var `optimizelyClient`
3. optimizely.node.js - This is the main entry point for Node apps

Each of these bundles also come with a minified / production-ready version.

### Contributing

Please see [CONTRIBUTING](CONTRIBUTING.md).
