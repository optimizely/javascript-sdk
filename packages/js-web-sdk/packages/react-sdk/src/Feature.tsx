import * as React from 'react'
import * as PropTypes from 'prop-types'
import { withOptimizely, WithOptimizelyProps } from './withOptimizely'
import { VariableValuesObject } from '@optimizely/js-web-sdk'

export interface FeatureProps extends WithOptimizelyProps {
  // TODO add support for overrideUserId
  feature: string
  children: (isEnabled: boolean, variables: VariableValuesObject) => React.ReactNode
}

export interface FeatureState {
  canRender: boolean,
  isEnabled: boolean
  variables: VariableValuesObject
}

class FeatureComponent extends React.Component<FeatureProps, FeatureState> {
  constructor(props: FeatureProps) {
    super(props)

    this.state = {
      canRender: false,
      isEnabled: false,
      variables: {},
    }
  }

  componentDidMount() {
    const { feature, optimizely, optimizelyReadyTimeout } = this.props
    if (optimizely === null) {
      throw new Error('optimizely prop must be supplied')
    }

    optimizely.onReady({ timeout: optimizelyReadyTimeout }).then(() => {
      const isEnabled = optimizely.isFeatureEnabled(feature)
      const variables = optimizely.getFeatureVariables(feature)
      this.setState({
        canRender: true,
        isEnabled,
        variables,
      })
    })
  }


  render() {
    const { children } = this.props
    const { isEnabled, variables, canRender } = this.state

    if (!canRender) {
      return null
    }

    return children(isEnabled, variables)
  }
}

export const OptimizelyFeature = withOptimizely(FeatureComponent)
