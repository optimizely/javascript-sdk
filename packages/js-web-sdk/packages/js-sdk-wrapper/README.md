# JS Web SDK
# Datafile loading / management
## Load datafile already on the page
This is the ideal case and prevents a lot of timing issues and complexity, however we realize not all customers will have access to this.

```js
import { Optimizely} from '@optimizely/js-web-sdk'
const optimizely = new Optimizely({
	datafile: window.datafile,
  userId: window.userId,
})
optimizely.initialize()
// all calls can happen immediately after (sync)
optimizely.activate('my-exp')
```

## Load datafile by URL 
This is not an optimal solution as it requires us to think about timing and ensure that we only call `optimizely` functions after the datafile is loaded or ensure we handle the case where `optimizely` is not ready and we need to delay loading or display a default.

*Asnyc load and wait until datafile is loaded*
```js
import {
  Optimizely,
  URLDatafileManager,
} from '@optimizely/js-web-sdk'

const datafileManager = new URLDatafileManager({
  url: datafileUrl,
})
const optimizely = new Optimizely({
  datafileManager,
  userId: window.userId,
})
await optimizely.initialize()
// at this point datafile may or may not be loaded
initApp()

optimizely.onReady(() => {
  // optimizely is gauranteed to be loaded at this point
})
```

*Asnyc load and wait up til 100ms*
```js
import {
  Optimizely,
  URLDatafileManager,
} from '@optimizely/js-web-sdk'

const datafileManager = new URLDatafileManager({
  url: datafileUrl,
})
const optimizely = new Optimizely({
  datafileManager,
  userId: window.userId,
})
await optimizely.initialize({ timeout: 100 })
// at this point datafile may or may not be loaded

initApp()

optimizely.onReady(() => {
  // optimizely is gauranteed to be loaded at this point
})
```

Notice that we use `optimizely.initialize` to allow the datafile to try to load in the allotted time, if it doesn’t load in time then we proceed and a hook `onReady` is provided where you can attach functions that are called when the datafile is loaded

### Second page load

By default the `URLDatafileManager` will store the contents of the datafile in `localStorage`, on second page load we are guaranteed to have synchronous access to the datafile.

The URLDatafileManager will also make a background request to get an updated datafile, however that will not be registered until the next instantiation of `Optimizely` which is usually the next page load.

*When using optimizely async the user will only have to pay the loading cost once on first page load, subsequent page loads are always synchronous*


### Using React

```js
// ./optimizely.js
import {
  Optimizely,
  URLDatafileManager,
} from '@optimizely/js-web-sdk'

const datafileManager = new URLDatafileManager({
  url: datafileUrl,
})
const optimizely = new Optimizely({
  datafileManager,
  userId: window.userId,
})
// note we aren't using await here because our React Components will handle waiting for the datafile
optimizely.initialize()

export { optimizely }
```

```jsx
// ./App.jsx
import React, {Component} from 'react'
import { optimizely } from './optimizely'
import {
  OptimizelyProvider,
  OptimizelyExperiment,
  OptimizelyReady,
} from '@optimizely/react-sdk'

class App extends Component {
  render() {
     <OptimizelyProvider optimizely={optimizely}>
        <OptimizelyReady 
          fallbackTimeout={50} // wait 50ms max
          fallback={() => <h1>Optimizely didnt load</h1>}
        >
          {/* Optimizely is gauranteed to be loaded */}
          <OptimizelyExperiment experiment="header-test">
            {(variation) => (
              variation === 'detailed'
                ? <DetailedHeader />
                : <SimpleHeader />
            )}
          </OptimizelyExperiment>
        </OptimizelyReady>
     </OptimizelyProvider>

  }
}
```

*Benefits to the React approach*
In the case where the datafile is already loaded, either from being on the page already or cached in local storage this approach doesn’t have a flash or a loading spinner.

On first page load, if the datafile is slow (due to slow connection) it will render the fallback.

*Differences between `OptimizelyReady` and `OptimizelySuspense`*

Should there be two things a loadingTimeout and a fallbackTimeout?


## Invoking a function queue when the client gets Datafile

## User ID Management
* Create a random user id
	* how long to manage it
		* infinite
		* Session storage
		* debounced XX days / hours?
* Can set user id 

## Experiment state
## 

## Different kind of change types
Requires us to be able to put data on variations

Specific environments can be marked as “carrying data”

Or do we need a special environment for JS WEB SDK

#sdk
#work