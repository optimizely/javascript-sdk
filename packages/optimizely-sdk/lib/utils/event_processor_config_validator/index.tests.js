/**
 * Copyright 2019-2020, Optimizely
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
import { assert } from 'chai';

import eventProcessorConfigValidator from './index';

describe('utils/event_processor_config_validator', function() {
  describe('validateEventFlushInterval', function() {
    it('returns false for null & undefined', function() {
      assert.isFalse(eventProcessorConfigValidator.validateEventFlushInterval(null));
      assert.isFalse(eventProcessorConfigValidator.validateEventFlushInterval(undefined));
    });

    it('returns false for a string', function() {
      assert.isFalse(eventProcessorConfigValidator.validateEventFlushInterval('not a number'));
    });

    it('returns false for an object', function() {
      assert.isFalse(eventProcessorConfigValidator.validateEventFlushInterval({ value: 'not a number' }));
    });

    it('returns false for a negative integer', function() {
      assert.isFalse(eventProcessorConfigValidator.validateEventFlushInterval(-1000));
    });

    it('returns false for 0', function() {
      assert.isFalse(eventProcessorConfigValidator.validateEventFlushInterval(0));
    });

    it('returns true for a positive integer', function() {
      assert.isTrue(eventProcessorConfigValidator.validateEventFlushInterval(30000));
    });
  });

  describe('validateEventBatchSize', function() {
    it('returns false for null & undefined', function() {
      assert.isFalse(eventProcessorConfigValidator.validateEventBatchSize(null));
      assert.isFalse(eventProcessorConfigValidator.validateEventBatchSize(undefined));
    });

    it('returns false for a string', function() {
      assert.isFalse(eventProcessorConfigValidator.validateEventBatchSize('not a number'));
    });

    it('returns false for an object', function() {
      assert.isFalse(eventProcessorConfigValidator.validateEventBatchSize({ value: 'not a number' }));
    });

    it('returns false for a negative integer', function() {
      assert.isFalse(eventProcessorConfigValidator.validateEventBatchSize(-1000));
    });

    it('returns false for 0', function() {
      assert.isFalse(eventProcessorConfigValidator.validateEventBatchSize(0));
    });

    it('returns true for a positive integer', function() {
      assert.isTrue(eventProcessorConfigValidator.validateEventBatchSize(10));
    });
  });
});
