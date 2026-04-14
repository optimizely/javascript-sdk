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

import { describe, it, expect, beforeEach } from 'vitest';
import { createProjectConfig, getGlobalHoldouts, getHoldoutsForRule } from './project_config';
import { Holdout, isGlobalHoldout } from '../shared_types';

describe('Local Holdouts', () => {
  describe('Holdout Type Detection', () => {
    it('should identify global holdout when includedRules is undefined', () => {
      const holdout: Holdout = {
        id: 'holdout1',
        key: 'global_holdout',
        status: 'Running',
        variations: [],
        variationKeyMap: {},
        audienceConditions: [],
        audienceIds: [],
        trafficAllocation: [],
        // includedRules is undefined
      };

      expect(isGlobalHoldout(holdout)).toBe(true);
    });

    it('should identify local holdout when includedRules is an empty array', () => {
      const holdout: Holdout = {
        id: 'holdout2',
        key: 'local_holdout_empty',
        status: 'Running',
        variations: [],
        variationKeyMap: {},
        audienceConditions: [],
        audienceIds: [],
        trafficAllocation: [],
        includedRules: [], // Empty array = local with no rules
      };

      expect(isGlobalHoldout(holdout)).toBe(false);
    });

    it('should identify local holdout when includedRules has rule IDs', () => {
      const holdout: Holdout = {
        id: 'holdout3',
        key: 'local_holdout_with_rules',
        status: 'Running',
        variations: [],
        variationKeyMap: {},
        audienceConditions: [],
        audienceIds: [],
        trafficAllocation: [],
        includedRules: ['rule1', 'rule2'],
      };

      expect(isGlobalHoldout(holdout)).toBe(false);
    });
  });

  describe('ProjectConfig Parsing', () => {
    it('should parse global holdout correctly', () => {
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
            id: 'global_holdout_1',
            key: 'global_holdout',
            status: 'Running',
            variations: [
              {
                id: 'var1',
                key: 'control',
                variables: [],
                variablesMap: {},
              },
            ],
            audienceConditions: [],
            audienceIds: [],
            trafficAllocation: [{ entityId: 'var1', endOfRange: 10000 }],
            // includedRules is undefined = global
          },
        ],
      };

      const config = createProjectConfig(datafile as any);

      expect(config.globalHoldouts).toHaveLength(1);
      expect(config.globalHoldouts[0].id).toBe('global_holdout_1');
      expect(config.ruleHoldoutsMap).toEqual({});
    });

    it('should parse local holdout with single rule', () => {
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
            id: 'local_holdout_1',
            key: 'local_holdout_single',
            status: 'Running',
            variations: [
              {
                id: 'var1',
                key: 'control',
                variables: [],
                variablesMap: {},
              },
            ],
            audienceConditions: [],
            audienceIds: [],
            trafficAllocation: [{ entityId: 'var1', endOfRange: 10000 }],
            includedRules: ['rule_123'],
          },
        ],
      };

      const config = createProjectConfig(datafile as any);

      expect(config.globalHoldouts).toHaveLength(0);
      expect(config.ruleHoldoutsMap['rule_123']).toHaveLength(1);
      expect(config.ruleHoldoutsMap['rule_123'][0].id).toBe('local_holdout_1');
    });

    it('should parse local holdout with multiple rules', () => {
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
            id: 'local_holdout_multi',
            key: 'local_holdout_multiple',
            status: 'Running',
            variations: [
              {
                id: 'var1',
                key: 'control',
                variables: [],
                variablesMap: {},
              },
            ],
            audienceConditions: [],
            audienceIds: [],
            trafficAllocation: [{ entityId: 'var1', endOfRange: 10000 }],
            includedRules: ['rule_1', 'rule_2', 'rule_3'],
          },
        ],
      };

      const config = createProjectConfig(datafile as any);

      expect(config.globalHoldouts).toHaveLength(0);
      expect(config.ruleHoldoutsMap['rule_1']).toHaveLength(1);
      expect(config.ruleHoldoutsMap['rule_2']).toHaveLength(1);
      expect(config.ruleHoldoutsMap['rule_3']).toHaveLength(1);
      expect(config.ruleHoldoutsMap['rule_1'][0].id).toBe('local_holdout_multi');
    });

    it('should parse multiple holdouts targeting the same rule', () => {
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
            id: 'local_holdout_a',
            key: 'holdout_a',
            status: 'Running',
            variations: [
              {
                id: 'var_a',
                key: 'control_a',
                variables: [],
                variablesMap: {},
              },
            ],
            audienceConditions: [],
            audienceIds: [],
            trafficAllocation: [{ entityId: 'var_a', endOfRange: 5000 }],
            includedRules: ['shared_rule'],
          },
          {
            id: 'local_holdout_b',
            key: 'holdout_b',
            status: 'Running',
            variations: [
              {
                id: 'var_b',
                key: 'control_b',
                variables: [],
                variablesMap: {},
              },
            ],
            audienceConditions: [],
            audienceIds: [],
            trafficAllocation: [{ entityId: 'var_b', endOfRange: 5000 }],
            includedRules: ['shared_rule'],
          },
        ],
      };

      const config = createProjectConfig(datafile as any);

      expect(config.ruleHoldoutsMap['shared_rule']).toHaveLength(2);
      expect(config.ruleHoldoutsMap['shared_rule'].map(h => h.id)).toEqual([
        'local_holdout_a',
        'local_holdout_b',
      ]);
    });

    it('should parse mixed global and local holdouts', () => {
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
            id: 'global_1',
            key: 'global_holdout_1',
            status: 'Running',
            variations: [
              {
                id: 'var_global',
                key: 'control',
                variables: [],
                variablesMap: {},
              },
            ],
            audienceConditions: [],
            audienceIds: [],
            trafficAllocation: [{ entityId: 'var_global', endOfRange: 10000 }],
            // undefined = global
          },
          {
            id: 'local_1',
            key: 'local_holdout_1',
            status: 'Running',
            variations: [
              {
                id: 'var_local',
                key: 'control',
                variables: [],
                variablesMap: {},
              },
            ],
            audienceConditions: [],
            audienceIds: [],
            trafficAllocation: [{ entityId: 'var_local', endOfRange: 10000 }],
            includedRules: ['rule_x'],
          },
        ],
      };

      const config = createProjectConfig(datafile as any);

      expect(config.globalHoldouts).toHaveLength(1);
      expect(config.globalHoldouts[0].id).toBe('global_1');
      expect(config.ruleHoldoutsMap['rule_x']).toHaveLength(1);
      expect(config.ruleHoldoutsMap['rule_x'][0].id).toBe('local_1');
    });

    it('should handle empty includedRules array (local with no rules)', () => {
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
            key: 'empty_local_holdout',
            status: 'Running',
            variations: [
              {
                id: 'var1',
                key: 'control',
                variables: [],
                variablesMap: {},
              },
            ],
            audienceConditions: [],
            audienceIds: [],
            trafficAllocation: [{ entityId: 'var1', endOfRange: 10000 }],
            includedRules: [], // Empty array
          },
        ],
      };

      const config = createProjectConfig(datafile as any);

      expect(config.globalHoldouts).toHaveLength(0);
      expect(Object.keys(config.ruleHoldoutsMap)).toHaveLength(0);
    });
  });

  describe('Accessor Functions', () => {
    let config: any;

    beforeEach(() => {
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
            id: 'global_holdout',
            key: 'global',
            status: 'Running',
            variations: [{ id: 'v1', key: 'control', variables: [], variablesMap: {} }],
            audienceConditions: [],
            audienceIds: [],
            trafficAllocation: [{ entityId: 'v1', endOfRange: 10000 }],
          },
          {
            id: 'local_holdout_1',
            key: 'local1',
            status: 'Running',
            variations: [{ id: 'v2', key: 'treatment', variables: [], variablesMap: {} }],
            audienceConditions: [],
            audienceIds: [],
            trafficAllocation: [{ entityId: 'v2', endOfRange: 10000 }],
            includedRules: ['rule_a', 'rule_b'],
          },
          {
            id: 'local_holdout_2',
            key: 'local2',
            status: 'Running',
            variations: [{ id: 'v3', key: 'control', variables: [], variablesMap: {} }],
            audienceConditions: [],
            audienceIds: [],
            trafficAllocation: [{ entityId: 'v3', endOfRange: 10000 }],
            includedRules: ['rule_a'],
          },
        ],
      };

      config = createProjectConfig(datafile as any);
    });

    it('getGlobalHoldouts should return only global holdouts', () => {
      const globalHoldouts = getGlobalHoldouts(config);

      expect(globalHoldouts).toHaveLength(1);
      expect(globalHoldouts[0].id).toBe('global_holdout');
    });

    it('getHoldoutsForRule should return holdouts targeting specific rule', () => {
      const holdoutsForRuleA = getHoldoutsForRule(config, 'rule_a');
      const holdoutsForRuleB = getHoldoutsForRule(config, 'rule_b');

      expect(holdoutsForRuleA).toHaveLength(2);
      expect(holdoutsForRuleA.map(h => h.id)).toEqual(['local_holdout_1', 'local_holdout_2']);

      expect(holdoutsForRuleB).toHaveLength(1);
      expect(holdoutsForRuleB[0].id).toBe('local_holdout_1');
    });

    it('getHoldoutsForRule should return empty array for non-existent rule', () => {
      const holdouts = getHoldoutsForRule(config, 'non_existent_rule');

      expect(holdouts).toEqual([]);
    });
  });

  describe('Cross-Flag Targeting', () => {
    it('should support local holdouts targeting rules from different flags', () => {
      const datafile = {
        version: '4',
        rollouts: [],
        anonymizeIP: false,
        projectId: '111001',
        variables: [],
        featureFlags: [
          {
            id: 'flag_1',
            key: 'checkout_flow',
            rolloutId: '',
            experimentIds: ['exp_1'],
            variables: [],
            variableKeyMap: {},
          },
          {
            id: 'flag_2',
            key: 'product_recs',
            rolloutId: '',
            experimentIds: ['exp_2'],
            variables: [],
            variableKeyMap: {},
          },
        ],
        experiments: [
          {
            id: 'exp_1',
            key: 'checkout_experiment',
            layerId: 'layer1',
            status: 'Running',
            audienceConditions: [],
            audienceIds: [],
            variations: [],
            variationKeyMap: {},
            trafficAllocation: [],
          },
          {
            id: 'exp_2',
            key: 'recs_experiment',
            layerId: 'layer2',
            status: 'Running',
            audienceConditions: [],
            audienceIds: [],
            variations: [],
            variationKeyMap: {},
            trafficAllocation: [],
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
            id: 'cross_flag_holdout',
            key: 'cross_flag',
            status: 'Running',
            variations: [
              {
                id: 'var1',
                key: 'control',
                variables: [],
                variablesMap: {},
              },
            ],
            audienceConditions: [],
            audienceIds: [],
            trafficAllocation: [{ entityId: 'var1', endOfRange: 10000 }],
            includedRules: ['exp_1', 'exp_2'], // Rules from different flags
          },
        ],
      };

      const config = createProjectConfig(datafile as any);

      expect(config.ruleHoldoutsMap['exp_1']).toHaveLength(1);
      expect(config.ruleHoldoutsMap['exp_2']).toHaveLength(1);
      expect(config.ruleHoldoutsMap['exp_1'][0].id).toBe('cross_flag_holdout');
      expect(config.ruleHoldoutsMap['exp_2'][0].id).toBe('cross_flag_holdout');
    });
  });
});
