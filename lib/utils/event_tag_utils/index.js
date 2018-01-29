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
 * Provides utility method for parsing event tag values
 */
var enums = require('../enums');
var sprintf = require('sprintf');

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
