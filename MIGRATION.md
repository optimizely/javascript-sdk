# Migrating v5 to v6

This guide will help you migrate your implementation from Optimizely JavaScript SDK v5 to v6. The new version introduces several architectural changes that provide more flexibility and control over SDK components.

## Table of Contents

1. [Major Changes](#major-changes)
2. [Client Initialization](#client-initialization)
3. [Project Configuration Management](#project-configuration-management)
4. [Event Processing](#event-processing)
5. [ODP Management](#odp-management)
6. [VUID Management](#vuid-management)
7. [Error Handling](#error-handling)
8. [Logging](#logging)
9. [onReady Promise Behavior](#onready-promise-behavior)
10. [Dispose of Client](#dispose-of-client)
11. [Migration Examples](#migration-examples)

## Major Changes

In v6, the SDK architecture has been modularized to give you more control over different components:

- The monolithic `createInstance` call is now split into multiple factory functions
- Core functionality (project configuration, event processing, ODP, VUID, logging, and error handling) is now configured through dedicated components created via factory functions, giving you greater flexibility and control in enabling/disabling certain components and allowing optimizing the bundle size for frontend projects.
- Event dispatcher interface has been updated to use Promises
- onReady Promise behavior has changed

## Client Initialization

### v5 (Before)

```javascript
import { createInstance } from '@optimizely/optimizely-sdk';

const optimizely = createInstance({
  sdkKey: '<YOUR_SDK_KEY>',
  datafile: datafile, // optional
  datafileOptions: {
    autoUpdate: true,
    updateInterval: 300000, // 5 minutes
  },
  eventBatchSize: 10,
  eventFlushInterval: 1000,
  logLevel: LogLevel.DEBUG,
  errorHandler: { handleError: (error) => console.error(error) },
  odpOptions: {
    disabled: false,
    segmentsCacheSize: 100,
    segmentsCacheTimeout: 600000, // 10 minutes
  }
});
```

### v6 (After)

```javascript
import {
  createInstance,
  createPollingProjectConfigManager,
  createBatchEventProcessor,
  createOdpManager,
  createVuidManager,
  createLogger,
  createErrorNotifier,
  DEBUG
} from "@optimizely/optimizely-sdk";

// Create a project config manager
const projectConfigManager = createPollingProjectConfigManager({
  sdkKey: '<YOUR_SDK_KEY>',
  datafile: datafile, // optional
  autoUpdate: true,
  updateInterval: 300000, // 5 minutes in milliseconds
});

// Create an event processor
const eventProcessor = createBatchEventProcessor({
  batchSize: 10,
  flushInterval: 1000,
});

// Create an ODP manager
const odpManager = createOdpManager({
  segmentsCacheSize: 100,
  segmentsCacheTimeout: 600000, // 10 minutes
});

// Create a VUID manager (optional)
const vuidManager = createVuidManager({
  enableVuid: true
});

// Create a logger
const logger = createLogger({
  level: DEBUG
});

// Create an error notifier
const errorNotifier = createErrorNotifier({
  handleError: (error) => console.error(error)
});

// Create the Optimizely client instance
const optimizely = createInstance({
  projectConfigManager,
  eventProcessor,
  odpManager,
  vuidManager,
  logger,
  errorNotifier
});
```

## Project Configuration Management

In v6, datafile management must be configured by passing in a `projectConfigManager`. Choose either:

### Polling Project Config Manager

For automatic datafile updates:

```javascript
const projectConfigManager = createPollingProjectConfigManager({
  sdkKey: '<YOUR_SDK_KEY>',
  datafile: datafileString, // optional
  autoUpdate: true,
  updateInterval: 60000, // 1 minute
  urlTemplate: 'https://custom-cdn.com/datafiles/%s.json' // optional
});
```

### Static Project Config Manager

When you want to manage datafile updates manually or want to use a fixed datafile:

```javascript
const projectConfigManager = createStaticProjectConfigManager({
  datafile: datafileString,
});
```

## Event Processing

In v5, a batch event processor was enabled by default. In v6, an event processor must be instantiated and passed in 
explicitly to `createInstance` via the `eventProcessor` option to enable event processing, otherwise no events will 
be dispatched. v6 provides two types of event processors:

### Batch Event Processor

Queues events and sends them in batches:

```javascript
const batchEventProcessor = createBatchEventProcessor({
  batchSize: 10, // optional, default is 10
  flushInterval: 1000, // optional, default 1000 for browser
});
```

### Forwarding Event Processor

Sends events immediately:

```javascript
const forwardingEventProcessor = createForwardingEventProcessor();
```

### Custom event dispatcher
In both v5 and v6, custom event dispatchers must implement the `EventDispatcher` interface. In v5, the `EventDispatcher` interface has been updated so that the `dispatchEvent` method returns a Promise instead of calling a callback.

In v5 (Before):

```javascript
export type EventDispatcherResponse = {
  statusCode: number  
}

export type EventDispatcherCallback = (response: EventDispatcherResponse) => void

export interface EventDispatcher {
  dispatchEvent(event: EventV1Request, callback: EventDispatcherCallback): void
}
```

In v6(After):

```javascript
export type EventDispatcherResponse = {
  statusCode?: number  
}

export interface EventDispatcher {
  dispatchEvent(event: LogEvent): Promise<EventDispatcherResponse>
}
```

## ODP Management

In v5, ODP functionality was configured via `odpOptions` and enabled by default. In v6, instantiate an OdpManager and pass to `createInstance` to enable ODP:

### v5 (Before)

```javascript
const optimizely = createInstance({
  sdkKey: '<YOUR_SDK_KEY>',
  odpOptions: {
    disabled: false,
    segmentsCacheSize: 100,
    segmentsCacheTimeout: 600000, // 10 minutes
    eventApiTimeout: 1000,
    segmentsApiTimeout: 1000,
  }
});
```

### v6 (After)

```javascript
const odpManager = createOdpManager({
  segmentsCacheSize: 100,
  segmentsCacheTimeout: 600000, // 10 minutes
  eventApiTimeout: 1000,
  segmentsApiTimeout: 1000,
  eventBatchSize: 5, // Now configurable in browser
  eventFlushInterval: 3000, // Now configurable in browser
});

const optimizely = createInstance({
  projectConfigManager,
  odpManager
});
```

To disable ODP functionality in v6, simply don't provide an ODP Manager to the client instance.

## VUID Management

In v6, VUID tracking is disabled by default and must be explicitly enabled by createing a vuidManager with `enableVuid` set to `true` and passing it to `createInstance`:

```javascript
const vuidManager = createVuidManager({
  enableVuid: true, // Explicitly enable VUID tracking
});

const optimizely = createInstance({
  projectConfigManager,
  vuidManager
});
```

## Error Handling

Error handling in v6 uses a new errorNotifier object:

### v5 (Before)

```javascript
const optimizely = createInstance({
  errorHandler: {
    handleError: (error) => {
      console.error("Custom error handler", error);
    }
  }
});
```

### v6 (After)

```javascript
const errorNotifier = createErrorNotifier({
  handleError: (error) => {
    console.error("Custom error handler", error);
  }
});

const optimizely = createInstance({
  projectConfigManager,
  errorNotifier
});
```

## Logging

Logging in v6 is disabled by defualt, and must be enabled by passing in a logger created via a factory function:

### v5 (Before)

```javascript
const optimizely = createInstance({
  logLevel: LogLevel.DEBUG
});
```

### v6 (After)

```javascript
import { createLogger, DEBUG } from "@optimizely/optimizely-sdk";

const logger = createLogger({
  level: DEBUG
});

const optimizely = createInstance({
  projectConfigManager,
  logger
});
```

## onReady Promise Behavior

The `onReady()` method behavior has changed in v6. In v5, onReady() fulfilled with an object that had two fields: `success` and `reason`. If the instance failed to initialize, `success` would be `false` and `reason` will contain an error message. In v6, if onReady() fulfills, that means the instance is ready to use, the fulfillment value is of unknown type and need not to be inspected. If the promise rejects, that means there was an error during initialization.

### v5 (Before)

```javascript
optimizely.onReady().then(({ success, reason }) => {
  if (success) {
    // optimizely is ready to use
  } else {
    console.log(`initialization unsuccessful: ${reason}`);
  }
});
```

### v6 (After)

```javascript
optimizely
  .onReady()
  .then(() => {
    // optimizely is ready to use
    console.log("Client is ready");
  })
  .catch((err) => {
    console.error("Error initializing Optimizely client:", err);
  });
```

## Migration Examples

### Basic Example with SDK Key

#### v5 (Before)

```javascript
import { createInstance } from '@optimizely/optimizely-sdk';

const optimizely = createInstance({
  sdkKey: '<YOUR_SDK_KEY>'
});

optimizely.onReady().then(({ success }) => {
  if (success) {
    // Use the client
  }
});
```

#### v6 (After)

```javascript
import { 
  createInstance, 
  createPollingProjectConfigManager 
} from '@optimizely/optimizely-sdk';

const projectConfigManager = createPollingProjectConfigManager({
  sdkKey: '<YOUR_SDK_KEY>'
});

const optimizely = createInstance({
  projectConfigManager
});

optimizely
  .onReady()
  .then(() => {
    // Use the client
  })
  .catch(err => {
    console.error(err);
  });
```

### Complete Example with ODP and Event Batching

#### v5 (Before)

```javascript
import { createInstance, LogLevel } from '@optimizely/optimizely-sdk';

const optimizely = createInstance({
  sdkKey: '<YOUR_SDK_KEY>',
  datafileOptions: {
    autoUpdate: true,
    updateInterval: 60000 // 1 minute
  },
  eventBatchSize: 3,
  eventFlushInterval: 10000, // 10 seconds
  logLevel: LogLevel.DEBUG,
  odpOptions: {
    segmentsCacheSize: 10,
    segmentsCacheTimeout: 60000 // 1 minute
  }
});

optimizely.notificationCenter.addNotificationListener(
  enums.NOTIFICATION_TYPES.TRACK,
  (payload) => {
    console.log("Track event", payload);
  }
);
```

#### v6 (After)

```javascript
import { 
  createInstance, 
  createPollingProjectConfigManager,
  createBatchEventProcessor,
  createOdpManager,
  createLogger,
  DEBUG,
  NOTIFICATION_TYPES
} from '@optimizely/optimizely-sdk';

const projectConfigManager = createPollingProjectConfigManager({
  sdkKey: '<YOUR_SDK_KEY>',
  autoUpdate: true,
  updateInterval: 60000 // 1 minute
});

const batchEventProcessor = createBatchEventProcessor({
  batchSize: 3,
  flushInterval: 10000, // 10 seconds
});

const odpManager = createOdpManager({
  segmentsCacheSize: 10,
  segmentsCacheTimeout: 60000 // 1 minute
});

const logger = createLogger({
  level: DEBUG
});

const optimizely = createInstance({
  projectConfigManager,
  eventProcessor: batchEventProcessor,
  odpManager,
  logger
});

optimizely.notificationCenter.addNotificationListener(
  NOTIFICATION_TYPES.TRACK,
  (payload) => {
    console.log("Track event", payload);
  }
);
```

For complete implementation examples, refer to the [Optimizely JavaScript SDK documentation](https://docs.developers.optimizely.com/feature-experimentation/docs/javascript-browser-sdk-v6).
