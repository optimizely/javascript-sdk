# TypeScript Example - Optimizely SDK

This example demonstrates all factory functions from the Optimizely SDK, including static and polling datafile managers.

## Files

- `src/index.ts` - Main example demonstrating all SDK factory functions
- `datafile.json` - Test datafile with Optimizely configuration
- `datafile-server.js` - Simple HTTP server for testing polling datafile manager

## Running the Example

### From Project Root (Recommended)

Run from the project root to automatically build the SDK, create a tarball, and run the example:
```bash
npm run ts-example
```

This will:
1. Install SDK dependencies
2. Pack the SDK as a tarball (triggers build via `prepare` script)
3. Install the tarball in this example
4. Build and run the TypeScript example
5. Start the datafile server automatically
6. Clean up after completion

### Manual Setup

### 1. Start the Datafile Server (for polling manager test)

In a separate terminal, run:
```bash
node datafile-server.js
```

This starts an HTTP server at `http://localhost:8910` that serves the `datafile.json` file. The polling project config manager will fetch updates from this server every 10 seconds.

### 2. Run the Example

```bash
npm start
```

## What This Example Demonstrates

1. **createStaticProjectConfigManager** - Creates a config manager with a static datafile
2. **createInstance** - Creates an Optimizely client instance with the static config manager
3. **createPollingProjectConfigManager** - Creates a config manager that polls for datafile updates from localhost:8910
4. **getSendBeaconEventDispatcher** - Gets the SendBeacon event dispatcher (Node.js returns undefined)
5. **eventDispatcher** - Default event dispatcher
6. **createForwardingEventProcessor** - Creates an event processor that forwards events immediately
7. **createBatchEventProcessor** - Creates an event processor that batches events
8. **createOdpManager** - Creates an Optimizely Data Platform manager
9. **createVuidManager** - Creates a Visitor Unique ID manager

## Test Datafile

The `datafile.json` contains a complete Optimizely configuration with:
- 2 feature flags (`flag_1`, `flag_2`)
- 4 experiments (`exp_1`, `exp_2`, `exp_3`, `exp_4`)
- 7 typed audiences based on age conditions
- 2 rollouts with delivery rules
- 1 integer variable (`integer_variable`)

This datafile is used for testing SDK functionality with realistic configuration.
