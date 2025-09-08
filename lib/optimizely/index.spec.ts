/**
 * Copyright 2024-2025, Optimizely
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
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Optimizely from '.';
import { getMockProjectConfigManager } from '../tests/mock/mock_project_config_manager';
import * as jsonSchemaValidator from '../utils/json_schema_validator';
import testData from '../tests/test_data';
import { getForwardingEventProcessor } from '../event_processor/event_processor_factory';
import { createProjectConfig } from '../project_config/project_config';
import { getMockLogger } from '../tests/mock/mock_logger';
import { createOdpManager } from '../odp/odp_manager_factory.node';
import { extractOdpManager } from '../odp/odp_manager_factory';
import { Value } from '../utils/promise/operation_value';
import { getDecisionTestDatafile } from '../tests/decision_test_datafile';
import { DECISION_SOURCES } from '../utils/enums';
import OptimizelyUserContext from '../optimizely_user_context';
import { newErrorDecision } from '../optimizely_decision';
import { ImpressionEvent } from '../event_processor/event_builder/user_event';
import { OptimizelyDecideOption } from '../shared_types';
import { NOTIFICATION_TYPES, DECISION_NOTIFICATION_TYPES } from '../notification_center/type';


const holdoutData = [
  {
    id: 'holdout_test_id',
    key: 'holdout_test_key',
    status: 'Running',
    includedFlags: [],
    excludedFlags: [],
    audienceIds: [],
    audienceConditions: [],
    variations: [
      {
        id: 'holdout_variation_id',
        key: 'holdout_variation_key',
        variables: [],
        featureEnabled: false,
      },
    ],
    trafficAllocation: [
      {
        entityId: 'holdout_variation_id',
        endOfRange: 10000,
      },
    ],
  },
];

describe('Optimizely', () => {
  const eventDispatcher = {
    dispatchEvent: () => Promise.resolve({ statusCode: 200 }),
  };

  const eventProcessor = getForwardingEventProcessor(eventDispatcher);
  const odpManager = extractOdpManager(createOdpManager({}));
  const logger = getMockLogger();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should pass disposable options to the respective services', () => {
    const projectConfigManager = getMockProjectConfigManager({
      initConfig: createProjectConfig(testData.getTestProjectConfig()),
    });

    vi.spyOn(projectConfigManager, 'makeDisposable');
    vi.spyOn(eventProcessor, 'makeDisposable');
    vi.spyOn(odpManager!, 'makeDisposable');

    new Optimizely({
      clientEngine: 'node-sdk',
      projectConfigManager,
      jsonSchemaValidator,
      logger,
      eventProcessor,
      odpManager,
      disposable: true,
      cmabService: {} as any
    });

    expect(projectConfigManager.makeDisposable).toHaveBeenCalled();
    expect(eventProcessor.makeDisposable).toHaveBeenCalled();
    expect(odpManager!.makeDisposable).toHaveBeenCalled();
  });

  it('should set child logger to respective services', () => {
    const projectConfigManager = getMockProjectConfigManager({
      initConfig: createProjectConfig(testData.getTestProjectConfig()),
    });

    const eventProcessor = getForwardingEventProcessor(eventDispatcher);
    const odpManager = extractOdpManager(createOdpManager({}));

    vi.spyOn(projectConfigManager, 'setLogger');
    vi.spyOn(eventProcessor, 'setLogger');
    vi.spyOn(odpManager!, 'setLogger');

    const logger = getMockLogger();
    const configChildLogger = getMockLogger();
    const eventProcessorChildLogger = getMockLogger();
    const odpManagerChildLogger = getMockLogger();
    vi.spyOn(logger, 'child').mockReturnValueOnce(configChildLogger)
      .mockReturnValueOnce(eventProcessorChildLogger)
      .mockReturnValueOnce(odpManagerChildLogger);

    new Optimizely({
      clientEngine: 'node-sdk',
      projectConfigManager,
      jsonSchemaValidator,
      logger,
      eventProcessor,
      odpManager,
      disposable: true,
      cmabService: {} as any
    });

    expect(projectConfigManager.setLogger).toHaveBeenCalledWith(configChildLogger);
    expect(eventProcessor.setLogger).toHaveBeenCalledWith(eventProcessorChildLogger);
    expect(odpManager!.setLogger).toHaveBeenCalledWith(odpManagerChildLogger);
  });

  describe('decideAsync', () => {
    it('should return an error decision with correct reasons if decisionService returns error', async () => {
      const projectConfig = createProjectConfig(getDecisionTestDatafile());

      const projectConfigManager = getMockProjectConfigManager({
        initConfig: projectConfig,
      });

      const optimizely = new Optimizely({
        clientEngine: 'node-sdk',
        projectConfigManager,
        jsonSchemaValidator,
        logger,
        eventProcessor,
        odpManager,
        disposable: true,
        cmabService: {} as any
      });

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const decisionService = optimizely.decisionService;
      vi.spyOn(decisionService, 'resolveVariationsForFeatureList').mockImplementation(() => {
        return Value.of('async', [{
          error: true,
          result: {
            variation: null,
            experiment: projectConfig.experimentKeyMap['exp_3'],
            decisionSource: DECISION_SOURCES.FEATURE_TEST,
          },
          reasons:[
            ['test reason %s', '1'],
            ['test reason %s', '2'],
          ]
        }]);
      });

      const user = new OptimizelyUserContext({
        optimizely: {} as any,
        userId: 'tester',
        attributes: {
          country: 'BD',
          age: 80, // should satisfy audience condition for exp_3 which is cmab and not others
        },
      });

      const decision = await optimizely.decideAsync(user, 'flag_1', []);

      expect(decision).toEqual(newErrorDecision('flag_1', user, ['test reason 1', 'test reason 2']));
    });

    it('should include cmab uuid in dispatched event if decisionService returns a cmab uuid', async () => {
      const projectConfig = createProjectConfig(getDecisionTestDatafile());

      const projectConfigManager = getMockProjectConfigManager({
        initConfig: projectConfig,
      });

      const eventProcessor = getForwardingEventProcessor(eventDispatcher);
      const processSpy = vi.spyOn(eventProcessor, 'process');

      const optimizely = new Optimizely({
        clientEngine: 'node-sdk',
        projectConfigManager,
        eventProcessor,
        jsonSchemaValidator,
        logger,
        odpManager,
        disposable: true,
        cmabService: {} as any
      });

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const decisionService = optimizely.decisionService;
      vi.spyOn(decisionService, 'resolveVariationsForFeatureList').mockImplementation(() => {
        return Value.of('async', [{
          error: false,
          result: {
            cmabUuid: 'uuid-cmab',
            variation: projectConfig.variationIdMap['5003'],
            experiment: projectConfig.experimentKeyMap['exp_3'],
            decisionSource: DECISION_SOURCES.FEATURE_TEST,
          },
          reasons: [],
        }]);
      });

      const user = new OptimizelyUserContext({
        optimizely: {} as any,
        userId: 'tester',
        attributes: {
          country: 'BD',
          age: 80, // should satisfy audience condition for exp_3 which is cmab and not others
        },
      });

      const decision = await optimizely.decideAsync(user, 'flag_1', []);

      expect(decision.ruleKey).toBe('exp_3');
      expect(decision.flagKey).toBe('flag_1');
      expect(decision.variationKey).toBe('variation_3');
      expect(decision.enabled).toBe(true);

      expect(eventProcessor.process).toHaveBeenCalledOnce();
      const event = processSpy.mock.calls[0][0] as ImpressionEvent;
      expect(event.cmabUuid).toBe('uuid-cmab');
    });
    

  });

  describe('holdout tests', () => {
    let projectConfig: any;
    let optimizely: any;
    let decisionService: any;
    let flagNotificationSpy: any;
    let activateNotificationSpy: any;
    let eventProcessor: any;

    beforeEach(() => {
      const datafile = getDecisionTestDatafile();
      datafile.holdouts = JSON.parse(JSON.stringify(holdoutData)); // Deep copy to avoid mutations
      projectConfig = createProjectConfig(datafile);

      const projectConfigManager = getMockProjectConfigManager({
        initConfig: projectConfig,
      });

      const mockEventDispatcher = {
        dispatchEvent: vi.fn(() => Promise.resolve({ statusCode: 200 })),
      };
      eventProcessor = getForwardingEventProcessor(mockEventDispatcher);

      optimizely = new Optimizely({
        clientEngine: 'node-sdk',
        projectConfigManager,
        eventProcessor,
        jsonSchemaValidator,
        logger,
        odpManager,
        disposable: true,
        cmabService: {} as any
      });

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      decisionService = optimizely.decisionService;

      // Setup notification spy
      flagNotificationSpy = vi.fn();
      optimizely.notificationCenter.addNotificationListener(
        NOTIFICATION_TYPES.DECISION,
        flagNotificationSpy
      );

      activateNotificationSpy = vi.fn();
      optimizely.notificationCenter.addNotificationListener(
        NOTIFICATION_TYPES.ACTIVATE,
        activateNotificationSpy
      );
    });

    it('should dispatch impression event for holdout decision', async () => {
      const processSpy = vi.spyOn(eventProcessor, 'process');
      
      vi.spyOn(decisionService, 'resolveVariationsForFeatureList').mockImplementation(() => {
        return Value.of('async', [{
          error: false,
          result: {
            variation: projectConfig.holdouts[0].variations[0],
            experiment: projectConfig.holdouts[0],
            decisionSource: DECISION_SOURCES.HOLDOUT,
          },
          reasons: [],
        }]);
      });

      const user = new OptimizelyUserContext({
        optimizely,
        userId: 'test_user',
        attributes: {},
      });

      const decision = await optimizely.decideAsync(user, 'flag_1', []);

      expect(decision.ruleKey).toBe('holdout_test_key');
      expect(decision.flagKey).toBe('flag_1');
      expect(decision.variationKey).toBe('holdout_variation_key');
      expect(decision.enabled).toBe(false);

      expect(eventProcessor.process).toHaveBeenCalledOnce();

      const event = processSpy.mock.calls[0][0] as ImpressionEvent;

      expect(event.type).toBe('impression');
      expect(event.ruleKey).toBe('holdout_test_key');
      expect(event.ruleType).toBe('holdout');
      expect(event.enabled).toBe(false);
    });

    it('should not dispatch impression event for holdout when DISABLE_DECISION_EVENT is used', async () => {
      const processSpy = vi.spyOn(eventProcessor, 'process');
      
      vi.spyOn(decisionService, 'resolveVariationsForFeatureList').mockImplementation(() => {
        return Value.of('async', [{
          error: false,
          result: {
            variation: projectConfig.holdouts[0].variations[0],
            experiment: projectConfig.holdouts[0],
            decisionSource: DECISION_SOURCES.HOLDOUT,
          },
          reasons: [],
        }]);
      });

      const user = new OptimizelyUserContext({
        optimizely,
        userId: 'test_user',
        attributes: {},
      });

      const decision = await optimizely.decideAsync(user, 'flag_1', [OptimizelyDecideOption.DISABLE_DECISION_EVENT]);

      expect(decision.ruleKey).toBe('holdout_test_key');
      expect(decision.enabled).toBe(false);
      expect(processSpy).not.toHaveBeenCalled();
    });

    it('should dispatch impression event for holdout decision for isFeatureEnabled', async () => {
      const processSpy = vi.spyOn(eventProcessor, 'process');
      
      vi.spyOn(decisionService, 'getVariationForFeature').mockReturnValue({
        error: false,
        result: {
          variation: projectConfig.holdouts[0].variations[0],
          experiment: projectConfig.holdouts[0],
          decisionSource: DECISION_SOURCES.HOLDOUT,
        },
        reasons: [],
      });
      
      const result = optimizely.isFeatureEnabled('flag_1', 'test_user', {});

      expect(result).toBe(false);

      expect(eventProcessor.process).toHaveBeenCalledOnce();
      const event = processSpy.mock.calls[0][0] as ImpressionEvent;

      expect(event.type).toBe('impression');
      expect(event.ruleKey).toBe('holdout_test_key');
      expect(event.ruleType).toBe('holdout');
      expect(event.enabled).toBe(false);
    });

    it('should send correct decision notification for holdout decision', async () => {
      vi.spyOn(decisionService, 'resolveVariationsForFeatureList').mockImplementation(() => {
        return Value.of('async', [{
          error: false,
          result: {
            variation: projectConfig.holdouts[0].variations[0],
            experiment: projectConfig.holdouts[0],
            decisionSource: DECISION_SOURCES.HOLDOUT,
          },
          reasons: [],
        }]);
      });

      const user = new OptimizelyUserContext({
        optimizely,
        userId: 'test_user',
        attributes: { country: 'US' },
      });

      const decision = await optimizely.decideAsync(user, 'flag_1', []);

      expect(decision.flagKey).toBe('flag_1');
      expect(decision.enabled).toBe(false);
      expect(decision.variationKey).toBe('holdout_variation_key');
      expect(decision.ruleKey).toBe('holdout_test_key');

      // Verify decision notification was sent
      expect(flagNotificationSpy).toHaveBeenCalledWith({
        type: DECISION_NOTIFICATION_TYPES.FLAG,
        userId: 'test_user',
        attributes: { country: 'US' },
        decisionInfo: expect.objectContaining({
          flagKey: 'flag_1',
          enabled: false,
          variationKey: 'holdout_variation_key',
          ruleKey: 'holdout_test_key',
          variables: expect.any(Object),
          reasons: expect.any(Array),
          decisionEventDispatched: true,
        }),
      });

      expect(activateNotificationSpy).toHaveBeenCalledWith(expect.objectContaining({
        experiment: null,
        holdout: projectConfig.holdouts[0],
        userId: 'test_user',
        attributes: { country: 'US' },
        variation: projectConfig.holdouts[0].variations[0]
      }));
    });

    it('should handle holdout with included flags', async () => {
      // Modify holdout to include specific flag
      const modifiedHoldout = { ...projectConfig.holdouts[0] };
      modifiedHoldout.includedFlags = ['1001']; // flag_1 ID from test datafile
      projectConfig.holdouts = [modifiedHoldout];

      vi.spyOn(decisionService, 'resolveVariationsForFeatureList').mockImplementation(() => {
        return Value.of('async', [{
          error: false,
          result: {
            variation: modifiedHoldout.variations[0],
            experiment: modifiedHoldout,
            decisionSource: DECISION_SOURCES.HOLDOUT,
          },
          reasons: [],
        }]);
      });

      const user = new OptimizelyUserContext({
        optimizely,
        userId: 'test_user',
        attributes: { country: 'US' },
      });

      const decision = await optimizely.decideAsync(user, 'flag_1', []);

      expect(decision.enabled).toBe(false);
      expect(decision.ruleKey).toBe('holdout_test_key');
      expect(decision.variationKey).toBe('holdout_variation_key');

      // Verify notification shows holdout details
      expect(flagNotificationSpy).toHaveBeenCalledWith({
        type: DECISION_NOTIFICATION_TYPES.FLAG,
        userId: 'test_user',
        attributes: { country: 'US' },
        decisionInfo: expect.objectContaining({
          flagKey: 'flag_1',
          enabled: false,
          ruleKey: 'holdout_test_key',
        }),
      });

      expect(activateNotificationSpy).toHaveBeenCalledWith(expect.objectContaining({
        experiment: null,
        holdout: modifiedHoldout,
        userId: 'test_user',
        attributes: { country: 'US' },
        variation: modifiedHoldout.variations[0]
      }));
    });

    it('should handle holdout with excluded flags', async () => {
      // Modify holdout to exclude specific flag
      const modifiedHoldout = { ...projectConfig.holdouts[0] };
      modifiedHoldout.excludedFlags = ['1001']; // flag_1 ID from test datafile
      projectConfig.holdouts = [modifiedHoldout];

      // Mock normal feature test behavior for excluded flag
      vi.spyOn(decisionService, 'resolveVariationsForFeatureList').mockImplementation(() => {
        return Value.of('async', [{
          error: false,
          result: {
            variation: projectConfig.variationIdMap['5003'],
            experiment: projectConfig.experimentKeyMap['exp_3'],
            decisionSource: DECISION_SOURCES.FEATURE_TEST,
          },
          reasons: [],
        }]);
      });

      const user = new OptimizelyUserContext({
        optimizely,
        userId: 'test_user',
        attributes: { country: 'BD', age: 80 },
      });

      const decision = await optimizely.decideAsync(user, 'flag_1', []);

      expect(decision.enabled).toBe(true);
      expect(decision.ruleKey).toBe('exp_3');
      expect(decision.variationKey).toBe('variation_3');

      // Verify notification shows normal experiment details (not holdout)
      expect(flagNotificationSpy).toHaveBeenCalledWith({
        type: DECISION_NOTIFICATION_TYPES.FLAG,
        userId: 'test_user',
        attributes: { country: 'BD', age: 80 },
        decisionInfo: expect.objectContaining({
          flagKey: 'flag_1',
          enabled: true,
          ruleKey: 'exp_3',
        }),
      });

      expect(activateNotificationSpy).toHaveBeenCalledWith(expect.objectContaining({
        experiment: projectConfig.experimentKeyMap['exp_3'],
        holdout: null,
        userId: 'test_user',
        attributes: { country: 'BD', age: 80 },
        variation: projectConfig.variationIdMap['5003']
      }));
    });

    it('should handle multiple holdouts with correct priority', async () => {
      // Setup multiple holdouts
      const holdout1 = { ...projectConfig.holdouts[0] };
      holdout1.excludedFlags = ['1001']; // exclude flag_1

      const holdout2 = {
        id: 'holdout_test_id_2',
        key: 'holdout_test_key_2',
        status: 'Running',
        includedFlags: ['1001'], // include flag_1
        excludedFlags: [],
        audienceIds: [],
        audienceConditions: [],
        variations: [
          {
            id: 'holdout_variation_id_2',
            key: 'holdout_variation_key_2',
            variables: [],
            featureEnabled: false,
          },
        ],
        trafficAllocation: [
          {
            entityId: 'holdout_variation_id_2',
            endOfRange: 10000,
          },
        ],
      };

      projectConfig.holdouts = [holdout1, holdout2];

      // Mock that holdout2 takes priority due to includedFlags
      vi.spyOn(decisionService, 'resolveVariationsForFeatureList').mockImplementation(() => {
        return Value.of('async', [{
          error: false,
          result: {
            variation: holdout2.variations[0],
            experiment: holdout2,
            decisionSource: DECISION_SOURCES.HOLDOUT,
          },
          reasons: [],
        }]);
      });

      const user = new OptimizelyUserContext({
        optimizely,
        userId: 'test_user',
        attributes: { country: 'US' },
      });

      const decision = await optimizely.decideAsync(user, 'flag_1', []);

      expect(decision.enabled).toBe(false);
      expect(decision.ruleKey).toBe('holdout_test_key_2');
      expect(decision.variationKey).toBe('holdout_variation_key_2');

      // Verify notification shows details of selected holdout
      expect(flagNotificationSpy).toHaveBeenCalledWith({
        type: DECISION_NOTIFICATION_TYPES.FLAG,
        userId: 'test_user',
        attributes: { country: 'US' },
        decisionInfo: expect.objectContaining({
          flagKey: 'flag_1',
          enabled: false,
          ruleKey: 'holdout_test_key_2',
        }),
      });

      expect(activateNotificationSpy).toHaveBeenCalledWith(expect.objectContaining({
        experiment: null,
        holdout: holdout2,
        userId: 'test_user',
        attributes: { country: 'US' },
        variation: holdout2.variations[0]
      }));
    });

    it('should respect sendFlagDecisions setting for holdout events - false', async () => {
      // Set sendFlagDecisions to false
      projectConfig.sendFlagDecisions = false;

      const mockEventDispatcher = {
        dispatchEvent: vi.fn(() => Promise.resolve({ statusCode: 200 })),
      };
      const eventProcessor = getForwardingEventProcessor(mockEventDispatcher);
      const processSpy = vi.spyOn(eventProcessor, 'process');

      const projectConfigManager = getMockProjectConfigManager({
        initConfig: projectConfig,
      });

      const optimizelyWithConfig = new Optimizely({
        clientEngine: 'node-sdk',
        projectConfigManager,
        eventProcessor,
        jsonSchemaValidator,
        logger,
        odpManager,
        disposable: true,
        cmabService: {} as any
      });

      // Add notification listener
      const notificationSpyLocal = vi.fn();
      optimizelyWithConfig.notificationCenter.addNotificationListener(
        NOTIFICATION_TYPES.DECISION,
        notificationSpyLocal
      );

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const decisionServiceLocal = optimizelyWithConfig.decisionService;
      vi.spyOn(decisionServiceLocal, 'resolveVariationsForFeatureList').mockImplementation(() => {
        return Value.of('async', [{
          error: false,
          result: {
            variation: projectConfig.holdouts[0].variations[0],
            experiment: projectConfig.holdouts[0],
            decisionSource: DECISION_SOURCES.HOLDOUT,
          },
          reasons: [],
        }]);
      });

      const user = new OptimizelyUserContext({
        optimizely: optimizelyWithConfig,
        userId: 'test_user',
        attributes: { country: 'US' },
      });

      await optimizelyWithConfig.decideAsync(user, 'flag_1', []);

      // Impression event should still be dispatched for holdouts even when sendFlagDecisions is false
      expect(processSpy).toHaveBeenCalledOnce();

      // Verify notification shows decisionEventDispatched: true
      expect(notificationSpyLocal).toHaveBeenCalledWith({
        type: DECISION_NOTIFICATION_TYPES.FLAG,
        userId: 'test_user',
        attributes: { country: 'US' },
        decisionInfo: expect.objectContaining({
          decisionEventDispatched: true,
        }),
      });
    });

    it('should respect sendFlagDecisions setting for holdout events - true', async () => {
      // Set sendFlagDecisions to true
      projectConfig.sendFlagDecisions = true;

      const mockEventDispatcher = {
        dispatchEvent: vi.fn(() => Promise.resolve({ statusCode: 200 })),
      };
      const eventProcessor = getForwardingEventProcessor(mockEventDispatcher);
      const processSpy = vi.spyOn(eventProcessor, 'process');

      const projectConfigManager = getMockProjectConfigManager({
        initConfig: projectConfig,
      });

      const optimizelyWithConfig = new Optimizely({
        clientEngine: 'node-sdk',
        projectConfigManager,
        eventProcessor,
        jsonSchemaValidator,
        logger,
        odpManager,
        disposable: true,
        cmabService: {} as any
      });

      // Add notification listener
      const notificationSpyLocal = vi.fn();
      optimizelyWithConfig.notificationCenter.addNotificationListener(
        NOTIFICATION_TYPES.DECISION,
        notificationSpyLocal
      );

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const decisionServiceLocal = optimizelyWithConfig.decisionService;
      vi.spyOn(decisionServiceLocal, 'resolveVariationsForFeatureList').mockImplementation(() => {
        return Value.of('async', [{
          error: false,
          result: {
            variation: projectConfig.holdouts[0].variations[0],
            experiment: projectConfig.holdouts[0],
            decisionSource: DECISION_SOURCES.HOLDOUT,
          },
          reasons: [],
        }]);
      });

      const user = new OptimizelyUserContext({
        optimizely: optimizelyWithConfig,
        userId: 'test_user',
        attributes: { country: 'US' },
      });

      await optimizelyWithConfig.decideAsync(user, 'flag_1', []);

      // Impression event should be dispatched for holdouts
      expect(processSpy).toHaveBeenCalledOnce();

      // Verify notification shows decisionEventDispatched: true
      expect(notificationSpyLocal).toHaveBeenCalledWith({
        type: DECISION_NOTIFICATION_TYPES.FLAG,
        userId: 'test_user',
        attributes: { country: 'US' },
        decisionInfo: expect.objectContaining({
          decisionEventDispatched: true,
        }),
      });
    });

    it('should return correct variable values for holdout decision', async () => {
      vi.spyOn(decisionService, 'resolveVariationsForFeatureList').mockImplementation(() => {
        return Value.of('async', [{
          error: false,
          result: {
            variation: projectConfig.holdouts[0].variations[0],
            experiment: projectConfig.holdouts[0],
            decisionSource: DECISION_SOURCES.HOLDOUT,
          },
          reasons: [],
        }]);
      });

      const user = new OptimizelyUserContext({
        optimizely,
        userId: 'test_user',
        attributes: { country: 'US' },
      });

      const decision = await optimizely.decideAsync(user, 'flag_1', []);

      expect(decision.enabled).toBe(false);
      expect(decision.variables).toBeDefined();
      expect(typeof decision.variables).toBe('object');

      // Verify notification includes variable information
      expect(flagNotificationSpy).toHaveBeenCalledWith({
        type: DECISION_NOTIFICATION_TYPES.FLAG,
        userId: 'test_user',
        attributes: { country: 'US' },
        decisionInfo: expect.objectContaining({
          variables: expect.any(Object),
          flagKey: 'flag_1',
          enabled: false,
        }),
      });

      expect(activateNotificationSpy).toHaveBeenCalledWith(expect.objectContaining({
        experiment: null,
        holdout: projectConfig.holdouts[0],
        userId: 'test_user',
        attributes: { country: 'US' },
        variation: projectConfig.holdouts[0].variations[0]
      }));
    });

    it('should handle disable decision event option for holdout', async () => {
      const mockEventDispatcher = {
        dispatchEvent: vi.fn(() => Promise.resolve({ statusCode: 200 })),
      };
      const eventProcessor = getForwardingEventProcessor(mockEventDispatcher);
      const processSpy = vi.spyOn(eventProcessor, 'process');

      const projectConfigManager = getMockProjectConfigManager({
        initConfig: projectConfig,
      });

      const optimizelyWithEventProcessor = new Optimizely({
        clientEngine: 'node-sdk',
        projectConfigManager,
        eventProcessor,
        jsonSchemaValidator,
        logger,
        odpManager,
        disposable: true,
        cmabService: {} as any
      });

      // Add notification listener
      const notificationSpyLocal = vi.fn();
      optimizelyWithEventProcessor.notificationCenter.addNotificationListener(
        NOTIFICATION_TYPES.DECISION,
        notificationSpyLocal
      );

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const decisionServiceLocal = optimizelyWithEventProcessor.decisionService;
      vi.spyOn(decisionServiceLocal, 'resolveVariationsForFeatureList').mockImplementation(() => {
        return Value.of('async', [{
          error: false,
          result: {
            variation: projectConfig.holdouts[0].variations[0],
            experiment: projectConfig.holdouts[0],
            decisionSource: DECISION_SOURCES.HOLDOUT,
          },
          reasons: [],
        }]);
      });

      const user = new OptimizelyUserContext({
        optimizely: optimizelyWithEventProcessor,
        userId: 'test_user',
        attributes: { country: 'US' },
      });

      const decision = await optimizelyWithEventProcessor.decideAsync(user, 'flag_1', [OptimizelyDecideOption.DISABLE_DECISION_EVENT]);

      expect(decision.enabled).toBe(false);
      expect(decision.ruleKey).toBe('holdout_test_key');

      // No impression event should be dispatched
      expect(processSpy).not.toHaveBeenCalled();

      // Verify notification shows decisionEventDispatched: false
      expect(notificationSpyLocal).toHaveBeenCalledWith({
        type: DECISION_NOTIFICATION_TYPES.FLAG,
        userId: 'test_user',
        attributes: { country: 'US' },
        decisionInfo: expect.objectContaining({
          decisionEventDispatched: false,
        }),
      });
    });
  });
});
