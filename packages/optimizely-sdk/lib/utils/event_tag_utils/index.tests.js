/**
 * Copyright 2017, 2020, Optimizely
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

import * as eventTagUtils from './';

describe('lib/utils/event_tag_utils', function() {
  var mockLogger;
  beforeEach(function() {
    mockLogger = {
      log: sinon.stub(),
    };
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
          var logMessage = mockLogger.log.args[0][1];
          assert.strictEqual(logMessage, 'EVENT_TAG_UTILS: Parsed revenue value "1337" from event tags.');

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

          var logMessage = mockLogger.log.args[0][1];
          assert.strictEqual(logMessage, 'EVENT_TAG_UTILS: Failed to parse revenue value "invalid" from event tags.');
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
          var logMessage = mockLogger.log.args[0][1];
          assert.strictEqual(logMessage, 'EVENT_TAG_UTILS: Parsed event value "1337" from event tags.');

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

          var logMessage = mockLogger.log.args[0][1];
          assert.strictEqual(logMessage, 'EVENT_TAG_UTILS: Failed to parse event value "invalid" from event tags.');
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
