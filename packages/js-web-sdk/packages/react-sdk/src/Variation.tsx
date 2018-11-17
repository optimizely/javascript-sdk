import * as React from 'react'
import { VariableValuesObject } from '@optimizely/js-sdk-wrapper'


export type VariationProps = {
  value?: any
  default?: any
  children?: React.ReactNode
}

class Variation extends React.Component<VariationProps, {}> {
  render() {
    return this.props.children
  }
}

export const OptimizelyVariation = Variation