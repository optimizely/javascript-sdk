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
var LogLevel = require('@optimizely/js-sdk-logging').LogLevel;
var sprintf = require('@optimizely/js-sdk-utils').sprintf;

function getLogLevelName(level) {
  switch(level) {
    case LogLevel.INFO: return 'INFO';
    case LogLevel.ERROR: return 'ERROR';
    case LogLevel.WARNING: return 'WARNING';
    case LogLevel.DEBUG: return 'DEBUG';
    default: return 'NOTSET';
  }
}

function ReactNativeLogger() {}

ReactNativeLogger.prototype.log = function(level, message) {
  var formattedMessage = sprintf('[OPTIMIZELY] - %s %s %s', getLogLevelName(level), new Date().toISOString(), message);
  switch (level) {
    case LogLevel.INFO: console.info(formattedMessage); break;
    case LogLevel.ERROR:
    case LogLevel.WARNING: console.warn(formattedMessage); break;
    case LogLevel.DEBUG:
    case LogLevel.NOTSET: console.log(formattedMessage); break;
  }
};

function NoOpLogger() {}

NoOpLogger.prototype.log = function() {};

module.exports = {
  createLogger: function() {
    return new ReactNativeLogger();
  },

  createNoOpLogger: function() {
    return new NoOpLogger();
  },
};
