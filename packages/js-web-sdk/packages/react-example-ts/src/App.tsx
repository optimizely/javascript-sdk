import * as React from 'react'
import * as PropTypes from 'prop-types'

import './App.css'
import Example from './Example'

import {
  OptimizelyFeature,
  OptimizelyFeatureVariables,
  OptimizelyProvider,
  OptimizelyExperimentSwitch,
  OptimizelyMatch,
  OptimizelyFeatureVariableSwitch,
} from '@optimizely/react-sdk'

import {
  VariableValuesObject,
  OptimizelyDatafile,
} from '@optimizely/js-sdk-wrapper'

interface AppProps {
  datafile: OptimizelyDatafile,
}

class App extends React.Component<AppProps> {
  static propTypes = {
    datafile: PropTypes.object,
  }

  render() {
    const { datafile } = this.props

    return (
      <OptimizelyProvider datafile={datafile} userId="jordan">
        <div className="App">
          <Example title="Experiment Example">
            <OptimizelyExperimentSwitch experiment="abtest1">
              <OptimizelyMatch value="var1">Variation 1</OptimizelyMatch>
              <OptimizelyMatch value="var2">Variation 2</OptimizelyMatch>
            </OptimizelyExperimentSwitch>
          </Example>

          <Example title="Experiment Example 2">
            <OptimizelyExperimentSwitch experiment="abtest1">
              <OptimizelyMatch value="var1" render={() => <h1>variation 1</h1>} />
              <OptimizelyMatch default render={() => <h1>variation 2 (default)</h1>} />
            </OptimizelyExperimentSwitch>
          </Example>

          <Example title="Feature example">
            <OptimizelyFeature
              feature="feature1"
              renderEnabled={(featureVariables: VariableValuesObject) => (
                <div>
                  "feature1" is enabled
                  <pre>{JSON.stringify(featureVariables, null, '  ')}</pre>
                </div>
              )}
              renderDisabled={() => `Feature1 is disabled`}
            />
          </Example>

          <Example title="FeatureVariableSwitch example">
            <OptimizelyFeatureVariableSwitch feature="feature1" variable="header">
              <OptimizelyMatch
                value="Hi Jess!"
                render={variableValues => <p>{variableValues.content}</p>}
              />
              <OptimizelyMatch default render={() => <p>variation 2 (default)</p>} />
            </OptimizelyFeatureVariableSwitch>
          </Example>

          <Example title="FeatureVariableSwitch with matcher example">
            <OptimizelyFeatureVariableSwitch
              feature="feature1"
              variable="variation"
              matcher={(variableVal, matchVal) =>
                (matchVal as Array<string>).indexOf(variableVal as string) > -1
              }
            >
              <OptimizelyMatch
                value={['jordan', 'jess']}
                render={variableValues => (
                  <p>(1) Got variation {variableValues.variation}</p>
                )}
              />
              <OptimizelyMatch
                value={['jess']}
                render={variableValues => (
                  <p>(2) Got variation {variableValues.variation}</p>
                )}
              />
              <OptimizelyMatch
                default
                render={variableValues => (
                  <p>(default) Got variation {variableValues.variation}</p>
                )}
              />
            </OptimizelyFeatureVariableSwitch>
          </Example>

          <Example title="FeatureVariables (render prop) example">
            <OptimizelyFeatureVariables
              feature="feature1"
              render={variables => <pre>{JSON.stringify(variables, null, '  ')}</pre>}
            />
          </Example>

          <Example title="FeatureVariables (children render) example">
            <OptimizelyFeatureVariables feature="feature1">
              {({ header, content }) => (
                <>
                  <h4>{header || 'default'}</h4>
                  <p>{content}</p>
                </>
              )}
            </OptimizelyFeatureVariables>
          </Example>

          <Example title="FeatureVariables (single variable) example">
            <h4>
              <OptimizelyFeatureVariables feature="feature1">
                {({ header }) => header || 'default'}
              </OptimizelyFeatureVariables>
            </h4>
          </Example>
        </div>
      </OptimizelyProvider>
    )
  }
}

export default App
