# Optimizely SDK React

Use Optimizely Feature Flags and AB Tests easily in React with a library of pre-built components.

### Features

- Automatic datafile downloading and caching (through LocalStorage)
- User ID + Attributes memoization
- Render blocking until datafile is ready via an easy to use React API
- Optimizely Timeout - only block rendering up to X ms
- Event queuing for `track`, allows `track` calls to happen before datafile is downloaded
- Library of React components to use with Feature Flags and AB Tests

### Compatibility

`React 15.x +`

### Example

```jsx
import {
  OptimizelyProvider,
  OptimizelyExperiment,
  OptimizelyVariation,
  OptimizelyFeature,
} from '@optimizely/react-sdk'
import optimizelySDK from '@optimizely/js-web-sdk'

const optimizely = optimizelySDK.createInstance({
  sdkKey: 'your-optimizely-sdk-key',
})

class App extends React.Component {
  render() {
    <OptimizelyProvider
      optimizely={optimizely}
      timeout={500}
      userId={window.userId}
      userAttributes={{ plan_type: 'bronze' }}
    >
      <OptimizelyExperiment experiment="ab-test">
        {(variation) => (
          <p>got variation {variation}</p>
        )}
      </OptimizelyExperiment>

      <OptimizelyExperiment experiment="button-color">
        <OptimizelyVariation variation="blue">
          <BlueButton />
        </OptimizelyVariation>

        <OptimizelyVariation variation="green">
          <GreenButton />
        </OptimizelyVariation>

        <OptimizelyVariation default>
          <DefaultButton />
        </OptimizelyVariation>
      </OptimizelyExperiment>

      <OptimizelyFeature feature="sort-algorithm">
        {(isEnabled, variables) => (
          <SearchComponent algorithm={variables.algorithm} />
        )}
      </OptimizelyFeature>
    </OptimizelyProvider>
  }
}

```

# Installation

To use the `ReactSDK` components you must use the [`@optimizely/js-web-sdk`](../js-web-sdk/) which is an API compatible SDK wrapper build on top of the existing `@optimizely/javascript-sdk`.  `@optimizely/js-web-sdk` adds a few new API methods to enabled greater functionality (async loading and render blocking) with the ReactSDK.

```
npm install @optimizely/js-web-sdk @optimizely/react-sdk
```

# Usage
## `<OptimizelyProvider>`
This is required at the root level and leverages React’s `Context` API to allow access to the OptimizelySDKWrapper to components like `<OptimizelyFeature>`  and  `<OptimizelyExperiment>`

*props*
* `optimizely : OptimizelySDK` instance of the OptimizelySDK from `@optimizely/js-web-sdk`
* `userId : String` userId to be passed to the SDK for every Feature Flag / AB Test / `track` call
* `userAttributes : Object` (optional) userAttributes passed for every Feature Flag / AB Test / `track` call
* `timeout : Number` (optional) the amount for OptimizelyExperiment and OptimizelyFeature components to render `null` before resolving

### Loading the datafile synchronously

This is the preferred method and ensure Optimizely is always ready and loaded and doesn't add
any delay or asynchronous complexity to your application.

```jsx
import { OptimizelyProvider } from '@optimizely/react-sdk'
import optimizelySDK from '@optimizely/js-web-sdk'

const optimizely = optimizelySDK.createInstance({
  datafile: window.datafile,
})

class App extends React.Component {
  render() {
    return (
      <OptimizelyProvider optimizely={optimizely} userId={window.userId}>
        <App />
      </OptimizelyProvider>
    )
  }
}
```

### Loading the datafile asynchronously

If you don't have the datafile already downloaded then the `js-web-sdk` provides functionality to fetch the datafile for you.  However instead of waiting for the datafile to fetch before you render your app, you can immediately render your app and provide a `timeout`
option to `<OptimizelyProvider optimizely={optimizely} timeout={200}>`.  This will block rendering of `<OptimizelyExperiment>` and `<OptimizelyFeature>` components until the datafile
loads or the timeout is up (in that case `variation` is `null` and `isFeatureEnabled` is `false`)

```jsx
import { OptimizelyProvider } from '@optimizely/react-sdk'
import optimizelySDK from '@optimizely/js-web-sdk'

const optimizely = optimizelySDK.createInstance({
  SDKKey: 'your-optimizely-sdk-key', // Optimizely environment key
})

class App extends React.Component {
  render() {
    return (
      <OptimizelyProvider
        optimizely={optimizely}
        timeout={500}
        userId={window.userId}
        userAttributes={{ plan_type: 'bronze' }}
      >
        <App />
      </OptimizelyProvider>
    )
  }
}
```

# Use Cases
## Experiment
### Render different components based on variation

The first way to use OptimizelyExperiment is via a child render function. If the component contains a function as a child, `<OptimizelyExperiment>` will call that with the result of `optimizely.activate(experimentKey)`

```jsx
<OptimizelyExperiment experiment="exp1">
  {(variation) => (
    variation === 'simple'
      ? <SimpleComponent />
      : <DetailedComponent />
  )}
</OptimizelyExperiment>
```

Or you can also use the `<OptimizelyVariation>` component.

**Note: Be sure to include an `<OptimizelyVariation default>` component if you are loading the datafile async, as the render path if the datafile fails to load.**

```jsx
import { OptimizelyExperiment, OptimizelyVariation } from '@optimizely/react-sdk'
<OptimizelyExperiment experiment="exp1">
  <OptimizelyVariation variation="simple">
    <SimpleComponent />
  </OptimizelyVariation>

  <OptimizelyVariation variation="detailed">
    <ComplexComponent />
  </OptimizelyVariation>

  <OptimizelyVariation default>
    <SimpleComponent />
  </OptimizelyVariation>
</OptimizelyExperiment>
```

## Feature
### Render something if feature is enabled
```jsx
<OptimizelyFeature feature="new-login-page">
  {(isEnabled, variables) => (
    <a href={isEnabled ? "/login" : "/login2"}>
      Login
    </a>
  )}
</OptimizelyFeature>
```

### Render feature variables
```jsx
<OptimizelyFeature feature="new-login-page">
  {(isEnabled, variables) => (
    <a href={isEnabled ? "/login" : "/login2"}>
      {variables.loginText}
    </a>
  )}
</OptimizelyFeature>
```


### Programmatic access inside component
Any component under the `<OptimizelyProvider>` can get access to the optimizely js-web-sdk via the HoC `withOptimizely`

```jsx
import { withOptimizely } from '@optimizely/react-sdk`

class MyComp extends React.Component {
  constructor(props) {
    super(props)
    const { optimizely } = this.props
    const isFeat1Enabled = optimizely.isFeatureEnabled('feat1')
    const feat1Variables = optimizely.getFeatureVariables('feat1')

    this.state = {
      isFeat1Enabled,
      feat1Variables,
    }
  }

  render() {
  }
}

const WrappedMyComponent = withOptimizely(MyComp)
```


## Tracking
Tracking is easy with the `withOptimizely` HoC.

```jsx
import { withOptimizely } from '@optimizely/react-sdk`

class SignupButton extends React.Component {
  onClick = () => {
    const { optimizely } = this.props
    optimizely.track('signup-clicked')
    // rest of click handler
  }

  render() {
    <button onClick={this.onClick}>
      Signup
    </button>
  }
}

const WrappedSignupButton = withOptimizely(SignupButton)
```
