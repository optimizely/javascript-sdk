/**
 * Copyright 2025, Optimizely
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
import { describe, it, expect, vi, MockInstance, beforeEach } from 'vitest';
import { DecisionService } from '.';
import { getMockLogger } from '../../tests/mock/mock_logger';
import OptimizelyUserContext from '../../optimizely_user_context';
import { bucket } from '../bucketer';
import { getTestProjectConfig, getTestProjectConfigWithFeatures } from '../../tests/test_data';
import { createProjectConfig, ProjectConfig } from '../../project_config/project_config';
import { BucketerParams, Experiment, UserProfile } from '../../shared_types';
import { CONTROL_ATTRIBUTES, DECISION_SOURCES } from '../../utils/enums';
import { getDecisionTestDatafile } from '../../tests/decision_test_datafile';

import { 
  USER_HAS_NO_FORCED_VARIATION,
  VALID_BUCKETING_ID,
  SAVED_USER_VARIATION,
  SAVED_VARIATION_NOT_FOUND,
} from 'log_message';

import {
  EXPERIMENT_NOT_RUNNING,
  RETURNING_STORED_VARIATION,
  USER_NOT_IN_EXPERIMENT,
  USER_FORCED_IN_VARIATION,
  EVALUATING_AUDIENCES_COMBINED,
  AUDIENCE_EVALUATION_RESULT_COMBINED,
  USER_IN_ROLLOUT,
  USER_NOT_IN_ROLLOUT,
  FEATURE_HAS_NO_EXPERIMENTS,
  USER_DOESNT_MEET_CONDITIONS_FOR_TARGETING_RULE,
  USER_NOT_BUCKETED_INTO_TARGETING_RULE,
  USER_BUCKETED_INTO_TARGETING_RULE,
  NO_ROLLOUT_EXISTS,
  USER_MEETS_CONDITIONS_FOR_TARGETING_RULE,
} from '../decision_service/index';

import { BUCKETING_ID_NOT_STRING, USER_PROFILE_LOOKUP_ERROR, USER_PROFILE_SAVE_ERROR } from 'error_message';
import exp from 'constants';

type MockLogger = ReturnType<typeof getMockLogger>;

type MockUserProfileService = {
  lookup: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
};

type DecisionServiceInstanceOpt = {
  logger?: boolean;
  userProfileService?: boolean;
}

type DecisionServiceInstance = {
  logger?: MockLogger;
  userProfileService?: MockUserProfileService;
  decisionService: DecisionService;
}

const getDecisionService = (opt: DecisionServiceInstanceOpt = {}): DecisionServiceInstance => {
  const logger = opt.logger ? getMockLogger() : undefined;
  const userProfileService = opt.userProfileService ? {
    lookup: vi.fn(),
    save: vi.fn(),
  } : undefined;

  const decisionService = new DecisionService({
    logger,
    userProfileService,
    UNSTABLE_conditionEvaluators: {},
  });

  return {
    logger,
    userProfileService,
    decisionService,
  };
};

const mockBucket: MockInstance<typeof bucket> = vi.hoisted(() => vi.fn());

vi.mock('../bucketer', () => ({
  bucket: mockBucket,
}));

const cloneDeep = (d: any) => JSON.parse(JSON.stringify(d));

const testData = getTestProjectConfig();
const testDataWithFeatures = getTestProjectConfigWithFeatures();

const verifyBucketCall = (
  call: number,
  projectConfig: ProjectConfig,
  experiment: Experiment,
  user: OptimizelyUserContext,
  bucketIdFromAttribute = false,
) => {
  const {
    experimentId,
    experimentKey,
    userId,
    trafficAllocationConfig,
    experimentKeyMap,
    experimentIdMap,
    groupIdMap,
    variationIdMap,
    bucketingId,
  } = mockBucket.mock.calls[call][0];
  expect(experimentId).toBe(experiment.id);
  expect(experimentKey).toBe(experiment.key);
  expect(userId).toBe(user.getUserId());
  expect(trafficAllocationConfig).toBe(experiment.trafficAllocation);
  expect(experimentKeyMap).toBe(projectConfig.experimentKeyMap);
  expect(experimentIdMap).toBe(projectConfig.experimentIdMap);
  expect(groupIdMap).toBe(projectConfig.groupIdMap);
  expect(variationIdMap).toBe(projectConfig.variationIdMap);
  expect(bucketingId).toBe(bucketIdFromAttribute ? user.getAttributes()[CONTROL_ATTRIBUTES.BUCKETING_ID] : user.getUserId());
};

describe('DecisionService', () => {
  describe('getVariation', function() {
    beforeEach(() => {
      mockBucket.mockClear();
    });

    it('should return the correct variation from bucketer for the given experiment key and user ID for a running experiment', () => {
      const user = new OptimizelyUserContext({
        optimizely: {} as any,
        userId: 'tester'
      });

      const config = createProjectConfig(cloneDeep(testData));

      const fakeDecisionResponse = {
        result: '111128',
        reasons: [],
      };

      const experiment = config.experimentIdMap['111127'];

      mockBucket.mockReturnValue(fakeDecisionResponse); // contains variation ID of the 'control' variation from `test_data`

      const { decisionService } = getDecisionService();

      const variation = decisionService.getVariation(config, experiment, user);

      expect(variation.result).toBe('control');

      expect(mockBucket).toHaveBeenCalledTimes(1);
      verifyBucketCall(0, config, experiment, user);
    });

    it('should use $opt_bucketing_id attribute as bucketing id if provided', () => {
      const user = new OptimizelyUserContext({
        optimizely: {} as any,
        userId: 'tester',
        attributes: {
          $opt_bucketing_id: 'test_bucketing_id',
        },
      });

      const config = createProjectConfig(cloneDeep(testData));

      const fakeDecisionResponse = {
        result: '111128',
        reasons: [],
      };

      const experiment = config.experimentIdMap['111127'];

      mockBucket.mockReturnValue(fakeDecisionResponse); // contains variation ID of the 'control' variation from `test_data`

      const { decisionService } = getDecisionService();

      const variation = decisionService.getVariation(config, experiment, user);

      expect(variation.result).toBe('control');

      expect(mockBucket).toHaveBeenCalledTimes(1);
      verifyBucketCall(0, config, experiment, user, true);
    });

    it('should return the whitelisted variation if the user is whitelisted', function() {
      const user = new OptimizelyUserContext({
        optimizely: {} as any,
        userId: 'user2'
      });

      const config = createProjectConfig(cloneDeep(testData));

      const experiment = config.experimentIdMap['122227'];

      const { decisionService, logger } = getDecisionService({ logger: true });

      const variation = decisionService.getVariation(config, experiment, user);

      expect(variation.result).toBe('variationWithAudience');
      expect(mockBucket).not.toHaveBeenCalled();
      expect(logger?.debug).toHaveBeenCalledTimes(1);
      expect(logger?.info).toHaveBeenCalledTimes(1);

      expect(logger?.debug).toHaveBeenNthCalledWith(1, USER_HAS_NO_FORCED_VARIATION, 'user2');
      expect(logger?.info).toHaveBeenNthCalledWith(1, USER_FORCED_IN_VARIATION, 'user2', 'variationWithAudience');
    });

    it('should return null if the user does not meet audience conditions', () => {
      const user = new OptimizelyUserContext({
        optimizely: {} as any,
        userId: 'user3'
      });

      const config = createProjectConfig(cloneDeep(testData));

      const experiment = config.experimentIdMap['122227'];

      const { decisionService, logger } = getDecisionService({ logger: true });

      const variation = decisionService.getVariation(config, experiment, user);

      expect(variation.result).toBe(null);
      expect(mockBucket).not.toHaveBeenCalled();

      expect(logger?.debug).toHaveBeenNthCalledWith(1, USER_HAS_NO_FORCED_VARIATION, 'user3');
      expect(logger?.debug).toHaveBeenNthCalledWith(2, EVALUATING_AUDIENCES_COMBINED, 'experiment', 'testExperimentWithAudiences', JSON.stringify(["11154"]));

      expect(logger?.info).toHaveBeenNthCalledWith(1, AUDIENCE_EVALUATION_RESULT_COMBINED, 'experiment', 'testExperimentWithAudiences', 'FALSE');
      expect(logger?.info).toHaveBeenNthCalledWith(2, USER_NOT_IN_EXPERIMENT, 'user3', 'testExperimentWithAudiences');
    });

    it('should return the forced variation set using setForcedVariation \
        in presence of a whitelisted variation', function() {
      const user = new OptimizelyUserContext({
        optimizely: {} as any,
        userId: 'user2'
      });

      const config = createProjectConfig(cloneDeep(testData));

      const experiment = config.experimentIdMap['122227'];

      const { decisionService } = getDecisionService();

      const forcedVariation = 'controlWithAudience';

      decisionService.setForcedVariation(config, experiment.key, user.getUserId(), forcedVariation);

      const variation = decisionService.getVariation(config, experiment, user);
      expect(variation.result).toBe(forcedVariation);

      const whitelistedVariation = experiment.forcedVariations?.[user.getUserId()];
      expect(whitelistedVariation).toBeDefined();
      expect(whitelistedVariation).not.toEqual(forcedVariation);
    });

    it('should return the forced variation set using setForcedVariation \
        even if user does not satisfy audience condition', function() {
      const user = new OptimizelyUserContext({
        optimizely: {} as any,
        userId: 'user3', // no attributes are set, should not satisfy audience condition 11154
      });

      const config = createProjectConfig(cloneDeep(testData));

      const experiment = config.experimentIdMap['122227'];

      const { decisionService } = getDecisionService();

      const forcedVariation = 'controlWithAudience';

      decisionService.setForcedVariation(config, experiment.key, user.getUserId(), forcedVariation);

      const variation = decisionService.getVariation(config, experiment, user);
      expect(variation.result).toBe(forcedVariation);
    });

    it('should return null if the experiment is not running', function() {
      const user = new OptimizelyUserContext({
        optimizely: {} as any,
        userId: 'user1'
      });

      const config = createProjectConfig(cloneDeep(testData));
            
      const experiment = config.experimentIdMap['133337'];

      const { decisionService, logger } = getDecisionService({ logger: true });

      const variation = decisionService.getVariation(config, experiment, user);

      expect(variation.result).toBe(null);
      expect(mockBucket).not.toHaveBeenCalled();
      expect(logger?.info).toHaveBeenCalledTimes(1);
      expect(logger?.info).toHaveBeenNthCalledWith(1, EXPERIMENT_NOT_RUNNING, 'testExperimentNotRunning');
    });

    it('should respect the sticky bucketing information for attributes when attributes.$opt_experiment_bucket_map is supplied', () => {
      const fakeDecisionResponse = {
        result: '111128',
        reasons: [],
      };

      const config = createProjectConfig(cloneDeep(testData)); 
      const experiment = config.experimentIdMap['111127'];

      const attributes: any = {
        $opt_experiment_bucket_map: {
          '111127': {
            variation_id: '111129', // ID of the 'variation' variation
          },
        },
      };

      const user = new OptimizelyUserContext({
        optimizely: {} as any,
        userId: 'decision_service_user',
        attributes,
      });
  
      mockBucket.mockReturnValue(fakeDecisionResponse); // contains variation ID of the 'control' variation from `test_data`

      const { decisionService } = getDecisionService();

      const variation = decisionService.getVariation(config, experiment, user);

      expect(variation.result).toBe('variation');
      expect(mockBucket).not.toHaveBeenCalled();
    });

    describe('when a user profile service is provided', function() {
      beforeEach(() => {
        mockBucket.mockClear();
      });

      it('should return the previously bucketed variation', () => {
        const { decisionService, userProfileService, logger } = getDecisionService({ userProfileService: true, logger: true });

        userProfileService?.lookup.mockReturnValue({
          user_id: 'decision_service_user',
          experiment_bucket_map: {
            '111127': {
              variation_id: '111129', // ID of the 'variation' variation
            },
          },
        });

        mockBucket.mockReturnValue({
          result: '111128', // ID of the 'control' variation
          reasons: [],
        });

        const config = createProjectConfig(cloneDeep(testData));
        const experiment = config.experimentIdMap['111127'];

        const user = new OptimizelyUserContext({
          optimizely: {} as any,
          userId: 'decision_service_user',
        });

        const variation = decisionService.getVariation(config, experiment, user);
        expect(variation.result).toBe('variation');

        expect(userProfileService?.lookup).toHaveBeenCalledTimes(1);
        expect(userProfileService?.lookup).toHaveBeenCalledWith('decision_service_user');
        expect(mockBucket).not.toHaveBeenCalled();

        expect(logger?.debug).toHaveBeenCalledTimes(1);
        expect(logger?.info).toHaveBeenCalledTimes(1);

        expect(logger?.debug).toHaveBeenNthCalledWith(1, USER_HAS_NO_FORCED_VARIATION, 'decision_service_user');
        expect(logger?.info).toHaveBeenNthCalledWith(1, RETURNING_STORED_VARIATION, 'variation', 'testExperiment', 'decision_service_user');
      });

      it('should bucket and save user profile if there was no prevously bucketed variation', function() {
        mockBucket.mockReturnValue({
          result: '111128', // ID of the 'control' variation
          reasons: [],
        });

        const { decisionService, userProfileService, logger } = getDecisionService({ userProfileService: true, logger: true });

        userProfileService?.lookup.mockReturnValue({
          user_id: 'decision_service_user',
          experiment_bucket_map: {},
        });

        const config = createProjectConfig(cloneDeep(testData));
        const experiment = config.experimentIdMap['111127'];

        const user = new OptimizelyUserContext({
          optimizely: {} as any,
          userId: 'decision_service_user',
        });

        const variation = decisionService.getVariation(config, experiment, user);
        expect(variation.result).toBe('control');

        expect(userProfileService?.lookup).toHaveBeenCalledTimes(1);
        expect(userProfileService?.lookup).toHaveBeenCalledWith('decision_service_user');

        expect(mockBucket).toHaveBeenCalledTimes(1);
        verifyBucketCall(0, config, experiment, user);

        expect(userProfileService?.save).toHaveBeenCalledTimes(1);
        expect(userProfileService?.save).toHaveBeenCalledWith({
          user_id: 'decision_service_user',
          experiment_bucket_map: {
            '111127': {
              variation_id: '111128',
            },
          },
        });
      });
    
      it('should bucket if the user profile service returns null', function() {
        mockBucket.mockReturnValue({
          result: '111128', // ID of the 'control' variation
          reasons: [],
        });

        const { decisionService, userProfileService, logger } = getDecisionService({ userProfileService: true, logger: true });

        userProfileService?.lookup.mockReturnValue(null);

        const config = createProjectConfig(cloneDeep(testData));
        const experiment = config.experimentIdMap['111127'];

        const user = new OptimizelyUserContext({
          optimizely: {} as any,
          userId: 'decision_service_user',
        });

        const variation = decisionService.getVariation(config, experiment, user);
        expect(variation.result).toBe('control');

        expect(userProfileService?.lookup).toHaveBeenCalledTimes(1);
        expect(userProfileService?.lookup).toHaveBeenCalledWith('decision_service_user');

        expect(mockBucket).toHaveBeenCalledTimes(1);
        verifyBucketCall(0, config, experiment, user);

        expect(userProfileService?.save).toHaveBeenCalledTimes(1);
        expect(userProfileService?.save).toHaveBeenCalledWith({
          user_id: 'decision_service_user',
          experiment_bucket_map: {
            '111127': {
              variation_id: '111128',
            },
          },
        });
      });

      it('should re-bucket if the stored variation is no longer valid', function() {
        mockBucket.mockReturnValue({
          result: '111128', // ID of the 'control' variation
          reasons: [],
        });

        const { decisionService, userProfileService, logger } = getDecisionService({ userProfileService: true, logger: true });

        userProfileService?.lookup.mockReturnValue({
          user_id: 'decision_service_user',
          experiment_bucket_map: {
            '111127': {
              variation_id: 'not valid variation',
            },
          },
        });

        const config = createProjectConfig(cloneDeep(testData));
        const experiment = config.experimentIdMap['111127'];

        const user = new OptimizelyUserContext({
          optimizely: {} as any,
          userId: 'decision_service_user',
        });

        const variation = decisionService.getVariation(config, experiment, user);
        expect(variation.result).toBe('control');

        expect(userProfileService?.lookup).toHaveBeenCalledTimes(1);
        expect(userProfileService?.lookup).toHaveBeenCalledWith('decision_service_user');

        expect(mockBucket).toHaveBeenCalledTimes(1);
        verifyBucketCall(0, config, experiment, user);

        expect(logger?.debug).toHaveBeenCalledWith(USER_HAS_NO_FORCED_VARIATION, 'decision_service_user');
        expect(logger?.info).toHaveBeenCalledWith(SAVED_VARIATION_NOT_FOUND, 'decision_service_user', 'not valid variation', 'testExperiment');

        expect(userProfileService?.save).toHaveBeenCalledTimes(1);
        expect(userProfileService?.save).toHaveBeenCalledWith({
          user_id: 'decision_service_user',
          experiment_bucket_map: {
            '111127': {
              variation_id: '111128',
            },
          },
        });
      });

      it('should store the bucketed variation for the user', function() {
        mockBucket.mockReturnValue({
          result: '111128', // ID of the 'control' variation
          reasons: [],
        });

        const { decisionService, userProfileService, logger } = getDecisionService({ userProfileService: true, logger: true });

        userProfileService?.lookup.mockReturnValue({
          user_id: 'decision_service_user',
          experiment_bucket_map: {},
        });

        const config = createProjectConfig(cloneDeep(testData));
        const experiment = config.experimentIdMap['111127'];

        const user = new OptimizelyUserContext({
          optimizely: {} as any,
          userId: 'decision_service_user',
        });

        const variation = decisionService.getVariation(config, experiment, user);
        expect(variation.result).toBe('control');
        
        expect(userProfileService?.lookup).toHaveBeenCalledTimes(1);
        expect(userProfileService?.lookup).toHaveBeenCalledWith('decision_service_user');

        expect(mockBucket).toHaveBeenCalledTimes(1);
        verifyBucketCall(0, config, experiment, user);

        expect(userProfileService?.save).toHaveBeenCalledTimes(1);
        expect(userProfileService?.save).toHaveBeenCalledWith({
          user_id: 'decision_service_user',
          experiment_bucket_map: {
            '111127': {
              variation_id: '111128',
            },
          },
        });
      });


      it('should log an error message and bucket if "lookup" throws an error', () => {
        mockBucket.mockReturnValue({
          result: '111128', // ID of the 'control' variation
          reasons: [],
        });

        const { decisionService, userProfileService, logger } = getDecisionService({ userProfileService: true, logger: true });

        userProfileService?.lookup.mockImplementation(() => {
          throw new Error('I am an error');
        });

        const config = createProjectConfig(cloneDeep(testData));
        const experiment = config.experimentIdMap['111127'];

        const user = new OptimizelyUserContext({
          optimizely: {} as any,
          userId: 'decision_service_user',
        });

        const variation = decisionService.getVariation(config, experiment, user);
        expect(variation.result).toBe('control');
        
        expect(userProfileService?.lookup).toHaveBeenCalledTimes(1);
        expect(userProfileService?.lookup).toHaveBeenCalledWith('decision_service_user');

        expect(mockBucket).toHaveBeenCalledTimes(1);
        verifyBucketCall(0, config, experiment, user);

        expect(logger?.debug).toHaveBeenCalledWith(USER_HAS_NO_FORCED_VARIATION, 'decision_service_user');
        expect(logger?.error).toHaveBeenCalledWith(USER_PROFILE_LOOKUP_ERROR, 'decision_service_user', 'I am an error');

        expect(userProfileService?.save).toHaveBeenCalledTimes(1);
        expect(userProfileService?.save).toHaveBeenCalledWith({
          user_id: 'decision_service_user',
          experiment_bucket_map: {
            '111127': {
              variation_id: '111128',
            },
          },
        });
      });

      it('should log an error message if "save" throws an error', () => {
        mockBucket.mockReturnValue({
          result: '111128', // ID of the 'control' variation
          reasons: [],
        });

        const { decisionService, userProfileService, logger } = getDecisionService({ userProfileService: true, logger: true });

        userProfileService?.lookup.mockReturnValue(null);
        userProfileService?.save.mockImplementation(() => {
          throw new Error('I am an error');
        });

        const config = createProjectConfig(cloneDeep(testData));
        const experiment = config.experimentIdMap['111127'];

        const user = new OptimizelyUserContext({
          optimizely: {} as any,
          userId: 'decision_service_user',
        });

        const variation = decisionService.getVariation(config, experiment, user);
        expect(variation.result).toBe('control');
        
        expect(userProfileService?.lookup).toHaveBeenCalledTimes(1);
        expect(userProfileService?.lookup).toHaveBeenCalledWith('decision_service_user');

        expect(mockBucket).toHaveBeenCalledTimes(1);
        verifyBucketCall(0, config, experiment, user);

        expect(userProfileService?.save).toHaveBeenCalledTimes(1);
        expect(userProfileService?.save).toHaveBeenCalledWith({
          user_id: 'decision_service_user',
          experiment_bucket_map: {
            '111127': {
              variation_id: '111128',
            },
          },
        });

        expect(logger?.error).toHaveBeenCalledWith(USER_PROFILE_SAVE_ERROR, 'decision_service_user', 'I am an error');
      });

      it('should respect $opt_experiment_bucket_map attribute over the userProfileService for the matching experiment id', function() {
        const { decisionService, userProfileService, logger } = getDecisionService({ userProfileService: true, logger: true });

        userProfileService?.lookup.mockReturnValue({
          user_id: 'decision_service_user',
          experiment_bucket_map: {
            '111127': {
              variation_id: '111128', // ID of the 'control' variation
            },
          },
        });

        const config = createProjectConfig(cloneDeep(testData));
        const experiment = config.experimentIdMap['111127'];

        const attributes: any = {
          $opt_experiment_bucket_map: {
            '111127': {
              variation_id: '111129', // ID of the 'variation' variation
            },
          },
        };

        const user = new OptimizelyUserContext({
          optimizely: {} as any,
          userId: 'decision_service_user',
          attributes,
        });

        const variation = decisionService.getVariation(config, experiment, user);
        expect(variation.result).toBe('variation');
      });

      it('should ignore attributes for a different experiment id', function() {
        const { decisionService, userProfileService, logger } = getDecisionService({ userProfileService: true, logger: true });

        userProfileService?.lookup.mockReturnValue({
          user_id: 'decision_service_user',
          experiment_bucket_map: {
            '111127': {
              variation_id: '111128', // ID of the 'control' variation
            },
          },
        });

        const config = createProjectConfig(cloneDeep(testData));
        const experiment = config.experimentIdMap['111127'];

        const attributes: any = {
          $opt_experiment_bucket_map: {
            '122227': {
              variation_id: '111129', // ID of the 'variation' variation
            },
          },
        };

        const user = new OptimizelyUserContext({
          optimizely: {} as any,
          userId: 'decision_service_user',
          attributes,
        });

        const variation = decisionService.getVariation(config, experiment, user);
        expect(variation.result).toBe('control');
      });

      it('should use $ opt_experiment_bucket_map attribute when the userProfile contains variations for other experiments', function() {
        const { decisionService, userProfileService, logger } = getDecisionService({ userProfileService: true, logger: true });

        userProfileService?.lookup.mockReturnValue({
          user_id: 'decision_service_user',
          experiment_bucket_map: {
            '122227': {
              variation_id: '122229', // ID of the 'variationWithAudience' variation
            },
          },
        });

        const config = createProjectConfig(cloneDeep(testData));
        const experiment = config.experimentIdMap['111127'];

        const attributes: any = {
          $opt_experiment_bucket_map: {
            '111127': {
              variation_id: '111129', // ID of the 'variation' variation
            },
          },
        };

        const user = new OptimizelyUserContext({
          optimizely: {} as any,
          userId: 'decision_service_user',
          attributes,
        });

        const variation = decisionService.getVariation(config, experiment, user);
        expect(variation.result).toBe('variation');
      });

      it('should use attributes when the userProfileLookup returns null', function() {
        const { decisionService, userProfileService, logger } = getDecisionService({ userProfileService: true, logger: true });

        userProfileService?.lookup.mockReturnValue(null);

        const config = createProjectConfig(cloneDeep(testData));
        const experiment = config.experimentIdMap['111127'];

        const attributes: any = {
          $opt_experiment_bucket_map: {
            '111127': {
              variation_id: '111129', // ID of the 'variation' variation
            },
          },
        };

        const user = new OptimizelyUserContext({
          optimizely: {} as any,
          userId: 'decision_service_user',
          attributes,
        });

        const variation = decisionService.getVariation(config, experiment, user);
        expect(variation.result).toBe('variation');
      });
    });
  });

  describe('getVariationForFeature', () => {
    beforeEach(() => {
      mockBucket.mockReset();
    });

    it('should return variation from the first experiment for which a variation is available', () => {
      const { decisionService } = getDecisionService();

      const resolveVariationSpy = vi.spyOn(decisionService as any, 'resolveVariation')
        .mockImplementation((
          config,
          experiment: any,
          user,
          shouldIgnoreUPS,
          userProfileTracker
        ) => {
          if (experiment.key === 'exp_2') {
            return {
              result: 'variation_2',
              reasons: [],
            };
          }
          return {
            result: null,
            reasons: [],
          }
        });

      const config = createProjectConfig(getDecisionTestDatafile());

      const user = new OptimizelyUserContext({
        optimizely: {} as any,
        userId: 'tester',
        attributes: {
          age: 40,
        },
      });

      const feature = config.featureKeyMap['flag_1'];
      const variation = decisionService.getVariationForFeature(config, feature, user);

      expect(variation.result).toEqual({
        experiment: config.experimentKeyMap['exp_2'],
        variation: config.variationIdMap['5002'],
        decisionSource: DECISION_SOURCES.FEATURE_TEST,
      });

      expect(resolveVariationSpy).toHaveBeenCalledTimes(2);
      expect(resolveVariationSpy).toHaveBeenNthCalledWith(1, 
        config, config.experimentKeyMap['exp_1'], user, false, expect.anything());
      expect(resolveVariationSpy).toHaveBeenNthCalledWith(2,
        config, config.experimentKeyMap['exp_2'], user, false, expect.anything());
    });

    it('should return the variation forced for an experiment in the userContext if available', () => {
      const { decisionService } = getDecisionService();

      const resolveVariationSpy = vi.spyOn(decisionService as any, 'resolveVariation')
        .mockImplementation((
          config,
          experiment: any,
          user,
          shouldIgnoreUPS,
          userProfileTracker
        ) => {
          if (experiment.key === 'exp_2') {
            return {
              result: 'variation_2',
              reasons: [],
            };
          }
          return {
            result: null,
            reasons: [],
          }
        });

      const config = createProjectConfig(getDecisionTestDatafile());

      const user = new OptimizelyUserContext({
        optimizely: {} as any,
        userId: 'tester',
        attributes: {
          age: 40,
        },
      });

      user.setForcedDecision(
        { flagKey: 'flag_1', ruleKey: 'exp_2' }, 
        { variationKey: 'variation_5' }
      );

      const feature = config.featureKeyMap['flag_1'];
      const variation = decisionService.getVariationForFeature(config, feature, user);

      expect(variation.result).toEqual({
        experiment: config.experimentKeyMap['exp_2'],
        variation: config.variationIdMap['5005'],
        decisionSource: DECISION_SOURCES.FEATURE_TEST,
      });
    });

    it('should save the variation found for an experiment in the user profile', () => {
      const { decisionService, userProfileService } = getDecisionService({ userProfileService: true });

      const resolveVariationSpy = vi.spyOn(decisionService as any, 'resolveVariation')
        .mockImplementation((
          config,
          experiment: any,
          user,
          shouldIgnoreUPS,
          userProfileTracker: any,
        ) => {
          if (experiment.key === 'exp_2') {
            const variation = 'variation_2';

            userProfileTracker.userProfile[experiment.id] = {
              variation_id: '5002',
            };
            userProfileTracker.isProfileUpdated = true;

            return {
              result: 'variation_2',
              reasons: [],
            };
          }
          return {
            result: null,
            reasons: [],
          }
        });

      const config = createProjectConfig(getDecisionTestDatafile());

      const user = new OptimizelyUserContext({
        optimizely: {} as any,
        userId: 'tester',
        attributes: {
          age: 40,
        },
      });

      userProfileService?.lookup.mockImplementation((userId: string) => {
        if (userId === 'tester') {
          return {
            user_id: 'tester',
            experiment_bucket_map: {
              '2001': {
                variation_id: '5001',
              },
            },
          };
        }
        return null;
      });


      const feature = config.featureKeyMap['flag_1'];
      const variation = decisionService.getVariationForFeature(config, feature, user);

      expect(variation.result).toEqual({
        experiment: config.experimentKeyMap['exp_2'],
        variation: config.variationIdMap['5002'],
        decisionSource: DECISION_SOURCES.FEATURE_TEST,
      });

      expect(userProfileService?.lookup).toHaveBeenCalledTimes(1);
      expect(userProfileService?.lookup).toHaveBeenCalledWith('tester');

      expect(userProfileService?.save).toHaveBeenCalledTimes(1);
      expect(userProfileService?.save).toHaveBeenCalledWith({
        user_id: 'tester',
        experiment_bucket_map: {
          '2001': {
            variation_id: '5001',
          },
          '2002': {
            variation_id: '5002',
          },
        },
      });
    });

    describe('when no variation is found for any experiment and a targeted delivery \
        audience condition is satisfied', () => {
      beforeEach(() => {
        mockBucket.mockReset();
      });

      it('should return variation from the target delivery for which audience condition \
          is satisfied if the user is bucketed into it', () => {
        const { decisionService } = getDecisionService();

        const resolveVariationSpy = vi.spyOn(decisionService as any, 'resolveVariation')
          .mockReturnValue({
            result: null,
            reasons: [],
          });

        const config = createProjectConfig(getDecisionTestDatafile());

        const user = new OptimizelyUserContext({
          optimizely: {} as any,
          userId: 'tester',
          attributes: {
            age: 55, // this should satisfy the audience condition for the targeted delivery with key delivery_2 and delivery_3
          },
        });

        mockBucket.mockImplementation((param: BucketerParams) => {
          const ruleKey = param.experimentKey;
          if (ruleKey === 'delivery_2') {
            return {
              result: '5005',
              reasons: [],
            };
          }
          return {
            result: null,
            reasons: [],
          };
        });

        const feature = config.featureKeyMap['flag_1'];
        const variation = decisionService.getVariationForFeature(config, feature, user);

        expect(variation.result).toEqual({
          experiment: config.experimentKeyMap['delivery_2'],
          variation: config.variationIdMap['5005'],
          decisionSource: DECISION_SOURCES.ROLLOUT,
        });

        expect(resolveVariationSpy).toHaveBeenCalledTimes(3);
        expect(resolveVariationSpy).toHaveBeenNthCalledWith(1, 
          config, config.experimentKeyMap['exp_1'], user, false, expect.anything());
        expect(resolveVariationSpy).toHaveBeenNthCalledWith(2,
          config, config.experimentKeyMap['exp_2'], user, false, expect.anything());
        expect(resolveVariationSpy).toHaveBeenNthCalledWith(3,
          config, config.experimentKeyMap['exp_3'], user, false, expect.anything());

        expect(mockBucket).toHaveBeenCalledTimes(1);
        verifyBucketCall(0, config, config.experimentIdMap['3002'], user);
      });

      it('should return variation from the target delivery and use $opt_bucketing_id attribute as bucketing id', () => {
        const { decisionService } = getDecisionService();

        const resolveVariationSpy = vi.spyOn(decisionService as any, 'resolveVariation')
          .mockReturnValue({
            result: null,
            reasons: [],
          });

        const config = createProjectConfig(getDecisionTestDatafile());

        const user = new OptimizelyUserContext({
          optimizely: {} as any,
          userId: 'tester',
          attributes: {
            age: 55, // this should satisfy the audience condition for the targeted delivery with key delivery_2 and delivery_3
            $opt_bucketing_id: 'test_bucketing_id',
          },
        });

        mockBucket.mockImplementation((param: BucketerParams) => {
          const ruleKey = param.experimentKey;
          if (ruleKey === 'delivery_2') {
            return {
              result: '5005',
              reasons: [],
            };
          }
          return {
            result: null,
            reasons: [],
          };
        });

        const feature = config.featureKeyMap['flag_1'];
        const variation = decisionService.getVariationForFeature(config, feature, user);

        expect(variation.result).toEqual({
          experiment: config.experimentKeyMap['delivery_2'],
          variation: config.variationIdMap['5005'],
          decisionSource: DECISION_SOURCES.ROLLOUT,
        });

        expect(resolveVariationSpy).toHaveBeenCalledTimes(3);
        expect(resolveVariationSpy).toHaveBeenNthCalledWith(1, 
          config, config.experimentKeyMap['exp_1'], user, false, expect.anything());
        expect(resolveVariationSpy).toHaveBeenNthCalledWith(2,
          config, config.experimentKeyMap['exp_2'], user, false, expect.anything());
        expect(resolveVariationSpy).toHaveBeenNthCalledWith(3,
          config, config.experimentKeyMap['exp_3'], user, false, expect.anything());

        expect(mockBucket).toHaveBeenCalledTimes(1);
        verifyBucketCall(0, config, config.experimentIdMap['3002'], user, true);
      });

      it('should skip to everyone else targeting rule if the user is not bucketed \
          into the targeted delivery for which audience condition is satisfied', () => {
        const { decisionService } = getDecisionService();

        const resolveVariationSpy = vi.spyOn(decisionService as any, 'resolveVariation')
          .mockReturnValue({
            result: null,
            reasons: [],
          });

        const config = createProjectConfig(getDecisionTestDatafile());

        const user = new OptimizelyUserContext({
          optimizely: {} as any,
          userId: 'tester',
          attributes: {
            age: 55, // this should satisfy the audience condition for the targeted delivery with key delivery_2 and delivery_3
          },
        });

        mockBucket.mockImplementation((param: BucketerParams) => {
          const ruleKey = param.experimentKey;
          if (ruleKey === 'default-rollout-key') {
            return {
              result: '5007',
              reasons: [],
            };
          }
          return {
            result: null,
            reasons: [],
          };
        });

        const feature = config.featureKeyMap['flag_1'];
        const variation = decisionService.getVariationForFeature(config, feature, user);

        expect(variation.result).toEqual({
          experiment: config.experimentIdMap['default-rollout-id'],
          variation: config.variationIdMap['5007'],
          decisionSource: DECISION_SOURCES.ROLLOUT,
        });

        expect(resolveVariationSpy).toHaveBeenCalledTimes(3);
        expect(resolveVariationSpy).toHaveBeenNthCalledWith(1, 
          config, config.experimentKeyMap['exp_1'], user, false, expect.anything());
        expect(resolveVariationSpy).toHaveBeenNthCalledWith(2,
          config, config.experimentKeyMap['exp_2'], user, false, expect.anything());
        expect(resolveVariationSpy).toHaveBeenNthCalledWith(3,
          config, config.experimentKeyMap['exp_3'], user, false, expect.anything());

        expect(mockBucket).toHaveBeenCalledTimes(2);
        verifyBucketCall(0, config, config.experimentIdMap['3002'], user);
        verifyBucketCall(1, config, config.experimentIdMap['default-rollout-id'], user);
      });
    });

    it('should return the forced variation for targeted delivery rule when no variation \
        is found for any experiment and a there is a forced decision \
        for a targeted delivery in the userContext', () => {
      const { decisionService } = getDecisionService();

      const resolveVariationSpy = vi.spyOn(decisionService as any, 'resolveVariation')
        .mockImplementation((
          config,
          experiment: any,
          user,
          shouldIgnoreUPS,
          userProfileTracker
        ) => {
          return {
            result: null,
            reasons: [],
          }
        });

      const config = createProjectConfig(getDecisionTestDatafile());

      const user = new OptimizelyUserContext({
        optimizely: {} as any,
        userId: 'tester', 
      });

      user.setForcedDecision(
        { flagKey: 'flag_1', ruleKey: 'delivery_2' }, 
        { variationKey: 'variation_1' }
      );

      const feature = config.featureKeyMap['flag_1'];
      const variation = decisionService.getVariationForFeature(config, feature, user);

      expect(variation.result).toEqual({
        experiment: config.experimentKeyMap['delivery_2'],
        variation: config.variationIdMap['5001'],
        decisionSource: DECISION_SOURCES.ROLLOUT,
      });
    });

    it('should return variation from the everyone else targeting rule if no variation \
        is found for any experiment or targeted delivery', () => {
      const { decisionService } = getDecisionService();

      const resolveVariationSpy = vi.spyOn(decisionService as any, 'resolveVariation')
        .mockReturnValue({
          result: null,
          reasons: [],
        });

      const config = createProjectConfig(getDecisionTestDatafile());

      const user = new OptimizelyUserContext({
        optimizely: {} as any,
        userId: 'tester',
        attributes: {
          age: 100, // this should not satisfy any audience condition for any targeted delivery
        },
      });

      mockBucket.mockImplementation((param: BucketerParams) => {
        const ruleKey = param.experimentKey;
        if (ruleKey === 'default-rollout-key') {
          return {
            result: '5007',
            reasons: [],
          };
        }
        return {
          result: null,
          reasons: [],
        };
      });

      const feature = config.featureKeyMap['flag_1'];
      const variation = decisionService.getVariationForFeature(config, feature, user);

      expect(variation.result).toEqual({
        experiment: config.experimentIdMap['default-rollout-id'],
        variation: config.variationIdMap['5007'],
        decisionSource: DECISION_SOURCES.ROLLOUT,
      });

      expect(resolveVariationSpy).toHaveBeenCalledTimes(3);
      expect(resolveVariationSpy).toHaveBeenNthCalledWith(1, 
        config, config.experimentKeyMap['exp_1'], user, false, expect.anything());
      expect(resolveVariationSpy).toHaveBeenNthCalledWith(2,
        config, config.experimentKeyMap['exp_2'], user, false, expect.anything());
      expect(resolveVariationSpy).toHaveBeenNthCalledWith(3,
        config, config.experimentKeyMap['exp_3'], user, false, expect.anything());

      expect(mockBucket).toHaveBeenCalledTimes(1);
      verifyBucketCall(0, config, config.experimentIdMap['default-rollout-id'], user);
    });

    it('should return null if no variation is found for any experiment, targeted delivery, or everyone else targeting rule', () => {
      const { decisionService } = getDecisionService();

      const resolveVariationSpy = vi.spyOn(decisionService as any, 'resolveVariation')
        .mockReturnValue({
          result: null,
          reasons: [],
        });
      
      const config = createProjectConfig(getDecisionTestDatafile());
      const rolloutId = config.featureKeyMap['flag_1'].rolloutId;
      config.rolloutIdMap[rolloutId].experiments = []; // remove the experiments from the rollout

      const user = new OptimizelyUserContext({
        optimizely: {} as any,
        userId: 'tester',
        attributes: {
          age: 10,
        },
      });

      const feature = config.featureKeyMap['flag_1'];
      const variation = decisionService.getVariationForFeature(config, feature, user);

      expect(variation.result).toEqual({
        experiment: null,
        variation: null,
        decisionSource: DECISION_SOURCES.ROLLOUT,
      });

      expect(resolveVariationSpy).toHaveBeenCalledTimes(3);
      expect(resolveVariationSpy).toHaveBeenNthCalledWith(1, 
        config, config.experimentKeyMap['exp_1'], user, false, expect.anything());
      expect(resolveVariationSpy).toHaveBeenNthCalledWith(2,
        config, config.experimentKeyMap['exp_2'], user, false, expect.anything());
      expect(resolveVariationSpy).toHaveBeenNthCalledWith(3,
        config, config.experimentKeyMap['exp_3'], user, false, expect.anything());

      expect(mockBucket).toHaveBeenCalledTimes(0);
    });
  });

  describe('getVariationsForFeatureList', () => {
    beforeEach(() => {
      mockBucket.mockReset();
    });

    it('should return correct results for all features in the feature list', () => {
      const { decisionService } = getDecisionService();

      const resolveVariationSpy = vi.spyOn(decisionService as any, 'resolveVariation')
        .mockImplementation((
          config,
          experiment: any,
          user,
          shouldIgnoreUPS,
          userProfileTracker
        ) => {
          if (experiment.key === 'exp_2') {
            return {
              result: 'variation_2',
              reasons: [],
            };
          } else if (experiment.key === 'exp_4') {
            return {
              result: 'variation_flag_2',
              reasons: [],
            };
          }
          return {
            result: null,
            reasons: [],
          }
        });

      const config = createProjectConfig(getDecisionTestDatafile());

      const user = new OptimizelyUserContext({
        optimizely: {} as any,
        userId: 'tester',
        attributes: {
          age: 40,
        },
      });

      const featureList = [
        config.featureKeyMap['flag_1'],
        config.featureKeyMap['flag_2'],
      ];

      const variations = decisionService.getVariationsForFeatureList(config, featureList, user);

      expect(variations[0].result).toEqual({
        experiment: config.experimentKeyMap['exp_2'],
        variation: config.variationIdMap['5002'],
        decisionSource: DECISION_SOURCES.FEATURE_TEST,
      });

      expect(variations[1].result).toEqual({
        experiment: config.experimentKeyMap['exp_4'],
        variation: config.variationIdMap['5100'],
        decisionSource: DECISION_SOURCES.FEATURE_TEST,
      });

      const variations2 = decisionService.getVariationsForFeatureList(config, featureList.reverse(), user);

      expect(variations2[0].result).toEqual({
        experiment: config.experimentKeyMap['exp_4'],
        variation: config.variationIdMap['5100'],
        decisionSource: DECISION_SOURCES.FEATURE_TEST,
      });

      expect(variations2[1].result).toEqual({
        experiment: config.experimentKeyMap['exp_2'],
        variation: config.variationIdMap['5002'],
        decisionSource: DECISION_SOURCES.FEATURE_TEST,
      });
    });

    it('should batch user profile lookup and save', () => {
      const { decisionService, userProfileService } = getDecisionService({ userProfileService: true });

      const resolveVariationSpy = vi.spyOn(decisionService as any, 'resolveVariation')
        .mockImplementation((
          config,
          experiment: any,
          user,
          shouldIgnoreUPS,
          userProfileTracker: any,
        ) => {
          if (experiment.key === 'exp_2') {
            userProfileTracker.userProfile[experiment.id] = {
              variation_id: '5002',
            };
            userProfileTracker.isProfileUpdated = true;

            return {
              result: 'variation_2',
              reasons: [],
            };
          } else if (experiment.key === 'exp_4') {
            userProfileTracker.userProfile[experiment.id] = {
              variation_id: '5100',
            };
            userProfileTracker.isProfileUpdated = true;

            return {
              result: 'variation_flag_2',
              reasons: [],
            };
          }
          return {
            result: null,
            reasons: [],
          }
        });

      const config = createProjectConfig(getDecisionTestDatafile());

      const user = new OptimizelyUserContext({
        optimizely: {} as any,
        userId: 'tester',
        attributes: {
          age: 40,
        },
      });

      const featureList = [
        config.featureKeyMap['flag_1'],
        config.featureKeyMap['flag_2'],
      ];

      const variations = decisionService.getVariationsForFeatureList(config, featureList, user);

      expect(variations[0].result).toEqual({
        experiment: config.experimentKeyMap['exp_2'],
        variation: config.variationIdMap['5002'],
        decisionSource: DECISION_SOURCES.FEATURE_TEST,
      });

      expect(variations[1].result).toEqual({
        experiment: config.experimentKeyMap['exp_4'],
        variation: config.variationIdMap['5100'],
        decisionSource: DECISION_SOURCES.FEATURE_TEST,
      });

      expect(userProfileService?.lookup).toHaveBeenCalledTimes(1);
      expect(userProfileService?.lookup).toHaveBeenCalledWith('tester');

      expect(userProfileService?.save).toHaveBeenCalledTimes(1);
      expect(userProfileService?.save).toHaveBeenCalledWith({
        user_id: 'tester',
        experiment_bucket_map: {
          '2002': {
            variation_id: '5002',
          },
          '2004': {
            variation_id: '5100',
          },
        },
      });
    });
  });


  describe('forced variation management', () => {
    it('should return true for a valid forcedVariation in setForcedVariation', function() {
      const config = createProjectConfig(cloneDeep(testData));
      const { decisionService } = getDecisionService();

      const didSetVariation = decisionService.setForcedVariation(
        config,
        'testExperiment',
        'user1',
        'control'
      );
      expect(didSetVariation).toBe(true);
    });

    it('should return the same variation from getVariation as was set in setVariation', function() {
      const config = createProjectConfig(cloneDeep(testData));
      const { decisionService } = getDecisionService();
      decisionService.setForcedVariation(
        config,
        'testExperiment',
        'user1',
        'control'
      );

      const variation = decisionService.getForcedVariation(config, 'testExperiment', 'user1').result;
      expect(variation).toBe('control');
    });

    it('should return null from getVariation if no forced variation was set for a valid experimentKey', function() {
      const config = createProjectConfig(cloneDeep(testData));
      const { decisionService } = getDecisionService();

      expect(config.experimentKeyMap['testExperiment']).toBeDefined();
      const variation = decisionService.getForcedVariation(config, 'testExperiment', 'user1').result;

      expect(variation).toBe(null);
    });

    it('should return null from getVariation for an invalid experimentKey', function() {
      const config = createProjectConfig(cloneDeep(testData));
      const { decisionService } = getDecisionService();

      expect(config.experimentKeyMap['definitely_not_valid_exp_key']).not.toBeDefined();
      const variation = decisionService.getForcedVariation(config, 'definitely_not_valid_exp_key', 'user1').result;

      expect(variation).toBe(null);
    });

    it('should return null when a forced decision is set on another experiment key', function() {
      const config = createProjectConfig(cloneDeep(testData));
      const { decisionService } = getDecisionService();

      decisionService.setForcedVariation(config, 'testExperiment', 'user1', 'control');
      var variation = decisionService.getForcedVariation(config, 'testExperimentLaunched', 'user1').result;
      expect(variation).toBe(null);
    });

    it('should not set forced variation for an invalid variation key and return false', function() {
      const config = createProjectConfig(cloneDeep(testData));
      const { decisionService } = getDecisionService();

      const wasSet = decisionService.setForcedVariation(
        config,
        'testExperiment',
        'user1',
        'definitely_not_valid_variation_key'
      );

      expect(wasSet).toBe(false);
      const variation = decisionService.getForcedVariation(config, 'testExperiment', 'user1').result;
      expect(variation).toBe(null);
    });

    it('should reset the forcedVariation if null is passed to setForcedVariation', function() {
      const config = createProjectConfig(cloneDeep(testData));
      const { decisionService } = getDecisionService();

      const didSetVariation = decisionService.setForcedVariation(
        config,
        'testExperiment',
        'user1',
        'control'
      );

      expect(didSetVariation).toBe(true);

      let variation = decisionService.getForcedVariation(config, 'testExperiment', 'user1').result;
      expect(variation).toBe('control');

      const didSetVariationAgain = decisionService.setForcedVariation(
        config,
        'testExperiment',
        'user1',
        null
      );

      expect(didSetVariationAgain).toBe(true);

      variation = decisionService.getForcedVariation(config, 'testExperiment', 'user1').result;
      expect(variation).toBe(null);
    });

    it('should be able to add variations for multiple experiments for one user', function() {
      const config = createProjectConfig(cloneDeep(testData));
      const { decisionService } = getDecisionService();
    
      const didSetVariation1 = decisionService.setForcedVariation(
        config,
        'testExperiment',
        'user1',
        'control'
      );
      expect(didSetVariation1).toBe(true);
    
      const didSetVariation2 = decisionService.setForcedVariation(
        config,
        'testExperimentLaunched',
        'user1',
        'controlLaunched'
      );
      expect(didSetVariation2).toBe(true);
    
      const variation = decisionService.getForcedVariation(config, 'testExperiment', 'user1').result;
      const variation2 = decisionService.getForcedVariation(config, 'testExperimentLaunched', 'user1').result;
      expect(variation).toBe('control');
      expect(variation2).toBe('controlLaunched');
    });

    it('should be able to forced variation to same experiment for multiple users', function() {
      const config = createProjectConfig(cloneDeep(testData));
      const { decisionService } = getDecisionService();

      const didSetVariation1 = decisionService.setForcedVariation(
        config,
        'testExperiment',
        'user1',
        'control'
      );
      expect(didSetVariation1).toBe(true);

      const didSetVariation2 = decisionService.setForcedVariation(
        config,
        'testExperiment',
        'user2',
        'variation'
      );
      expect(didSetVariation2).toBe(true);

      const variationControl = decisionService.getForcedVariation(config, 'testExperiment', 'user1').result;
      const variationVariation = decisionService.getForcedVariation(config, 'testExperiment', 'user2').result;

      expect(variationControl).toBe('control');
      expect(variationVariation).toBe('variation');
    });

    it('should be able to reset a variation for a user with multiple experiments', function() {
      const config = createProjectConfig(cloneDeep(testData));
      const { decisionService } = getDecisionService();

      // Set the first time
      const didSetVariation1 = decisionService.setForcedVariation(
        config,
        'testExperiment',
        'user1',
        'control'
      );
      expect(didSetVariation1).toBe(true);

      const didSetVariation2 = decisionService.setForcedVariation(
        config,
        'testExperimentLaunched',
        'user1',
        'controlLaunched'
      );
      expect(didSetVariation2).toBe(true);

      let variation1 = decisionService.getForcedVariation(config, 'testExperiment', 'user1').result;
      let variation2 = decisionService.getForcedVariation(config, 'testExperimentLaunched', 'user1').result;

      expect(variation1).toBe('control');
      expect(variation2).toBe('controlLaunched');

      // Reset for one of the experiments
      const didSetVariationAgain = decisionService.setForcedVariation(
        config,
        'testExperiment',
        'user1',
        'variation'
      );
      expect(didSetVariationAgain).toBe(true);

      variation1 = decisionService.getForcedVariation(config, 'testExperiment', 'user1').result;
      variation2 = decisionService.getForcedVariation(config, 'testExperimentLaunched', 'user1').result;

      expect(variation1).toBe('variation');
      expect(variation2).toBe('controlLaunched');
    });

    it('should be able to unset a variation for a user with multiple experiments', function() {
      const config = createProjectConfig(cloneDeep(testData));
      const { decisionService } = getDecisionService();

      // Set the first time
      const didSetVariation1 = decisionService.setForcedVariation(
        config,
        'testExperiment',
        'user1',
        'control'
      );
      expect(didSetVariation1).toBe(true);

      const didSetVariation2 = decisionService.setForcedVariation(
        config,
        'testExperimentLaunched',
        'user1',
        'controlLaunched'
      );
      expect(didSetVariation2).toBe(true);

      let variation1 = decisionService.getForcedVariation(config, 'testExperiment', 'user1').result;
      let variation2 = decisionService.getForcedVariation(config, 'testExperimentLaunched', 'user1').result;

      expect(variation1).toBe('control');
      expect(variation2).toBe('controlLaunched');

      // Unset for one of the experiments
      decisionService.setForcedVariation(config, 'testExperiment', 'user1', null);

      variation1 = decisionService.getForcedVariation(config, 'testExperiment', 'user1').result;
      variation2 = decisionService.getForcedVariation(config, 'testExperimentLaunched', 'user1').result;

      expect(variation1).toBe(null);
      expect(variation2).toBe('controlLaunched');
    });

    it('should return false for an empty variation key', function() {
      const config = createProjectConfig(cloneDeep(testData));
      const { decisionService } = getDecisionService();

      const didSetVariation = decisionService.setForcedVariation(config, 'testExperiment', 'user1', '');
      expect(didSetVariation).toBe(false);
    });

    it('should return null when a variation was previously set, and that variation no longer exists on the config object', function() {
      const config = createProjectConfig(cloneDeep(testData));
      const { decisionService } = getDecisionService();

      const didSetVariation = decisionService.setForcedVariation(
        config,
        'testExperiment',
        'user1',
        'control'
      );
      expect(didSetVariation).toBe(true);

      const newDatafile = cloneDeep(testData);
      // Remove 'control' variation from variations, traffic allocation, and datafile forcedVariations.
      newDatafile.experiments[0].variations = [
        {
          key: 'variation',
          id: '111129',
        },
      ];
      newDatafile.experiments[0].trafficAllocation = [
        {
          entityId: '111129',
          endOfRange: 9000,
        },
      ];
      newDatafile.experiments[0].forcedVariations = {
        user1: 'variation',
        user2: 'variation',
      };
      // Now the only variation in testExperiment is 'variation'
      const newConfigObj = createProjectConfig(newDatafile);
      const forcedVar = decisionService.getForcedVariation(newConfigObj, 'testExperiment', 'user1').result;
      expect(forcedVar).toBe(null);
    });

    it("should return null when a variation was previously set, and that variation's experiment no longer exists on the config object", function() {
      const config = createProjectConfig(cloneDeep(testData));
      const { decisionService } = getDecisionService();

      const didSetVariation = decisionService.setForcedVariation(
        config,
        'testExperiment',
        'user1',
        'control'
      );
      expect(didSetVariation).toBe(true);

      const newConfigObj = createProjectConfig(cloneDeep(testDataWithFeatures));
      const forcedVar = decisionService.getForcedVariation(newConfigObj, 'testExperiment', 'user1').result;
      expect(forcedVar).toBe(null);
    });

    it('should return false from setForcedVariation and not set for invalid experiment key', function() {
      const config = createProjectConfig(cloneDeep(testData));
      const { decisionService } = getDecisionService();

      const didSetVariation = decisionService.setForcedVariation(
        config,
        'definitelyNotAValidExperimentKey',
        'user1',
        'control'
      );
      expect(didSetVariation).toBe(false);

      const variation = decisionService.getForcedVariation(
        config,
        'definitelyNotAValidExperimentKey',
        'user1'
      ).result;
      expect(variation).toBe(null);
    });
  });
});
