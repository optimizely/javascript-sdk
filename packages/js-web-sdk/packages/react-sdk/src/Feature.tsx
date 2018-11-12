import * as React from 'react'
import * as PropTypes from 'prop-types'
import { withOptimizely, WithOptimizelyProps } from './withOptimizely'
import { VariableValuesObject } from '@optimizely/js-sdk-wrapper'

export interface FeatureProps extends WithOptimizelyProps {
  feature: string
  renderEnabled: (
    variableValues: VariableValuesObject,
  ) => React.ReactElement<{}> | string
  renderDisabled: () => React.ReactElement<{}> | string
}

export interface FeatureState {
  isEnabled: boolean
  featureValues: VariableValuesObject
}

class FeatureComponent extends React.Component<FeatureProps, FeatureState> {
  constructor(props: FeatureProps) {
    super(props)

    const { feature, optimizely } = this.props
    if (optimizely === null) {
      throw new Error('optimizely prop must be supplied')
    }

    let featureValues = {}
    const isEnabled = optimizely.isFeatureEnabled(feature)
    if (isEnabled) {
      featureValues = optimizely.getFeatureVariables(feature)
    }

    this.state = {
      isEnabled,
      featureValues,
    }
  }

  render() {
    const { isEnabled, featureValues } = this.state
    const { renderEnabled, renderDisabled } = this.props

    return isEnabled ? renderEnabled(featureValues) : renderDisabled()
  }
}

export const OptimizelyFeature = withOptimizely(FeatureComponent)
