import { HttpPollingDatafileManager } from '../src/index.node';
import { setLogLevel, setLogHandler, ConsoleLogHandler } from '@optimizely/js-sdk-logging';

setLogLevel('debug');
setLogHandler(new ConsoleLogHandler());

const manager = new HttpPollingDatafileManager({
  sdkKey: '9LCprAQyd1bs1BBXZ3nVji',
  updateInterval: 5000,
});

manager.start();
manager.onReady().then(() => {
  console.log('ready');
});

manager.on('update', () => {
  console.log('update: ');
});
