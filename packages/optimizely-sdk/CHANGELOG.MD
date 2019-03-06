# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]
Changes that have landed but are not yet released.

## [3.1.0-beta1] - March 5th, 2019

### Changed

- New APIs for setting `logger` and `logLevel` on the optimizelySDK singleton ([#232](https://github.com/optimizely/javascript-sdk/pull/232))
- `logger` and `logLevel` are now set globally for all instances of Optimizely.  If you were passing
different loggers to individual instances of Optimizely, logging behavior may now be different.

#### Setting a ConsoleLogger

```js
var optimizelySDK = require('@optimizely/optimizely-sdk')

// logger and logLevel are now set on the optimizelySDK singleton
optimizelySDK.setLogger(optimizelySDK.logging.createLogger())

// valid levels: 'DEBUG', 'INFO', 'WARN', 'ERROR'
optimizelySDK.setLogLevel('WARN')
// enums can also be used
optimizelySDK.setLogLevel(optimizely.enums.LOG_LEVEL.ERROR)
```

#### Disable logging

```js
var optimizelySDK = require('@optimizely/optimizely-sdk')

optimizelySDK.setLogger(null)
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
  - In Optimizely results, conversion events sent by 3.0 SDKs are automatically attributed to variations that the user has previously seen, as long as our backend has actually received the impression events for those variations.
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
* Allow sticky bucketing via passing in `attributes.$opt_experiment_bucket_map`, this more easily allows customers to do some async data fetching and ensure a user gets a specific variation.

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

* Fix: send impression event for Feature Test with Feature disabled ([#117](https://github.com/optimizely/javascript-sdk/pull/117))

## 2.0.4
June 19, 2018

* Fix: send impression event for Feature Test with Feature disabled ([#117](https://github.com/optimizely/javascript-sdk/pull/117))

## 2.1.0
May 24, 2018

* Introduces support for bot filtering.

## 2.0.3
May 24, 2018

* Remove [`request`](https://www.npmjs.com/package/request) dependency ([#98](https://github.com/optimizely/javascript-sdk/pull/98))
* Add package-lock.json ([#100](https://github.com/optimizely/javascript-sdk/pull/100))
* Input validation in Activate, Track, and GetVariation methods ([#91](https://github.com/optimizely/javascript-sdk/pull/91) by [@mfahadahmed](https://github.com/mfahadahmed))

## 2.0.1
April 16th, 2018

* Improve browser entry point by pointing to the browser index file instead of the webpack-compiled bundle. ([@DullReferenceException](https://github.com/DullReferenceException) in [#88](https://github.com/optimizely/javascript-sdk/pull/88))

## 2.0.0
April 11th, 2018

This major release of the Optimizely SDK introduces APIs for Feature Management. It also introduces some breaking changes listed below.

### New Features
* Introduces the `isFeatureEnabled` API to determine whether to show a feature to a user or not.
```
var enabled = optimizelyClient.isFeatureEnabled('my_feature_key', 'user_1', userAttributes);
```

* You can also get all the enabled features for the user by calling the following method which returns a list of strings representing the feature keys:
```
var enabledFeatures = optimizelyClient.getEnabledFeatures('user_1', userAttributes);
```

* Introduces Feature Variables to configure or parameterize your feature. There are four variable types: `Integer`, `String`, `Double`, `Boolean`.
```
var stringVariable = optimizelyClient.getFeatureVariableString('my_feature_key', 'string_variable_key', 'user_1');
var integerVariable = optimizelyClient.getFeatureVariableInteger('my_feature_key', 'integer_variable_key', 'user_1');
var doubleVariable = optimizelyClient.getFeatureVariableDouble('my_feature_key', 'double_variable_key', 'user_1');
var booleanVariable = optimizelyClient.getFeatureVariableBoolean('my_feature_key', 'boolean_variable_key', 'user_1');
```

### Breaking changes
* The `track` API with revenue value as a stand-alone parameter has been removed. The revenue value should be passed in as an entry of the event tags map. The key for the revenue tag is `revenue` and will be treated by Optimizely as the key for analyzing revenue data in results.
```
var eventTags = {
  'revenue': 1200
};

optimizelyClient.track('event_key', 'user_id', userAttributes, eventTags);
```
* The package name has changed from `optimizely-client-sdk` to `optimizely-sdk` as we have consolidated both Node and JavaScript SDKs into one.

## 2.0.0-beta1
March 29th, 2018

This major release of the Optimizely SDK introduces APIs for Feature Management. It also introduces some breaking changes listed below.

### New Features
* Introduces the `isFeatureEnabled` API to determine whether to show a feature to a user or not.
```
var enabled = optimizelyClient.isFeatureEnabled('my_feature_key', 'user_1', userAttributes);
```

* You can also get all the enabled features for the user by calling the following method which returns a list of strings representing the feature keys:
```
var enabledFeatures = optimizelyClient.getEnabledFeatures('user_1', userAttributes);
```

* Introduces Feature Variables to configure or parameterize your feature. There are four variable types: `Integer`, `String`, `Double`, `Boolean`.
```
var stringVariable = optimizelyClient.getFeatureVariableString('my_feature_key', 'string_variable_key', 'user_1');
var integerVariable = optimizelyClient.getFeatureVariableInteger('my_feature_key', 'integer_variable_key', 'user_1');
var doubleVariable = optimizelyClient.getFeatureVariableDouble('my_feature_key', 'double_variable_key', 'user_1');
var booleanVariable = optimizelyClient.getFeatureVariableBoolean('my_feature_key', 'boolean_variable_key', 'user_1');
```

### Breaking changes
* The `track` API with revenue value as a stand-alone parameter has been removed. The revenue value should be passed in as an entry of the event tags map. The key for the revenue tag is `revenue` and will be treated by Optimizely as the key for analyzing revenue data in results.
```
var eventTags = {
  'revenue': 1200
};

optimizelyClient.track('event_key', 'user_id', userAttributes, eventTags);
```
* The package name has changed from `optimizely-client-sdk` to `optimizely-sdk` as we have consolidated both Node and JavaScript SDKs into one.

## 1.6.0

* Bump optimizely-server-sdk to version 1.5.0, which includes:
  - Implemented IP anonymization.
  - Implemented bucketing IDs.
  - Implemented notification listeners.

## 1.5.1
* Bump optimizely-server-sdk to version 1.4.2, which includes:
  - Bug fix to filter out undefined values in attributes and event tags
  - Remove a duplicated test

## 1.5.0
* Bump optimizely-server-sdk to version 1.4.0, which includes:
  - Add support for numeric metrics.
  - Add getForcedVariation and setForcedVariation methods for client-side variation setting
  - Bug fix for filtering out null attribute and event tag values

## 1.4.3
* Default skipJSONValidation to true
* Bump optimizely-server-sdk to version 1.3.3, which includes:
  - Removed JSON Schema Validator from Optimizely constructor
  - Updated SDK to use new event endpoint
  - Minor bug fixes

## 1.4.2
* Minor performance improvements.

## 1.4.1
* Switched to karma/browserstack for cross-browser testing
* Removed es6-promise
* Bump optimizely-server-sdk to version 1.3.1, which includes:
  - Minor performance improvements.

## 1.4.0
* Reduce lodash footprint.
* Bump optimizely-server-sdk to version 1.3.0, which includes:
  - Introduced user profile service.
  - Minor performance and readibility improvements.

## 1.3.5
* Bump optimizely-server-sdk to version 1.2.3, which includes:
  - Switched to json-schema library which has a smaller footprint.
  - Refactored order of bucketing logic.
  - Refactor lodash dependencies.
  - Fixed error on validation for objects with undefined values for attributes.

## 1.3.4
* Bump optimizely-server-sdk to version 1.2.2, which includes:
  - Use the 'name' field for tracking event tags instead of 'id'.

## 1.3.3
* Include index.js in package.json files to make sure it gets published regardless of node environment.

## 1.3.2
* Bump to 1.3.2 to re-publish to npm

## 1.3.1
* Bump optimizely-server-sdk to version 1.2.1, which includes:
  - Gracefully handle empty traffic allocation ranges.

## 1.3.0
* Bump optimizely-server-sdk to version 1.2.0, which includes:
  - Introduce support for event tags.
  - Add optional eventTags argument to track method signature.
  - Removed optional eventValue argument from track method signature.
  - Removed optional sessionId argument from activate and track method signatures.
  - Allow log level config on createInstance method.

## 1.2.2
* Remove .npmignore to consolidate with .gitignore.
* Add dist and lib directories to "files" in package.json.

## 1.2.1
* Fix webpack build error.

## 1.2.0
* Bump optimizely-server-sdk to version 1.1.0, which includes:
  - Add optional sessionId argument to activate and track method signatures.
  - Add sessionId and revision to event ticket.
  - Add 'Launched' status where user gets bucketed but event is not sent to Optimizely.

## 1.1.1
* Bump to optimizely-server-sdk to version 1.0.1, which includes:
  - Fix bug so conversion event is not sent if user is not bucketed into any experiment.
  - Bump bluebird version from 3.3.5 to 3.4.6.
  - Update event endpoint from p13nlog.dz.optimizely to logx.optimizely.

## 1.1.0
* Add global variable name export for use in non-CommonJS environments
* Remove redundant lodash core dependency to reduce bundle bloat

## 1.0.0
* Introduce support for Full Stack projects in Optimizely X with no breaking changes from previous version.
* Introduce more graceful exception handling in instantiation and core methods.
* Update whitelisting to take precedence over audience condition evaluation.
* Fix bug activating/tracking with attributes not in the datafile.

## 0.1.4
* Add functionality for New Optimizely endpoint.

## 0.1.3
* Add environment detection to event builder so it can distinguish between events sent from node or the browser.

## 0.1.2
* Add CORS param to prevent browsers from logging cors errors in the console when dispatching events.

## 0.1.1
* Remove percentageIncluded field from JSON schema, which is not needed.

## 0.1.0
* Beta release of the Javascript SDK for our Optimizely testing solution
