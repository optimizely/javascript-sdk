import * as React from 'react'
import * as optimizely from '@optimizely/optimizely-sdk'

import { OptimizelyContextProvider } from './Context'
import { OptimizelySDKWrapper, OptimizelyDatafile } from '@optimizely/js-sdk-wrapper'

interface OptimizelyProviderProps {
  userId: string
  datafile: OptimizelyDatafile
  sdkOptions?: object
  attributes?: optimizely.UserAttributes
  bucketingId?: string
}

interface OptimizelyProviderState {
  userId: string
  attributes: optimizely.UserAttributes | undefined
}

export class OptimizelyProvider extends React.Component<
  OptimizelyProviderProps,
  OptimizelyProviderState
> {
  sdkWrapper: OptimizelySDKWrapper

  constructor(props: OptimizelyProviderProps) {
    super(props)

    const { datafile, sdkOptions, userId, attributes, bucketingId } = props
    this.sdkWrapper = new OptimizelySDKWrapper({
      datafile,
      userId,
      attributes,
      bucketingId,
    })
  }

  render() {
    const { children } = this.props
    return (
      <OptimizelyContextProvider value={this.sdkWrapper}>
        {children}
      </OptimizelyContextProvider>
    )
  }
}
