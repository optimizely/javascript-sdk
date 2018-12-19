# Optimizely SDK React

# Setup
## `<OptimizelyProvider>`
This is required at the root level and leverages React’s `Context` API to allow access to the OptimizelySDKWrapper to components like `<OptimizelyFeature>`  and  `<OptimizelyExperiment>`

*props*
* `optimizely : OptimizelySDKWrapper`
* `timeout : Number` the amount for OptimizelyExperiment and OptimizelyFeature components to render `null` before resolving

### Loading the datafile synchronously

This is the preferred method and ensure Optimizely is always ready and loaded and doesn't add
any delay or asynchronous complexity to your application.

```jsx
import { OptimizelyProvider } from '@optimizely/react-sdk'
import optimizelySDK from '@optimizely/js-sdk-wrapper'

const optimizely = optimizelySDK.createInstance({
  userId: window.userId,
  datafile: window.datafile,
})

class App extends React.Component {
  render() {
    return (
      <OptimizelyProvider optimizely={optimizely}>
        <App />
      </OptimizelyProvider>
    )
  }
}
```

### Loading the datafile asynchronously

If you don't have the datafile already downloaded then the `js-sdk-wrapper` provides functionality to fetch the datafile for you.  However instead of waiting for the datafile to fetch before you render your app, you can immediately render your app and provide a `timeout`
option to `<OptimizelyProvider optimizely={optimizely} timeout={50}>`.  This will block rendering of `<OptimizelyExperiment>` and `<OptimizelyFeature>` components until the datafile
loads or the timeout is up (in that case `variation` is `null` and `isFeatureEnabled` is `false`)

```jsx
import { OptimizelyProvider } from '@optimizely/react-sdk'
import optimizelySDK from '@optimizely/js-sdk-wrapper'

const optimizely = optimizelySDK.createInstance({
  userId: window.userId,
  SDKKey: 'yourSDKKey', // Optimizely environment key
})

class App extends React.Component {
  render() {
    return (
      <OptimizelyProvider optimizely={optimizely} timeout={100}>
        <App />
      </OptimizelyProvider>
    )
  }
}
```

# Use Cases
## Experiment
### Render different components based on variation
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
Any component under the `<OptimizelyProvider>` can get access to the optimizely js-sdk-wrapper via the HoC / decorator `@withOptimizely`

```jsx
import { withOptimizely } from '@optimizely/react-sdk`

@withOptimizely
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
```

## Tracking
Tracking is easy with the `withOptimizely` HoC / decorator.

```jsx
import { withOptimizely } from '@optimizely/react-sdk`

@withOptimizely
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
```

