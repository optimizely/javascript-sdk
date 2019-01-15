import * as React from 'react'
// import { OptimizelyContextConsumer } from './Context'
import { Subtract } from 'utility-types'
import { OptimizelySDKWrapper } from '@optimizely/js-web-sdk'
import { getInstance, getTimeout } from './reactSDK'

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
            optimizelyReadyTimeout: number | undefined
          }) => (
            <Component
              {...this.props}
              optimizely={value.optimizely}
              optimizelyReadyTimeout={value.optimizelyReadyTimeout}
            />
          )}
        </OptimizelyContextConsumer>
      )
    }
  }
}
