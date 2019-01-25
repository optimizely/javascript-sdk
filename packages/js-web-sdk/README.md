# JS SDK Wrapper

### What is it

- A backwards compatible wrapper around the JavascriptSDK
- Provides extendible datafile loading and caching strategies
- Provides mechanisms for only parts of the page to block rendering until Optimizely is loaded (supplying a maximum timeout)
- All new features are opt-in, can be used exactly the same way as JavascriptSDK if desired
- Enqueue `track` calls that happen before the datafile is downloaded


## Datafile loading / management

### Load datafile already on the page

This is the ideal case and prevents a lot of timing issues and complexity, however we realize not all customers will have the ability to this.

```js
import * as optimizelySDK from '@optimizely/js-web-sdk'
const optimizely = optimizelySDK.createInstance({
  datafile: window.datafile,
})
// all calls can happen immediately after (sync)
optimizely.activate('my-exp', 'user1')
```

### Load datafile by SDK Key

By providing the `sdkKey` option to `createInstance` the SDK will automatically fetch the datafile.  If a cached datafile exists it will use the cached version.  Decisions made after the fresh datafile has loaded will use the new datafile.

_Asnyc load and wait until datafile is loaded_

```js
import * as optimizelySDK from '@optimizely/js-web-sdk'
const optimizely = optimizelySDK.createInstance({
  SDKKey: 'GaXr9RoDhRcqXJm3ruskRa',
})

// At this point optimizely can be used, on first page load the datafile will not be fetched and methods will no-op
// On second page load it will use the cached datafile immediately
//
initApp()
```

#### `optimizely.onReady()` to block rendering

By using `await optimizely.onReady()` you can gaurantee code wont be run until the datafile is downloaded

```js
import * as optimizelySDK from '@optimizely/js-web-sdk'
const optimizely = optimizelySDK.createInstance({
  SDKKey: 'GaXr9RoDhRcqXJm3ruskRa',
})

await optimizely.onReady()
// at this point datafile is gauranteed to be loaded
initApp()
```

However, the above example isn't great because Optimizely could time out due to network connectivity issues.  By passing a `timeout` to `optimizely.onReady()` we can gaurantee that Optimizely won't block the page for more than X milliseconds.

```js
import * as optimizelySDK from '@optimizely/js-web-sdk'
const optimizely = optimizelySDK.createInstance({
  SDKKey: 'GaXr9RoDhRcqXJm3ruskRa',
})

// Dont wait more than 200ms, if there is a cached datafile this will immediately resolve
await optimizely.onReady({ timeout: 200 })


// you can also use the Promise API
optimizely.onReady({ timeout: 200 }).then(() => {
  initApp()
})
```

It's worth noting that `optimizely.onReady` can be called as many times, once the datafile has downloaded this will always return a resolved promise.  This is a powerful mechanism to build UI components, as a UI component can be configured to block up to X milliseconds waiting for Optimizely to load, while other parts of the UI are unaffected.


### Second page load

By default loading the datafile by URL will store the contents of the datafile in `localStorage`, on second page load we are guaranteed to have synchronous access to the datafile.

The underlying DatafileManager will also make a background request to get an updated datafile, however that will not be registered until the next instantiation of Optimizely via `optimizely.createInstance` which is usually the next page load.

_When using optimizely async the user will only have to pay the loading cost once on first page load, subsequent page loads are always synchronous_

## Using React

This SDK can be used stand alone to bolster the current javascript-sdk with things like automatic datafile loading and caching.  It can also be used with the [ReactSDK](../react-sdk) to simplify Feature Flagging and AB Testing in React.