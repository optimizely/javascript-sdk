import * as React from 'react';
import * as ReactDOM from 'react-dom';
import App from './App';
import * as optimizelySdk from '@optimizely/js-web-sdk'
import * as optimizelyReactSdk from '@optimizely/react-sdk'


;(async function () {
  const optimizely = optimizelySdk.createInstance({
    userId: 'user' + Date.now(),
    sdkKey: 'BsSyVRsUbE3ExgGCJ9w1to',
  })
  console.log('passing optimizely')

  ReactDOM.render(
    <App optimizely={optimizely} />,
    document.getElementById('root') as HTMLElement
  );
})()
