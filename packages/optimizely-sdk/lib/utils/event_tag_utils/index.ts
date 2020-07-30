/**
 * Copyright 2017, 2019-2020 Optimizely
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
import { sprintf } from '@optimizely/js-sdk-utils';

import { EventTags } from '../../../../event-processor/src/events';
import { LoggerFacade } from '../../../../logging/src/models';

import {
  LOG_LEVEL,
  LOG_MESSAGES,
  RESERVED_EVENT_KEYWORDS,
} from '../enums';

/**
 * Provides utility method for parsing event tag values
 */
var MODULE_NAME = 'EVENT_TAG_UTILS';
var REVENUE_EVENT_METRIC_NAME = RESERVED_EVENT_KEYWORDS.REVENUE;
var VALUE_EVENT_METRIC_NAME = RESERVED_EVENT_KEYWORDS.VALUE;

/**
 * Grab the revenue value from the event tags. "revenue" is a reserved keyword.
 * @param {EventTags} eventTags
 * @param {LoggerFacade} logger
 * @return {number|null}
 */

export function getRevenueValue(eventTags: EventTags, logger: LoggerFacade): number | null {
  if (eventTags && eventTags.hasOwnProperty(REVENUE_EVENT_METRIC_NAME)) {
    var rawValue = eventTags[REVENUE_EVENT_METRIC_NAME];
    var parsedRevenueValue = parseInt(rawValue as any);
      if (isNaN(parsedRevenueValue)) {
        logger.log(LOG_LEVEL.INFO, sprintf(LOG_MESSAGES.FAILED_TO_PARSE_REVENUE, MODULE_NAME, rawValue));
        return null;
      }
      logger.log(LOG_LEVEL.INFO, sprintf(LOG_MESSAGES.PARSED_REVENUE_VALUE, MODULE_NAME, parsedRevenueValue));
      return parsedRevenueValue;
    }
  return null;
};

/**
 * Grab the event value from the event tags. "value" is a reserved keyword.
 * @param {object} eventTags
 * @param {object} logger
 * @return {mumber|null}
 */
export function getEventValue(eventTags: EventTags, logger: LoggerFacade): number | null {
  if (eventTags && eventTags.hasOwnProperty(VALUE_EVENT_METRIC_NAME)) {
    var rawValue = eventTags[VALUE_EVENT_METRIC_NAME];
      var parsedEventValue = parseFloat(rawValue as any);
      if (isNaN(parsedEventValue)) {
        logger.log(LOG_LEVEL.INFO, sprintf(LOG_MESSAGES.FAILED_TO_PARSE_VALUE, MODULE_NAME, rawValue));
        return null;
      }
      logger.log(LOG_LEVEL.INFO, sprintf(LOG_MESSAGES.PARSED_NUMERIC_VALUE, MODULE_NAME, parsedEventValue));
      return parsedEventValue;
  }
  return null;
};
