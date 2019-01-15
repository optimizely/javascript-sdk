import * as React from 'react'

import { OptimizelyContextProvider } from './Context'
import { OptimizelySDKWrapper } from '@optimizely/js-web-sdk'

interface OptimizelyProviderProps {
  optimizely: OptimizelySDKWrapper
  timeout: number
}

interface OptimizelyProviderState {
  userId: string
  attributes: { [key: string]: string } | undefined
}

export class OptimizelyProvider extends React.Component<
  OptimizelyProviderProps,
  OptimizelyProviderState
> {
  sdkWrapper: OptimizelySDKWrapper

  static defaultProps = {
    timeout: 0,
  }

  constructor(props: OptimizelyProviderProps) {
    super(props)

    const { timeout, optimizely } = props
    this.sdkWrapper = optimizely
  }

  render() {
    const { children, timeout } = this.props
    const value = {
      optimizely: this.sdkWrapper,
      timeout,
    }
    return (
      <OptimizelyContextProvider value={value}>
        {children}
      </OptimizelyContextProvider>
    )
  }
}