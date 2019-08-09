# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]
Changes that have landed but are not yet released.

### New Features
- In `AbstractEventProcessor`, validate maxQueueSize and flushInterval; ignore & use default values when invalid

### Changed
- Removed transformers, interceptors, and callbacks from `AbstractEventProcessor`

## [0.2.1] - June 6, 2019

- Wrap the `callback` in `try/catch` when implementing a custom `eventDispatcher`.  This ensures invoking the `callback` will always cleanup any pending retry tasks.

## [0.2.0] - March 27, 2019

- Add `PendingEventsDispatcher` to wrap another EventDispatcher with retry support for
events that did not send successfully due to page navigation

## [0.1.0] - March 1, 2019

Initial release
