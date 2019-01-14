import * as React from 'react'
import { OptimizelyContextConsumer } from './Context'
import { Subtract } from 'utility-types'
import { OptimizelySDKWrapper } from '@optimizely/js-sdk-wrapper'

export interface WithOptimizelyProps {
  optimizely: OptimizelySDKWrapper | null,
  optimizelyReadyTimeout: number,
}

export function withOptimizely<P extends WithOptimizelyProps>(
  Component: React.ComponentType<P>,
) {
  return class WithOptimizely extends React.Component<Subtract<P, WithOptimizelyProps>> {
    render() {
      return (
        <OptimizelyContextConsumer>
          {({ optimizely, timeout }) => <Component {...this.props} optimizely={optimizely} optimizelyReadyTimeout={timeout} />}
        </OptimizelyContextConsumer>
      )
    }
  }
}