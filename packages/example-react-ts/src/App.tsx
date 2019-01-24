import * as React from 'react'
import * as PropTypes from 'prop-types'

import './App.css'
import Example from './Example'

import {
  OptimizelyProvider,
  OptimizelyFeature,
  OptimizelyExperiment,
  OptimizelyVariation,
  withOptimizely,
} from '@optimizely/react-sdk'

import { OptimizelySDKWrapper } from '@optimizely/js-web-sdk'
import OTrackerButton from './TrackerButton'

interface AppProps {
  optimizely: OptimizelySDKWrapper
}

type FeatureProps = { isEnabled: boolean; variables: object }
function Feature1(props: FeatureProps): JSX.Element {
  const { variables, isEnabled } = props
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

export default class App extends React.Component<AppProps> {
  static propTypes = {
    datafile: PropTypes.object,
  }

  render() {
    const { optimizely } = this.props

    return (
      <OptimizelyProvider
        optimizely={optimizely}
        timeout={200}
        userId={`jordan${Date.now()}`}
        userAttributes={{ attribute1: 'yesssss' }}
      >
        <div className="App">
          <Example title="Decorator">
            <OTrackerButton text="jordan" />
          </Example>
          <Example title="Experiment (child render function)">
            <OptimizelyExperiment experiment="abtest1">
              {(variation: any) => {
                console.log(variation)
                if (variation === 'var1') {
                  return 'var1'
                } else if (variation === 'var2') {
                  return 'var2'
                } else {
                  return 'default'
                }
              }}
            </OptimizelyExperiment>
          </Example>

          <Example title="Feature (child render function)">
            <OptimizelyFeature feature="feature1">
              {(isEnabled, variables) => <Feature1 {...{ isEnabled, variables }} />}
            </OptimizelyFeature>
          </Example>

          <Example title="Experiment (Variation child component)">
            <OptimizelyExperiment experiment="abtest1">
              <OptimizelyVariation variation="var1">hi</OptimizelyVariation>
              <OptimizelyVariation variation="var2">hi2</OptimizelyVariation>
              <OptimizelyVariation default>hi3</OptimizelyVariation>
            </OptimizelyExperiment>
          </Example>
        </div>
      </OptimizelyProvider>
    )
  }
}
