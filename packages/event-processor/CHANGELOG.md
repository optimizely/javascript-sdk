# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]
Changes that have landed but are not yet released.

## [0.10.0] - February 2, 2022

### Changed
- Added support for closingDispatcher

## [0.9.5] - February 2, 2022

### Changed
- Made these react native peer dependencies optional.
  - `@react-native-async-storage/async-storage`
  - `@react-native-community/netinfo`

## [0.9.4] - January 31, 2022

### Changed
- Reverted changes in `0.9.3`. Changed these back to peer dependencies. Making them optional did not work as expected.
  - `@react-native-async-storage/async-storage`
  - `@react-native-community/netinfo`

## [0.9.3] - January 28, 2022

### Changed
- Made these react native dependencies optional.
  - `@react-native-async-storage/async-storage`
  - `@react-native-community/netinfo`

## [0.9.2] - November 3, 2021

### Fixed
- Impression event should send empty `experimentId` and `variationKey` instead of `null` when no `experiment` or `variation` is found.

## [0.9.1] - October 13, 2021

### Fixed
- Update version of logging to `0.3.1` to fix stubbing issue.

## [0.9.0] - October 8, 2021

### Changed
- Update `@optimizely/js-sdk-logging` to `0.3.0`.

## [0.8.2] - June 14th, 2021

### Fixed
- Update `ConversionEvent` interface to allow event `id` type null and `tags` type undefined.

## [0.8.1] - May 25th, 2021

### Fixed
- Replaced the deprecated `@react-native-community/async-storage` with `@react-native-async-storage/async-storage`.

## [0.8.0] - November 10th, 2020

### New Features
- Update `Visitor.Snapshot` to include `enabled` in decision metadata object to support sending flag decisions.

## [0.7.0] - October 16th, 2020

### New Features
- Update `Visitor.Snapshot` to include metadata object to support sending flag decisions.

## [0.6.0] - July 28, 2020

### Fixed
- Upgrade utils dependency version

## [0.5.1] - July 22, 2020

### Fixed
- In event processor, reverted back the typescript version to fix stubbing issue

## [0.5.0] - July 21, 2020

### New Features
- Added Offline storage support to Event processor for React Native Apps

## [0.4.0] - February 19, 2020

### New Features
- Promise returned from `stop` method of `EventProcessor` now tracks the state of all in-flight dispatcher requests, not just the final request that was triggered at the time `stop` was called

## [0.3.2] - October 21, 2019

- Fixed a runtime error when accessing localstorage in `PendingEventsStore` when SDK is used in a React Native application. Pending events will still not be stored when SDK is used in React Native but no error will be thrown anymore.

## [0.3.1] - August 29, 2019

### Fixed
- `DefaultEventQueue` no longer enqueues additional events after being stopped. As a result, `AbstractEventProcessor` no longer processes events after being stopped.
- `DefaultEventQueue` clears its buffer after being stopped. Event duplication, which was previously possible when additional events were enqueued after the stop, is no longer possible.

## [0.3.0] - August 13, 2019

### New Features
- In `AbstractEventProcessor`, validate `maxQueueSize` and `flushInterval`; ignore & use default values when invalid
- `AbstractEventProcessor` can be constructed with a `notificationCenter`. When `notificationCenter` is provided, it triggers a log event notification after the event is sent to the event dispatcher

### Changed
- Removed transformers, interceptors, and callbacks from `AbstractEventProcessor`
- Removed grouping events by context and dispatching one event per group at flush time. Instead, only maintain one group and flush immediately when an incompatible event is processed.

## [0.2.1] - June 6, 2019

- Wrap the `callback` in `try/catch` when implementing a custom `eventDispatcher`.  This ensures invoking the `callback` will always cleanup any pending retry tasks.

## [0.2.0] - March 27, 2019

- Add `PendingEventsDispatcher` to wrap another EventDispatcher with retry support for
events that did not send successfully due to page navigation

## [0.1.0] - March 1, 2019

Initial release
