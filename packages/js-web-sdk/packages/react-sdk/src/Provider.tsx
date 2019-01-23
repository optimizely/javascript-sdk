import * as React from 'react'

import { OptimizelyContextProvider } from './Context'
import { OptimizelySDKWrapper } from '@optimizely/js-web-sdk'
import { UserAttributes, createUserWrapper, UserWrappedOptimizelySDK } from './createUserWrapper';

interface OptimizelyProviderProps {
  optimizely: OptimizelySDKWrapper
  userId: string
  timeout?: number
  userAttributes?: UserAttributes
}

interface OptimizelyProviderState {
  userId: string
  attributes: { [key: string]: string } | undefined
}

export class OptimizelyProvider extends React.Component<
  OptimizelyProviderProps,
  OptimizelyProviderState
> {
  sdkWrapper: UserWrappedOptimizelySDK

  constructor(props: OptimizelyProviderProps) {
    super(props)

    const { optimizely, userId, userAttributes } = props
    this.sdkWrapper = createUserWrapper({
      instance: optimizely,
      userId,
      userAttributes,
    })
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