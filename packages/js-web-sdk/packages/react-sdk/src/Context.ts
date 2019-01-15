import { OptimizelySDKWrapper } from '@optimizely/js-web-sdk'
// @ts-ignore
import { createContext } from 'react-broadcast'

const { Consumer, Provider } = createContext({
  optimizely: null,
  timeout: 0,
})

export const OptimizelyContextConsumer = Consumer
export const OptimizelyContextProvider = Provider
