import { OptimizelySDKWrapper } from './OptimizelySDKWrapper'

export { OptimizelySDKWrapper } from './OptimizelySDKWrapper'

import { UrlDatafileLoader } from './DatafileManagers'
// const optimizely = new OptimizelySDKWrapper()

const datafileLoader = new UrlDatafileLoader({
  datafileUrl: 'https://cdn.optimizely.com/datafiles/GaXr9RoDhRcqXJm3ruskRa.json?OPTIMIZELY_NOCACHE=1'
})

const a = datafileLoader.load()
console.log(a)
