# JS SDK Wrapper

# What is it

- A backwards compatible wrapper around the JavascriptSDK
- Provides extendible datafile loading and caching strategies
- Handles async loading of userId and UserAttributes
- Provides mechanisms to block rendering / execution until Optimizely is loaeded with a fallback timeout
- All new features are opt-in, can be used exactly the same way as JavascriptSDK if desired


# Datafile loading / management

## Load datafile already on the page

This is the ideal case and prevents a lot of timing issues and complexity, however we realize not all customers will have the ability to this.

```js
import { Optimizely } from '@optimizely/js-web-sdk'
const optimizely = new Optimizely({
  datafile: window.datafile,
})
// all calls can happen immediately after (sync)
optimizely.activate('my-exp', 'user1')
```

## Load datafile by URL

This is not an optimal solution as it requires us to think about timing and ensure that we only call `optimizely` functions after the datafile is loaded or ensure we handle the case where `optimizely` is not ready and we need to delay loading or display a default.

_Asnyc load and wait until datafile is loaded_

```js
import { Optimizely } from '@optimizely/js-web-sdk'

const datafileUrl = 'https://cdn.optimizely.com/datafiles/GaXr9RoDhRcqXJm3ruskRa.json'
const optimizely = new Optimizely({
  datafileUrl,
})
await optimizely.onReady()
// datafile is gauranteed to be loaded
initApp()
```

The above example may not be great, perhaps you want a gaurantee that the page wont block longer than X milliseconds.

_Asnyc load and wait up til 100ms_

```js
import { Optimizely } from '@optimizely/js-web-sdk'

const datafileUrl = 'https://cdn.optimizely.com/datafiles/GaXr9RoDhRcqXJm3ruskRa.json'
const optimizely = new Optimizely({
  datafileUrl,
})
// dont block for more than 100sec
await optimizely.onReady({ timeout: 100 })
// at this point datafile may or may not be loaded
// however calls to track will be queued when the datafile is ready
initApp()

// additionally in other places you can hook into onReady without a timeout
// to gaurantee optimizely is loaded
optimizely.onReady().then(() => {
  // optimizely is gauranteed to be loaded at this point
})
```

### Second page load

By default loading the datafile by URL will store the contents of the datafile in `localStorage`, on second page load we are guaranteed to have synchronous access to the datafile.

The underlying DatafileManager will also make a background request to get an updated datafile, however that will not be registered until the next instantiation of `Optimizely` which is usually the next page load.

_When using optimizely async the user will only have to pay the loading cost once on first page load, subsequent page loads are always synchronous_

### Using React

```js
// ./optimizely.js
import { Optimizely } from '@optimizely/js-web-sdk'

const datafileUrl = 'https://cdn.optimizely.com/datafiles/GaXr9RoDhRcqXJm3ruskRa.json'
const optimizely = new Optimizely({
  datafileUrl: datafileUrl,
  userId: window.userId,
})

export { optimizely }
```

```jsx
// ./App.jsx
import React, { Component } from 'react'
import { optimizely } from './optimizely'
import {
  OptimizelyProvider,
  OptimizelyExperiment,
} from '@optimizely/react-sdk'

class App extends Component {
  render() {
    <OptimizelyProvider optimizely={optimizely} timeout={50}>
      <OptimizelyExperiment experiment="header-test">
        {variation =>
          variation === 'detailed' ? <DetailedHeader /> : <SimpleHeader />
        }
      </OptimizelyExperiment>
    </OptimizelyProvider>
  }
}
```

In the above example, setting `timeout={50}` will allow any Optimizely components to wait up to 50ms for the datafile to load.

_Benefits to the React approach_
In the case where the datafile is already loaded, either from being on the page already or cached in local storage this approach doesn’t have a flash or a loading spinner.

On first page load, if the datafile is slow (due to slow connection) it will render the fallback.

# User management

## Storing userId and attributes on instance

This SDK supports remembering userId and attributes by passing them to instantiation

```js
import { Optimizely } from '@optimizely/js-web-sdk'
const optimizely = new Optimizely({
  datafile: window.datafile,
  userId: window.userId
  attibutes: {
    plan_type: 'silver'
  }
})
// no need to pass userId or attributes
optimizely.activate('my-exp')

// you can always override on a per call basis
optimizely.activate('my-exp', 'otheruser', {
  plan_type: 'gold',
})

// However this isn't recommeneded as "track" calls also need to match this
// TODO: does easy event tracking fix this?
```

## Generating a random user Id and storing in cookie

The following code will generate a random userId if the user doesnt already have one saved in a cookie.

```js
import {
  Optimizely,
  CookieRandomUserIdLoader,
} from '@optimizely/js-web-sdk'

const optimizely = new Optimizely({
  datafile: window.datafile,
  userIdLoader: new CookieRandomUserIdLoader(),
  attibutes: {
    plan_type: 'silver'
  }
})
```

## Not managing User IDs

Of course this is totally opt in, you can continue to pass userId into all api calls, the same as the Node Javascript SDK

```js
import { Optimizely } from '@optimizely/js-web-sdk'

const optimizely = new Optimizely({
  datafile: window.datafile,
})
optimizely.activate('exp1', 'user1')
```
