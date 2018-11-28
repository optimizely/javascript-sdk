import * as React from 'react';
import * as ReactDOM from 'react-dom';
import App from './App';
import { OptimizelySDKWrapper, CookieRandomUserIdLoader } from '@optimizely/js-sdk-wrapper';

;(async function () {
  const optimizely = new OptimizelySDKWrapper({
    userIdLoader: new CookieRandomUserIdLoader(),
    datafileUrl: 'https://optimizely.s3.amazonaws.com/datafiles/BsSyVRsUbE3ExgGCJ9w1to.json',
  })


  ReactDOM.render(
    <App optimizely={optimizely} />,
    document.getElementById('root') as HTMLElement
  );
})()
