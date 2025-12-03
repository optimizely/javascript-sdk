/**
 * Copyright 2025, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, beforeEach, afterEach, expect, vi, Mocked } from 'vitest';
import { sprintf } from '../utils/fns';
import { NOTIFICATION_TYPES } from '../notification_center/type';
import OptimizelyUserContext from './';
import Optimizely from '../optimizely';
import testData from '../tests/test_data';
import { EventDispatcher, NotificationCenter, OptimizelyDecideOption } from '../shared_types';
import { getMockProjectConfigManager } from '../tests/mock/mock_project_config_manager';
import { createProjectConfig } from '../project_config/project_config';
import { getForwardingEventProcessor } from '../event_processor/event_processor_factory';
import { FORCED_DECISION_NULL_RULE_KEY } from './index';
import { getMockLogger } from '../tests/mock/mock_logger';

import {
  USER_HAS_FORCED_DECISION_WITH_NO_RULE_SPECIFIED,
  USER_HAS_FORCED_DECISION_WITH_NO_RULE_SPECIFIED_BUT_INVALID,
  USER_HAS_FORCED_DECISION_WITH_RULE_SPECIFIED,
  USER_HAS_FORCED_DECISION_WITH_RULE_SPECIFIED_BUT_INVALID,
} from '../core/decision_service';
import { resolvablePromise } from '../utils/promise/resolvablePromise';
import { LogEvent } from '../event_processor/event_dispatcher/event_dispatcher';
import { DefaultNotificationCenter } from '../notification_center';

const getMockEventDispatcher = () => {
  const dispatcher = {
    dispatchEvent: vi.fn((event: LogEvent) => Promise.resolve({ statusCode: 200 })),
  };
  return dispatcher;
};

interface GetOptlyInstanceParams {
  datafileObj: any;
  defaultDecideOptions?: OptimizelyDecideOption[];
}

const getOptlyInstance = ({ datafileObj, defaultDecideOptions }: GetOptlyInstanceParams) => {
  const createdLogger = getMockLogger();
  const mockConfigManager = getMockProjectConfigManager({
    initConfig: createProjectConfig(datafileObj),
  });
  const eventDispatcher = getMockEventDispatcher();
  const eventProcessor = getForwardingEventProcessor(eventDispatcher);

  const optlyInstance = new Optimizely({
    clientEngine: 'node-sdk',
    projectConfigManager: mockConfigManager,
    eventProcessor,
    logger: createdLogger,
    cmabService: {} as any,
    defaultDecideOptions: defaultDecideOptions || [],
  });

  return { optlyInstance, eventProcessor, eventDispatcher, createdLogger };
};

describe('OptimizelyUserContext', () => {
  const userId = 'tester';
  const options = ['fakeOption'];

  describe('setAttribute', () => {
    let fakeOptimizely: any;
    beforeEach(() => {
      fakeOptimizely = {
        decide: vi.fn().mockReturnValue({}),
      };
    });

    it('should set attributes when provided at instantiation of OptimizelyUserContext', () => {
      const userId = 'user1';
      const attributes = { test_attribute: 'test_value' };
      const user = new OptimizelyUserContext({
        optimizely: fakeOptimizely,
        userId,
        attributes,
      });
      user.setAttribute('k1', { hello: 'there' } as any);
      user.setAttribute('k2', true);
      user.setAttribute('k3', 100);
      user.setAttribute('k4', 3.5);
      expect(user.getOptimizely()).toEqual(fakeOptimizely);
      expect(user.getUserId()).toEqual(userId);

      const newAttributes = user.getAttributes();
      expect(newAttributes['test_attribute']).toEqual('test_value');
      expect(newAttributes['k1']).toEqual({ hello: 'there' });
      expect(newAttributes['k2']).toEqual(true);
      expect(newAttributes['k3']).toEqual(100);
      expect(newAttributes['k4']).toEqual(3.5);
    });

    it('should set attributes when none provided at instantiation of OptimizelyUserContext', () => {
      const userId = 'user2';
      const user = new OptimizelyUserContext({
        optimizely: fakeOptimizely,
        userId,
      });
      user.setAttribute('k1', { hello: 'there' } as any);
      user.setAttribute('k2', true);
      user.setAttribute('k3', 100);
      user.setAttribute('k4', 3.5);
      expect(user.getOptimizely()).toEqual(fakeOptimizely);
      expect(user.getUserId()).toEqual(userId);

      const newAttributes = user.getAttributes();
      expect(newAttributes['k1']).toEqual({ hello: 'there' });
      expect(newAttributes['k2']).toEqual(true);
      expect(newAttributes['k3']).toEqual(100);
      expect(newAttributes['k4']).toEqual(3.5);
    });

    it('should override existing attributes', () => {
      const userId = 'user3';
      const attributes = { test_attribute: 'test_value' };
      const user = new OptimizelyUserContext({
        optimizely: fakeOptimizely,
        userId,
        attributes,
      });
      user.setAttribute('k1', { hello: 'there' } as any);
      user.setAttribute('test_attribute', 'overwritten_value');
      expect(user.getOptimizely()).toEqual(fakeOptimizely);
      expect(user.getUserId()).toEqual(userId);

      const newAttributes = user.getAttributes();
      expect(newAttributes['k1']).toEqual({ hello: 'there' });
      expect(newAttributes['test_attribute']).toEqual('overwritten_value');
      expect(Object.keys(newAttributes).length).toEqual(2);
    });

    it('should allow to set attributes with value of null', () => {
      const userId = 'user4';
      const user = new OptimizelyUserContext({
        optimizely: fakeOptimizely,
        userId,
      });
      user.setAttribute('null_attribute', null);
      expect(user.getOptimizely()).toEqual(fakeOptimizely);
      expect(user.getUserId()).toEqual(userId);

      const newAttributes = user.getAttributes();
      expect(newAttributes['null_attribute']).toEqual(null);
    });

    it('should set attributes by value in constructor', () => {
      const userId = 'user1';
      const attributes: any = { initial_attribute: 'initial_value' };
      const user = new OptimizelyUserContext({
        optimizely: fakeOptimizely,
        userId,
        attributes,
      });
      attributes['attribute2'] = 100;
      expect(user.getAttributes()).toEqual({ initial_attribute: 'initial_value' });
      user.setAttribute('attribute3', 'hello');
      expect(attributes).toEqual({ initial_attribute: 'initial_value', attribute2: 100 });
    });

    it('should not change user attributes if returned by getAttributes object is updated', () => {
      const userId = 'user1';
      const attributes = { initial_attribute: 'initial_value' };
      const user = new OptimizelyUserContext({
        optimizely: fakeOptimizely,
        userId,
        attributes,
      });
      const attributes2: any = user.getAttributes();
      attributes2['new_attribute'] = { value: 100 };
      expect(user.getAttributes()).toEqual(attributes);
      const expectedAttributes = {
        initial_attribute: 'initial_value',
        new_attribute: { value: 100 },
      };
      expect(attributes2).toEqual(expectedAttributes);
    });
  });

  describe('decide', () => {
    it('should return an expected decision object', () => {
      const flagKey = 'feature_1';
      const fakeDecision = {
        variationKey: 'variation_with_traffic',
        enabled: true,
        variables: {},
        ruleKey: 'exp_no_audience',
        flagKey: flagKey,
        userContext: 'fakeUserContext',
        reasons: [],
      };
      const fakeOptimizely: any = {
        decide: vi.fn().mockReturnValue(fakeDecision),
      };
      const user = new OptimizelyUserContext({
        optimizely: fakeOptimizely,
        userId,
      });
      const decision = user.decide(flagKey, options as any);
      expect(fakeOptimizely.decide).toHaveBeenCalledWith(user, flagKey, options);
      expect(decision).toEqual(fakeDecision);
    });
  });

  describe('decideForKeys', () => {
    it('should return an expected decision results object', () => {
      const flagKey1 = 'feature_1';
      const flagKey2 = 'feature_2';
      const fakeDecisionMap = {
        flagKey1: {
          variationKey: '18257766532',
          enabled: true,
          variables: {},
          ruleKey: '18322080788',
          flagKey: flagKey1,
          userContext: 'fakeUserContext',
          reasons: [],
        },
        flagKey2: {
          variationKey: 'variation_with_traffic',
          enabled: true,
          variables: {},
          ruleKey: 'exp_no_audience',
          flagKey: flagKey2,
          userContext: 'fakeUserContext',
          reasons: [],
        },
      };
      const fakeOptimizely: any = {
        decideForKeys: vi.fn().mockReturnValue(fakeDecisionMap),
      };
      const user = new OptimizelyUserContext({
        optimizely: fakeOptimizely,
        userId,
      });
      const decisionMap = user.decideForKeys([flagKey1, flagKey2], options as any);
      expect(fakeOptimizely.decideForKeys).toHaveBeenCalledWith(user, [flagKey1, flagKey2], options);
      expect(decisionMap).toEqual(fakeDecisionMap);
    });
  });

  describe('decideAll', () => {
    it('should return an expected decision results object', () => {
      const flagKey1 = 'feature_1';
      const flagKey2 = 'feature_2';
      const flagKey3 = 'feature_3';
      const fakeDecisionMap: any = {
        flagKey1: {
          variationKey: '18257766532',
          enabled: true,
          variables: {},
          ruleKey: '18322080788',
          flagKey: flagKey1,
          userContext: 'fakeUserContext',
          reasons: [],
        },
        flagKey2: {
          variationKey: 'variation_with_traffic',
          enabled: true,
          variables: {},
          ruleKey: 'exp_no_audience',
          flagKey: flagKey2,
          userContext: 'fakeUserContext',
          reasons: [],
        },
        flagKey3: {
          variationKey: '',
          enabled: false,
          variables: {},
          ruleKey: '',
          flagKey: flagKey3,
          userContext: undefined,
          reasons: [],
        },
      };
      const fakeOptimizely: any = {
        decideAll: vi.fn().mockReturnValue(fakeDecisionMap),
      };
      const user = new OptimizelyUserContext({
        optimizely: fakeOptimizely,
        userId,
      });
      const decisionMap = user.decideAll(options as any);
      expect(fakeOptimizely.decideAll).toHaveBeenCalledWith(user, options);
      expect(decisionMap).toEqual(fakeDecisionMap);
    });
  });

  describe('trackEvent', () => {
    it('should call track from optimizely client', () => {
      const fakeOptimizely: any = {
        track: vi.fn(),
      };
      const eventName = 'myEvent';
      const eventTags = { eventTag1: 1000 };
      const user = new OptimizelyUserContext({
        optimizely: fakeOptimizely,
        userId,
      });
      user.trackEvent(eventName, eventTags);
      expect(fakeOptimizely.track).toHaveBeenCalledWith(
        eventName,
        user.getUserId(),
        user.getAttributes(),
        eventTags
      );
    });
  });

  describe('setForcedDecision', () => {
    it('should return true when client is not ready', () => {
      const fakeOptimizely: any = {
        onReady(): Promise<void> {
          return resolvablePromise<any>().promise;
        },
        onRunning(): Promise<void> {
          return resolvablePromise<any>().promise;
        },
      };
      const user = new OptimizelyUserContext({
        optimizely: fakeOptimizely,
        userId,
      });
      const result = user.setForcedDecision({ flagKey: 'feature_1' }, { variationKey: '3324490562' });
      expect(result).toEqual(true);
    });

    it('should return true when provided empty string flagKey', () => {
      const fakeOptimizely: any = {
        onReady(): Promise<void> {
          return resolvablePromise<any>().promise;
        },
        onRunning(): Promise<void> {
          return resolvablePromise<any>().promise;
        },
      };
      const user = new OptimizelyUserContext({
        optimizely: fakeOptimizely,
        userId: 'user123',
      });
      const result = user.setForcedDecision({ flagKey: '' }, { variationKey: '3324490562' });
      expect(result).toEqual(true);
    });

    it('should return true when provided flagKey and variationKey', () => {
      const fakeOptimizely: any = {
        onReady(): Promise<void> {
          return resolvablePromise<any>().promise;
        },
        onRunning(): Promise<void> {
          return resolvablePromise<any>().promise;
        },
      };
      const user = new OptimizelyUserContext({
        optimizely: fakeOptimizely,
        userId: 'user123',
      });
      const result = user.setForcedDecision({ flagKey: 'feature_1' }, { variationKey: '3324490562' });
      expect(result).toEqual(true);
    });

    describe('when valid forced decision is set', () => {
      let optlyInstance: Optimizely;
      let eventDispatcher: ReturnType<typeof getMockEventDispatcher>;
      beforeEach(() => {
        ({ optlyInstance, eventDispatcher } = getOptlyInstance({
          datafileObj: testData.getTestDecideProjectConfig(),
        }));

        vi.spyOn(optlyInstance.notificationCenter, 'sendNotifications');
      });

      it('should return an expected decision object when forced decision is called and variation of different experiment but same flag key', () => {
        const flagKey = 'feature_1';
        const ruleKey = 'exp_with_audience';
        const variationKey = '3324490633';

        const user = new OptimizelyUserContext({
          optimizely: optlyInstance,
          userId,
        });

        user.setForcedDecision({ flagKey: flagKey, ruleKey }, { variationKey });
        const decision = user.decide(flagKey, options as any);

        expect(decision.variationKey).toEqual(variationKey);
        expect(decision.ruleKey).toEqual(ruleKey);
        expect(decision.enabled).toEqual(true);
        expect(decision.userContext.getUserId()).toEqual(userId);
        expect(decision.userContext.getAttributes()).toEqual({});
      });

      it('should return forced decision object when forced decision is set for a flag and do NOT dispatch an event with DISABLE_DECISION_EVENT passed in decide options', () => {
        const user = new OptimizelyUserContext({
          optimizely: optlyInstance,
          userId,
        });
        
        const featureKey = 'feature_1';
        const variationKey = '3324490562';
        user.setForcedDecision({ flagKey: featureKey }, { variationKey });
        const decision = user.decide(featureKey, [
          OptimizelyDecideOption.INCLUDE_REASONS,
          OptimizelyDecideOption.DISABLE_DECISION_EVENT,
        ]);
        expect(decision.variationKey).toEqual(variationKey);
        expect(decision.ruleKey).toEqual(null);
        expect(decision.enabled).toEqual(true);
        expect(decision.userContext.getUserId()).toEqual(userId);
        expect(decision.userContext.getAttributes()).toEqual({});

        expect(
          decision.reasons.includes(
            sprintf(USER_HAS_FORCED_DECISION_WITH_NO_RULE_SPECIFIED, variationKey, featureKey, userId)
          )
        ).toEqual(true);

        expect(eventDispatcher.dispatchEvent).not.toHaveBeenCalled();
      });

      it('should return forced decision object when forced decision is set for a flag and do NOT dispatch an event with DISABLE_DECISION_EVENT string passed in decide options', () => {
        const user = new OptimizelyUserContext({
          optimizely: optlyInstance,
          userId,
        });

        const featureKey = 'feature_1';
        const variationKey = '3324490562';
        user.setForcedDecision({ flagKey: featureKey }, { variationKey });
        const decision = user.decide(featureKey, ['INCLUDE_REASONS', 'DISABLE_DECISION_EVENT'] as any);
        expect(decision.variationKey).toEqual(variationKey);
        expect(decision.ruleKey).toEqual(null);
        expect(decision.enabled).toEqual(true);
        expect(decision.userContext.getUserId()).toEqual(userId);
        expect(decision.userContext.getAttributes()).toEqual({});
        expect(
          decision.reasons.includes(
            sprintf(USER_HAS_FORCED_DECISION_WITH_NO_RULE_SPECIFIED, variationKey, featureKey, userId)
          )
        ).toEqual(true);

        expect(eventDispatcher.dispatchEvent).not.toHaveBeenCalled();
      });

      it('should return forced decision object when forced decision is set for a flag and dispatch an event', () => {
        const user = optlyInstance.createUserContext(userId);
        const featureKey = 'feature_1';
        const variationKey = '3324490562';
        user.setForcedDecision({ flagKey: featureKey }, { variationKey });
        const decision = user.decide(featureKey, [OptimizelyDecideOption.INCLUDE_REASONS]);

        expect(decision.variationKey).toEqual(variationKey);
        expect(decision.ruleKey).toEqual(null);
        expect(decision.enabled).toEqual(true);
        expect(decision.userContext.getUserId()).toEqual(userId);
        expect(decision.userContext.getAttributes()).toEqual({});

        expect(
          decision.reasons.includes(
            sprintf(USER_HAS_FORCED_DECISION_WITH_NO_RULE_SPECIFIED, variationKey, featureKey, userId)
          )
        ).toEqual(true);

        expect(eventDispatcher.dispatchEvent).toHaveBeenCalledTimes(1);
        const callArgs = eventDispatcher.dispatchEvent.mock.calls[0];
        const impressionEvent = callArgs[0];
        const eventDecision = impressionEvent.params.visitors?.[0].snapshots?.[0].decisions?.[0];
        const metadata = eventDecision?.metadata;

        expect(eventDecision?.experiment_id).toEqual('');
        expect(eventDecision?.variation_id).toEqual('3324490562');

        expect(metadata?.flag_key).toEqual(featureKey);
        expect(metadata?.rule_key).toEqual('');
        expect(metadata?.rule_type).toEqual('feature-test');
        expect(metadata?.variation_key).toEqual(variationKey);
        expect(metadata?.enabled).toEqual(true);

        const notificationCenter = optlyInstance.notificationCenter as Mocked<DefaultNotificationCenter>;
        expect(notificationCenter.sendNotifications).toHaveBeenCalledTimes(3);
        const notificationCallArgs = notificationCenter.sendNotifications.mock.calls[2];
        const expectedNotificationCallArgs = [
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
                sprintf(USER_HAS_FORCED_DECISION_WITH_NO_RULE_SPECIFIED, variationKey, featureKey, userId),
              ],
              experimentId: null,
              variationId: '3324490562',
            },
          },
        ];
        expect(notificationCallArgs).toEqual(expectedNotificationCallArgs);
      });

      it('should return forced decision object when forced decision is set for an experiment rule and dispatch an event', () => {
        const attributes = { country: 'US' };
        const user = optlyInstance.createUserContext(userId, attributes);
        const featureKey = 'feature_1';
        const variationKey = 'b';
        const ruleKey = 'exp_with_audience';
        user.setForcedDecision({ flagKey: featureKey, ruleKey }, { variationKey });
        const decision = user.decide(featureKey, [OptimizelyDecideOption.INCLUDE_REASONS]);

        expect(decision.variationKey).toEqual(variationKey);
        expect(decision.ruleKey).toEqual(ruleKey);
        expect(decision.enabled).toEqual(false);
        expect(decision.userContext.getUserId()).toEqual(userId);
        expect(decision.userContext.getAttributes()).toEqual(attributes);

        expect(
          decision.reasons.includes(
            sprintf(USER_HAS_FORCED_DECISION_WITH_RULE_SPECIFIED, variationKey, featureKey, ruleKey, userId)
          )
        ).toEqual(true);

        expect(eventDispatcher.dispatchEvent).toHaveBeenCalledTimes(1);
        const callArgs = eventDispatcher.dispatchEvent.mock.calls[0];
        const impressionEvent = callArgs[0];
        const eventDecision = impressionEvent.params.visitors?.[0].snapshots?.[0].decisions?.[0];
        const metadata = eventDecision?.metadata;

        expect(eventDecision?.experiment_id).toEqual('10390977673');
        expect(eventDecision?.variation_id).toEqual('10416523121');

        expect(metadata?.flag_key).toEqual(featureKey);
        expect(metadata?.rule_key).toEqual('exp_with_audience');
        expect(metadata?.rule_type).toEqual('feature-test');
        expect(metadata?.variation_key).toEqual('b');
        expect(metadata?.enabled).toEqual(false);

        const notificationCenter = optlyInstance.notificationCenter as Mocked<DefaultNotificationCenter>;

        expect(notificationCenter.sendNotifications).toHaveBeenCalledTimes(3);
        const notificationCallArgs = notificationCenter.sendNotifications.mock.calls[2];
        const expectedNotificationCallArgs = [
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
                sprintf(USER_HAS_FORCED_DECISION_WITH_RULE_SPECIFIED, variationKey, featureKey, ruleKey, userId),
              ],
              experimentId: '10390977673',
              variationId: '10416523121',
            },
          },
        ];
        expect(notificationCallArgs).toEqual(expectedNotificationCallArgs);
      });

      it('should return forced decision object when forced decision is set for a delivery rule and dispatch an event', () => {
        const user = optlyInstance.createUserContext(userId);
        const featureKey = 'feature_1';
        const variationKey = '3324490633';
        const ruleKey = '3332020515';
        user.setForcedDecision({ flagKey: featureKey, ruleKey }, { variationKey });
        const decision = user.decide(featureKey);

        expect(decision.variationKey).toEqual(variationKey);
        expect(decision.ruleKey).toEqual(ruleKey);
        expect(decision.enabled).toEqual(true);
        expect(decision.userContext.getUserId()).toEqual(userId);
        expect(decision.userContext.getAttributes()).toEqual({});


        expect(eventDispatcher.dispatchEvent).toHaveBeenCalledTimes(1);
        const callArgs = eventDispatcher.dispatchEvent.mock.calls[0];
        const impressionEvent = callArgs[0];
        const eventDecision = impressionEvent.params.visitors?.[0].snapshots?.[0].decisions?.[0];
        const metadata = eventDecision?.metadata;

        expect(eventDecision?.experiment_id).toEqual('3332020515');
        expect(eventDecision?.variation_id).toEqual('3324490633');

        expect(metadata?.flag_key).toEqual(featureKey);
        expect(metadata?.rule_key).toEqual('3332020515');
        expect(metadata?.rule_type).toEqual('rollout');
        expect(metadata?.variation_key).toEqual('3324490633');
        expect(metadata?.enabled).toEqual(true);
        
        const notificationCenter = optlyInstance.notificationCenter as Mocked<DefaultNotificationCenter>;
        expect(notificationCenter.sendNotifications).toHaveBeenCalledTimes(3);
        const notificationCallArgs = notificationCenter.sendNotifications.mock.calls[2];
        const expectedNotificationCallArgs = [
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
              experimentId: '3332020515',
              variationId: '3324490633',
            },
          },
        ];
        expect(notificationCallArgs).toEqual(expectedNotificationCallArgs);
      });
    });

    describe('when invalid forced decision is set', () => {
      let optlyInstance: Optimizely;
      let eventDispatcher: ReturnType<typeof getMockEventDispatcher>;
      beforeEach(() => {
        ({ optlyInstance, eventDispatcher } = getOptlyInstance({
          datafileObj: testData.getTestDecideProjectConfig(),
        }));

        vi.spyOn(optlyInstance.notificationCenter, 'sendNotifications');
      });

      it('should NOT return forced decision object when forced decision is set for a flag', () => {
        const user = optlyInstance.createUserContext(userId);
        const featureKey = 'feature_1';
        const variationKey = 'invalid';
        user.setForcedDecision({ flagKey: featureKey }, { variationKey });
        const decision = user.decide(featureKey, [OptimizelyDecideOption.INCLUDE_REASONS]);

        // invalid forced decision will be ignored and regular decision will return
        expect(decision.variationKey).toEqual('18257766532');
        expect(decision.ruleKey).toEqual('18322080788');

        expect(
          decision.reasons.includes(
            sprintf(USER_HAS_FORCED_DECISION_WITH_NO_RULE_SPECIFIED_BUT_INVALID, featureKey, userId)
          )
        ).toEqual(true);
      });

      it('should NOT return forced decision object when forced decision is set for an experiment rule', () => {
        const user = optlyInstance.createUserContext(userId);
        const featureKey = 'feature_1';
        const ruleKey = 'exp_with_audience';
        const variationKey = 'invalid';
        user.setForcedDecision({ flagKey: featureKey, ruleKey }, { variationKey });
        const decision = user.decide(featureKey, [OptimizelyDecideOption.INCLUDE_REASONS]);

        // invalid forced-decision will be ignored and regular decision will return
        expect(decision.variationKey).toEqual('18257766532');
        expect(decision.ruleKey).toEqual('18322080788');

        expect(
          decision.reasons.includes(
            sprintf(USER_HAS_FORCED_DECISION_WITH_RULE_SPECIFIED_BUT_INVALID, featureKey, ruleKey, userId)
          )
        ).toEqual(true);
      });

      it('should NOT return forced decision object when forced decision is set for a delivery rule', () => {
        const user = optlyInstance.createUserContext(userId);
        const featureKey = 'feature_1';
        const variationKey = 'invalid';
        const ruleKey = '3332020515';
        user.setForcedDecision({ flagKey: featureKey, ruleKey }, { variationKey });
        const decision = user.decide(featureKey, [OptimizelyDecideOption.INCLUDE_REASONS]);

        // invalid forced decision will be ignored and regular decision will return
        expect(decision.variationKey).toEqual('18257766532');
        expect(decision.ruleKey).toEqual('18322080788');

        expect(
          decision.reasons.includes(
            sprintf(USER_HAS_FORCED_DECISION_WITH_RULE_SPECIFIED_BUT_INVALID, featureKey, ruleKey, userId)
          )
        ).toEqual(true);
      });
    });

    describe('when forced decision is set for a flag and an experiment rule', () => {
      let optlyInstance: Optimizely;

      beforeEach(() => {
        ({ optlyInstance } = getOptlyInstance({
          datafileObj: testData.getTestDecideProjectConfig(),
        }));

        vi.spyOn(optlyInstance.notificationCenter, 'sendNotifications');
      });

      it('should prioritize flag forced decision over experiment rule', () => {
        const user = optlyInstance.createUserContext(userId);
        const featureKey = 'feature_1';
        const flagVariationKey = '3324490562';
        const experimentRuleVariationKey = 'b';
        const ruleKey = 'exp_with_audience';
        user.setForcedDecision({ flagKey: featureKey }, { variationKey: flagVariationKey });
        user.setForcedDecision({ flagKey: featureKey, ruleKey }, { variationKey: experimentRuleVariationKey });
        const decision = user.decide(featureKey, [OptimizelyDecideOption.INCLUDE_REASONS]);

        // flag-to-decision is the 1st priority
        expect(decision.variationKey).toEqual(flagVariationKey);
        expect(decision.ruleKey).toEqual(null);
      });
    });
  });

  describe('getForcedDecision', () => {
    it('should return correct forced variation', () => {
      const { optlyInstance } = getOptlyInstance({
        datafileObj: testData.getTestDecideProjectConfig(),
      });

      const user = new OptimizelyUserContext({
        optimizely: optlyInstance,
        userId,
      });

      const featureKey = 'feature_1';
      const ruleKey = 'r';
      user.setForcedDecision({ flagKey: featureKey }, { variationKey: 'fv1' });
      expect(user.getForcedDecision({ flagKey: featureKey })).toEqual({ variationKey: 'fv1' });

      // override forced variation
      user.setForcedDecision({ flagKey: featureKey }, { variationKey: 'fv2' });
      expect(user.getForcedDecision({ flagKey: featureKey })).toEqual({ variationKey: 'fv2' });

      user.setForcedDecision({ flagKey: featureKey, ruleKey }, { variationKey: 'ev1' });
      expect(user.getForcedDecision({ flagKey: featureKey, ruleKey })).toEqual({ variationKey: 'ev1' });

      // override forced variation
      user.setForcedDecision({ flagKey: featureKey, ruleKey }, { variationKey: 'ev2' });
      expect(user.getForcedDecision({ flagKey: featureKey, ruleKey })).toEqual({ variationKey: 'ev2' });

      expect(user.getForcedDecision({ flagKey: featureKey })).toEqual({ variationKey: 'fv2' });
    });
  });

  describe('removeForcedDecision', () => {
    it('should return true when client is not ready and the forced decision has been removed successfully', () => {
      const fakeOptimizely: any = {
        onReady(): Promise<void> {
          return resolvablePromise<any>().promise;
        },
        onRunning(): Promise<void> {
          return resolvablePromise<any>().promise;
        },
      };

      const user = new OptimizelyUserContext({
        optimizely: fakeOptimizely,
        userId: 'user123',
      });

      user.setForcedDecision({ flagKey: 'feature_1' }, { variationKey: '3324490562' });
      const result = user.removeForcedDecision({ flagKey: 'feature_1' });
      expect(result).toEqual(true);
    });

    it('should return true when the forced decision has been removed successfully and false otherwise', () => {
      const { optlyInstance } = getOptlyInstance({
        datafileObj: testData.getTestDecideProjectConfig(),
      });

      const user = new OptimizelyUserContext({
        optimizely: optlyInstance,
        userId: 'user123',
      });
      user.setForcedDecision({ flagKey: 'feature_1' }, { variationKey: '3324490562' });
      const result1 = user.removeForcedDecision({ flagKey: 'feature_1' });
      expect(result1).toEqual(true);

      const result2 = user.removeForcedDecision({ flagKey: 'non-existent_feature' });
      expect(result2).toEqual(false);
    });

    it('should successfully remove forced decision when multiple forced decisions set with same feature key', () => {
      const { optlyInstance } = getOptlyInstance({
        datafileObj: testData.getTestDecideProjectConfig(),
      });

      const user = new OptimizelyUserContext({
        optimizely: optlyInstance,
        userId: 'user123',
      });

      const featureKey = 'feature_1';
      const ruleKey = 'r';

      user.setForcedDecision({ flagKey: featureKey }, { variationKey: 'fv1' });
      user.setForcedDecision({ flagKey: featureKey, ruleKey }, { variationKey: 'ev1' });

      expect(user.getForcedDecision({ flagKey: featureKey })).toEqual({ variationKey: 'fv1' });
      expect(user.getForcedDecision({ flagKey: featureKey, ruleKey })).toEqual({ variationKey: 'ev1' });

      expect(user.removeForcedDecision({ flagKey: featureKey })).toEqual(true);
      expect(user.getForcedDecision({ flagKey: featureKey })).toEqual(null);
      expect(user.getForcedDecision({ flagKey: featureKey, ruleKey })).toEqual({ variationKey: 'ev1' });

      expect(user.removeForcedDecision({ flagKey: featureKey, ruleKey })).toEqual(true);
      expect(user.getForcedDecision({ flagKey: featureKey })).toEqual(null);
      expect(user.getForcedDecision({ flagKey: featureKey, ruleKey })).toEqual(null);

      expect(user.removeForcedDecision({ flagKey: featureKey })).toEqual(false); // no more saved decisions
    });
  });

  describe('removeAllForcedDecisions', () => {
    it('should return true when client is not ready', () => {
      const fakeOptimizely: any = {
        onReady(): Promise<void> {
          return resolvablePromise<any>().promise;
        },
        onRunning(): Promise<void> {
          return resolvablePromise<any>().promise;
        },
      };

      const user = new OptimizelyUserContext({
        optimizely: fakeOptimizely,
        userId,
      });
      const result = user.removeAllForcedDecisions();
      expect(result).toEqual(true);
    });

    it('should return true when all forced decisions have been removed successfully', () => {
      const { optlyInstance } = getOptlyInstance({
        datafileObj: testData.getTestDecideProjectConfig(),
      });

      const user = new OptimizelyUserContext({
        optimizely: optlyInstance,
        userId,
      });
      user.setForcedDecision({ flagKey: 'feature_1' }, { variationKey: '3324490562' });
      user.setForcedDecision({ flagKey: 'feature_1', ruleKey: 'exp_with_audience' }, { variationKey: 'b' });

      expect(user.getForcedDecision({ flagKey: 'feature_1' })).toEqual({ variationKey: '3324490562' });
      expect(user.getForcedDecision({ flagKey: 'feature_1', ruleKey: 'exp_with_audience' })).toEqual({
        variationKey: 'b',
      });

      const result1 = user.removeAllForcedDecisions();
      expect(result1).toEqual(true);

      expect(user.getForcedDecision({ flagKey: 'feature_1' })).toEqual(null);
      expect(user.getForcedDecision({ flagKey: 'feature_1', ruleKey: 'exp_with_audience' })).toEqual(null);
    });
  });

  describe('fetchQualifiedSegments', () => {
    it('should successfully get segments', async () => {
      const fakeOptimizely: any = {
        fetchQualifiedSegments: vi.fn().mockResolvedValue(['a']),
      };
      const user = new OptimizelyUserContext({
        optimizely: fakeOptimizely,
        userId,
      });

      const successfullyFetched = await user.fetchQualifiedSegments();
      expect(successfullyFetched).toEqual(true);

      expect(fakeOptimizely.fetchQualifiedSegments).toHaveBeenCalledWith(userId, undefined);

      expect(user.qualifiedSegments).toEqual(['a']);
    });

    it('should return true for empty returned segements', async () => {
      const fakeOptimizely: any = {
        fetchQualifiedSegments: vi.fn().mockResolvedValue([]),
      };
      const user = new OptimizelyUserContext({
        optimizely: fakeOptimizely,
        userId,
      });

      const successfullyFetched = await user.fetchQualifiedSegments();
      expect(successfullyFetched).toEqual(true);
    });

    it('should return false in other cases', async () => {
      const fakeOptimizely: any = {
        fetchQualifiedSegments: vi.fn().mockResolvedValue(null),
      };
      const user = new OptimizelyUserContext({
        optimizely: fakeOptimizely,
        userId,
      });

      const successfullyFetched = await user.fetchQualifiedSegments();
      expect(successfullyFetched).toEqual(false);
    });
  });

  describe('isQualifiedFor', () => {
    it('should successfully return the expected result for if a user is qualified for a particular segment or not', () => {
      const user = new OptimizelyUserContext({
        optimizely: {} as any,
        userId,
      });

      user.qualifiedSegments = ['a', 'b'];

      expect(user.isQualifiedFor('a')).toEqual(true);
      expect(user.isQualifiedFor('b')).toEqual(true);
      expect(user.isQualifiedFor('c')).toEqual(false);
    });
  });
});
