import * as React from 'react';
import * as ReactDOM from 'react-dom';
import App from './App';

;(async function () {
  const resp = await fetch('https://optimizely.s3.amazonaws.com/datafiles/BsSyVRsUbE3ExgGCJ9w1to.json', { mode: 'cors' });
  let datafile: any = await resp.json();

  ReactDOM.render(
    <App datafile={datafile} />,
    document.getElementById('root') as HTMLElement
  );
})()
