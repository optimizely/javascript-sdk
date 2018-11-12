import * as React from 'react'
import { VariableValuesObject } from '@optimizely/js-sdk-wrapper'

export type ChildrenRenderFunction = (variableValues: VariableValuesObject) => React.ReactNode

export type MatchProps = {
  value?: any
  default?: any
  render?: (variableValues: VariableValuesObject) => React.ReactNode
  children?: ChildrenRenderFunction | React.ReactNode
  variableValues?: VariableValuesObject
}

class Match extends React.Component<MatchProps, {}> {
  constructor(props: MatchProps) {
    super(props)
  }

  render() {
    const { render, variableValues } = this.props
    let { children } = this.props
    let toRender: React.ReactNode | null = null
    if (children != null) {
      if (typeof children === 'function') {
        toRender = (children as ChildrenRenderFunction)(variableValues || {})
      } else if (children) {
        toRender = children
      }
    } else if (render) {
      toRender = render(variableValues || {})
    }

    return toRender
  }
}

export const OptimizelyMatch = Match
