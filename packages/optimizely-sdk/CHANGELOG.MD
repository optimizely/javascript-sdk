# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [4.7.0] - September 15, 2021

### New Features
- Added new public properties to OptimizelyConfig. ([#683](https://github.com/optimizely/javascript-sdk/pull/683), [#698](https://github.com/optimizely/javascript-sdk/pull/698))
	- sdkKey
	- environmentKey
	- attributes
	- audiences
	- events
	- experimentRules and deliveryRules to OptimizelyFeature
	- audiences to OptimizelyExperiment
- For details, refer to our documentation page:
  - Node version: [https://docs.developers.optimizely.com/full-stack/v4.0/docs/optimizelyconfig-javascript-node](https://docs.developers.optimizely.com/full-stack/v4.0/docs/optimizelyconfig-javascript-node).
  - Browser version: [https://docs.developers.optimizely.com/full-stack/v4.0/docs/optimizelyconfig-javascript](https://docs.developers.optimizely.com/full-stack/v4.0/docs/optimizelyconfig-javascript).

### Bug fixes
- Followed experimentIds order of experiments inside featuresMap of OptimizelyConfig ([#701](https://github.com/optimizely/javascript-sdk/pull/701))

## [4.6.2] - July 15, 2021

### Bug fixes
- Fixed incorrect impression event payload in projects containing multiple flags with dublicate key rules ([#690](https://github.com/optimizely/javascript-sdk/pull/690))

## [4.6.1] - July 8, 2021

### Bug fixes
- Bumped `event-processor` packages to version `0.8.2`
- Fixed serving incorrect variation issue in projects containing multiple flags with same key rules ([#687](https://github.com/optimizely/javascript-sdk/pull/687))

## [4.6.0] - May 27, 2021

### New Features
- Added support for multiple concurrent prioritized experiments per flag ([#664](https://github.com/optimizely/javascript-sdk/pull/664))

### Bug fixes
- Bumped `datafile-manager` and `event-processor` packages to version `0.8.1`.

## [4.5.1] - March 2, 2021

### Bug fixes
-  Refactored TypeScript type definitions to have `OptimizelyUserContext` and `OptimizelyDecision` imported from `shared_types` to provide isolation from internal modules ([#655](https://github.com/optimizely/javascript-sdk/pull/655))

## [4.5.0] - February 17, 2021

### New Features

- Introducing a new primary interface for retrieving feature flag status, configuration and associated experiment decisions for users ([#632](https://github.com/optimizely/javascript-sdk/pull/632), [#634](https://github.com/optimizely/javascript-sdk/pull/634), [#635](https://github.com/optimizely/javascript-sdk/pull/635), [#636](https://github.com/optimizely/javascript-sdk/pull/636), [#640](https://github.com/optimizely/javascript-sdk/pull/640), [#642](https://github.com/optimizely/javascript-sdk/pull/642), [#643](https://github.com/optimizely/javascript-sdk/pull/643), [#644](https://github.com/optimizely/javascript-sdk/pull/644), [#647](https://github.com/optimizely/javascript-sdk/pull/647), [#648](https://github.com/optimizely/javascript-sdk/pull/648)). The new `OptimizelyUserContext` class is instantiated with `createUserContext` and exposes the following APIs to get `OptimizelyDecision`:

	- setAttribute
	- decide
	- decideAll
	- decideForKeys
	- trackEvent

- For details, refer to our documentation page:
  - browser version: [https://docs.developers.optimizely.com/full-stack/v4.0/docs/javascript-sdk](https://docs.developers.optimizely.com/full-stack/v4.0/docs/javascript-sdk).
  - Node version: [https://docs.developers.optimizely.com/full-stack/v4.0/docs/javascript-node-sdk](https://docs.developers.optimizely.com/full-stack/v4.0/docs/javascript-node-sdk).

## [4.5.0-beta] - February 10, 2021

### New Features

- Introducing a new primary interface for retrieving feature flag status, configuration and associated experiment decisions for users ([#632](https://github.com/optimizely/javascript-sdk/pull/632), [#634](https://github.com/optimizely/javascript-sdk/pull/634), [#635](https://github.com/optimizely/javascript-sdk/pull/635), [#636](https://github.com/optimizely/javascript-sdk/pull/636), [#640](https://github.com/optimizely/javascript-sdk/pull/640), [#642](https://github.com/optimizely/javascript-sdk/pull/642), [#643](https://github.com/optimizely/javascript-sdk/pull/643), [#644](https://github.com/optimizely/javascript-sdk/pull/644), [#647](https://github.com/optimizely/javascript-sdk/pull/647), [#648](https://github.com/optimizely/javascript-sdk/pull/648)). The new `OptimizelyUserContext` class is instantiated with `createUserContext` and exposes the following APIs to get `OptimizelyDecision`:

	- setAttribute
	- decide
	- decideAll
	- decideForKeys
	- trackEvent

- For details, refer to our documentation page:
  - browser version: [https://docs.developers.optimizely.com/full-stack/v4.0/docs/javascript-sdk](https://docs.developers.optimizely.com/full-stack/v4.0/docs/javascript-sdk).
  - Node version: [https://docs.developers.optimizely.com/full-stack/v4.0/docs/javascript-node-sdk](https://docs.developers.optimizely.com/full-stack/v4.0/docs/javascript-node-sdk).

## [4.4.3] - November 23, 2020

### Bug fixes
-  Refactored TypeScript type definitions to have `OptimizelyOptions` imported from `shared_types` to provide isolation from internal modules ([#629](https://github.com/optimizely/javascript-sdk/pull/629))

## [4.4.2] - November 19, 2020

### Bug fixes

- In `Optimizely` class, use `any` type when assigning the return value of `setTimeout`. This is to allow it to type check regardless of whether it uses the browser or Node version of `setTimeout` ([PR #623](https://github.com/optimizely/javascript-sdk/pull/623)), ([Issue #622](https://github.com/optimizely/javascript-sdk/issues/622))
- Allowed to pass string type `logLevel` to `createInstance`. ([PR #627](https://github.com/optimizely/javascript-sdk/pull/627)), ([Issue #614](https://github.com/optimizely/javascript-sdk/issues/614))
- Excluded `suppressImplicitAnyIndexErrors` from TSconfig and resolved reported TS compiler issues ([PR #616](https://github.com/optimizely/javascript-sdk/pull/616)), ([Issue #613](https://github.com/optimizely/javascript-sdk/issues/613))
- Refactored TypeScript type definitions to only import from `shared_types` to provide isolation from internal modules ([#625](https://github.com/optimizely/javascript-sdk/pull/625))

### New Features

- Added `enabled` field to decision metadata structure to support upcoming application-controlled introduction of tracking for non-experiment Flag decisions ([#619](https://github.com/optimizely/javascript-sdk/pull/619))

## [4.4.1] - November 5, 2020

### Bug fixes

- Allowed using `--isolatedModules` flag in TSConfig file by fixing exports in event processor ([#610](https://github.com/optimizely/javascript-sdk/pull/610))
- Fixed strictNullChecks type errors ([#611](https://github.com/optimizely/javascript-sdk/pull/611))

## [4.4.0] - November 2, 2020

### New Features

- Added support sending impression events every time a decision is made ([#599](https://github.com/optimizely/javascript-sdk/pull/599))

## [4.3.4] - October 8, 2020

### Bug fixes
- The prior version (4.3.3) was erroneously published with the wrong content. This version contains up-to-date content, with no new changes.

## [4.3.3] - October 7, 2020

### Bug fixes
- Exported `OptimizelyVariable`, `OptimizelyVariation`, `OptimizelyExperiment`, `OptimizelyFeature`, `UserProfileService`, and `UserProfile` types from TypeScript type definitions ([#594](https://github.com/optimizely/javascript-sdk/pull/594))

## [4.3.2] - October 6, 2020

### Bug fixes

- Fixed return type of `getAllFeatureVariables` method and `dispatchEvent ` method signature of `EventDispatcher` interface in TypeScript type definitions ([#576](https://github.com/optimizely/javascript-sdk/pull/576))
- Don't log an error message when initialized with `sdkKey`, but no `datafile` ([#589](https://github.com/optimizely/javascript-sdk/pull/589))

## [4.3.1] - October 5, 2020

### Bug fixes

-  Exported `OptimizelyConfig` and `UserAttributes` type in TypeScript type definitions ([#587](https://github.com/optimizely/javascript-sdk/pull/587))

## [4.3.0] - October 1, 2020

### New Features

- Added support for version audience evaluation ([#517](https://github.com/optimizely/javascript-sdk/pull/571))
- Add datafile accessor ([#564](https://github.com/optimizely/javascript-sdk/pull/564))

## [4.2.1] - August 10, 2020

### Bug fixes
  - Remove incorrect warning about invalid variation ID when user not bucketed into experiment or feature rollout ([#549](https://github.com/optimizely/javascript-sdk/pull/549))

## [4.2.0] - July 31, 2020

### New Features

  - Better offline support in React Native apps:
    - Persist downloaded datafiles in local storage for use in subsequent SDK initializations ([#430](https://github.com/optimizely/javascript-sdk/pull/430))
    - Persist pending impression & conversion events in local storage ([#517](https://github.com/optimizely/javascript-sdk/pull/517), [#532](https://github.com/optimizely/javascript-sdk/pull/532))

### Bug fixes

  - Fixed log messages for Targeted Rollouts ([#515](https://github.com/optimizely/javascript-sdk/pull/515))

## [4.1.0] - July 7, 2020

### New Features

- Added support for JSON feature variables: new methods `getFeatureVariableJSON` and `getAllFeatureVariables` ([#467](https://github.com/optimizely/javascript-sdk/pull/467), [#470](https://github.com/optimizely/javascript-sdk/pull/470))
- Added support for authenticated datafiles when running in Node.js. Pass `datafileAccessToken` within `datafileOptions` to request an authenticated datafile using the token ([#498](https://github.com/optimizely/javascript-sdk/pull/498), [#502](https://github.com/optimizely/javascript-sdk/pull/502)):
  ```js
  const optimizelySDK = require('@optimizely/optimizely-sdk');
  var optimizelyClientInstance = optimizely.createInstance({
    sdkKey: '<Your SDK key>',
    datafileOptions: {
      datafileAccessToken: '<Your datafile access token>',
    }
  });
  ```

### Bug fixes

- Fixed audience evaluation log level: changed from `INFO` to `DEBUG` ([#496](https://github.com/optimizely/javascript-sdk/pull/496))
- Temporarily disabled React Native FSC tests ([#514](https://github.com/optimizely/javascript-sdk/pull/514))
- Changed `getFeatureVariableJson` to `getFeatureVariableJSON` ([#516](https://github.com/optimizely/javascript-sdk/pull/516))

## [4.1.0-beta] - June 16, 2020

### New Features

- Added support for JSON feature variables: new methods `getFeatureVariableJSON` and `getAllFeatureVariables` ([#467](https://github.com/optimizely/javascript-sdk/pull/467), [#470](https://github.com/optimizely/javascript-sdk/pull/470))
- Added support for authenticated datafiles when running in Node.js. Pass `datafileAccessToken` within `datafileOptions` to request an authenticated datafile using the token ([#498](https://github.com/optimizely/javascript-sdk/pull/498), [#502](https://github.com/optimizely/javascript-sdk/pull/502)):
  ```js
  const optimizelySDK = require('@optimizely/optimizely-sdk');
  var optimizelyClientInstance = optimizely.createInstance({
    sdkKey: '<Your SDK key>',
    datafileOptions: {
      datafileAccessToken: '<Your datafile access token>',
    }
  });
  ```

### Bug fixes

- Fixed audience evaluation log level: changed from `INFO` to `DEBUG` ([#496](https://github.com/optimizely/javascript-sdk/pull/496))

## [4.0.0] - April 30, 2020

### New Features

- Removed lodash dependency
- ES module entry point for the browser - `"module"` property of `package.json` points to `dist/optimizely.browser.es.min.js` ([#445](https://github.com/optimizely/javascript-sdk/pull/445))

### Breaking Changes

- Removed `Promise` polyfill from browser entry point ([417](https://github.com/optimizely/javascript-sdk/pull/417)).
- Changed functionality of JSON schema validation in all entry points ([442](https://github.com/optimizely/javascript-sdk/pull/442)).
  - Previously, `skipJSONValidation` flag was used by the user to specify whether the JSON object should be validated.
  - Now, `skipJSONValidation` has been removed entirely from all entry points. Instead, a user will need to import `jsonSchemaValidator` from `@optimizely/optimizely-sdk/dist/optimizely.json_schema_validator.min.js` and pass it to `createInstance` to perform validation as shown below:
  ```js
  const optimizelySDK = require('@optimizely/optimizely-sdk');
  const jsonSchemaValidator = require('@optimizely/optimizely-sdk/dist/optimizely.json_schema_validator.min');

  // Require JSON schema validation for the datafile
  var optimizelyClientInstance = optimizely.createInstance({
    datafile: datafile,
    jsonSchemaValidator: jsonSchemaValidator,
  });
  ```
- Dropped support for Node.js version <8 ([#456](https://github.com/optimizely/javascript-sdk/pull/456))

### Bug fixes

- Changed `track()` to log a warning instead of an error when the event isn't in the datafile ([#418](https://github.com/optimizely/javascript-sdk/pull/418))
- Fixed return type for `close` method in TypeScript type definitions ([#410](https://github.com/optimizely/javascript-sdk/pull/410))
- Node.js datafile manager uses gzip,deflate compression for requests ([#456](https://github.com/optimizely/javascript-sdk/pull/456))

## [4.0.0-rc.2] - April 24, 2020

### Bug fixes

- Allow multiple instances to be created from the same datafile object ([#462](https://github.com/optimizely/javascript-sdk/pull/462))

## [4.0.0-rc.1] - April 17, 2020

### New Features

- ES module entry point for the browser - `"module"` property of `package.json` points to `dist/optimizely.browser.es.min.js` ([#445](https://github.com/optimizely/javascript-sdk/pull/445))

### Breaking Changes:

- Dropped support for Node.js version <8 ([#456](https://github.com/optimizely/javascript-sdk/pull/456))

### Bug fixes

- Node.js datafile manager uses gzip,deflate compression for requests ([#456](https://github.com/optimizely/javascript-sdk/pull/456))

## [4.0.0-alpha.1] - March 4, 2020

### Breaking Changes:

- Removed `Promise` polyfill from browser entry point ([417](https://github.com/optimizely/javascript-sdk/pull/417)).
- Changed functionality of JSON schema validation in all entry points ([442](https://github.com/optimizely/javascript-sdk/pull/442)).
   - Previously, `skipJSONValidation` flag was used by the user to specify whether the JSON object should be validated.
   - Now, `skipJSONValidation` has been removed entirely from all entry points. Instead, a user will need to import `jsonSchemaValidator` from `@optimizely/optimizely-sdk/dist/optimizely.json_schema_validator.min.js` and pass it to `createInstance` to perform validation as shown below:

  ```js
  const optimizelySDK = require('@optimizely/optimizely-sdk');
  const jsonSchemaValidator = require('@optimizely/optimizely-sdk/dist/optimizely.json_schema_validator.min');

  // Require JSON schema validation for the datafile
  var optimizelyClientInstance = optimizely.createInstance({
    datafile: datafile,
    jsonSchemaValidator: jsonSchemaValidator,
  });
  ```

## [3.6.0-alpha.1] - March 4, 2020

### New Features

- Changed `track()` to log a warning instead of an error when the event isn't in the datafile ([#418](https://github.com/optimizely/javascript-sdk/pull/418))

## [3.5.0] - February 20th, 2020

### Bug fixes

- Fixed default event dispatcher not used in React Native entry point ([#383](https://github.com/optimizely/javascript-sdk/pull/383))
- Fixed errors in `getOptimizelyConfig` TypeScript type definitions ([#406](https://github.com/optimizely/javascript-sdk/pull/406))

### New Features

- Promise returned from `close` tracks the state of in-flight event dispatcher requests ([#404](https://github.com/optimizely/javascript-sdk/pull/404))

## [3.4.1] - January 28th, 2020

### Bug fixes

- Added `getOptimizelyConfig` and related types to TypeScript type definitions([#390](https://github.com/optimizely/javascript-sdk/pull/390)).

## [3.4.0] - January 21th, 2020

### Bug fixes

- Fixed incorrect payload for decision notification triggered by calling getVariation on a feature test in a mutex group([#375](https://github.com/optimizely/javascript-sdk/pull/375)).

### New Features

- Added a new API to get project configuration static data.
  - Call `getOptimizelyConfig()` to get a snapshot of project configuration static data.
  - It returns an `OptimizelyConfig` instance which includes a datafile revision number, all experiments, and feature flags mapped by their key values.
  - Added caching for `getOptimizelyConfig` - `OptimizelyConfig` object will be cached and reused for the lifetime of the datafile.
  - For details, refer to our documentation page: [https://docs.developers.optimizely.com/full-stack/docs/optimizelyconfig-javascript-node](https://docs.developers.optimizely.com/full-stack/docs/optimizelyconfig-javascript-node).

### Removed Features

- Removed support for `'launched'` experiment status
  - Previously, experiments with status `'running'` or `'launched'` would return non-`null` variations from `activate` and `getVariation`, and generate impression events from `activate`
  - Now, only `'running'` experiments will return non-`null` variations and generate impressions

## [3.4.0-beta] - December 18th, 2019

### Bug fixes

- Fixed incorrect payload for decision notification triggered by calling getVariation on a feature test in a mutex group([#375](https://github.com/optimizely/javascript-sdk/pull/375))

### New Features

- Added a new API to get a project configuration static data.
  - Call `getOptimizelyConfig()` to get a snapshot copy of project configuration static data.
  - It returns an `OptimizelyConfig` instance which includes a datafile revision number, all experiments, and feature flags mapped by their key values.
  - For details, refer to a documention page: https://docs.developers.optimizely.com/full-stack/docs/optimizelyconfig-javascript-node

## [3.3.2] - November 14th, 2019

### Bug fixes

- Fixed error message that was being logged when a user was bucketed into empty space in an experiment or a mutual exclusion group. This is not an error. With the fix, the message indicates that the user was not included in any experiment ([#366](https://github.com/optimizely/javascript-sdk/pull/366)).

## [3.3.1] - October 25th, 2019

### Bug fixes

- Fixed full screen error dialog appearing in local development for React Native apps when using the default logger. We now provide a default logger for React Native that does not call `console.error`.

## [3.3.0] - September 25th, 2019

### New Features

- Added support for event batching via the event processor.
  - Events generated by methods like `activate`, `track`, and `isFeatureEnabled` will be held in a queue until the configured batch size is reached, or the configured flush interval has elapsed. Then, they will be combined into a request and sent to the event dispatcher.
  - To configure event batching, include the `eventBatchSize` and `eventFlushInterval` number properties in the object you pass to `createInstance`.
  - Event batching is enabled by default. `eventBatchSize` defaults to `10`. `eventFlushInterval` defaults to `30000` in Node and `1000` in browsers.
- Added `localStorage` mitigation against lost events in the browser
  - When event requests are dispatched, they are written to `localStorage`, and when a response is received, they are removed from `localStorage`.
  - When the SDK is initialized for the first time in the browser, if any requests remain in `localStorage`, they will be sent, and removed from `localStorage` when a response is received.
- Updated the `close` method to return a `Promise` representing the process of closing the instance. When `close` is called, any events waiting to be sent as part of a batched event request will be immediately batched and sent to the event dispatcher.
  - If any such requests were sent to the event dispatcher, `close` returns a `Promise` that fulfills after the event dispatcher calls the response callback for each request. Otherwise, `close` returns an immediately-fulfilled `Promise`.
  - The `Promise` returned from `close` is fulfilled with a result object containing `success` (boolean) and `reason` (string, only when success is `false`) properties. In the result object, `success` is `true` if all events in the queue at the time close was called were combined into requests, sent to the event dispatcher, and the event dispatcher called the callbacks for each request. `success` is false if an unexpected error was encountered during the close process.
- Added non-typed `getFeatureVariable` method ([#298](https://github.com/optimizely/javascript-sdk/pull/298)) as a more idiomatic approach to getting values of feature variables.
  - Typed `getFeatureVariable` methods will still be available for use.

## [3.3.0-beta] - August 21th, 2019

### New Features

- Added support for event batching via the event processor.
  - Events generated by methods like `activate`, `track`, and `isFeatureEnabled` will be held in a queue until the configured batch size is reached, or the configured flush interval has elapsed. Then, they will be combined into a request and sent to the event dispatcher.
  - To configure event batching, include the `eventBatchSize` and `eventFlushInterval` number properties in the object you pass to `createInstance`.
  - Event batching is enabled by default. `eventBatchSize` defaults to `10`. `eventFlushInterval` defaults to `30000` in Node and `1000` in browsers.
- Added `localStorage` mitigation against lost events in the browser
  - When event requests are dispatched, they are written to `localStorage`, and when a response is received, they are removed from `localStorage`.
  - When the SDK is initialized for the first time in the browser, if any requests remain in `localStorage`, they will be sent, and removed from `localStorage` when a response is received.
- Updated the `close` method to return a `Promise` representing the process of closing the instance. When `close` is called, any events waiting to be sent as part of a batched event request will be immediately batched and sent to the event dispatcher.
  - If any such requests were sent to the event dispatcher, `close` returns a `Promise` that fulfills after the event dispatcher calls the response callback for each request. Otherwise, `close` returns an immediately-fulfilled `Promise`.
  - The `Promise` returned from `close` is fulfilled with a result object containing `success` (boolean) and `reason` (string, only when success is `false`) properties. In the result object, `success` is `true` if all events in the queue at the time close was called were combined into requests, sent to the event dispatcher, and the event dispatcher called the callbacks for each request. `success` is false if an unexpected error was encountered during the close process.
- Added non-typed `getFeatureVariable` method ([#298](https://github.com/optimizely/javascript-sdk/pull/298)) as a more idiomatic approach to getting values of feature variables.
  - Typed `getFeatureVariable` methods will still be available for use.

## [3.2.2] - August 20th, 2019

### Bug fixes

- Dont use pendingEventsDispatcher with user defined eventDispatcher ([#289](https://github.com/optimizely/javascript-sdk/issues/289))
  Note: This was supposed to be released in 3.2.1 but did not make it into the release.
- Updated lodash dependency to ^4.17.11 to address security vulnerabilities ([#296](https://github.com/optimizely/javascript-sdk/issues/296))

## [3.2.1] - July 1st, 2019

### Changed

- Updated lodash dependency to ^4.17.11 to address security vulnerabilities ([#296](https://github.com/optimizely/javascript-sdk/issues/296))

## [3.2.0] - May 30th, 2019

### New Features

- Added support for automatic datafile management ([#261](https://github.com/optimizely/javascript-sdk/pull/261)), ([#266](https://github.com/optimizely/javascript-sdk/pull/266)), ([#267](https://github.com/optimizely/javascript-sdk/pull/267)), ([#268](https://github.com/optimizely/javascript-sdk/pull/268)), ([#270](https://github.com/optimizely/javascript-sdk/pull/270)), ([#272](https://github.com/optimizely/javascript-sdk/pull/272))

  - To use automatic datafile management, include `sdkKey` as a string property in the options object you pass to `createInstance`.
  - When sdkKey is provided, the SDK instance will download the datafile associated with that sdkKey immediately upon construction. When the download completes, the SDK instance will update itself to use the downloaded datafile.
  - Use the `onReady` method to wait until the download is complete and the SDK is ready to use.
  - Customize datafile management behavior by passing a `datafileOptions` object within the options you pass to `createInstance`.
    - Enable automatic updates by passing `autoUpdate: true`. Periodically (on the provided update interval), the SDK instance will download the datafile and update itself. Use this to ensure that the SDK instance is using a fresh datafile reflecting changes recently made to your experiment or feature configuration.
  - Add a notification listener for the `OPTIMIZELY_CONFIG_UPDATE` notification type to be notified when an instance updates its Optimizely config after obtaining a new datafile.
  - Stop active downloads and cancel recurring downloads by calling the `close` method

  #### Create an instance with datafile management enabled

  ```js
  const optimizely = require('@optimizely/optimizely-sdk');
  const optimizelyClientInstance = optimizely.createInstance({
    sdkKey: '12345', // Provide the sdkKey of your desired environment here
  });
  ```

  #### Use `onReady` to wait until optimizelyClientInstance has a datafile

  ```js
  const optimizely = require('@optimizely/optimizely-sdk');
  const optimizelyClientInstance = optimizely.createInstance({
    sdkKey: '12345',
  });
  optimizelyClientInstance.onReady().then(() => {
    // optimizelyClientInstance is ready to use, with datafile downloaded from the Optimizely CDN
  });
  ```

  #### Enable automatic updates, add notification listener for OPTIMIZELY_CONFIG_UPDATE notification type, and stop automatic updates

  ```js
  const optimizely = require('@optimizely/optimizely-sdk');
  const optimizelyClientInstance = optimizely.createInstance({
    sdkKey: '12345',
    datafileOptions: {
      autoUpdate: true,
      updateInterval: 600000, // 10 minutes in milliseconds
    },
  });
  optimizelyClientInstance.notificationCenter.addNotificationListener(
    optimizely.enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
    () => {
      // optimizelyClientInstance has updated its Optimizely config
    }
  );
  // Stop automatic updates - optimizelyClientInstance will use whatever datafile it currently has from now on
  optimizelyClientInstance.close();
  ```

### Changed

- Forced variation logic has been moved from the project config module to the decision service. Prefixes for forced-variation-related log messages will reflect this change ([#261](https://github.com/optimizely/javascript-sdk/pull/261)).
- Update TypeScript definitions to account for new methods (`onReady`, `close`) and new properties on object accepted by createInstance (`datafileOptions`, `sdkKey`), ([#263](https://github.com/optimizely/javascript-sdk/pull/263)), ([#278](https://github.com/optimizely/javascript-sdk/pull/278))
- Allow react-sdk to be passed in as `clientEngine` ([#279](https://github.com/optimizely/javascript-sdk/pull/279))

### Bug Fixes:

- Add logging message for `optimizely.track()` ([#281](https://github.com/optimizely/javascript-sdk/pull/281))

## [3.2.0-beta] - May 16th, 2019

### Bug Fixes:

- Clear timeout created in onReady call for timeout promise as soon as project config manager's ready promise fulfills

### New Features

- Added 60 second timeout for all datafile requests

### Changed

- Updated datafile request polling behavior:
  - Start update interval timer immediately after request
  - When update interval timer fires during request, wait until request completes, then immediately start next request
- Update TypeScript definitions to account for new methods (`onReady`, `close`) and new properties on object accepted by createInstance (`datafileOptions`, `sdkKey`)

## [3.2.0-alpha] - April 26nd, 2019

### New Features

- Added support for automatic datafile management
  - To use automatic datafile management, include `sdkKey` as a string property in the options object you pass to `createInstance`.
  - When sdkKey is provided, the SDK instance will download the datafile associated with that sdkKey immediately upon construction. When the download completes, the SDK instance will update itself to use the downloaded datafile.
  - Use the `onReady` method to wait until the download is complete and the SDK is ready to use.
  - Customize datafile management behavior by passing a `datafileOptions` object within the options you pass to `createInstance`.
    - Enable automatic updates by passing `autoUpdate: true`. Periodically (on the provided update interval), the SDK instance will download the datafile and update itself. Use this to ensure that the SDK instance is using a fresh datafile reflecting changes recently made to your experiment or feature configuration.
  - Add a notification listener for the `OPTIMIZELY_CONFIG_UPDATE` notification type to be notified when an instance updates its Optimizely config after obtaining a new datafile.
  - Stop active downloads and cancel pending downloads by calling the `close` method

#### Create an instance with datafile management enabled

```js
const optimizely = require('@optimizely/optimizely-sdk');
const optimizelyClientInstance = optimizely.createInstance({
  sdkKey: '12345', // Provide the sdkKey of your desired environment here
});
```

#### Use `onReady` to wait until optimizelyClientInstance has a datafile

```js
const optimizely = require('@optimizely/optimizely-sdk');
const optimizelyClientInstance = optimizely.createInstance({
  sdkKey: '12345',
});
optimizelyClientInstance.onReady().then(() => {
  // optimizelyClientInstance is ready to use, with datafile downloaded from the Optimizely CDN
});
```

#### Enable automatic updates, add notification listener for OPTIMIZELY_CONFIG_UPDATE notification type, and stop automatic updates

```js
const optimizely = require('@optimizely/optimizely-sdk');
const optimizelyClientInstance = optimizely.createInstance({
  sdkKey: '12345',
  datafileOptions: {
    autoUpdate: true,
    updateInterval: 600000, // 10 minutes in milliseconds
  },
});
optimizelyClientInstance.notificationCenter.addNotificationListener(
  optimizely.enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
  () => {
    // optimizelyClientInstance has updated its Optimizely config
  }
);
// Stop automatic updates - optimizelyClientInstance will use whatever datafile it currently has from now on
optimizelyClientInstance.close();
```

### Changed

- Forced variation logic has been moved from the project config module to the decision service. Prefixes for forced-variation-related log messages will reflect this change.

## [3.1.0] - April 22nd, 2019

### New Features:

- Introduced Decision notification listener to be able to record:
  - Variation assignments for users activated in an experiment.
  - Feature access for users.
  - Feature variable value for users.

### Changed

- New APIs for setting `logger` and `logLevel` on the optimizelySDK singleton ([#232](https://github.com/optimizely/javascript-sdk/pull/232))
- `logger` and `logLevel` are now set globally for all instances of Optimizely. If you were passing
  different loggers to individual instances of Optimizely, logging behavior may now be different.

#### Setting a ConsoleLogger

```js
var optimizelySDK = require('@optimizely/optimizely-sdk');

// logger and logLevel are now set on the optimizelySDK singleton
optimizelySDK.setLogger(optimizelySDK.logging.createLogger());

// valid levels: 'DEBUG', 'INFO', 'WARN', 'ERROR'
optimizelySDK.setLogLevel('WARN');
// enums can also be used
optimizelySDK.setLogLevel(optimizelySDK.enums.LOG_LEVEL.ERROR);
```

#### Disable logging

```js
var optimizelySDK = require('@optimizely/optimizely-sdk');

optimizelySDK.setLogger(null);
```

### Bug Fixes

- Feature variable APIs now return default variable value when featureEnabled property is false. ([#249](https://github.com/optimizely/javascript-sdk/pull/249))

### Deprecated

- Activate notification listener is deprecated as of this release. Recommendation is to use the new Decision notification listener. Activate notification listener will be removed in the next major release.

## [3.1.0-beta1] - March 5th, 2019

### Changed

- New APIs for setting `logger` and `logLevel` on the optimizelySDK singleton ([#232](https://github.com/optimizely/javascript-sdk/pull/232))
- `logger` and `logLevel` are now set globally for all instances of Optimizely. If you were passing
  different loggers to individual instances of Optimizely, logging behavior may now be different.

#### Setting a ConsoleLogger

```js
var optimizelySDK = require('@optimizely/optimizely-sdk');

// logger and logLevel are now set on the optimizelySDK singleton
optimizelySDK.setLogger(optimizelySDK.logging.createLogger());

// valid levels: 'DEBUG', 'INFO', 'WARN', 'ERROR'
optimizelySDK.setLogLevel('WARN');
// enums can also be used
optimizelySDK.setLogLevel(optimizely.enums.LOG_LEVEL.ERROR);
```

#### Disable logging

```js
var optimizelySDK = require('@optimizely/optimizely-sdk');

optimizelySDK.setLogger(null);
```

## [3.0.1] - February 21, 2019

### Changed

- Expose default `loggers`, `errorHandlers`, `eventDispatcher` and `enums` on top level require.
- `createLogger` and `createNoOpLogger` are available as methods on `optimizelySdk.logging`
- Added `optimizelySdk.errorHandler`
- Added `optimizelySdk.eventDispatcher`
- Added `optimizelySdk.enums`

## [3.0.0] - February 13, 2019

The 3.0 release improves event tracking and supports additional audience targeting functionality.

### New Features:

- Event tracking ([#207](https://github.com/optimizely/javascript-sdk/pull/207)):
  - The `track` method now dispatches its conversion event _unconditionally_, without first determining whether the user is targeted by a known experiment that uses the event. This may increase outbound network traffic.
  - In Optimizely results, conversion events sent by 3.0 SDKs don't explicitly name the experiments and variations that are currently targeted to the user. Instead, conversions are automatically attributed to variations that the user has previously seen, as long as those variations were served via 3.0 SDKs or by other clients capable of automatic attribution, and as long as our backend actually received the impression events for those variations.
  - Altogether, this allows you to track conversion events and attribute them to variations even when you don't know all of a user's attribute values, and even if the user's attribute values or the experiment's configuration have changed such that the user is no longer affected by the experiment. As a result, **you may observe an increase in the conversion rate for previously-instrumented events.** If that is undesirable, you can reset the results of previously-running experiments after upgrading to the 3.0 SDK.
  - This will also allow you to attribute events to variations from other Optimizely projects in your account, even though those experiments don't appear in the same datafile.
  - Note that for results segmentation in Optimizely results, the user attribute values from one event are automatically applied to all other events in the same session, as long as the events in question were actually received by our backend. This behavior was already in place and is not affected by the 3.0 release.
- Support for all types of attribute values, not just strings ([#174](https://github.com/optimizely/javascript-sdk/pull/174), [#204](https://github.com/optimizely/javascript-sdk/pull/204)).
  - All values are passed through to notification listeners.
  - Strings, booleans, and valid numbers are passed to the event dispatcher and can be used for Optimizely results segmentation. A valid number is a finite number in the inclusive range [-2⁵³, 2⁵³].
  - Strings, booleans, and valid numbers are relevant for audience conditions.
- Support for additional matchers in audience conditions ([#174](https://github.com/optimizely/javascript-sdk/pull/174)):
  - An `exists` matcher that passes if the user has a non-null value for the targeted user attribute and fails otherwise.
  - A `substring` matcher that resolves if the user has a string value for the targeted attribute.
  - `gt` (greater than) and `lt` (less than) matchers that resolve if the user has a valid number value for the targeted attribute. A valid number is a finite number in the inclusive range [-2⁵³, 2⁵³].
  - The original (`exact`) matcher can now be used to target booleans and valid numbers, not just strings.
- Support for A/B tests, feature tests, and feature rollouts whose audiences are combined using `"and"` and `"not"` operators, not just the `"or"` operator ([#175](https://github.com/optimizely/javascript-sdk/pull/175))
- Updated Pull Request template and commit message guidelines ([#183](https://github.com/optimizely/javascript-sdk/pull/183)).
- Support for sticky bucketing. You can pass an `$opt_experiment_bucket_map` attribute to ensure that the user gets a specific variation ([#179](https://github.com/optimizely/javascript-sdk/pull/179)).
- Support for bucketing IDs when evaluating feature rollouts, not just when evaluating A/B tests and feature tests ([#200](https://github.com/optimizely/javascript-sdk/pull/200)).
- TypeScript declarations ([#199](https://github.com/optimizely/javascript-sdk/pull/199)).

### Breaking Changes:

- Conversion events sent by 3.0 SDKs don't explicitly name the experiments and variations that are currently targeted to the user, so these events are unattributed in raw events data export. You must use the new _results_ export to determine the variations to which events have been attributed.
- Previously, notification listeners were only given string-valued user attributes because only strings could be passed into various method calls. That is no longer the case. You may pass non-string attribute values, and if you do, you must update your notification listeners to be able to receive whatever values you pass in ([#174](https://github.com/optimizely/javascript-sdk/pull/174), [#204](https://github.com/optimizely/javascript-sdk/pull/204)).
- Drops `window.optimizelyClient` from the bundled build. Now, `window.optimizelySdk` can be used instead. ([#189](https://github.com/optimizely/javascript-sdk/pull/189)).

### Bug Fixes:

- Experiments and features can no longer activate when a negatively targeted attribute has a missing, null, or malformed value ([#174](https://github.com/optimizely/javascript-sdk/pull/174)).
  - Audience conditions (except for the new `exists` matcher) no longer resolve to `false` when they fail to find an legitimate value for the targeted user attribute. The result remains `null` (unknown). Therefore, an audience that negates such a condition (using the `"not"` operator) can no longer resolve to `true` unless there is an unrelated branch in the condition tree that itself resolves to `true`.
- `setForcedVariation` now treats an empty variation key as invalid and does not reset the variation ([#185](https://github.com/optimizely/javascript-sdk/pull/185)).
- You can now specify `0` as the `revenue` or `value` for a conversion event when using the `track` method. Previously, `0` was withheld and would not appear in your data export ([#213](https://github.com/optimizely/javascript-sdk/pull/213)).
- The existence of a feature test in an experimentation group no longer causes A/B tests in the same group to activate the same feature ([#194](https://github.com/optimizely/fullstack-sdk-compatibility-suite/pull/194)).

## [2.3.1] - November 14, 2018

### Fixed

- fix(bundling): Publish the unminified UMD bundle along with the minified one. ([#187](https://github.com/optimizely/javascript-sdk/pull/187))

## [2.3.0] - November 14, 2018

### New Features

- Allow sticky bucketing via passing in `attributes.$opt_experiment_bucket_map`, this more easily allows customers to do some async data fetching and ensure a user gets a specific variation.

```
const userId = '123'
const expId = '456'
const variationId = '678'
const userAttributes = {
  $opt_experiment_bucket_map: {
    [expId]: {
      variation_id: variationId
    }
  }
}

var selectedVariationKey = optimizelyClient.activate('experiment-1', userId, userAttributes);
```

## [2.2.0] - September 26, 2018

### Fixed

- Track and activate should not remove null attributes ([#168](https://github.com/optimizely/javascript-sdk/pull/168))
- Track attributes with valid attribute types ([#166](https://github.com/optimizely/javascript-sdk/pull/166))
- Prevent SDK from initializing if the datafile version in invalid ([#161](https://github.com/optimizely/javascript-sdk/pull/161))
- Updating lerna to latest version ([#160](https://github.com/optimizely/javascript-sdk/pull/160))

### Changed

- Change invalid experiment key to debug level ([#165](https://github.com/optimizely/javascript-sdk/pull/165))

## [2.1.3] - August 21, 2018

### Fixed

- Send all decisions for the same event in one snapshot. ([#155](https://github.com/optimizely/javascript-sdk/pull/155))
- Give Node.js consumers the unbundled package ([#133](https://github.com/optimizely/javascript-sdk/pull/133))

### Deprecated

- The UMD build of the SDK now assigns the SDK namespace object to `window.optimizelySdk` rather than to `window.optimizelyClient`. The old name still works, but on its first access a deprecation warning is logged to the console. The alias will be removed in the 3.0.0 release. ([#152](https://github.com/optimizely/javascript-sdk/pull/152))

## [2.1.2] - June 25, 2018

### Fixed

- Failure to log success message when event dispatched ([#123](https://github.com/optimizely/javascript-sdk/pull/123))
- Fix: Don't call success message when event fails to send ([#123](https://github.com/optimizely/javascript-sdk/pull/123))

## [2.0.5] - June 25, 2018

### Fixed

- Failure to log success message when event dispatched ([#123](https://github.com/optimizely/javascript-sdk/pull/123))
- Fix: Don't call success message when event fails to send ([#123](https://github.com/optimizely/javascript-sdk/pull/123))

## 2.1.1

June 19, 2018

- Fix: send impression event for Feature Test with Feature disabled ([#117](https://github.com/optimizely/javascript-sdk/pull/117))

## 2.0.4

June 19, 2018

- Fix: send impression event for Feature Test with Feature disabled ([#117](https://github.com/optimizely/javascript-sdk/pull/117))

## 2.1.0

May 24, 2018

- Introduces support for bot filtering.

## 2.0.3

May 24, 2018

- Remove [`request`](https://www.npmjs.com/package/request) dependency ([#98](https://github.com/optimizely/javascript-sdk/pull/98))
- Add package-lock.json ([#100](https://github.com/optimizely/javascript-sdk/pull/100))
- Input validation in Activate, Track, and GetVariation methods ([#91](https://github.com/optimizely/javascript-sdk/pull/91) by [@mfahadahmed](https://github.com/mfahadahmed))

## 2.0.1

April 16th, 2018

- Improve browser entry point by pointing to the browser index file instead of the webpack-compiled bundle. ([@DullReferenceException](https://github.com/DullReferenceException) in [#88](https://github.com/optimizely/javascript-sdk/pull/88))

## 2.0.0

April 11th, 2018

This major release of the Optimizely SDK introduces APIs for Feature Management. It also introduces some breaking changes listed below.

### New Features

- Introduces the `isFeatureEnabled` API to determine whether to show a feature to a user or not.

```
var enabled = optimizelyClient.isFeatureEnabled('my_feature_key', 'user_1', userAttributes);
```

- You can also get all the enabled features for the user by calling the following method which returns a list of strings representing the feature keys:

```
var enabledFeatures = optimizelyClient.getEnabledFeatures('user_1', userAttributes);
```

- Introduces Feature Variables to configure or parameterize your feature. There are four variable types: `Integer`, `String`, `Double`, `Boolean`.

```
var stringVariable = optimizelyClient.getFeatureVariableString('my_feature_key', 'string_variable_key', 'user_1');
var integerVariable = optimizelyClient.getFeatureVariableInteger('my_feature_key', 'integer_variable_key', 'user_1');
var doubleVariable = optimizelyClient.getFeatureVariableDouble('my_feature_key', 'double_variable_key', 'user_1');
var booleanVariable = optimizelyClient.getFeatureVariableBoolean('my_feature_key', 'boolean_variable_key', 'user_1');
```

### Breaking changes

- The `track` API with revenue value as a stand-alone parameter has been removed. The revenue value should be passed in as an entry of the event tags map. The key for the revenue tag is `revenue` and will be treated by Optimizely as the key for analyzing revenue data in results.

```
var eventTags = {
  'revenue': 1200
};

optimizelyClient.track('event_key', 'user_id', userAttributes, eventTags);
```

- The package name has changed from `optimizely-client-sdk` to `optimizely-sdk` as we have consolidated both Node and JavaScript SDKs into one.

## 2.0.0-beta1

March 29th, 2018

This major release of the Optimizely SDK introduces APIs for Feature Management. It also introduces some breaking changes listed below.

### New Features

- Introduces the `isFeatureEnabled` API to determine whether to show a feature to a user or not.

```
var enabled = optimizelyClient.isFeatureEnabled('my_feature_key', 'user_1', userAttributes);
```

- You can also get all the enabled features for the user by calling the following method which returns a list of strings representing the feature keys:

```
var enabledFeatures = optimizelyClient.getEnabledFeatures('user_1', userAttributes);
```

- Introduces Feature Variables to configure or parameterize your feature. There are four variable types: `Integer`, `String`, `Double`, `Boolean`.

```
var stringVariable = optimizelyClient.getFeatureVariableString('my_feature_key', 'string_variable_key', 'user_1');
var integerVariable = optimizelyClient.getFeatureVariableInteger('my_feature_key', 'integer_variable_key', 'user_1');
var doubleVariable = optimizelyClient.getFeatureVariableDouble('my_feature_key', 'double_variable_key', 'user_1');
var booleanVariable = optimizelyClient.getFeatureVariableBoolean('my_feature_key', 'boolean_variable_key', 'user_1');
```

### Breaking changes

- The `track` API with revenue value as a stand-alone parameter has been removed. The revenue value should be passed in as an entry of the event tags map. The key for the revenue tag is `revenue` and will be treated by Optimizely as the key for analyzing revenue data in results.

```
var eventTags = {
  'revenue': 1200
};

optimizelyClient.track('event_key', 'user_id', userAttributes, eventTags);
```

- The package name has changed from `optimizely-client-sdk` to `optimizely-sdk` as we have consolidated both Node and JavaScript SDKs into one.

## 1.6.0

- Bump optimizely-server-sdk to version 1.5.0, which includes:
  - Implemented IP anonymization.
  - Implemented bucketing IDs.
  - Implemented notification listeners.

## 1.5.1

- Bump optimizely-server-sdk to version 1.4.2, which includes:
  - Bug fix to filter out undefined values in attributes and event tags
  - Remove a duplicated test

## 1.5.0

- Bump optimizely-server-sdk to version 1.4.0, which includes:
  - Add support for numeric metrics.
  - Add getForcedVariation and setForcedVariation methods for client-side variation setting
  - Bug fix for filtering out null attribute and event tag values

## 1.4.3

- Default skipJSONValidation to true
- Bump optimizely-server-sdk to version 1.3.3, which includes:
  - Removed JSON Schema Validator from Optimizely constructor
  - Updated SDK to use new event endpoint
  - Minor bug fixes

## 1.4.2

- Minor performance improvements.

## 1.4.1

- Switched to karma/browserstack for cross-browser testing
- Removed es6-promise
- Bump optimizely-server-sdk to version 1.3.1, which includes:
  - Minor performance improvements.

## 1.4.0

- Reduce lodash footprint.
- Bump optimizely-server-sdk to version 1.3.0, which includes:
  - Introduced user profile service.
  - Minor performance and readibility improvements.

## 1.3.5

- Bump optimizely-server-sdk to version 1.2.3, which includes:
  - Switched to json-schema library which has a smaller footprint.
  - Refactored order of bucketing logic.
  - Refactor lodash dependencies.
  - Fixed error on validation for objects with undefined values for attributes.

## 1.3.4

- Bump optimizely-server-sdk to version 1.2.2, which includes:
  - Use the 'name' field for tracking event tags instead of 'id'.

## 1.3.3

- Include index.js in package.json files to make sure it gets published regardless of node environment.

## 1.3.2

- Bump to 1.3.2 to re-publish to npm

## 1.3.1

- Bump optimizely-server-sdk to version 1.2.1, which includes:
  - Gracefully handle empty traffic allocation ranges.

## 1.3.0

- Bump optimizely-server-sdk to version 1.2.0, which includes:
  - Introduce support for event tags.
  - Add optional eventTags argument to track method signature.
  - Removed optional eventValue argument from track method signature.
  - Removed optional sessionId argument from activate and track method signatures.
  - Allow log level config on createInstance method.

## 1.2.2

- Remove .npmignore to consolidate with .gitignore.
- Add dist and lib directories to "files" in package.json.

## 1.2.1

- Fix webpack build error.

## 1.2.0

- Bump optimizely-server-sdk to version 1.1.0, which includes:
  - Add optional sessionId argument to activate and track method signatures.
  - Add sessionId and revision to event ticket.
  - Add 'Launched' status where user gets bucketed but event is not sent to Optimizely.

## 1.1.1

- Bump to optimizely-server-sdk to version 1.0.1, which includes:
  - Fix bug so conversion event is not sent if user is not bucketed into any experiment.
  - Bump bluebird version from 3.3.5 to 3.4.6.
  - Update event endpoint from p13nlog.dz.optimizely to logx.optimizely.

## 1.1.0

- Add global variable name export for use in non-CommonJS environments
- Remove redundant lodash core dependency to reduce bundle bloat

## 1.0.0

- Introduce support for Full Stack projects in Optimizely X with no breaking changes from previous version.
- Introduce more graceful exception handling in instantiation and core methods.
- Update whitelisting to take precedence over audience condition evaluation.
- Fix bug activating/tracking with attributes not in the datafile.

## 0.1.4

- Add functionality for New Optimizely endpoint.

## 0.1.3

- Add environment detection to event builder so it can distinguish between events sent from node or the browser.

## 0.1.2

- Add CORS param to prevent browsers from logging cors errors in the console when dispatching events.

## 0.1.1

- Remove percentageIncluded field from JSON schema, which is not needed.

## 0.1.0

- Beta release of the Javascript SDK for our Optimizely testing solution
