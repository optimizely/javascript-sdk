import * as React from 'react';
import * as ReactDOM from 'react-dom';
import App from './App';
import { OptimizelySDKWrapper } from '@optimizely/js-sdk-wrapper';

;(async function () {
  const optimizely = new OptimizelySDKWrapper({
    userId: 'jordan',
    datafileUrl: 'https://optimizely.s3.amazonaws.com/datafiles/BsSyVRsUbE3ExgGCJ9w1to.json',
  })


  ReactDOM.render(
    <App optimizely={optimizely} />,
    document.getElementById('root') as HTMLElement
  );
})()
