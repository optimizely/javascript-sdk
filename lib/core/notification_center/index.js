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

var enums = require('../../utils/enums');
var fns = require('../../utils/fns');
var sprintf = require('sprintf');

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
 * @returns {Object}
 */
function NotificationCenter(options) {
  this.logger = options.logger;
  this.__notificationListeners = {};
  fns.forOwn(enums.NOTIFICATION_TYPES, function(notificationTypeEnum) {
    this.__notificationListeners[notificationTypeEnum] = [];
  }.bind(this));
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
  var isNotificationTypeValid = fns.values(enums.NOTIFICATION_TYPES)
    .indexOf(notificationType) > -1;
  if (!isNotificationTypeValid) {
    return -1;
  }

  if (!this.__notificationListeners[notificationType]) {
    this.__notificationListeners[notificationType] = [];
  }

  var callbackAlreadyAdded = false;
  fns.forEach(this.__notificationListeners[notificationType], function(listenerEntry) {
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
};

/**
 * Remove a previously added notification callback
 * @param {number} listenerId ID of listener to be removed
 * @returns {boolean} Returns true if the listener was found and removed, and false
 * otherwise.
 */
NotificationCenter.prototype.removeNotificationListener = function(listenerId) {
  var indexToRemove;
  var typeToRemove;
  fns.forOwn(this.__notificationListeners, function(listenersForType, notificationType) {
    fns.forEach(listenersForType, function(listenerEntry, i) {
      if (listenerEntry.id === listenerId) {
        indexToRemove = i;
        typeToRemove = notificationType;
        return false;
      }
    });
    if (indexToRemove !== undefined && typeToRemove !== undefined) {
      return false;
    }
  });

  if (indexToRemove !== undefined && typeToRemove !== undefined) {
    this.__notificationListeners[typeToRemove].splice(indexToRemove, 1);
    return true;
  }

  return false;
};

/**
 * Removes all previously added notification listeners, for all notification types
 */
NotificationCenter.prototype.clearAllNotificationListeners = function() {
  fns.forOwn(enums.NOTIFICATION_TYPES, function(notificationTypeEnum) {
    this.__notificationListeners[notificationTypeEnum] = [];
  }.bind(this));
};

/**
 * Remove all previously added notification listeners for the argument type
 * @param {string} notificationType One of enums.NOTIFICATION_TYPES
 */
NotificationCenter.prototype.clearNotificationListeners = function(notificationType) {
  this.__notificationListeners[notificationType] = [];
};

/**
 * Fires notifications for the argument type. All registered callbacks for this type will be
 * called. The notificationData object will be passed on to callbacks called.
 * @param {string} notificationType One of enums.NOTIFICATION_TYPES
 * @param {Object} notificationData Will be passed to callbacks called
 */
NotificationCenter.prototype.sendNotifications = function(notificationType, notificationData) {
  fns.forEach(this.__notificationListeners[notificationType], function(listenerEntry) {
    var callback = listenerEntry.callback;
    try {
      callback(notificationData);
    } catch (ex) {
      this.logger.log(LOG_LEVEL.ERROR, sprintf(LOG_MESSAGES.NOTIFICATION_LISTENER_EXCEPTION, MODULE_NAME, notificationType, ex.message));
    }
  }.bind(this));
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
