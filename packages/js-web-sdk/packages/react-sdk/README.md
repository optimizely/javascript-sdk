 Optimizely SDK React
# Setup
## `<OptimizelyProvider>`
This is required at the root level and leverages React’s `Context` API to allow access to the OptimizelySDKWrapper to components like `<OptimizelyFeature>`  and  `<OptimizelyExperiment>`

*props*
* `optimizely : OptimizelySDKWrapper`
* `timeout : Number` the amount for OptimizelyExperiment and OptimizelyFeature components to render `null` before resolving

```jsx
import { OptimizelyProvider } from '@optimizely/react-sdk'
import { Optimizely } from '@optimizely/js-web-sdk'

const optimizely = new Optimizely({
  userId: window.userId,
  datafile: window.datafile,
})
optimizely.initialize()

class App extends React.Component {
  render() {
    return (
      <OptimizelyProvider optimizely={optimizely} timeout={50}>
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
  <OptimizelyVariation value="simple">
    <SimpleComponent />
  </OptimizelyVariation>

  <OptimizelyVariation value="detailed">
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
Any component under the `<OptimizelyProvider>` can get access to the optimizely js-web-sdk via the HoC / decorator `@withOptimizely` 

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

