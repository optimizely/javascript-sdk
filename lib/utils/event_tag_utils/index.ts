/**
 * Copyright 2017, 2019-2020, 2022-2024, Optimizely
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
import {
  FAILED_TO_PARSE_REVENUE,
  FAILED_TO_PARSE_VALUE,
  PARSED_NUMERIC_VALUE,
  PARSED_REVENUE_VALUE,
} from '../../log_messages';
import { EventTags } from '../../event_processor/event_builder/user_event';
import { LoggerFacade } from '../../modules/logging';

import {
  LOG_LEVEL,
  RESERVED_EVENT_KEYWORDS,
} from '../enums';

/**
 * Provides utility method for parsing event tag values
 */
const MODULE_NAME = 'EVENT_TAG_UTILS';
const REVENUE_EVENT_METRIC_NAME = RESERVED_EVENT_KEYWORDS.REVENUE;
const VALUE_EVENT_METRIC_NAME = RESERVED_EVENT_KEYWORDS.VALUE;

/**
 * Grab the revenue value from the event tags. "revenue" is a reserved keyword.
 * @param {EventTags} eventTags
 * @param {LoggerFacade} logger
 * @return {number|null}
 */
export function getRevenueValue(eventTags: EventTags, logger: LoggerFacade): number | null {
  const rawValue = eventTags[REVENUE_EVENT_METRIC_NAME];

  if (rawValue == null) { // null or undefined event values
    return null;
  }

  const parsedRevenueValue = typeof rawValue === 'string' ? parseInt(rawValue) : rawValue;

  if (isFinite(parsedRevenueValue)) {
    logger.log(LOG_LEVEL.INFO, PARSED_REVENUE_VALUE, MODULE_NAME, parsedRevenueValue);
    return parsedRevenueValue;
  } else { // NaN, +/- infinity values
    logger.log(LOG_LEVEL.INFO, FAILED_TO_PARSE_REVENUE, MODULE_NAME, rawValue);
    return null;
  }
}

/**
 * Grab the event value from the event tags. "value" is a reserved keyword.
 * @param {EventTags} eventTags
 * @param {LoggerFacade} logger
 * @return {number|null}
 */
export function getEventValue(eventTags: EventTags, logger: LoggerFacade): number | null {
  const rawValue = eventTags[VALUE_EVENT_METRIC_NAME];

  if (rawValue == null) { // null or undefined event values
    return null;
  }

  const parsedEventValue = typeof rawValue === 'string' ? parseFloat(rawValue) : rawValue;

  if (isFinite(parsedEventValue)) {
    logger.log(LOG_LEVEL.INFO, PARSED_NUMERIC_VALUE, MODULE_NAME, parsedEventValue);
    return parsedEventValue;
  } else { // NaN, +/- infinity values
    logger.log(LOG_LEVEL.INFO, FAILED_TO_PARSE_VALUE, MODULE_NAME, rawValue);
    return null;
  }
}
