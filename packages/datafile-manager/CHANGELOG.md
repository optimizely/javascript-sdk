# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]
Changes that have landed but are not yet released.

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
