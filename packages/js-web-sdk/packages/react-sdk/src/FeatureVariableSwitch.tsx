import * as React from 'react'
import { withOptimizely, WithOptimizelyProps } from './withOptimizely'
import { VariableValuesObject, VariableValue } from '@optimizely/js-sdk-wrapper'
import { MatchProps } from './Match'

export interface FeatureVariableSwitchProps extends WithOptimizelyProps {
  feature: string
  variable: string
  matcher?: (a: VariableValue, b: any) => boolean
}

interface FeatureVariableSwitchState {
  variableValues: VariableValuesObject
  value: VariableValue | null
}

class FeatureVariableSwitch extends React.Component<
  FeatureVariableSwitchProps,
  FeatureVariableSwitchState
> {
  constructor(props: FeatureVariableSwitchProps) {
    super(props)

    const { optimizely, feature, variable } = this.props
    if (optimizely === null) {
      throw new Error('optimizely prop must be supplied')
    }

    const variableValues = optimizely.getFeatureVariables(feature)
    const value = optimizely.getFeatureVariable(feature, variable)
    this.state = {
      variableValues,
      value,
    }
  }

  match(value: VariableValue, toTest: any): boolean {
    const { matcher } = this.props
    return matcher ? matcher(value, toTest) : value === toTest
  }

  render() {
    const { value, variableValues } = this.state
    let match: React.ReactElement<MatchProps> | null = null

    // We use React.Children.forEach instead of React.Children.toArray().find()
    // here because toArray adds keys to all child elements and we do not want
    // to trigger an unmount/remount
    React.Children.forEach(
      this.props.children,
      (child: React.ReactElement<MatchProps>) => {
        if (match || !React.isValidElement(child)) {
          return
        }
        if (value === null) {
          if (child.props.default) {
            match = child
          }
          return
        }

        if (child.props.value) {
          if (this.match(value, child.props.value)) {
            match = child
          }
        } else if (child.props.default) {
          match = child
        }
      },
    )

    return match
      ? React.cloneElement(match, { variableValues: variableValues })
      : null
  }
}

export const OptimizelyFeatureVariableSwitch = withOptimizely(FeatureVariableSwitch)
