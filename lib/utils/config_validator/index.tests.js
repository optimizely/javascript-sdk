/**
 * Copyright 2016, 2018-2020, 2022, Optimizely
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
import { sprintf } from '../../utils/fns';

import configValidator from './';
import testData from '../../tests/test_data';
import {
  INVALID_DATAFILE_MALFORMED,
  INVALID_DATAFILE_VERSION,
  INVALID_ERROR_HANDLER,
  INVALID_EVENT_DISPATCHER,
  INVALID_LOGGER,
  NO_DATAFILE_SPECIFIED,
} from '../../error_messages';

describe('lib/utils/config_validator', function() {
  describe('APIs', function() {
    describe('validate', function() {
      it('should complain if the provided error handler is invalid', function() {
        const ex = assert.throws(function() {
          configValidator.validate({
            errorHandler: {},
          });
        });
        assert.equal(ex.baseMessage, INVALID_ERROR_HANDLER);
      });

      it('should complain if the provided event dispatcher is invalid', function() {
        const ex = assert.throws(function() {
          configValidator.validate({
            eventDispatcher: {},
          });
        });
        assert.equal(ex.baseMessage, INVALID_EVENT_DISPATCHER);
      });

      it('should complain if the provided logger is invalid', function() {
        const ex  = assert.throws(function() {
          configValidator.validate({
            logger: {},
          });
        });
        assert.equal(ex.baseMessage, INVALID_LOGGER);
      });

      it('should complain if datafile is not provided', function() {
        const ex = assert.throws(function() {
          configValidator.validateDatafile();
        });
        assert.equal(ex.baseMessage, NO_DATAFILE_SPECIFIED);
      });

      it('should complain if datafile is malformed', function() {
        const ex = assert.throws(function() {
          configValidator.validateDatafile('abc');
        });
        assert.equal(ex.baseMessage, INVALID_DATAFILE_MALFORMED);
      });

      it('should complain if datafile version is not supported', function() {
        const ex = assert.throws(function() {
          configValidator.validateDatafile(JSON.stringify(testData.getUnsupportedVersionConfig()));
        });
        assert.equal(ex.baseMessage, INVALID_DATAFILE_VERSION);
        assert.deepEqual(ex.params, ['5']);
      });

      it('should not complain if datafile is valid', function() {
        assert.doesNotThrow(function() {
          configValidator.validateDatafile(JSON.stringify(testData.getTestProjectConfig()));
        });
      });
    });
  });
});
