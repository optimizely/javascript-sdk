# JavaScript SDK for Optimizely X Full Stack
[![npm](https://img.shields.io/npm/v/%40optimizely%2Foptimizely-sdk.svg)](https://www.npmjs.com/package/@optimizely/optimizely-sdk)
[![npm](https://img.shields.io/npm/dm/%40optimizely%2Foptimizely-sdk.svg)](https://www.npmjs.com/package/@optimizely/optimizely-sdk)
[![Travis CI](https://img.shields.io/travis/optimizely/javascript-sdk.svg)](https://travis-ci.org/optimizely/javascript-sdk)
[![Coveralls](https://img.shields.io/coveralls/optimizely/javascript-sdk.svg)](https://coveralls.io/github/optimizely/javascript-sdk)
[![license](https://img.shields.io/github/license/optimizely/javascript-sdk.svg)](https://choosealicense.com/licenses/apache-2.0/)


Optimizely X Full Stack is A/B testing and feature management for product development teams. Experiment in any application. Make every feature on your roadmap an opportunity to learn. Learn more at the [landing page](https://www.optimizely.com/products/full-stack/), or see the [documentation](https://docs.developers.optimizely.com/full-stack/docs).

This directory contains the source code for the JavaScript SDK, which is usable in Node.js, browsers, and beyond.

## Getting Started

### Prerequisites

Ensure the SDK supports all of the platforms you're targeting. In particular, the SDK targets any ES5-compliant JavaScript environment. We officially support:
- Node.js >= 8.0.0. By extension, environments like AWS Lambda, Google Cloud Functions, and Auth0 Webtasks are supported as well. Older Node.js releases likely work too (try `npm test` to validate for yourself), but are not formally supported.
- [Web browsers](https://caniuse.com/#feat=es5)

Other environments likely are compatible, too, but note that we don't officially support them:
- Progressive Web Apps, WebViews, and hybrid mobile apps like those built with React Native and Apache Cordova.
- [Cloudflare Workers](https://developers.cloudflare.com/workers/) and [Fly](https://fly.io/), both of which are powered by recent releases of V8.
- Anywhere else you can think of that might embed a JavaScript engine. The sky is the limit; experiment everywhere! 🚀

Once you've validated that the SDK supports the platforms you're targeting, fetch the package from [NPM](https://www.npmjs.com/package/@optimizely/optimizely-sdk). Using `npm`:

```
npm install --save @optimizely/optimizely-sdk
```

### Usage
See the Optimizely X Full Stack [developer documentation](http://developers.optimizely.com/server/reference/index.html) to learn how to set up your first JavaScript project and use the SDK.

The package's entry point is a CommonJS module, which can be used directly in environments which support it (e.g., Node.js, or loaded in a browser via Browserify or RequireJS). Additionally, for ease of use during initial evaluations you can include a standalone bundle of the SDK in your web page by fetching it from [unpkg](https://unpkg.com/):

```html
<script src="https://unpkg.com/@optimizely/optimizely-sdk/dist/optimizely.browser.umd.min.js"></script>

<!-- You can also use the unminified version if necessary -->
<script src="https://unpkg.com/@optimizely/optimizely-sdk/dist/optimizely.browser.umd.js"></script>
```

When evaluated, that bundle assigns the SDK's exports to `window.optimizelySdk`. If you wish to use the asset locally (for example, if unpkg is down), you can find it in your local copy of the package at dist/optimizely.browser.umd.min.js. We do not recommend using this method in production settings as it introduces a third-party performance dependency.

Regarding `EventDispatcher`s: In Node.js and browser environments, the default `EventDispatcher` is powered by the [`http/s`](https://nodejs.org/api/http.html) modules and by [`XMLHttpRequest`](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest#Browser_compatibility), respectively. In all other environments, you must supply your own `EventDispatcher`.

### Migrating from 1.x.x

This version represents a major version change and, as such, introduces some breaking changes:

- The Node.js SDK is now combined with the JavaScript SDK. We now have just one package, `@optimizely/optimizely-sdk`, that works in many JavaScript environments.

- We no longer support Node.js < 4.0.0, which collectively [reached end-of-life](https://github.com/nodejs/Release#end-of-life-releases) on 2016-12-31.

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

## Credits

First-party code (under lib/) is copyright Optimizely, Inc. and contributors, licensed under Apache 2.0.

## Additional Code

Prod dependencies are as follows:

```json
{
  "json-schema@0.2.3": {
    "licenses": [
      "AFLv2.1",
      "BSD"
    ],
    "publisher": "Kris Zyp",
    "repository": "https://github.com/kriszyp/json-schema"
  },
  "murmurhash@0.0.2": {
    "licenses": "MIT*",
    "repository": "https://github.com/perezd/node-murmurhash"
  },
  "uuid@3.3.2": {
    "licenses": "MIT",
    "repository": "https://github.com/kelektiv/node-uuid"
  },
  "decompress-response@4.2.1": {
    "licenses": "MIT",
    "repository": "https://github.com/sindresorhus/decompress-response"
  }
}
```

To regenerate this, run the following command:

```sh
npx license-checker --production --json | jq 'map_values({ licenses, publisher, repository }) | del(.[][] | nulls)'
```

and remove the self (`@optimizely/optimizely-sdk`) entry.
