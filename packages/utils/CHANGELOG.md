# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]
Changes that have landed but are not yet released.

## [0.4.0] - July 27, 2020

- Removed React Native async storage implementation from utils ([#536](https://github.com/optimizely/javascript-sdk/pull/536))

## [0.3.2] - June 15, 2020

### Bug Fixes
- Wrap `uuid.v4` to disallow passing extra arguments and prevent dependency on `uuid` package types ([#509](https://github.com/optimizely/javascript-sdk/pull/509))

## [0.3.1] - June 12, 2020

### Bug Fixes
- Fix exports of `PersistentKeyValueCache` and `ReactNativeAsyncStorageCache` to be named, not default ([#506](https://github.com/optimizely/javascript-sdk/pull/506))

## [0.3.0] - June 11, 2020

### New Features
- Added `PersistentKeyValueCache` interface and its implementation for React Native under `ReactNativeAsyncStorageCache`.

## [0.2.0] - August 7, 2019

### New Features
- Added `objectEntries`
- Added `NOTIFICATION_TYPES` and `NotificationCenter`

## [0.1.0] - March 1, 2019

Initial release
