# Optimizely SDK React
# Setup
## `<OptimizelyProvider>`
This is required at the root level and leverages React’s `Context` API to allow access to the OptimizelySDKWrapper to components like `<OptimizelyFeature>`  and  `<OptimizelyExperiment>`

*props*
* `datafile : OptimizelyDatafile`
* `userId : string`
* `bucketingId? : string`
* `attributes? : object`

```jsx
import { OptimizelyProvider } from 'optimizely-sdk-react'

class App extends React.Component {
  render() {
    return (
      <OptimizelyProvider
        datafile={datafile}
        userId='jordan'>

        <App />
      </OptimizelyProvider>
  }
}
```

# Use Cases
## Experiment
### Switch based on variation
```jsx
<OptimizelyExperimentSwitch experiment='exp1'>
  <OptimizelyMatch value="variation1">
    <Comp1 />
  </OptimizelyMatch>

  <OptimizelyMatch value="variation2">
    <Comp2 />
  </OptimizelyMatch>

  <OptimizelyMatch default>
    <Comp3 />
  </OptimizelyMatch>
</OptimizelyExperimentSwitch>
```


## Feature / Feature Variables
### Render a string
```jsx
<OptimizelyFeatureVariables
  feature='feature1'
  render={({ header }) => <h1>{header}</h1>}
/>
```

### Pass variable values as props to component
```jsx
<OptimizelyFeatureVariables
  feature='feature1'
  render={({ header }) => <Comp1 header={header} />}
/>
```

### Switch component rendering based variable enum / value
```jsx
<OptimizelyFeatureVariableSwitch 
  feature='feature1'
  variable="variable1">
  <OptimizelyMatch value="value1">
    <Comp1 />
  </OptimizelyMatch>

  <OptimizelyMatch value="value2">
    <Comp2 />
  </OptimizelyMatch>

  <OptimizelyMatch default>
    <Comp3 />
  </OptimizelyMatch>
</OptimizelyFeatureVariableSwitch>
```

### Render based on isFeatureEnabled
```jsx
<OptimizelyFeature feature="feature1"
  renderEnabled={(vars) => <h1>Is enabled</h1>}
  renderDisabled={(vars) => <h1>Is disabled</h1>}
/>
```

### Programmatic access inside component
```jsx
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

```jsx
import {
  withOptimizely,
} from '@optimizely/react-sdk'

@withOptimizely
class MyComp extends React.Component {
  onClick = () => {
    const { optimizely } = this.props
    optimizely.track('signup')

    // rest of click handler
  }

  render() {
    return (
      <Button onClick={this.onClick}>Signup</Button>
    )
  }
}
```
