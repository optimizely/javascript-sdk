import * as React from 'react'
import * as PropTypes from 'prop-types'

import './App.css'
import Example from './Example'

import {
  OptimizelyFeature,
  OptimizelyProvider,
  OptimizelyExperiment,
} from '@optimizely/react-sdk'

import {
  VariableValuesObject,
  OptimizelyDatafile,
  OptimizelySDKWrapper,
} from '@optimizely/js-sdk-wrapper'

interface AppProps {
  optimizely: OptimizelySDKWrapper,
}

class App extends React.Component<AppProps> {
  static propTypes = {
    datafile: PropTypes.object,
  }

  render() {
    const { optimizely } = this.props

    return (
      <OptimizelyProvider optimizely={optimizely} timeout={5}>
        <div className="App">
          <Example title="Experiment Example">
            <p>
              <OptimizelyExperiment experiment="abtest1">
                {(variation) => {
                  if (variation === 'var1') {
                    return "var1"
                  } else if (variation === 'var2') {
                    return "var2"
                  } else {
                    return "default"
                  }
                }}
              </OptimizelyExperiment>
            </p>

            <p>
              <OptimizelyFeature feature="feature1">
                {(isEnabled, variables) => (
                  isEnabled ? 'is enabled' : 'is disabled'
                )}
              </OptimizelyFeature>
            </p>
          </Example>
        </div>
      </OptimizelyProvider>
    )
  }
}

export default App
