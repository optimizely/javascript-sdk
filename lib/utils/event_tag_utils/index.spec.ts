/**
 * Copyright 2025, Optimizely
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

import { describe, it, expect, beforeEach } from 'vitest';
import { sprintf } from '../../utils/fns';

import * as eventTagUtils from './';
import {
  FAILED_TO_PARSE_REVENUE,
  PARSED_REVENUE_VALUE,
  PARSED_NUMERIC_VALUE,
  FAILED_TO_PARSE_VALUE,
} from 'log_message';

const buildLogMessageFromArgs = args => sprintf(args[1], ...args.splice(2));
import { getMockLogger } from '../../tests/mock/mock_logger';
import { LoggerFacade } from '../../logging/logger';

describe('getRevenueValue', () => {
  let logger: LoggerFacade;

  beforeEach(() => {
    logger = getMockLogger();
  });

  it('should return the parseed integer for a valid revenue value', () => {
    let parsedRevenueValue = eventTagUtils.getRevenueValue({ revenue: '1337' }, logger);

    expect(parsedRevenueValue).toBe(1337);
    expect(logger.info).toHaveBeenCalledWith(PARSED_REVENUE_VALUE, 1337);

    parsedRevenueValue = eventTagUtils.getRevenueValue({ revenue: '13.37' }, logger);

    expect(parsedRevenueValue).toBe(13);
  });

  it('should return null and log a message for invalid value', () => {
    const parsedRevenueValue = eventTagUtils.getRevenueValue({ revenue: 'invalid' }, logger);

    expect(parsedRevenueValue).toBe(null);
    expect(logger.info).toHaveBeenCalledWith(FAILED_TO_PARSE_REVENUE, 'invalid');
  });

  it('should return null if the revenue value is not present in the event tags', () => {
    const parsedRevenueValue = eventTagUtils.getRevenueValue({ not_revenue: '1337' }, logger);

    expect(parsedRevenueValue).toBe(null);
  });
});

describe('getEventValue', () => {
  let logger: LoggerFacade;

  beforeEach(() => {
    logger = getMockLogger();
  });

  it('should return the parsed integer for a valid numeric value', () => {
    const parsedNumericValue = eventTagUtils.getEventValue({ value: '1337' }, logger);

    expect(parsedNumericValue).toBe(1337);
    expect(logger.info).toHaveBeenCalledWith(PARSED_NUMERIC_VALUE, 1337);
  });

  it('should return null and log a message for invalid value', () => {
    const parsedNumericValue = eventTagUtils.getEventValue({ value: 'invalid' }, logger);

    expect(parsedNumericValue).toBe(null);
    expect(logger.info).toHaveBeenCalledWith(FAILED_TO_PARSE_VALUE, 'invalid');
  });

  it('should return null if the value is not present in the event tags', () => {
    const parsedNumericValue = eventTagUtils.getEventValue({ not_value: '13.37' }, logger);

    expect(parsedNumericValue).toBe(null);
  });
})
