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
        assert.throws(function() {
          configValidator.validate({
            errorHandler: {},
          });
        }, sprintf(INVALID_ERROR_HANDLER, 'CONFIG_VALIDATOR'));
      });

      it('should complain if the provided event dispatcher is invalid', function() {
        assert.throws(function() {
          configValidator.validate({
            eventDispatcher: {},
          });
        }, sprintf(INVALID_EVENT_DISPATCHER, 'CONFIG_VALIDATOR'));
      });

      it('should complain if the provided logger is invalid', function() {
        assert.throws(function() {
          configValidator.validate({
            logger: {},
          });
        }, sprintf(INVALID_LOGGER, 'CONFIG_VALIDATOR'));
      });

      it('should complain if datafile is not provided', function() {
        assert.throws(function() {
          configValidator.validateDatafile();
        }, sprintf(NO_DATAFILE_SPECIFIED, 'CONFIG_VALIDATOR'));
      });

      it('should complain if datafile is malformed', function() {
        assert.throws(function() {
          configValidator.validateDatafile('abc');
        }, sprintf(INVALID_DATAFILE_MALFORMED, 'CONFIG_VALIDATOR'));
      });

      it('should complain if datafile version is not supported', function() {
        assert.throws(function() {
          configValidator.validateDatafile(JSON.stringify(testData.getUnsupportedVersionConfig()));
        }, sprintf(INVALID_DATAFILE_VERSION, 'CONFIG_VALIDATOR', '5'));
      });

      it('should not complain if datafile is valid', function() {
        assert.doesNotThrow(function() {
          configValidator.validateDatafile(JSON.stringify(testData.getTestProjectConfig()));
        });
      });
    });
  });
});
