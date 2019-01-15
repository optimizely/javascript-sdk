import * as React from 'react'
import { Subtract } from 'utility-types'
import { OptimizelySDKWrapper } from '@optimizely/js-web-sdk'

import { OptimizelyContextConsumer } from './Context'

export interface WithOptimizelyProps {
  optimizely: OptimizelySDKWrapper | null
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
            optimizely: OptimizelySDKWrapper
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
