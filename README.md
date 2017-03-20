# Optimizely JavaScript SDK

This repository houses the JavaScript SDK for Optimizely X Full Stack.

## Getting Started

### Installing the SDK

The SDK is available through [npm](https://npmjs.com/package/optimizely-client-sdk). To install:

```
npm install optimizely-client-sdk --save
```

Or to use in a non CommonJS fashion:

1. Run `npm run build`
2. Pull in `dist/optimizely.min.js` as a `<script>`
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

### Contributing

Please see [CONTRIBUTING](CONTRIBUTING.md).
