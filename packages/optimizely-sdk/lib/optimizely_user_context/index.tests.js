/****************************************************************************
 * Copyright 2020-2022, Optimizely, Inc. and contributors                   *
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

import * as logging from '@optimizely/js-sdk-logging';
import { sprintf } from '../utils/fns';
import { NOTIFICATION_TYPES } from '../utils/enums';

import OptimizelyUserContext from './';
import { createLogger } from '../plugins/logger';
import { createEventProcessor } from '../plugins/event_processor';
import { createNotificationCenter } from '../core/notification_center';
import Optimizely from '../optimizely';
import errorHandler from '../plugins/error_handler';
import eventDispatcher from '../plugins/event_dispatcher/index.node';
import { CONTROL_ATTRIBUTES, LOG_LEVEL, LOG_MESSAGES } from '../utils/enums';
import testData from '../tests/test_data';
import { OptimizelyDecideOption } from '../shared_types';

describe('lib/optimizely_user_context', function() {
  describe('APIs', function() {
    var fakeOptimizely;
    var userId = 'tester';
    var options = 'fakeOption';
    describe('#setAttribute', function() {
      fakeOptimizely = {
        decide: sinon.stub().returns({})
      }
      it('should set attributes when provided at instantiation of OptimizelyUserContext', function() {
        var userId = 'user1';
        var attributes = { test_attribute: 'test_value' };
        var user = new OptimizelyUserContext({
          optimizely: fakeOptimizely,
          userId,
          attributes
        });
        user.setAttribute('k1', { 'hello': 'there' });
        user.setAttribute('k2', true);
        user.setAttribute('k3', 100);
        user.setAttribute('k4', 3.5);
        assert.deepEqual(user.getOptimizely(), fakeOptimizely);
        assert.deepEqual(user.getUserId(), userId);

        var newAttributes = user.getAttributes();
        assert.deepEqual(newAttributes['test_attribute'], 'test_value');
        assert.deepEqual(newAttributes['k1'], { 'hello': 'there' });
        assert.deepEqual(newAttributes['k2'], true);
        assert.deepEqual(newAttributes['k3'], 100);
        assert.deepEqual(newAttributes['k4'], 3.5);
      });

      it('should set attributes when none provided at instantiation of OptimizelyUserContext', function() {
        var userId = 'user2';
        var user = new OptimizelyUserContext({
          optimizely: fakeOptimizely,
          userId,
        });
        user.setAttribute('k1', { 'hello': 'there' });
        user.setAttribute('k2', true);
        user.setAttribute('k3', 100);
        user.setAttribute('k4', 3.5);
        assert.deepEqual(user.getOptimizely(), fakeOptimizely);
        assert.deepEqual(user.getUserId(), userId);

        var newAttributes = user.getAttributes();
        assert.deepEqual(newAttributes['k1'], { 'hello': 'there' });
        assert.deepEqual(newAttributes['k2'], true);
        assert.deepEqual(newAttributes['k3'], 100);
        assert.deepEqual(newAttributes['k4'], 3.5);
      });

      it('should override existing attributes', function() {
        var userId = 'user3';
        var attributes = { test_attribute: 'test_value' };
        var user = new OptimizelyUserContext({
          optimizely: fakeOptimizely,
          userId,
          attributes,
        });
        user.setAttribute('k1', { 'hello': 'there' });
        user.setAttribute('test_attribute', 'overwritten_value');
        assert.deepEqual(user.getOptimizely(), fakeOptimizely);
        assert.deepEqual(user.getUserId(), userId);

        var newAttributes = user.getAttributes();
        assert.deepEqual(newAttributes['k1'], { 'hello': 'there' });
        assert.deepEqual(newAttributes['test_attribute'], 'overwritten_value');
        assert.deepEqual(Object.keys(newAttributes).length, 2);
      });

      it('should allow to set attributes with value of null', function() {
        var userId = 'user4';
        var user = new OptimizelyUserContext({
          optimizely: fakeOptimizely,
          userId,
        });
        user.setAttribute('null_attribute', null);
        assert.deepEqual(user.getOptimizely(), fakeOptimizely);
        assert.deepEqual(user.getUserId(), userId);

        var newAttributes = user.getAttributes();
        assert.deepEqual(newAttributes['null_attribute'], null);
      });

      it('should set attributes by value in constructor', function() {
        var userId = 'user1';
        var attributes = { initial_attribute: 'initial_value' };
        var user = new OptimizelyUserContext({
          optimizely: fakeOptimizely,
          userId,
          attributes,
        });
        attributes["attribute2"] = 100;
        assert.deepEqual(user.getAttributes(), { initial_attribute: 'initial_value' });
        user.setAttribute("attribute3", "hello");
        assert.deepEqual(attributes, { initial_attribute: 'initial_value', 'attribute2': 100 });
      });

      it('should not change user attributes if returned by getAttributes object is updated', function() {
        var userId = 'user1';
        var attributes = { initial_attribute: 'initial_value' };
        var user = new OptimizelyUserContext({
          optimizely: fakeOptimizely,
          userId,
          attributes,
        });
        var attributes2 = user.getAttributes();
        attributes2['new_attribute'] = { "value": 100 };
        assert.deepEqual(user.getAttributes(), attributes);
        var expectedAttributes = {
          initial_attribute: 'initial_value',
          new_attribute: { "value": 100 }
        }
        assert.deepEqual(attributes2, expectedAttributes);
      });
    });

    describe('#decide', function() {
      it('should return an expected decision object', function() {
        var flagKey = 'feature_1';
        var fakeDecision = {
          variationKey: 'variation_with_traffic',
          enabled: true,
          variables: {},
          ruleKey: 'exp_no_audience',
          flagKey: flagKey,
          userContext: 'fakeUserContext',
          reasons: [],
        };
        fakeOptimizely = {
          decide: sinon.stub().returns(fakeDecision)
        };
        var user = new OptimizelyUserContext({
          optimizely: fakeOptimizely,
          userId,
        });
        var decision = user.decide(flagKey, options);
        sinon.assert.calledWithExactly(
          fakeOptimizely.decide,
          user,
          flagKey,
          options
        );
        assert.deepEqual(decision, fakeDecision);
      });
  });

    describe('#decideForKeys', function() {
      it('should return an expected decision results object', function() {
        var flagKey1 = 'feature_1';
        var flagKey2 = 'feature_2';
        var fakeDecisionMap = {
          flagKey1:
          {
            variationKey: '18257766532',
            enabled: true,
            variables: {},
            ruleKey: '18322080788',
            flagKey: flagKey1,
            userContext: 'fakeUserContext',
            reasons: [],
          },
          flagKey2:
          {
            variationKey: 'variation_with_traffic',
            enabled: true,
            variables: {},
            ruleKey: 'exp_no_audience',
            flagKey: flagKey2,
            userContext: 'fakeUserContext',
            reasons: [],
          },
        };
        fakeOptimizely = {
          decideForKeys: sinon.stub().returns(fakeDecisionMap)
        };
        var user = new OptimizelyUserContext({
          optimizely: fakeOptimizely,
          userId,
        });
        var decisionMap = user.decideForKeys([flagKey1, flagKey2], options);
        sinon.assert.calledWithExactly(
          fakeOptimizely.decideForKeys,
          user,
          [flagKey1, flagKey2],
          options
        );
        assert.deepEqual(decisionMap, fakeDecisionMap);
      });
    });

    describe('#decideAll', function() {
      it('should return an expected decision results object', function() {
        var flagKey1 = 'feature_1';
        var flagKey2 = 'feature_2';
        var flagKey3 = 'feature_3';
        var fakeDecisionMap = {
          flagKey1:
          {
            variationKey: '18257766532',
            enabled: true,
            variables: {},
            ruleKey: '18322080788',
            flagKey: flagKey1,
            userContext: 'fakeUserContext',
            reasons: [],
          },
          flagKey2:
          {
            variationKey: 'variation_with_traffic',
            enabled: true,
            variables: {},
            ruleKey: 'exp_no_audience',
            flagKey: flagKey2,
            userContext: 'fakeUserContext',
            reasons: [],
          },
          flagKey3:
          {
            variationKey: '',
            enabled: false,
            variables: {},
            ruleKey: '',
            flagKey: flagKey3,
            userContext: user,
            reasons: [],
          },
        };
        fakeOptimizely = {
          decideAll: sinon.stub().returns(fakeDecisionMap)
        };
        var user = new OptimizelyUserContext({
          optimizely: fakeOptimizely,
          userId,
        });
        var decisionMap = user.decideAll(options);
        sinon.assert.calledWithExactly(
          fakeOptimizely.decideAll,
          user,
          options
        );
        assert.deepEqual(decisionMap, fakeDecisionMap);
      });
    });

    describe('#trackEvent', function() {
      it('should call track from optimizely client', function() {
        fakeOptimizely = {
          track: sinon.stub()
        };
        var eventName = 'myEvent';
        var eventTags = { 'eventTag1': 1000 }
        var user = new OptimizelyUserContext({
          optimizely: fakeOptimizely,
          userId,
        });
        user.trackEvent(eventName, eventTags);
        sinon.assert.calledWithExactly(
          fakeOptimizely.track,
          eventName,
          user.getUserId(),
          user.getAttributes(),
          eventTags,
        );
      });
    });

    describe('#setForcedDecision', function() {
      var createdLogger = createLogger({
        logLevel: LOG_LEVEL.DEBUG,
        logToConsole: false,
      });
      var stubLogHandler;
      beforeEach(function() {
        stubLogHandler = {
          log: sinon.stub(),
        };
        logging.setLogLevel('notset');
        logging.setLogHandler(stubLogHandler);
      });
      afterEach(function() {
        logging.resetLogger();
      });
      it('should return true when client is not ready', function() {
        fakeOptimizely = {
          isValidInstance: sinon.stub().returns(false)
        };
        var user = new OptimizelyUserContext({
          optimizely: fakeOptimizely,
          userId,
        });
        var result = user.setForcedDecision({ flagKey: 'feature_1' }, '3324490562');
        assert.strictEqual(result, true);
        sinon.assert.notCalled(stubLogHandler.log);
      });

      it('should return true when provided empty string flagKey', function() {
        fakeOptimizely = {
          isValidInstance: sinon.stub().returns(true)
        };
        var user = new OptimizelyUserContext({
          optimizely: fakeOptimizely,
          userId: 'user123',
        });
        var result = user.setForcedDecision({ flagKey: '' }, '3324490562');
        assert.strictEqual(result, true);
        sinon.assert.notCalled(stubLogHandler.log);
      });

      it('should return true when provided flagKey and variationKey', function() {
        fakeOptimizely = {
          isValidInstance: sinon.stub().returns(true)
        };
        var user = new OptimizelyUserContext({
          optimizely: fakeOptimizely,
          userId: 'user123',
        });
        var result = user.setForcedDecision({ flagKey: 'feature_1' }, '3324490562');
        assert.strictEqual(result, true);
        sinon.assert.notCalled(stubLogHandler.log);
      });

      describe('when valid forced decision is set', function() {
        var optlyInstance;
        var notificationCenter = createNotificationCenter({ logger: createdLogger, errorHandler: errorHandler });
        var eventProcessor = createEventProcessor({
          dispatcher: eventDispatcher,
          batchSize: 1,
          notificationCenter: notificationCenter,
        });
        beforeEach(function() {
          optlyInstance = new Optimizely({
            clientEngine: 'node-sdk',
            datafile: testData.getTestDecideProjectConfig(),
            errorHandler: errorHandler,
            eventProcessor,
            isValidInstance: true,
            logger: createdLogger,
            notificationCenter,
          });

          sinon.stub(optlyInstance.decisionService.logger, 'log')
          sinon.stub(eventDispatcher, 'dispatchEvent');
          sinon.stub(optlyInstance.notificationCenter, 'sendNotifications');
        });

        afterEach(function() {
          optlyInstance.decisionService.logger.log.restore();
          eventDispatcher.dispatchEvent.restore();
          optlyInstance.notificationCenter.sendNotifications.restore();
        });

        it('should return an expected decision object when forced decision is called and variation of different experiment but same flag key', function() {
          var flagKey = 'feature_1';
          var ruleKey = 'exp_with_audience';
          var variationKey = '3324490633';
  
          var user = optlyInstance.createUserContext(userId);
          user.setForcedDecision({ flagKey: flagKey, ruleKey }, { variationKey });
          var decision = user.decide(flagKey, options);
          
          assert.equal(decision.variationKey, variationKey);
          assert.equal(decision.ruleKey, ruleKey);
          assert.equal(decision.enabled, true);
          assert.equal(decision.userContext.getUserId(), userId);
          assert.deepEqual(decision.userContext.getAttributes(), {});
          assert.deepEqual(Object.keys(decision.userContext.forcedDecisionsMap).length, 1);
        });

        it('should return forced decision object when forced decision is set for a flag and do NOT dispatch an event with DISABLE_DECISION_EVENT passed in decide options', function() {
          var user = optlyInstance.createUserContext(userId);
          var featureKey = 'feature_1';
          var variationKey = '3324490562';
          user.setForcedDecision({ flagKey: featureKey }, { variationKey });
          var decision = user.decide(
            featureKey,
            [
              OptimizelyDecideOption.INCLUDE_REASONS,
              OptimizelyDecideOption.DISABLE_DECISION_EVENT
            ]
          );
          assert.equal(decision.variationKey, variationKey);
          assert.equal(decision.ruleKey, null);
          assert.equal(decision.enabled, true);
          assert.equal(decision.userContext.getUserId(), userId);
          assert.deepEqual(decision.userContext.getAttributes(), {});
          assert.deepEqual(Object.keys(decision.userContext.forcedDecisionsMap).length, 1);
          assert.deepEqual(decision.userContext.forcedDecisionsMap[featureKey][CONTROL_ATTRIBUTES.FORCED_DECISION_NULL_RULE_KEY], { variationKey });
          assert.equal(
            true,
            decision.reasons.includes(
              sprintf(
                LOG_MESSAGES.USER_HAS_FORCED_DECISION_WITH_NO_RULE_SPECIFIED,
                variationKey,
                featureKey,
                userId,
              )
            )
          );

          sinon.assert.notCalled(eventDispatcher.dispatchEvent);
        });

        it('should return forced decision object when forced decision is set for a flag and dispatch an event', function() {
          var user = optlyInstance.createUserContext(userId);
          var featureKey = 'feature_1';
          var variationKey = '3324490562';
          user.setForcedDecision({ flagKey: featureKey }, { variationKey });
          var decision = user.decide(featureKey, [OptimizelyDecideOption.INCLUDE_REASONS]);

          assert.equal(decision.variationKey, variationKey);
          assert.equal(decision.ruleKey, null);
          assert.equal(decision.enabled, true);
          assert.equal(decision.userContext.getUserId(), userId);
          assert.deepEqual(decision.userContext.getAttributes(), {});
          assert.deepEqual(Object.values(decision.userContext.forcedDecisionsMap).length, 1);
          assert.deepEqual(decision.userContext.forcedDecisionsMap[featureKey][CONTROL_ATTRIBUTES.FORCED_DECISION_NULL_RULE_KEY], { variationKey });
          assert.equal(
            true,
            decision.reasons.includes(
              sprintf(
                LOG_MESSAGES.USER_HAS_FORCED_DECISION_WITH_NO_RULE_SPECIFIED,
                variationKey,
                featureKey,
                userId,
              )
            )
          );

          sinon.assert.calledOnce(eventDispatcher.dispatchEvent);
          var callArgs = eventDispatcher.dispatchEvent.getCalls()[0].args;
          var impressionEvent = callArgs[0];
          var eventDecision = impressionEvent.params.visitors[0].snapshots[0].decisions[0];
          var metadata = eventDecision.metadata;

          assert.equal(eventDecision.experiment_id, '');
          assert.equal(eventDecision.variation_id, '3324490562');

          assert.equal(metadata.flag_key, featureKey);
          assert.equal(metadata.rule_key, '');
          assert.equal(metadata.rule_type, 'feature-test');
          assert.equal(metadata.variation_key, variationKey);
          assert.equal(metadata.enabled, true);

          sinon.assert.callCount(optlyInstance.notificationCenter.sendNotifications, 3);
          var notificationCallArgs = optlyInstance.notificationCenter.sendNotifications.getCall(2).args;
          var expectedNotificationCallArgs = [
            NOTIFICATION_TYPES.DECISION,
            {
              type: 'flag',
              userId: 'tester',
              attributes: {},
              decisionInfo: {
                flagKey: featureKey,
                enabled: true,
                ruleKey: null,
                variationKey,
                variables: {
                  b_true: true,
                  d_4_2: 4.2,
                  i_1: 'invalid',
                  i_42: 42,
                  j_1: null,
                  s_foo: 'foo',
                },
                decisionEventDispatched: true,
                reasons: [
                  sprintf(
                    LOG_MESSAGES.USER_HAS_FORCED_DECISION_WITH_NO_RULE_SPECIFIED,
                    variationKey,
                    featureKey,
                    userId,
                  )
                ],
              },
            }
          ]
          assert.deepEqual(notificationCallArgs, expectedNotificationCallArgs);
        });

        it('should return forced decision object when forced decision is set for an experiment rule and dispatch an event', function() {
          var attributes = { country: 'US' };
          var user = optlyInstance.createUserContext(userId, attributes);
          var featureKey = 'feature_1';
          var variationKey = 'b';
          var ruleKey = 'exp_with_audience';
          user.setForcedDecision({ flagKey: featureKey, ruleKey }, { variationKey });
          var decision = user.decide(featureKey, [OptimizelyDecideOption.INCLUDE_REASONS]);

          assert.equal(decision.variationKey, variationKey);
          assert.equal(decision.ruleKey, ruleKey);
          assert.equal(decision.enabled, false);
          assert.equal(decision.userContext.getUserId(), userId);
          assert.deepEqual(decision.userContext.getAttributes(), attributes);
          assert.deepEqual(Object.keys(decision.userContext.forcedDecisionsMap).length, 1);
          assert.deepEqual(Object.keys(decision.userContext.forcedDecisionsMap[featureKey]).length, 1);
          assert.deepEqual(decision.userContext.forcedDecisionsMap[featureKey][ruleKey], { variationKey });
          assert.equal(
            true,
            decision.reasons.includes(
              sprintf(
                LOG_MESSAGES.USER_HAS_FORCED_DECISION_WITH_RULE_SPECIFIED,
                variationKey,
                featureKey,
                ruleKey,
                userId,
              )
            )
          );

          sinon.assert.calledOnce(eventDispatcher.dispatchEvent);
          var callArgs = eventDispatcher.dispatchEvent.getCalls()[0].args;
          var impressionEvent = callArgs[0];
          var eventDecision = impressionEvent.params.visitors[0].snapshots[0].decisions[0];
          var metadata = eventDecision.metadata;

          assert.equal(eventDecision.experiment_id, '10390977673');
          assert.equal(eventDecision.variation_id, '10416523121');

          assert.equal(metadata.flag_key, featureKey);
          assert.equal(metadata.rule_key, 'exp_with_audience');
          assert.equal(metadata.rule_type, 'feature-test');
          assert.equal(metadata.variation_key, 'b');
          assert.equal(metadata.enabled, false);

          sinon.assert.callCount(optlyInstance.notificationCenter.sendNotifications, 3);
          var notificationCallArgs = optlyInstance.notificationCenter.sendNotifications.getCall(2).args;
          var expectedNotificationCallArgs = [
            NOTIFICATION_TYPES.DECISION,
            {
              type: 'flag',
              userId: 'tester',
              attributes,
              decisionInfo: {
                flagKey: featureKey,
                enabled: false,
                ruleKey: 'exp_with_audience',
                variationKey,
                variables: {
                  b_true: true,
                  d_4_2: 4.2,
                  i_1: 'invalid',
                  i_42: 42,
                  j_1: null,
                  s_foo: 'foo',
                },
                decisionEventDispatched: true,
                reasons: [

                  sprintf(
                    LOG_MESSAGES.USER_HAS_FORCED_DECISION_WITH_RULE_SPECIFIED,
                    variationKey,
                    featureKey,
                    ruleKey,
                    userId,
                  )
                ],
              },
            }
          ]
          assert.deepEqual(notificationCallArgs, expectedNotificationCallArgs);
        });

        it('should return forced decision object when forced decision is set for a delivery rule and dispatch an event', function() {
          var user = optlyInstance.createUserContext(userId);
          var featureKey = 'feature_1';
          var variationKey = '3324490633';
          var ruleKey = '3332020515';
          user.setForcedDecision({ flagKey: featureKey, ruleKey }, { variationKey });
          var decision = user.decide(featureKey);

          assert.equal(decision.variationKey, variationKey);
          assert.equal(decision.ruleKey, ruleKey);
          assert.equal(decision.enabled, true);
          assert.equal(decision.userContext.getUserId(), userId);
          assert.deepEqual(decision.userContext.getAttributes(), {});
          assert.deepEqual(Object.keys(decision.userContext.forcedDecisionsMap).length, 1);
          assert.deepEqual(Object.keys(decision.userContext.forcedDecisionsMap[featureKey]).length, 1);
          assert.deepEqual(decision.userContext.forcedDecisionsMap[featureKey][ruleKey], { variationKey });

          sinon.assert.called(stubLogHandler.log);
          var logMessage = optlyInstance.decisionService.logger.log.args[4];
          assert.strictEqual(logMessage[0], 2);
          assert.strictEqual(logMessage[1], 'Variation (%s) is mapped to flag (%s), rule (%s) and user (%s) in the forced decision map.');
          assert.strictEqual(logMessage[2], variationKey);
          assert.strictEqual(logMessage[3], featureKey);
          assert.strictEqual(logMessage[4], ruleKey);
          assert.strictEqual(logMessage[5], userId);

          sinon.assert.calledOnce(eventDispatcher.dispatchEvent);
          var callArgs = eventDispatcher.dispatchEvent.getCalls()[0].args;
          var impressionEvent = callArgs[0];
          var eventDecision = impressionEvent.params.visitors[0].snapshots[0].decisions[0];
          var metadata = eventDecision.metadata;

          assert.equal(eventDecision.experiment_id, '3332020515');
          assert.equal(eventDecision.variation_id, '3324490633');

          assert.equal(metadata.flag_key, featureKey);
          assert.equal(metadata.rule_key, '3332020515');
          assert.equal(metadata.rule_type, 'rollout');
          assert.equal(metadata.variation_key, '3324490633');
          assert.equal(metadata.enabled, true);

          sinon.assert.callCount(optlyInstance.notificationCenter.sendNotifications, 3);
          var notificationCallArgs = optlyInstance.notificationCenter.sendNotifications.getCall(2).args;
          var expectedNotificationCallArgs = [
            NOTIFICATION_TYPES.DECISION,
            {
              type: 'flag',
              userId: 'tester',
              attributes: {},
              decisionInfo: {
                flagKey: featureKey,
                enabled: true,
                ruleKey: '3332020515',
                variationKey,
                variables: {
                  b_true: true,
                  d_4_2: 4.2,
                  i_1: 'invalid',
                  i_42: 42,
                  j_1: null,
                  s_foo: 'foo',
                },
                decisionEventDispatched: true,
                reasons: [],
              },
            }
          ]
          assert.deepEqual(notificationCallArgs, expectedNotificationCallArgs);
        });
      });

      describe('when invalid forced decision is set', function() {
        var optlyInstance;
        var notificationCenter = createNotificationCenter({ logger: createdLogger, errorHandler: errorHandler });
        var eventProcessor = createEventProcessor({
          dispatcher: eventDispatcher,
          batchSize: 1,
          notificationCenter: notificationCenter,
        });
        beforeEach(function() {
          optlyInstance = new Optimizely({
            clientEngine: 'node-sdk',
            datafile: testData.getTestDecideProjectConfig(),
            errorHandler: errorHandler,
            eventProcessor,
            isValidInstance: true,
            logger: createdLogger,
            notificationCenter,
          });
        });

        it('should NOT return forced decision object when forced decision is set for a flag', function() {
          var user = optlyInstance.createUserContext(userId);
          var featureKey = 'feature_1';
          var variationKey = 'invalid';
          user.setForcedDecision({ flagKey: featureKey }, { variationKey });
          var decision = user.decide(featureKey, [OptimizelyDecideOption.INCLUDE_REASONS]);

          // invalid forced decision will be ignored and regular decision will return
          assert.equal(decision.variationKey, '18257766532');
          assert.equal(decision.ruleKey, '18322080788');
          assert.deepEqual(Object.keys(decision.userContext.forcedDecisionsMap).length, 1);
          assert.deepEqual(decision.userContext.forcedDecisionsMap[featureKey][CONTROL_ATTRIBUTES.FORCED_DECISION_NULL_RULE_KEY], { variationKey });
          assert.equal(
            true,
            decision.reasons.includes(
              sprintf(
                LOG_MESSAGES.USER_HAS_FORCED_DECISION_WITH_NO_RULE_SPECIFIED_BUT_INVALID,
                featureKey,
                userId,
              )
            )
          );
        });

        it('should NOT return forced decision object when forced decision is set for an experiment rule', function() {
          var user = optlyInstance.createUserContext(userId);
          var featureKey = 'feature_1';
          var ruleKey = 'exp_with_audience';
          var variationKey = 'invalid';
          user.setForcedDecision({ flagKey: featureKey, ruleKey }, { variationKey });
          var decision = user.decide(featureKey, [OptimizelyDecideOption.INCLUDE_REASONS]);

          // invalid forced-decision will be ignored and regular decision will return
          assert.equal(decision.variationKey, '18257766532');
          assert.equal(decision.ruleKey, '18322080788');
          assert.deepEqual(Object.keys(decision.userContext.forcedDecisionsMap).length, 1);
          assert.deepEqual(Object.keys(decision.userContext.forcedDecisionsMap[featureKey]).length, 1);
          assert.deepEqual(decision.userContext.forcedDecisionsMap[featureKey][ruleKey], { variationKey });
          assert.equal(
            true,
            decision.reasons.includes(
              sprintf(
                LOG_MESSAGES.USER_HAS_FORCED_DECISION_WITH_RULE_SPECIFIED_BUT_INVALID,
                featureKey,
                ruleKey,
                userId,
              )
            )
          );
        });

        it('should NOT return forced decision object when forced decision is set for a delivery rule', function() {
          var user = optlyInstance.createUserContext(userId);
          var featureKey = 'feature_1';
          var variationKey = 'invalid';
          var ruleKey = '3332020515';
          user.setForcedDecision({ flagKey: featureKey, ruleKey }, { variationKey });
          var decision = user.decide(featureKey, [OptimizelyDecideOption.INCLUDE_REASONS]);

          // invalid forced decision will be ignored and regular decision will return
          assert.equal(decision.variationKey, '18257766532');
          assert.equal(decision.ruleKey, '18322080788');
          assert.deepEqual(Object.keys(decision.userContext.forcedDecisionsMap).length, 1);
          assert.deepEqual(Object.keys(decision.userContext.forcedDecisionsMap[featureKey]).length, 1);
          assert.deepEqual(decision.userContext.forcedDecisionsMap[featureKey][ruleKey], { variationKey });
          assert.equal(
            true,
            decision.reasons.includes(
              sprintf(
                LOG_MESSAGES.USER_HAS_FORCED_DECISION_WITH_RULE_SPECIFIED_BUT_INVALID,
                featureKey,
                ruleKey,
                userId,
              )
            )
          );
        });
      });

      describe('when forced decision is set for a flag and an experiment rule', function() {
        var optlyInstance;
        var createdLogger = createLogger({
          logLevel: LOG_LEVEL.DEBUG,
          logToConsole: false,
        });
        var notificationCenter = createNotificationCenter({ logger: createdLogger, errorHandler: errorHandler });
        var eventProcessor = createEventProcessor({
          dispatcher: eventDispatcher,
          batchSize: 1,
          notificationCenter: notificationCenter,
        });
        beforeEach(function() {
          optlyInstance = new Optimizely({
            clientEngine: 'node-sdk',
            datafile: testData.getTestDecideProjectConfig(),
            errorHandler: errorHandler,
            eventProcessor,
            isValidInstance: true,
            logger: createdLogger,
            notificationCenter,
          });
        });

        it('should prioritize flag forced decision over experiment rule', function() {
          var user = optlyInstance.createUserContext(userId);
          var featureKey = 'feature_1';
          var flagVariationKey = '3324490562';
          var experimentRuleVariationKey = 'b';
          var ruleKey = 'exp_with_audience';
          user.setForcedDecision({ flagKey: featureKey }, { variationKey: flagVariationKey });
          user.setForcedDecision({ flagKey: featureKey, ruleKey }, { variationKey: experimentRuleVariationKey });
          var decision = user.decide(featureKey, [OptimizelyDecideOption.INCLUDE_REASONS]);

          // flag-to-decision is the 1st priority
          assert.equal(decision.variationKey, flagVariationKey);
          assert.equal(decision.ruleKey, null);
          assert.deepEqual(Object.keys(decision.userContext.forcedDecisionsMap).length, 1);
          assert.deepEqual(Object.keys(decision.userContext.forcedDecisionsMap[featureKey]).length, 2);
        });
      });
    });

    describe('#getForcedDecision', function() {
      it('should return correct forced variation', function() {
        var createdLogger = createLogger({
          logLevel: LOG_LEVEL.DEBUG,
          logToConsole: false,
        });
        var notificationCenter = createNotificationCenter({ logger: createdLogger, errorHandler: errorHandler });
        var eventProcessor = createEventProcessor({
          dispatcher: eventDispatcher,
          batchSize: 1,
          notificationCenter: notificationCenter,
        });
        var optlyInstance = new Optimizely({
          clientEngine: 'node-sdk',
          datafile: testData.getTestDecideProjectConfig(),
          errorHandler: errorHandler,
          eventProcessor,
          isValidInstance: true,
          logger: createdLogger,
          notificationCenter,
        });
        var user = optlyInstance.createUserContext(userId);
        var featureKey = 'feature_1';
        var ruleKey = 'r';
        user.setForcedDecision({ flagKey: featureKey }, { variationKey: 'fv1' });
        assert.deepEqual(user.getForcedDecision({ flagKey: featureKey }), { variationKey: 'fv1' });

        // override forced variation
        user.setForcedDecision({ flagKey: featureKey }, { variationKey: 'fv2' });
        assert.deepEqual(user.getForcedDecision({ flagKey: featureKey }), { variationKey: 'fv2' });

        user.setForcedDecision({ flagKey: featureKey, ruleKey }, { variationKey: 'ev1' });
        assert.deepEqual(user.getForcedDecision({ flagKey: featureKey, ruleKey }), { variationKey: 'ev1' });

        // override forced variation
        user.setForcedDecision({ flagKey: featureKey, ruleKey }, { variationKey: 'ev2' });
        assert.deepEqual(user.getForcedDecision({ flagKey: featureKey, ruleKey }), { variationKey: 'ev2' });

        assert.deepEqual(user.getForcedDecision({ flagKey: featureKey }), { variationKey: 'fv2' });
      });
    });

    describe('#removeForcedDecision', function() {
      var stubLogHandler;
      beforeEach(function() {
        stubLogHandler = {
          log: sinon.stub(),
        };
        logging.setLogLevel('notset');
        logging.setLogHandler(stubLogHandler);
      });
      afterEach(function() {
        logging.resetLogger();
      });

      it('should return true when client is not ready and the forced decision has been removed successfully', function() {
        fakeOptimizely = {
          isValidInstance: sinon.stub().returns(false)
        };
        var user = new OptimizelyUserContext({
          optimizely: fakeOptimizely,
          userId: 'user123',
        });
        user.setForcedDecision({ flagKey: 'feature_1' }, '3324490562');
        var result = user.removeForcedDecision({ flagKey: 'feature_1' });
        assert.strictEqual(result, true);
      });

      it('should return true when the forced decision has been removed successfully and false otherwise', function() {
        fakeOptimizely = {
          isValidInstance: sinon.stub().returns(true)
        };
        var user = new OptimizelyUserContext({
          optimizely: fakeOptimizely,
          userId: 'user123',
        });
        user.setForcedDecision({ flagKey: 'feature_1' }, '3324490562');
        var result1 = user.removeForcedDecision({ flagKey: 'feature_1' });
        assert.strictEqual(result1, true);

        var result2 = user.removeForcedDecision('non-existent_feature');
        assert.strictEqual(result2, false);

        sinon.assert.notCalled(stubLogHandler.log);
      });

      it('should successfully remove forced decision when multiple forced decisions set with same feature key', function() {
        fakeOptimizely = {
          isValidInstance: sinon.stub().returns(true)
        };
        var user = new OptimizelyUserContext({
          optimizely: fakeOptimizely,
          userId: 'user123',
        });

        var featureKey = 'feature_1';
        var ruleKey = 'r';

        user.setForcedDecision({ flagKey: featureKey }, { variationKey: 'fv1' });
        user.setForcedDecision({ flagKey: featureKey, ruleKey }, { variationKey: 'ev1' });

        assert.deepEqual(user.getForcedDecision({ flagKey: featureKey }), { variationKey: 'fv1' });
        assert.deepEqual(user.getForcedDecision({ flagKey: featureKey, ruleKey }), { variationKey: 'ev1' });

        assert.strictEqual(user.removeForcedDecision({ flagKey: featureKey }), true);
        assert.strictEqual(user.getForcedDecision({ flagKey: featureKey }), null);
        assert.deepEqual(user.getForcedDecision({ flagKey: featureKey, ruleKey }), { variationKey: 'ev1' });

        assert.strictEqual(user.removeForcedDecision({ flagKey: featureKey, ruleKey }), true);
        assert.strictEqual(user.getForcedDecision({ flagKey: featureKey }), null);
        assert.strictEqual(user.getForcedDecision({ flagKey: featureKey, ruleKey }), null);

        assert.strictEqual(user.removeForcedDecision({ flagKey: featureKey }), false); // no more saved decisions
      });
    });

    describe('#removeAllForcedDecisions', function() {
      var stubLogHandler;
      beforeEach(function() {
        stubLogHandler = {
          log: sinon.stub(),
        };
        logging.setLogLevel('notset');
        logging.setLogHandler(stubLogHandler);
      });
      afterEach(function() {
        logging.resetLogger();
      });

      it('should return true when client is not ready', function() {
        fakeOptimizely = {
          isValidInstance: sinon.stub().returns(false)
        };
        var user = new OptimizelyUserContext({
          optimizely: fakeOptimizely,
          userId,
        });
        var result = user.removeAllForcedDecisions();
        assert.strictEqual(result, true);
        sinon.assert.notCalled(stubLogHandler.log);
      });

      it('should return true when all forced decisions have been removed successfully', function() {
        fakeOptimizely = {
          isValidInstance: sinon.stub().returns(true)
        };
        var user = new OptimizelyUserContext({
          optimizely: fakeOptimizely,
          userId,
        });
        user.setForcedDecision({ flagKey: 'feature_1' }, { variationKey: '3324490562' });
        user.setForcedDecision({ flagKey: 'feature_1', ruleKey: 'exp_with_audience' }, { variationKey: 'b' });
        assert.deepEqual(Object.keys(user.forcedDecisionsMap).length, 1);
        assert.deepEqual(Object.keys(user.forcedDecisionsMap['feature_1']).length, 2);

        assert.deepEqual(user.getForcedDecision({ flagKey: 'feature_1' }), { variationKey: '3324490562' });
        assert.deepEqual(user.getForcedDecision({ flagKey: 'feature_1', ruleKey: 'exp_with_audience' }), { variationKey: 'b' });

        var result1 = user.removeAllForcedDecisions();
        assert.strictEqual(result1, true);
        assert.deepEqual(Object.keys(user.forcedDecisionsMap).length, 0);

        assert.strictEqual(user.getForcedDecision({ flagKey: 'feature_1' }), null);
        assert.strictEqual(user.getForcedDecision({ flagKey: 'feature_1', ruleKey: 'exp_with_audience' }), null);

        sinon.assert.notCalled(stubLogHandler.log);
      });
    });
  });
});
