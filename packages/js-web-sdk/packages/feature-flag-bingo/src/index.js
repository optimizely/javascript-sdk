import * as React from 'react'
import * as ReactDOM from 'react-dom'
import optimizelySdk from '@optimizely/js-sdk-wrapper'
import App from './App'

const SDKKey = 'BsSyVRsUbE3ExgGCJ9w1to'

async function main() {
  const diagnostics = optimizelySdk.createDiagnostics({
    logEndpoint: 'http://hack.paulserraino.com:5000/',
    handler(obj) {
      console.log('[OPTIMIZELY]', obj)
    },
  })

  const optimizely = optimizelySdk.createInstance({
    SDKKey,
    diagnosticTags: {
      version: '0.1.0',
      SDKKey,
      appName: 'optimizely-feature-flag-bingo',
    },
    logger: diagnostics.logger,
  })

  const isInitialized = await optimizely.onReady()
  if (isInitialized) {
    diagnostics.setupNotificationCenter(optimizely)
  }

  ReactDOM.render(<App optimizely={optimizely} />, document.getElementById('root'))
}

main()
