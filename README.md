# Optimizely JavaScript SDK

[![npm](https://img.shields.io/npm/v/%40optimizely%2Foptimizely-sdk.svg)](https://www.npmjs.com/package/@optimizely/optimizely-sdk)
[![npm](https://img.shields.io/npm/dm/%40optimizely%2Foptimizely-sdk.svg)](https://www.npmjs.com/package/@optimizely/optimizely-sdk)
[![GitHub Actions](https://img.shields.io/github/actions/workflow/status/optimizely/javascript-sdk/javascript.yml)](https://github.com/optimizely/javascript-sdk/actions)
[![Coveralls](https://img.shields.io/coveralls/optimizely/javascript-sdk.svg)](https://coveralls.io/github/optimizely/javascript-sdk)
[![license](https://img.shields.io/github/license/optimizely/javascript-sdk.svg)](https://choosealicense.com/licenses/apache-2.0/)

This is the official JavaScript and TypeScript SDK for use with Optimizely Feature Experimentation and Optimizely Full Stack (legacy). The SDK now features a modular architecture for greater flexibility and control. If you're upgrading from a previous version, see our [Migration Guide](MIGRATION.md).

Optimizely Feature Experimentation is an A/B testing and feature management tool for product development teams that enables you to experiment at every step. Using Optimizely Feature Experimentation allows for every feature on your roadmap to be an opportunity to discover hidden insights. Learn more at [Optimizely.com](https://www.optimizely.com/products/experiment/feature-experimentation/), or see the [developer documentation](https://docs.developers.optimizely.com/feature-experimentation/docs/introduction).

Optimizely Rollouts is [free feature flags](https://www.optimizely.com/free-feature-flagging/) for development teams. You can easily roll out and roll back features in any application without code deploys, mitigating risk for every feature on your roadmap.

---

## Get Started

> Refer to the [JavaScript SDK's developer documentation](https://docs.developers.optimizely.com/feature-experimentation/docs/javascript-sdk) for detailed instructions on getting started with using the SDK.


> For **Edge Functions**, we provide starter kits that utilize the Optimizely JavaScript SDK for the following platforms:
>
> - [Akamai (Edgeworkers)](https://github.com/optimizely/akamai-edgeworker-starter-kit)
> - [AWS Lambda@Edge](https://github.com/optimizely/aws-lambda-at-edge-starter-kit)
> - [Cloudflare Worker](https://github.com/optimizely/cloudflare-worker-template)
> - [Fastly Compute@Edge](https://github.com/optimizely/fastly-compute-starter-kit)
> - [Vercel Edge Middleware](https://github.com/optimizely/vercel-examples/tree/main/edge-middleware/feature-flag-optimizely)
>
> Note: We recommend using the **Lite** entrypoint (for version < 6) / **Universal** entrypoint (for version >=6) of the sdk for edge platforms. These starter kits also use the **Lite** variant of the JavaScript SDK.

### Prerequisites

Ensure the SDK supports all of the platforms you're targeting. In particular, the SDK targets modern ES6-compliant JavaScript environments. We officially support:

- Node.js >= 18.0.0. By extension, environments like AWS Lambda, Google Cloud Functions, and Auth0 Webtasks are supported as well. Older Node.js releases likely work too (try `npm test` to validate for yourself), but are not formally supported.
- Modern Web Browsers, such as Microsoft Edge 84+, Firefox 91+, Safari 13+, and Chrome 102+, Opera 76+

In addition, other environments are likely compatible but are not formally supported including:

- Progressive Web Apps, WebViews, and hybrid mobile apps like those built with React Native and Apache Cordova.
- [Cloudflare Workers](https://developers.cloudflare.com/workers/) and [Fly](https://fly.io/), both of which are powered by recent releases of V8.
- Anywhere else you can think of that might embed a JavaScript engine. The sky is the limit; experiment everywhere! 🚀

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
import optimizely from 'npm:@optimizely/optimizely-sdk';
```

## Use the JavaScript SDK

See the [JavaScript SDK's developer documentation](https://docs.developers.optimizely.com/feature-experimentation/docs/javascript-sdk) to learn how to set up your first JavaScript project using the SDK.

The SDK uses a modular architecture with dedicated components for project configuration, event processing, and more. The examples below demonstrate the recommended initialization pattern.

### Initialization with Package Managers (npm, yarn, pnpm)

```javascript
import {
  createInstance,
  createPollingProjectConfigManager,
  createBatchEventProcessor,
  createOdpManager,
} from '@optimizely/optimizely-sdk';

// 1. Configure your project config manager
const pollingConfigManager = createPollingProjectConfigManager({
  sdkKey: '<YOUR_SDK_KEY>',
  autoUpdate: true, // Optional: enable automatic updates
  updateInterval: 300000, // Optional: update every 5 minutes (in ms)
});

// 2. Create an event processor for analytics
const batchEventProcessor = createBatchEventProcessor({
  batchSize: 10, // Optional: default batch size
  flushInterval: 1000, // Optional: flush interval in ms
});

// 3. Set up ODP manager for segments and audience targeting
const odpManager = createOdpManager();

// 4. Initialize the Optimizely client with the components
const optimizelyClient = createInstance({
  projectConfigManager: pollingConfigManager,
  eventProcessor: batchEventProcessor,
  odpManager: odpManager,
});

optimizelyClient
  .onReady()
  .then(() => {
    console.log('Optimizely client is ready');
    // Your application code using Optimizely goes here
  })
  .catch(error => {
    console.error('Error initializing Optimizely client:', error);
  });
```

### Initialization (Using HTML script tag)

The package has different entry points for different environments. The browser entry point is an ES module, which can be used with an appropriate bundler like **Webpack** or **Rollup**. Additionally, for ease of use during initial evaluations you can include a standalone umd bundle of the SDK in your web page by fetching it from [unpkg](https://unpkg.com/):

```html
<script src="https://unpkg.com/@optimizely/optimizely-sdk@6/dist/optimizely.browser.umd.min.js"></script>

<!-- You can also use the unminified version if necessary -->
<script src="https://unpkg.com/@optimizely/optimizely-sdk@6/dist/optimizely.browser.umd.js"></script>
```

When evaluated, that bundle assigns the SDK's exports to `window.optimizelySdk`. If you wish to use the asset locally (for example, if unpkg is down), you can find it in your local copy of the package at dist/optimizely.browser.umd.min.js. We do not recommend using this method in production settings as it introduces a third-party performance dependency.

As `window.optimizelySdk` should be a global variable at this point, you can continue to use it like so:

```html
<script>
  // Extract the factory functions from the global SDK
  const {
    createInstance,
    createPollingProjectConfigManager,
    createBatchEventProcessor,
    createOdpManager,
  } = window.optimizelySdk;

  // Initialize components
  const pollingConfigManager = createPollingProjectConfigManager({
    sdkKey: '<YOUR_SDK_KEY>',
    autoUpdate: true,
  });

  const batchEventProcessor = createBatchEventProcessor();

  const odpManager = createOdpManager();

  // Create the Optimizely client
  const optimizelyClient = createInstance({
    projectConfigManager: pollingConfigManager,
    eventProcessor: batchEventProcessor,
    odpManager: odpManager,
  });

  optimizelyClient
    .onReady()
    .then(() => {
      console.log('Optimizely client is ready');
      // Start using the client here
    })
    .catch(error => {
      console.error('Error initializing Optimizely client:', error);
    });
</script>
```

### Closing the SDK Instance

Depending on the sdk configuration, the client instance might schedule tasks in the background. If the instance has background tasks scheduled,
then the instance will not be garbage collected even though there are no more references to the instance in the code. (Basically, the background tasks will still hold references to the instance). Therefore, it's important to close it to properly clean up resources.

```javascript
// Close the Optimizely client when you're done using it
optimizelyClient.close()
```
Using the following settings will cause background tasks to be scheduled

- Polling Datafile Manager
- Batch Event Processor with batchSize > 1
- ODP manager with eventBatchSize > 1



> ⚠️ **Warning**: Failure to close SDK instances when they're no longer needed may result in memory leaks. This is particularly important for applications that create multiple instances over time. For some environment like SSR applications, it might not be convenient to close each instance, in which case, the `disposable` option of `createInstance` can be used to disable all background tasks on the server side, allowing the instance to be garbage collected.


## Special Notes

### Migration Guides

If you're updating your SDK version, please check the appropriate migration guide:

- **Migrating from 5.x or lower to 6.x**: See our [Migration Guide](MIGRATION.md) for detailed instructions on updating to the new modular architecture.
- **Migrating from 4.x or lower to 5.x**: Please refer to the [Changelog](CHANGELOG.md#500---january-19-2024) for details on these breaking changes.

## SDK Development

### Unit Tests

There is a mix of testing paradigms used within the JavaScript SDK which include Mocha, Chai, Karma, and Vitest, indicated by their respective `*.tests.js` and `*.spec.ts` filenames.

When contributing code to the SDK, aim to keep the percentage of code test coverage at the current level ([![Coveralls](https://img.shields.io/coveralls/optimizely/javascript-sdk.svg)](https://coveralls.io/github/optimizely/javascript-sdk)) or above.

To run unit tests, you can take the following steps:

1. Ensure that you have run `npm install` to install all project dependencies.
2. Run `npm test` to run all test files.
3. Run `npm run test-vitest` to run only tests written using Vitest.
4. Run `npm run test-mocha` to run only tests written using Mocha.
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


### Feature Management access

To access the Feature Management configuration in the Optimizely dashboard, please contact your Optimizely customer success manager.

## Credits

`@optimizely/optimizely-sdk` is developed and maintained by [Optimizely](https://optimizely.com) and many [contributors](https://github.com/optimizely/javascript-sdk/graphs/contributors). If you're interested in learning more about what Optimizely Feature Experimentation can do for your company you can visit the [official Optimizely Feature Experimentation product page here](https://www.optimizely.com/products/experiment/feature-experimentation/) to learn more.

First-party code (under `lib/`) is copyright Optimizely, Inc., licensed under Apache 2.0.

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
