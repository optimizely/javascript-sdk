import * as React from 'react'

export type VariationProps = {
  variation?: any
  default?: any
  children?: React.ReactNode
}

class Variation extends React.Component<VariationProps, {}> {
  render() {
    return this.props.children
  }
}

export const OptimizelyVariation = Variation