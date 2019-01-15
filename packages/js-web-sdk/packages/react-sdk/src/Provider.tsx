import * as React from 'react'

import { OptimizelyContextProvider } from './Context'
import { OptimizelySDKWrapper } from '@optimizely/js-web-sdk'

interface OptimizelyProviderProps {
  optimizely: OptimizelySDKWrapper
  timeout?: number
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

  constructor(props: OptimizelyProviderProps) {
    super(props)

    const { timeout, optimizely } = props
    this.sdkWrapper = optimizely
  }

  render() {
    const { children, timeout } = this.props
    const value = {
      optimizely: this.sdkWrapper,
    }
    if (timeout !== undefined) {
      value['timeout'] = timeout
    }
    return (
      <OptimizelyContextProvider value={value}>
        {children}
      </OptimizelyContextProvider>
    )
  }
}