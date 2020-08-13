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
import * as utils from './utils-pkg'

var MAX_SAFE_INTEGER_LIMIT = Math.pow(2, 53);
var uuid = utils.generateUUID;

export var assign = function (target) {
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
};

export var currentTimestamp = function () {
  return Math.round(new Date().getTime());
};

export var isSafeInteger = function (number) {
  return typeof number == 'number' && Math.abs(number) <= MAX_SAFE_INTEGER_LIMIT;
};

export var keyBy = function (arr, key) {
  if (!arr) return {};
  return utils.keyBy(arr, function (item) {
    return item[key];
  });
};

export { uuid };

export var isNumber = function (value) {
  return typeof value === 'number';
};

export var sprintf = utils.sprintf;
export var getTimestamp = utils.getTimestamp;
export var isValidEnum = utils.isValidEnum;
export var groupBy = utils.groupBy;
export var objectValues = utils.objectValues;
export var objectEntries = utils.objectEntries;
export var find = utils.find;

export default {
  assign: assign,
  currentTimestamp: currentTimestamp,
  isSafeInteger: isSafeInteger,
  keyBy: keyBy,
  uuid: uuid,
  isNumber: isNumber,
  sprintf: sprintf,
  getTimestamp: getTimestamp,
  isValidEnum: isValidEnum,
  groupBy: groupBy,
  objectValues: objectValues,
  objectEntries: objectEntries,
  find: find
};
