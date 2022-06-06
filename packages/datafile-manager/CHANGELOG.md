# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]
Changes that have landed but are not yet released.

## [0.9.5] - June 6, 2022

### Changed
- Changed typescript types file path from `lib/index.d.ts` to `lib/index.node.d.ts`.

## [0.9.4] - February 2, 2022

### Changed
- Made `@react-native-async-storage/async-storage` an optional peer dependency.

## [0.9.3] - January 31, 2022

### Changed
- Reverted changes in `0.9.2` and made `@react-native-async-storage/async-storage` a peer dependency again. Making it an optional dependency did not work as expected.

## [0.9.2] - January 28, 2022

### Changed
- Made `@react-native-async-storage/async-storage` an optional dependency.

## [0.9.1] - October 13, 2021

### Fixed
- Downgrade version of typescript to `3.8.x` to fix stubbing issue.
- Update version of logging to `0.3.1` to fix stubbing issue.

## [0.9.0] - October 8, 2021

### Changed
- Update `@optimizely/js-sdk-logging` to `0.3.0`.

## [0.8.1] - May 25, 2021

### Fixed

- Replaced the deprecated `@react-native-community/async-storage` with `@react-native-async-storage/async-storage`.

## [0.8.0] - September 1, 2020

### Changed

- Modified datafile manager to accept, process, and return the datafile's string representation instead of the datafile object.
- Remove JSON parsing of response received from datafile fetch request
  - Responsibility of validating the datafile now solely belongs to the project config manager
- Modified React Native async storage cache and persistent value cache implementation to store strings instead of objects as values.

## [0.7.0] - July 28, 2020

### Changed

- Move React Native async storage implementation to datafile manager

## [0.6.0] - June 8, 2020

### New Features
- Added support for authenticated datafiles. `NodeDatafileManager` now accepts `datafileAccessToken` to be able to fetch authenticated datafiles.

## [0.5.0] - April 17, 2020

### Breaking Changes
- Removed `StaticDatafileManager` from all top level exports
- Dropped support for Node.js version <8

### Fixed

- Node datafile manager requests use gzip,deflate compression

## [0.4.0] - June 12, 2019

### Changed
- Changed name of top-level exports in index.node.ts and index.browser.ts from `DatafileManager` to `HttpPollingDatafileManager`, to avoid name conflict with `DatafileManager` interface

## [0.3.0] - May 13, 2019

### New Features
- Added 60 second timeout for all requests

### Changed
- Changed value for node in engines in package.json from >=4.0.0 to >=6.0.0
- Updated polling behavior:
  - Start update interval timer immediately after request
  - When update interval timer fires during request, wait until request completes, then immediately start next request
- Remove `timeoutFactory` property from `HTTPPollingDatafileManager` constructor argument object

## [0.2.0] - April 9, 2019

### Changed
- Increase max error count in backoff controller (can now delay requests for up to 512 seconds) [(#17)](https://github.com/optimizely/javascript-sdk-dev/pull/17)
- Change expected format of `urlTemplate` to be sprintf-compatible (`%s` is replaced with `sdkKey`) [(#17)](https://github.com/optimizely/javascript-sdk-dev/pull/17)
- Promise returned from `onReady` is resolved immediately when `datafile` provided in constructor [(#14)](https://github.com/optimizely/javascript-sdk-dev/pull/14)
- Emit update event whenever datafile changes, not only if `autoUpdate` is true [(#14)](https://github.com/optimizely/javascript-sdk-dev/pull/14)

### Fixed

- Fix for Node.js requests when `urlTemplate` contains a port [(#18)](https://github.com/optimizely/javascript-sdk-dev/pull/18)

## [0.1.0] - March 4, 2019

Initial release
