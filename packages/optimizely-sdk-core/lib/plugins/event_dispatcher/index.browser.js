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
var fns = require('../../utils/fns');

var POST_METHOD = 'POST';
var GET_METHOD = 'GET';
var READYSTATE_COMPLETE = 4;
var LOCAL_STORAGE_QUEUE_NAME = 'OptimizelyLocalStorageEventQueue';
module.exports = {


  queueEvent: function(eventObj) {
    // Check browser support
    if (typeof(Storage) !== "undefined") {
      var events = queue = localStorage.getItem(LOCAL_STORAGE_QUEUE_NAME);
      if (events !== null && events !== undefined) {
        events = JSON.parse(events);
      } else {
        events = [];
      }

      events.push(event);

      // Store
      localStorage.setItem(LOCAL_STORAGE_QUEUE_NAME, JSON.stringify(events));
    }
  },

  getQueuedEvent: function(index) {
    if (typeof(Storage) !== "undefined") {
      var events = queue = localStorage.getItem(LOCAL_STORAGE_QUEUE_NAME);
      if (events !== null && events !== undefined) {
        events = JSON.parse(events);
      } else {
        events = [];
      }

      var event = null;

      if (index < events.length) {
        event = events[index];
      }
      return event;

    } else {
      return null;
    }
  },

  removeEvent: function(eventToRemove) {
    if (typeof(Storage) !== "undefined") {
      var events = queue = localStorage.getItem(LOCAL_STORAGE_QUEUE_NAME);
      if (events !== null && events !== undefined) {
        events = JSON.parse(events);
      } else {
        events = [];
      }

      var event = null;

      if (events.length > 0) {
        // perfect, it is the first one in the queue.  just remove it.
        if (events[0] == eventToRemove) {
          event = events.shift();
        }
        else {
          var index = events.indexOf(eventToRemove);
          if (index > -1) {
            event = events[index];
            events.splice(index, 1);
          }
        }
        // Store
        localStorage.setItem(LOCAL_STORAGE_QUEUE_NAME, JSON.stringify(events));
      }
      return event;
    } else {
      return null;
    }
  },

  dequeuEvent: function() {
    if (typeof(Storage) !== "undefined") {
      var events = queue = localStorage.getItem(LOCAL_STORAGE_QUEUE_NAME);
      if (events !== null && events !== undefined) {
        events = JSON.parse(events);
      } else {
        events = [];
      }

      var event = null;

      if (events.length > 0) {
        event = events.shift();
      }

      // Store
      localStorage.setItem(LOCAL_STORAGE_QUEUE_NAME, JSON.stringify(events));
      return event;
    } else {
      return null;
    }
  },

  sendEvent: function(event, callback) {
    var url = eventObj.url;
    var params = eventObj.params;
    if (eventObj.httpVerb === POST_METHOD) {
      var req = new XMLHttpRequest();
      req.open(POST_METHOD, url, true);
      req.setRequestHeader('Content-Type', 'application/json');
      req.onreadystatechange = function() {
        if (req.readyState === READYSTATE_COMPLETE && callback && typeof callback === 'function') {
          callback(params);
        }
      };
      req.send(JSON.stringify(params));
    } else {
      // add param for cors headers to be sent by the log endpoint
      url += '?wxhr=true';
      if (params) {
        url += '&' + toQueryString(params);
      }

      var req = new XMLHttpRequest();
      req.open(GET_METHOD, url, true);
      req.onreadystatechange = function() {
        if (req.readyState === READYSTATE_COMPLETE && callback && typeof callback === 'function') {
          callback();
        }
      };
      req.send();
    }
  },

  /**
   * Sample event dispatcher implementation for tracking impression and conversions
   * Users of the SDK can provide their own implementation
   * @param  {Object} eventObj
   * @param  {Function} callback
   */
  dispatchEvent: function(eventObj, callback) {
    if (typeof(Storage) !== "undefined") {
      queueEvent(eventObj);
      var event = getQueuedEvent();
      while (event != null) {
        sendEvent(event, function () {
          removeEvent(event);
          callback();
        });
        event = getQueuedEvent();
      }
    }
    else {
      sendEvent(event, callback);
    }
  },
};

var toQueryString = function(obj) {
  return fns.map(obj, function(v, k) {
    return encodeURIComponent(k) + '=' + encodeURIComponent(v);
  }).join('&');
};
