import React, { Component } from 'react'
import logo from './logo.svg'
import './App.css'

import {
  OptimizelyProvider,
  OptimizelyFeature,
  OptimizelyExperiment,
  OptimizelyVariation,
} from '@optimizely/react-sdk'

class App extends Component {
  render() {
    return (
      <OptimizelyProvider optimizely={this.props.optimizely} timeout={200}>
        <div>
          <h1>Test app: React 15</h1>
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
            <OptimizelyVariation variation="small"><p>small</p></OptimizelyVariation>
            <OptimizelyVariation variation="large"><p>large</p></OptimizelyVariation>
            <OptimizelyVariation default><p>default</p></OptimizelyVariation>
          </OptimizelyExperiment>
        </div>
      </OptimizelyProvider>
    )
  }
}

export default App
