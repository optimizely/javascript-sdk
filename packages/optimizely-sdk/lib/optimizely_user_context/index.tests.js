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
import { OptimizelyDecideOptions } from '../shared_types';

import logger from '../plugins/logger';
import eventDispatcher from '../plugins/event_dispatcher/index.node';
import errorHandler from '../plugins/error_handler';
import * as jsonSchemaValidator from '../utils/json_schema_validator';
import * as projectConfigManager from '../core/project_config/project_config_manager';
import * as projectConfig from '../core/project_config';
import { getTestDecideProjectConfig } from '../tests/test_data';
import {
   LOG_LEVEL,
   DECISION_MESSAGES,
 } from '../utils/enums';

describe('lib/optimizely_user_context', function() {
  describe('APIs', function() {
    var optimizely;
    var createdLogger = logger.createLogger({
      logLevel: LOG_LEVEL.DEBUG,
      logToConsole: false,
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

    describe('#decide', function() {
      var userId = 'tester';
      var projectConfigManagerStub;
      beforeEach(function() {
        projectConfigManagerStub = sinon.stub(projectConfigManager, 'createProjectConfigManager').callsFake(function(config) {
          var currentConfig = config.datafile ? projectConfig.createProjectConfig(config.datafile) : null;
          return {
            getConfig: sinon.stub().returns(currentConfig),
            onUpdate: sinon.stub().returns(function() {}),
            onReady: sinon.stub().returns({ then: function() {} }),
          };
        });
        optimizely = new Optimizely({
          clientEngine: 'node-sdk',
          datafile: getTestDecideProjectConfig(),
          errorHandler: errorHandler,
          eventDispatcher: eventDispatcher,
          jsonSchemaValidator: jsonSchemaValidator,
          logger: createdLogger,
          isValidInstance: true,
          defaultDecideOptions: [],
        });

        sinon.stub(eventDispatcher, 'dispatchEvent');
        sinon.stub(errorHandler, 'handleError');
      });

      afterEach(function() {
        projectConfigManagerStub.restore();
        eventDispatcher.dispatchEvent.restore();
        errorHandler.handleError.restore();
      });

      describe('with empty decide options', function() {
        it('it should return error decision object when provided flagKey is invalid and do not dispatch an event', function() {
          var flagKey = 'invalid_flag_key';
          var variablesExpected = optimizely.getAllFeatureVariables(flagKey, userId);
          var user = new OptimizelyUserContext({
            optimizely,
            userId,
          });
          var decision = user.decide(flagKey);
          var expectedDecisionObj = {
            variationKey: null,
            enabled: false,
            variables: variablesExpected,
            ruleKey: null,
            flagKey: flagKey,
            userContext: user,
            reasons: [ sprintf(DECISION_MESSAGES.FLAG_KEY_INVALID, flagKey) ],
          }
          assert.deepEqual(decision, expectedDecisionObj);
          sinon.assert.notCalled(optimizely.eventDispatcher.dispatchEvent);
        });

        it('it should return error decision object when SDK is not ready', function() {
          var flagKey = 'invalid_flag_key';
          var newConfig = optimizely.projectConfigManager.getConfig();
          newConfig = null;
          optimizely.projectConfigManager.getConfig.returns(newConfig);
          var variablesExpected = optimizely.getAllFeatureVariables(flagKey, userId);
          var user = new OptimizelyUserContext({
            optimizely,
            userId,
          });
          var decision = user.decide(flagKey);
          var expectedDecisionObj = {
            variationKey: null,
            enabled: false,
            variables: variablesExpected,
            ruleKey: null,
            flagKey: flagKey,
            userContext: user,
            reasons: [ DECISION_MESSAGES.SDK_NOT_READY ],
          }
          assert.deepEqual(decision, expectedDecisionObj);
          sinon.assert.notCalled(optimizely.eventDispatcher.dispatchEvent);
        });

        it('should make a decision for feature_test and dispatch an event', function() {
          var flagKey = 'feature_2';
          var variablesExpected = optimizely.getAllFeatureVariables(flagKey, userId);
          var user = new OptimizelyUserContext({
            optimizely,
            userId,
          });
          var decision = user.decide(flagKey);
          var expectedDecisionObj = {
            variationKey: 'variation_with_traffic',
            enabled: true,
            variables: variablesExpected,
            ruleKey: 'exp_no_audience',
            flagKey: flagKey,
            userContext: user,
            reasons: [],
          }
          assert.deepEqual(decision, expectedDecisionObj);
          //TODO: figure out stubbing of eventDispatcher
          // sinon.assert.calledOnce(optimizely.eventDispatcher.dispatchEvent);
        });

        it('should make a decision for rollout and dispatch an event', function() {
          var flagKey = "feature_1";
          var variablesExpected = optimizely.getAllFeatureVariables(flagKey, userId);
          var user = new OptimizelyUserContext({
            optimizely,
            userId,
          });
          var decision = user.decide(flagKey);
          var expectedDecisionObj = {
            variationKey: '18257766532',
            enabled: true,
            variables: variablesExpected,
            ruleKey: '18322080788',
            flagKey: flagKey,
            userContext: user,
            reasons: [],
          }
          assert.deepEqual(decision, expectedDecisionObj);
          //TODO: figure out stubbing of eventDispatcher
          // sinon.assert.calledOnce(optimizely.eventDispatcher.dispatchEvent);
        });

        it('should make a decision when variation is null and dispatch an event', function() {
          var flagKey = "feature_3";
          var variablesExpected = optimizely.getAllFeatureVariables(flagKey, userId);
          var user = new OptimizelyUserContext({
            optimizely,
            userId,
          });
          var decision = user.decide(flagKey);
          var expectedDecisionObj = {
            variationKey: '',
            enabled: false,
            variables: variablesExpected,
            ruleKey: '',
            flagKey: flagKey,
            userContext: user,
            reasons: [],
          }
          assert.deepEqual(decision, expectedDecisionObj);
          //TODO: figure out stubbing of eventDispatcher
          // sinon.assert.calledOnce(optimizely.eventDispatcher.dispatchEvent);
        });
      });

      describe('with EXCLUDE_VARIABLES flag in decide options', function() {
        it('should exclude variables in decision object and dispatch an event', function() {
          var flagKey = 'feature_2';
          var user = new OptimizelyUserContext({
            optimizely,
            userId
          });
          var decision = user.decide(flagKey, [ OptimizelyDecideOptions.EXCLUDE_VARIABLES ]);
          var expectedDecisionObj = {
            variationKey: 'variation_with_traffic',
            enabled: true,
            variables: {},
            ruleKey: 'exp_no_audience',
            flagKey: flagKey,
            userContext: user,
            reasons: [],
          }
          assert.deepEqual(decision, expectedDecisionObj);
          //TODO: figure out stubbing of eventDispatcher
          // sinon.assert.calledOnce(optimizely.eventDispatcher.dispatchEvent);
        });
      });

      describe('with DISABLE_DECISION_EVENT flag in decide options', function() {
        it('should not send an event', function() {
          var flagKey = 'feature_2';
          var user = new OptimizelyUserContext({
            optimizely,
            userId
          });
          var variablesExpected = optimizely.getAllFeatureVariables(flagKey, userId);
          var decision = user.decide(flagKey, [ OptimizelyDecideOptions.DISABLE_DECISION_EVENT ]);
          var expectedDecisionObj = {
            variationKey: 'variation_with_traffic',
            enabled: true,
            variables: variablesExpected,
            ruleKey: 'exp_no_audience',
            flagKey: flagKey,
            userContext: user,
            reasons: [],
          }
          assert.deepEqual(decision, expectedDecisionObj);
          //TODO: figure out stubbing of eventDispatcher
          sinon.assert.notCalled(optimizely.eventDispatcher.dispatchEvent);
        });
      });
    });
  });
});
