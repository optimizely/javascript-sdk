import * as React from 'react'
import { withOptimizely, WithOptimizelyProps } from './withOptimizely'
import { VariableValuesObject } from '@optimizely/js-sdk-wrapper'
import { VariationProps } from './Variation'

export type ChildrenRenderFunction = (variableValues: VariableValuesObject) => React.ReactNode

export interface ExperimentProps extends WithOptimizelyProps {
  // TODO add support for overrideUserId
  experiment: string
  children: any
}

export interface ExperimentState {
  canRender: boolean,
  variation: string | null
}

export class Experiment extends React.Component<ExperimentProps, ExperimentState> {
  constructor(props: ExperimentProps) {
    super(props)

    this.state = {
      canRender: false,
      variation: null,
    }
  }

  componentDidMount() {
    const { experiment, optimizely, optimizelyReadyTimeout } = this.props
    if (optimizely === null) {
      throw new Error('optimizely prop must be supplied')
    }

    optimizely.onReady({ timeout: optimizelyReadyTimeout }).then(() => {
      const variation = optimizely.activate(experiment)
      this.setState({
        canRender: true,
        variation,
      })
    })
  }


  render() {
    const { children } = this.props
    const { variation, canRender } = this.state

    if (!canRender) {
      return null
    }

    if (children != null && typeof children === 'function') {
      return children(variation)
    }

    let match: React.ReactElement<VariationProps> | null = null

    // We use React.Children.forEach instead of React.Children.toArray().find()
    // here because toArray adds keys to all child elements and we do not want
    // to trigger an unmount/remount
    React.Children.forEach(
      this.props.children,
      (child: React.ReactElement<VariationProps>) => {
        if (match || !React.isValidElement(child)) {
          return
        }

        if (child.props.value) {
          if (variation === child.props.value) {
            match = child
          }
        } else if (child.props.default) {
          match = child
        }
      },
    )

    return match
      ? React.cloneElement(match, { variation: variation })
      : null
  }
}

export const OptimizelyExperiment = withOptimizely(Experiment)