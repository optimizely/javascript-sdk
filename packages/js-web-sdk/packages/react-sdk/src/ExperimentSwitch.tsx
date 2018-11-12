import * as React from 'react'
import { withOptimizely, WithOptimizelyProps } from './withOptimizely'
import { MatchProps } from './Match'

export interface ExperimentSwitchProps extends WithOptimizelyProps {
  experiment: string
  matcher?: (a: SelectedVariation, b: any) => boolean
}

type SelectedVariation = string | null

interface ExperimentSwitchState {
  selectedVariation: SelectedVariation
}

class ExperimentSwitch extends React.Component<
  ExperimentSwitchProps,
  ExperimentSwitchState
> {
  constructor(props: ExperimentSwitchProps) {
    super(props)

    const { optimizely, experiment } = this.props
    if (optimizely === null) {
      throw new Error('optimizely prop must be supplied')
    }

    const selectedVariation = optimizely.activate(experiment)
    this.state = {
      selectedVariation,
    }
  }

  match(variation: SelectedVariation, toTest: any): boolean {
    const { matcher } = this.props
    return matcher ? matcher(variation, toTest) : variation === toTest
  }

  render() {
    const { selectedVariation } = this.state
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

        if (child.props.value) {
          if (this.match(selectedVariation, child.props.value)) {
            match = child
          }
        } else if (child.props.default) {
          match = child
        }
      },
    )

    return match
      ? React.cloneElement(match, { selectedVariation: selectedVariation, variableValues: {} })
      : null
  }
}

export const OptimizelyExperimentSwitch = withOptimizely(ExperimentSwitch)
