# Optimizely JavaScript SDK

[![npm](https://img.shields.io/npm/v/%40optimizely%2Foptimizely-sdk.svg)](https://www.npmjs.com/package/@optimizely/optimizely-sdk)
[![npm](https://img.shields.io/npm/dm/%40optimizely%2Foptimizely-sdk.svg)](https://www.npmjs.com/package/@optimizely/optimizely-sdk)
[![GitHub Actions](https://img.shields.io/github/actions/workflow/status/optimizely/javascript-sdk/javascript.yml)](https://github.com/optimizely/javascript-sdk/actions)
[![Coveralls](https://img.shields.io/coveralls/optimizely/javascript-sdk.svg)](https://coveralls.io/github/optimizely/javascript-sdk)
[![license](https://img.shields.io/github/license/optimizely/javascript-sdk.svg)](https://choosealicense.com/licenses/apache-2.0/)

This repository houses the JavaScript SDK for use with Optimizely Feature Experimentation and Optimizely Full Stack (legacy).

Optimizely Feature Experimentation is an A/B testing and feature management tool for product development teams that enables you to experiment at every step. Using Optimizely Feature Experimentation allows for every feature on your roadmap to be an opportunity to discover hidden insights. Learn more at [Optimizely.com](https://www.optimizely.com/products/experiment/feature-experimentation/), or see the [developer documentation](https://docs.developers.optimizely.com/feature-experimentation/docs/introduction).

Optimizely Rollouts is [free feature flags](https://www.optimizely.com/free-feature-flagging/) for development teams. You can easily roll out and roll back features in any application without code deploys, mitigating risk for every feature on your roadmap.

---

## Get Started

> For **Browser** applications, refer to the [JavaScript SDK's developer documentation](https://docs.developers.optimizely.com/feature-experimentation/docs/javascript-sdk) for detailed instructions on getting started with using the SDK within client-side applications.

> For **Node.js** applications, refer to the [JavaScript (Node) variant of the developer documentation](https://docs.developers.optimizely.com/feature-experimentation/docs/javascript-node-sdk).

> For **Edge Functions**, we provide starter kits that utilize the Optimizely JavaScript SDK for the following platforms:
> - [Akamai (Edgeworkers)](https://github.com/optimizely/akamai-edgeworker-starter-kit)
> - [AWS Lambda@Edge](https://github.com/optimizely/aws-lambda-at-edge-starter-kit)
> - [Cloudflare Worker](https://github.com/optimizely/cloudflare-worker-template)
> - [Fastly Compute@Edge](https://github.com/optimizely/fastly-compute-starter-kit)
> - [Vercel Edge Middleware](https://github.com/optimizely/vercel-examples/tree/main/edge-middleware/feature-flag-optimizely)
>
> Note: We recommend using the **Lite** version of the sdk for edge platforms. These starter kits also use the **Lite** variant of the JavaScript SDK which excludes the datafile manager and event processor packages.

### Prerequisites

Ensure the SDK supports all of the platforms you're targeting. In particular, the SDK targets modern ES5-compliant JavaScript environment. We officially support:
- Node.js >= 16.0.0. By extension, environments like AWS Lambda, Google Cloud Functions, and Auth0 Webtasks are supported as well. Older Node.js releases likely work too (try `npm test` to validate for yourself), but are not formally supported.
- Modern Web Browsers, such as Microsoft Edge 84+, Firefox 91+, Safari 13+, and Chrome 102+, Opera 76+

In addition, other environments are likely compatible but are not formally supported including:
- Progressive Web Apps, WebViews, and hybrid mobile apps like those built with React Native and Apache Cordova.
- [Cloudflare Workers](https://developers.cloudflare.com/workers/) and [Fly](https://fly.io/), both of which are powered by recent releases of V8.
- Anywhere else you can think of that might embed a JavaScript engine. The sky is the limit; experiment everywhere! 🚀

### Requirements

* JavaScript (Browser): Modern web browser that is ES5-compliant.

* JavaScript (Node): Node 16.0.0+


### Install the SDK

Once you've validated that the SDK supports the platforms you're targeting, fetch the package from [NPM](https://www.npmjs.com/package/@optimizely/optimizely-sdk):

Using `npm`:
```sh
npm install --save @optimizely/optimizely-sdk
```

Using `yarn`:
```sh
yarn add @optimizely/optimizely-sdk
```

Using `pnpm`:
```sh
pnpm add @optimizely/optimizely-sdk
```

Using `deno` (no installation required):
```javascript
import optimizely from "npm:@optimizely/optimizely-sdk"
```
## Use the JavaScript SDK (Browser)

See the [Optimizely Feature Experimentation developer documentation for JavaScript (Browser)](https://docs.developers.optimizely.com/experimentation/v4.0.0-full-stack/docs/javascript-sdk) to learn how to set up your first JavaScript project and use the SDK for client-side applications.

### Initialization (Browser)

The package has different entry points for different environments. The browser entry point is an ES module, which can be used with an appropriate bundler like **Webpack** or **Rollup**. Additionally, for ease of use during initial evaluations you can include a standalone umd bundle of the SDK in your web page by fetching it from [unpkg](https://unpkg.com/):

```html
<script src="https://unpkg.com/@optimizely/optimizely-sdk/dist/optimizely.browser.umd.min.js"></script>

<!-- You can also use the unminified version if necessary -->
<script src="https://unpkg.com/@optimizely/optimizely-sdk/dist/optimizely.browser.umd.js"></script>
```

When evaluated, that bundle assigns the SDK's exports to `window.optimizelySdk`. If you wish to use the asset locally (for example, if unpkg is down), you can find it in your local copy of the package at dist/optimizely.browser.umd.min.js. We do not recommend using this method in production settings as it introduces a third-party performance dependency.

As `window.optimizelySdk` should be a global variable at this point, you can continue to use it like so:

```javascript
const optimizelyClient = window.optimizelySdk.createInstance({
  sdkKey: '<YOUR_SDK_KEY>',
  // datafile: window.optimizelyDatafile,
  // etc.
});

optimizelyClient.onReady().then(({ success, reason }) => {
  if (success) {
      // Create the Optimizely user context, make decisions, and more here!
  }
});
```

Regarding `EventDispatcher`s: In Node.js and browser environments, the default `EventDispatcher` is powered by the [`http/s`](https://nodejs.org/api/http.html) modules and by [`XMLHttpRequest`](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest#Browser_compatibility), respectively. In all other environments, you must supply your own `EventDispatcher`.

## Use the JavaScript SDK (Node)

See the [Optimizely Feature Experimentation developer documentation for JavaScript (Node)](https://docs.developers.optimizely.com/experimentation/v4.0.0-full-stack/docs/javascript-node-sdk) to learn how to set up your first JavaScript project and use the SDK for server-side applications.

### Initialization (Node)

The package has different entry points for different environments. The node entry point is CommonJS module.

```javascript
const optimizelySdk = require('@optimizely/optimizely-sdk');

const optimizelyClient = optimizelySdk.createInstance({
  sdkKey: '<YOUR_SDK_KEY>',
  // datafile: window.optimizelyDatafile,
  // etc.
});

optimizelyClient.onReady().then(({ success, reason }) => {
  if (success) {
      // Create the Optimizely user context, make decisions, and more here!
  }
});
```

Regarding `EventDispatcher`s: In Node.js environment, the default `EventDispatcher` is powered by the [`http/s`](https://nodejs.org/api/http.html) module.

## SDK Development

### Unit Tests

There is a mix of testing paradigms used within the JavaScript SDK which include Mocha, Chai, Karma, and Jest, indicated by their respective `*.tests.js` and `*.spec.ts` filenames.

When contributing code to the SDK, aim to keep the percentage of code test coverage at the current level ([![Coveralls](https://img.shields.io/coveralls/optimizely/javascript-sdk.svg)](https://coveralls.io/github/optimizely/javascript-sdk)) or above.

To run unit tests on the primary JavaScript SDK package source code, you can take the following steps:

1. On your command line or terminal, navigate to the `~/javascript-sdk/packages/optimizely-sdk` directory.
2. Ensure that you have run `npm install` to install all project dependencies.
3. Run `npm test` to run all test files.
4. (For cross-browser testing) Run `npm run test-xbrowser` to run tests in many browsers via BrowserStack.
5. Resolve any tests that fail before continuing with your contribution.

This information is relevant only if you plan on contributing to the SDK itself.

```sh
# Prerequisite: Install dependencies.
npm install

# Run unit tests.
npm test

# Run unit tests in many browsers, currently via BrowserStack.
# For this to work, the following environment variables must be set:
#   - BROWSER_STACK_USERNAME
#   - BROWSER_STACK_PASSWORD
npm run test-xbrowser
```

[/.github/workflows/javascript.yml](/.github/workflows/javascript.yml) contains the definitions for `BROWSER_STACK_USERNAME` and `BROWSER_STACK_ACCESS_KEY` used in the GitHub Actions CI pipeline. When developing locally, you must provide your own credentials in order to run `npm run test-xbrowser`. You can register for an account for free on [the BrowserStack official website here](https://www.browserstack.com/).

### Contributing

For more information regarding contributing to the Optimizely JavaScript SDK, please read [Contributing](CONTRIBUTING.md).

## Special Notes

### Migrating from 4.x.x

This version represents a major version change and, as such, introduces some breaking changes. Please refer to the [Changelog](CHANGELOG.md#500---january-19-2024) for more details.

### Feature Management access

To access the Feature Management configuration in the Optimizely dashboard, please contact your Optimizely customer success manager.

## Credits

`@optimizely/optimizely-sdk` is developed and maintained by [Optimizely](https://optimizely.com) and many [contributors](https://github.com/optimizely/javascript-sdk/graphs/contributors). If you're interested in learning more about what Optimizely Feature Experimentation can do for your company you can visit the [official Optimizely Feature Experimentation product page here](https://www.optimizely.com/products/experiment/feature-experimentation/) to learn more.

First-party code (under `packages/optimizely-sdk/lib/`, `packages/datafile-manager/lib`, `packages/datafile-manager/src`, `packages/datafile-manager/__test__`, `packages/event-processor/src`, `packages/event-processor/__tests__`, `packages/logging/src`, `packages/logging/__tests__`, `packages/utils/src`, `packages/utils/__tests__`) is copyright Optimizely, Inc. and contributors, licensed under Apache 2.0.

### Other Optimizely SDKs

- Agent - https://github.com/optimizely/agent

- Android - https://github.com/optimizely/android-sdk

- C# - https://github.com/optimizely/csharp-sdk

- Flutter - https://github.com/optimizely/optimizely-flutter-sdk

- Go - https://github.com/optimizely/go-sdk

- Java - https://github.com/optimizely/java-sdk

- PHP - https://github.com/optimizely/php-sdk

- Python - https://github.com/optimizely/python-sdk

- React - https://github.com/optimizely/react-sdk

- Ruby - https://github.com/optimizely/ruby-sdk

- Swift - https://github.com/optimizely/swift-sdk