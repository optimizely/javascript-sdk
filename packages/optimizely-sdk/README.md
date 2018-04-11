# Optimizely JavaScript SDK

This repository houses the JavaScript SDK for Optimizely X Full Stack.

## Getting Started

### Installing the SDK

The SDK is available through [npm](https://npmjs.com/package/optimizely-sdk). To install:

```
npm install @optimizely/optimizely-sdk --save
```

Or to use in a non CommonJS fashion in the Browser:

1. Run `npm run build`
2. Pull in `dist/optimizely.browser.umd.min.js` as a `<script>`
3. Use as global variable `window.optimizelyClient`

### Migrating from 1.x.x

This version represents a major version change and, as such, introduces some breaking changes:

- The Node SDK is now combined with the JavaScript SDK so that we have one `optimizely-sdk` package that works across both server + browser environments.

- We no longer support legacy Node versions (under 4.0).

- You will no longer be able to pass in `revenue` value as a stand-alone argument to the `track` call. Instead you will need to pass it as an entry in the [`eventTags`](https://developers.optimizely.com/x/solutions/sdks/reference/index.html?language=javascript#event-tags).

### Feature Management Access

To access the Feature Management configuration in the Optimizely dashboard, please contact your Optimizely account executive.

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

The browser bundles also come with a minified / production-ready version.

### Environment Variables

The .yml of this project contains environment vairables for ```BROWSER_STACK_USERNAME``` and ```BROWSER_STACK_ACCESS_KEY```.

These variables, created in BrowserStack, are encrypted by the TravisCI public key. This is done directly with the TravisCI command line tools; for additional information see travis encrypt-file.
