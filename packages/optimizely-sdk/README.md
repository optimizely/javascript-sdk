# JavaScript SDK for Optimizely X Full Stack
[![npm](https://img.shields.io/npm/v/%40optimizely%2Foptimizely-sdk.svg)](https://www.npmjs.com/package/@optimizely/optimizely-sdk)
[![npm](https://img.shields.io/npm/dm/%40optimizely%2Foptimizely-sdk.svg)](https://www.npmjs.com/package/@optimizely/optimizely-sdk)
[![Travis CI](https://img.shields.io/travis/optimizely/javascript-sdk.svg)](https://travis-ci.org/optimizely/javascript-sdk)
[![Coveralls](https://img.shields.io/coveralls/optimizely/javascript-sdk.svg)](https://coveralls.io/github/optimizely/javascript-sdk)


Optimizely X Full Stack is A/B testing and feature management for product development teams. Experiment in any application. Make every feature on your roadmap an opportunity to learn. Learn more at https://www.optimizely.com/products/full-stack/, or see the [documentation](https://developers.optimizely.com/x/solutions/sdks/reference/index.html?language=node).

This directory contains the source code for the JavaScript SDK, which is usable in both Node.js and web environments.

## Getting Started

### Prerequisites

Ensure the SDK supports all of the platforms you're targeting. In particular, we support any ES5-compliant JavaScript environment, including
  - Node.js >= 0.10.0, and maybe even earlier. CI validates 0.10.0 and the latest version of all [LTS](https://github.com/nodejs/Release) releases from 4.x onward. By extension, places like AWS Lambda, Google Cloud Functions, and Auth0 Webtasks are supported as well.
  - [Web browsers](https://caniuse.com/#feat=es5)
  - [Cloudflare Workers](https://developers.cloudflare.com/workers/) and [Fly](https://fly.io/), both of which are powered by V8.
  - Anywhere else you can think of that might embed a JavaScript engine. The sky is the limit; experiment everywhere 🚀!

Once you've validated that the SDK supports the platforms you're targeting, fetch the package from [NPM](https://www.npmjs.com/package/@optimizely/optimizely-sdk). Using `npm`:

```
npm install @optimizely/optimizely-sdk --save
```

### Usage
See the Optimizely X Full Stack [developer documentation](http://developers.optimizely.com/server/reference/index.html) to learn how to set up your first JavaScript project and use the SDK.

Regarding `EventDispatcher`s: In Node.js and browser environments, the default `EventDispatcher` is powered by the [`http/s`](https://nodejs.org/api/http.html) modules and by [`XMLHttpRequest`](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest#Browser_compatibility), respectively. In all other environments, you must supply your own `EventDispatcher`.

### Migrating from 1.x.x

This version represents a major version change and, as such, introduces some breaking changes:

- The Node SDK is now combined with the JavaScript SDK so that we have one `optimizely-sdk` package that works across both server + browser environments.

- We no longer support legacy Node versions (under 4.0).

- You will no longer be able to pass in `revenue` value as a stand-alone argument to the `track` call. Instead you will need to pass it as an entry in the [`eventTags`](https://developers.optimizely.com/x/solutions/sdks/reference/index.html?language=javascript#event-tags).

### Feature Management access

To access Feature Management in the Optimizely web application, please contact your Optimizely account executive.

## Contributing
This information is relevant only if you plan on contributing to the SDK itself.

```sh
# Prerequisite: Install dependencies.
npm install

# Run unit tests with mocha.
npm test

# Run unit tests in many browsers, currently via BrowserStack.
# For this to work, the following environment variables must be set:
#   - BROWSER_STACK_USERNAME
#   - BROWSER_STACK_PASSWORD
npm run test-xbrowser
```

[.travis.yml](/.travis.yml) contains the definitions for `BROWSER_STACK_USERNAME` and `BROWSER_STACK_ACCESS_KEY` used in CI. These values are Optimizely's BrowserStack credentials, encrypted with our Travis CI public key. These creds can be rotated by following [these docs](https://docs.travis-ci.com/user/environment-variables/#Defining-encrypted-variables-in-.travis.yml).

