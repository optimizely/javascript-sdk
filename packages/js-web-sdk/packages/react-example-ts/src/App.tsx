import * as React from 'react'
import * as PropTypes from 'prop-types'

import './App.css'
import Example from './Example'

import { OptimizelyFeature, OptimizelyProvider, OptimizelyExperiment, OptimizelyVariation } from '@optimizely/react-sdk'

import { VariableValuesObject, OptimizelyDatafile, OptimizelySDKWrapper } from '@optimizely/js-sdk-wrapper'

interface AppProps {
  optimizely: OptimizelySDKWrapper
}

type FeatureProps = { isEnabled: boolean; variables: object }
function Feature1(props: FeatureProps): JSX.Element {
  const { variables, isEnabled} = props
  return (
    <>
      <h4>Feature 1</h4>
      <p>
        <strong>is enabled</strong> {isEnabled ? 'true' : 'false'}
      </p>
      <p>
        <strong>variables</strong> <pre>{JSON.stringify(variables)}</pre>
      </p>
    </>
  )
}

class App extends React.Component<AppProps> {
  static propTypes = {
    datafile: PropTypes.object,
  }

  render() {
    const { optimizely } = this.props

    return (
      <OptimizelyProvider optimizely={optimizely} timeout={100}>
        <div className="App">
          <Example title="Experiment Example">
            <p>
              <OptimizelyExperiment experiment="abtest1">
                {(variation: any) => {
                  if (variation === 'var1') {
<<<<<<< HEAD
                    return 'var1'
                  } else if (variation === 'var2') {
                    return 'var2'
=======
                    return "var1"
                  } else if (variation === 'var1') {
                    return "var2"
>>>>>>> Add ExperimentVariation component
                  } else {
                    return 'default'
                  }
                }}
              </OptimizelyExperiment>
            </p>

            <p>
              <OptimizelyFeature feature="feature1">
                {(isEnabled, variables) => <Feature1 {...{isEnabled, variables}} />}

              </OptimizelyFeature>
            </p>
          </Example>
          <Example title="Experiment & Variations Example">
            <p>
              <OptimizelyExperiment experiment="abtest1">
                <OptimizelyVariation value='var1'>
                hi
                </OptimizelyVariation>
                <OptimizelyVariation value='var2'>
                hi2
                </OptimizelyVariation>
                <OptimizelyVariation default>
                hi3
                </OptimizelyVariation>
              </OptimizelyExperiment>
            </p>
          </Example>
        </div>
      </OptimizelyProvider>
    )
  }
}

export default App
