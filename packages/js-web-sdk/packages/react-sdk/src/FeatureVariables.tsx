import * as React from 'react'
import { withOptimizely, WithOptimizelyProps } from './withOptimizely'
import { VariableValuesObject } from '@optimizely/js-sdk-wrapper'
import { ChildrenRenderFunction } from './Match'

export interface FeatureVariablesProps extends WithOptimizelyProps {
  feature: string
  render?: (variableValues: VariableValuesObject) => React.ReactNode
  children?: ChildrenRenderFunction
  variableValues?: VariableValuesObject
}

interface FeatureVariablesState {
  variableValues: VariableValuesObject
}

class FeatureVariables extends React.Component<
  FeatureVariablesProps,
  FeatureVariablesState
> {
  constructor(props: FeatureVariablesProps) {
    super(props)

    const { optimizely, feature } = this.props
    if (optimizely === null) {
      throw new Error('optimizely prop must be supplied')
    }

    const variableValues = optimizely.getFeatureVariables(feature)
    this.state = {
      variableValues,
    }
  }

  render() {
    const { variableValues } = this.state
    let { children, render } = this.props
    let toRender: React.ReactNode | null = null
    if (children != null) {
      if (typeof children === 'function') {
        toRender = (children as ChildrenRenderFunction)(variableValues || {})
      } else if (children) {
        // TODO handle this path
        toRender = children
      }
    } else if (render) {
      toRender = render(variableValues || {})
    }

    return toRender
  }
}

export const OptimizelyFeatureVariables = withOptimizely(FeatureVariables)
