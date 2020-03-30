(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["optimizelySdk"] = factory();
	else
		root["optimizelySdk"] = factory();
})(window, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * Copyright 2016-2017, 2019, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var logging = __webpack_require__(1);
var fns = __webpack_require__(11);
var configValidator = __webpack_require__(13);
var defaultErrorHandler = __webpack_require__(15);
var defaultEventDispatcher = __webpack_require__(16);
var enums = __webpack_require__(14);
var eventProcessor = __webpack_require__(17);
var loggerPlugin = __webpack_require__(26);
var Optimizely = __webpack_require__(27);
var eventProcessorConfigValidator = __webpack_require__(55);

var logger = logging.getLogger();
logging.setLogHandler(loggerPlugin.createLogger());
logging.setLogLevel(logging.LogLevel.INFO);

var MODULE_NAME = 'INDEX_BROWSER';

var DEFAULT_EVENT_BATCH_SIZE = 10;
var DEFAULT_EVENT_FLUSH_INTERVAL = 1000; // Unit is ms, default is 1s

var hasRetriedEvents = false;
/**
 * Entry point into the Optimizely Browser SDK
 */
module.exports = {
  logging: loggerPlugin,
  errorHandler: defaultErrorHandler,
  eventDispatcher: defaultEventDispatcher,
  enums: enums,

  setLogger: logging.setLogHandler,
  setLogLevel: logging.setLogLevel,

  /**
   * Creates an instance of the Optimizely class
   * @param  {Object} config
   * @param  {Object} config.datafile
   * @param  {Object} config.errorHandler
   * @param  {Object} config.eventDispatcher
   * @param  {Object} config.logger
   * @param  {Object} config.logLevel
   * @param  {Object} config.userProfileService
   * @param {Object} config.eventBatchSize
   * @param {Object} config.eventFlushInterval
   * @return {Object} the Optimizely object
   */
  createInstance: function(config) {
    try {
      config = config || {};

      // TODO warn about setting per instance errorHandler / logger / logLevel
      if (config.errorHandler) {
        logging.setErrorHandler(config.errorHandler);
      }
      if (config.logger) {
        logging.setLogHandler(config.logger);
        // respect the logger's shouldLog functionality
        logging.setLogLevel(logging.LogLevel.NOTSET);
      }
      if (config.logLevel !== undefined) {
        logging.setLogLevel(config.logLevel);
      }

      try {
        configValidator.validate(config);
        config.isValidInstance = true;
      } catch (ex) {
        logger.error(ex);
        config.isValidInstance = false;
      }

      // Explicitly check for null or undefined
      // prettier-ignore
      if (config.skipJSONValidation == null) { // eslint-disable-line eqeqeq
        config.skipJSONValidation = true;
      }

      var eventDispatcher;
      // prettier-ignore
      if (config.eventDispatcher == null) { // eslint-disable-line eqeqeq
        // only wrap the event dispatcher with pending events retry if the user didnt override
        eventDispatcher = new eventProcessor.LocalStoragePendingEventsDispatcher({
          eventDispatcher: defaultEventDispatcher,
        });

        if (!hasRetriedEvents) {
          eventDispatcher.sendPendingEvents();
          hasRetriedEvents = true;
        }
      } else {
        eventDispatcher = config.eventDispatcher;
      }

      config = fns.assign(
        {
          clientEngine: enums.JAVASCRIPT_CLIENT_ENGINE,
          eventBatchSize: DEFAULT_EVENT_BATCH_SIZE,
          eventFlushInterval: DEFAULT_EVENT_FLUSH_INTERVAL,
        },
        config,
        {
          eventDispatcher: eventDispatcher,
          // always get the OptimizelyLogger facade from logging
          logger: logger,
          errorHandler: logging.getErrorHandler(),
        }
      );

      if (!eventProcessorConfigValidator.validateEventBatchSize(config.eventBatchSize)) {
        logger.warn('Invalid eventBatchSize %s, defaulting to %s', config.eventBatchSize, DEFAULT_EVENT_BATCH_SIZE);
        config.eventBatchSize = DEFAULT_EVENT_BATCH_SIZE;
      }
      if (!eventProcessorConfigValidator.validateEventFlushInterval(config.eventFlushInterval)) {
        logger.warn(
          'Invalid eventFlushInterval %s, defaulting to %s',
          config.eventFlushInterval,
          DEFAULT_EVENT_FLUSH_INTERVAL
        );
        config.eventFlushInterval = DEFAULT_EVENT_FLUSH_INTERVAL;
      }

      var optimizely = new Optimizely(config);

      try {
        if (typeof window.addEventListener === 'function') {
          var unloadEvent = 'onpagehide' in window ? 'pagehide' : 'unload';
          window.addEventListener(
            unloadEvent,
            function() {
              optimizely.close();
            },
            false
          );
        }
      } catch (e) {
        logger.error(enums.LOG_MESSAGES.UNABLE_TO_ATTACH_UNLOAD, MODULE_NAME, e.message);
      }

      return optimizely;
    } catch (e) {
      logger.error(e);
      return null;
    }
  },

  __internalResetRetryState: function() {
    hasRetriedEvents = false;
  },
};


/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Copyright 2019, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
__export(__webpack_require__(2));
__export(__webpack_require__(3));
__export(__webpack_require__(4));


/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @export
 * @class NoopErrorHandler
 * @implements {ErrorHandler}
 */
var NoopErrorHandler = /** @class */ (function () {
    function NoopErrorHandler() {
    }
    /**
     * @param {Error} exception
     * @memberof NoopErrorHandler
     */
    NoopErrorHandler.prototype.handleError = function (exception) {
        // no-op
        return;
    };
    return NoopErrorHandler;
}());
exports.NoopErrorHandler = NoopErrorHandler;
var globalErrorHandler = new NoopErrorHandler();
/**
 * @export
 * @param {ErrorHandler} handler
 */
function setErrorHandler(handler) {
    globalErrorHandler = handler;
}
exports.setErrorHandler = setErrorHandler;
/**
 * @export
 * @returns {ErrorHandler}
 */
function getErrorHandler() {
    return globalErrorHandler;
}
exports.getErrorHandler = getErrorHandler;
/**
 * @export
 */
function resetErrorHandler() {
    globalErrorHandler = new NoopErrorHandler();
}
exports.resetErrorHandler = resetErrorHandler;


/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Copyright 2019, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["NOTSET"] = 0] = "NOTSET";
    LogLevel[LogLevel["DEBUG"] = 1] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 2] = "INFO";
    LogLevel[LogLevel["WARNING"] = 3] = "WARNING";
    LogLevel[LogLevel["ERROR"] = 4] = "ERROR";
})(LogLevel = exports.LogLevel || (exports.LogLevel = {}));


/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Copyright 2019, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var errorHandler_1 = __webpack_require__(2);
var js_sdk_utils_1 = __webpack_require__(5);
var models_1 = __webpack_require__(3);
var stringToLogLevel = {
    NOTSET: 0,
    DEBUG: 1,
    INFO: 2,
    WARNING: 3,
    ERROR: 4,
};
function coerceLogLevel(level) {
    if (typeof level !== 'string') {
        return level;
    }
    level = level.toUpperCase();
    if (level === 'WARN') {
        level = 'WARNING';
    }
    if (!stringToLogLevel[level]) {
        return level;
    }
    return stringToLogLevel[level];
}
var DefaultLogManager = /** @class */ (function () {
    function DefaultLogManager() {
        this.defaultLoggerFacade = new OptimizelyLogger();
        this.loggers = {};
    }
    DefaultLogManager.prototype.getLogger = function (name) {
        if (!name) {
            return this.defaultLoggerFacade;
        }
        if (!this.loggers[name]) {
            this.loggers[name] = new OptimizelyLogger({ messagePrefix: name });
        }
        return this.loggers[name];
    };
    return DefaultLogManager;
}());
var ConsoleLogHandler = /** @class */ (function () {
    /**
     * Creates an instance of ConsoleLogger.
     * @param {ConsoleLogHandlerConfig} config
     * @memberof ConsoleLogger
     */
    function ConsoleLogHandler(config) {
        if (config === void 0) { config = {}; }
        this.logLevel = models_1.LogLevel.NOTSET;
        if (config.logLevel !== undefined && js_sdk_utils_1.isValidEnum(models_1.LogLevel, config.logLevel)) {
            this.setLogLevel(config.logLevel);
        }
        this.logToConsole = config.logToConsole !== undefined ? !!config.logToConsole : true;
        this.prefix = config.prefix !== undefined ? config.prefix : '[OPTIMIZELY]';
    }
    /**
     * @param {LogLevel} level
     * @param {string} message
     * @memberof ConsoleLogger
     */
    ConsoleLogHandler.prototype.log = function (level, message) {
        if (!this.shouldLog(level) || !this.logToConsole) {
            return;
        }
        var logMessage = this.prefix + " - " + this.getLogLevelName(level) + " " + this.getTime() + " " + message;
        this.consoleLog(level, [logMessage]);
    };
    /**
     * @param {LogLevel} level
     * @memberof ConsoleLogger
     */
    ConsoleLogHandler.prototype.setLogLevel = function (level) {
        level = coerceLogLevel(level);
        if (!js_sdk_utils_1.isValidEnum(models_1.LogLevel, level) || level === undefined) {
            this.logLevel = models_1.LogLevel.ERROR;
        }
        else {
            this.logLevel = level;
        }
    };
    /**
     * @returns {string}
     * @memberof ConsoleLogger
     */
    ConsoleLogHandler.prototype.getTime = function () {
        return new Date().toISOString();
    };
    /**
     * @private
     * @param {LogLevel} targetLogLevel
     * @returns {boolean}
     * @memberof ConsoleLogger
     */
    ConsoleLogHandler.prototype.shouldLog = function (targetLogLevel) {
        return targetLogLevel >= this.logLevel;
    };
    /**
     * @private
     * @param {LogLevel} logLevel
     * @returns {string}
     * @memberof ConsoleLogger
     */
    ConsoleLogHandler.prototype.getLogLevelName = function (logLevel) {
        switch (logLevel) {
            case models_1.LogLevel.DEBUG:
                return 'DEBUG';
            case models_1.LogLevel.INFO:
                return 'INFO ';
            case models_1.LogLevel.WARNING:
                return 'WARN ';
            case models_1.LogLevel.ERROR:
                return 'ERROR';
            default:
                return 'NOTSET';
        }
    };
    /**
     * @private
     * @param {LogLevel} logLevel
     * @param {string[]} logArguments
     * @memberof ConsoleLogger
     */
    ConsoleLogHandler.prototype.consoleLog = function (logLevel, logArguments) {
        switch (logLevel) {
            case models_1.LogLevel.DEBUG:
                console.log.apply(console, logArguments);
                break;
            case models_1.LogLevel.INFO:
                console.info.apply(console, logArguments);
                break;
            case models_1.LogLevel.WARNING:
                console.warn.apply(console, logArguments);
                break;
            case models_1.LogLevel.ERROR:
                console.error.apply(console, logArguments);
                break;
            default:
                console.log.apply(console, logArguments);
        }
    };
    return ConsoleLogHandler;
}());
exports.ConsoleLogHandler = ConsoleLogHandler;
var globalLogLevel = models_1.LogLevel.NOTSET;
var globalLogHandler = null;
var OptimizelyLogger = /** @class */ (function () {
    function OptimizelyLogger(opts) {
        if (opts === void 0) { opts = {}; }
        this.messagePrefix = '';
        if (opts.messagePrefix) {
            this.messagePrefix = opts.messagePrefix;
        }
    }
    /**
     * @param {(LogLevel | LogInputObject)} levelOrObj
     * @param {string} [message]
     * @memberof OptimizelyLogger
     */
    OptimizelyLogger.prototype.log = function (level, message) {
        this.internalLog(coerceLogLevel(level), {
            message: message,
            splat: [],
        });
    };
    OptimizelyLogger.prototype.info = function (message) {
        var splat = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            splat[_i - 1] = arguments[_i];
        }
        this.namedLog(models_1.LogLevel.INFO, message, splat);
    };
    OptimizelyLogger.prototype.debug = function (message) {
        var splat = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            splat[_i - 1] = arguments[_i];
        }
        this.namedLog(models_1.LogLevel.DEBUG, message, splat);
    };
    OptimizelyLogger.prototype.warn = function (message) {
        var splat = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            splat[_i - 1] = arguments[_i];
        }
        this.namedLog(models_1.LogLevel.WARNING, message, splat);
    };
    OptimizelyLogger.prototype.error = function (message) {
        var splat = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            splat[_i - 1] = arguments[_i];
        }
        this.namedLog(models_1.LogLevel.ERROR, message, splat);
    };
    OptimizelyLogger.prototype.format = function (data) {
        return "" + (this.messagePrefix ? this.messagePrefix + ': ' : '') + js_sdk_utils_1.sprintf.apply(void 0, [data.message].concat(data.splat));
    };
    OptimizelyLogger.prototype.internalLog = function (level, data) {
        if (!globalLogHandler) {
            return;
        }
        if (level < globalLogLevel) {
            return;
        }
        globalLogHandler.log(level, this.format(data));
        if (data.error && data.error instanceof Error) {
            errorHandler_1.getErrorHandler().handleError(data.error);
        }
    };
    OptimizelyLogger.prototype.namedLog = function (level, message, splat) {
        var error;
        if (message instanceof Error) {
            error = message;
            message = error.message;
            this.internalLog(level, {
                error: error,
                message: message,
                splat: splat,
            });
            return;
        }
        if (splat.length === 0) {
            this.internalLog(level, {
                message: message,
                splat: splat,
            });
            return;
        }
        var last = splat[splat.length - 1];
        if (last instanceof Error) {
            error = last;
            splat.splice(-1);
        }
        this.internalLog(level, { message: message, error: error, splat: splat });
    };
    return OptimizelyLogger;
}());
var globalLogManager = new DefaultLogManager();
function getLogger(name) {
    return globalLogManager.getLogger(name);
}
exports.getLogger = getLogger;
function setLogHandler(logger) {
    globalLogHandler = logger;
}
exports.setLogHandler = setLogHandler;
function setLogLevel(level) {
    level = coerceLogLevel(level);
    if (!js_sdk_utils_1.isValidEnum(models_1.LogLevel, level) || level === undefined) {
        globalLogLevel = models_1.LogLevel.ERROR;
    }
    else {
        globalLogLevel = level;
    }
}
exports.setLogLevel = setLogLevel;
function getLogLevel() {
    return globalLogLevel;
}
exports.getLogLevel = getLogLevel;
/**
 * Resets all global logger state to it's original
 */
function resetLogger() {
    globalLogManager = new DefaultLogManager();
    globalLogLevel = models_1.LogLevel.NOTSET;
}
exports.resetLogger = resetLogger;


/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Copyright 2019, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var uuid_1 = __webpack_require__(6);
function getTimestamp() {
    return new Date().getTime();
}
exports.getTimestamp = getTimestamp;
function generateUUID() {
    return uuid_1.v4();
}
exports.generateUUID = generateUUID;
/**
 * Validates a value is a valid TypeScript enum
 *
 * @export
 * @param {object} enumToCheck
 * @param {*} value
 * @returns {boolean}
 */
function isValidEnum(enumToCheck, value) {
    var found = false;
    var keys = Object.keys(enumToCheck);
    for (var index = 0; index < keys.length; index++) {
        if (value === enumToCheck[keys[index]]) {
            found = true;
            break;
        }
    }
    return found;
}
exports.isValidEnum = isValidEnum;
function groupBy(arr, grouperFn) {
    var grouper = {};
    arr.forEach(function (item) {
        var key = grouperFn(item);
        grouper[key] = grouper[key] || [];
        grouper[key].push(item);
    });
    return objectValues(grouper);
}
exports.groupBy = groupBy;
function objectValues(obj) {
    return Object.keys(obj).map(function (key) { return obj[key]; });
}
exports.objectValues = objectValues;
function find(arr, cond) {
    var found;
    for (var _i = 0, arr_1 = arr; _i < arr_1.length; _i++) {
        var item = arr_1[_i];
        if (cond(item)) {
            found = item;
            break;
        }
    }
    return found;
}
exports.find = find;
function keyBy(arr, keyByFn) {
    var map = {};
    arr.forEach(function (item) {
        var key = keyByFn(item);
        map[key] = item;
    });
    return map;
}
exports.keyBy = keyBy;
function sprintf(format) {
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
    }
    var i = 0;
    return format.replace(/%s/g, function () {
        var arg = args[i++];
        var type = typeof arg;
        if (type === 'function') {
            return arg();
        }
        else if (type === 'string') {
            return arg;
        }
        else {
            return String(arg);
        }
    });
}
exports.sprintf = sprintf;


/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

var v1 = __webpack_require__(7);
var v4 = __webpack_require__(10);

var uuid = v4;
uuid.v1 = v1;
uuid.v4 = v4;

module.exports = uuid;


/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

var rng = __webpack_require__(8);
var bytesToUuid = __webpack_require__(9);

// **`v1()` - Generate time-based UUID**
//
// Inspired by https://github.com/LiosK/UUID.js
// and http://docs.python.org/library/uuid.html

var _nodeId;
var _clockseq;

// Previous uuid creation time
var _lastMSecs = 0;
var _lastNSecs = 0;

// See https://github.com/broofa/node-uuid for API details
function v1(options, buf, offset) {
  var i = buf && offset || 0;
  var b = buf || [];

  options = options || {};
  var node = options.node || _nodeId;
  var clockseq = options.clockseq !== undefined ? options.clockseq : _clockseq;

  // node and clockseq need to be initialized to random values if they're not
  // specified.  We do this lazily to minimize issues related to insufficient
  // system entropy.  See #189
  if (node == null || clockseq == null) {
    var seedBytes = rng();
    if (node == null) {
      // Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
      node = _nodeId = [
        seedBytes[0] | 0x01,
        seedBytes[1], seedBytes[2], seedBytes[3], seedBytes[4], seedBytes[5]
      ];
    }
    if (clockseq == null) {
      // Per 4.2.2, randomize (14 bit) clockseq
      clockseq = _clockseq = (seedBytes[6] << 8 | seedBytes[7]) & 0x3fff;
    }
  }

  // UUID timestamps are 100 nano-second units since the Gregorian epoch,
  // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
  // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
  // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.
  var msecs = options.msecs !== undefined ? options.msecs : new Date().getTime();

  // Per 4.2.1.2, use count of uuid's generated during the current clock
  // cycle to simulate higher resolution clock
  var nsecs = options.nsecs !== undefined ? options.nsecs : _lastNSecs + 1;

  // Time since last uuid creation (in msecs)
  var dt = (msecs - _lastMSecs) + (nsecs - _lastNSecs)/10000;

  // Per 4.2.1.2, Bump clockseq on clock regression
  if (dt < 0 && options.clockseq === undefined) {
    clockseq = clockseq + 1 & 0x3fff;
  }

  // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
  // time interval
  if ((dt < 0 || msecs > _lastMSecs) && options.nsecs === undefined) {
    nsecs = 0;
  }

  // Per 4.2.1.2 Throw error if too many uuids are requested
  if (nsecs >= 10000) {
    throw new Error('uuid.v1(): Can\'t create more than 10M uuids/sec');
  }

  _lastMSecs = msecs;
  _lastNSecs = nsecs;
  _clockseq = clockseq;

  // Per 4.1.4 - Convert from unix epoch to Gregorian epoch
  msecs += 12219292800000;

  // `time_low`
  var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
  b[i++] = tl >>> 24 & 0xff;
  b[i++] = tl >>> 16 & 0xff;
  b[i++] = tl >>> 8 & 0xff;
  b[i++] = tl & 0xff;

  // `time_mid`
  var tmh = (msecs / 0x100000000 * 10000) & 0xfffffff;
  b[i++] = tmh >>> 8 & 0xff;
  b[i++] = tmh & 0xff;

  // `time_high_and_version`
  b[i++] = tmh >>> 24 & 0xf | 0x10; // include version
  b[i++] = tmh >>> 16 & 0xff;

  // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
  b[i++] = clockseq >>> 8 | 0x80;

  // `clock_seq_low`
  b[i++] = clockseq & 0xff;

  // `node`
  for (var n = 0; n < 6; ++n) {
    b[i + n] = node[n];
  }

  return buf ? buf : bytesToUuid(b);
}

module.exports = v1;


/***/ }),
/* 8 */
/***/ (function(module, exports) {

// Unique ID creation requires a high quality random # generator.  In the
// browser this is a little complicated due to unknown quality of Math.random()
// and inconsistent support for the `crypto` API.  We do the best we can via
// feature-detection

// getRandomValues needs to be invoked in a context where "this" is a Crypto
// implementation. Also, find the complete implementation of crypto on IE11.
var getRandomValues = (typeof(crypto) != 'undefined' && crypto.getRandomValues && crypto.getRandomValues.bind(crypto)) ||
                      (typeof(msCrypto) != 'undefined' && typeof window.msCrypto.getRandomValues == 'function' && msCrypto.getRandomValues.bind(msCrypto));

if (getRandomValues) {
  // WHATWG crypto RNG - http://wiki.whatwg.org/wiki/Crypto
  var rnds8 = new Uint8Array(16); // eslint-disable-line no-undef

  module.exports = function whatwgRNG() {
    getRandomValues(rnds8);
    return rnds8;
  };
} else {
  // Math.random()-based (RNG)
  //
  // If all else fails, use Math.random().  It's fast, but is of unspecified
  // quality.
  var rnds = new Array(16);

  module.exports = function mathRNG() {
    for (var i = 0, r; i < 16; i++) {
      if ((i & 0x03) === 0) r = Math.random() * 0x100000000;
      rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
    }

    return rnds;
  };
}


/***/ }),
/* 9 */
/***/ (function(module, exports) {

/**
 * Convert array of 16 byte values to UUID string format of the form:
 * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 */
var byteToHex = [];
for (var i = 0; i < 256; ++i) {
  byteToHex[i] = (i + 0x100).toString(16).substr(1);
}

function bytesToUuid(buf, offset) {
  var i = offset || 0;
  var bth = byteToHex;
  // join used to fix memory issue caused by concatenation: https://bugs.chromium.org/p/v8/issues/detail?id=3175#c4
  return ([bth[buf[i++]], bth[buf[i++]], 
	bth[buf[i++]], bth[buf[i++]], '-',
	bth[buf[i++]], bth[buf[i++]], '-',
	bth[buf[i++]], bth[buf[i++]], '-',
	bth[buf[i++]], bth[buf[i++]], '-',
	bth[buf[i++]], bth[buf[i++]],
	bth[buf[i++]], bth[buf[i++]],
	bth[buf[i++]], bth[buf[i++]]]).join('');
}

module.exports = bytesToUuid;


/***/ }),
/* 10 */
/***/ (function(module, exports, __webpack_require__) {

var rng = __webpack_require__(8);
var bytesToUuid = __webpack_require__(9);

function v4(options, buf, offset) {
  var i = buf && offset || 0;

  if (typeof(options) == 'string') {
    buf = options === 'binary' ? new Array(16) : null;
    options = null;
  }
  options = options || {};

  var rnds = options.random || (options.rng || rng)();

  // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
  rnds[6] = (rnds[6] & 0x0f) | 0x40;
  rnds[8] = (rnds[8] & 0x3f) | 0x80;

  // Copy bytes to buffer, if provided
  if (buf) {
    for (var ii = 0; ii < 16; ++ii) {
      buf[i + ii] = rnds[ii];
    }
  }

  return buf || bytesToUuid(rnds);
}

module.exports = v4;


/***/ }),
/* 11 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * Copyright 2017, 2019-2020, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var uuid = __webpack_require__(6);
var MAX_SAFE_INTEGER_LIMIT = Math.pow(2, 53);
var keyBy = __webpack_require__(12).keyBy;
module.exports = {
  assign: function(target) {
    if (!target) {
      return {};
    }
    if (typeof Object.assign === 'function') {
      return Object.assign.apply(Object, arguments);
    } else {
      var to = Object(target);
      for (var index = 1; index < arguments.length; index++) {
        var nextSource = arguments[index];
        if (nextSource !== null && nextSource !== undefined) {
          for (var nextKey in nextSource) {
            // Avoid bugs when hasOwnProperty is shadowed
            if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
              to[nextKey] = nextSource[nextKey];
            }
          }
        }
      }
      return to;
    }
  },
  currentTimestamp: function() {
    return Math.round(new Date().getTime());
  },
  isSafeInteger: function(number) {
    return typeof number == 'number' && Math.abs(number) <= MAX_SAFE_INTEGER_LIMIT;
  },
  keyBy: function(arr, key) {
    if (!arr) return {};
    return keyBy(arr, function(item) {
      return item[key];
    });
  },
  uuid: function() {
    return uuid.v4();
  },
  isNumber: function(value) {
    return typeof value === 'number';
  },
};


/***/ }),
/* 12 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Copyright 2019, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var uuid_1 = __webpack_require__(6);
function getTimestamp() {
    return new Date().getTime();
}
exports.getTimestamp = getTimestamp;
function generateUUID() {
    return uuid_1.v4();
}
exports.generateUUID = generateUUID;
/**
 * Validates a value is a valid TypeScript enum
 *
 * @export
 * @param {object} enumToCheck
 * @param {*} value
 * @returns {boolean}
 */
function isValidEnum(enumToCheck, value) {
    var found = false;
    var keys = Object.keys(enumToCheck);
    for (var index = 0; index < keys.length; index++) {
        if (value === enumToCheck[keys[index]]) {
            found = true;
            break;
        }
    }
    return found;
}
exports.isValidEnum = isValidEnum;
function groupBy(arr, grouperFn) {
    var grouper = {};
    arr.forEach(function (item) {
        var key = grouperFn(item);
        grouper[key] = grouper[key] || [];
        grouper[key].push(item);
    });
    return objectValues(grouper);
}
exports.groupBy = groupBy;
function objectValues(obj) {
    return Object.keys(obj).map(function (key) { return obj[key]; });
}
exports.objectValues = objectValues;
function objectEntries(obj) {
    return Object.keys(obj).map(function (key) { return [key, obj[key]]; });
}
exports.objectEntries = objectEntries;
function find(arr, cond) {
    var found;
    for (var _i = 0, arr_1 = arr; _i < arr_1.length; _i++) {
        var item = arr_1[_i];
        if (cond(item)) {
            found = item;
            break;
        }
    }
    return found;
}
exports.find = find;
function keyBy(arr, keyByFn) {
    var map = {};
    arr.forEach(function (item) {
        var key = keyByFn(item);
        map[key] = item;
    });
    return map;
}
exports.keyBy = keyBy;
function sprintf(format) {
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
    }
    var i = 0;
    return format.replace(/%s/g, function () {
        var arg = args[i++];
        var type = typeof arg;
        if (type === 'function') {
            return arg();
        }
        else if (type === 'string') {
            return arg;
        }
        else {
            return String(arg);
        }
    });
}
exports.sprintf = sprintf;
/*
 * Notification types for use with NotificationCenter
 * Format is EVENT: <list of parameters to callback>
 *
 * SDK consumers can use these to register callbacks with the notification center.
 *
 *  @deprecated since 3.1.0
 *  ACTIVATE: An impression event will be sent to Optimizely
 *  Callbacks will receive an object argument with the following properties:
 *    - experiment {Object}
 *    - userId {string}
 *    - attributes {Object|undefined}
 *    - variation {Object}
 *    - logEvent {Object}
 *
 *  DECISION: A decision is made in the system. i.e. user activation,
 *  feature access or feature-variable value retrieval
 *  Callbacks will receive an object argument with the following properties:
 *    - type {string}
 *    - userId {string}
 *    - attributes {Object|undefined}
 *    - decisionInfo {Object|undefined}
 *
 *  LOG_EVENT: A batch of events, which could contain impressions and/or conversions,
 *  will be sent to Optimizely
 *  Callbacks will receive an object argument with the following properties:
 *    - url {string}
 *    - httpVerb {string}
 *    - params {Object}
 *
 *  OPTIMIZELY_CONFIG_UPDATE: This Optimizely instance has been updated with a new
 *  config
 *
 *  TRACK: A conversion event will be sent to Optimizely
 *  Callbacks will receive the an object argument with the following properties:
 *    - eventKey {string}
 *    - userId {string}
 *    - attributes {Object|undefined}
 *    - eventTags {Object|undefined}
 *    - logEvent {Object}
 *
 */
var NOTIFICATION_TYPES;
(function (NOTIFICATION_TYPES) {
    NOTIFICATION_TYPES["ACTIVATE"] = "ACTIVATE:experiment, user_id,attributes, variation, event";
    NOTIFICATION_TYPES["DECISION"] = "DECISION:type, userId, attributes, decisionInfo";
    NOTIFICATION_TYPES["LOG_EVENT"] = "LOG_EVENT:logEvent";
    NOTIFICATION_TYPES["OPTIMIZELY_CONFIG_UPDATE"] = "OPTIMIZELY_CONFIG_UPDATE";
    NOTIFICATION_TYPES["TRACK"] = "TRACK:event_key, user_id, attributes, event_tags, event";
})(NOTIFICATION_TYPES = exports.NOTIFICATION_TYPES || (exports.NOTIFICATION_TYPES = {}));


/***/ }),
/* 13 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * Copyright 2016, 2018, 2019 Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var sprintf = __webpack_require__(12).sprintf;

var ERROR_MESSAGES = __webpack_require__(14).ERROR_MESSAGES;
var MODULE_NAME = 'CONFIG_VALIDATOR';
var DATAFILE_VERSIONS = __webpack_require__(14).DATAFILE_VERSIONS;

var SUPPORTED_VERSIONS = [DATAFILE_VERSIONS.V2, DATAFILE_VERSIONS.V3, DATAFILE_VERSIONS.V4];

/**
 * Provides utility methods for validating that the configuration options are valid
 */
module.exports = {
  /**
   * Validates the given config options
   * @param  {Object} config
   * @param  {Object} config.errorHandler
   * @param  {Object} config.eventDispatcher
   * @param  {Object} config.logger
   * @return {Boolean} True if the config options are valid
   * @throws If any of the config options are not valid
   */
  validate: function(config) {
    if (config.errorHandler && typeof config.errorHandler.handleError !== 'function') {
      throw new Error(sprintf(ERROR_MESSAGES.INVALID_ERROR_HANDLER, MODULE_NAME));
    }

    if (config.eventDispatcher && typeof config.eventDispatcher.dispatchEvent !== 'function') {
      throw new Error(sprintf(ERROR_MESSAGES.INVALID_EVENT_DISPATCHER, MODULE_NAME));
    }

    if (config.logger && typeof config.logger.log !== 'function') {
      throw new Error(sprintf(ERROR_MESSAGES.INVALID_LOGGER, MODULE_NAME));
    }

    return true;
  },

  /**
   * Validates the datafile
   * @param {string}  datafile
   * @return {Boolean} True if the datafile is valid
   * @throws If the datafile is not valid for any of the following reasons:
                - The datafile string is undefined
                - The datafile string cannot be parsed as a JSON object
                - The datafile version is not supported
   */
  validateDatafile: function(datafile) {
    if (!datafile) {
      throw new Error(sprintf(ERROR_MESSAGES.NO_DATAFILE_SPECIFIED, MODULE_NAME));
    }

    if (typeof datafile === 'string' || datafile instanceof String) {
      // Attempt to parse the datafile string
      try {
        datafile = JSON.parse(datafile);
      } catch (ex) {
        throw new Error(sprintf(ERROR_MESSAGES.INVALID_DATAFILE_MALFORMED, MODULE_NAME));
      }
    }

    if (SUPPORTED_VERSIONS.indexOf(datafile.version) === -1) {
      throw new Error(sprintf(ERROR_MESSAGES.INVALID_DATAFILE_VERSION, MODULE_NAME, datafile.version));
    }

    return true;
  },
};


/***/ }),
/* 14 */
/***/ (function(module, exports, __webpack_require__) {

/****************************************************************************
 * Copyright 2016-2019, Optimizely, Inc. and contributors                   *
 *                                                                          *
 * Licensed under the Apache License, Version 2.0 (the "License");          *
 * you may not use this file except in compliance with the License.         *
 * You may obtain a copy of the License at                                  *
 *                                                                          *
 *    http://www.apache.org/licenses/LICENSE-2.0                            *
 *                                                                          *
 * Unless required by applicable law or agreed to in writing, software      *
 * distributed under the License is distributed on an "AS IS" BASIS,        *
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. *
 * See the License for the specific language governing permissions and      *
 * limitations under the License.                                           *
 ***************************************************************************/

var jsSdkUtils = __webpack_require__(12);

/**
 * Contains global enums used throughout the library
 */
exports.LOG_LEVEL = {
  NOTSET: 0,
  DEBUG: 1,
  INFO: 2,
  WARNING: 3,
  ERROR: 4,
};

exports.ERROR_MESSAGES = {
  CONDITION_EVALUATOR_ERROR: '%s: Error evaluating audience condition of type %s: %s',
  DATAFILE_AND_SDK_KEY_MISSING: '%s: You must provide at least one of sdkKey or datafile. Cannot start Optimizely',
  EXPERIMENT_KEY_NOT_IN_DATAFILE: '%s: Experiment key %s is not in datafile.',
  FEATURE_NOT_IN_DATAFILE: '%s: Feature key %s is not in datafile.',
  IMPROPERLY_FORMATTED_EXPERIMENT: '%s: Experiment key %s is improperly formatted.',
  INVALID_ATTRIBUTES: '%s: Provided attributes are in an invalid format.',
  INVALID_BUCKETING_ID: '%s: Unable to generate hash for bucketing ID %s: %s',
  INVALID_DATAFILE: '%s: Datafile is invalid - property %s: %s',
  INVALID_DATAFILE_MALFORMED: '%s: Datafile is invalid because it is malformed.',
  INVALID_JSON: '%s: JSON object is not valid.',
  INVALID_ERROR_HANDLER: '%s: Provided "errorHandler" is in an invalid format.',
  INVALID_EVENT_DISPATCHER: '%s: Provided "eventDispatcher" is in an invalid format.',
  INVALID_EVENT_TAGS: '%s: Provided event tags are in an invalid format.',
  INVALID_EXPERIMENT_KEY: '%s: Experiment key %s is not in datafile. It is either invalid, paused, or archived.',
  INVALID_EXPERIMENT_ID: '%s: Experiment ID %s is not in datafile.',
  INVALID_GROUP_ID: '%s: Group ID %s is not in datafile.',
  INVALID_LOGGER: '%s: Provided "logger" is in an invalid format.',
  INVALID_ROLLOUT_ID: '%s: Invalid rollout ID %s attached to feature %s',
  INVALID_USER_ID: '%s: Provided user ID is in an invalid format.',
  INVALID_USER_PROFILE_SERVICE: '%s: Provided user profile service instance is in an invalid format: %s.',
  JSON_SCHEMA_EXPECTED: '%s: JSON schema expected.',
  NO_DATAFILE_SPECIFIED: '%s: No datafile specified. Cannot start optimizely.',
  NO_JSON_PROVIDED: '%s: No JSON object to validate against schema.',
  NO_VARIATION_FOR_EXPERIMENT_KEY: '%s: No variation key %s defined in datafile for experiment %s.',
  UNDEFINED_ATTRIBUTE: '%s: Provided attribute: %s has an undefined value.',
  UNRECOGNIZED_ATTRIBUTE: '%s: Unrecognized attribute %s provided. Pruning before sending event to Optimizely.',
  UNABLE_TO_CAST_VALUE: '%s: Unable to cast value %s to type %s, returning null.',
  USER_NOT_IN_FORCED_VARIATION: '%s: User %s is not in the forced variation map. Cannot remove their forced variation.',
  USER_PROFILE_LOOKUP_ERROR: '%s: Error while looking up user profile for user ID "%s": %s.',
  USER_PROFILE_SAVE_ERROR: '%s: Error while saving user profile for user ID "%s": %s.',
  VARIABLE_KEY_NOT_IN_DATAFILE: '%s: Variable with key "%s" associated with feature with key "%s" is not in datafile.',
  VARIATION_ID_NOT_IN_DATAFILE: '%s: No variation ID %s defined in datafile for experiment %s.',
  VARIATION_ID_NOT_IN_DATAFILE_NO_EXPERIMENT: '%s: Variation ID %s is not in the datafile.',
  INVALID_INPUT_FORMAT: '%s: Provided %s is in an invalid format.',
  INVALID_DATAFILE_VERSION: '%s: This version of the JavaScript SDK does not support the given datafile version: %s',
  INVALID_VARIATION_KEY: '%s: Provided variation key is in an invalid format.',
};

exports.LOG_MESSAGES = {
  ACTIVATE_USER: '%s: Activating user %s in experiment %s.',
  DISPATCH_CONVERSION_EVENT: '%s: Dispatching conversion event to URL %s with params %s.',
  DISPATCH_IMPRESSION_EVENT: '%s: Dispatching impression event to URL %s with params %s.',
  DEPRECATED_EVENT_VALUE: '%s: Event value is deprecated in %s call.',
  EVENT_KEY_NOT_FOUND: '%s: Event key %s is not in datafile.',
  EXPERIMENT_NOT_RUNNING: '%s: Experiment %s is not running.',
  FEATURE_ENABLED_FOR_USER: '%s: Feature %s is enabled for user %s.',
  FEATURE_NOT_ENABLED_FOR_USER: '%s: Feature %s is not enabled for user %s.',
  FEATURE_HAS_NO_EXPERIMENTS: '%s: Feature %s is not attached to any experiments.',
  FAILED_TO_PARSE_VALUE: '%s: Failed to parse event value "%s" from event tags.',
  FAILED_TO_PARSE_REVENUE: '%s: Failed to parse revenue value "%s" from event tags.',
  FORCED_BUCKETING_FAILED: '%s: Variation key %s is not in datafile. Not activating user %s.',
  INVALID_OBJECT: '%s: Optimizely object is not valid. Failing %s.',
  INVALID_CLIENT_ENGINE: '%s: Invalid client engine passed: %s. Defaulting to node-sdk.',
  INVALID_VARIATION_ID: '%s: Bucketed into an invalid variation ID. Returning null.',
  NOTIFICATION_LISTENER_EXCEPTION: '%s: Notification listener for (%s) threw exception: %s',
  NO_ROLLOUT_EXISTS: '%s: There is no rollout of feature %s.',
  NOT_ACTIVATING_USER: '%s: Not activating user %s for experiment %s.',
  NOT_TRACKING_USER: '%s: Not tracking user %s.',
  PARSED_REVENUE_VALUE: '%s: Parsed revenue value "%s" from event tags.',
  PARSED_NUMERIC_VALUE: '%s: Parsed event value "%s" from event tags.',
  RETURNING_STORED_VARIATION:
    '%s: Returning previously activated variation "%s" of experiment "%s" for user "%s" from user profile.',
  ROLLOUT_HAS_NO_EXPERIMENTS: '%s: Rollout of feature %s has no experiments',
  SAVED_VARIATION: '%s: Saved variation "%s" of experiment "%s" for user "%s".',
  SAVED_VARIATION_NOT_FOUND:
    '%s: User %s was previously bucketed into variation with ID %s for experiment %s, but no matching variation was found.',
  SHOULD_NOT_DISPATCH_ACTIVATE: '%s: Experiment %s is not in "Running" state. Not activating user.',
  SKIPPING_JSON_VALIDATION: '%s: Skipping JSON schema validation.',
  TRACK_EVENT: '%s: Tracking event %s for user %s.',
  USER_ASSIGNED_TO_VARIATION_BUCKET: '%s: Assigned variation bucket %s to user %s.',
  USER_ASSIGNED_TO_EXPERIMENT_BUCKET: '%s: Assigned experiment bucket %s to user %s.',
  USER_BUCKETED_INTO_EXPERIMENT_IN_GROUP: '%s: User %s is in experiment %s of group %s.',
  USER_BUCKETED_INTO_TARGETING_RULE: '%s: User %s bucketed into targeting rule %s.',
  USER_IN_FEATURE_EXPERIMENT: '%s: User %s is in variation %s of experiment %s on the feature %s.',
  USER_IN_ROLLOUT: '%s: User %s is in rollout of feature %s.',
  USER_BUCKETED_INTO_EVERYONE_TARGETING_RULE: '%s: User %s bucketed into everyone targeting rule.',
  USER_NOT_BUCKETED_INTO_EVERYONE_TARGETING_RULE:
    '%s: User %s not bucketed into everyone targeting rule due to traffic allocation.',
  USER_NOT_BUCKETED_INTO_EXPERIMENT_IN_GROUP: '%s: User %s is not in experiment %s of group %s.',
  USER_NOT_BUCKETED_INTO_ANY_EXPERIMENT_IN_GROUP: '%s: User %s is not in any experiment of group %s.',
  USER_NOT_BUCKETED_INTO_TARGETING_RULE:
    '%s User %s not bucketed into targeting rule %s due to traffic allocation. Trying everyone rule.',
  USER_NOT_IN_FEATURE_EXPERIMENT: '%s: User %s is not in any experiment on the feature %s.',
  USER_NOT_IN_ROLLOUT: '%s: User %s is not in rollout of feature %s.',
  USER_FORCED_IN_VARIATION: '%s: User %s is forced in variation %s.',
  USER_MAPPED_TO_FORCED_VARIATION: '%s: Set variation %s for experiment %s and user %s in the forced variation map.',
  USER_DOESNT_MEET_CONDITIONS_FOR_TARGETING_RULE: '%s: User %s does not meet conditions for targeting rule %s.',
  USER_MEETS_CONDITIONS_FOR_TARGETING_RULE: '%s: User %s meets conditions for targeting rule %s.',
  USER_HAS_VARIATION: '%s: User %s is in variation %s of experiment %s.',
  USER_HAS_FORCED_VARIATION: '%s: Variation %s is mapped to experiment %s and user %s in the forced variation map.',
  USER_HAS_NO_VARIATION: '%s: User %s is in no variation of experiment %s.',
  USER_HAS_NO_FORCED_VARIATION: '%s: User %s is not in the forced variation map.',
  USER_HAS_NO_FORCED_VARIATION_FOR_EXPERIMENT: '%s: No experiment %s mapped to user %s in the forced variation map.',
  USER_NOT_IN_ANY_EXPERIMENT: '%s: User %s is not in any experiment of group %s.',
  USER_NOT_IN_EXPERIMENT: '%s: User %s does not meet conditions to be in experiment %s.',
  USER_RECEIVED_DEFAULT_VARIABLE_VALUE:
    '%s: User "%s" is not in any variation or rollout rule. Returning default value for variable "%s" of feature flag "%s".',
  FEATURE_NOT_ENABLED_RETURN_DEFAULT_VARIABLE_VALUE:
    '%s: Feature "%s" is not enabled for user %s. Returning default value for variable "%s".',
  VARIABLE_NOT_USED_RETURN_DEFAULT_VARIABLE_VALUE:
    '%s: Variable "%s" is not used in variation "%s". Returning default value.',
  USER_RECEIVED_VARIABLE_VALUE: '%s: Value for variable "%s" of feature flag "%s" is %s for user "%s"',
  VALID_DATAFILE: '%s: Datafile is valid.',
  VALID_USER_PROFILE_SERVICE: '%s: Valid user profile service provided.',
  VARIATION_REMOVED_FOR_USER: '%s: Variation mapped to experiment %s has been removed for user %s.',
  VARIABLE_REQUESTED_WITH_WRONG_TYPE:
    '%s: Requested variable type "%s", but variable is of type "%s". Use correct API to retrieve value. Returning None.',
  VALID_BUCKETING_ID: '%s: BucketingId is valid: "%s"',
  BUCKETING_ID_NOT_STRING: '%s: BucketingID attribute is not a string. Defaulted to userId',
  EVALUATING_AUDIENCE: '%s: Starting to evaluate audience "%s" with conditions: %s.',
  EVALUATING_AUDIENCES_COMBINED: '%s: Evaluating audiences for experiment "%s": %s.',
  AUDIENCE_EVALUATION_RESULT: '%s: Audience "%s" evaluated to %s.',
  AUDIENCE_EVALUATION_RESULT_COMBINED: '%s: Audiences for experiment %s collectively evaluated to %s.',
  MISSING_ATTRIBUTE_VALUE:
    '%s: Audience condition %s evaluated to UNKNOWN because no value was passed for user attribute "%s".',
  UNEXPECTED_CONDITION_VALUE:
    '%s: Audience condition %s evaluated to UNKNOWN because the condition value is not supported.',
  UNEXPECTED_TYPE:
    '%s: Audience condition %s evaluated to UNKNOWN because a value of type "%s" was passed for user attribute "%s".',
  UNEXPECTED_TYPE_NULL:
    '%s: Audience condition %s evaluated to UNKNOWN because a null value was passed for user attribute "%s".',
  UNKNOWN_CONDITION_TYPE:
    '%s: Audience condition %s has an unknown condition type. You may need to upgrade to a newer release of the Optimizely SDK.',
  UNKNOWN_MATCH_TYPE:
    '%s: Audience condition %s uses an unknown match type. You may need to upgrade to a newer release of the Optimizely SDK.',
  UPDATED_OPTIMIZELY_CONFIG: '%s: Updated Optimizely config to revision %s (project id %s)',
  OUT_OF_BOUNDS:
    '%s: Audience condition %s evaluated to UNKNOWN because the number value for user attribute "%s" is not in the range [-2^53, +2^53].',
  UNABLE_TO_ATTACH_UNLOAD: '%s: unable to bind optimizely.close() to page unload event: "%s"',
};

exports.RESERVED_EVENT_KEYWORDS = {
  REVENUE: 'revenue',
  VALUE: 'value',
};

exports.CONTROL_ATTRIBUTES = {
  BOT_FILTERING: '$opt_bot_filtering',
  BUCKETING_ID: '$opt_bucketing_id',
  STICKY_BUCKETING_KEY: '$opt_experiment_bucket_map',
  USER_AGENT: '$opt_user_agent',
};

exports.JAVASCRIPT_CLIENT_ENGINE = 'javascript-sdk';
exports.NODE_CLIENT_ENGINE = 'node-sdk';
exports.REACT_CLIENT_ENGINE = 'react-sdk';
exports.NODE_CLIENT_VERSION = '3.6.0-alpha.1';

exports.VALID_CLIENT_ENGINES = [
  exports.NODE_CLIENT_ENGINE,
  exports.REACT_CLIENT_ENGINE,
  exports.JAVASCRIPT_CLIENT_ENGINE,
];

exports.NOTIFICATION_TYPES = jsSdkUtils.NOTIFICATION_TYPES;

exports.DECISION_NOTIFICATION_TYPES = {
  AB_TEST: 'ab-test',
  FEATURE: 'feature',
  FEATURE_TEST: 'feature-test',
  FEATURE_VARIABLE: 'feature-variable',
};

/*
 * Represents the source of a decision for feature management. When a feature
 * is accessed through isFeatureEnabled or getVariableValue APIs, the decision
 * source is used to decide whether to dispatch an impression event to
 * Optimizely.
 */
exports.DECISION_SOURCES = {
  FEATURE_TEST: 'feature-test',
  ROLLOUT: 'rollout',
};

/*
 * Possible types of variables attached to features
 */
exports.FEATURE_VARIABLE_TYPES = {
  BOOLEAN: 'boolean',
  DOUBLE: 'double',
  INTEGER: 'integer',
  STRING: 'string',
};

/*
 * Supported datafile versions
 */
exports.DATAFILE_VERSIONS = {
  V2: '2',
  V3: '3',
  V4: '4',
};


/***/ }),
/* 15 */
/***/ (function(module, exports) {

/**
 * Copyright 2016, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Default error handler implementation
 */
module.exports = {
  /**
   * Handle given exception
   * @param  {Object} exception An exception object
   */
  handleError: function() {
    // no-op
  },
};


/***/ }),
/* 16 */
/***/ (function(module, exports) {

/**
 * Copyright 2016-2017, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var POST_METHOD = 'POST';
var GET_METHOD = 'GET';
var READYSTATE_COMPLETE = 4;

module.exports = {
  /**
   * Sample event dispatcher implementation for tracking impression and conversions
   * Users of the SDK can provide their own implementation
   * @param  {Object} eventObj
   * @param  {Function} callback
   */
  dispatchEvent: function(eventObj, callback) {
    var url = eventObj.url;
    var params = eventObj.params;
    var req;
    if (eventObj.httpVerb === POST_METHOD) {
      req = new XMLHttpRequest();
      req.open(POST_METHOD, url, true);
      req.setRequestHeader('Content-Type', 'application/json');
      req.onreadystatechange = function() {
        if (req.readyState === READYSTATE_COMPLETE && callback && typeof callback === 'function') {
          try {
            callback(params);
          } catch (e) {
            // TODO: Log this somehow (consider adding a logger to the EventDispatcher interface)
          }
        }
      };
      req.send(JSON.stringify(params));
    } else {
      // add param for cors headers to be sent by the log endpoint
      url += '?wxhr=true';
      if (params) {
        url += '&' + toQueryString(params);
      }

      req = new XMLHttpRequest();
      req.open(GET_METHOD, url, true);
      req.onreadystatechange = function() {
        if (req.readyState === READYSTATE_COMPLETE && callback && typeof callback === 'function') {
          try {
            callback();
          } catch (e) {
            // TODO: Log this somehow (consider adding a logger to the EventDispatcher interface)
          }
        }
      };
      req.send();
    }
  },
};

var toQueryString = function(obj) {
  return Object.keys(obj)
    .map(function(k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(obj[k]);
    })
    .join('&');
};


/***/ }),
/* 17 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Copyright 2019, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
__export(__webpack_require__(18));
__export(__webpack_require__(19));
__export(__webpack_require__(22));
__export(__webpack_require__(24));
__export(__webpack_require__(25));


/***/ }),
/* 18 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
function areEventContextsEqual(eventA, eventB) {
    var contextA = eventA.context;
    var contextB = eventB.context;
    return (contextA.accountId === contextB.accountId &&
        contextA.projectId === contextB.projectId &&
        contextA.clientName === contextB.clientName &&
        contextA.clientVersion === contextB.clientVersion &&
        contextA.revision === contextB.revision &&
        contextA.anonymizeIP === contextB.anonymizeIP &&
        contextA.botFiltering === contextB.botFiltering);
}
exports.areEventContextsEqual = areEventContextsEqual;


/***/ }),
/* 19 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var events_1 = __webpack_require__(18);
var eventQueue_1 = __webpack_require__(20);
var js_sdk_logging_1 = __webpack_require__(1);
var js_sdk_utils_1 = __webpack_require__(12);
var requestTracker_1 = __importDefault(__webpack_require__(21));
var logger = js_sdk_logging_1.getLogger('EventProcessor');
var DEFAULT_FLUSH_INTERVAL = 30000; // Unit is ms - default flush interval is 30s
var DEFAULT_MAX_QUEUE_SIZE = 10;
var AbstractEventProcessor = /** @class */ (function () {
    function AbstractEventProcessor(_a) {
        var dispatcher = _a.dispatcher, _b = _a.flushInterval, flushInterval = _b === void 0 ? 30000 : _b, _c = _a.maxQueueSize, maxQueueSize = _c === void 0 ? 3000 : _c, notificationCenter = _a.notificationCenter;
        var _this = this;
        this.dispatcher = dispatcher;
        if (flushInterval <= 0) {
            logger.warn("Invalid flushInterval " + flushInterval + ", defaulting to " + DEFAULT_FLUSH_INTERVAL);
            flushInterval = DEFAULT_FLUSH_INTERVAL;
        }
        maxQueueSize = Math.floor(maxQueueSize);
        if (maxQueueSize < 1) {
            logger.warn("Invalid maxQueueSize " + maxQueueSize + ", defaulting to " + DEFAULT_MAX_QUEUE_SIZE);
            maxQueueSize = DEFAULT_MAX_QUEUE_SIZE;
        }
        maxQueueSize = Math.max(1, maxQueueSize);
        if (maxQueueSize > 1) {
            this.queue = new eventQueue_1.DefaultEventQueue({
                flushInterval: flushInterval,
                maxQueueSize: maxQueueSize,
                sink: function (buffer) { return _this.drainQueue(buffer); },
                batchComparator: events_1.areEventContextsEqual,
            });
        }
        else {
            this.queue = new eventQueue_1.SingleEventQueue({
                sink: function (buffer) { return _this.drainQueue(buffer); },
            });
        }
        this.notificationCenter = notificationCenter;
        this.requestTracker = new requestTracker_1.default();
    }
    AbstractEventProcessor.prototype.drainQueue = function (buffer) {
        var _this = this;
        var reqPromise = new Promise(function (resolve) {
            logger.debug('draining queue with %s events', buffer.length);
            if (buffer.length === 0) {
                resolve();
                return;
            }
            var formattedEvent = _this.formatEvents(buffer);
            _this.dispatcher.dispatchEvent(formattedEvent, function () {
                resolve();
            });
            if (_this.notificationCenter) {
                _this.notificationCenter.sendNotifications(js_sdk_utils_1.NOTIFICATION_TYPES.LOG_EVENT, formattedEvent);
            }
        });
        this.requestTracker.trackRequest(reqPromise);
        return reqPromise;
    };
    AbstractEventProcessor.prototype.process = function (event) {
        this.queue.enqueue(event);
    };
    AbstractEventProcessor.prototype.stop = function () {
        // swallow - an error stopping this queue shouldn't prevent this from stopping
        try {
            this.queue.stop();
            return this.requestTracker.onRequestsComplete();
        }
        catch (e) {
            logger.error('Error stopping EventProcessor: "%s"', e.message, e);
        }
        return Promise.resolve();
    };
    AbstractEventProcessor.prototype.start = function () {
        this.queue.start();
    };
    return AbstractEventProcessor;
}());
exports.AbstractEventProcessor = AbstractEventProcessor;


/***/ }),
/* 20 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

/**
 * Copyright 2019, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
var js_sdk_logging_1 = __webpack_require__(1);
var logger = js_sdk_logging_1.getLogger('EventProcessor');
var Timer = /** @class */ (function () {
    function Timer(_a) {
        var timeout = _a.timeout, callback = _a.callback;
        this.timeout = Math.max(timeout, 0);
        this.callback = callback;
    }
    Timer.prototype.start = function () {
        this.timeoutId = setTimeout(this.callback, this.timeout);
    };
    Timer.prototype.refresh = function () {
        this.stop();
        this.start();
    };
    Timer.prototype.stop = function () {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
    };
    return Timer;
}());
var SingleEventQueue = /** @class */ (function () {
    function SingleEventQueue(_a) {
        var sink = _a.sink;
        this.sink = sink;
    }
    SingleEventQueue.prototype.start = function () {
        // no-op
    };
    SingleEventQueue.prototype.stop = function () {
        // no-op
        return Promise.resolve();
    };
    SingleEventQueue.prototype.enqueue = function (event) {
        this.sink([event]);
    };
    return SingleEventQueue;
}());
exports.SingleEventQueue = SingleEventQueue;
var DefaultEventQueue = /** @class */ (function () {
    function DefaultEventQueue(_a) {
        var flushInterval = _a.flushInterval, maxQueueSize = _a.maxQueueSize, sink = _a.sink, batchComparator = _a.batchComparator;
        this.buffer = [];
        this.maxQueueSize = Math.max(maxQueueSize, 1);
        this.sink = sink;
        this.batchComparator = batchComparator;
        this.timer = new Timer({
            callback: this.flush.bind(this),
            timeout: flushInterval,
        });
        this.started = false;
    }
    DefaultEventQueue.prototype.start = function () {
        this.started = true;
        // dont start the timer until the first event is enqueued
    };
    DefaultEventQueue.prototype.stop = function () {
        this.started = false;
        var result = this.sink(this.buffer);
        this.buffer = [];
        this.timer.stop();
        return result;
    };
    DefaultEventQueue.prototype.enqueue = function (event) {
        if (!this.started) {
            logger.warn('Queue is stopped, not accepting event');
            return;
        }
        // If new event cannot be included into the current batch, flush so it can
        // be in its own new batch.
        var bufferedEvent = this.buffer[0];
        if (bufferedEvent && !this.batchComparator(bufferedEvent, event)) {
            this.flush();
        }
        // start the timer when the first event is put in
        if (this.buffer.length === 0) {
            this.timer.refresh();
        }
        this.buffer.push(event);
        if (this.buffer.length >= this.maxQueueSize) {
            this.flush();
        }
    };
    DefaultEventQueue.prototype.flush = function () {
        this.sink(this.buffer);
        this.buffer = [];
        this.timer.stop();
    };
    return DefaultEventQueue;
}());
exports.DefaultEventQueue = DefaultEventQueue;


/***/ }),
/* 21 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

/**
 * Copyright 2020, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * RequestTracker keeps track of in-flight requests for EventProcessor using
 * an internal counter. It exposes methods for adding a new request to be
 * tracked, and getting a Promise representing the completion of currently
 * tracked requests.
 */
var RequestTracker = /** @class */ (function () {
    function RequestTracker() {
        this.reqsInFlightCount = 0;
        this.reqsCompleteResolvers = [];
    }
    /**
     * Track the argument request (represented by a Promise). reqPromise will feed
     * into the state of Promises returned by onRequestsComplete.
     * @param {Promise<void>} reqPromise
     */
    RequestTracker.prototype.trackRequest = function (reqPromise) {
        var _this = this;
        this.reqsInFlightCount++;
        var onReqComplete = function () {
            _this.reqsInFlightCount--;
            if (_this.reqsInFlightCount === 0) {
                _this.reqsCompleteResolvers.forEach(function (resolver) { return resolver(); });
                _this.reqsCompleteResolvers = [];
            }
        };
        reqPromise.then(onReqComplete, onReqComplete);
    };
    /**
     * Return a Promise that fulfills after all currently-tracked request promises
     * are resolved.
     * @return {Promise<void>}
     */
    RequestTracker.prototype.onRequestsComplete = function () {
        var _this = this;
        return new Promise(function (resolve) {
            if (_this.reqsInFlightCount === 0) {
                resolve();
            }
            else {
                _this.reqsCompleteResolvers.push(resolve);
            }
        });
    };
    return RequestTracker;
}());
exports.default = RequestTracker;


/***/ }),
/* 22 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Copyright 2019, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var js_sdk_logging_1 = __webpack_require__(1);
var pendingEventsStore_1 = __webpack_require__(23);
var js_sdk_utils_1 = __webpack_require__(12);
var logger = js_sdk_logging_1.getLogger('EventProcessor');
var PendingEventsDispatcher = /** @class */ (function () {
    function PendingEventsDispatcher(_a) {
        var eventDispatcher = _a.eventDispatcher, store = _a.store;
        this.dispatcher = eventDispatcher;
        this.store = store;
    }
    PendingEventsDispatcher.prototype.dispatchEvent = function (request, callback) {
        this.send({
            uuid: js_sdk_utils_1.generateUUID(),
            timestamp: js_sdk_utils_1.getTimestamp(),
            request: request,
        }, callback);
    };
    PendingEventsDispatcher.prototype.sendPendingEvents = function () {
        var _this = this;
        var pendingEvents = this.store.values();
        logger.debug('Sending %s pending events from previous page', pendingEvents.length);
        pendingEvents.forEach(function (item) {
            try {
                _this.send(item, function () { });
            }
            catch (e) { }
        });
    };
    PendingEventsDispatcher.prototype.send = function (entry, callback) {
        var _this = this;
        this.store.set(entry.uuid, entry);
        this.dispatcher.dispatchEvent(entry.request, function (response) {
            _this.store.remove(entry.uuid);
            callback(response);
        });
    };
    return PendingEventsDispatcher;
}());
exports.PendingEventsDispatcher = PendingEventsDispatcher;
var LocalStoragePendingEventsDispatcher = /** @class */ (function (_super) {
    __extends(LocalStoragePendingEventsDispatcher, _super);
    function LocalStoragePendingEventsDispatcher(_a) {
        var eventDispatcher = _a.eventDispatcher;
        return _super.call(this, {
            eventDispatcher: eventDispatcher,
            store: new pendingEventsStore_1.LocalStorageStore({
                // TODO make this configurable
                maxValues: 100,
                key: 'fs_optly_pending_events',
            }),
        }) || this;
    }
    return LocalStoragePendingEventsDispatcher;
}(PendingEventsDispatcher));
exports.LocalStoragePendingEventsDispatcher = LocalStoragePendingEventsDispatcher;


/***/ }),
/* 23 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Copyright 2019, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var js_sdk_utils_1 = __webpack_require__(12);
var js_sdk_logging_1 = __webpack_require__(1);
var logger = js_sdk_logging_1.getLogger('EventProcessor');
var LocalStorageStore = /** @class */ (function () {
    function LocalStorageStore(_a) {
        var key = _a.key, _b = _a.maxValues, maxValues = _b === void 0 ? 1000 : _b;
        this.LS_KEY = key;
        this.maxValues = maxValues;
    }
    LocalStorageStore.prototype.get = function (key) {
        return this.getMap()[key] || null;
    };
    LocalStorageStore.prototype.set = function (key, value) {
        var map = this.getMap();
        map[key] = value;
        this.replace(map);
    };
    LocalStorageStore.prototype.remove = function (key) {
        var map = this.getMap();
        delete map[key];
        this.replace(map);
    };
    LocalStorageStore.prototype.values = function () {
        return js_sdk_utils_1.objectValues(this.getMap());
    };
    LocalStorageStore.prototype.clear = function () {
        this.replace({});
    };
    LocalStorageStore.prototype.replace = function (map) {
        try {
            // This is a temporary fix to support React Native which does not have localStorage.
            window.localStorage && localStorage.setItem(this.LS_KEY, JSON.stringify(map));
            this.clean();
        }
        catch (e) {
            logger.error(e);
        }
    };
    LocalStorageStore.prototype.clean = function () {
        var map = this.getMap();
        var keys = Object.keys(map);
        var toRemove = keys.length - this.maxValues;
        if (toRemove < 1) {
            return;
        }
        var entries = keys.map(function (key) { return ({
            key: key,
            value: map[key]
        }); });
        entries.sort(function (a, b) { return a.value.timestamp - b.value.timestamp; });
        for (var i = 0; i < toRemove; i++) {
            delete map[entries[i].key];
        }
        this.replace(map);
    };
    LocalStorageStore.prototype.getMap = function () {
        try {
            // This is a temporary fix to support React Native which does not have localStorage.
            var data = window.localStorage && localStorage.getItem(this.LS_KEY);
            if (data) {
                return JSON.parse(data) || {};
            }
        }
        catch (e) {
            logger.error(e);
        }
        return {};
    };
    return LocalStorageStore;
}());
exports.LocalStorageStore = LocalStorageStore;


/***/ }),
/* 24 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var ACTIVATE_EVENT_KEY = 'campaign_activated';
var CUSTOM_ATTRIBUTE_FEATURE_TYPE = 'custom';
var BOT_FILTERING_KEY = '$opt_bot_filtering';
/**
 * Given an array of batchable Decision or ConversionEvent events it returns
 * a single EventV1 with proper batching
 *
 * @param {ProcessableEvents[]} events
 * @returns {EventV1}
 */
function makeBatchedEventV1(events) {
    var visitors = [];
    var data = events[0];
    events.forEach(function (event) {
        if (event.type === 'conversion' || event.type === 'impression') {
            var visitor = makeVisitor(event);
            if (event.type === 'impression') {
                visitor.snapshots.push(makeDecisionSnapshot(event));
            }
            else if (event.type === 'conversion') {
                visitor.snapshots.push(makeConversionSnapshot(event));
            }
            visitors.push(visitor);
        }
    });
    return {
        client_name: data.context.clientName,
        client_version: data.context.clientVersion,
        account_id: data.context.accountId,
        project_id: data.context.projectId,
        revision: data.context.revision,
        anonymize_ip: data.context.anonymizeIP,
        enrich_decisions: true,
        visitors: visitors,
    };
}
exports.makeBatchedEventV1 = makeBatchedEventV1;
function makeConversionSnapshot(conversion) {
    var tags = __assign({}, conversion.tags);
    delete tags['revenue'];
    delete tags['value'];
    var event = {
        entity_id: conversion.event.id,
        key: conversion.event.key,
        timestamp: conversion.timestamp,
        uuid: conversion.uuid,
    };
    if (conversion.tags) {
        event.tags = conversion.tags;
    }
    if (conversion.value != null) {
        event.value = conversion.value;
    }
    if (conversion.revenue != null) {
        event.revenue = conversion.revenue;
    }
    return {
        events: [event],
    };
}
function makeDecisionSnapshot(event) {
    var layer = event.layer, experiment = event.experiment, variation = event.variation;
    var layerId = layer ? layer.id : null;
    var experimentId = experiment ? experiment.id : null;
    var variationId = variation ? variation.id : null;
    return {
        decisions: [
            {
                campaign_id: layerId,
                experiment_id: experimentId,
                variation_id: variationId,
            },
        ],
        events: [
            {
                entity_id: layerId,
                timestamp: event.timestamp,
                key: ACTIVATE_EVENT_KEY,
                uuid: event.uuid,
            },
        ],
    };
}
function makeVisitor(data) {
    var visitor = {
        snapshots: [],
        visitor_id: data.user.id,
        attributes: [],
    };
    data.user.attributes.forEach(function (attr) {
        visitor.attributes.push({
            entity_id: attr.entityId,
            key: attr.key,
            type: 'custom',
            value: attr.value,
        });
    });
    if (typeof data.context.botFiltering === 'boolean') {
        visitor.attributes.push({
            entity_id: BOT_FILTERING_KEY,
            key: BOT_FILTERING_KEY,
            type: CUSTOM_ATTRIBUTE_FEATURE_TYPE,
            value: data.context.botFiltering,
        });
    }
    return visitor;
}
/**
 * Event for usage with v1 logtier
 *
 * @export
 * @interface EventBuilderV1
 */
function buildImpressionEventV1(data) {
    var visitor = makeVisitor(data);
    visitor.snapshots.push(makeDecisionSnapshot(data));
    return {
        client_name: data.context.clientName,
        client_version: data.context.clientVersion,
        account_id: data.context.accountId,
        project_id: data.context.projectId,
        revision: data.context.revision,
        anonymize_ip: data.context.anonymizeIP,
        enrich_decisions: true,
        visitors: [visitor],
    };
}
exports.buildImpressionEventV1 = buildImpressionEventV1;
function buildConversionEventV1(data) {
    var visitor = makeVisitor(data);
    visitor.snapshots.push(makeConversionSnapshot(data));
    return {
        client_name: data.context.clientName,
        client_version: data.context.clientVersion,
        account_id: data.context.accountId,
        project_id: data.context.projectId,
        revision: data.context.revision,
        anonymize_ip: data.context.anonymizeIP,
        enrich_decisions: true,
        visitors: [visitor],
    };
}
exports.buildConversionEventV1 = buildConversionEventV1;


/***/ }),
/* 25 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

/**
 * Copyright 2019, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var eventProcessor_1 = __webpack_require__(19);
var buildEventV1_1 = __webpack_require__(24);
var LogTierV1EventProcessor = /** @class */ (function (_super) {
    __extends(LogTierV1EventProcessor, _super);
    function LogTierV1EventProcessor() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    LogTierV1EventProcessor.prototype.formatEvents = function (events) {
        return {
            url: 'https://logx.optimizely.com/v1/events',
            httpVerb: 'POST',
            params: buildEventV1_1.makeBatchedEventV1(events),
        };
    };
    return LogTierV1EventProcessor;
}(eventProcessor_1.AbstractEventProcessor));
exports.LogTierV1EventProcessor = LogTierV1EventProcessor;


/***/ }),
/* 26 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * Copyright 2016-2017, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var logging = __webpack_require__(1);

function NoOpLogger() {}

NoOpLogger.prototype.log = function() {};

module.exports = {
  createLogger: function(opts) {
    return new logging.ConsoleLogHandler(opts);
  },

  createNoOpLogger: function() {
    return new NoOpLogger();
  },
};


/***/ }),
/* 27 */
/***/ (function(module, exports, __webpack_require__) {

/****************************************************************************
 * Copyright 2016-2019, Optimizely, Inc. and contributors                   *
 *                                                                          *
 * Licensed under the Apache License, Version 2.0 (the "License");          *
 * you may not use this file except in compliance with the License.         *
 * You may obtain a copy of the License at                                  *
 *                                                                          *
 *    http://www.apache.org/licenses/LICENSE-2.0                            *
 *                                                                          *
 * Unless required by applicable law or agreed to in writing, software      *
 * distributed under the License is distributed on an "AS IS" BASIS,        *
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. *
 * See the License for the specific language governing permissions and      *
 * limitations under the License.                                           *
 ***************************************************************************/

var fns = __webpack_require__(11);
var attributesValidator = __webpack_require__(28);
var decisionService = __webpack_require__(29);
var enums = __webpack_require__(14);
var eventBuilder = __webpack_require__(38);
var eventHelpers = __webpack_require__(40);
var eventProcessor = __webpack_require__(17);
var eventTagsValidator = __webpack_require__(41);
var notificationCenter = __webpack_require__(42);
var projectConfig = __webpack_require__(35);
var jsSdkUtils = __webpack_require__(12);
var userProfileServiceValidator = __webpack_require__(43);
var stringValidator = __webpack_require__(37);
var projectConfigManager = __webpack_require__(44);

var ERROR_MESSAGES = enums.ERROR_MESSAGES;
var LOG_LEVEL = enums.LOG_LEVEL;
var LOG_MESSAGES = enums.LOG_MESSAGES;
var MODULE_NAME = 'OPTIMIZELY';
var DECISION_SOURCES = enums.DECISION_SOURCES;
var FEATURE_VARIABLE_TYPES = enums.FEATURE_VARIABLE_TYPES;
var DECISION_NOTIFICATION_TYPES = enums.DECISION_NOTIFICATION_TYPES;
var NOTIFICATION_TYPES = enums.NOTIFICATION_TYPES;

var DEFAULT_ONREADY_TIMEOUT = 30000;

/**
 * The Optimizely class
 * @param {Object} config
 * @param {string} config.clientEngine
 * @param {string} config.clientVersion
 * @param {Object} config.datafile
 * @param {Object} config.errorHandler
 * @param {Object} config.eventDispatcher
 * @param {Object} config.logger
 * @param {Object} config.skipJSONValidation
 * @param {Object} config.userProfileService
 * @param {Object} config.eventBatchSize
 * @param {Object} config.eventFlushInterval
 */
function Optimizely(config) {
  var clientEngine = config.clientEngine;
  if (enums.VALID_CLIENT_ENGINES.indexOf(clientEngine) === -1) {
    config.logger.log(
      LOG_LEVEL.INFO,
      jsSdkUtils.sprintf(LOG_MESSAGES.INVALID_CLIENT_ENGINE, MODULE_NAME, clientEngine)
    );
    clientEngine = enums.NODE_CLIENT_ENGINE;
  }

  this.clientEngine = clientEngine;
  this.clientVersion = config.clientVersion || enums.NODE_CLIENT_VERSION;
  this.errorHandler = config.errorHandler;
  this.eventDispatcher = config.eventDispatcher;
  this.__isOptimizelyConfigValid = config.isValidInstance;
  this.logger = config.logger;

  this.projectConfigManager = new projectConfigManager.ProjectConfigManager({
    datafile: config.datafile,
    datafileOptions: config.datafileOptions,
    jsonSchemaValidator: config.jsonSchemaValidator,
    sdkKey: config.sdkKey,
    skipJSONValidation: config.skipJSONValidation,
  });

  this.__disposeOnUpdate = this.projectConfigManager.onUpdate(
    function(configObj) {
      this.logger.log(
        LOG_LEVEL.INFO,
        jsSdkUtils.sprintf(LOG_MESSAGES.UPDATED_OPTIMIZELY_CONFIG, MODULE_NAME, configObj.revision, configObj.projectId)
      );
      this.notificationCenter.sendNotifications(NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE);
    }.bind(this)
  );

  this.__readyPromise = this.projectConfigManager.onReady();

  var userProfileService = null;
  if (config.userProfileService) {
    try {
      if (userProfileServiceValidator.validate(config.userProfileService)) {
        userProfileService = config.userProfileService;
        this.logger.log(LOG_LEVEL.INFO, jsSdkUtils.sprintf(LOG_MESSAGES.VALID_USER_PROFILE_SERVICE, MODULE_NAME));
      }
    } catch (ex) {
      this.logger.log(LOG_LEVEL.WARNING, ex.message);
    }
  }

  this.decisionService = decisionService.createDecisionService({
    userProfileService: userProfileService,
    logger: this.logger,
    UNSTABLE_conditionEvaluators: config.UNSTABLE_conditionEvaluators,
  });

  this.notificationCenter = notificationCenter.createNotificationCenter({
    logger: this.logger,
    errorHandler: this.errorHandler,
  });

  this.eventProcessor = new eventProcessor.LogTierV1EventProcessor({
    dispatcher: this.eventDispatcher,
    flushInterval: config.eventFlushInterval,
    maxQueueSize: config.eventBatchSize,
    notificationCenter: this.notificationCenter,
  });
  this.eventProcessor.start();

  this.__readyTimeouts = {};
  this.__nextReadyTimeoutId = 0;
}

/**
 * Returns a truthy value if this instance currently has a valid project config
 * object, and the initial configuration object that was passed into the
 * constructor was also valid.
 * @return {*}
 */
Optimizely.prototype.__isValidInstance = function() {
  return this.__isOptimizelyConfigValid && this.projectConfigManager.getConfig();
};

/**
 * Buckets visitor and sends impression event to Optimizely.
 * @param  {string}      experimentKey
 * @param  {string}      userId
 * @param  {Object}      attributes
 * @return {string|null} variation key
 */
Optimizely.prototype.activate = function(experimentKey, userId, attributes) {
  try {
    if (!this.__isValidInstance()) {
      this.logger.log(LOG_LEVEL.ERROR, jsSdkUtils.sprintf(LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME, 'activate'));
      return null;
    }

    if (!this.__validateInputs({ experiment_key: experimentKey, user_id: userId }, attributes)) {
      return this.__notActivatingExperiment(experimentKey, userId);
    }

    var configObj = this.projectConfigManager.getConfig();
    if (!configObj) {
      return null;
    }

    try {
      var variationKey = this.getVariation(experimentKey, userId, attributes);
      if (variationKey === null) {
        return this.__notActivatingExperiment(experimentKey, userId);
      }

      // If experiment is not set to 'Running' status, log accordingly and return variation key
      if (!projectConfig.isRunning(configObj, experimentKey)) {
        var shouldNotDispatchActivateLogMessage = jsSdkUtils.sprintf(
          LOG_MESSAGES.SHOULD_NOT_DISPATCH_ACTIVATE,
          MODULE_NAME,
          experimentKey
        );
        this.logger.log(LOG_LEVEL.DEBUG, shouldNotDispatchActivateLogMessage);
        return variationKey;
      }

      this._sendImpressionEvent(experimentKey, variationKey, userId, attributes);

      return variationKey;
    } catch (ex) {
      this.logger.log(LOG_LEVEL.ERROR, ex.message);
      var failedActivationLogMessage = jsSdkUtils.sprintf(
        LOG_MESSAGES.NOT_ACTIVATING_USER,
        MODULE_NAME,
        userId,
        experimentKey
      );
      this.logger.log(LOG_LEVEL.INFO, failedActivationLogMessage);
      this.errorHandler.handleError(ex);
      return null;
    }
  } catch (e) {
    this.logger.log(LOG_LEVEL.ERROR, e.message);
    this.errorHandler.handleError(e);
    return null;
  }
};

/**
 * Create an impression event and call the event dispatcher's dispatch method to
 * send this event to Optimizely. Then use the notification center to trigger
 * any notification listeners for the ACTIVATE notification type.
 * @param {string} experimentKey  Key of experiment that was activated
 * @param {string} variationKey   Key of variation shown in experiment that was activated
 * @param {string} userId         ID of user to whom the variation was shown
 * @param {Object} attributes     Optional user attributes
 */
Optimizely.prototype._sendImpressionEvent = function(experimentKey, variationKey, userId, attributes) {
  var configObj = this.projectConfigManager.getConfig();
  if (!configObj) {
    return;
  }

  var impressionEvent = eventHelpers.buildImpressionEvent({
    experimentKey: experimentKey,
    variationKey: variationKey,
    userId: userId,
    userAttributes: attributes,
    clientEngine: this.clientEngine,
    clientVersion: this.clientVersion,
    configObj: configObj,
  });
  // TODO is it okay to not pass a projectConfig as second argument
  this.eventProcessor.process(impressionEvent);
  this.__emitNotificationCenterActivate(experimentKey, variationKey, userId, attributes);
};

/**
 * Emit the ACTIVATE notification on the notificationCenter
 * @param {string} experimentKey  Key of experiment that was activated
 * @param {string} variationKey   Key of variation shown in experiment that was activated
 * @param {string} userId         ID of user to whom the variation was shown
 * @param {Object} attributes     Optional user attributes
 */
Optimizely.prototype.__emitNotificationCenterActivate = function(experimentKey, variationKey, userId, attributes) {
  var configObj = this.projectConfigManager.getConfig();
  if (!configObj) {
    return;
  }

  var variationId = projectConfig.getVariationIdFromExperimentAndVariationKey(configObj, experimentKey, variationKey);
  var experimentId = projectConfig.getExperimentId(configObj, experimentKey);
  var impressionEventOptions = {
    attributes: attributes,
    clientEngine: this.clientEngine,
    clientVersion: this.clientVersion,
    configObj: configObj,
    experimentId: experimentId,
    userId: userId,
    variationId: variationId,
    logger: this.logger,
  };
  var impressionEvent = eventBuilder.getImpressionEvent(impressionEventOptions);
  var experiment = configObj.experimentKeyMap[experimentKey];
  var variation;
  if (experiment && experiment.variationKeyMap) {
    variation = experiment.variationKeyMap[variationKey];
  }
  this.notificationCenter.sendNotifications(NOTIFICATION_TYPES.ACTIVATE, {
    experiment: experiment,
    userId: userId,
    attributes: attributes,
    variation: variation,
    logEvent: impressionEvent,
  });
};

/**
 * Sends conversion event to Optimizely.
 * @param  {string} eventKey
 * @param  {string} userId
 * @param  {string} attributes
 * @param  {Object} eventTags Values associated with the event.
 */
Optimizely.prototype.track = function(eventKey, userId, attributes, eventTags) {
  try {
    if (!this.__isValidInstance()) {
      this.logger.log(LOG_LEVEL.ERROR, jsSdkUtils.sprintf(LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME, 'track'));
      return;
    }

    if (!this.__validateInputs({ user_id: userId, event_key: eventKey }, attributes, eventTags)) {
      return;
    }

    var configObj = this.projectConfigManager.getConfig();
    if (!configObj) {
      return;
    }

    if (!projectConfig.eventWithKeyExists(configObj, eventKey)) {
      this.logger.log(
        LOG_LEVEL.WARNING,
        jsSdkUtils.sprintf(enums.LOG_MESSAGES.EVENT_KEY_NOT_FOUND, MODULE_NAME, eventKey)
      );
      this.logger.log(LOG_LEVEL.WARNING, jsSdkUtils.sprintf(LOG_MESSAGES.NOT_TRACKING_USER, MODULE_NAME, userId));
      return;
    }

    // remove null values from eventTags
    eventTags = this.__filterEmptyValues(eventTags);
    var conversionEvent = eventHelpers.buildConversionEvent({
      eventKey: eventKey,
      eventTags: eventTags,
      userId: userId,
      userAttributes: attributes,
      clientEngine: this.clientEngine,
      clientVersion: this.clientVersion,
      configObj: configObj,
    });
    this.logger.log(LOG_LEVEL.INFO, jsSdkUtils.sprintf(enums.LOG_MESSAGES.TRACK_EVENT, MODULE_NAME, eventKey, userId));
    // TODO is it okay to not pass a projectConfig as second argument
    this.eventProcessor.process(conversionEvent);
    this.__emitNotificationCenterTrack(eventKey, userId, attributes, eventTags);
  } catch (e) {
    this.logger.log(LOG_LEVEL.ERROR, e.message);
    this.errorHandler.handleError(e);
    var failedTrackLogMessage = jsSdkUtils.sprintf(LOG_MESSAGES.NOT_TRACKING_USER, MODULE_NAME, userId);
    this.logger.log(LOG_LEVEL.ERROR, failedTrackLogMessage);
  }
};

/**
 * Send TRACK event to notificationCenter
 * @param  {string} eventKey
 * @param  {string} userId
 * @param  {string} attributes
 * @param  {Object} eventTags Values associated with the event.
 */
Optimizely.prototype.__emitNotificationCenterTrack = function(eventKey, userId, attributes, eventTags) {
  try {
    var configObj = this.projectConfigManager.getConfig();
    if (!configObj) {
      return;
    }

    var conversionEventOptions = {
      attributes: attributes,
      clientEngine: this.clientEngine,
      clientVersion: this.clientVersion,
      configObj: configObj,
      eventKey: eventKey,
      eventTags: eventTags,
      logger: this.logger,
      userId: userId,
    };
    var conversionEvent = eventBuilder.getConversionEvent(conversionEventOptions);

    this.notificationCenter.sendNotifications(NOTIFICATION_TYPES.TRACK, {
      eventKey: eventKey,
      userId: userId,
      attributes: attributes,
      eventTags: eventTags,
      logEvent: conversionEvent,
    });
  } catch (ex) {
    this.logger.log(LOG_LEVEL.ERROR, ex.message);
    this.errorHandler.handleError(ex);
  }
};

/**
 * Gets variation where visitor will be bucketed.
 * @param  {string}      experimentKey
 * @param  {string}      userId
 * @param  {Object}      attributes
 * @return {string|null} variation key
 */
Optimizely.prototype.getVariation = function(experimentKey, userId, attributes) {
  try {
    if (!this.__isValidInstance()) {
      this.logger.log(LOG_LEVEL.ERROR, jsSdkUtils.sprintf(LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME, 'getVariation'));
      return null;
    }

    try {
      if (!this.__validateInputs({ experiment_key: experimentKey, user_id: userId }, attributes)) {
        return null;
      }

      var configObj = this.projectConfigManager.getConfig();
      if (!configObj) {
        return null;
      }

      var experiment = configObj.experimentKeyMap[experimentKey];
      if (!experiment) {
        this.logger.log(
          LOG_LEVEL.DEBUG,
          jsSdkUtils.sprintf(ERROR_MESSAGES.INVALID_EXPERIMENT_KEY, MODULE_NAME, experimentKey)
        );
        return null;
      }

      var variationKey = this.decisionService.getVariation(configObj, experimentKey, userId, attributes);
      var decisionNotificationType = projectConfig.isFeatureExperiment(configObj, experiment.id)
        ? DECISION_NOTIFICATION_TYPES.FEATURE_TEST
        : DECISION_NOTIFICATION_TYPES.AB_TEST;

      this.notificationCenter.sendNotifications(NOTIFICATION_TYPES.DECISION, {
        type: decisionNotificationType,
        userId: userId,
        attributes: attributes || {},
        decisionInfo: {
          experimentKey: experimentKey,
          variationKey: variationKey,
        },
      });

      return variationKey;
    } catch (ex) {
      this.logger.log(LOG_LEVEL.ERROR, ex.message);
      this.errorHandler.handleError(ex);
      return null;
    }
  } catch (e) {
    this.logger.log(LOG_LEVEL.ERROR, e.message);
    this.errorHandler.handleError(e);
    return null;
  }
};

/**
 * Force a user into a variation for a given experiment.
 * @param {string} experimentKey
 * @param {string} userId
 * @param {string|null} variationKey user will be forced into. If null, then clear the existing experiment-to-variation mapping.
 * @return boolean A boolean value that indicates if the set completed successfully.
 */
Optimizely.prototype.setForcedVariation = function(experimentKey, userId, variationKey) {
  if (!this.__validateInputs({ experiment_key: experimentKey, user_id: userId })) {
    return false;
  }

  var configObj = this.projectConfigManager.getConfig();
  if (!configObj) {
    return false;
  }

  try {
    return this.decisionService.setForcedVariation(configObj, experimentKey, userId, variationKey);
  } catch (ex) {
    this.logger.log(LOG_LEVEL.ERROR, ex.message);
    this.errorHandler.handleError(ex);
    return false;
  }
};

/**
 * Gets the forced variation for a given user and experiment.
 * @param  {string} experimentKey
 * @param  {string} userId
 * @return {string|null} The forced variation key.
 */
Optimizely.prototype.getForcedVariation = function(experimentKey, userId) {
  if (!this.__validateInputs({ experiment_key: experimentKey, user_id: userId })) {
    return null;
  }

  var configObj = this.projectConfigManager.getConfig();
  if (!configObj) {
    return null;
  }

  try {
    return this.decisionService.getForcedVariation(configObj, experimentKey, userId);
  } catch (ex) {
    this.logger.log(LOG_LEVEL.ERROR, ex.message);
    this.errorHandler.handleError(ex);
    return null;
  }
};

/**
 * Validate string inputs, user attributes and event tags.
 * @param  {string}  stringInputs   Map of string keys and associated values
 * @param  {Object}  userAttributes Optional parameter for user's attributes
 * @param  {Object}  eventTags      Optional parameter for event tags
 * @return {boolean} True if inputs are valid
 *
 */
Optimizely.prototype.__validateInputs = function(stringInputs, userAttributes, eventTags) {
  try {
    // Null, undefined or non-string user Id is invalid.
    if (stringInputs.hasOwnProperty('user_id')) {
      var userId = stringInputs.user_id;
      if (typeof userId !== 'string' || userId === null || userId === 'undefined') {
        throw new Error(jsSdkUtils.sprintf(ERROR_MESSAGES.INVALID_INPUT_FORMAT, MODULE_NAME, 'user_id'));
      }

      delete stringInputs.user_id;
    }

    var inputKeys = Object.keys(stringInputs);
    for (var index = 0; index < inputKeys.length; index++) {
      var key = inputKeys[index];
      if (!stringValidator.validate(stringInputs[key])) {
        throw new Error(jsSdkUtils.sprintf(ERROR_MESSAGES.INVALID_INPUT_FORMAT, MODULE_NAME, key));
      }
    }
    if (userAttributes) {
      attributesValidator.validate(userAttributes);
    }
    if (eventTags) {
      eventTagsValidator.validate(eventTags);
    }
    return true;
  } catch (ex) {
    this.logger.log(LOG_LEVEL.ERROR, ex.message);
    this.errorHandler.handleError(ex);
    return false;
  }
};

/**
 * Shows failed activation log message and returns null when user is not activated in experiment
 * @param  experimentKey
 * @param  userId
 * @return {null}
 */
Optimizely.prototype.__notActivatingExperiment = function(experimentKey, userId) {
  var failedActivationLogMessage = jsSdkUtils.sprintf(
    LOG_MESSAGES.NOT_ACTIVATING_USER,
    MODULE_NAME,
    userId,
    experimentKey
  );
  this.logger.log(LOG_LEVEL.INFO, failedActivationLogMessage);
  return null;
};

/**
 * Filters out attributes/eventTags with null or undefined values
 * @param  map
 * @returns {Object} map
 */
Optimizely.prototype.__filterEmptyValues = function(map) {
  for (var key in map) {
    if (map.hasOwnProperty(key) && (map[key] === null || map[key] === undefined)) {
      delete map[key];
    }
  }
  return map;
};

/**
 * Returns true if the feature is enabled for the given user.
 * @param {string} featureKey   Key of feature which will be checked
 * @param {string} userId       ID of user which will be checked
 * @param {Object} attributes   Optional user attributes
 * @return {boolean}            True if the feature is enabled for the user, false otherwise
 */
Optimizely.prototype.isFeatureEnabled = function(featureKey, userId, attributes) {
  try {
    if (!this.__isValidInstance()) {
      this.logger.log(
        LOG_LEVEL.ERROR,
        jsSdkUtils.sprintf(LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME, 'isFeatureEnabled')
      );
      return false;
    }

    if (!this.__validateInputs({ feature_key: featureKey, user_id: userId }, attributes)) {
      return false;
    }

    var configObj = this.projectConfigManager.getConfig();
    if (!configObj) {
      return false;
    }

    var feature = projectConfig.getFeatureFromKey(configObj, featureKey, this.logger);
    if (!feature) {
      return false;
    }

    var featureEnabled = false;
    var decision = this.decisionService.getVariationForFeature(configObj, feature, userId, attributes);
    var variation = decision.variation;
    var sourceInfo = {};

    if (variation) {
      featureEnabled = variation.featureEnabled;
      if (decision.decisionSource === DECISION_SOURCES.FEATURE_TEST) {
        sourceInfo = {
          experimentKey: decision.experiment.key,
          variationKey: decision.variation.key,
        };
        // got a variation from the exp, so we track the impression
        this._sendImpressionEvent(decision.experiment.key, decision.variation.key, userId, attributes);
      }
    }

    if (featureEnabled === true) {
      this.logger.log(
        LOG_LEVEL.INFO,
        jsSdkUtils.sprintf(LOG_MESSAGES.FEATURE_ENABLED_FOR_USER, MODULE_NAME, featureKey, userId)
      );
    } else {
      this.logger.log(
        LOG_LEVEL.INFO,
        jsSdkUtils.sprintf(LOG_MESSAGES.FEATURE_NOT_ENABLED_FOR_USER, MODULE_NAME, featureKey, userId)
      );
      featureEnabled = false;
    }

    var featureInfo = {
      featureKey: featureKey,
      featureEnabled: featureEnabled,
      source: decision.decisionSource,
      sourceInfo: sourceInfo,
    };

    this.notificationCenter.sendNotifications(NOTIFICATION_TYPES.DECISION, {
      type: DECISION_NOTIFICATION_TYPES.FEATURE,
      userId: userId,
      attributes: attributes || {},
      decisionInfo: featureInfo,
    });

    return featureEnabled;
  } catch (e) {
    this.logger.log(LOG_LEVEL.ERROR, e.message);
    this.errorHandler.handleError(e);
    return false;
  }
};

/**
 * Returns an Array containing the keys of all features in the project that are
 * enabled for the given user.
 * @param {string} userId
 * @param {Object} attributes
 * @return {Array} Array of feature keys (strings)
 */
Optimizely.prototype.getEnabledFeatures = function(userId, attributes) {
  try {
    var enabledFeatures = [];
    if (!this.__isValidInstance()) {
      this.logger.log(
        LOG_LEVEL.ERROR,
        jsSdkUtils.sprintf(LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME, 'getEnabledFeatures')
      );
      return enabledFeatures;
    }

    if (!this.__validateInputs({ user_id: userId })) {
      return enabledFeatures;
    }

    var configObj = this.projectConfigManager.getConfig();
    if (!configObj) {
      return enabledFeatures;
    }

    jsSdkUtils.objectValues(configObj.featureKeyMap).forEach(
      function(feature) {
        if (this.isFeatureEnabled(feature.key, userId, attributes)) {
          enabledFeatures.push(feature.key);
        }
      }.bind(this)
    );

    return enabledFeatures;
  } catch (e) {
    this.logger.log(LOG_LEVEL.ERROR, e.message);
    this.errorHandler.handleError(e);
    return [];
  }
};

/**
 * Returns dynamically-typed value of the variable attached to the given
 * feature flag. Returns null if the feature key or variable key is invalid.
 *
 * @param {string} featureKey           Key of the feature whose variable's
 *                                      value is being accessed
 * @param {string} variableKey          Key of the variable whose value is
 *                                      being accessed
 * @param {string} userId               ID for the user
 * @param {Object} attributes           Optional user attributes
 * @return {string|boolean|number|null} Value of the variable cast to the appropriate
 *                                      type, or null if the feature key is invalid or
 *                                      the variable key is invalid
 */

Optimizely.prototype.getFeatureVariable = function(featureKey, variableKey, userId, attributes) {
  try {
    return this._getFeatureVariableForType(featureKey, variableKey, null, userId, attributes);
  } catch (e) {
    this.logger.log(LOG_LEVEL.ERROR, e.message);
    this.errorHandler.handleError(e);
    return null;
  }
};

/**
 * Helper method to get the value for a variable of a certain type attached to a
 * feature flag. Returns null if the feature key is invalid, the variable key is
 * invalid, the given variable type does not match the variable's actual type,
 * or the variable value cannot be cast to the required type. If the given variable
 * type is null, the value of the variable cast to the appropriate type is returned.
 *
 * @param {string} featureKey           Key of the feature whose variable's value is
 *                                      being accessed
 * @param {string} variableKey          Key of the variable whose value is being
 *                                      accessed
 * @param {string|null} variableType    Type of the variable whose value is being
 *                                      accessed (must be one of FEATURE_VARIABLE_TYPES
 *                                      in lib/utils/enums/index.js), or null to return the
 *                                      value of the variable cast to the appropriate type
 * @param {string} userId               ID for the user
 * @param {Object} attributes           Optional user attributes
 * @return {string|boolean|number|null} Value of the variable cast to the appropriate
 *                                      type, or null if the feature key is invalid, the
 *                                      variable key is invalid, or there is a mismatch
 *                                      with the type of the variable
 */
Optimizely.prototype._getFeatureVariableForType = function(featureKey, variableKey, variableType, userId, attributes) {
  if (!this.__isValidInstance()) {
    var apiName = variableType
      ? 'getFeatureVariable' + variableType.charAt(0).toUpperCase() + variableType.slice(1)
      : 'getFeatureVariable';
    this.logger.log(LOG_LEVEL.ERROR, jsSdkUtils.sprintf(LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME, apiName));
    return null;
  }

  if (!this.__validateInputs({ feature_key: featureKey, variable_key: variableKey, user_id: userId }, attributes)) {
    return null;
  }

  var configObj = this.projectConfigManager.getConfig();
  if (!configObj) {
    return null;
  }

  var featureFlag = projectConfig.getFeatureFromKey(configObj, featureKey, this.logger);
  if (!featureFlag) {
    return null;
  }

  var variable = projectConfig.getVariableForFeature(configObj, featureKey, variableKey, this.logger);
  if (!variable) {
    return null;
  }

  if (!variableType) {
    variableType = variable.type;
  } else if (variable.type !== variableType) {
    this.logger.log(
      LOG_LEVEL.WARNING,
      jsSdkUtils.sprintf(LOG_MESSAGES.VARIABLE_REQUESTED_WITH_WRONG_TYPE, MODULE_NAME, variableType, variable.type)
    );
    return null;
  }

  var featureEnabled = false;
  var variableValue = variable.defaultValue;
  var decision = this.decisionService.getVariationForFeature(configObj, featureFlag, userId, attributes);

  if (decision.variation !== null) {
    featureEnabled = decision.variation.featureEnabled;
    var value = projectConfig.getVariableValueForVariation(configObj, variable, decision.variation, this.logger);
    if (value !== null) {
      if (featureEnabled === true) {
        variableValue = value;
        this.logger.log(
          LOG_LEVEL.INFO,
          jsSdkUtils.sprintf(
            LOG_MESSAGES.USER_RECEIVED_VARIABLE_VALUE,
            MODULE_NAME,
            variableKey,
            featureFlag.key,
            variableValue,
            userId
          )
        );
      } else {
        this.logger.log(
          LOG_LEVEL.INFO,
          jsSdkUtils.sprintf(
            LOG_MESSAGES.FEATURE_NOT_ENABLED_RETURN_DEFAULT_VARIABLE_VALUE,
            MODULE_NAME,
            featureFlag.key,
            userId,
            variableKey
          )
        );
      }
    } else {
      this.logger.log(
        LOG_LEVEL.INFO,
        jsSdkUtils.sprintf(
          LOG_MESSAGES.VARIABLE_NOT_USED_RETURN_DEFAULT_VARIABLE_VALUE,
          MODULE_NAME,
          variableKey,
          decision.variation.key
        )
      );
    }
  } else {
    this.logger.log(
      LOG_LEVEL.INFO,
      jsSdkUtils.sprintf(
        LOG_MESSAGES.USER_RECEIVED_DEFAULT_VARIABLE_VALUE,
        MODULE_NAME,
        userId,
        variableKey,
        featureFlag.key
      )
    );
  }

  var sourceInfo = {};
  if (decision.decisionSource === DECISION_SOURCES.FEATURE_TEST) {
    sourceInfo = {
      experimentKey: decision.experiment.key,
      variationKey: decision.variation.key,
    };
  }

  var typeCastedValue = projectConfig.getTypeCastValue(variableValue, variableType, this.logger);
  this.notificationCenter.sendNotifications(NOTIFICATION_TYPES.DECISION, {
    type: DECISION_NOTIFICATION_TYPES.FEATURE_VARIABLE,
    userId: userId,
    attributes: attributes || {},
    decisionInfo: {
      featureKey: featureKey,
      featureEnabled: featureEnabled,
      source: decision.decisionSource,
      variableKey: variableKey,
      variableValue: typeCastedValue,
      variableType: variableType,
      sourceInfo: sourceInfo,
    },
  });
  return typeCastedValue;
};

/**
 * Returns value for the given boolean variable attached to the given feature
 * flag.
 * @param {string} featureKey   Key of the feature whose variable's value is
 *                              being accessed
 * @param {string} variableKey  Key of the variable whose value is being
 *                              accessed
 * @param {string} userId       ID for the user
 * @param {Object} attributes   Optional user attributes
 * @return {boolean|null}       Boolean value of the variable, or null if the
 *                              feature key is invalid, the variable key is
 *                              invalid, or there is a mismatch with the type
 *                              of the variable
 */
Optimizely.prototype.getFeatureVariableBoolean = function(featureKey, variableKey, userId, attributes) {
  try {
    return this._getFeatureVariableForType(featureKey, variableKey, FEATURE_VARIABLE_TYPES.BOOLEAN, userId, attributes);
  } catch (e) {
    this.logger.log(LOG_LEVEL.ERROR, e.message);
    this.errorHandler.handleError(e);
    return null;
  }
};

/**
 * Returns value for the given double variable attached to the given feature
 * flag.
 * @param {string} featureKey   Key of the feature whose variable's value is
 *                              being accessed
 * @param {string} variableKey  Key of the variable whose value is being
 *                              accessed
 * @param {string} userId       ID for the user
 * @param {Object} attributes   Optional user attributes
 * @return {number|null}        Number value of the variable, or null if the
 *                              feature key is invalid, the variable key is
 *                              invalid, or there is a mismatch with the type
 *                              of the variable
 */
Optimizely.prototype.getFeatureVariableDouble = function(featureKey, variableKey, userId, attributes) {
  try {
    return this._getFeatureVariableForType(featureKey, variableKey, FEATURE_VARIABLE_TYPES.DOUBLE, userId, attributes);
  } catch (e) {
    this.logger.log(LOG_LEVEL.ERROR, e.message);
    this.errorHandler.handleError(e);
    return null;
  }
};

/**
 * Returns value for the given integer variable attached to the given feature
 * flag.
 * @param {string} featureKey   Key of the feature whose variable's value is
 *                              being accessed
 * @param {string} variableKey  Key of the variable whose value is being
 *                              accessed
 * @param {string} userId       ID for the user
 * @param {Object} attributes   Optional user attributes
 * @return {number|null}        Number value of the variable, or null if the
 *                              feature key is invalid, the variable key is
 *                              invalid, or there is a mismatch with the type
 *                              of the variable
 */
Optimizely.prototype.getFeatureVariableInteger = function(featureKey, variableKey, userId, attributes) {
  try {
    return this._getFeatureVariableForType(featureKey, variableKey, FEATURE_VARIABLE_TYPES.INTEGER, userId, attributes);
  } catch (e) {
    this.logger.log(LOG_LEVEL.ERROR, e.message);
    this.errorHandler.handleError(e);
    return null;
  }
};

/**
 * Returns value for the given string variable attached to the given feature
 * flag.
 * @param {string} featureKey   Key of the feature whose variable's value is
 *                              being accessed
 * @param {string} variableKey  Key of the variable whose value is being
 *                              accessed
 * @param {string} userId       ID for the user
 * @param {Object} attributes   Optional user attributes
 * @return {string|null}        String value of the variable, or null if the
 *                              feature key is invalid, the variable key is
 *                              invalid, or there is a mismatch with the type
 *                              of the variable
 */
Optimizely.prototype.getFeatureVariableString = function(featureKey, variableKey, userId, attributes) {
  try {
    return this._getFeatureVariableForType(featureKey, variableKey, FEATURE_VARIABLE_TYPES.STRING, userId, attributes);
  } catch (e) {
    this.logger.log(LOG_LEVEL.ERROR, e.message);
    this.errorHandler.handleError(e);
    return null;
  }
};

/**
 * Returns OptimizelyConfig object containing experiments and features data
 * @return {Object}
 *
 * OptimizelyConfig Object Schema
 * {
 *   'experimentsMap': {
 *     'my-fist-experiment': {
 *       'id': '111111',
 *       'key': 'my-fist-experiment'
 *       'variationsMap': {
 *         'variation_1': {
 *           'id': '121212',
 *           'key': 'variation_1',
 *           'variablesMap': {
 *             'age': {
 *               'id': '222222',
 *               'key': 'age',
 *               'type': 'integer',
 *               'value': '0',
 *             }
 *           }
 *         }
 *       }
 *     }
 *   },
 *   'featuresMap': {
 *     'awesome-feature': {
 *       'id': '333333',
 *       'key': 'awesome-feature',
 *       'experimentsMap': Object,
 *       'variationsMap': Object,
 *     }
 *   }
 * }
 */
Optimizely.prototype.getOptimizelyConfig = function() {
  try {
    var configObj = this.projectConfigManager.getConfig();
    if (!configObj) {
      return null;
    }
    return this.projectConfigManager.getOptimizelyConfig();
  } catch (e) {
    this.logger.log(LOG_LEVEL.ERROR, e.message);
    this.errorHandler.handleError(e);
    return null;
  }
};

/**
 * Stop background processes belonging to this instance, including:
 *
 * - Active datafile requests
 * - Pending datafile requests
 * - Pending event queue flushes
 *
 * In-flight datafile requests will be aborted. Any events waiting to be sent
 * as part of a batched event request will be immediately flushed to the event
 * dispatcher.
 *
 * Returns a Promise that fulfills after all in-flight event dispatcher requests
 * (including any final request resulting from flushing the queue as described
 * above) are complete. If there are no in-flight event dispatcher requests and
 * no queued events waiting to be sent, returns an immediately-fulfilled Promise.
 *
 * Returned Promises are fulfilled with result objects containing these
 * properties:
 *    - success (boolean): true if the event dispatcher signaled completion of
 *                         all in-flight and final requests, or if there were no
 *                         queued events and no in-flight requests. false if an
 *                         unexpected error was encountered during the close
 *                         process.
 *    - reason (string=):  If success is false, this is a string property with
 *                         an explanatory message.
 *
 * NOTE: After close is called, this instance is no longer usable - any events
 * generated will no longer be sent to the event dispatcher.
 *
 * @return {Promise}
 */
Optimizely.prototype.close = function() {
  try {
    var eventProcessorStoppedPromise = this.eventProcessor.stop();
    if (this.__disposeOnUpdate) {
      this.__disposeOnUpdate();
      this.__disposeOnUpdate = null;
    }
    if (this.projectConfigManager) {
      this.projectConfigManager.stop();
    }
    Object.keys(this.__readyTimeouts).forEach(
      function(readyTimeoutId) {
        var readyTimeoutRecord = this.__readyTimeouts[readyTimeoutId];
        clearTimeout(readyTimeoutRecord.readyTimeout);
        readyTimeoutRecord.onClose();
      }.bind(this)
    );
    this.__readyTimeouts = {};
    return eventProcessorStoppedPromise.then(
      function() {
        return {
          success: true,
        };
      },
      function(err) {
        return {
          success: false,
          reason: String(err),
        };
      }
    );
  } catch (err) {
    this.logger.log(LOG_LEVEL.ERROR, err.message);
    this.errorHandler.handleError(err);
    return Promise.resolve({
      success: false,
      reason: String(err),
    });
  }
};

/**
 * Returns a Promise that fulfills when this instance is ready to use (meaning
 * it has a valid datafile), or has failed to become ready within a period of
 * time (configurable by the timeout property of the options argument), or when
 * this instance is closed via the close method.
 *
 * If a valid datafile was provided in the constructor, the returned Promise is
 * immediately fulfilled. If an sdkKey was provided, a manager will be used to
 * fetch  a datafile, and the returned promise will fulfill if that fetch
 * succeeds or fails before the timeout. The default timeout is 30 seconds,
 * which will be used if no timeout is provided in the argument options object.
 *
 * The returned Promise is fulfilled with a result object containing these
 * properties:
 *    - success (boolean): True if this instance is ready to use with a valid
 *                         datafile, or false if this instance failed to become
 *                         ready or was closed prior to becoming ready.
 *    - reason (string=):  If success is false, this is a string property with
 *                         an explanatory message. Failure could be due to
 *                         expiration of the timeout, network errors,
 *                         unsuccessful responses, datafile parse errors,
 *                         datafile validation errors, or the instance being
 *                         closed
 * @param  {Object=}          options
 * @param  {number|undefined} options.timeout
 * @return {Promise}
 */
Optimizely.prototype.onReady = function(options) {
  var timeout;
  if (typeof options === 'object' && options !== null) {
    timeout = options.timeout;
  }
  if (!fns.isSafeInteger(timeout)) {
    timeout = DEFAULT_ONREADY_TIMEOUT;
  }

  var resolveTimeoutPromise;
  var timeoutPromise = new Promise(function(resolve) {
    resolveTimeoutPromise = resolve;
  });

  var timeoutId = this.__nextReadyTimeoutId;
  this.__nextReadyTimeoutId++;

  var onReadyTimeout = function() {
    delete this.__readyTimeouts[timeoutId];
    resolveTimeoutPromise({
      success: false,
      reason: jsSdkUtils.sprintf('onReady timeout expired after %s ms', timeout),
    });
  }.bind(this);
  var readyTimeout = setTimeout(onReadyTimeout, timeout);
  var onClose = function() {
    resolveTimeoutPromise({
      success: false,
      reason: 'Instance closed',
    });
  };

  this.__readyTimeouts[timeoutId] = {
    readyTimeout: readyTimeout,
    onClose: onClose,
  };

  this.__readyPromise.then(
    function() {
      clearTimeout(readyTimeout);
      delete this.__readyTimeouts[timeoutId];
      resolveTimeoutPromise({
        success: true,
      });
    }.bind(this)
  );

  return Promise.race([this.__readyPromise, timeoutPromise]);
};

module.exports = Optimizely;


/***/ }),
/* 28 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * Copyright 2016, 2018-2019, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Provides utility method for validating that the attributes user has provided are valid
 */

var sprintf = __webpack_require__(12).sprintf;
var fns = __webpack_require__(11);

var ERROR_MESSAGES = __webpack_require__(14).ERROR_MESSAGES;
var MODULE_NAME = 'ATTRIBUTES_VALIDATOR';

module.exports = {
  /**
   * Validates user's provided attributes
   * @param  {Object}  attributes
   * @return {boolean} True if the attributes are valid
   * @throws If the attributes are not valid
   */
  validate: function(attributes) {
    if (typeof attributes === 'object' && !Array.isArray(attributes) && attributes !== null) {
      Object.keys(attributes).forEach(function(key) {
        if (typeof attributes[key] === 'undefined') {
          throw new Error(sprintf(ERROR_MESSAGES.UNDEFINED_ATTRIBUTE, MODULE_NAME, key));
        }
      });
      return true;
    } else {
      throw new Error(sprintf(ERROR_MESSAGES.INVALID_ATTRIBUTES, MODULE_NAME));
    }
  },

  isAttributeValid: function(attributeKey, attributeValue) {
    return (
      typeof attributeKey === 'string' &&
      (typeof attributeValue === 'string' ||
        typeof attributeValue === 'boolean' ||
        (fns.isNumber(attributeValue) && fns.isSafeInteger(attributeValue)))
    );
  },
};


/***/ }),
/* 29 */
/***/ (function(module, exports, __webpack_require__) {

/****************************************************************************
 * Copyright 2017-2019, Optimizely, Inc. and contributors                   *
 *                                                                          *
 * Licensed under the Apache License, Version 2.0 (the "License");          *
 * you may not use this file except in compliance with the License.         *
 * You may obtain a copy of the License at                                  *
 *                                                                          *
 *    http://www.apache.org/licenses/LICENSE-2.0                            *
 *                                                                          *
 * Unless required by applicable law or agreed to in writing, software      *
 * distributed under the License is distributed on an "AS IS" BASIS,        *
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. *
 * See the License for the specific language governing permissions and      *
 * limitations under the License.                                           *
 ***************************************************************************/

var AudienceEvaluator = __webpack_require__(30);
var bucketer = __webpack_require__(33);
var enums = __webpack_require__(14);
var fns = __webpack_require__(11);
var projectConfig = __webpack_require__(35);
var stringValidator = __webpack_require__(37);

var sprintf = __webpack_require__(12).sprintf;

var MODULE_NAME = 'DECISION_SERVICE';
var ERROR_MESSAGES = enums.ERROR_MESSAGES;
var LOG_LEVEL = enums.LOG_LEVEL;
var LOG_MESSAGES = enums.LOG_MESSAGES;
var DECISION_SOURCES = enums.DECISION_SOURCES;

/**
 * Optimizely's decision service that determines which variation of an experiment the user will be allocated to.
 *
 * The decision service contains all logic around how a user decision is made. This includes all of the following (in order):
 *   1. Checking experiment status
 *   2. Checking forced bucketing
 *   3. Checking whitelisting
 *   4. Checking user profile service for past bucketing decisions (sticky bucketing)
 *   5. Checking audience targeting
 *   6. Using Murmurhash3 to bucket the user.
 *
 * @constructor
 * @param   {Object} options
 * @param   {Object} options.userProfileService An instance of the user profile service for sticky bucketing.
 * @param   {Object} options.logger An instance of a logger to log messages.
 * @returns {Object}
 */
function DecisionService(options) {
  this.audienceEvaluator = new AudienceEvaluator(options.UNSTABLE_conditionEvaluators);
  this.forcedVariationMap = {};
  this.logger = options.logger;
  this.userProfileService = options.userProfileService || null;
}

/**
 * Gets variation where visitor will be bucketed.
 * @param  {Object}      configObj      The parsed project configuration object
 * @param  {string}      experimentKey
 * @param  {string}      userId
 * @param  {Object}      attributes
 * @return {string|null} the variation the user is bucketed into.
 */
DecisionService.prototype.getVariation = function(configObj, experimentKey, userId, attributes) {
  // by default, the bucketing ID should be the user ID
  var bucketingId = this._getBucketingId(userId, attributes);

  if (!this.__checkIfExperimentIsActive(configObj, experimentKey)) {
    return null;
  }
  var experiment = configObj.experimentKeyMap[experimentKey];
  var forcedVariationKey = this.getForcedVariation(configObj, experimentKey, userId);
  if (forcedVariationKey) {
    return forcedVariationKey;
  }

  var variation = this.__getWhitelistedVariation(experiment, userId);
  if (variation) {
    return variation.key;
  }

  // check for sticky bucketing
  var experimentBucketMap = this.__resolveExperimentBucketMap(userId, attributes);
  variation = this.__getStoredVariation(configObj, experiment, userId, experimentBucketMap);
  if (variation) {
    this.logger.log(
      LOG_LEVEL.INFO,
      sprintf(LOG_MESSAGES.RETURNING_STORED_VARIATION, MODULE_NAME, variation.key, experimentKey, userId)
    );
    return variation.key;
  }

  // Perform regular targeting and bucketing
  if (!this.__checkIfUserIsInAudience(configObj, experimentKey, userId, attributes)) {
    return null;
  }

  var bucketerParams = this.__buildBucketerParams(configObj, experimentKey, bucketingId, userId);
  var variationId = bucketer.bucket(bucketerParams);
  variation = configObj.variationIdMap[variationId];
  if (!variation) {
    return null;
  }

  // persist bucketing
  this.__saveUserProfile(experiment, variation, userId, experimentBucketMap);

  return variation.key;
};

/**
 * Merges attributes from attributes[STICKY_BUCKETING_KEY] and userProfileService
 * @param  {Object} attributes
 * @return {Object} finalized copy of experiment_bucket_map
 */
DecisionService.prototype.__resolveExperimentBucketMap = function(userId, attributes) {
  attributes = attributes || {};
  var userProfile = this.__getUserProfile(userId) || {};
  var attributeExperimentBucketMap = attributes[enums.CONTROL_ATTRIBUTES.STICKY_BUCKETING_KEY];
  return fns.assign({}, userProfile.experiment_bucket_map, attributeExperimentBucketMap);
};

/**
 * Checks whether the experiment is running
 * @param  {Object}  configObj     The parsed project configuration object
 * @param  {string}  experimentKey Key of experiment being validated
 * @param  {string}  userId        ID of user
 * @return {boolean} True if experiment is running
 */
DecisionService.prototype.__checkIfExperimentIsActive = function(configObj, experimentKey) {
  if (!projectConfig.isActive(configObj, experimentKey)) {
    var experimentNotRunningLogMessage = sprintf(LOG_MESSAGES.EXPERIMENT_NOT_RUNNING, MODULE_NAME, experimentKey);
    this.logger.log(LOG_LEVEL.INFO, experimentNotRunningLogMessage);
    return false;
  }

  return true;
};

/**
 * Checks if user is whitelisted into any variation and return that variation if so
 * @param  {Object} experiment
 * @param  {string} userId
 * @return {string|null} Forced variation if it exists for user ID, otherwise null
 */
DecisionService.prototype.__getWhitelistedVariation = function(experiment, userId) {
  if (experiment.forcedVariations && experiment.forcedVariations.hasOwnProperty(userId)) {
    var forcedVariationKey = experiment.forcedVariations[userId];
    if (experiment.variationKeyMap.hasOwnProperty(forcedVariationKey)) {
      var forcedBucketingSucceededMessageLog = sprintf(
        LOG_MESSAGES.USER_FORCED_IN_VARIATION,
        MODULE_NAME,
        userId,
        forcedVariationKey
      );
      this.logger.log(LOG_LEVEL.INFO, forcedBucketingSucceededMessageLog);
      return experiment.variationKeyMap[forcedVariationKey];
    } else {
      var forcedBucketingFailedMessageLog = sprintf(
        LOG_MESSAGES.FORCED_BUCKETING_FAILED,
        MODULE_NAME,
        forcedVariationKey,
        userId
      );
      this.logger.log(LOG_LEVEL.ERROR, forcedBucketingFailedMessageLog);
      return null;
    }
  }

  return null;
};

/**
 * Checks whether the user is included in experiment audience
 * @param  {Object}  configObj     The parsed project configuration object
 * @param  {string}  experimentKey Key of experiment being validated
 * @param  {string}  userId        ID of user
 * @param  {Object}  attributes    Optional parameter for user's attributes
 * @return {boolean} True if user meets audience conditions
 */
DecisionService.prototype.__checkIfUserIsInAudience = function(configObj, experimentKey, userId, attributes) {
  var experimentAudienceConditions = projectConfig.getExperimentAudienceConditions(configObj, experimentKey);
  var audiencesById = projectConfig.getAudiencesById(configObj);
  this.logger.log(
    LOG_LEVEL.DEBUG,
    sprintf(
      LOG_MESSAGES.EVALUATING_AUDIENCES_COMBINED,
      MODULE_NAME,
      experimentKey,
      JSON.stringify(experimentAudienceConditions)
    )
  );
  var result = this.audienceEvaluator.evaluate(experimentAudienceConditions, audiencesById, attributes);
  this.logger.log(
    LOG_LEVEL.INFO,
    sprintf(
      LOG_MESSAGES.AUDIENCE_EVALUATION_RESULT_COMBINED,
      MODULE_NAME,
      experimentKey,
      result.toString().toUpperCase()
    )
  );

  if (!result) {
    var userDoesNotMeetConditionsLogMessage = sprintf(
      LOG_MESSAGES.USER_NOT_IN_EXPERIMENT,
      MODULE_NAME,
      userId,
      experimentKey
    );
    this.logger.log(LOG_LEVEL.INFO, userDoesNotMeetConditionsLogMessage);
    return false;
  }

  return true;
};

/**
 * Given an experiment key and user ID, returns params used in bucketer call
 * @param  configObj     The parsed project configuration object
 * @param  experimentKey Experiment key used for bucketer
 * @param  bucketingId   ID to bucket user into
 * @param  userId        ID of user to be bucketed
 * @return {Object}
 */
DecisionService.prototype.__buildBucketerParams = function(configObj, experimentKey, bucketingId, userId) {
  var bucketerParams = {};
  bucketerParams.experimentKey = experimentKey;
  bucketerParams.experimentId = projectConfig.getExperimentId(configObj, experimentKey);
  bucketerParams.userId = userId;
  bucketerParams.trafficAllocationConfig = projectConfig.getTrafficAllocation(configObj, experimentKey);
  bucketerParams.experimentKeyMap = configObj.experimentKeyMap;
  bucketerParams.groupIdMap = configObj.groupIdMap;
  bucketerParams.variationIdMap = configObj.variationIdMap;
  bucketerParams.logger = this.logger;
  bucketerParams.bucketingId = bucketingId;
  return bucketerParams;
};

/**
 * Pull the stored variation out of the experimentBucketMap for an experiment/userId
 * @param  {Object} configObj           The parsed project configuration object
 * @param  {Object} experiment
 * @param  {String} userId
 * @param  {Object} experimentBucketMap mapping experiment => { variation_id: <variationId> }
 * @return {Object} the stored variation or null if the user profile does not have one for the given experiment
 */
DecisionService.prototype.__getStoredVariation = function(configObj, experiment, userId, experimentBucketMap) {
  if (experimentBucketMap.hasOwnProperty(experiment.id)) {
    var decision = experimentBucketMap[experiment.id];
    var variationId = decision.variation_id;
    if (configObj.variationIdMap.hasOwnProperty(variationId)) {
      return configObj.variationIdMap[decision.variation_id];
    } else {
      this.logger.log(
        LOG_LEVEL.INFO,
        sprintf(LOG_MESSAGES.SAVED_VARIATION_NOT_FOUND, MODULE_NAME, userId, variationId, experiment.key)
      );
    }
  }

  return null;
};

/**
 * Get the user profile with the given user ID
 * @param  {string} userId
 * @return {Object|undefined} the stored user profile or undefined if one isn't found
 */
DecisionService.prototype.__getUserProfile = function(userId) {
  var userProfile = {
    user_id: userId,
    experiment_bucket_map: {},
  };

  if (!this.userProfileService) {
    return userProfile;
  }

  try {
    return this.userProfileService.lookup(userId);
  } catch (ex) {
    this.logger.log(
      LOG_LEVEL.ERROR,
      sprintf(ERROR_MESSAGES.USER_PROFILE_LOOKUP_ERROR, MODULE_NAME, userId, ex.message)
    );
  }
};

/**
 * Saves the bucketing decision to the user profile
 * @param {Object} userProfile
 * @param {Object} experiment
 * @param {Object} variation
 * @param {Object} experimentBucketMap
 */
DecisionService.prototype.__saveUserProfile = function(experiment, variation, userId, experimentBucketMap) {
  if (!this.userProfileService) {
    return;
  }

  try {
    experimentBucketMap[experiment.id] = {
      variation_id: variation.id
    };

    this.userProfileService.save({
      user_id: userId,
      experiment_bucket_map: experimentBucketMap,
    });

    this.logger.log(
      LOG_LEVEL.INFO,
      sprintf(LOG_MESSAGES.SAVED_VARIATION, MODULE_NAME, variation.key, experiment.key, userId)
    );
  } catch (ex) {
    this.logger.log(LOG_LEVEL.ERROR, sprintf(ERROR_MESSAGES.USER_PROFILE_SAVE_ERROR, MODULE_NAME, userId, ex.message));
  }
};

/**
 * Given a feature, user ID, and attributes, returns an object representing a
 * decision. If the user was bucketed into a variation for the given feature
 * and attributes, the returned decision object will have variation and
 * experiment properties (both objects), as well as a decisionSource property.
 * decisionSource indicates whether the decision was due to a rollout or an
 * experiment.
 * @param   {Object} configObj  The parsed project configuration object
 * @param   {Object} feature    A feature flag object from project configuration
 * @param   {String} userId     A string identifying the user, for bucketing
 * @param   {Object} attributes Optional user attributes
 * @return  {Object} An object with experiment, variation, and decisionSource
 * properties. If the user was not bucketed into a variation, the variation
 * property is null.
 */
DecisionService.prototype.getVariationForFeature = function(configObj, feature, userId, attributes) {
  var experimentDecision = this._getVariationForFeatureExperiment(configObj, feature, userId, attributes);
  if (experimentDecision.variation !== null) {
    this.logger.log(
      LOG_LEVEL.DEBUG,
      sprintf(
        LOG_MESSAGES.USER_IN_FEATURE_EXPERIMENT,
        MODULE_NAME,
        userId,
        experimentDecision.variation.key,
        experimentDecision.experiment.key,
        feature.key
      )
    );
    return experimentDecision;
  }

  this.logger.log(
    LOG_LEVEL.DEBUG,
    sprintf(LOG_MESSAGES.USER_NOT_IN_FEATURE_EXPERIMENT, MODULE_NAME, userId, feature.key)
  );

  var rolloutDecision = this._getVariationForRollout(configObj, feature, userId, attributes);
  if (rolloutDecision.variation !== null) {
    this.logger.log(LOG_LEVEL.DEBUG, sprintf(LOG_MESSAGES.USER_IN_ROLLOUT, MODULE_NAME, userId, feature.key));
    return rolloutDecision;
  }

  this.logger.log(LOG_LEVEL.DEBUG, sprintf(LOG_MESSAGES.USER_NOT_IN_ROLLOUT, MODULE_NAME, userId, feature.key));
  return rolloutDecision;
};

DecisionService.prototype._getVariationForFeatureExperiment = function(configObj, feature, userId, attributes) {
  var experiment = null;
  var variationKey = null;

  if (feature.hasOwnProperty('groupId')) {
    var group = configObj.groupIdMap[feature.groupId];
    if (group) {
      experiment = this._getExperimentInGroup(configObj, group, userId);
      if (experiment && feature.experimentIds.indexOf(experiment.id) !== -1) {
        variationKey = this.getVariation(configObj, experiment.key, userId, attributes);
      }
    }
  } else if (feature.experimentIds.length > 0) {
    // If the feature does not have a group ID, then it can only be associated
    // with one experiment, so we look at the first experiment ID only
    experiment = projectConfig.getExperimentFromId(configObj, feature.experimentIds[0], this.logger);
    if (experiment) {
      variationKey = this.getVariation(configObj, experiment.key, userId, attributes);
    }
  } else {
    this.logger.log(LOG_LEVEL.DEBUG, sprintf(LOG_MESSAGES.FEATURE_HAS_NO_EXPERIMENTS, MODULE_NAME, feature.key));
  }

  var variation = null;
  if (variationKey !== null && experiment !== null) {
    variation = experiment.variationKeyMap[variationKey];
  }
  return {
    experiment: experiment,
    variation: variation,
    decisionSource: DECISION_SOURCES.FEATURE_TEST,
  };
};

DecisionService.prototype._getExperimentInGroup = function(configObj, group, userId) {
  var experimentId = bucketer.bucketUserIntoExperiment(group, userId, userId, this.logger);
  if (experimentId) {
    this.logger.log(
      LOG_LEVEL.INFO,
      sprintf(LOG_MESSAGES.USER_BUCKETED_INTO_EXPERIMENT_IN_GROUP, MODULE_NAME, userId, experimentId, group.id)
    );
    var experiment = projectConfig.getExperimentFromId(configObj, experimentId, this.logger);
    if (experiment) {
      return experiment;
    }
  }

  this.logger.log(
    LOG_LEVEL.INFO,
    sprintf(LOG_MESSAGES.USER_NOT_BUCKETED_INTO_ANY_EXPERIMENT_IN_GROUP, MODULE_NAME, userId, group.id)
  );
  return null;
};

DecisionService.prototype._getVariationForRollout = function(configObj, feature, userId, attributes) {
  if (!feature.rolloutId) {
    this.logger.log(LOG_LEVEL.DEBUG, sprintf(LOG_MESSAGES.NO_ROLLOUT_EXISTS, MODULE_NAME, feature.key));
    return {
      experiment: null,
      variation: null,
      decisionSource: DECISION_SOURCES.ROLLOUT,
    };
  }

  var rollout = configObj.rolloutIdMap[feature.rolloutId];
  if (!rollout) {
    this.logger.log(
      LOG_LEVEL.ERROR,
      sprintf(ERROR_MESSAGES.INVALID_ROLLOUT_ID, MODULE_NAME, feature.rolloutId, feature.key)
    );
    return {
      experiment: null,
      variation: null,
      decisionSource: DECISION_SOURCES.ROLLOUT,
    };
  }

  if (rollout.experiments.length === 0) {
    this.logger.log(LOG_LEVEL.ERROR, sprintf(LOG_MESSAGES.ROLLOUT_HAS_NO_EXPERIMENTS, MODULE_NAME, feature.rolloutId));
    return {
      experiment: null,
      variation: null,
      decisionSource: DECISION_SOURCES.ROLLOUT,
    };
  }

  var bucketingId = this._getBucketingId(userId, attributes);

  // The end index is length - 1 because the last experiment is assumed to be
  // "everyone else", which will be evaluated separately outside this loop
  var endIndex = rollout.experiments.length - 1;
  var index;
  var experiment;
  var bucketerParams;
  var variationId;
  var variation;
  for (index = 0; index < endIndex; index++) {
    experiment = configObj.experimentKeyMap[rollout.experiments[index].key];

    if (!this.__checkIfUserIsInAudience(configObj, experiment.key, userId, attributes)) {
      this.logger.log(
        LOG_LEVEL.DEBUG,
        sprintf(LOG_MESSAGES.USER_DOESNT_MEET_CONDITIONS_FOR_TARGETING_RULE, MODULE_NAME, userId, index + 1)
      );
      continue;
    }

    this.logger.log(
      LOG_LEVEL.DEBUG,
      sprintf(LOG_MESSAGES.USER_MEETS_CONDITIONS_FOR_TARGETING_RULE, MODULE_NAME, userId, index + 1)
    );
    bucketerParams = this.__buildBucketerParams(configObj, experiment.key, bucketingId, userId);
    variationId = bucketer.bucket(bucketerParams);
    variation = configObj.variationIdMap[variationId];
    if (variation) {
      this.logger.log(
        LOG_LEVEL.DEBUG,
        sprintf(LOG_MESSAGES.USER_BUCKETED_INTO_TARGETING_RULE, MODULE_NAME, userId, index + 1)
      );
      return {
        experiment: experiment,
        variation: variation,
        decisionSource: DECISION_SOURCES.ROLLOUT,
      };
    } else {
      this.logger.log(
        LOG_LEVEL.DEBUG,
        sprintf(LOG_MESSAGES.USER_NOT_BUCKETED_INTO_TARGETING_RULE, MODULE_NAME, userId, index + 1)
      );
      break;
    }
  }

  var everyoneElseExperiment = configObj.experimentKeyMap[rollout.experiments[endIndex].key];
  if (this.__checkIfUserIsInAudience(configObj, everyoneElseExperiment.key, userId, attributes)) {
    bucketerParams = this.__buildBucketerParams(configObj, everyoneElseExperiment.key, bucketingId, userId);
    variationId = bucketer.bucket(bucketerParams);
    variation = configObj.variationIdMap[variationId];
    if (variation) {
      this.logger.log(
        LOG_LEVEL.DEBUG,
        sprintf(LOG_MESSAGES.USER_BUCKETED_INTO_EVERYONE_TARGETING_RULE, MODULE_NAME, userId)
      );
      return {
        experiment: everyoneElseExperiment,
        variation: variation,
        decisionSource: DECISION_SOURCES.ROLLOUT,
      };
    } else {
      this.logger.log(
        LOG_LEVEL.DEBUG,
        sprintf(LOG_MESSAGES.USER_NOT_BUCKETED_INTO_EVERYONE_TARGETING_RULE, MODULE_NAME, userId)
      );
    }
  }

  return {
    experiment: null,
    variation: null,
    decisionSource: DECISION_SOURCES.ROLLOUT,
  };
};

/**
 * Get bucketing Id from user attributes.
 * @param {String} userId
 * @param {Object} attributes
 * @returns {String} Bucketing Id if it is a string type in attributes, user Id otherwise.
 */
DecisionService.prototype._getBucketingId = function(userId, attributes) {
  var bucketingId = userId;

  // If the bucketing ID key is defined in attributes, than use that in place of the userID for the murmur hash key
  if (
    attributes != null &&
    typeof attributes === 'object' &&
    attributes.hasOwnProperty(enums.CONTROL_ATTRIBUTES.BUCKETING_ID)
  ) {
    if (typeof attributes[enums.CONTROL_ATTRIBUTES.BUCKETING_ID] === 'string') {
      bucketingId = attributes[enums.CONTROL_ATTRIBUTES.BUCKETING_ID];
      this.logger.log(LOG_LEVEL.DEBUG, sprintf(LOG_MESSAGES.VALID_BUCKETING_ID, MODULE_NAME, bucketingId));
    } else {
      this.logger.log(LOG_LEVEL.WARNING, sprintf(LOG_MESSAGES.BUCKETING_ID_NOT_STRING, MODULE_NAME));
    }
  }

  return bucketingId;
};

/**
 * Removes forced variation for given userId and experimentKey
 * @param  {string} userId         String representing the user id
 * @param  {number} experimentId   Number representing the experiment id
 * @param  {string} experimentKey  Key representing the experiment id
 * @throws If the user id is not valid or not in the forced variation map
 */
DecisionService.prototype.removeForcedVariation = function(userId, experimentId, experimentKey) {
  if (!userId) {
    throw new Error(sprintf(ERROR_MESSAGES.INVALID_USER_ID, MODULE_NAME));
  }

  if (this.forcedVariationMap.hasOwnProperty(userId)) {
    delete this.forcedVariationMap[userId][experimentId];
    this.logger.log(
      LOG_LEVEL.DEBUG,
      sprintf(LOG_MESSAGES.VARIATION_REMOVED_FOR_USER, MODULE_NAME, experimentKey, userId)
    );
  } else {
    throw new Error(sprintf(ERROR_MESSAGES.USER_NOT_IN_FORCED_VARIATION, MODULE_NAME, userId));
  }
};

/**
 * Sets forced variation for given userId and experimentKey
 * @param  {string} userId        String representing the user id
 * @param  {number} experimentId  Number representing the experiment id
 * @param  {number} variationId   Number representing the variation id
 * @throws If the user id is not valid
 */
DecisionService.prototype.__setInForcedVariationMap = function(userId, experimentId, variationId) {
  if (this.forcedVariationMap.hasOwnProperty(userId)) {
    this.forcedVariationMap[userId][experimentId] = variationId;
  } else {
    this.forcedVariationMap[userId] = {};
    this.forcedVariationMap[userId][experimentId] = variationId;
  }

  this.logger.log(
    LOG_LEVEL.DEBUG,
    sprintf(LOG_MESSAGES.USER_MAPPED_TO_FORCED_VARIATION, MODULE_NAME, variationId, experimentId, userId)
  );
};

/**
 * Gets the forced variation key for the given user and experiment.
 * @param  {Object} configObj        Object representing project configuration
 * @param  {string} experimentKey    Key for experiment.
 * @param  {string} userId           The user Id.
 * @return {string|null} Variation   The variation which the given user and experiment should be forced into.
 */
DecisionService.prototype.getForcedVariation = function(configObj, experimentKey, userId) {
  var experimentToVariationMap = this.forcedVariationMap[userId];
  if (!experimentToVariationMap) {
    this.logger.log(LOG_LEVEL.DEBUG, sprintf(LOG_MESSAGES.USER_HAS_NO_FORCED_VARIATION, MODULE_NAME, userId));
    return null;
  }

  var experimentId;
  try {
    var experiment = projectConfig.getExperimentFromKey(configObj, experimentKey);
    if (experiment.hasOwnProperty('id')) {
      experimentId = experiment['id'];
    } else {
      // catching improperly formatted experiments
      this.logger.log(
        LOG_LEVEL.ERROR,
        sprintf(ERROR_MESSAGES.IMPROPERLY_FORMATTED_EXPERIMENT, MODULE_NAME, experimentKey)
      );
      return null;
    }
  } catch (ex) {
    // catching experiment not in datafile
    this.logger.log(LOG_LEVEL.ERROR, ex.message);
    return null;
  }

  var variationId = experimentToVariationMap[experimentId];
  if (!variationId) {
    this.logger.log(
      LOG_LEVEL.DEBUG,
      sprintf(LOG_MESSAGES.USER_HAS_NO_FORCED_VARIATION_FOR_EXPERIMENT, MODULE_NAME, experimentKey, userId)
    );
    return null;
  }

  var variationKey = projectConfig.getVariationKeyFromId(configObj, variationId);
  if (variationKey) {
    this.logger.log(
      LOG_LEVEL.DEBUG,
      sprintf(LOG_MESSAGES.USER_HAS_FORCED_VARIATION, MODULE_NAME, variationKey, experimentKey, userId)
    );
  } else {
    this.logger.log(
      LOG_LEVEL.DEBUG,
      sprintf(LOG_MESSAGES.USER_HAS_NO_FORCED_VARIATION_FOR_EXPERIMENT, MODULE_NAME, experimentKey, userId)
    );
  }

  return variationKey;
};

/**
 * Sets the forced variation for a user in a given experiment
 * @param  {Object} configObj      Object representing project configuration
 * @param  {string} experimentKey  Key for experiment.
 * @param  {string} userId         The user Id.
 * @param  {string} variationKey   Key for variation. If null, then clear the existing experiment-to-variation mapping
 * @return {boolean}               A boolean value that indicates if the set completed successfully.
 */
DecisionService.prototype.setForcedVariation = function(configObj, experimentKey, userId, variationKey) {
  if (variationKey != null && !stringValidator.validate(variationKey)) {
    this.logger.log(LOG_LEVEL.ERROR, sprintf(ERROR_MESSAGES.INVALID_VARIATION_KEY, MODULE_NAME));
    return false;
  }

  var experimentId;
  try {
    var experiment = projectConfig.getExperimentFromKey(configObj, experimentKey);
    if (experiment.hasOwnProperty('id')) {
      experimentId = experiment['id'];
    } else {
      // catching improperly formatted experiments
      this.logger.log(
        LOG_LEVEL.ERROR,
        sprintf(ERROR_MESSAGES.IMPROPERLY_FORMATTED_EXPERIMENT, MODULE_NAME, experimentKey)
      );
      return false;
    }
  } catch (ex) {
    // catching experiment not in datafile
    this.logger.log(LOG_LEVEL.ERROR, ex.message);
    return false;
  }

  if (variationKey == null) {
    try {
      this.removeForcedVariation(userId, experimentId, experimentKey, this.logger);
      return true;
    } catch (ex) {
      this.logger.log(LOG_LEVEL.ERROR, ex.message);
      return false;
    }
  }

  var variationId = projectConfig.getVariationIdFromExperimentAndVariationKey(configObj, experimentKey, variationKey);

  if (!variationId) {
    this.logger.log(
      LOG_LEVEL.ERROR,
      sprintf(ERROR_MESSAGES.NO_VARIATION_FOR_EXPERIMENT_KEY, MODULE_NAME, variationKey, experimentKey)
    );
    return false;
  }

  try {
    this.__setInForcedVariationMap(userId, experimentId, variationId);
    return true;
  } catch (ex) {
    this.logger.log(LOG_LEVEL.ERROR, ex.message);
    return false;
  }
};

module.exports = {
  /**
   * Creates an instance of the DecisionService.
   * @param  {Object} options               Configuration options
   * @param  {Object} options.userProfileService
   * @param  {Object} options.logger
   * @return {Object} An instance of the DecisionService
   */
  createDecisionService: function(options) {
    return new DecisionService(options);
  },
};


/***/ }),
/* 30 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * Copyright 2016, 2018-2019 Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var conditionTreeEvaluator = __webpack_require__(31);
var customAttributeConditionEvaluator = __webpack_require__(32);
var enums = __webpack_require__(14);
var fns = __webpack_require__(11);
var sprintf = __webpack_require__(12).sprintf;
var logging = __webpack_require__(1);
var logger = logging.getLogger();

var ERROR_MESSAGES = enums.ERROR_MESSAGES;
var LOG_LEVEL = enums.LOG_LEVEL;
var LOG_MESSAGES = enums.LOG_MESSAGES;
var MODULE_NAME = 'AUDIENCE_EVALUATOR';

/**
 * Construct an instance of AudienceEvaluator with given options
 * @param {Object=} UNSTABLE_conditionEvaluators A map of condition evaluators provided by the consumer. This enables matching
 *                                                   condition types which are not supported natively by the SDK. Note that built in
 *                                                   Optimizely evaluators cannot be overridden.
 * @constructor
 */
function AudienceEvaluator(UNSTABLE_conditionEvaluators) {
  this.typeToEvaluatorMap = fns.assign({}, UNSTABLE_conditionEvaluators, {
    custom_attribute: customAttributeConditionEvaluator,
  });
}

/**
 * Determine if the given user attributes satisfy the given audience conditions
 * @param  {Array|String|null|undefined}  audienceConditions    Audience conditions to match the user attributes against - can be an array
 *                                                              of audience IDs, a nested array of conditions, or a single leaf condition.
 *                                                              Examples: ["5", "6"], ["and", ["or", "1", "2"], "3"], "1"
 * @param  {Object}                       audiencesById         Object providing access to full audience objects for audience IDs
 *                                                              contained in audienceConditions. Keys should be audience IDs, values
 *                                                              should be full audience objects with conditions properties
 * @param  {Object}                       [userAttributes]      User attributes which will be used in determining if audience conditions
 *                                                              are met. If not provided, defaults to an empty object
 * @return {Boolean}                                            true if the user attributes match the given audience conditions, false
 *                                                              otherwise
 */
AudienceEvaluator.prototype.evaluate = function(audienceConditions, audiencesById, userAttributes) {
  // if there are no audiences, return true because that means ALL users are included in the experiment
  if (!audienceConditions || audienceConditions.length === 0) {
    return true;
  }

  if (!userAttributes) {
    userAttributes = {};
  }

  var evaluateAudience = function(audienceId) {
    var audience = audiencesById[audienceId];
    if (audience) {
      logger.log(
        LOG_LEVEL.DEBUG,
        sprintf(LOG_MESSAGES.EVALUATING_AUDIENCE, MODULE_NAME, audienceId, JSON.stringify(audience.conditions))
      );
      var result = conditionTreeEvaluator.evaluate(
        audience.conditions,
        this.evaluateConditionWithUserAttributes.bind(this, userAttributes)
      );
      var resultText = result === null ? 'UNKNOWN' : result.toString().toUpperCase();
      logger.log(LOG_LEVEL.INFO, sprintf(LOG_MESSAGES.AUDIENCE_EVALUATION_RESULT, MODULE_NAME, audienceId, resultText));
      return result;
    }

    return null;
  }.bind(this);

  return conditionTreeEvaluator.evaluate(audienceConditions, evaluateAudience) || false;
};

/**
 * Wrapper around evaluator.evaluate that is passed to the conditionTreeEvaluator.
 * Evaluates the condition provided given the user attributes if an evaluator has been defined for the condition type.
 * @param  {Object} userAttributes     A map of user attributes.
 * @param  {Object} condition          A single condition object to evaluate.
 * @return {Boolean|null}              true if the condition is satisfied, null if a matcher is not found.
 */
AudienceEvaluator.prototype.evaluateConditionWithUserAttributes = function(userAttributes, condition) {
  var evaluator = this.typeToEvaluatorMap[condition.type];
  if (!evaluator) {
    logger.log(LOG_LEVEL.WARNING, sprintf(LOG_MESSAGES.UNKNOWN_CONDITION_TYPE, MODULE_NAME, JSON.stringify(condition)));
    return null;
  }
  try {
    return evaluator.evaluate(condition, userAttributes, logger);
  } catch (err) {
    logger.log(
      LOG_LEVEL.ERROR,
      sprintf(ERROR_MESSAGES.CONDITION_EVALUATOR_ERROR, MODULE_NAME, condition.type, err.message)
    );
  }
  return null;
};

module.exports = AudienceEvaluator;


/***/ }),
/* 31 */
/***/ (function(module, exports) {

/****************************************************************************
 * Copyright 2018, Optimizely, Inc. and contributors                        *
 *                                                                          *
 * Licensed under the Apache License, Version 2.0 (the "License");          *
 * you may not use this file except in compliance with the License.         *
 * You may obtain a copy of the License at                                  *
 *                                                                          *
 *    http://www.apache.org/licenses/LICENSE-2.0                            *
 *                                                                          *
 * Unless required by applicable law or agreed to in writing, software      *
 * distributed under the License is distributed on an "AS IS" BASIS,        *
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. *
 * See the License for the specific language governing permissions and      *
 * limitations under the License.                                           *
 ***************************************************************************/

var AND_CONDITION = 'and';
var OR_CONDITION = 'or';
var NOT_CONDITION = 'not';

var DEFAULT_OPERATOR_TYPES = [AND_CONDITION, OR_CONDITION, NOT_CONDITION];

/**
 * Top level method to evaluate conditions
 * @param  {Array|*}    conditions      Nested array of and/or conditions, or a single leaf
 *                                      condition value of any type
 *                                      Example: ['and', '0', ['or', '1', '2']]
 * @param  {Function}   leafEvaluator   Function which will be called to evaluate leaf condition
 *                                      values
 * @return {?Boolean}                   Result of evaluating the conditions using the operator
 *                                      rules and the leaf evaluator. A return value of null
 *                                      indicates that the conditions are invalid or unable to be
 *                                      evaluated
 */
function evaluate(conditions, leafEvaluator) {
  if (Array.isArray(conditions)) {
    var firstOperator = conditions[0];
    var restOfConditions = conditions.slice(1);

    if (DEFAULT_OPERATOR_TYPES.indexOf(firstOperator) === -1) {
      // Operator to apply is not explicit - assume 'or'
      firstOperator = OR_CONDITION;
      restOfConditions = conditions;
    }

    switch (firstOperator) {
      case AND_CONDITION:
        return andEvaluator(restOfConditions, leafEvaluator);
      case NOT_CONDITION:
        return notEvaluator(restOfConditions, leafEvaluator);
      default:
        // firstOperator is OR_CONDITION
        return orEvaluator(restOfConditions, leafEvaluator);
    }
  }

  var leafCondition = conditions;
  return leafEvaluator(leafCondition);
}

/**
 * Evaluates an array of conditions as if the evaluator had been applied
 * to each entry and the results AND-ed together.
 * @param  {Array}      conditions      Array of conditions ex: [operand_1, operand_2]
 * @param  {Function}   leafEvaluator   Function which will be called to evaluate leaf condition values
 * @return {?Boolean}                   Result of evaluating the conditions. A return value of null
 *                                      indicates that the conditions are invalid or unable to be
 *                                      evaluated.
 */
function andEvaluator(conditions, leafEvaluator) {
  var sawNullResult = false;
  for (var i = 0; i < conditions.length; i++) {
    var conditionResult = evaluate(conditions[i], leafEvaluator);
    if (conditionResult === false) {
      return false;
    }
    if (conditionResult === null) {
      sawNullResult = true;
    }
  }
  return sawNullResult ? null : true;
}

/**
 * Evaluates an array of conditions as if the evaluator had been applied
 * to a single entry and NOT was applied to the result.
 * @param  {Array}      conditions      Array of conditions ex: [operand_1]
 * @param  {Function}   leafEvaluator   Function which will be called to evaluate leaf condition values
 * @return {?Boolean}                   Result of evaluating the conditions. A return value of null
 *                                      indicates that the conditions are invalid or unable to be
 *                                      evaluated.
 */
function notEvaluator(conditions, leafEvaluator) {
  if (conditions.length > 0) {
    var result = evaluate(conditions[0], leafEvaluator);
    return result === null ? null : !result;
  }
  return null;
}

/**
 * Evaluates an array of conditions as if the evaluator had been applied
 * to each entry and the results OR-ed together.
 * @param  {Array}      conditions      Array of conditions ex: [operand_1, operand_2]
 * @param  {Function}   leafEvaluator   Function which will be called to evaluate leaf condition values
 * @return {?Boolean}                   Result of evaluating the conditions. A return value of null
 *                                      indicates that the conditions are invalid or unable to be
 *                                      evaluated.
 */
function orEvaluator(conditions, leafEvaluator) {
  var sawNullResult = false;
  for (var i = 0; i < conditions.length; i++) {
    var conditionResult = evaluate(conditions[i], leafEvaluator);
    if (conditionResult === true) {
      return true;
    }
    if (conditionResult === null) {
      sawNullResult = true;
    }
  }
  return sawNullResult ? null : false;
}

module.exports = {
  evaluate: evaluate,
};


/***/ }),
/* 32 */
/***/ (function(module, exports, __webpack_require__) {

/****************************************************************************
 * Copyright 2018-2019, Optimizely, Inc. and contributors                        *
 *                                                                          *
 * Licensed under the Apache License, Version 2.0 (the "License");          *
 * you may not use this file except in compliance with the License.         *
 * You may obtain a copy of the License at                                  *
 *                                                                          *
 *    http://www.apache.org/licenses/LICENSE-2.0                            *
 *                                                                          *
 * Unless required by applicable law or agreed to in writing, software      *
 * distributed under the License is distributed on an "AS IS" BASIS,        *
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. *
 * See the License for the specific language governing permissions and      *
 * limitations under the License.                                           *
 ***************************************************************************/

var fns = __webpack_require__(11);
var enums = __webpack_require__(14);
var sprintf = __webpack_require__(12).sprintf;

var LOG_LEVEL = enums.LOG_LEVEL;
var LOG_MESSAGES = enums.LOG_MESSAGES;
var MODULE_NAME = 'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR';

var EXACT_MATCH_TYPE = 'exact';
var EXISTS_MATCH_TYPE = 'exists';
var GREATER_THAN_MATCH_TYPE = 'gt';
var LESS_THAN_MATCH_TYPE = 'lt';
var SUBSTRING_MATCH_TYPE = 'substring';

var MATCH_TYPES = [
  EXACT_MATCH_TYPE,
  EXISTS_MATCH_TYPE,
  GREATER_THAN_MATCH_TYPE,
  LESS_THAN_MATCH_TYPE,
  SUBSTRING_MATCH_TYPE,
];

var EVALUATORS_BY_MATCH_TYPE = {};
EVALUATORS_BY_MATCH_TYPE[EXACT_MATCH_TYPE] = exactEvaluator;
EVALUATORS_BY_MATCH_TYPE[EXISTS_MATCH_TYPE] = existsEvaluator;
EVALUATORS_BY_MATCH_TYPE[GREATER_THAN_MATCH_TYPE] = greaterThanEvaluator;
EVALUATORS_BY_MATCH_TYPE[LESS_THAN_MATCH_TYPE] = lessThanEvaluator;
EVALUATORS_BY_MATCH_TYPE[SUBSTRING_MATCH_TYPE] = substringEvaluator;

/**
 * Given a custom attribute audience condition and user attributes, evaluate the
 * condition against the attributes.
 * @param  {Object}     condition
 * @param  {Object}     userAttributes
 * @param  {Object}     logger
 * @return {?Boolean}   true/false if the given user attributes match/don't match the given condition,
 *                                      null if the given user attributes and condition can't be evaluated
 * TODO: Change to accept and object with named properties
 */
function evaluate(condition, userAttributes, logger) {
  var conditionMatch = condition.match;
  if (typeof conditionMatch !== 'undefined' && MATCH_TYPES.indexOf(conditionMatch) === -1) {
    logger.log(LOG_LEVEL.WARNING, sprintf(LOG_MESSAGES.UNKNOWN_MATCH_TYPE, MODULE_NAME, JSON.stringify(condition)));
    return null;
  }

  var attributeKey = condition.name;
  if (!userAttributes.hasOwnProperty(attributeKey) && conditionMatch != EXISTS_MATCH_TYPE) {
    logger.log(
      LOG_LEVEL.DEBUG,
      sprintf(LOG_MESSAGES.MISSING_ATTRIBUTE_VALUE, MODULE_NAME, JSON.stringify(condition), attributeKey)
    );
    return null;
  }

  var evaluatorForMatch = EVALUATORS_BY_MATCH_TYPE[conditionMatch] || exactEvaluator;
  return evaluatorForMatch(condition, userAttributes, logger);
}

/**
 * Returns true if the value is valid for exact conditions. Valid values include
 * strings, booleans, and numbers that aren't NaN, -Infinity, or Infinity.
 * @param value
 * @returns {Boolean}
 */
function isValueTypeValidForExactConditions(value) {
  return typeof value === 'string' || typeof value === 'boolean' || fns.isNumber(value);
}

/**
 * Evaluate the given exact match condition for the given user attributes
 * @param   {Object}    condition
 * @param   {Object}    userAttributes
 * @param   {Object}    logger
 * @return  {?Boolean}  true if the user attribute value is equal (===) to the condition value,
 *                      false if the user attribute value is not equal (!==) to the condition value,
 *                      null if the condition value or user attribute value has an invalid type, or
 *                      if there is a mismatch between the user attribute type and the condition value
 *                      type
 */
function exactEvaluator(condition, userAttributes, logger) {
  var conditionValue = condition.value;
  var conditionValueType = typeof conditionValue;
  var conditionName = condition.name;
  var userValue = userAttributes[conditionName];
  var userValueType = typeof userValue;

  if (
    !isValueTypeValidForExactConditions(conditionValue) ||
    (fns.isNumber(conditionValue) && !fns.isSafeInteger(conditionValue))
  ) {
    logger.log(
      LOG_LEVEL.WARNING,
      sprintf(LOG_MESSAGES.UNEXPECTED_CONDITION_VALUE, MODULE_NAME, JSON.stringify(condition))
    );
    return null;
  }

  if (userValue === null) {
    logger.log(
      LOG_LEVEL.DEBUG,
      sprintf(LOG_MESSAGES.UNEXPECTED_TYPE_NULL, MODULE_NAME, JSON.stringify(condition), conditionName)
    );
    return null;
  }

  if (!isValueTypeValidForExactConditions(userValue) || conditionValueType !== userValueType) {
    logger.log(
      LOG_LEVEL.WARNING,
      sprintf(LOG_MESSAGES.UNEXPECTED_TYPE, MODULE_NAME, JSON.stringify(condition), userValueType, conditionName)
    );
    return null;
  }

  if (fns.isNumber(userValue) && !fns.isSafeInteger(userValue)) {
    logger.log(
      LOG_LEVEL.WARNING,
      sprintf(LOG_MESSAGES.OUT_OF_BOUNDS, MODULE_NAME, JSON.stringify(condition), conditionName)
    );
    return null;
  }

  return conditionValue === userValue;
}

/**
 * Evaluate the given exists match condition for the given user attributes
 * @param   {Object}  condition
 * @param   {Object}  userAttributes
 * @returns {Boolean} true if both:
 *                      1) the user attributes have a value for the given condition, and
 *                      2) the user attribute value is neither null nor undefined
 *                    Returns false otherwise
 */
function existsEvaluator(condition, userAttributes) {
  var userValue = userAttributes[condition.name];
  return typeof userValue !== 'undefined' && userValue !== null;
}

/**
 * Evaluate the given greater than match condition for the given user attributes
 * @param   {Object}    condition
 * @param   {Object}    userAttributes
 * @param   {Object}    logger
 * @returns {?Boolean}  true if the user attribute value is greater than the condition value,
 *                      false if the user attribute value is less than or equal to the condition value,
 *                      null if the condition value isn't a number or the user attribute value
 *                      isn't a number
 */
function greaterThanEvaluator(condition, userAttributes, logger) {
  var conditionName = condition.name;
  var userValue = userAttributes[conditionName];
  var userValueType = typeof userValue;
  var conditionValue = condition.value;

  if (!fns.isSafeInteger(conditionValue)) {
    logger.log(
      LOG_LEVEL.WARNING,
      sprintf(LOG_MESSAGES.UNEXPECTED_CONDITION_VALUE, MODULE_NAME, JSON.stringify(condition))
    );
    return null;
  }

  if (userValue === null) {
    logger.log(
      LOG_LEVEL.DEBUG,
      sprintf(LOG_MESSAGES.UNEXPECTED_TYPE_NULL, MODULE_NAME, JSON.stringify(condition), conditionName)
    );
    return null;
  }

  if (!fns.isNumber(userValue)) {
    logger.log(
      LOG_LEVEL.WARNING,
      sprintf(LOG_MESSAGES.UNEXPECTED_TYPE, MODULE_NAME, JSON.stringify(condition), userValueType, conditionName)
    );
    return null;
  }

  if (!fns.isSafeInteger(userValue)) {
    logger.log(
      LOG_LEVEL.WARNING,
      sprintf(LOG_MESSAGES.OUT_OF_BOUNDS, MODULE_NAME, JSON.stringify(condition), conditionName)
    );
    return null;
  }

  return userValue > conditionValue;
}

/**
 * Evaluate the given less than match condition for the given user attributes
 * @param   {Object}    condition
 * @param   {Object}    userAttributes
 * @param   {Object}    logger
 * @returns {?Boolean}  true if the user attribute value is less than the condition value,
 *                      false if the user attribute value is greater than or equal to the condition value,
 *                      null if the condition value isn't a number or the user attribute value isn't a
 *                      number
 */
function lessThanEvaluator(condition, userAttributes, logger) {
  var conditionName = condition.name;
  var userValue = userAttributes[condition.name];
  var userValueType = typeof userValue;
  var conditionValue = condition.value;

  if (!fns.isSafeInteger(conditionValue)) {
    logger.log(
      LOG_LEVEL.WARNING,
      sprintf(LOG_MESSAGES.UNEXPECTED_CONDITION_VALUE, MODULE_NAME, JSON.stringify(condition))
    );
    return null;
  }

  if (userValue === null) {
    logger.log(
      LOG_LEVEL.DEBUG,
      sprintf(LOG_MESSAGES.UNEXPECTED_TYPE_NULL, MODULE_NAME, JSON.stringify(condition), conditionName)
    );
    return null;
  }

  if (!fns.isNumber(userValue)) {
    logger.log(
      LOG_LEVEL.WARNING,
      sprintf(LOG_MESSAGES.UNEXPECTED_TYPE, MODULE_NAME, JSON.stringify(condition), userValueType, conditionName)
    );
    return null;
  }

  if (!fns.isSafeInteger(userValue)) {
    logger.log(
      LOG_LEVEL.WARNING,
      sprintf(LOG_MESSAGES.OUT_OF_BOUNDS, MODULE_NAME, JSON.stringify(condition), conditionName)
    );
    return null;
  }

  return userValue < conditionValue;
}

/**
 * Evaluate the given substring match condition for the given user attributes
 * @param   {Object}    condition
 * @param   {Object}    userAttributes
 * @param   {Object}    logger
 * @returns {?Boolean}  true if the condition value is a substring of the user attribute value,
 *                      false if the condition value is not a substring of the user attribute value,
 *                      null if the condition value isn't a string or the user attribute value
 *                      isn't a string
 */
function substringEvaluator(condition, userAttributes, logger) {
  var conditionName = condition.name;
  var userValue = userAttributes[condition.name];
  var userValueType = typeof userValue;
  var conditionValue = condition.value;

  if (typeof conditionValue !== 'string') {
    logger.log(
      LOG_LEVEL.WARNING,
      sprintf(LOG_MESSAGES.UNEXPECTED_CONDITION_VALUE, MODULE_NAME, JSON.stringify(condition))
    );
    return null;
  }

  if (userValue === null) {
    logger.log(
      LOG_LEVEL.DEBUG,
      sprintf(LOG_MESSAGES.UNEXPECTED_TYPE_NULL, MODULE_NAME, JSON.stringify(condition), conditionName)
    );
    return null;
  }

  if (typeof userValue !== 'string') {
    logger.log(
      LOG_LEVEL.WARNING,
      sprintf(LOG_MESSAGES.UNEXPECTED_TYPE, MODULE_NAME, JSON.stringify(condition), userValueType, conditionName)
    );
    return null;
  }

  return userValue.indexOf(conditionValue) !== -1;
}

module.exports = {
  evaluate: evaluate,
};


/***/ }),
/* 33 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * Copyright 2016, 2019 Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Bucketer API for determining the variation id from the specified parameters
 */
var enums = __webpack_require__(14);
var murmurhash = __webpack_require__(34);
var sprintf = __webpack_require__(12).sprintf;

var ERROR_MESSAGES = enums.ERROR_MESSAGES;
var HASH_SEED = 1;
var LOG_LEVEL = enums.LOG_LEVEL;
var LOG_MESSAGES = enums.LOG_MESSAGES;
var MAX_HASH_VALUE = Math.pow(2, 32);
var MAX_TRAFFIC_VALUE = 10000;
var MODULE_NAME = 'BUCKETER';
var RANDOM_POLICY = 'random';

module.exports = {
  /**
   * Determines ID of variation to be shown for the given input params
   * @param  {Object}         bucketerParams
   * @param  {string}         bucketerParams.experimentId
   * @param  {string}         bucketerParams.experimentKey
   * @param  {string}         bucketerParams.userId
   * @param  {Object[]}       bucketerParams.trafficAllocationConfig
   * @param  {Array}          bucketerParams.experimentKeyMap
   * @param  {Object}         bucketerParams.groupIdMap
   * @param  {Object}         bucketerParams.variationIdMap
   * @param  {string}         bucketerParams.varationIdMap[].key
   * @param  {Object}         bucketerParams.logger
   * @param  {string}         bucketerParams.bucketingId
   * @return Variation ID that user has been bucketed into, null if user is not bucketed into any experiment
   */
  bucket: function(bucketerParams) {
    // Check if user is in a random group; if so, check if user is bucketed into a specific experiment
    var experiment = bucketerParams.experimentKeyMap[bucketerParams.experimentKey];
    var groupId = experiment['groupId'];
    if (groupId) {
      var group = bucketerParams.groupIdMap[groupId];
      if (!group) {
        throw new Error(sprintf(ERROR_MESSAGES.INVALID_GROUP_ID, MODULE_NAME, groupId));
      }
      if (group.policy === RANDOM_POLICY) {
        var bucketedExperimentId = module.exports.bucketUserIntoExperiment(
          group,
          bucketerParams.bucketingId,
          bucketerParams.userId,
          bucketerParams.logger
        );

        // Return if user is not bucketed into any experiment
        if (bucketedExperimentId === null) {
          var notbucketedInAnyExperimentLogMessage = sprintf(
            LOG_MESSAGES.USER_NOT_IN_ANY_EXPERIMENT,
            MODULE_NAME,
            bucketerParams.userId,
            groupId
          );
          bucketerParams.logger.log(LOG_LEVEL.INFO, notbucketedInAnyExperimentLogMessage);
          return null;
        }

        // Return if user is bucketed into a different experiment than the one specified
        if (bucketedExperimentId !== bucketerParams.experimentId) {
          var notBucketedIntoExperimentOfGroupLogMessage = sprintf(
            LOG_MESSAGES.USER_NOT_BUCKETED_INTO_EXPERIMENT_IN_GROUP,
            MODULE_NAME,
            bucketerParams.userId,
            bucketerParams.experimentKey,
            groupId
          );
          bucketerParams.logger.log(LOG_LEVEL.INFO, notBucketedIntoExperimentOfGroupLogMessage);
          return null;
        }

        // Continue bucketing if user is bucketed into specified experiment
        var bucketedIntoExperimentOfGroupLogMessage = sprintf(
          LOG_MESSAGES.USER_BUCKETED_INTO_EXPERIMENT_IN_GROUP,
          MODULE_NAME,
          bucketerParams.userId,
          bucketerParams.experimentKey,
          groupId
        );
        bucketerParams.logger.log(LOG_LEVEL.INFO, bucketedIntoExperimentOfGroupLogMessage);
      }
    }
    var bucketingId = sprintf('%s%s', bucketerParams.bucketingId, bucketerParams.experimentId);
    var bucketValue = module.exports._generateBucketValue(bucketingId);

    var bucketedUserLogMessage = sprintf(
      LOG_MESSAGES.USER_ASSIGNED_TO_VARIATION_BUCKET,
      MODULE_NAME,
      bucketValue,
      bucketerParams.userId
    );
    bucketerParams.logger.log(LOG_LEVEL.DEBUG, bucketedUserLogMessage);

    var entityId = module.exports._findBucket(bucketValue, bucketerParams.trafficAllocationConfig);
    if (!entityId) {
      var userHasNoVariationLogMessage = sprintf(
        LOG_MESSAGES.USER_HAS_NO_VARIATION,
        MODULE_NAME,
        bucketerParams.userId,
        bucketerParams.experimentKey
      );
      bucketerParams.logger.log(LOG_LEVEL.DEBUG, userHasNoVariationLogMessage);
    } else if (!bucketerParams.variationIdMap.hasOwnProperty(entityId)) {
      var invalidVariationIdLogMessage = sprintf(LOG_MESSAGES.INVALID_VARIATION_ID, MODULE_NAME);
      bucketerParams.logger.log(LOG_LEVEL.WARNING, invalidVariationIdLogMessage);
      return null;
    } else {
      var variationKey = bucketerParams.variationIdMap[entityId].key;
      var userInVariationLogMessage = sprintf(
        LOG_MESSAGES.USER_HAS_VARIATION,
        MODULE_NAME,
        bucketerParams.userId,
        variationKey,
        bucketerParams.experimentKey
      );
      bucketerParams.logger.log(LOG_LEVEL.INFO, userInVariationLogMessage);
    }

    return entityId;
  },

  /**
   * Returns bucketed experiment ID to compare against experiment user is being called into
   * @param {Object} group        Group that experiment is in
   * @param {string} bucketingId  Bucketing ID
   * @param {string} userId       ID of user to be bucketed into experiment
   * @param {Object} logger       Logger implementation
   * @return {string} ID of experiment if user is bucketed into experiment within the group, null otherwise
   */
  bucketUserIntoExperiment: function(group, bucketingId, userId, logger) {
    var bucketingKey = sprintf('%s%s', bucketingId, group.id);
    var bucketValue = module.exports._generateBucketValue(bucketingKey);
    logger.log(
      LOG_LEVEL.DEBUG,
      sprintf(LOG_MESSAGES.USER_ASSIGNED_TO_EXPERIMENT_BUCKET, MODULE_NAME, bucketValue, userId)
    );
    var trafficAllocationConfig = group.trafficAllocation;
    var bucketedExperimentId = module.exports._findBucket(bucketValue, trafficAllocationConfig);
    return bucketedExperimentId;
  },

  /**
   * Returns entity ID associated with bucket value
   * @param  {string}   bucketValue
   * @param  {Object[]} trafficAllocationConfig
   * @param  {number}   trafficAllocationConfig[].endOfRange
   * @param  {number}   trafficAllocationConfig[].entityId
   * @return {string}   Entity ID for bucketing if bucket value is within traffic allocation boundaries, null otherwise
   */
  _findBucket: function(bucketValue, trafficAllocationConfig) {
    for (var i = 0; i < trafficAllocationConfig.length; i++) {
      if (bucketValue < trafficAllocationConfig[i].endOfRange) {
        return trafficAllocationConfig[i].entityId;
      }
    }
    return null;
  },

  /**
   * Helper function to generate bucket value in half-closed interval [0, MAX_TRAFFIC_VALUE)
   * @param  {string} bucketingKey String value for bucketing
   * @return {string} the generated bucket value
   * @throws If bucketing value is not a valid string
   */
  _generateBucketValue: function(bucketingKey) {
    try {
      // NOTE: the mmh library already does cast the hash value as an unsigned 32bit int
      // https://github.com/perezd/node-murmurhash/blob/master/murmurhash.js#L115
      var hashValue = murmurhash.v3(bucketingKey, HASH_SEED);
      var ratio = hashValue / MAX_HASH_VALUE;
      return parseInt(ratio * MAX_TRAFFIC_VALUE, 10);
    } catch (ex) {
      throw new Error(sprintf(ERROR_MESSAGES.INVALID_BUCKETING_ID, MODULE_NAME, bucketingKey, ex.message));
    }
  },
};


/***/ }),
/* 34 */
/***/ (function(module, exports, __webpack_require__) {

(function(){
  var _global = this;

  /**
   * JS Implementation of MurmurHash2
   *
   * @author <a href="mailto:gary.court@gmail.com">Gary Court</a>
   * @see http://github.com/garycourt/murmurhash-js
   * @author <a href="mailto:aappleby@gmail.com">Austin Appleby</a>
   * @see http://sites.google.com/site/murmurhash/
   *
   * @param {string} str ASCII only
   * @param {number} seed Positive integer only
   * @return {number} 32-bit positive integer hash
   */
  function MurmurHashV2(str, seed) {
    var
      l = str.length,
      h = seed ^ l,
      i = 0,
      k;

    while (l >= 4) {
      k =
        ((str.charCodeAt(i) & 0xff)) |
        ((str.charCodeAt(++i) & 0xff) << 8) |
        ((str.charCodeAt(++i) & 0xff) << 16) |
        ((str.charCodeAt(++i) & 0xff) << 24);

      k = (((k & 0xffff) * 0x5bd1e995) + ((((k >>> 16) * 0x5bd1e995) & 0xffff) << 16));
      k ^= k >>> 24;
      k = (((k & 0xffff) * 0x5bd1e995) + ((((k >>> 16) * 0x5bd1e995) & 0xffff) << 16));

    h = (((h & 0xffff) * 0x5bd1e995) + ((((h >>> 16) * 0x5bd1e995) & 0xffff) << 16)) ^ k;

      l -= 4;
      ++i;
    }

    switch (l) {
    case 3: h ^= (str.charCodeAt(i + 2) & 0xff) << 16;
    case 2: h ^= (str.charCodeAt(i + 1) & 0xff) << 8;
    case 1: h ^= (str.charCodeAt(i) & 0xff);
            h = (((h & 0xffff) * 0x5bd1e995) + ((((h >>> 16) * 0x5bd1e995) & 0xffff) << 16));
    }

    h ^= h >>> 13;
    h = (((h & 0xffff) * 0x5bd1e995) + ((((h >>> 16) * 0x5bd1e995) & 0xffff) << 16));
    h ^= h >>> 15;

    return h >>> 0;
  };

  /**
   * JS Implementation of MurmurHash3 (r136) (as of May 20, 2011)
   *
   * @author <a href="mailto:gary.court@gmail.com">Gary Court</a>
   * @see http://github.com/garycourt/murmurhash-js
   * @author <a href="mailto:aappleby@gmail.com">Austin Appleby</a>
   * @see http://sites.google.com/site/murmurhash/
   *
   * @param {string} key ASCII only
   * @param {number} seed Positive integer only
   * @return {number} 32-bit positive integer hash
   */
  function MurmurHashV3(key, seed) {
    var remainder, bytes, h1, h1b, c1, c1b, c2, c2b, k1, i;

    remainder = key.length & 3; // key.length % 4
    bytes = key.length - remainder;
    h1 = seed;
    c1 = 0xcc9e2d51;
    c2 = 0x1b873593;
    i = 0;

    while (i < bytes) {
        k1 =
          ((key.charCodeAt(i) & 0xff)) |
          ((key.charCodeAt(++i) & 0xff) << 8) |
          ((key.charCodeAt(++i) & 0xff) << 16) |
          ((key.charCodeAt(++i) & 0xff) << 24);
      ++i;

      k1 = ((((k1 & 0xffff) * c1) + ((((k1 >>> 16) * c1) & 0xffff) << 16))) & 0xffffffff;
      k1 = (k1 << 15) | (k1 >>> 17);
      k1 = ((((k1 & 0xffff) * c2) + ((((k1 >>> 16) * c2) & 0xffff) << 16))) & 0xffffffff;

      h1 ^= k1;
          h1 = (h1 << 13) | (h1 >>> 19);
      h1b = ((((h1 & 0xffff) * 5) + ((((h1 >>> 16) * 5) & 0xffff) << 16))) & 0xffffffff;
      h1 = (((h1b & 0xffff) + 0x6b64) + ((((h1b >>> 16) + 0xe654) & 0xffff) << 16));
    }

    k1 = 0;

    switch (remainder) {
      case 3: k1 ^= (key.charCodeAt(i + 2) & 0xff) << 16;
      case 2: k1 ^= (key.charCodeAt(i + 1) & 0xff) << 8;
      case 1: k1 ^= (key.charCodeAt(i) & 0xff);

      k1 = (((k1 & 0xffff) * c1) + ((((k1 >>> 16) * c1) & 0xffff) << 16)) & 0xffffffff;
      k1 = (k1 << 15) | (k1 >>> 17);
      k1 = (((k1 & 0xffff) * c2) + ((((k1 >>> 16) * c2) & 0xffff) << 16)) & 0xffffffff;
      h1 ^= k1;
    }

    h1 ^= key.length;

    h1 ^= h1 >>> 16;
    h1 = (((h1 & 0xffff) * 0x85ebca6b) + ((((h1 >>> 16) * 0x85ebca6b) & 0xffff) << 16)) & 0xffffffff;
    h1 ^= h1 >>> 13;
    h1 = ((((h1 & 0xffff) * 0xc2b2ae35) + ((((h1 >>> 16) * 0xc2b2ae35) & 0xffff) << 16))) & 0xffffffff;
    h1 ^= h1 >>> 16;

    return h1 >>> 0;
  }

  var murmur = MurmurHashV3;
  murmur.v2 = MurmurHashV2;
  murmur.v3 = MurmurHashV3;

  if (true) {
    module.exports = murmur;
  } else { var _previousRoot; }
}());


/***/ }),
/* 35 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * Copyright 2016-2019, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var fns = __webpack_require__(11);
var enums = __webpack_require__(14);
var jsSdkUtils = __webpack_require__(12);
var configValidator = __webpack_require__(13);
var projectConfigSchema = __webpack_require__(36);

var EXPERIMENT_RUNNING_STATUS = 'Running';
var RESERVED_ATTRIBUTE_PREFIX = '$opt_';
var MODULE_NAME = 'PROJECT_CONFIG';

var ERROR_MESSAGES = enums.ERROR_MESSAGES;
var LOG_MESSAGES = enums.LOG_MESSAGES;
var LOG_LEVEL = enums.LOG_LEVEL;
var FEATURE_VARIABLE_TYPES = enums.FEATURE_VARIABLE_TYPES;

module.exports = {
  /**
   * Creates projectConfig object to be used for quick project property lookup
   * @param  {Object} datafile JSON datafile representing the project
   * @return {Object} Object representing project configuration
   */
  createProjectConfig: function(datafile) {
    var projectConfig = fns.assign({}, datafile);

    /*
     * Conditions of audiences in projectConfig.typedAudiences are not
     * expected to be string-encoded as they are here in projectConfig.audiences.
     */
    (projectConfig.audiences || []).forEach(function(audience) {
      audience.conditions = JSON.parse(audience.conditions);
    });
    projectConfig.audiencesById = fns.keyBy(projectConfig.audiences, 'id');
    fns.assign(projectConfig.audiencesById, fns.keyBy(projectConfig.typedAudiences, 'id'));

    projectConfig.attributeKeyMap = fns.keyBy(projectConfig.attributes, 'key');
    projectConfig.eventKeyMap = fns.keyBy(projectConfig.events, 'key');
    projectConfig.groupIdMap = fns.keyBy(projectConfig.groups, 'id');

    var experiments;
    Object.keys(projectConfig.groupIdMap || {}).forEach(function(Id) {
      experiments = projectConfig.groupIdMap[Id].experiments;
      (experiments || []).forEach(function(experiment) {
        projectConfig.experiments.push(fns.assign(experiment, { groupId: Id }));
      });
    });

    projectConfig.rolloutIdMap = fns.keyBy(projectConfig.rollouts || [], 'id');
    jsSdkUtils.objectValues(projectConfig.rolloutIdMap || {}).forEach(function (rollout) {
      (rollout.experiments || []).forEach(function(experiment) {
        projectConfig.experiments.push(experiment);
        // Creates { <variationKey>: <variation> } map inside of the experiment
        experiment.variationKeyMap = fns.keyBy(experiment.variations, 'key');
      });
    });

    projectConfig.experimentKeyMap = fns.keyBy(projectConfig.experiments, 'key');
    projectConfig.experimentIdMap = fns.keyBy(projectConfig.experiments, 'id');

    projectConfig.variationIdMap = {};
    projectConfig.variationVariableUsageMap = {};
    (projectConfig.experiments || []).forEach(function(experiment) {
      // Creates { <variationKey>: <variation> } map inside of the experiment
      experiment.variationKeyMap = fns.keyBy(experiment.variations, 'key');

      // Creates { <variationId>: { key: <variationKey>, id: <variationId> } } mapping for quick lookup
      fns.assign(projectConfig.variationIdMap, fns.keyBy(experiment.variations, 'id'));
      jsSdkUtils.objectValues(experiment.variationKeyMap || {}).forEach(function(variation) {
        if (variation.variables) {
          projectConfig.variationVariableUsageMap[variation.id] = fns.keyBy(variation.variables, 'id');
        }
      });
    });

    // Object containing experiment Ids that exist in any feature
    // for checking that experiment is a feature experiment or not.
    projectConfig.experimentFeatureMap = {};

    projectConfig.featureKeyMap = fns.keyBy(projectConfig.featureFlags || [], 'key');
    jsSdkUtils.objectValues(projectConfig.featureKeyMap || {}).forEach(function(feature) {
      feature.variableKeyMap = fns.keyBy(feature.variables, 'key');
      (feature.experimentIds || []).forEach(function(experimentId) {
        // Add this experiment in experiment-feature map.
        if (projectConfig.experimentFeatureMap[experimentId]) {
          projectConfig.experimentFeatureMap[experimentId].push(feature.id);
        } else {
          projectConfig.experimentFeatureMap[experimentId] = [feature.id];
        }

        var experimentInFeature = projectConfig.experimentIdMap[experimentId];
        // Experiments in feature can only belong to one mutex group.
        if (experimentInFeature.groupId && !feature.groupId) {
          feature.groupId = experimentInFeature.groupId;
        }
      });
    });

    return projectConfig;
  },

  /**
   * Get experiment ID for the provided experiment key
   * @param  {Object} projectConfig Object representing project configuration
   * @param  {string} experimentKey Experiment key for which ID is to be determined
   * @return {string} Experiment ID corresponding to the provided experiment key
   * @throws If experiment key is not in datafile
   */
  getExperimentId: function(projectConfig, experimentKey) {
    var experiment = projectConfig.experimentKeyMap[experimentKey];
    if (!experiment) {
      throw new Error(jsSdkUtils.sprintf(ERROR_MESSAGES.INVALID_EXPERIMENT_KEY, MODULE_NAME, experimentKey));
    }
    return experiment.id;
  },

  /**
   * Get layer ID for the provided experiment key
   * @param  {Object} projectConfig Object representing project configuration
   * @param  {string} experimentId Experiment ID for which layer ID is to be determined
   * @return {string} Layer ID corresponding to the provided experiment key
   * @throws If experiment key is not in datafile
   */
  getLayerId: function(projectConfig, experimentId) {
    var experiment = projectConfig.experimentIdMap[experimentId];
    if (!experiment) {
      throw new Error(jsSdkUtils.sprintf(ERROR_MESSAGES.INVALID_EXPERIMENT_ID, MODULE_NAME, experimentId));
    }
    return experiment.layerId;
  },

  /**
   * Get attribute ID for the provided attribute key
   * @param  {Object}      projectConfig Object representing project configuration
   * @param  {string}      attributeKey  Attribute key for which ID is to be determined
   * @param  {Object}      logger
   * @return {string|null} Attribute ID corresponding to the provided attribute key. Attribute key if it is a reserved attribute.
   */
  getAttributeId: function(projectConfig, attributeKey, logger) {
    var attribute = projectConfig.attributeKeyMap[attributeKey];
    var hasReservedPrefix = attributeKey.indexOf(RESERVED_ATTRIBUTE_PREFIX) === 0;
    if (attribute) {
      if (hasReservedPrefix) {
        logger.log(
          LOG_LEVEL.WARN,
          jsSdkUtils.sprintf(
            'Attribute %s unexpectedly has reserved prefix %s; using attribute ID instead of reserved attribute name.',
            attributeKey,
            RESERVED_ATTRIBUTE_PREFIX
          )
        );
      }
      return attribute.id;
    } else if (hasReservedPrefix) {
      return attributeKey;
    }

    logger.log(LOG_LEVEL.DEBUG, jsSdkUtils.sprintf(ERROR_MESSAGES.UNRECOGNIZED_ATTRIBUTE, MODULE_NAME, attributeKey));
    return null;
  },

  /**
   * Get event ID for the provided
   * @param  {Object}      projectConfig Object representing project configuration
   * @param  {string}      eventKey      Event key for which ID is to be determined
   * @return {string|null} Event ID corresponding to the provided event key
   */
  getEventId: function(projectConfig, eventKey) {
    var event = projectConfig.eventKeyMap[eventKey];
    if (event) {
      return event.id;
    }
    return null;
  },

  /**
   * Get experiment status for the provided experiment key
   * @param  {Object} projectConfig Object representing project configuration
   * @param  {string} experimentKey Experiment key for which status is to be determined
   * @return {string} Experiment status corresponding to the provided experiment key
   * @throws If experiment key is not in datafile
   */
  getExperimentStatus: function(projectConfig, experimentKey) {
    var experiment = projectConfig.experimentKeyMap[experimentKey];
    if (!experiment) {
      throw new Error(jsSdkUtils.sprintf(ERROR_MESSAGES.INVALID_EXPERIMENT_KEY, MODULE_NAME, experimentKey));
    }
    return experiment.status;
  },

  /**
   * Returns whether experiment has a status of 'Running'
   * @param  {Object}  projectConfig Object representing project configuration
   * @param  {string}  experimentKey Experiment key for which status is to be compared with 'Running'
   * @return {Boolean}               true if experiment status is set to 'Running', false otherwise
   */
  isActive: function(projectConfig, experimentKey) {
    return module.exports.getExperimentStatus(projectConfig, experimentKey) === EXPERIMENT_RUNNING_STATUS;
  },

  /**
   * Determine for given experiment if event is running, which determines whether should be dispatched or not
   */
  isRunning: function(projectConfig, experimentKey) {
    return module.exports.getExperimentStatus(projectConfig, experimentKey) === EXPERIMENT_RUNNING_STATUS;
  },

  /**
   * Get audience conditions for the experiment
   * @param  {Object}         projectConfig Object representing project configuration
   * @param  {string}         experimentKey Experiment key for which audience conditions are to be determined
   * @return {Array}          Audience conditions for the experiment - can be an array of audience IDs, or a
   *                          nested array of conditions
   *                          Examples: ["5", "6"], ["and", ["or", "1", "2"], "3"]
   * @throws If experiment key is not in datafile
   */
  getExperimentAudienceConditions: function(projectConfig, experimentKey) {
    var experiment = projectConfig.experimentKeyMap[experimentKey];
    if (!experiment) {
      throw new Error(jsSdkUtils.sprintf(ERROR_MESSAGES.INVALID_EXPERIMENT_KEY, MODULE_NAME, experimentKey));
    }

    return experiment.audienceConditions || experiment.audienceIds;
  },

  /**
   * Get variation key given experiment key and variation ID
   * @param  {Object} projectConfig Object representing project configuration
   * @param  {string} variationId   ID of the variation
   * @return {string} Variation key or null if the variation ID is not found
   */
  getVariationKeyFromId: function(projectConfig, variationId) {
    if (projectConfig.variationIdMap.hasOwnProperty(variationId)) {
      return projectConfig.variationIdMap[variationId].key;
    }
    return null;
  },

  /**
   * Get the variation ID given the experiment key and variation key
   * @param  {Object} projectConfig Object representing project configuration
   * @param  {string} experimentKey Key of the experiment the variation belongs to
   * @param  {string} variationKey  The variation key
   * @return {string} the variation ID
   */
  getVariationIdFromExperimentAndVariationKey: function(projectConfig, experimentKey, variationKey) {
    var experiment = projectConfig.experimentKeyMap[experimentKey];
    if (experiment.variationKeyMap.hasOwnProperty(variationKey)) {
      return experiment.variationKeyMap[variationKey].id;
    }
    return null;
  },

  /**
   * Get experiment from provided experiment key
   * @param  {Object} projectConfig  Object representing project configuration
   * @param  {string} experimentKey  Event key for which experiment IDs are to be retrieved
   * @return {Object} experiment
   * @throws If experiment key is not in datafile
   */
  getExperimentFromKey: function(projectConfig, experimentKey) {
    if (projectConfig.experimentKeyMap.hasOwnProperty(experimentKey)) {
      var experiment = projectConfig.experimentKeyMap[experimentKey];
      if (experiment) {
        return experiment;
      }
    }

    throw new Error(jsSdkUtils.sprintf(ERROR_MESSAGES.EXPERIMENT_KEY_NOT_IN_DATAFILE, MODULE_NAME, experimentKey));
  },

  /**
   * Given an experiment key, returns the traffic allocation within that experiment
   * @param  {Object} projectConfig Object representing project configuration
   * @param  {string} experimentKey Key representing the experiment
   * @return {Array<Object>}        Traffic allocation for the experiment
   * @throws If experiment key is not in datafile
   */
  getTrafficAllocation: function(projectConfig, experimentKey) {
    var experiment = projectConfig.experimentKeyMap[experimentKey];
    if (!experiment) {
      throw new Error(jsSdkUtils.sprintf(ERROR_MESSAGES.INVALID_EXPERIMENT_KEY, MODULE_NAME, experimentKey));
    }
    return experiment.trafficAllocation;
  },

  /**
   * Get experiment from provided experiment id. Log an error if no experiment
   * exists in the project config with the given ID.
   * @param  {Object} projectConfig  Object representing project configuration
   * @param  {string} experimentId  ID of desired experiment object
   * @return {Object} Experiment object
   */
  getExperimentFromId: function(projectConfig, experimentId, logger) {
    if (projectConfig.experimentIdMap.hasOwnProperty(experimentId)) {
      var experiment = projectConfig.experimentIdMap[experimentId];
      if (experiment) {
        return experiment;
      }
    }

    logger.log(LOG_LEVEL.ERROR, jsSdkUtils.sprintf(ERROR_MESSAGES.INVALID_EXPERIMENT_ID, MODULE_NAME, experimentId));
    return null;
  },

  /**
   * Get feature from provided feature key. Log an error if no feature exists in
   * the project config with the given key.
   * @param {Object} projectConfig
   * @param {string} featureKey
   * @param {Object} logger
   * @return {Object|null} Feature object, or null if no feature with the given
   * key exists
   */
  getFeatureFromKey: function(projectConfig, featureKey, logger) {
    if (projectConfig.featureKeyMap.hasOwnProperty(featureKey)) {
      var feature = projectConfig.featureKeyMap[featureKey];
      if (feature) {
        return feature;
      }
    }

    logger.log(LOG_LEVEL.ERROR, jsSdkUtils.sprintf(ERROR_MESSAGES.FEATURE_NOT_IN_DATAFILE, MODULE_NAME, featureKey));
    return null;
  },

  /**
   * Get the variable with the given key associated with the feature with the
   * given key. If the feature key or the variable key are invalid, log an error
   * message.
   * @param {Object} projectConfig
   * @param {string} featureKey
   * @param {string} variableKey
   * @param {Object} logger
   * @return {Object|null} Variable object, or null one or both of the given
   * feature and variable keys are invalid
   */
  getVariableForFeature: function(projectConfig, featureKey, variableKey, logger) {
    var feature = projectConfig.featureKeyMap[featureKey];
    if (!feature) {
      logger.log(LOG_LEVEL.ERROR, jsSdkUtils.sprintf(ERROR_MESSAGES.FEATURE_NOT_IN_DATAFILE, MODULE_NAME, featureKey));
      return null;
    }

    var variable = feature.variableKeyMap[variableKey];
    if (!variable) {
      logger.log(
        LOG_LEVEL.ERROR,
        jsSdkUtils.sprintf(ERROR_MESSAGES.VARIABLE_KEY_NOT_IN_DATAFILE, MODULE_NAME, variableKey, featureKey)
      );
      return null;
    }

    return variable;
  },

  /**
   * Get the value of the given variable for the given variation. If the given
   * variable has no value for the given variation, return null. Log an error message if the variation is invalid. If the
   * variable or variation are invalid, return null.
   * @param {Object} projectConfig
   * @param {Object} variable
   * @param {Object} variation
   * @param {Object} logger
   * @return {string|null} The value of the given variable for the given
   * variation, or null if the given variable has no value
   * for the given variation or if the variation or variable are invalid
   */
  getVariableValueForVariation: function(projectConfig, variable, variation, logger) {
    if (!variable || !variation) {
      return null;
    }

    if (!projectConfig.variationVariableUsageMap.hasOwnProperty(variation.id)) {
      logger.log(
        LOG_LEVEL.ERROR,
        jsSdkUtils.sprintf(ERROR_MESSAGES.VARIATION_ID_NOT_IN_DATAFILE_NO_EXPERIMENT, MODULE_NAME, variation.id)
      );
      return null;
    }

    var variableUsages = projectConfig.variationVariableUsageMap[variation.id];
    var variableUsage = variableUsages[variable.id];

    return variableUsage ? variableUsage.value : null;
  },

  /**
   * Given a variable value in string form, try to cast it to the argument type.
   * If the type cast succeeds, return the type casted value, otherwise log an
   * error and return null.
   * @param {string} variableValue  Variable value in string form
   * @param {string} variableType   Type of the variable whose value was passed
   *                                in the first argument. Must be one of
   *                                FEATURE_VARIABLE_TYPES in
   *                                lib/utils/enums/index.js. The return value's
   *                                type is determined by this argument (boolean
   *                                for BOOLEAN, number for INTEGER or DOUBLE,
   *                                and string for STRING).
   * @param {Object} logger         Logger instance
   * @returns {*}                   Variable value of the appropriate type, or
   *                                null if the type cast failed
   */
  getTypeCastValue: function(variableValue, variableType, logger) {
    var castValue;

    switch (variableType) {
      case FEATURE_VARIABLE_TYPES.BOOLEAN:
        if (variableValue !== 'true' && variableValue !== 'false') {
          logger.log(
            LOG_LEVEL.ERROR,
            jsSdkUtils.sprintf(ERROR_MESSAGES.UNABLE_TO_CAST_VALUE, MODULE_NAME, variableValue, variableType)
          );
          castValue = null;
        } else {
          castValue = variableValue === 'true';
        }
        break;

      case FEATURE_VARIABLE_TYPES.INTEGER:
        castValue = parseInt(variableValue, 10);
        if (isNaN(castValue)) {
          logger.log(
            LOG_LEVEL.ERROR,
            jsSdkUtils.sprintf(ERROR_MESSAGES.UNABLE_TO_CAST_VALUE, MODULE_NAME, variableValue, variableType)
          );
          castValue = null;
        }
        break;

      case FEATURE_VARIABLE_TYPES.DOUBLE:
        castValue = parseFloat(variableValue);
        if (isNaN(castValue)) {
          logger.log(
            LOG_LEVEL.ERROR,
            jsSdkUtils.sprintf(ERROR_MESSAGES.UNABLE_TO_CAST_VALUE, MODULE_NAME, variableValue, variableType)
          );
          castValue = null;
        }
        break;

      default:
        // type is STRING
        castValue = variableValue;
        break;
    }

    return castValue;
  },

  /**
   * Returns an object containing all audiences in the project config. Keys are audience IDs
   * and values are audience objects.
   * @param projectConfig
   * @returns {Object}
   */
  getAudiencesById: function(projectConfig) {
    return projectConfig.audiencesById;
  },

  /**
   * Returns true if an event with the given key exists in the datafile, and false otherwise
   * @param {Object} projectConfig
   * @param {string} eventKey
   * @returns {boolean}
   */
  eventWithKeyExists: function(projectConfig, eventKey) {
    return projectConfig.eventKeyMap.hasOwnProperty(eventKey);
  },

  /**
   *
   * @param {Object} projectConfig
   * @param {string} experimentId
   * @returns {boolean} Returns true if experiment belongs to
   * any feature, false otherwise.
   */
  isFeatureExperiment: function(projectConfig, experimentId) {
    return projectConfig.experimentFeatureMap.hasOwnProperty(experimentId);
  },

  /**
   * Try to create a project config object from the given datafile and
   * configuration properties.
   * If successful, return the project config object, otherwise throws an error
   * @param  {Object} config
   * @param  {Object} config.datafile
   * @param  {Object} config.jsonSchemaValidator
   * @param  {Object} config.logger
   * @param  {Object} config.skipJSONValidation
   * @return {Object} Project config object
   */
  tryCreatingProjectConfig: function(config) {
    configValidator.validateDatafile(config.datafile);
    if (config.skipJSONValidation === true) {
      config.logger.log(LOG_LEVEL.INFO, jsSdkUtils.sprintf(LOG_MESSAGES.SKIPPING_JSON_VALIDATION, MODULE_NAME));
    } else if (config.jsonSchemaValidator) {
      config.jsonSchemaValidator.validate(projectConfigSchema, config.datafile);
      config.logger.log(LOG_LEVEL.INFO, jsSdkUtils.sprintf(LOG_MESSAGES.VALID_DATAFILE, MODULE_NAME));
    }
    return module.exports.createProjectConfig(config.datafile);
  },
};


/***/ }),
/* 36 */
/***/ (function(module, exports) {

/**
 * Copyright 2016-2017, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/*eslint-disable */
/**
 * Project Config JSON Schema file used to validate the project json datafile
 */
module.exports = {
  $schema: 'http://json-schema.org/draft-04/schema#',
  type: 'object',
  properties: {
    projectId: {
      type: 'string',
      required: true,
    },
    accountId: {
      type: 'string',
      required: true,
    },
    groups: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            required: true,
          },
          policy: {
            type: 'string',
            required: true,
          },
          trafficAllocation: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                entityId: {
                  type: 'string',
                  required: true,
                },
                endOfRange: {
                  type: 'integer',
                  required: true,
                },
              },
            },
            required: true,
          },
          experiments: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  required: true,
                },
                key: {
                  type: 'string',
                  required: true,
                },
                status: {
                  type: 'string',
                  required: true,
                },
                layerId: {
                  type: 'string',
                  required: true,
                },
                variations: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: {
                        type: 'string',
                        required: true,
                      },
                      key: {
                        type: 'string',
                        required: true,
                      },
                    },
                  },
                  required: true,
                },
                trafficAllocation: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      entityId: {
                        type: 'string',
                        required: true,
                      },
                      endOfRange: {
                        type: 'integer',
                        required: true,
                      },
                    },
                  },
                  required: true,
                },
                audienceIds: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                  required: true,
                },
                forcedVariations: {
                  type: 'object',
                  required: true,
                },
              },
            },
            required: true,
          },
        },
      },
      required: true,
    },
    experiments: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            required: true,
          },
          key: {
            type: 'string',
            required: true,
          },
          status: {
            type: 'string',
            required: true,
          },
          layerId: {
            type: 'string',
            required: true,
          },
          variations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  required: true,
                },
                key: {
                  type: 'string',
                  required: true,
                },
              },
            },
            required: true,
          },
          trafficAllocation: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                entityId: {
                  type: 'string',
                  required: true,
                },
                endOfRange: {
                  type: 'integer',
                  required: true,
                },
              },
            },
            required: true,
          },
          audienceIds: {
            type: 'array',
            items: {
              type: 'string',
            },
            required: true,
          },
          forcedVariations: {
            type: 'object',
            required: true,
          },
        },
      },
      required: true,
    },
    events: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: {
            type: 'string',
            required: true,
          },
          experimentIds: {
            type: 'array',
            items: {
              type: 'string',
              required: true,
            },
          },
          id: {
            type: 'string',
            required: true,
          },
        },
      },
      required: true,
    },
    audiences: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            required: true,
          },
          name: {
            type: 'string',
            required: true,
          },
          conditions: {
            type: 'string',
            required: true,
          },
        },
      },
      required: true,
    },
    attributes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            required: true,
          },
          key: {
            type: 'string',
            required: true,
          },
        },
      },
      required: true,
    },
    version: {
      type: 'string',
      required: true,
    },
    revision: {
      type: 'string',
      required: true,
    },
  },
};


/***/ }),
/* 37 */
/***/ (function(module, exports) {

/**
 * Copyright 2018, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

module.exports = {
  /**
   * Validates provided value is a non-empty string
   * @param  {string}  input
   * @return {boolean} True for non-empty string, false otherwise
   */
  validate: function(input) {
    return typeof input === 'string' && input !== '';
  },
};


/***/ }),
/* 38 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * Copyright 2016-2019, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var enums = __webpack_require__(14);
var fns = __webpack_require__(11);
var eventTagUtils = __webpack_require__(39);
var projectConfig = __webpack_require__(35);
var attributeValidator = __webpack_require__(28);

var ACTIVATE_EVENT_KEY = 'campaign_activated';
var CUSTOM_ATTRIBUTE_FEATURE_TYPE = 'custom';
var ENDPOINT = 'https://logx.optimizely.com/v1/events';
var HTTP_VERB = 'POST';

/**
 * Get params which are used same in both conversion and impression events
 * @param  {Object} options.attributes    Object representing user attributes and values which need to be recorded
 * @param  {string} options.clientEngine  The client we are using: node or javascript
 * @param  {string} options.clientVersion The version of the client
 * @param  {Object} options.configObj     Object representing project configuration, including datafile information and mappings for quick lookup
 * @param  {string} options.userId        ID for user
 * @param  {Object} options.Logger        logger
 * @return {Object}                       Common params with properties that are used in both conversion and impression events
 */
function getCommonEventParams(options) {
  var attributes = options.attributes;
  var configObj = options.configObj;
  var anonymize_ip = configObj.anonymizeIP;
  var botFiltering = configObj.botFiltering;
  if (anonymize_ip === null || anonymize_ip === undefined) {
    anonymize_ip = false;
  }

  var visitor = {
    snapshots: [],
    visitor_id: options.userId,
    attributes: [],
  };

  var commonParams = {
    account_id: configObj.accountId,
    project_id: configObj.projectId,
    visitors: [visitor],
    revision: configObj.revision,
    client_name: options.clientEngine,
    client_version: options.clientVersion,
    anonymize_ip: anonymize_ip,
    enrich_decisions: true,
  };

  // Omit attribute values that are not supported by the log endpoint.
  Object.keys(attributes || {}).forEach(function(attributeKey) {
    var attributeValue = attributes[attributeKey];
    if (attributeValidator.isAttributeValid(attributeKey, attributeValue)) {
      var attributeId = projectConfig.getAttributeId(options.configObj, attributeKey, options.logger);
      if (attributeId) {
        commonParams.visitors[0].attributes.push({
          entity_id: attributeId,
          key: attributeKey,
          type: CUSTOM_ATTRIBUTE_FEATURE_TYPE,
          value: attributes[attributeKey],
        });
      }
    }
  });

  if (typeof botFiltering === 'boolean') {
    commonParams.visitors[0].attributes.push({
      entity_id: enums.CONTROL_ATTRIBUTES.BOT_FILTERING,
      key: enums.CONTROL_ATTRIBUTES.BOT_FILTERING,
      type: CUSTOM_ATTRIBUTE_FEATURE_TYPE,
      value: botFiltering,
    });
  }
  return commonParams;
}

/**
 * Creates object of params specific to impression events
 * @param  {Object} configObj    Object representing project configuration
 * @param  {string} experimentId ID of experiment for which impression needs to be recorded
 * @param  {string} variationId  ID for variation which would be presented to user
 * @return {Object}              Impression event params
 */
function getImpressionEventParams(configObj, experimentId, variationId) {
  var impressionEventParams = {
    decisions: [
      {
        campaign_id: projectConfig.getLayerId(configObj, experimentId),
        experiment_id: experimentId,
        variation_id: variationId,
      },
    ],
    events: [
      {
        entity_id: projectConfig.getLayerId(configObj, experimentId),
        timestamp: fns.currentTimestamp(),
        key: ACTIVATE_EVENT_KEY,
        uuid: fns.uuid(),
      },
    ],
  };
  return impressionEventParams;
}

/**
 * Creates object of params specific to conversion events
 * @param  {Object} configObj                 Object representing project configuration
 * @param  {string} eventKey                  Event key representing the event which needs to be recorded
 * @param  {Object} eventTags                 Values associated with the event.
 * @param  {Object} logger                    Logger object
 * @return {Object}                           Conversion event params
 */
function getVisitorSnapshot(configObj, eventKey, eventTags, logger) {
  var snapshot = {
    events: [],
  };

  var eventDict = {
    entity_id: projectConfig.getEventId(configObj, eventKey),
    timestamp: fns.currentTimestamp(),
    uuid: fns.uuid(),
    key: eventKey,
  };

  if (eventTags) {
    var revenue = eventTagUtils.getRevenueValue(eventTags, logger);
    if (revenue !== null) {
      eventDict[enums.RESERVED_EVENT_KEYWORDS.REVENUE] = revenue;
    }

    var eventValue = eventTagUtils.getEventValue(eventTags, logger);
    if (eventValue !== null) {
      eventDict[enums.RESERVED_EVENT_KEYWORDS.VALUE] = eventValue;
    }

    eventDict['tags'] = eventTags;
  }
  snapshot.events.push(eventDict);

  return snapshot;
}

module.exports = {
  /**
   * Create impression event params to be sent to the logging endpoint
   * @param  {Object} options               Object containing values needed to build impression event
   * @param  {Object} options.attributes    Object representing user attributes and values which need to be recorded
   * @param  {string} options.clientEngine  The client we are using: node or javascript
   * @param  {string} options.clientVersion The version of the client
   * @param  {Object} options.configObj     Object representing project configuration, including datafile information and mappings for quick lookup
   * @param  {string} options.experimentId  Experiment for which impression needs to be recorded
   * @param  {string} options.userId        ID for user
   * @param  {string} options.variationId   ID for variation which would be presented to user
   * @return {Object}                       Params to be used in impression event logging endpoint call
   */
  getImpressionEvent: function(options) {
    var impressionEvent = {
      httpVerb: HTTP_VERB,
    };

    var commonParams = getCommonEventParams(options);
    impressionEvent.url = ENDPOINT;

    var impressionEventParams = getImpressionEventParams(options.configObj, options.experimentId, options.variationId);
    // combine Event params into visitor obj
    commonParams.visitors[0].snapshots.push(impressionEventParams);

    impressionEvent.params = commonParams;

    return impressionEvent;
  },

  /**
   * Create conversion event params to be sent to the logging endpoint
   * @param  {Object} options                           Object containing values needed to build conversion event
   * @param  {Object} options.attributes                Object representing user attributes and values which need to be recorded
   * @param  {string} options.clientEngine              The client we are using: node or javascript
   * @param  {string} options.clientVersion             The version of the client
   * @param  {Object} options.configObj                 Object representing project configuration, including datafile information and mappings for quick lookup
   * @param  {string} options.eventKey                  Event key representing the event which needs to be recorded
   * @param  {Object} options.eventTags                 Object with event-specific tags
   * @param  {Object} options.logger                    Logger object
   * @param  {string} options.userId                    ID for user
   * @return {Object}                                   Params to be used in conversion event logging endpoint call
   */
  getConversionEvent: function(options) {
    var conversionEvent = {
      httpVerb: HTTP_VERB,
    };

    var commonParams = getCommonEventParams(options);
    conversionEvent.url = ENDPOINT;

    var snapshot = getVisitorSnapshot(options.configObj, options.eventKey, options.eventTags, options.logger);

    commonParams.visitors[0].snapshots = [snapshot];
    conversionEvent.params = commonParams;

    return conversionEvent;
  },
};


/***/ }),
/* 39 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * Copyright 2017, 2019 Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Provides utility method for parsing event tag values
 */
var enums = __webpack_require__(14);
var sprintf = __webpack_require__(12).sprintf;

var LOG_LEVEL = enums.LOG_LEVEL;
var LOG_MESSAGES = enums.LOG_MESSAGES;
var MODULE_NAME = 'EVENT_TAG_UTILS';
var REVENUE_EVENT_METRIC_NAME = enums.RESERVED_EVENT_KEYWORDS.REVENUE;
var VALUE_EVENT_METRIC_NAME = enums.RESERVED_EVENT_KEYWORDS.VALUE;

module.exports = {
  /**
   * Grab the revenue value from the event tags. "revenue" is a reserved keyword.
   * @param {Object} eventTags
   * @param {Object} logger
   * @return {Integer|null}
   */
  getRevenueValue: function(eventTags, logger) {
    if (eventTags && eventTags.hasOwnProperty(REVENUE_EVENT_METRIC_NAME)) {
      var rawValue = eventTags[REVENUE_EVENT_METRIC_NAME];
      var parsedRevenueValue = parseInt(rawValue, 10);
      if (isNaN(parsedRevenueValue)) {
        logger.log(LOG_LEVEL.INFO, sprintf(LOG_MESSAGES.FAILED_TO_PARSE_REVENUE, MODULE_NAME, rawValue));
        return null;
      }
      logger.log(LOG_LEVEL.INFO, sprintf(LOG_MESSAGES.PARSED_REVENUE_VALUE, MODULE_NAME, parsedRevenueValue));
      return parsedRevenueValue;
    }
    return null;
  },

  /**
   * Grab the event value from the event tags. "value" is a reserved keyword.
   * @param {Object} eventTags
   * @param {Object} logger
   * @return {Number|null}
   */
  getEventValue: function(eventTags, logger) {
    if (eventTags && eventTags.hasOwnProperty(VALUE_EVENT_METRIC_NAME)) {
      var rawValue = eventTags[VALUE_EVENT_METRIC_NAME];
      var parsedEventValue = parseFloat(rawValue);
      if (isNaN(parsedEventValue)) {
        logger.log(LOG_LEVEL.INFO, sprintf(LOG_MESSAGES.FAILED_TO_PARSE_VALUE, MODULE_NAME, rawValue));
        return null;
      }
      logger.log(LOG_LEVEL.INFO, sprintf(LOG_MESSAGES.PARSED_NUMERIC_VALUE, MODULE_NAME, parsedEventValue));
      return parsedEventValue;
    }
    return null;
  },
};


/***/ }),
/* 40 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * Copyright 2019, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var logging = __webpack_require__(1);

var attributesValidator = __webpack_require__(28);
var fns = __webpack_require__(11);
var eventTagUtils = __webpack_require__(39);
var projectConfig = __webpack_require__(35);

var logger = logging.getLogger('EVENT_BUILDER');

/**
 * Creates an ImpressionEvent object from decision data
 * @param {Object} config
 * @param {Object} config.configObj
 * @param {String} config.experimentKey
 * @param {String} config.variationKey
 * @param {String} config.userId
 * @param {Object} config.userAttributes
 * @param {String} config.clientEngine
 * @param {String} config.clientVersion
 * @return {Object} an ImpressionEvent object
 */
exports.buildImpressionEvent = function buildImpressionEvent(config) {
  var configObj = config.configObj;
  var experimentKey = config.experimentKey;
  var variationKey = config.variationKey;
  var userId = config.userId;
  var userAttributes = config.userAttributes;
  var clientEngine = config.clientEngine;
  var clientVersion = config.clientVersion;

  var variationId = projectConfig.getVariationIdFromExperimentAndVariationKey(configObj, experimentKey, variationKey);
  var experimentId = projectConfig.getExperimentId(configObj, experimentKey);
  var layerId = projectConfig.getLayerId(configObj, experimentId);

  return {
    type: 'impression',
    timestamp: fns.currentTimestamp(),
    uuid: fns.uuid(),

    user: {
      id: userId,
      attributes: buildVisitorAttributes(configObj, userAttributes),
    },

    context: {
      accountId: configObj.accountId,
      projectId: configObj.projectId,
      revision: configObj.revision,
      clientName: clientEngine,
      clientVersion: clientVersion,
      anonymizeIP: configObj.anonymizeIP || false,
      botFiltering: configObj.botFiltering,
    },

    layer: {
      id: layerId,
    },

    experiment: {
      id: experimentId,
      key: experimentKey,
    },

    variation: {
      id: variationId,
      key: variationKey,
    },
  };
};

/**
 * Creates a ConversionEvent object from track
 * @param {Object} config
 * @param {Object} config.configObj
 * @param {String} config.eventKey
 * @param {Object|undefined} config.eventTags
 * @param {String} config.userId
 * @param {Object} config.userAttributes
 * @param {String} config.clientEngine
 * @param {String} config.clientVersion
 * @return {Object} a ConversionEvent object
 */
exports.buildConversionEvent = function buildConversionEvent(config) {
  var configObj = config.configObj;
  var userId = config.userId;
  var userAttributes = config.userAttributes;
  var clientEngine = config.clientEngine;
  var clientVersion = config.clientVersion;

  var eventKey = config.eventKey;
  var eventTags = config.eventTags;
  var eventId = projectConfig.getEventId(configObj, eventKey);

  return {
    type: 'conversion',
    timestamp: fns.currentTimestamp(),
    uuid: fns.uuid(),

    user: {
      id: userId,
      attributes: buildVisitorAttributes(configObj, userAttributes),
    },

    context: {
      accountId: configObj.accountId,
      projectId: configObj.projectId,
      revision: configObj.revision,
      clientName: clientEngine,
      clientVersion: clientVersion,
      anonymizeIP: configObj.anonymizeIP || false,
      botFiltering: configObj.botFiltering,
    },

    event: {
      id: eventId,
      key: eventKey,
    },

    revenue: eventTagUtils.getRevenueValue(eventTags, logger),
    value: eventTagUtils.getEventValue(eventTags, logger),
    tags: eventTags,
  };
};

function buildVisitorAttributes(configObj, attributes) {
  var builtAttributes = [];
  // Omit attribute values that are not supported by the log endpoint.
  Object.keys(attributes || {}).forEach(function(attributeKey) {
    var attributeValue = attributes[attributeKey];
    if (attributesValidator.isAttributeValid(attributeKey, attributeValue)) {
      var attributeId = projectConfig.getAttributeId(configObj, attributeKey, logger);
      if (attributeId) {
        builtAttributes.push({
          entityId: attributeId,
          key: attributeKey,
          value: attributes[attributeKey],
        });
      }
    }
  });

  return builtAttributes;
}


/***/ }),
/* 41 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * Copyright 2017, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Provides utility method for validating that event tags user has provided are valid
 */

var sprintf = __webpack_require__(12).sprintf;

var ERROR_MESSAGES = __webpack_require__(14).ERROR_MESSAGES;
var MODULE_NAME = 'EVENT_TAGS_VALIDATOR';

module.exports = {
  /**
   * Validates user's provided event tags
   * @param  {Object}  event tags
   * @return {boolean} True if event tags are valid
   * @throws If event tags are not valid
   */
  validate: function(eventTags) {
    if (typeof eventTags === 'object' && !Array.isArray(eventTags) && eventTags !== null) {
      return true;
    } else {
      throw new Error(sprintf(ERROR_MESSAGES.INVALID_EVENT_TAGS, MODULE_NAME));
    }
  },
};


/***/ }),
/* 42 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * Copyright 2017, 2019 Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var enums = __webpack_require__(14);
var jsSdkUtils = __webpack_require__(12);

var LOG_LEVEL = enums.LOG_LEVEL;
var LOG_MESSAGES = enums.LOG_MESSAGES;
var MODULE_NAME = 'NOTIFICATION_CENTER';

/**
 * NotificationCenter allows registration and triggering of callback functions using
 * notification event types defined in NOTIFICATION_TYPES of utils/enums/index.js:
 * - ACTIVATE: An impression event will be sent to Optimizely.
 * - TRACK a conversion event will be sent to Optimizely
 * @constructor
 * @param {Object} options
 * @param {Object} options.logger An instance of a logger to log messages with
 * @param {object} options.errorHandler An instance of errorHandler to handle any unexpected error
 * @returns {Object}
 */
function NotificationCenter(options) {
  this.logger = options.logger;
  this.errorHandler = options.errorHandler;
  this.__notificationListeners = {};

  jsSdkUtils.objectValues(enums.NOTIFICATION_TYPES).forEach(
    function(notificationTypeEnum) {
      this.__notificationListeners[notificationTypeEnum] = [];
    }.bind(this)
  );
  this.__listenerId = 1;
}

/**
 * Add a notification callback to the notification center
 * @param {string} notificationType One of the values from NOTIFICATION_TYPES in utils/enums/index.js
 * @param {Function} callback Function that will be called when the event is triggered
 * @returns {number} If the callback was successfully added, returns a listener ID which can be used
 * to remove the callback by calling removeNotificationListener. The ID is a number greater than 0.
 * If there was an error and the listener was not added, addNotificationListener returns -1. This
 * can happen if the first argument is not a valid notification type, or if the same callback
 * function was already added as a listener by a prior call to this function.
 */
NotificationCenter.prototype.addNotificationListener = function(notificationType, callback) {
  try {
    var isNotificationTypeValid = jsSdkUtils.objectValues(enums.NOTIFICATION_TYPES).indexOf(notificationType) > -1;
    if (!isNotificationTypeValid) {
      return -1;
    }

    if (!this.__notificationListeners[notificationType]) {
      this.__notificationListeners[notificationType] = [];
    }

    var callbackAlreadyAdded = false;
    (this.__notificationListeners[notificationType] || []).forEach(function(listenerEntry) {
      if (listenerEntry.callback === callback) {
        callbackAlreadyAdded = true;
        return false;
      }
    });
    if (callbackAlreadyAdded) {
      return -1;
    }

    this.__notificationListeners[notificationType].push({
      id: this.__listenerId,
      callback: callback,
    });

    var returnId = this.__listenerId;
    this.__listenerId += 1;
    return returnId;
  } catch (e) {
    this.logger.log(LOG_LEVEL.ERROR, e.message);
    this.errorHandler.handleError(e);
    return -1;
  }
};

/**
 * Remove a previously added notification callback
 * @param {number} listenerId ID of listener to be removed
 * @returns {boolean} Returns true if the listener was found and removed, and false
 * otherwise.
 */
NotificationCenter.prototype.removeNotificationListener = function(listenerId) {
  try {
    var indexToRemove;
    var typeToRemove;

    Object.keys(this.__notificationListeners).some(
      function(notificationType) {
        var listenersForType = this.__notificationListeners[notificationType];
        (listenersForType || []).every(function(listenerEntry, i) {
          if (listenerEntry.id === listenerId) {
            indexToRemove = i;
            typeToRemove = notificationType;
            return false;
          }
          return true;
        });
        if (indexToRemove !== undefined && typeToRemove !== undefined) {
          return true;
        }
      }.bind(this)
    );

    if (indexToRemove !== undefined && typeToRemove !== undefined) {
      this.__notificationListeners[typeToRemove].splice(indexToRemove, 1);
      return true;
    }
  } catch (e) {
    this.logger.log(LOG_LEVEL.ERROR, e.message);
    this.errorHandler.handleError(e);
  }
  return false;
};

/**
 * Removes all previously added notification listeners, for all notification types
 */
NotificationCenter.prototype.clearAllNotificationListeners = function() {
  try {
    jsSdkUtils.objectValues(enums.NOTIFICATION_TYPES).forEach(
      function(notificationTypeEnum) {
        this.__notificationListeners[notificationTypeEnum] = [];
      }.bind(this)
    );
  } catch (e) {
    this.logger.log(LOG_LEVEL.ERROR, e.message);
    this.errorHandler.handleError(e);
  }
};

/**
 * Remove all previously added notification listeners for the argument type
 * @param {string} notificationType One of enums.NOTIFICATION_TYPES
 */
NotificationCenter.prototype.clearNotificationListeners = function(notificationType) {
  try {
    this.__notificationListeners[notificationType] = [];
  } catch (e) {
    this.logger.log(LOG_LEVEL.ERROR, e.message);
    this.errorHandler.handleError(e);
  }
};

/**
 * Fires notifications for the argument type. All registered callbacks for this type will be
 * called. The notificationData object will be passed on to callbacks called.
 * @param {string} notificationType One of enums.NOTIFICATION_TYPES
 * @param {Object} notificationData Will be passed to callbacks called
 */
NotificationCenter.prototype.sendNotifications = function(notificationType, notificationData) {
  try {
    (this.__notificationListeners[notificationType] || []).forEach(
      function(listenerEntry) {
        var callback = listenerEntry.callback;
        try {
          callback(notificationData);
        } catch (ex) {
          this.logger.log(
            LOG_LEVEL.ERROR,
            jsSdkUtils.sprintf(LOG_MESSAGES.NOTIFICATION_LISTENER_EXCEPTION, MODULE_NAME, notificationType, ex.message)
          );
        }
      }.bind(this)
    );
  } catch (e) {
    this.logger.log(LOG_LEVEL.ERROR, e.message);
    this.errorHandler.handleError(e);
  }
};

module.exports = {
  /**
   * Create an instance of NotificationCenter
   * @param {Object} options
   * @param {Object} options.logger An instance of a logger to log messages with
   * @returns {Object} An instance of NotificationCenter
   */
  createNotificationCenter: function(options) {
    return new NotificationCenter(options);
  },
};


/***/ }),
/* 43 */
/***/ (function(module, exports, __webpack_require__) {

/****************************************************************************
 * Copyright 2017, Optimizely, Inc. and contributors                        *
 *                                                                          *
 * Licensed under the Apache License, Version 2.0 (the "License");          *
 * you may not use this file except in compliance with the License.         *
 * You may obtain a copy of the License at                                  *
 *                                                                          *
 *    http://www.apache.org/licenses/LICENSE-2.0                            *
 *                                                                          *
 * Unless required by applicable law or agreed to in writing, software      *
 * distributed under the License is distributed on an "AS IS" BASIS,        *
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. *
 * See the License for the specific language governing permissions and      *
 * limitations under the License.                                           *
 ***************************************************************************/

/**
 * Provides utility method for validating that the given user profile service implementation is valid.
 */

var sprintf = __webpack_require__(12).sprintf;

var ERROR_MESSAGES = __webpack_require__(14).ERROR_MESSAGES;
var MODULE_NAME = 'USER_PROFILE_SERVICE_VALIDATOR';

module.exports = {
  /**
   * Validates user's provided user profile service instance
   * @param  {Object}  userProfileServiceInstance
   * @return {boolean} True if the instance is valid
   * @throws If the instance is not valid
   */
  validate: function(userProfileServiceInstance) {
    if (typeof userProfileServiceInstance.lookup !== 'function') {
      throw new Error(sprintf(ERROR_MESSAGES.INVALID_USER_PROFILE_SERVICE, MODULE_NAME, "Missing function 'lookup'"));
    } else if (typeof userProfileServiceInstance.save !== 'function') {
      throw new Error(sprintf(ERROR_MESSAGES.INVALID_USER_PROFILE_SERVICE, MODULE_NAME, "Missing function 'save'"));
    }
    return true;
  },
};


/***/ }),
/* 44 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * Copyright 2019, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var fns = __webpack_require__(11);
var sprintf = __webpack_require__(12).sprintf;
var logging = __webpack_require__(1);
var configValidator = __webpack_require__(13);
var datafileManager = __webpack_require__(45);
var enums = __webpack_require__(14);
var projectConfig = __webpack_require__(35);
var optimizelyConfig = __webpack_require__(54);

var logger = logging.getLogger();

var ERROR_MESSAGES = enums.ERROR_MESSAGES;

var MODULE_NAME = 'PROJECT_CONFIG_MANAGER';

/**
 * Return an error message derived from a thrown value. If the thrown value is
 * an error, return the error's message property. Otherwise, return a default
 * provided by the second argument.
 * @param {*} maybeError
 * @param {String=} defaultMessage
 * @return {String}
 */
function getErrorMessage(maybeError, defaultMessage) {
  if (maybeError instanceof Error) {
    return maybeError.message;
  }
  return defaultMessage || 'Unknown error';
}

/**
 * ProjectConfigManager provides project config objects via its methods
 * getConfig and onUpdate. It uses a DatafileManager to fetch datafiles. It is
 * responsible for parsing and validating datafiles, and converting datafile
 * JSON objects into project config objects.
 * @param {Object}         config
 * @param {Object|string=} config.datafile
 * @param {Object=}        config.datafileOptions
 * @param {Object=}        config.jsonSchemaValidator
 * @param {string=}        config.sdkKey
 * @param {boolean=}       config.skipJSONValidation
 */
function ProjectConfigManager(config) {
  try {
    this.__initialize(config);
  } catch (ex) {
    logger.error(ex);
    this.__updateListeners = [];
    this.__configObj = null;
    this.__optimizelyConfigObj = null;
    this.__readyPromise = Promise.resolve({
      success: false,
      reason: getErrorMessage(ex, 'Error in initialize'),
    });
  }
}

/**
 * Initialize internal properties including __updateListeners, __configObj, and
 * __readyPromise, using the argument config. Create and subscribe to a datafile
 * manager if appropriate.
 * @param {Object}         config
 * @param {Object|string=} config.datafile
 * @param {Object=}        config.datafileOptions
 * @param {Object=}        config.jsonSchemaValidator
 * @param {string=}        config.sdkKey
 * @param {boolean=}       config.skipJSONValidation
 */
ProjectConfigManager.prototype.__initialize = function(config) {
  this.__updateListeners = [];
  this.jsonSchemaValidator = config.jsonSchemaValidator;
  this.skipJSONValidation = config.skipJSONValidation;

  if (!config.datafile && !config.sdkKey) {
    this.__configObj = null;
    var datafileAndSdkKeyMissingError = new Error(sprintf(ERROR_MESSAGES.DATAFILE_AND_SDK_KEY_MISSING, MODULE_NAME));
    this.__readyPromise = Promise.resolve({
      success: false,
      reason: getErrorMessage(datafileAndSdkKeyMissingError),
    });
    logger.error(datafileAndSdkKeyMissingError);
    return;
  }

  var initialDatafile = this.__getDatafileFromConfig(config);
  var projectConfigCreationEx;
  if (initialDatafile) {
    try {
      this.__configObj = projectConfig.tryCreatingProjectConfig({
        datafile: initialDatafile,
        jsonSchemaValidator: this.jsonSchemaValidator,
        logger: logger,
        skipJSONValidation: this.skipJSONValidation,
      });
      this.__optimizelyConfigObj = optimizelyConfig.getOptimizelyConfig(this.__configObj);
    } catch (ex) {
      logger.error(ex);
      projectConfigCreationEx = ex;
      this.__configObj = null;
    }
  } else {
    this.__configObj = null;
  }

  if (config.sdkKey) {
    var datafileManagerConfig = {
      sdkKey: config.sdkKey,
    };
    if (this.__validateDatafileOptions(config.datafileOptions)) {
      fns.assign(datafileManagerConfig, config.datafileOptions);
    }
    if (initialDatafile && this.__configObj) {
      datafileManagerConfig.datafile = initialDatafile;
    }
    this.datafileManager = new datafileManager.HttpPollingDatafileManager(datafileManagerConfig);
    this.datafileManager.start();
    this.__readyPromise = this.datafileManager
      .onReady()
      .then(this.__onDatafileManagerReadyFulfill.bind(this), this.__onDatafileManagerReadyReject.bind(this));
    this.datafileManager.on('update', this.__onDatafileManagerUpdate.bind(this));
  } else if (this.__configObj) {
    this.__readyPromise = Promise.resolve({
      success: true,
    });
  } else {
    this.__readyPromise = Promise.resolve({
      success: false,
      reason: getErrorMessage(projectConfigCreationEx, 'Invalid datafile'),
    });
  }
};

/**
 * Respond to datafile manager's onReady promise becoming fulfilled.
 * If there are validation or parse failures using the datafile provided by
 * DatafileManager, ProjectConfigManager's ready promise is resolved with an
 * unsuccessful result. Otherwise, ProjectConfigManager updates its own project
 * config object from the new datafile, and its ready promise is resolved with a
 * successful result.
 */
ProjectConfigManager.prototype.__onDatafileManagerReadyFulfill = function() {
  var newDatafile = this.datafileManager.get();
  var newConfigObj;
  try {
    newConfigObj = projectConfig.tryCreatingProjectConfig({
      datafile: newDatafile,
      jsonSchemaValidator: this.jsonSchemaValidator,
      logger: logger,
      skipJSONValidation: this.skipJSONValidation,
    });
  } catch (ex) {
    logger.error(ex);
    return {
      success: false,
      reason: getErrorMessage(ex),
    };
  }
  this.__handleNewConfigObj(newConfigObj);
  return {
    success: true,
  };
};

/**
 * Respond to datafile manager's onReady promise becoming rejected.
 * When DatafileManager's onReady promise is rejected, there is no possibility
 * of obtaining a datafile. In this case, ProjectConfigManager's ready promise
 * is fulfilled with an unsuccessful result.
 * @param {Error} err
 */
ProjectConfigManager.prototype.__onDatafileManagerReadyReject = function(err) {
  return {
    success: false,
    reason: getErrorMessage(err, 'Failed to become ready'),
  };
};

/**
 * Respond to datafile manager's update event. Attempt to update own config
 * object using latest datafile from datafile manager. Call own registered
 * update listeners if successful
 */
ProjectConfigManager.prototype.__onDatafileManagerUpdate = function() {
  var newDatafile = this.datafileManager.get();
  var newConfigObj;
  try {
    newConfigObj = projectConfig.tryCreatingProjectConfig({
      datafile: newDatafile,
      jsonSchemaValidator: this.jsonSchemaValidator,
      logger: logger,
      skipJSONValidation: this.skipJSONValidation,
    });
  } catch (ex) {
    logger.error(ex);
  }
  if (newConfigObj) {
    this.__handleNewConfigObj(newConfigObj);
  }
};

/**
 * If the argument config contains a valid datafile object or string,
 * return a datafile object based on that provided datafile, otherwise
 * return null.
 * @param {Object}         config
 * @param {Object|string=} config.datafile
 * @return {Object|null}
 */
ProjectConfigManager.prototype.__getDatafileFromConfig = function(config) {
  var initialDatafile = null;
  try {
    if (config.datafile) {
      configValidator.validateDatafile(config.datafile);
      if (typeof config.datafile === 'string' || config.datafile instanceof String) {
        initialDatafile = JSON.parse(config.datafile);
      } else {
        initialDatafile = config.datafile;
      }
    }
  } catch (ex) {
    logger.error(ex);
  }
  return initialDatafile;
};

/**
 * Validate user-provided datafileOptions. It should be an object or undefined.
 * @param {*} datafileOptions
 * @returns {boolean}
 */
ProjectConfigManager.prototype.__validateDatafileOptions = function(datafileOptions) {
  if (typeof datafileOptions === 'undefined') {
    return true;
  }

  if (typeof datafileOptions === 'object') {
    return datafileOptions !== null;
  }

  return false;
};

/**
 * Update internal project config object to be argument object when the argument
 * object has a different revision than the current internal project config
 * object. If the internal object is updated, call update listeners.
 * @param {Object} newConfigObj
 */
ProjectConfigManager.prototype.__handleNewConfigObj = function(newConfigObj) {
  var oldConfigObj = this.__configObj;

  var oldRevision = oldConfigObj ? oldConfigObj.revision : 'null';
  if (oldRevision === newConfigObj.revision) {
    return;
  }

  this.__configObj = newConfigObj;
  this.__optimizelyConfigObj = optimizelyConfig.getOptimizelyConfig(newConfigObj);

  this.__updateListeners.forEach(function(listener) {
    listener(newConfigObj);
  });
};

/**
 * Returns the current project config object, or null if no project config object
 * is available
 * @return {Object|null}
 */
ProjectConfigManager.prototype.getConfig = function() {
  return this.__configObj;
};

/**
 * Returns the optimizely config object
 * @return {Object}
 */
ProjectConfigManager.prototype.getOptimizelyConfig = function() {
  return this.__optimizelyConfigObj;
};

/**
 * Returns a Promise that fulfills when this ProjectConfigManager is ready to
 * use (meaning it has a valid project config object), or has failed to become
 * ready.
 *
 * Failure can be caused by the following:
 * - At least one of sdkKey or datafile is not provided in the constructor argument
 * - The provided datafile was invalid
 * - The datafile provided by the datafile manager was invalid
 * - The datafile manager failed to fetch a datafile
 *
 * The returned Promise is fulfilled with a result object containing these
 * properties:
 *    - success (boolean): True if this instance is ready to use with a valid
 *                         project config object, or false if it failed to
 *                         become ready
 *    - reason (string=):  If success is false, this is a string property with
 *                         an explanatory message.
 * @return {Promise}
 */
ProjectConfigManager.prototype.onReady = function() {
  return this.__readyPromise;
};

/**
 * Add a listener for project config updates. The listener will be called
 * whenever this instance has a new project config object available.
 * Returns a dispose function that removes the subscription
 * @param {Function} listener
 * @return {Function}
 */
ProjectConfigManager.prototype.onUpdate = function(listener) {
  this.__updateListeners.push(listener);
  return function() {
    var index = this.__updateListeners.indexOf(listener);
    if (index > -1) {
      this.__updateListeners.splice(index, 1);
    }
  }.bind(this);
};

/**
 * Stop the internal datafile manager and remove all update listeners
 */
ProjectConfigManager.prototype.stop = function() {
  if (this.datafileManager) {
    this.datafileManager.stop();
  }
  this.__updateListeners = [];
};

module.exports = {
  ProjectConfigManager: ProjectConfigManager,
};


/***/ }),
/* 45 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

/**
 * Copyright 2019, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
var browserDatafileManager_1 = __webpack_require__(46);
exports.HttpPollingDatafileManager = browserDatafileManager_1.default;
var staticDatafileManager_1 = __webpack_require__(53);
exports.StaticDatafileManager = staticDatafileManager_1.default;


/***/ }),
/* 46 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

/**
 * Copyright 2019, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var browserRequest_1 = __webpack_require__(47);
var httpPollingDatafileManager_1 = __importDefault(__webpack_require__(49));
var BrowserDatafileManager = /** @class */ (function (_super) {
    __extends(BrowserDatafileManager, _super);
    function BrowserDatafileManager() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    BrowserDatafileManager.prototype.makeGetRequest = function (reqUrl, headers) {
        return browserRequest_1.makeGetRequest(reqUrl, headers);
    };
    BrowserDatafileManager.prototype.getConfigDefaults = function () {
        return {
            autoUpdate: false,
        };
    };
    return BrowserDatafileManager;
}(httpPollingDatafileManager_1.default));
exports.default = BrowserDatafileManager;


/***/ }),
/* 47 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

/**
 * Copyright 2019, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
var config_1 = __webpack_require__(48);
var js_sdk_logging_1 = __webpack_require__(1);
var logger = js_sdk_logging_1.getLogger('DatafileManager');
var GET_METHOD = 'GET';
var READY_STATE_DONE = 4;
function parseHeadersFromXhr(req) {
    var allHeadersString = req.getAllResponseHeaders();
    if (allHeadersString === null) {
        return {};
    }
    var headerLines = allHeadersString.split('\r\n');
    var headers = {};
    headerLines.forEach(function (headerLine) {
        var separatorIndex = headerLine.indexOf(': ');
        if (separatorIndex > -1) {
            var headerName = headerLine.slice(0, separatorIndex);
            var headerValue = headerLine.slice(separatorIndex + 2);
            if (headerValue.length > 0) {
                headers[headerName] = headerValue;
            }
        }
    });
    return headers;
}
function setHeadersInXhr(headers, req) {
    Object.keys(headers).forEach(function (headerName) {
        var header = headers[headerName];
        req.setRequestHeader(headerName, header);
    });
}
function makeGetRequest(reqUrl, headers) {
    var req = new XMLHttpRequest();
    var responsePromise = new Promise(function (resolve, reject) {
        req.open(GET_METHOD, reqUrl, true);
        setHeadersInXhr(headers, req);
        req.onreadystatechange = function () {
            if (req.readyState === READY_STATE_DONE) {
                var statusCode = req.status;
                if (statusCode === 0) {
                    reject(new Error('Request error'));
                    return;
                }
                var headers_1 = parseHeadersFromXhr(req);
                var resp = {
                    statusCode: req.status,
                    body: req.responseText,
                    headers: headers_1,
                };
                resolve(resp);
            }
        };
        req.timeout = config_1.REQUEST_TIMEOUT_MS;
        req.ontimeout = function () {
            logger.error('Request timed out');
        };
        req.send();
    });
    return {
        responsePromise: responsePromise,
        abort: function () {
            req.abort();
        },
    };
}
exports.makeGetRequest = makeGetRequest;


/***/ }),
/* 48 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

/**
 * Copyright 2019, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes
exports.MIN_UPDATE_INTERVAL = 1000;
exports.DEFAULT_URL_TEMPLATE = "https://cdn.optimizely.com/datafiles/%s.json";
exports.BACKOFF_BASE_WAIT_SECONDS_BY_ERROR_COUNT = [0, 8, 16, 32, 64, 128, 256, 512];
exports.REQUEST_TIMEOUT_MS = 60 * 1000; // 1 minute


/***/ }),
/* 49 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

/**
 * Copyright 2019, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var js_sdk_logging_1 = __webpack_require__(1);
var js_sdk_utils_1 = __webpack_require__(50);
var eventEmitter_1 = __importDefault(__webpack_require__(51));
var config_1 = __webpack_require__(48);
var backoffController_1 = __importDefault(__webpack_require__(52));
var logger = js_sdk_logging_1.getLogger('DatafileManager');
var UPDATE_EVT = 'update';
function isValidUpdateInterval(updateInterval) {
    return updateInterval >= config_1.MIN_UPDATE_INTERVAL;
}
function isSuccessStatusCode(statusCode) {
    return statusCode >= 200 && statusCode < 400;
}
var HttpPollingDatafileManager = /** @class */ (function () {
    function HttpPollingDatafileManager(config) {
        var _this = this;
        var configWithDefaultsApplied = __assign({}, this.getConfigDefaults(), config);
        var datafile = configWithDefaultsApplied.datafile, _a = configWithDefaultsApplied.autoUpdate, autoUpdate = _a === void 0 ? false : _a, sdkKey = configWithDefaultsApplied.sdkKey, _b = configWithDefaultsApplied.updateInterval, updateInterval = _b === void 0 ? config_1.DEFAULT_UPDATE_INTERVAL : _b, _c = configWithDefaultsApplied.urlTemplate, urlTemplate = _c === void 0 ? config_1.DEFAULT_URL_TEMPLATE : _c;
        this.isReadyPromiseSettled = false;
        this.readyPromiseResolver = function () { };
        this.readyPromiseRejecter = function () { };
        this.readyPromise = new Promise(function (resolve, reject) {
            _this.readyPromiseResolver = resolve;
            _this.readyPromiseRejecter = reject;
        });
        if (datafile) {
            this.currentDatafile = datafile;
            this.resolveReadyPromise();
        }
        else {
            this.currentDatafile = null;
        }
        this.isStarted = false;
        this.datafileUrl = js_sdk_utils_1.sprintf(urlTemplate, sdkKey);
        this.emitter = new eventEmitter_1.default();
        this.autoUpdate = autoUpdate;
        if (isValidUpdateInterval(updateInterval)) {
            this.updateInterval = updateInterval;
        }
        else {
            logger.warn('Invalid updateInterval %s, defaulting to %s', updateInterval, config_1.DEFAULT_UPDATE_INTERVAL);
            this.updateInterval = config_1.DEFAULT_UPDATE_INTERVAL;
        }
        this.currentTimeout = null;
        this.currentRequest = null;
        this.backoffController = new backoffController_1.default();
        this.syncOnCurrentRequestComplete = false;
    }
    HttpPollingDatafileManager.prototype.get = function () {
        return this.currentDatafile;
    };
    HttpPollingDatafileManager.prototype.start = function () {
        if (!this.isStarted) {
            logger.debug('Datafile manager started');
            this.isStarted = true;
            this.backoffController.reset();
            this.syncDatafile();
        }
    };
    HttpPollingDatafileManager.prototype.stop = function () {
        logger.debug('Datafile manager stopped');
        this.isStarted = false;
        if (this.currentTimeout) {
            clearTimeout(this.currentTimeout);
            this.currentTimeout = null;
        }
        this.emitter.removeAllListeners();
        if (this.currentRequest) {
            this.currentRequest.abort();
            this.currentRequest = null;
        }
        return Promise.resolve();
    };
    HttpPollingDatafileManager.prototype.onReady = function () {
        return this.readyPromise;
    };
    HttpPollingDatafileManager.prototype.on = function (eventName, listener) {
        return this.emitter.on(eventName, listener);
    };
    HttpPollingDatafileManager.prototype.onRequestRejected = function (err) {
        if (!this.isStarted) {
            return;
        }
        this.backoffController.countError();
        if (err instanceof Error) {
            logger.error('Error fetching datafile: %s', err.message, err);
        }
        else if (typeof err === 'string') {
            logger.error('Error fetching datafile: %s', err);
        }
        else {
            logger.error('Error fetching datafile');
        }
    };
    HttpPollingDatafileManager.prototype.onRequestResolved = function (response) {
        if (!this.isStarted) {
            return;
        }
        if (typeof response.statusCode !== 'undefined' &&
            isSuccessStatusCode(response.statusCode)) {
            this.backoffController.reset();
        }
        else {
            this.backoffController.countError();
        }
        this.trySavingLastModified(response.headers);
        var datafile = this.getNextDatafileFromResponse(response);
        if (datafile !== null) {
            logger.info('Updating datafile from response');
            this.currentDatafile = datafile;
            if (!this.isReadyPromiseSettled) {
                this.resolveReadyPromise();
            }
            else {
                var datafileUpdate = {
                    datafile: datafile,
                };
                this.emitter.emit(UPDATE_EVT, datafileUpdate);
            }
        }
    };
    HttpPollingDatafileManager.prototype.onRequestComplete = function () {
        if (!this.isStarted) {
            return;
        }
        this.currentRequest = null;
        if (!this.isReadyPromiseSettled && !this.autoUpdate) {
            // We will never resolve ready, so reject it
            this.rejectReadyPromise(new Error('Failed to become ready'));
        }
        if (this.autoUpdate && this.syncOnCurrentRequestComplete) {
            this.syncDatafile();
        }
        this.syncOnCurrentRequestComplete = false;
    };
    HttpPollingDatafileManager.prototype.syncDatafile = function () {
        var _this = this;
        var headers = {};
        if (this.lastResponseLastModified) {
            headers['if-modified-since'] = this.lastResponseLastModified;
        }
        logger.debug('Making datafile request to url %s with headers: %s', this.datafileUrl, function () { return JSON.stringify(headers); });
        this.currentRequest = this.makeGetRequest(this.datafileUrl, headers);
        var onRequestComplete = function () {
            _this.onRequestComplete();
        };
        var onRequestResolved = function (response) {
            _this.onRequestResolved(response);
        };
        var onRequestRejected = function (err) {
            _this.onRequestRejected(err);
        };
        this.currentRequest.responsePromise
            .then(onRequestResolved, onRequestRejected)
            .then(onRequestComplete, onRequestComplete);
        if (this.autoUpdate) {
            this.scheduleNextUpdate();
        }
    };
    HttpPollingDatafileManager.prototype.resolveReadyPromise = function () {
        this.readyPromiseResolver();
        this.isReadyPromiseSettled = true;
    };
    HttpPollingDatafileManager.prototype.rejectReadyPromise = function (err) {
        this.readyPromiseRejecter(err);
        this.isReadyPromiseSettled = true;
    };
    HttpPollingDatafileManager.prototype.scheduleNextUpdate = function () {
        var _this = this;
        var currentBackoffDelay = this.backoffController.getDelay();
        var nextUpdateDelay = Math.max(currentBackoffDelay, this.updateInterval);
        logger.debug('Scheduling sync in %s ms', nextUpdateDelay);
        this.currentTimeout = setTimeout(function () {
            if (_this.currentRequest) {
                _this.syncOnCurrentRequestComplete = true;
            }
            else {
                _this.syncDatafile();
            }
        }, nextUpdateDelay);
    };
    HttpPollingDatafileManager.prototype.getNextDatafileFromResponse = function (response) {
        logger.debug('Response status code: %s', response.statusCode);
        if (typeof response.statusCode === 'undefined') {
            return null;
        }
        if (response.statusCode === 304) {
            return null;
        }
        if (isSuccessStatusCode(response.statusCode)) {
            return this.tryParsingBodyAsJSON(response.body);
        }
        return null;
    };
    HttpPollingDatafileManager.prototype.tryParsingBodyAsJSON = function (body) {
        var parseResult;
        try {
            parseResult = JSON.parse(body);
        }
        catch (err) {
            logger.error('Error parsing response body: %s', err.message, err);
            return null;
        }
        var datafileObj = null;
        if (typeof parseResult === 'object' && parseResult !== null) {
            datafileObj = parseResult;
        }
        else {
            logger.error('Error parsing response body: was not an object');
        }
        return datafileObj;
    };
    HttpPollingDatafileManager.prototype.trySavingLastModified = function (headers) {
        var lastModifiedHeader = headers['last-modified'] || headers['Last-Modified'];
        if (typeof lastModifiedHeader !== 'undefined') {
            this.lastResponseLastModified = lastModifiedHeader;
            logger.debug('Saved last modified header value from response: %s', this.lastResponseLastModified);
        }
    };
    return HttpPollingDatafileManager;
}());
exports.default = HttpPollingDatafileManager;


/***/ }),
/* 50 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Copyright 2019, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var uuid_1 = __webpack_require__(6);
function getTimestamp() {
    return new Date().getTime();
}
exports.getTimestamp = getTimestamp;
function generateUUID() {
    return uuid_1.v4();
}
exports.generateUUID = generateUUID;
/**
 * Validates a value is a valid TypeScript enum
 *
 * @export
 * @param {object} enumToCheck
 * @param {*} value
 * @returns {boolean}
 */
function isValidEnum(enumToCheck, value) {
    var found = false;
    var keys = Object.keys(enumToCheck);
    for (var index = 0; index < keys.length; index++) {
        if (value === enumToCheck[keys[index]]) {
            found = true;
            break;
        }
    }
    return found;
}
exports.isValidEnum = isValidEnum;
function groupBy(arr, grouperFn) {
    var grouper = {};
    arr.forEach(function (item) {
        var key = grouperFn(item);
        grouper[key] = grouper[key] || [];
        grouper[key].push(item);
    });
    return objectValues(grouper);
}
exports.groupBy = groupBy;
function objectValues(obj) {
    return Object.keys(obj).map(function (key) { return obj[key]; });
}
exports.objectValues = objectValues;
function find(arr, cond) {
    var found;
    for (var _i = 0, arr_1 = arr; _i < arr_1.length; _i++) {
        var item = arr_1[_i];
        if (cond(item)) {
            found = item;
            break;
        }
    }
    return found;
}
exports.find = find;
function keyBy(arr, keyByFn) {
    var map = {};
    arr.forEach(function (item) {
        var key = keyByFn(item);
        map[key] = item;
    });
    return map;
}
exports.keyBy = keyBy;
function sprintf(format) {
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
    }
    var i = 0;
    return format.replace(/%s/g, function () {
        var arg = args[i++];
        var type = typeof arg;
        if (type === 'function') {
            return arg();
        }
        else if (type === 'string') {
            return arg;
        }
        else {
            return String(arg);
        }
    });
}
exports.sprintf = sprintf;


/***/ }),
/* 51 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

/**
 * Copyright 2019, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
var EventEmitter = /** @class */ (function () {
    function EventEmitter() {
        this.listeners = {};
        this.listenerId = 1;
    }
    EventEmitter.prototype.on = function (eventName, listener) {
        var _this = this;
        if (!this.listeners[eventName]) {
            this.listeners[eventName] = {};
        }
        var currentListenerId = String(this.listenerId);
        this.listenerId++;
        this.listeners[eventName][currentListenerId] = listener;
        return function () {
            if (_this.listeners[eventName]) {
                delete _this.listeners[eventName][currentListenerId];
            }
        };
    };
    EventEmitter.prototype.emit = function (eventName, arg) {
        var listeners = this.listeners[eventName];
        if (listeners) {
            Object.keys(listeners).forEach(function (listenerId) {
                var listener = listeners[listenerId];
                listener(arg);
            });
        }
    };
    EventEmitter.prototype.removeAllListeners = function () {
        this.listeners = {};
    };
    return EventEmitter;
}());
exports.default = EventEmitter;
// TODO: Create a typed event emitter for use in TS only (not JS)


/***/ }),
/* 52 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

/**
 * Copyright 2019, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
var config_1 = __webpack_require__(48);
function randomMilliseconds() {
    return Math.round(Math.random() * 1000);
}
var BackoffController = /** @class */ (function () {
    function BackoffController() {
        this.errorCount = 0;
    }
    BackoffController.prototype.getDelay = function () {
        if (this.errorCount === 0) {
            return 0;
        }
        var baseWaitSeconds = config_1.BACKOFF_BASE_WAIT_SECONDS_BY_ERROR_COUNT[Math.min(config_1.BACKOFF_BASE_WAIT_SECONDS_BY_ERROR_COUNT.length - 1, this.errorCount)];
        return baseWaitSeconds * 1000 + randomMilliseconds();
    };
    BackoffController.prototype.countError = function () {
        if (this.errorCount < config_1.BACKOFF_BASE_WAIT_SECONDS_BY_ERROR_COUNT.length - 1) {
            this.errorCount++;
        }
    };
    BackoffController.prototype.reset = function () {
        this.errorCount = 0;
    };
    return BackoffController;
}());
exports.default = BackoffController;


/***/ }),
/* 53 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

/**
 * Copyright 2019, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
var doNothing = function () { };
var StaticDatafileManager = /** @class */ (function () {
    function StaticDatafileManager(datafile) {
        this.datafile = datafile;
        this.readyPromise = Promise.resolve();
    }
    StaticDatafileManager.prototype.get = function () {
        return this.datafile;
    };
    StaticDatafileManager.prototype.onReady = function () {
        return this.readyPromise;
    };
    StaticDatafileManager.prototype.start = function () {
    };
    StaticDatafileManager.prototype.stop = function () {
        return Promise.resolve();
    };
    StaticDatafileManager.prototype.on = function (eventName, listener) {
        return doNothing;
    };
    return StaticDatafileManager;
}());
exports.default = StaticDatafileManager;


/***/ }),
/* 54 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * Copyright 2019, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var projectConfig = __webpack_require__(35);

// Get Experiment Ids which are part of rollouts
function getRolloutExperimentIds(rollouts) {
  return (rollouts || []).reduce(function(experimentIds, rollout) {
    rollout.experiments.forEach(function(e) {
      experimentIds[e.id] = true;
    });
    return experimentIds;
  }, {});
}

// Gets Map of all experiments except rollouts
function getExperimentsMap(configObj) {
  var rolloutExperimentIds = getRolloutExperimentIds(configObj.rollouts);
  var featureVariablesMap = (configObj.featureFlags || []).reduce(function(resultMap, feature) {
    resultMap[feature.id] = feature.variables;
    return resultMap;
  }, {});
  return (configObj.experiments || []).reduce(function(experiments, experiment) {
    // skip experiments that are part of a rollout
    if (!rolloutExperimentIds[experiment.id]) {
      experiments[experiment.key] = {
        id: experiment.id,
        key: experiment.key,
        variationsMap: (experiment.variations || []).reduce(function(variations, variation) {
          variations[variation.key] = {
            id: variation.id,
            key: variation.key,
            variablesMap: getMergedVariablesMap(configObj, variation, experiment.id, featureVariablesMap),
          };
          if (projectConfig.isFeatureExperiment(configObj, experiment.id)) {
            variations[variation.key].featureEnabled = variation.featureEnabled;
          }
          return variations;
        }, {}),
      };
    }
    return experiments;
  }, {});
}

// Merges feature key and type from feature variables to variation variables.
function getMergedVariablesMap(configObj, variation, experimentId, featureVariablesMap) {
  var featureId = configObj.experimentFeatureMap[experimentId];
  var variablesObject = {};
  if (featureId) {
    var experimentFeatureVariables = featureVariablesMap[featureId];
    // Temporary variation variables map to get values to merge.
    var tempVariablesIdMap = (variation.variables || []).reduce(function(variablesMap, variable) {
      variablesMap[variable.id] = {
        id: variable.id,
        value: variable.value,
      };
      return variablesMap;
    }, {});
    variablesObject = (experimentFeatureVariables || []).reduce(function(variablesMap, featureVariable) {
      var variationVariable = tempVariablesIdMap[featureVariable.id];
      var variableValue =
        variation.featureEnabled && variationVariable ? variationVariable.value : featureVariable.defaultValue;
      variablesMap[featureVariable.key] = {
        id: featureVariable.id,
        key: featureVariable.key,
        type: featureVariable.type,
        value: variableValue,
      };
      return variablesMap;
    }, {});
  }
  return variablesObject;
}

// Gets map of all experiments
function getFeaturesMap(configObj, allExperiments) {
  return (configObj.featureFlags || []).reduce(function(features, feature) {
    features[feature.key] = {
      id: feature.id,
      key: feature.key,
      experimentsMap: (feature.experimentIds || []).reduce(function(experiments, experimentId) {
        var experimentKey = configObj.experimentIdMap[experimentId].key;
        experiments[experimentKey] = allExperiments[experimentKey];
        return experiments;
      }, {}),
      variablesMap: (feature.variables || []).reduce(function(variables, variable) {
        variables[variable.key] = {
          id: variable.id,
          key: variable.key,
          type: variable.type,
          value: variable.defaultValue,
        };
        return variables;
      }, {}),
    };
    return features;
  }, {});
}

module.exports = {
  getOptimizelyConfig: function(configObj) {
    // Fetch all feature variables from feature flags to merge them with variation variables
    var experimentsMap = getExperimentsMap(configObj);
    return {
      experimentsMap: experimentsMap,
      featuresMap: getFeaturesMap(configObj, experimentsMap),
      revision: configObj.revision,
    };
  },
};


/***/ }),
/* 55 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * Copyright 2019, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var fns = __webpack_require__(11);

/**
 * Return true if the argument is a valid event batch size, false otherwise
 * @param {*} eventBatchSize
 * @returns boolean
 */
function validateEventBatchSize(eventBatchSize) {
  return fns.isSafeInteger(eventBatchSize) && eventBatchSize >= 1;
}

/**
 * Return true if the argument is a valid event flush interval, false otherwise
 * @param {*} eventFlushInterval
 * @returns boolean
 */
function validateEventFlushInterval(eventFlushInterval) {
  return fns.isSafeInteger(eventFlushInterval) && eventFlushInterval > 0;
}

module.exports = {
  validateEventBatchSize: validateEventBatchSize,
  validateEventFlushInterval: validateEventFlushInterval,
};


/***/ })
/******/ ]);
});