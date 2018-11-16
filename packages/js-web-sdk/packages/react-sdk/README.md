 Optimizely SDK React
# Setup
## `<OptimizelyProvider>`
This is required at the root level and leverages React’s `Context` API to allow access to the OptimizelySDKWrapper to components like `<OptimizelyFeature>`  and  `<OptimizelyExperiment>`

*props*
* `optimizely : OptimizelySDKWrapper`


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
      <OptimizelyProvider optimizely={optimizely}>
        <App />
      </OptimizelyProvider>
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

### Render fallback in case datafile hasn’t loaded in time
This is only applicable when async loading datafile.  Also note on second page view datafile will always be available.

```jsx
<OptimizelyExperiment 
  experiment="exp1"
  fallbackTimeout={200}
  fallback={() => <SimpleComponent /> }>
  {(variation) => (
    variation === 'simple'
      ? <SimpleComponent />
      : <DetailedComponent />
  )}
</OptimizelyExperiment>
```

*question:* in the case where datafile is null should `variation` be `null`

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
    const isFeat1Enabled = 
      optimizely.isFeatureEnabled('feat1')
    const feat1Variables =
      optimizely.getFeatureVariables('feat1')
    
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

