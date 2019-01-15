import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'
import App from './App'
import * as serviceWorker from './serviceWorker'

import optimizelyReactSDK, { withOptimizely } from '@optimizely/react-sdk'
import * as optimizelySDK from '@optimizely/js-web-sdk'

const optimizely = optimizelySDK.createInstance({
  userId: 'user' + Date.now(),
  sdkKey: 'BsSyVRsUbE3ExgGCJ9w1to',
})

optimizelyReactSDK.initialize({
  instance: optimizely,
  timeout: 500,
})
console.log(withOptimizely)

async function main() {
  ReactDOM.render(<App />, document.getElementById('root'))

  // If you want your app to work offline and load faster, you can change
  // unregister() to register() below. Note this comes with some pitfalls.
  // Learn more about service workers: http://bit.ly/CRA-PWA
  serviceWorker.unregister()
}

main()
