

const optimizelySDK = require('@optimizely/optimizely-sdk')

// setup with a noop logger
optimizelySDK.setLogger(optimizelySDK.createNoOpLogger())

const instance = optimizelySDK.createInstance(config)



const optimizelySDK = require('@optimizely/optimizely-sdk')

// create standard console logger
optimizelySDK.setLogger(optimizelySDK.createLogger())
optimizelySDK.setLogLevel(optimizelySDK.enums.LOG_LEVEL.DEBUG)
// or with a string (eliminating the need to require enums)
optimizelySDK.setLogLevel('DEBUG')

const instance = optimizelySDK.createInstance(config)



const optimizelySDK = require('@optimizely/optimizely-sdk')

// Using a 3rd-party logging package such as winston
const winston = require('winston')
const winstonLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'optimizely' },
  transports: [
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

function convertLogLevels(level) {
  switch(level) {
    case optimizelySDK.enums.LOG_LEVEL.DEBUG:
      return 'debug';
    case optimizelySDK.enums.LOG_LEVEL.INFO:
      return 'info';
    case optimizelySDK.enums.LOG_LEVEL.WARNING:
      return 'warning';
    case optimizelySDK.enums.LOG_LEVEL.ERROR:
      return 'error';
    default:
      return 'silly';
  }
}

optimizelySDK.setLogger({
  log(level, message) {
    winstonLogger.log({
      level: convertLogLevels(level),
      message,
    })
  }
})
const instance = optimizelySDK.createInstance(config)


const optimizelySDK = require('@optimizely/optimizely-sdk')

// passing a logger into isntance instantiation
// NOTE: this sets the logger globally and we should warn
const logger = optimizelySDK.createLogger({
  logLevel: optimizelySDK.enums.LOG_LEVEL.DEBUG
})

const instance = optimizelySDK.createInstance({
  logger,
})



