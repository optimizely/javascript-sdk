var LogLevel = require('@optimizely/js-sdk-logging').LogLevel;

function getLogLevelName(level) {
  switch(level) {
    case LogLevel.INFO: return 'INFO';
    case LogLevel.ERROR: return 'ERROR';
    case LogLevel.WARNING: return 'WARNING';
    case LogLevel.DEBUG: return 'DEBUG';
    default: return 'NOTSET';      
  }
}

export default class ReactNativeLogger {
  log(level, message) {
    const formattedMessage = `[OPTIMIZELY] - ${getLogLevelName(level)} ${new Date().toISOString()} ${message}`;
    switch (level) {
      case LogLevel.INFO: console.info(formattedMessage); break;
      case LogLevel.ERROR:
      case LogLevel.WARNING: console.warn(formattedMessage); break;
      case LogLevel.DEBUG:
      case LogLevel.NOTSET: console.log(formattedMessage); break;
    }
  }
}

module.exports = ReactNativeLogger;
