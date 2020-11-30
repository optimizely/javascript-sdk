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
import cloneDeep from 'lodash/cloneDeep';
import sinon from 'sinon';


import OptimizelyUserContext from './';
import Optimizely from '../optimizely';

import logger from '../plugins/logger';
import eventDispatcher from '../plugins/event_dispatcher/index.node';
import errorHandler from '../plugins/error_handler';
import { getTestProjectConfig } from '../tests/test_data';
import {
   LOG_LEVEL,
   LOG_MESSAGES,
   DECISION_SOURCES,
 } from '../utils/enums';

var testData = getTestProjectConfig();

describe('lib/optimizely_user_context', function() {
  describe('APIs', function() {
    var optlyInstance;
    var createdLogger = logger.createLogger({
      logLevel: LOG_LEVEL.DEBUG,
    });
    beforeEach(function() {
      optlyInstance = new Optimizely({
        clientEngine: 'node-sdk',
        datafile: cloneDeep(testData),
        errorHandler: errorHandler,
        eventDispatcher: eventDispatcher,
        logger: createdLogger,
        isValidInstance: true,
      });

      sinon.stub(eventDispatcher, 'dispatchEvent');
      sinon.stub(errorHandler, 'handleError');
    });

    afterEach(function() {
      eventDispatcher.dispatchEvent.restore();
      errorHandler.handleError.restore();
    });

    describe('#setAttribute', function() {
      it('should set provided user attributes', function() {
        var userId = 'user1';
        var attributes = { test_attribute: 'test_value' };
        var user = optlyInstance.createUserContext(userId, attributes);
        user.setAttribute('k1', {'hello': 'there'});
        user.setAttribute('k2', true);
        user.setAttribute('k3', 100);
        user.setAttribute('k4', 3.5);
        assert.deepEqual(user.getOptimizely(), optlyInstance);
        assert.deepEqual(user.getUserId(), userId);

        var newAttributes = user.getAttributes();
        assert.deepEqual(newAttributes['test_attribute'], 'test_value');
        assert.deepEqual(newAttributes['k1'], {'hello': 'there'});
        assert.deepEqual(newAttributes['k2'], true);
        assert.deepEqual(newAttributes['k3'], 100);
        assert.deepEqual(newAttributes['k4'], 3.5);
      });
    });
  });
});
