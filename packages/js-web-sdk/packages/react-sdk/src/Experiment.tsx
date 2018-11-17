import * as React from 'react'
import { withOptimizely, WithOptimizelyProps } from './withOptimizely'

export interface ExperimentProps extends WithOptimizelyProps {
  // TODO add support for overrideUserId
  experiment: string
  children: (variation: string | null) => React.ReactNode
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

    return children(variation)
  }
}

export const OptimizelyExperiment = withOptimizely(Experiment)