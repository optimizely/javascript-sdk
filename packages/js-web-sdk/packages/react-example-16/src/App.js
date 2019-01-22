import React, { Component } from 'react'
import logo from './logo.svg'
import './App.css'

import {
  OptimizelyProvider,
  OptimizelyFeature,
  OptimizelyExperiment,
  OptimizelyVariation,
  withOptimizely,
} from '@optimizely/react-sdk'

class TrackerButton extends React.Component {
  componentDidMount() {
    const { optimizely } = this.props
    console.log(optimizely)
    debugger
  }

  render() {
    return <h3>{this.props.text}</h3>
  }
}
const OptimizelyTrackerButton = withOptimizely(TrackerButton)

class App extends Component {
  render() {
    return (
      <OptimizelyProvider
        optimizely={this.props.optimizely}
        timeout={200}
        userId="jordan"
      >
        <div>
          <h1>Test app: React 16</h1>
          <OptimizelyTrackerButton text="Jordan" />
          <OptimizelyFeature feature="feature1">
            {(isEnabled, variables) => (
              <div>
                <h2>feature: feature1</h2>
                <h3>{isEnabled ? 'enabled' : 'disabled'}</h3>
                <pre>{JSON.stringify(variables, null, '  ')}</pre>
              </div>
            )}
          </OptimizelyFeature>

          <h2>experiment: cat_size</h2>
          <OptimizelyExperiment experiment="cat_size">
            {variation => <h3>variation: {variation}</h3>}
          </OptimizelyExperiment>

          <h2>experiment (/w variation component): cat_size</h2>

          <OptimizelyExperiment experiment="cat_size">
            <OptimizelyVariation variation="small">small</OptimizelyVariation>
            <OptimizelyVariation variation="large">large</OptimizelyVariation>
            <OptimizelyVariation default>default</OptimizelyVariation>
          </OptimizelyExperiment>
        </div>
      </OptimizelyProvider>
    )
  }
}

export default App
