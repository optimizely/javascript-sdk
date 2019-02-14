/**
 * Copyright 2017, 2019, Optimizely
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
var uuid = require('uuid');
var _isFinite = require('lodash/isFinite');
var MAX_NUMBER_LIMIT = Math.pow(2, 53);

module.exports = {
  assign: require('lodash/assign'),
  assignIn: require('lodash/assignIn'),
  cloneDeep: require('lodash/cloneDeep'),
  currentTimestamp: function() {
    return Math.round(new Date().getTime());
  },
  isArray: require('lodash/isArray'),
  isEmpty: require('lodash/isEmpty'),
  isFinite: function(number) {
    return _isFinite(number) && Math.abs(number) <= MAX_NUMBER_LIMIT;
  },
  keyBy: require('lodash/keyBy'),
  filter: require('lodash/filter'),
  forEach: require('lodash/forEach'),
  forOwn: require('lodash/forOwn'),
  map: require('lodash/map'),
  uuid: function() {
    return uuid.v4();
  },
  values: require('lodash/values'),
  isNumber: require('lodash/isNumber'),
};
