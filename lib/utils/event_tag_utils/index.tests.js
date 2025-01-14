/**
 * Copyright 2017, 2020, 2022, Optimizely
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
import sinon from 'sinon';
import { assert } from 'chai';
import { sprintf } from '../../utils/fns';

import * as eventTagUtils from './';
import { FAILED_TO_PARSE_REVENUE, PARSED_REVENUE_VALUE, PARSED_NUMERIC_VALUE, FAILED_TO_PARSE_VALUE } from '../../log_messages';

var buildLogMessageFromArgs = args => sprintf(args[1], ...args.splice(2));

var createLogger = () => ({
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  child: () => createLogger(),
})

describe('lib/utils/event_tag_utils', function() {
  var mockLogger;
  beforeEach(function() {
    mockLogger = createLogger();
    sinon.stub(mockLogger, 'info');
  });

  describe('APIs', function() {
    describe('getRevenueValue', function() {
      describe('the revenue value is a valid number', function() {
        it('should return the parsed integer for the revenue value', function() {
          var parsedRevenueValue = eventTagUtils.getRevenueValue(
            {
              revenue: '1337',
            },
            mockLogger
          );

          assert.strictEqual(parsedRevenueValue, 1337);

          assert.strictEqual(mockLogger.info.args[0][0], PARSED_REVENUE_VALUE);
          assert.strictEqual(mockLogger.info.args[0][1], 1337);

          // test out a float
          parsedRevenueValue = eventTagUtils.getRevenueValue(
            {
              revenue: '13.37',
            },
            mockLogger
          );

          assert.strictEqual(parsedRevenueValue, 13);
        });
      });

      describe('the revenue value is not a valid number', function() {
        it('should return null and log a message', function() {
          var parsedRevenueValue = eventTagUtils.getRevenueValue(
            {
              revenue: 'invalid',
            },
            mockLogger
          );

          assert.strictEqual(parsedRevenueValue, null);

          assert.strictEqual(mockLogger.info.args[0][0], FAILED_TO_PARSE_REVENUE);
          assert.strictEqual(mockLogger.info.args[0][1], 'invalid');
        });
      });

      describe('the revenue value is not present in the event tags', function() {
        it('should return null', function() {
          var parsedRevenueValue = eventTagUtils.getRevenueValue(
            {
              not_revenue: '1337',
            },
            mockLogger
          );

          assert.strictEqual(parsedRevenueValue, null);
        });
      });
    });

    describe('getNumericValue', function() {
      describe('the event value is a valid number', function() {
        it('should return the parsed integer for the event value', function() {
          var parsedEventValue = eventTagUtils.getEventValue(
            {
              value: '1337',
            },
            mockLogger
          );

          assert.strictEqual(parsedEventValue, 1337);

          assert.strictEqual(mockLogger.info.args[0][0], PARSED_NUMERIC_VALUE);
          assert.strictEqual(mockLogger.info.args[0][1], 1337);

          // test out a float
          parsedEventValue = eventTagUtils.getEventValue(
            {
              value: '13.37',
            },
            mockLogger
          );

          assert.strictEqual(parsedEventValue, 13.37);
        });
      });

      describe('the event value is not a valid number', function() {
        it('should return null and log a message', function() {
          var parsedEventValue = eventTagUtils.getEventValue(
            {
              value: 'invalid',
            },
            mockLogger
          );

          assert.strictEqual(parsedEventValue, null);

          assert.strictEqual(mockLogger.info.args[0][0], FAILED_TO_PARSE_VALUE);
          assert.strictEqual(mockLogger.info.args[0][1], 'invalid');
        });
      });

      describe('the event value is not present in the event tags', function() {
        it('should return null', function() {
          var parsedEventValue = eventTagUtils.getEventValue(
            {
              not_value: '13.37',
            },
            mockLogger
          );

          assert.strictEqual(parsedEventValue, null);
        });
      });
    });
  });
});
