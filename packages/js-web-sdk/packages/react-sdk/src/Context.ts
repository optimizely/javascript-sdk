import * as React from 'react'
import { OptimizelySDKWrapper } from '@optimizely/js-sdk-wrapper'

type OptimizelyContextValue = {
  optimizely: OptimizelySDKWrapper | null,
  timeout: number,
}
const { Consumer, Provider } = React.createContext<OptimizelyContextValue>({
  optimizely: null,
  timeout: 0,
})

export const OptimizelyContextConsumer = Consumer
export const OptimizelyContextProvider = Provider
