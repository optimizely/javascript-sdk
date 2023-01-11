<h3 align="center">
  Optimizely JavaScript SDK
</h3>

<p align="center">
  This repository houses the official JavaScript SDK for use with Optimizely Full Stack and Optimizely Rollouts.
</p>

Optimizely Full Stack is A/B testing and feature flag management for product development teams. Experiment in any application. Make every feature on your roadmap an opportunity to learn. Learn more at https://www.optimizely.com/platform/full-stack/, or see the [documentation](https://docs.developers.optimizely.com/full-stack/docs).

Optimizely Rollouts is free feature flags for development teams. Easily roll out and roll back features in any application without code deploys. Mitigate risk for every feature on your roadmap. Learn more at https://www.optimizely.com/rollouts/, or see the [documentation](https://docs.developers.optimizely.com/rollouts/docs).


## Packages

Test commit

This repository is a monorepo. It houses the main Javascript SDK and its supporting packages.

| Package                                                | Version                                                                                                                                   | Docs                                                                                                                                                                                                                                                                          | Description                                                                        |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [`@optimizely/optimizely-sdk`](/packages/optimizely-sdk) | [![npm](https://img.shields.io/npm/v/%40optimizely%2Foptimizely-sdk.svg)](https://www.npmjs.com/package/@optimizely/optimizely-sdk)     | [![](https://img.shields.io/badge/API%20Docs-site-green.svg?style=flat-square)](https://docs.developers.optimizely.com/full-stack/docs/javascript-node-sdk)           | The Optimizely SDK                                                                                                  |
| [`@optimizely/js-sdk-datafile-manager`](/packages/datafile-manager) | [![npm](https://img.shields.io/npm/v/%40optimizely%2Fjs-sdk-datafile-manager.svg)](https://www.npmjs.com/package/@optimizely/js-sdk-datafile-manager)     | [![](https://img.shields.io/badge/API%20Docs-site-green.svg?style=flat-square)](https://docs.developers.optimizely.com/full-stack/docs/initialize-sdk-javascript-node#customize-datafile-management-behavior)           | Datafile Manager for Optimizely SDK
| [`@optimizely/js-sdk-event-processor`](/packages/event-processor) | [![npm](https://img.shields.io/npm/v/%40optimizely%2Fjs-sdk-event-processor.svg)](https://www.npmjs.com/package/@optimizely/js-sdk-event-processor)     | [![](https://img.shields.io/badge/API%20Docs-site-green.svg?style=flat-square)](https://docs.developers.optimizely.com/full-stack/docs/event-batching-javascript-node)           | Event Batching support for Optimizely SDK
| [`@optimizely/js-sdk-logging`](/packages/logging) | [![npm](https://img.shields.io/npm/v/%40optimizely%2Fjs-sdk-logging.svg)](https://www.npmjs.com/package/@optimizely/js-sdk-logging)     | [![](https://img.shields.io/badge/API%20Docs-site-green.svg?style=flat-square)](https://docs.developers.optimizely.com/full-stack/docs/customize-logger-javascript-node)           | Logging Manager for Optimizely SDK
| [`@optimizely/js-sdk-utils`](/packages/utils) | [![npm](https://img.shields.io/npm/v/%40optimizely%2Fjs-sdk-utils.svg)](https://www.npmjs.com/package/@optimizely/js-sdk-utils)     |            | Utility functions for Optimizely packages

## About

`@optimizely/optimizely-sdk` is developed and maintained by [Optimizely](https://optimizely.com) and many [contributors](https://github.com/optimizely/javascript-sdk/graphs/contributors). If you're interested in learning more about what Optimizely X Full Stack can do for your company, please [get in touch](mailto:eng@optimizely.com)!


### Contributing

Please see [CONTRIBUTING](CONTRIBUTING.md).

## Credits

First-party code (under `packages/optimizely-sdk/lib/`, `packages/datafile-manager/lib`, `packages/datafile-manager/src`, `packages/datafile-manager/__test__`, `packages/event-processor/src`, `packages/event-processor/__tests__`, `packages/logging/src`, `packages/logging/__tests__`, `packages/utils/src`, `packages/utils/__tests__`) is copyright Optimizely, Inc. and contributors, licensed under Apache 2.0.

## Additional Code

Prod dependencies are as follows:

```json
{
  "json-schema@0.4.0": {
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
