import { OptimizelySDKWrapper } from '@optimizely/js-web-sdk'
const { createContext } = require('react-broadcast')

type OptimizelyContextValue = {
  optimizely: OptimizelySDKWrapper | null,
  timeout: number,
}
const { Consumer, Provider } = createContext({
  optimizely: null,
  timeout: 0,
})

export const OptimizelyContextConsumer = Consumer
export const OptimizelyContextProvider = Provider