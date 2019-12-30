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

var fns = require('../../utils/fns');
var sprintf = require('@optimizely/js-sdk-utils').sprintf;
var logging = require('@optimizely/js-sdk-logging');
var configValidator = require('../../utils/config_validator');
var datafileManager = require('@optimizely/js-sdk-datafile-manager');
var enums = require('../../utils/enums');
var projectConfig = require('../../core/project_config');
var optimizelyConfig = require('../optimizely_config');

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
    this.__readyPromise = this.datafileManager.onReady().then(
      this.__onDatafileManagerReadyFulfill.bind(this),
      this.__onDatafileManagerReadyReject.bind(this)
    );
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
}

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
