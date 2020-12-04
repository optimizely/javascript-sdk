/****************************************************************************
 * Copyright 2020, Optimizely, Inc. and contributors                   *
 *                                                                          *
 * Licensed under the Apache License, Version 2.0 (the "License");          *
 * you may not use this file except in compliance with the License.         *
 * You may obtain a copy of the License at                                  *
 *                                                                          *
 *    http://www.apache.org/licenses/LICENSE-2.0                            *
 *                                                                          *
 * Unless required by applicable law or agreed to in writing, software      *
 * distributed under the License is distributed on an "AS IS" BASIS,        *
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. *
 * See the License for the specific language governing permissions and      *
 * limitations under the License.                                           *
 ***************************************************************************/
import { assert } from 'chai';
import sinon from 'sinon';
import { sprintf } from '@optimizely/js-sdk-utils';


import OptimizelyUserContext from './';
import Optimizely from '../optimizely';

import logger from '../plugins/logger';
import eventDispatcher from '../plugins/event_dispatcher/index.node';
import errorHandler from '../plugins/error_handler';
import * as jsonSchemaValidator from '../utils/json_schema_validator';;
import { getTestDecideProjectConfig } from '../tests/test_data';
import {
   LOG_LEVEL,
 } from '../utils/enums';

describe('lib/optimizely_user_context', function() {
  describe('APIs', function() {
    var createdLogger = logger.createLogger({
      logLevel: LOG_LEVEL.DEBUG,
      logToConsole: false,
    });
    var optimizely;
    beforeEach(function() {
      // TODO: replace with fakeOptimizely
      optimizely = new Optimizely({
        clientEngine: 'node-sdk',
        datafile: getTestDecideProjectConfig(),
        errorHandler: errorHandler,
        eventDispatcher: eventDispatcher,
        jsonSchemaValidator: jsonSchemaValidator,
        logger: createdLogger,
        isValidInstance: true,
      });
    });
    describe('#setAttribute', function() {
      it('should set attributes when provided at instantiation of OptimizelyUserContext', function() {
        var userId = 'user1';
        var attributes = { test_attribute: 'test_value' };
        var user = new OptimizelyUserContext({
          optimizely,
          userId,
          attributes
        });
        user.setAttribute('k1', {'hello': 'there'});
        user.setAttribute('k2', true);
        user.setAttribute('k3', 100);
        user.setAttribute('k4', 3.5);
        assert.deepEqual(user.getOptimizely(), optimizely);
        assert.deepEqual(user.getUserId(), userId);

        var newAttributes = user.getAttributes();
        assert.deepEqual(newAttributes['test_attribute'], 'test_value');
        assert.deepEqual(newAttributes['k1'], {'hello': 'there'});
        assert.deepEqual(newAttributes['k2'], true);
        assert.deepEqual(newAttributes['k3'], 100);
        assert.deepEqual(newAttributes['k4'], 3.5);
      });

      it('should set attributes when none provided at instantiation of OptimizelyUserContext', function() {
        var userId = 'user2';
        var user = new OptimizelyUserContext({
          optimizely,
          userId,
        });
        user.setAttribute('k1', {'hello': 'there'});
        user.setAttribute('k2', true);
        user.setAttribute('k3', 100);
        user.setAttribute('k4', 3.5);
        assert.deepEqual(user.getOptimizely(), optimizely);
        assert.deepEqual(user.getUserId(), userId);

        var newAttributes = user.getAttributes();
        assert.deepEqual(newAttributes['k1'], {'hello': 'there'});
        assert.deepEqual(newAttributes['k2'], true);
        assert.deepEqual(newAttributes['k3'], 100);
        assert.deepEqual(newAttributes['k4'], 3.5);
      });

      it('should override existing attributes', function() {
        var userId = 'user3';
        var attributes = { test_attribute: 'test_value' };
        var user = new OptimizelyUserContext({
          optimizely,
          userId,
          attributes,
        });
        user.setAttribute('k1', {'hello': 'there'});
        user.setAttribute('test_attribute', 'overwritten_value');
        assert.deepEqual(user.getOptimizely(), optimizely);
        assert.deepEqual(user.getUserId(), userId);

        var newAttributes = user.getAttributes();
        assert.deepEqual(newAttributes['k1'], {'hello': 'there'});
        assert.deepEqual(newAttributes['test_attribute'], 'overwritten_value');
        assert.deepEqual(Object.keys(newAttributes).length, 2);
      });

      it('should allow to set attributes with value of null', function() {
        var userId = 'user4';
        var user = new OptimizelyUserContext({
          optimizely,
          userId,
        });
        user.setAttribute('null_attribute', null);
        assert.deepEqual(user.getOptimizely(), optimizely);
        assert.deepEqual(user.getUserId(), userId);

        var newAttributes = user.getAttributes();
        assert.deepEqual(newAttributes['null_attribute'], null);
      });
    });
  });
});
