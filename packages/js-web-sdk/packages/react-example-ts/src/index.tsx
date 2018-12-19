import * as React from 'react';
import * as ReactDOM from 'react-dom';
import App from './App';
import { OptimizelySDKWrapper, CookieRandomUserIdLoader } from '@optimizely/js-sdk-wrapper';

;(async function () {
  const optimizely = new OptimizelySDKWrapper({
    UNSTABLE_userIdLoader: new CookieRandomUserIdLoader(),
    SDKKey: 'BsSyVRsUbE3ExgGCJ9w1to',
  })


  ReactDOM.render(
    <App optimizely={optimizely} />,
    document.getElementById('root') as HTMLElement
  );
})()
