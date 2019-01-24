import * as React from 'react'
import { Subtract } from 'utility-types'

import { OptimizelyContextConsumer } from './Context'
import { UserWrappedOptimizelySDK } from './createUserWrapper';

export interface WithOptimizelyProps {
  optimizely: UserWrappedOptimizelySDK | null
  optimizelyReadyTimeout: number | undefined
}

export function withOptimizely<P extends WithOptimizelyProps>(
  Component: React.ComponentType<P>,
) {
  return class WithOptimizely extends React.Component<Subtract<P, WithOptimizelyProps>> {
    render() {
      return (
        <OptimizelyContextConsumer>
          {(value: {
            optimizely: UserWrappedOptimizelySDK
            timeout: number | undefined
          }) => (
            <Component
              {...this.props}
              optimizely={value.optimizely}
              optimizelyReadyTimeout={value.timeout}
            />
          )}
        </OptimizelyContextConsumer>
      )
    }
  }
}
