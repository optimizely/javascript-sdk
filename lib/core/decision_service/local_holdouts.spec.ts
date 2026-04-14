/**
 * Copyright 2026, Optimizely
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

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createProjectConfig } from '../../project_config/project_config';
import { DecisionService } from './index';
import { DECISION_SOURCES } from '../../utils/enums';
import { getMockLogger } from '../../logging/logger_factory';

describe('Local Holdouts - Decision Service Integration', () => {
  let decisionService: DecisionService;
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = getMockLogger();
    decisionService = new DecisionService({
      logger: mockLogger,
    });
  });

  describe('Global Holdouts', () => {
    it('should evaluate global holdout before any rules', async () => {
      const datafile = {
        version: '4',
        rollouts: [],
        anonymizeIP: false,
        projectId: '111001',
        variables: [],
        featureFlags: [
          {
            id: 'flag1',
            key: 'test_feature',
            rolloutId: '',
            experimentIds: ['exp1'],
            variables: [],
            variableKeyMap: {},
          },
        ],
        experiments: [
          {
            id: 'exp1',
            key: 'experiment_1',
            layerId: 'layer1',
            status: 'Running',
            audienceConditions: [],
            audienceIds: [],
            variations: [
              {
                id: 'var_exp',
                key: 'exp_variation',
                featureEnabled: true,
                variables: [],
                variablesMap: {},
              },
            ],
            variationKeyMap: {},
            trafficAllocation: [{ entityId: 'var_exp', endOfRange: 10000 }],
          },
        ],
        audiences: [],
        groups: [],
        attributes: [],
        accountId: '12123',
        layers: [],
        events: [],
        revision: '1',
        holdouts: [
          {
            id: 'global_holdout',
            key: 'global_ho',
            status: 'Running',
            variations: [
              {
                id: 'var_holdout',
                key: 'holdout_variation',
                variables: [],
                variablesMap: {},
              },
            ],
            variationKeyMap: {},
            audienceConditions: [],
            audienceIds: [],
            trafficAllocation: [{ entityId: 'var_holdout', endOfRange: 10000 }],
            // undefined = global holdout
          },
        ],
      };

      const config = createProjectConfig(datafile as any);
      const feature = config.featureKeyMap['test_feature'];
      const user: any = {
        getUserId: () => 'test_user',
        getAttributes: () => ({}),
      };

      const decision = decisionService.getVariationForFeature(config, feature, user);

      expect(decision.result.variation?.key).toBe('holdout_variation');
      expect(decision.result.experiment?.id).toBe('global_holdout');
      expect(decision.result.decisionSource).toBe(DECISION_SOURCES.HOLDOUT);
    });

    it('should fall through to experiment when user not bucketed into global holdout', async () => {
      const datafile = {
        version: '4',
        rollouts: [],
        anonymizeIP: false,
        projectId: '111001',
        variables: [],
        featureFlags: [
          {
            id: 'flag1',
            key: 'test_feature',
            rolloutId: '',
            experimentIds: ['exp1'],
            variables: [],
            variableKeyMap: {},
          },
        ],
        experiments: [
          {
            id: 'exp1',
            key: 'experiment_1',
            layerId: 'layer1',
            status: 'Running',
            audienceConditions: [],
            audienceIds: [],
            variations: [
              {
                id: 'var_exp',
                key: 'exp_variation',
                featureEnabled: true,
                variables: [],
                variablesMap: {},
              },
            ],
            variationKeyMap: {},
            trafficAllocation: [{ entityId: 'var_exp', endOfRange: 10000 }],
          },
        ],
        audiences: [],
        groups: [],
        attributes: [],
        accountId: '12123',
        layers: [],
        events: [],
        revision: '1',
        holdouts: [
          {
            id: 'global_holdout',
            key: 'global_ho',
            status: 'Running',
            variations: [
              {
                id: 'var_holdout',
                key: 'holdout_variation',
                variables: [],
                variablesMap: {},
              },
            ],
            variationKeyMap: {},
            audienceConditions: [],
            audienceIds: [],
            trafficAllocation: [{ entityId: 'var_holdout', endOfRange: 0 }], // 0% traffic
          },
        ],
      };

      const config = createProjectConfig(datafile as any);
      const feature = config.featureKeyMap['test_feature'];
      const user: any = {
        getUserId: () => 'test_user',
        getAttributes: () => ({}),
      };

      const decision = decisionService.getVariationForFeature(config, feature, user);

      expect(decision.result.variation?.key).toBe('exp_variation');
      expect(decision.result.experiment?.id).toBe('exp1');
      expect(decision.result.decisionSource).toBe(DECISION_SOURCES.FEATURE_TEST);
    });
  });

  describe('Local Holdouts - Experiment Rules', () => {
    it('should evaluate local holdout targeting specific experiment rule', async () => {
      const datafile = {
        version: '4',
        rollouts: [],
        anonymizeIP: false,
        projectId: '111001',
        variables: [],
        featureFlags: [
          {
            id: 'flag1',
            key: 'test_feature',
            rolloutId: '',
            experimentIds: ['exp1', 'exp2'],
            variables: [],
            variableKeyMap: {},
          },
        ],
        experiments: [
          {
            id: 'exp1',
            key: 'experiment_1',
            layerId: 'layer1',
            status: 'Running',
            audienceConditions: [],
            audienceIds: [],
            variations: [
              {
                id: 'var_exp1',
                key: 'exp1_variation',
                featureEnabled: true,
                variables: [],
                variablesMap: {},
              },
            ],
            variationKeyMap: {},
            trafficAllocation: [{ entityId: 'var_exp1', endOfRange: 10000 }],
          },
          {
            id: 'exp2',
            key: 'experiment_2',
            layerId: 'layer2',
            status: 'Running',
            audienceConditions: [],
            audienceIds: [],
            variations: [
              {
                id: 'var_exp2',
                key: 'exp2_variation',
                featureEnabled: true,
                variables: [],
                variablesMap: {},
              },
            ],
            variationKeyMap: {},
            trafficAllocation: [{ entityId: 'var_exp2', endOfRange: 10000 }],
          },
        ],
        audiences: [],
        groups: [],
        attributes: [],
        accountId: '12123',
        layers: [],
        events: [],
        revision: '1',
        holdouts: [
          {
            id: 'local_holdout',
            key: 'local_ho',
            status: 'Running',
            variations: [
              {
                id: 'var_local_holdout',
                key: 'local_holdout_variation',
                variables: [],
                variablesMap: {},
              },
            ],
            variationKeyMap: {},
            audienceConditions: [],
            audienceIds: [],
            trafficAllocation: [{ entityId: 'var_local_holdout', endOfRange: 10000 }],
            includedRules: ['exp1'], // Only targets exp1
          },
        ],
      };

      const config = createProjectConfig(datafile as any);
      const feature = config.featureKeyMap['test_feature'];
      const user: any = {
        getUserId: () => 'test_user',
        getAttributes: () => ({}),
      };

      const decision = decisionService.getVariationForFeature(config, feature, user);

      // Should hit local holdout for exp1
      expect(decision.result.variation?.key).toBe('local_holdout_variation');
      expect(decision.result.experiment?.id).toBe('local_holdout');
      expect(decision.result.decisionSource).toBe(DECISION_SOURCES.HOLDOUT);
    });

    it('should skip local holdout for non-targeted rules', async () => {
      const datafile = {
        version: '4',
        rollouts: [],
        anonymizeIP: false,
        projectId: '111001',
        variables: [],
        featureFlags: [
          {
            id: 'flag1',
            key: 'test_feature',
            rolloutId: '',
            experimentIds: ['exp1', 'exp2'],
            variables: [],
            variableKeyMap: {},
          },
        ],
        experiments: [
          {
            id: 'exp1',
            key: 'experiment_1',
            layerId: 'layer1',
            status: 'Running',
            audienceConditions: [],
            audienceIds: [],
            variations: [
              {
                id: 'var_exp1',
                key: 'exp1_variation',
                featureEnabled: true,
                variables: [],
                variablesMap: {},
              },
            ],
            variationKeyMap: {},
            trafficAllocation: [{ entityId: 'var_exp1', endOfRange: 0 }], // 0% - should skip
          },
          {
            id: 'exp2',
            key: 'experiment_2',
            layerId: 'layer2',
            status: 'Running',
            audienceConditions: [],
            audienceIds: [],
            variations: [
              {
                id: 'var_exp2',
                key: 'exp2_variation',
                featureEnabled: true,
                variables: [],
                variablesMap: {},
              },
            ],
            variationKeyMap: {},
            trafficAllocation: [{ entityId: 'var_exp2', endOfRange: 10000 }],
          },
        ],
        audiences: [],
        groups: [],
        attributes: [],
        accountId: '12123',
        layers: [],
        events: [],
        revision: '1',
        holdouts: [
          {
            id: 'local_holdout',
            key: 'local_ho',
            status: 'Running',
            variations: [
              {
                id: 'var_local_holdout',
                key: 'local_holdout_variation',
                variables: [],
                variablesMap: {},
              },
            ],
            variationKeyMap: {},
            audienceConditions: [],
            audienceIds: [],
            trafficAllocation: [{ entityId: 'var_local_holdout', endOfRange: 10000 }],
            includedRules: ['exp1'], // Only targets exp1, not exp2
          },
        ],
      };

      const config = createProjectConfig(datafile as any);
      const feature = config.featureKeyMap['test_feature'];
      const user: any = {
        getUserId: () => 'test_user',
        getAttributes: () => ({}),
      };

      const decision = decisionService.getVariationForFeature(config, feature, user);

      // Should skip exp1 (0% traffic) and its local holdout, then get exp2 result
      expect(decision.result.variation?.key).toBe('exp2_variation');
      expect(decision.result.experiment?.id).toBe('exp2');
      expect(decision.result.decisionSource).toBe(DECISION_SOURCES.FEATURE_TEST);
    });
  });

  describe('Local Holdouts - Delivery Rules', () => {
    it('should evaluate local holdout targeting delivery rule', async () => {
      const datafile = {
        version: '4',
        rollouts: [
          {
            id: 'rollout1',
            experiments: [
              {
                id: 'delivery_rule_1',
                key: 'delivery_1',
                layerId: 'layer1',
                status: 'Running',
                audienceConditions: [],
                audienceIds: [],
                variations: [
                  {
                    id: 'var_delivery',
                    key: 'delivery_variation',
                    featureEnabled: true,
                    variables: [],
                    variablesMap: {},
                  },
                ],
                variationKeyMap: {},
                trafficAllocation: [{ entityId: 'var_delivery', endOfRange: 10000 }],
                isRollout: true,
              },
            ],
          },
        ],
        anonymizeIP: false,
        projectId: '111001',
        variables: [],
        featureFlags: [
          {
            id: 'flag1',
            key: 'test_feature',
            rolloutId: 'rollout1',
            experimentIds: [],
            variables: [],
            variableKeyMap: {},
          },
        ],
        experiments: [],
        audiences: [],
        groups: [],
        attributes: [],
        accountId: '12123',
        layers: [],
        events: [],
        revision: '1',
        holdouts: [
          {
            id: 'delivery_holdout',
            key: 'delivery_ho',
            status: 'Running',
            variations: [
              {
                id: 'var_delivery_holdout',
                key: 'delivery_holdout_variation',
                variables: [],
                variablesMap: {},
              },
            ],
            variationKeyMap: {},
            audienceConditions: [],
            audienceIds: [],
            trafficAllocation: [{ entityId: 'var_delivery_holdout', endOfRange: 10000 }],
            includedRules: ['delivery_rule_1'],
          },
        ],
      };

      const config = createProjectConfig(datafile as any);
      const feature = config.featureKeyMap['test_feature'];
      const user: any = {
        getUserId: () => 'test_user',
        getAttributes: () => ({}),
      };

      const decision = decisionService.getVariationForFeature(config, feature, user);

      // Should hit local holdout for delivery rule
      expect(decision.result.variation?.key).toBe('delivery_holdout_variation');
      expect(decision.result.experiment?.id).toBe('delivery_holdout');
      expect(decision.result.decisionSource).toBe(DECISION_SOURCES.HOLDOUT);
    });
  });

  describe('Precedence: Global before Local', () => {
    it('should evaluate global holdout before local holdouts', async () => {
      const datafile = {
        version: '4',
        rollouts: [],
        anonymizeIP: false,
        projectId: '111001',
        variables: [],
        featureFlags: [
          {
            id: 'flag1',
            key: 'test_feature',
            rolloutId: '',
            experimentIds: ['exp1'],
            variables: [],
            variableKeyMap: {},
          },
        ],
        experiments: [
          {
            id: 'exp1',
            key: 'experiment_1',
            layerId: 'layer1',
            status: 'Running',
            audienceConditions: [],
            audienceIds: [],
            variations: [
              {
                id: 'var_exp',
                key: 'exp_variation',
                featureEnabled: true,
                variables: [],
                variablesMap: {},
              },
            ],
            variationKeyMap: {},
            trafficAllocation: [{ entityId: 'var_exp', endOfRange: 10000 }],
          },
        ],
        audiences: [],
        groups: [],
        attributes: [],
        accountId: '12123',
        layers: [],
        events: [],
        revision: '1',
        holdouts: [
          {
            id: 'global_holdout',
            key: 'global_ho',
            status: 'Running',
            variations: [
              {
                id: 'var_global_holdout',
                key: 'global_holdout_variation',
                variables: [],
                variablesMap: {},
              },
            ],
            variationKeyMap: {},
            audienceConditions: [],
            audienceIds: [],
            trafficAllocation: [{ entityId: 'var_global_holdout', endOfRange: 10000 }],
            // undefined = global
          },
          {
            id: 'local_holdout',
            key: 'local_ho',
            status: 'Running',
            variations: [
              {
                id: 'var_local_holdout',
                key: 'local_holdout_variation',
                variables: [],
                variablesMap: {},
              },
            ],
            variationKeyMap: {},
            audienceConditions: [],
            audienceIds: [],
            trafficAllocation: [{ entityId: 'var_local_holdout', endOfRange: 10000 }],
            includedRules: ['exp1'],
          },
        ],
      };

      const config = createProjectConfig(datafile as any);
      const feature = config.featureKeyMap['test_feature'];
      const user: any = {
        getUserId: () => 'test_user',
        getAttributes: () => ({}),
      };

      const decision = decisionService.getVariationForFeature(config, feature, user);

      // Should return global holdout (evaluated first)
      expect(decision.result.variation?.key).toBe('global_holdout_variation');
      expect(decision.result.experiment?.id).toBe('global_holdout');
      expect(decision.result.decisionSource).toBe(DECISION_SOURCES.HOLDOUT);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing includedRules field as global holdout', async () => {
      const datafile = {
        version: '4',
        rollouts: [],
        anonymizeIP: false,
        projectId: '111001',
        variables: [],
        featureFlags: [
          {
            id: 'flag1',
            key: 'test_feature',
            rolloutId: '',
            experimentIds: [],
            variables: [],
            variableKeyMap: {},
          },
        ],
        experiments: [],
        audiences: [],
        groups: [],
        attributes: [],
        accountId: '12123',
        layers: [],
        events: [],
        revision: '1',
        holdouts: [
          {
            id: 'holdout_no_field',
            key: 'no_included_rules',
            status: 'Running',
            variations: [
              {
                id: 'var_holdout',
                key: 'holdout_variation',
                featureEnabled: true,
                variables: [],
                variablesMap: {},
              },
            ],
            variationKeyMap: {},
            audienceConditions: [],
            audienceIds: [],
            trafficAllocation: [{ entityId: 'var_holdout', endOfRange: 10000 }],
            // No includedRules field = global
          },
        ],
      };

      const config = createProjectConfig(datafile as any);

      expect(config.globalHoldouts).toHaveLength(1);
      expect(config.globalHoldouts[0].id).toBe('holdout_no_field');
    });

    it('should handle empty includedRules array as local holdout with no rules', async () => {
      const datafile = {
        version: '4',
        rollouts: [],
        anonymizeIP: false,
        projectId: '111001',
        variables: [],
        featureFlags: [],
        experiments: [],
        audiences: [],
        groups: [],
        attributes: [],
        accountId: '12123',
        layers: [],
        events: [],
        revision: '1',
        holdouts: [
          {
            id: 'empty_local',
            key: 'empty',
            status: 'Running',
            variations: [
              {
                id: 'var_holdout',
                key: 'holdout_variation',
                variables: [],
                variablesMap: {},
              },
            ],
            variationKeyMap: {},
            audienceConditions: [],
            audienceIds: [],
            trafficAllocation: [{ entityId: 'var_holdout', endOfRange: 10000 }],
            includedRules: [], // Empty array
          },
        ],
      };

      const config = createProjectConfig(datafile as any);

      expect(config.globalHoldouts).toHaveLength(0);
      expect(Object.keys(config.ruleHoldoutsMap)).toHaveLength(0);
    });

    it('should silently skip local holdouts with non-existent rule IDs', async () => {
      const datafile = {
        version: '4',
        rollouts: [],
        anonymizeIP: false,
        projectId: '111001',
        variables: [],
        featureFlags: [
          {
            id: 'flag1',
            key: 'test_feature',
            rolloutId: '',
            experimentIds: ['exp1'],
            variables: [],
            variableKeyMap: {},
          },
        ],
        experiments: [
          {
            id: 'exp1',
            key: 'experiment_1',
            layerId: 'layer1',
            status: 'Running',
            audienceConditions: [],
            audienceIds: [],
            variations: [
              {
                id: 'var_exp',
                key: 'exp_variation',
                featureEnabled: true,
                variables: [],
                variablesMap: {},
              },
            ],
            variationKeyMap: {},
            trafficAllocation: [{ entityId: 'var_exp', endOfRange: 10000 }],
          },
        ],
        audiences: [],
        groups: [],
        attributes: [],
        accountId: '12123',
        layers: [],
        events: [],
        revision: '1',
        holdouts: [
          {
            id: 'bad_local',
            key: 'bad_rules',
            status: 'Running',
            variations: [
              {
                id: 'var_holdout',
                key: 'holdout_variation',
                variables: [],
                variablesMap: {},
              },
            ],
            variationKeyMap: {},
            audienceConditions: [],
            audienceIds: [],
            trafficAllocation: [{ entityId: 'var_holdout', endOfRange: 10000 }],
            includedRules: ['non_existent_rule_1', 'non_existent_rule_2'],
          },
        ],
      };

      const config = createProjectConfig(datafile as any);
      const feature = config.featureKeyMap['test_feature'];
      const user: any = {
        getUserId: () => 'test_user',
        getAttributes: () => ({}),
      };

      // Should not throw, just skip the non-existent rules
      const decision = decisionService.getVariationForFeature(config, feature, user);

      // Should get experiment result, not holdout
      expect(decision.result.variation?.key).toBe('exp_variation');
      expect(decision.result.decisionSource).toBe(DECISION_SOURCES.FEATURE_TEST);
    });
  });
});
