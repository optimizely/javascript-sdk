/**
 * Copyright 2024, Optimizely
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
import { describe, it, expect, beforeEach, afterEach, vi, assert, Mock } from 'vitest';
import { forEach, cloneDeep } from 'lodash';
import { sprintf } from '../utils/fns';
import fns from '../utils/fns';
import projectConfig, { ProjectConfig } from './project_config';
import { FEATURE_VARIABLE_TYPES, LOG_LEVEL } from '../utils/enums';
import testDatafile from '../tests/test_data';
import configValidator from '../utils/config_validator';
import {
  INVALID_EXPERIMENT_ID,
  INVALID_EXPERIMENT_KEY,
  UNEXPECTED_RESERVED_ATTRIBUTE_PREFIX,
  UNRECOGNIZED_ATTRIBUTE,
  VARIABLE_KEY_NOT_IN_DATAFILE,
  FEATURE_NOT_IN_DATAFILE,
  UNABLE_TO_CAST_VALUE,
} from 'error_message';
import { VariableType } from '../shared_types';
import { OptimizelyError } from '../error/optimizly_error';

const createLogger = (...args: any) => ({
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  child: () => createLogger(),
});

const buildLogMessageFromArgs = (args: any[]) => sprintf(args[1], ...args.splice(2));
const logger = createLogger();

describe('createProjectConfig', () => {
  let configObj: ProjectConfig;

  it('should set properties correctly when createProjectConfig is called', () => {
    const testData: Record<string, any> = testDatafile.getTestProjectConfig();
    configObj = projectConfig.createProjectConfig(testData as JSON);

    forEach(testData.audiences, (audience: any) => {
      audience.conditions = JSON.parse(audience.conditions);
    });

    expect(configObj.accountId).toBe(testData.accountId);
    expect(configObj.projectId).toBe(testData.projectId);
    expect(configObj.revision).toBe(testData.revision);
    expect(configObj.events).toEqual(testData.events);
    expect(configObj.audiences).toEqual(testData.audiences);

    testData.groups.forEach((group: any) => {
      group.experiments.forEach((experiment: any) => {
        experiment.groupId = group.id;
        experiment.variationKeyMap = fns.keyBy(experiment.variations, 'key');
      });
    });

    expect(configObj.groups).toEqual(testData.groups);

    const expectedGroupIdMap = {
      666: testData.groups[0],
      667: testData.groups[1],
    };

    expect(configObj.groupIdMap).toEqual(expectedGroupIdMap);

    const expectedExperiments = testData.experiments.slice();
    forEach(configObj.groupIdMap, (group: any, groupId: any) => {
      forEach(group.experiments, (experiment: any) => {
        experiment.groupId = groupId;
        expectedExperiments.push(experiment);
      });
    });

    forEach(expectedExperiments, (experiment: any) => {
      experiment.variationKeyMap = fns.keyBy(experiment.variations, 'key');
    });

    expect(configObj.experiments).toEqual(expectedExperiments);

    const expectedAttributeKeyMap = {
      browser_type: testData.attributes[0],
      boolean_key: testData.attributes[1],
      integer_key: testData.attributes[2],
      double_key: testData.attributes[3],
      valid_positive_number: testData.attributes[4],
      valid_negative_number: testData.attributes[5],
      invalid_number: testData.attributes[6],
      array: testData.attributes[7],
    };

    expect(configObj.attributeKeyMap).toEqual(expectedAttributeKeyMap);

    const expectedExperimentKeyMap = {
      testExperiment: configObj.experiments[0],
      testExperimentWithAudiences: configObj.experiments[1],
      testExperimentNotRunning: configObj.experiments[2],
      testExperimentLaunched: configObj.experiments[3],
      groupExperiment1: configObj.experiments[4],
      groupExperiment2: configObj.experiments[5],
      overlappingGroupExperiment1: configObj.experiments[6],
    };

    expect(configObj.experimentKeyMap).toEqual(expectedExperimentKeyMap);

    const expectedEventKeyMap = {
      testEvent: testData.events[0],
      'Total Revenue': testData.events[1],
      testEventWithAudiences: testData.events[2],
      testEventWithoutExperiments: testData.events[3],
      testEventWithExperimentNotRunning: testData.events[4],
      testEventWithMultipleExperiments: testData.events[5],
      testEventLaunched: testData.events[6],
    };

    expect(configObj.eventKeyMap).toEqual(expectedEventKeyMap);

    const expectedExperimentIdMap = {
      '111127': configObj.experiments[0],
      '122227': configObj.experiments[1],
      '133337': configObj.experiments[2],
      '144447': configObj.experiments[3],
      '442': configObj.experiments[4],
      '443': configObj.experiments[5],
      '444': configObj.experiments[6],
    };

    expect(configObj.experimentIdMap).toEqual(expectedExperimentIdMap);
  });

  it('should not mutate the datafile', () => {
    const datafile = testDatafile.getTypedAudiencesConfig();
    const datafileClone = cloneDeep(datafile);
    projectConfig.createProjectConfig(datafile as any);

    expect(datafile).toEqual(datafileClone);
  });
});

describe('createProjectConfig - feature management', () => {
  let configObj: ProjectConfig;

  beforeEach(() => {
    configObj = projectConfig.createProjectConfig(testDatafile.getTestProjectConfigWithFeatures());
  });

  it('should create a rolloutIdMap from rollouts in the datafile', () => {
    expect(configObj.rolloutIdMap).toEqual(testDatafile.datafileWithFeaturesExpectedData.rolloutIdMap);
  });

  it('should create a variationVariableUsageMap from rollouts and experiments with features in the datafile', () => {
    expect(configObj.variationVariableUsageMap).toEqual(
      testDatafile.datafileWithFeaturesExpectedData.variationVariableUsageMap
    );
  });

  it('should create a featureKeyMap from features in the datafile', () => {
    expect(configObj.featureKeyMap).toEqual(testDatafile.datafileWithFeaturesExpectedData.featureKeyMap);
  });

  it('should add variations from rollout experiements to the variationKeyMap', () => {
    expect(configObj.variationIdMap['594032']).toEqual({
      variables: [
        { value: 'true', id: '4919852825313280' },
        { value: '395', id: '5482802778734592' },
        { value: '4.99', id: '6045752732155904' },
        { value: 'Hello audience', id: '6327227708866560' },
        { value: '{ "count": 2, "message": "Hello audience" }', id: '8765345281230956' },
      ],
      featureEnabled: true,
      key: '594032',
      id: '594032',
    });

    expect(configObj.variationIdMap['594038']).toEqual({
      variables: [
        { value: 'false', id: '4919852825313280' },
        { value: '400', id: '5482802778734592' },
        { value: '14.99', id: '6045752732155904' },
        { value: 'Hello', id: '6327227708866560' },
        { value: '{ "count": 1, "message": "Hello" }', id: '8765345281230956' },
      ],
      featureEnabled: false,
      key: '594038',
      id: '594038',
    });

    expect(configObj.variationIdMap['594061']).toEqual({
      variables: [
        { value: '27.34', id: '5060590313668608' },
        { value: 'Winter is NOT coming', id: '5342065290379264' },
        { value: '10003', id: '6186490220511232' },
        { value: 'false', id: '6467965197221888' },
      ],
      featureEnabled: true,
      key: '594061',
      id: '594061',
    });

    expect(configObj.variationIdMap['594067']).toEqual({
      variables: [
        { value: '30.34', id: '5060590313668608' },
        { value: 'Winter is coming definitely', id: '5342065290379264' },
        { value: '500', id: '6186490220511232' },
        { value: 'true', id: '6467965197221888' },
      ],
      featureEnabled: true,
      key: '594067',
      id: '594067',
    });
  });
});

describe('createProjectConfig - flag variations', () => {
  let configObj: ProjectConfig;

  beforeEach(() => {
    configObj = projectConfig.createProjectConfig(testDatafile.getTestDecideProjectConfig());
  });

  it('should populate flagVariationsMap correctly', function() {
    const allVariationsForFlag = configObj.flagVariationsMap;
    const feature1Variations = allVariationsForFlag.feature_1;
    const feature2Variations = allVariationsForFlag.feature_2;
    const feature3Variations = allVariationsForFlag.feature_3;
    const feature1VariationsKeys = feature1Variations.map(variation => {
      return variation.key;
    }, {});
    const feature2VariationsKeys = feature2Variations.map(variation => {
      return variation.key;
    }, {});
    const feature3VariationsKeys = feature3Variations.map(variation => {
      return variation.key;
    }, {});

    expect(feature1VariationsKeys).toEqual(['a', 'b', '3324490633', '3324490562', '18257766532']);
    expect(feature2VariationsKeys).toEqual(['variation_with_traffic', 'variation_no_traffic']);
    expect(feature3VariationsKeys).toEqual([]);
  });
});

describe('getExperimentId', () => {
  let testData: Record<string, any>;
  let configObj: ProjectConfig;
  let createdLogger: any;

  beforeEach(function() {
    testData = cloneDeep(testDatafile.getTestProjectConfig());
    configObj = projectConfig.createProjectConfig(cloneDeep(testData) as JSON);
    createdLogger = createLogger({ logLevel: LOG_LEVEL.INFO });
    vi.spyOn(createdLogger, 'warn');
  });

  it('should retrieve experiment ID for valid experiment key in getExperimentId', function() {
    expect(projectConfig.getExperimentId(configObj, testData.experiments[0].key)).toBe(testData.experiments[0].id);
  });

  it('should throw error for invalid experiment key in getExperimentId', function() {
    expect(() => {
      projectConfig.getExperimentId(configObj, 'invalidExperimentId');
    }).toThrowError(
      expect.objectContaining({
        baseMessage: INVALID_EXPERIMENT_KEY,
        params: ['invalidExperimentId'],
      })
    );
  });
});

describe('getLayerId', () => {
  let testData: Record<string, any>;
  let configObj: ProjectConfig;

  beforeEach(function() {
    testData = cloneDeep(testDatafile.getTestProjectConfig());
    configObj = projectConfig.createProjectConfig(cloneDeep(testData) as JSON);
  });

  it('should retrieve layer ID for valid experiment key in getLayerId', function() {
    expect(projectConfig.getLayerId(configObj, '111127')).toBe('4');
  });

  it('should throw error for invalid experiment key in getLayerId', function() {
    // expect(() => projectConfig.getLayerId(configObj, 'invalidExperimentKey')).toThrowError(
    //   sprintf(INVALID_EXPERIMENT_ID, 'PROJECT_CONFIG', 'invalidExperimentKey')
    // );
    expect(() => projectConfig.getLayerId(configObj, 'invalidExperimentKey')).toThrowError(
      expect.objectContaining({
        baseMessage: INVALID_EXPERIMENT_ID,
        params: ['invalidExperimentKey'],
      })
    );
  });
});

describe('getAttributeId', () => {
  let testData: Record<string, any>;
  let configObj: ProjectConfig;
  let createdLogger: any;

  beforeEach(function() {
    testData = cloneDeep(testDatafile.getTestProjectConfig());
    configObj = projectConfig.createProjectConfig(cloneDeep(testData) as JSON);
    createdLogger = createLogger({ logLevel: LOG_LEVEL.INFO });
    vi.spyOn(createdLogger, 'warn');
  });

  it('should retrieve attribute ID for valid attribute key in getAttributeId', function() {
    expect(projectConfig.getAttributeId(configObj, 'browser_type')).toBe('111094');
  });

  it('should retrieve attribute ID for reserved attribute key in getAttributeId', function() {
    expect(projectConfig.getAttributeId(configObj, '$opt_user_agent')).toBe('$opt_user_agent');
  });

  it('should return null for invalid attribute key in getAttributeId', function() {
    expect(projectConfig.getAttributeId(configObj, 'invalidAttributeKey', createdLogger)).toBe(null);
    expect(createdLogger.warn).toHaveBeenCalledWith(UNRECOGNIZED_ATTRIBUTE, 'invalidAttributeKey');
  });

  it('should return null for invalid attribute key in getAttributeId', () => {
    // Adding attribute in key map with reserved prefix
    configObj.attributeKeyMap['$opt_some_reserved_attribute'] = {
      id: '42',
    };

    expect(projectConfig.getAttributeId(configObj, '$opt_some_reserved_attribute', createdLogger)).toBe('42');
    expect(createdLogger.warn).toHaveBeenCalledWith(
      UNEXPECTED_RESERVED_ATTRIBUTE_PREFIX,
      '$opt_some_reserved_attribute',
      '$opt_'
    );
  });
});

describe('getEventId', () => {
  let testData: Record<string, any>;
  let configObj: ProjectConfig;

  beforeEach(function() {
    testData = cloneDeep(testDatafile.getTestProjectConfig());
    configObj = projectConfig.createProjectConfig(cloneDeep(testData) as JSON);
  });

  it('should retrieve event ID for valid event key in getEventId', function() {
    expect(projectConfig.getEventId(configObj, 'testEvent')).toBe('111095');
  });

  it('should return null for invalid event key in getEventId', function() {
    expect(projectConfig.getEventId(configObj, 'invalidEventKey')).toBe(null);
  });
});

describe('getExperimentStatus', () => {
  let testData: Record<string, any>;
  let configObj: ProjectConfig;

  beforeEach(function() {
    testData = cloneDeep(testDatafile.getTestProjectConfig());
    configObj = projectConfig.createProjectConfig(cloneDeep(testData) as JSON);
  });

  it('should retrieve experiment status for valid experiment key in getExperimentStatus', function() {
    expect(projectConfig.getExperimentStatus(configObj, testData.experiments[0].key)).toBe(
      testData.experiments[0].status
    );
  });

  it('should throw error for invalid experiment key in getExperimentStatus', function() {
    expect(() => {
      projectConfig.getExperimentStatus(configObj, 'invalidExeprimentKey');
    }).toThrowError(OptimizelyError);
  });
});

describe('isActive', () => {
  let testData: Record<string, any>;
  let configObj: ProjectConfig;

  beforeEach(function() {
    testData = cloneDeep(testDatafile.getTestProjectConfig());
    configObj = projectConfig.createProjectConfig(cloneDeep(testData) as JSON);
  });

  it('should return true if experiment status is set to Running in isActive', function() {
    expect(projectConfig.isActive(configObj, 'testExperiment')).toBe(true);
  });

  it('should return false if experiment status is not set to Running in isActive', function() {
    expect(projectConfig.isActive(configObj, 'testExperimentNotRunning')).toBe(false);
  });
});

describe('isRunning', () => {
  let testData: Record<string, any>;
  let configObj: ProjectConfig;

  beforeEach(() => {
    testData = cloneDeep(testDatafile.getTestProjectConfig());
    configObj = projectConfig.createProjectConfig(cloneDeep(testData) as JSON);
  });

  it('should return true if experiment status is set to Running in isRunning', function() {
    expect(projectConfig.isRunning(configObj, 'testExperiment')).toBe(true);
  });

  it('should return false if experiment status is not set to Running in isRunning', function() {
    expect(projectConfig.isRunning(configObj, 'testExperimentLaunched')).toBe(false);
  });
});

describe('getVariationKeyFromId', () => {
  let testData: Record<string, any>;
  let configObj: ProjectConfig;

  beforeEach(function() {
    testData = cloneDeep(testDatafile.getTestProjectConfig());
    configObj = projectConfig.createProjectConfig(cloneDeep(testData) as JSON);
  });
  it('should retrieve variation key for valid experiment key and variation ID in getVariationKeyFromId', function() {
    expect(projectConfig.getVariationKeyFromId(configObj, testData.experiments[0].variations[0].id)).toBe(
      testData.experiments[0].variations[0].key
    );
  });
});

describe('getTrafficAllocation', () => {
  let testData: Record<string, any>;
  let configObj: ProjectConfig;

  beforeEach(function() {
    testData = cloneDeep(testDatafile.getTestProjectConfig());
    configObj = projectConfig.createProjectConfig(cloneDeep(testData) as JSON);
  });

  it('should retrieve traffic allocation given valid experiment key in getTrafficAllocation', function() {
    expect(projectConfig.getTrafficAllocation(configObj, testData.experiments[0].id)).toEqual(
      testData.experiments[0].trafficAllocation
    );
  });

  it('should throw error for invalid experient key in getTrafficAllocation', function() {
    expect(() => {
      projectConfig.getTrafficAllocation(configObj, 'invalidExperimentId');
    }).toThrowError(
      expect.objectContaining({
        baseMessage: INVALID_EXPERIMENT_ID,
        params: ['invalidExperimentId'],
      })
    );
  });
});

describe('getVariationIdFromExperimentAndVariationKey', () => {
  let testData: Record<string, any>;
  let configObj: ProjectConfig;

  beforeEach(function() {
    testData = cloneDeep(testDatafile.getTestProjectConfig());
    configObj = projectConfig.createProjectConfig(cloneDeep(testData) as JSON);
  });

  it('should return the variation id for the given experiment key and variation key', () => {
    expect(
      projectConfig.getVariationIdFromExperimentAndVariationKey(
        configObj,
        testData.experiments[0].key,
        testData.experiments[0].variations[0].key
      )
    ).toBe(testData.experiments[0].variations[0].id);
  });
});

describe('getSendFlagDecisionsValue', () => {
  let testData: Record<string, any>;
  let configObj: ProjectConfig;

  beforeEach(function() {
    testData = cloneDeep(testDatafile.getTestProjectConfig());
    configObj = projectConfig.createProjectConfig(cloneDeep(testData) as JSON);
  });

  it('should return false when sendFlagDecisions is undefined', () => {
    configObj.sendFlagDecisions = undefined;

    expect(projectConfig.getSendFlagDecisionsValue(configObj)).toBe(false);
  });

  it('should return false when sendFlagDecisions is set to false', () => {
    configObj.sendFlagDecisions = false;

    expect(projectConfig.getSendFlagDecisionsValue(configObj)).toBe(false);
  });

  it('should return true when sendFlagDecisions is set to true', () => {
    configObj.sendFlagDecisions = true;

    expect(projectConfig.getSendFlagDecisionsValue(configObj)).toBe(true);
  });
});

describe('getVariableForFeature', function() {
  let featureManagementLogger: ReturnType<typeof createLogger>;
  let configObj: ProjectConfig;

  beforeEach(() => {
    featureManagementLogger = createLogger({ logLevel: LOG_LEVEL.INFO });
    configObj = projectConfig.createProjectConfig(testDatafile.getTestProjectConfigWithFeatures());
    vi.spyOn(featureManagementLogger, 'warn');
    vi.spyOn(featureManagementLogger, 'error');
    vi.spyOn(featureManagementLogger, 'info');
    vi.spyOn(featureManagementLogger, 'debug');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return a variable object for a valid variable and feature key', function() {
    const featureKey = 'test_feature_for_experiment';
    const variableKey = 'num_buttons';
    const result = projectConfig.getVariableForFeature(configObj, featureKey, variableKey, featureManagementLogger);

    expect(result).toEqual({
      type: 'integer',
      key: 'num_buttons',
      id: '4792309476491264',
      defaultValue: '10',
    });
  });

  it('should return null for an invalid variable key and a valid feature key', function() {
    const featureKey = 'test_feature_for_experiment';
    const variableKey = 'notARealVariable____';
    const result = projectConfig.getVariableForFeature(configObj, featureKey, variableKey, featureManagementLogger);

    expect(result).toBe(null);
    expect(featureManagementLogger.error).toHaveBeenCalledOnce();
    expect(featureManagementLogger.error).toHaveBeenCalledWith(
      VARIABLE_KEY_NOT_IN_DATAFILE,
      'notARealVariable____',
      'test_feature_for_experiment'
    );
  });

  it('should return null for an invalid feature key', function() {
    const featureKey = 'notARealFeature_____';
    const variableKey = 'num_buttons';
    const result = projectConfig.getVariableForFeature(configObj, featureKey, variableKey, featureManagementLogger);

    expect(result).toBe(null);
    expect(featureManagementLogger.error).toHaveBeenCalledOnce();
    expect(featureManagementLogger.error).toHaveBeenCalledWith(FEATURE_NOT_IN_DATAFILE, 'notARealFeature_____');
  });

  it('should return null for an invalid variable key and an invalid feature key', function() {
    const featureKey = 'notARealFeature_____';
    const variableKey = 'notARealVariable____';
    const result = projectConfig.getVariableForFeature(configObj, featureKey, variableKey, featureManagementLogger);

    expect(result).toBe(null);
    expect(featureManagementLogger.error).toHaveBeenCalledOnce();
    expect(featureManagementLogger.error).toHaveBeenCalledWith(FEATURE_NOT_IN_DATAFILE, 'notARealFeature_____');
  });
});

describe('getVariableValueForVariation', () => {
  let featureManagementLogger: ReturnType<typeof createLogger>;
  let configObj: ProjectConfig;

  beforeEach(() => {
    featureManagementLogger = createLogger({ logLevel: LOG_LEVEL.INFO });
    configObj = projectConfig.createProjectConfig(testDatafile.getTestProjectConfigWithFeatures());
    vi.spyOn(featureManagementLogger, 'warn');
    vi.spyOn(featureManagementLogger, 'error');
    vi.spyOn(featureManagementLogger, 'info');
    vi.spyOn(featureManagementLogger, 'debug');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return a value for a valid variation and variable', () => {
    const variation = configObj.variationIdMap['594096'];
    let variable = configObj.featureKeyMap.test_feature_for_experiment.variableKeyMap.num_buttons;
    let result = projectConfig.getVariableValueForVariation(configObj, variable, variation, featureManagementLogger);
    expect(result).toBe('2');

    variable = configObj.featureKeyMap.test_feature_for_experiment.variableKeyMap.is_button_animated;
    result = projectConfig.getVariableValueForVariation(configObj, variable, variation, featureManagementLogger);

    expect(result).toBe('true');

    variable = configObj.featureKeyMap.test_feature_for_experiment.variableKeyMap.button_txt;
    result = projectConfig.getVariableValueForVariation(configObj, variable, variation, featureManagementLogger);

    expect(result).toBe('Buy me NOW');

    variable = configObj.featureKeyMap.test_feature_for_experiment.variableKeyMap.button_width;
    result = projectConfig.getVariableValueForVariation(configObj, variable, variation, featureManagementLogger);

    expect(result).toBe('20.25');
  });

  it('should return null for a null variation', () => {
    const variation = null;
    const variable = configObj.featureKeyMap.test_feature_for_experiment.variableKeyMap.num_buttons;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const result = projectConfig.getVariableValueForVariation(configObj, variable, variation, featureManagementLogger);

    expect(result).toBe(null);
  });

  it('should return null for a null variable', () => {
    const variation = configObj.variationIdMap['594096'];
    const variable = null;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const result = projectConfig.getVariableValueForVariation(configObj, variable, variation, featureManagementLogger);

    expect(result).toBe(null);
  });

  it('should return null for a null variation and null variable', () => {
    const variation = null;
    const variable = null;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const result = projectConfig.getVariableValueForVariation(configObj, variable, variation, featureManagementLogger);

    expect(result).toBe(null);
  });

  it('should return null for a variation whose id is not in the datafile', () => {
    const variation = {
      key: 'some_variation',
      id: '999999999999',
      variables: [],
    };
    const variable = configObj.featureKeyMap.test_feature_for_experiment.variableKeyMap.num_buttons;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const result = projectConfig.getVariableValueForVariation(configObj, variable, variation, featureManagementLogger);

    expect(result).toBe(null);
  });

  it('should return null if the variation does not have a value for this variable', () => {
    const variation = configObj.variationIdMap['595008']; // This variation has no variable values associated with it
    const variable = configObj.featureKeyMap.test_feature_for_experiment.variableKeyMap.num_buttons;
    const result = projectConfig.getVariableValueForVariation(configObj, variable, variation, featureManagementLogger);

    expect(result).toBe(null);
  });
});

describe('getTypeCastValue', () => {
  let featureManagementLogger: ReturnType<typeof createLogger>;
  let configObj: ProjectConfig;

  beforeEach(() => {
    featureManagementLogger = createLogger({ logLevel: LOG_LEVEL.INFO });
    configObj = projectConfig.createProjectConfig(testDatafile.getTestProjectConfigWithFeatures());
    vi.spyOn(featureManagementLogger, 'warn');
    vi.spyOn(featureManagementLogger, 'error');
    vi.spyOn(featureManagementLogger, 'info');
    vi.spyOn(featureManagementLogger, 'debug');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should cast a boolean', () => {
    let result = projectConfig.getTypeCastValue(
      'true',
      FEATURE_VARIABLE_TYPES.BOOLEAN as VariableType,
      featureManagementLogger
    );

    expect(result).toBe(true);

    result = projectConfig.getTypeCastValue(
      'false',
      FEATURE_VARIABLE_TYPES.BOOLEAN as VariableType,
      featureManagementLogger
    );

    expect(result).toBe(false);
  });

  it('should cast an integer', () => {
    let result = projectConfig.getTypeCastValue(
      '50',
      FEATURE_VARIABLE_TYPES.INTEGER as VariableType,
      featureManagementLogger
    );

    expect(result).toBe(50);

    result = projectConfig.getTypeCastValue(
      '-7',
      FEATURE_VARIABLE_TYPES.INTEGER as VariableType,
      featureManagementLogger
    );

    expect(result).toBe(-7);

    result = projectConfig.getTypeCastValue(
      '0',
      FEATURE_VARIABLE_TYPES.INTEGER as VariableType,
      featureManagementLogger
    );

    expect(result).toBe(0);
  });

  it('should cast a double', () => {
    let result = projectConfig.getTypeCastValue(
      '89.99',
      FEATURE_VARIABLE_TYPES.DOUBLE as VariableType,
      featureManagementLogger
    );

    expect(result).toBe(89.99);

    result = projectConfig.getTypeCastValue(
      '-257.21',
      FEATURE_VARIABLE_TYPES.DOUBLE as VariableType,
      featureManagementLogger
    );

    expect(result).toBe(-257.21);

    result = projectConfig.getTypeCastValue(
      '0',
      FEATURE_VARIABLE_TYPES.DOUBLE as VariableType,
      featureManagementLogger
    );

    expect(result).toBe(0);

    result = projectConfig.getTypeCastValue(
      '10',
      FEATURE_VARIABLE_TYPES.DOUBLE as VariableType,
      featureManagementLogger
    );

    expect(result).toBe(10);
  });

  it('should return a string unmodified', () => {
    const result = projectConfig.getTypeCastValue(
      'message',
      FEATURE_VARIABLE_TYPES.STRING as VariableType,
      featureManagementLogger
    );

    expect(result).toBe('message');
  });

  it('should return null and logs an error for an invalid boolean', () => {
    const result = projectConfig.getTypeCastValue(
      'notabool',
      FEATURE_VARIABLE_TYPES.BOOLEAN as VariableType,
      featureManagementLogger
    );

    expect(result).toBe(null);
    expect(featureManagementLogger.error).toHaveBeenCalledWith(UNABLE_TO_CAST_VALUE, 'notabool', 'boolean');
  });

  it('should return null and logs an error for an invalid integer', () => {
    const result = projectConfig.getTypeCastValue(
      'notanint',
      FEATURE_VARIABLE_TYPES.INTEGER as VariableType,
      featureManagementLogger
    );

    expect(result).toBe(null);
    expect(featureManagementLogger.error).toHaveBeenCalledWith(UNABLE_TO_CAST_VALUE, 'notanint', 'integer');
  });

  it('should return null and logs an error for an invalid double', () => {
    const result = projectConfig.getTypeCastValue(
      'notadouble',
      FEATURE_VARIABLE_TYPES.DOUBLE as VariableType,
      featureManagementLogger
    );

    expect(result).toBe(null);
    expect(featureManagementLogger.error).toHaveBeenCalledWith(UNABLE_TO_CAST_VALUE, 'notadouble', 'double');
  });
});

describe('getAudiencesById', () => {
  let configObj: ProjectConfig;

  beforeEach(() => {
    configObj = projectConfig.createProjectConfig(testDatafile.getTypedAudiencesConfig());
  });

  it('should retrieve audiences by checking first in typedAudiences, and then second in audiences', () => {
    expect(projectConfig.getAudiencesById(configObj)).toEqual(testDatafile.typedAudiencesById);
  });
});

describe('getExperimentAudienceConditions', () => {
  let configObj: ProjectConfig;
  let testData: Record<string, any>;

  beforeEach(() => {
    testData = cloneDeep(testDatafile.getTestProjectConfig());
  });

  it('should retrieve audiences for valid experiment key', () => {
    configObj = projectConfig.createProjectConfig(cloneDeep(testData) as JSON);

    expect(projectConfig.getExperimentAudienceConditions(configObj, testData.experiments[1].id)).toEqual(['11154']);
  });

  it('should throw error for invalid experiment key', () => {
    configObj = projectConfig.createProjectConfig(cloneDeep(testData) as JSON);

    expect(() => {
      projectConfig.getExperimentAudienceConditions(configObj, 'invalidExperimentId');
    }).toThrowError(
      expect.objectContaining({
        baseMessage: INVALID_EXPERIMENT_ID,
        params: ['invalidExperimentId'],
      })
    );
  });

  it('should return experiment audienceIds if experiment has no audienceConditions', () => {
    configObj = projectConfig.createProjectConfig(testDatafile.getTypedAudiencesConfig());
    const result = projectConfig.getExperimentAudienceConditions(configObj, '11564051718');

    expect(result).toEqual([
      '3468206642',
      '3988293898',
      '3988293899',
      '3468206646',
      '3468206647',
      '3468206644',
      '3468206643',
    ]);
  });

  it('should return experiment audienceConditions if experiment has audienceConditions', () => {
    configObj = projectConfig.createProjectConfig(testDatafile.getTypedAudiencesConfig());
    // audience_combinations_experiment has both audienceConditions and audienceIds
    // audienceConditions should be preferred over audienceIds
    const result = projectConfig.getExperimentAudienceConditions(configObj, '1323241598');

    expect(result).toEqual([
      'and',
      ['or', '3468206642', '3988293898'],
      ['or', '3988293899', '3468206646', '3468206647', '3468206644', '3468206643'],
    ]);
  });
});

describe('isFeatureExperiment', () => {
  it('should return true for a feature test', () => {
    const config = projectConfig.createProjectConfig(testDatafile.getTestProjectConfigWithFeatures());
    const result = projectConfig.isFeatureExperiment(config, '594098'); // id of 'testing_my_feature'

    expect(result).toBe(true);
  });

  it('should return false for an A/B test', () => {
    const config = projectConfig.createProjectConfig(testDatafile.getTestProjectConfig());
    const result = projectConfig.isFeatureExperiment(config, '111127'); // id of 'testExperiment'

    expect(result).toBe(false);
  });

  it('should return true for a feature test in a mutex group', () => {
    const config = projectConfig.createProjectConfig(testDatafile.getMutexFeatureTestsConfig());
    let result = projectConfig.isFeatureExperiment(config, '17128410791'); // id of 'f_test1'

    expect(result).toBe(true);

    result = projectConfig.isFeatureExperiment(config, '17139931304'); // id of 'f_test2'

    expect(result).toBe(true);
  });
});

describe('getAudienceSegments', () => {
  it('should return all qualified segments from an audience', () => {
    const dummyQualifiedAudienceJson = {
      id: '13389142234',
      conditions: [
        'and',
        [
          'or',
          [
            'or',
            {
              value: 'odp-segment-1',
              type: 'third_party_dimension',
              name: 'odp.audiences',
              match: 'qualified',
            },
          ],
        ],
      ],
      name: 'odp-segment-1',
    };

    const dummyQualifiedAudienceJsonSegments = projectConfig.getAudienceSegments(dummyQualifiedAudienceJson);

    expect(dummyQualifiedAudienceJsonSegments).toEqual(['odp-segment-1']);

    const dummyUnqualifiedAudienceJson = {
      id: '13389142234',
      conditions: [
        'and',
        [
          'or',
          [
            'or',
            {
              value: 'odp-segment-1',
              type: 'third_party_dimension',
              name: 'odp.audiences',
              match: 'invalid',
            },
          ],
        ],
      ],
      name: 'odp-segment-1',
    };

    const dummyUnqualifiedAudienceJsonSegments = projectConfig.getAudienceSegments(dummyUnqualifiedAudienceJson);

    expect(dummyUnqualifiedAudienceJsonSegments).toEqual([]);
  });
});

describe('integrations: with segments', () => {
  let configObj: ProjectConfig;

  beforeEach(() => {
    configObj = projectConfig.createProjectConfig(testDatafile.getOdpIntegratedConfigWithSegments());
  });

  it('should convert integrations from the datafile into the project config', () => {
    expect(configObj.integrations).toBeDefined();
    expect(configObj.integrations.length).toBe(4);
  });

  it('should populate odpIntegrationConfig', () => {
    expect(configObj.odpIntegrationConfig.integrated).toBe(true);

    assert(configObj.odpIntegrationConfig.integrated);

    expect(configObj.odpIntegrationConfig.odpConfig.apiKey).toBe('W4WzcEs-ABgXorzY7h1LCQ');
    expect(configObj.odpIntegrationConfig.odpConfig.apiHost).toBe('https://api.zaius.com');
    expect(configObj.odpIntegrationConfig.odpConfig.pixelUrl).toBe('https://jumbe.zaius.com');
    expect(configObj.odpIntegrationConfig.odpConfig.segmentsToCheck).toEqual([
      'odp-segment-1',
      'odp-segment-2',
      'odp-segment-3',
    ]);
  });
});

describe('integrations: without segments', () => {
  let config: ProjectConfig;
  beforeEach(() => {
    config = projectConfig.createProjectConfig(testDatafile.getOdpIntegratedConfigWithoutSegments());
  });

  it('should convert integrations from the datafile into the project config', () => {
    expect(config.integrations).toBeDefined();
    expect(config.integrations.length).toBe(3);
  });

  it('should populate odpIntegrationConfig', () => {
    expect(config.odpIntegrationConfig.integrated).toBe(true);

    assert(config.odpIntegrationConfig.integrated);

    expect(config.odpIntegrationConfig.odpConfig.apiKey).toBe('W4WzcEs-ABgXorzY7h1LCQ');
    expect(config.odpIntegrationConfig.odpConfig.apiHost).toBe('https://api.zaius.com');
    expect(config.odpIntegrationConfig.odpConfig.pixelUrl).toBe('https://jumbe.zaius.com');
    expect(config.odpIntegrationConfig.odpConfig.segmentsToCheck).toEqual([]);
  });
});

describe('without valid integration key', () => {
  it('should throw an error when parsing the project config due to integrations not containing a key', () => {
    const odpIntegratedConfigWithoutKey = testDatafile.getOdpIntegratedConfigWithoutKey();

    expect(() => projectConfig.createProjectConfig(odpIntegratedConfigWithoutKey)).toThrowError(OptimizelyError);
  });
});

describe('without integrations', () => {
  let config: ProjectConfig;

  beforeEach(() => {
    const odpIntegratedConfigWithSegments = testDatafile.getOdpIntegratedConfigWithSegments();
    const noIntegrationsConfigWithSegments = { ...odpIntegratedConfigWithSegments, integrations: [] };
    config = projectConfig.createProjectConfig(noIntegrationsConfigWithSegments);
  });

  it('should convert integrations from the datafile into the project config', () => {
    expect(config.integrations.length).toBe(0);
  });

  it('should populate odpIntegrationConfig', () => {
    expect(config.odpIntegrationConfig.integrated).toBe(false);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(config.odpIntegrationConfig.odpConfig).toBeUndefined();
  });
});

describe('tryCreatingProjectConfig', () => {
  let mockJsonSchemaValidator: Mock;
  beforeEach(() => {
    mockJsonSchemaValidator = vi.fn().mockReturnValue(true);
    vi.spyOn(configValidator, 'validateDatafile').mockReturnValue(true);
    vi.spyOn(logger, 'error');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return a project config object created by createProjectConfig when all validation is applied and there are no errors', () => {
    const configDatafile = {
      foo: 'bar',
      experiments: [{ key: 'a' }, { key: 'b' }],
    };

    vi.spyOn(configValidator, 'validateDatafile').mockReturnValueOnce(configDatafile);

    const configObj = {
      foo: 'bar',
      experimentKeyMap: {
        a: { key: 'a', variationKeyMap: {} },
        b: { key: 'b', variationKeyMap: {} },
      },
    };

    // stubJsonSchemaValidator.returns(true);
    mockJsonSchemaValidator.mockReturnValueOnce(true);

    const result = projectConfig.tryCreatingProjectConfig({
      datafile: configDatafile,
      jsonSchemaValidator: mockJsonSchemaValidator,
      logger: logger,
    });

    expect(result).toMatchObject(configObj);
  });

  it('should throw an error when validateDatafile throws', function() {
    vi.spyOn(configValidator, 'validateDatafile').mockImplementationOnce(() => {
      throw new Error();
    });
    mockJsonSchemaValidator.mockReturnValueOnce(true);

    expect(() =>
      projectConfig.tryCreatingProjectConfig({
        datafile: { foo: 'bar' },
        jsonSchemaValidator: mockJsonSchemaValidator,
        logger: logger,
      })
    ).toThrowError();
  });

  it('should throw an error when jsonSchemaValidator.validate throws', function() {
    vi.spyOn(configValidator, 'validateDatafile').mockReturnValueOnce(true);
    mockJsonSchemaValidator.mockImplementationOnce(() => {
      throw new Error();
    });

    expect(() =>
      projectConfig.tryCreatingProjectConfig({
        datafile: { foo: 'bar' },
        jsonSchemaValidator: mockJsonSchemaValidator,
        logger: logger,
      })
    ).toThrowError();
  });

  it('should skip json validation when jsonSchemaValidator is not provided', function() {
    const configDatafile = {
      foo: 'bar',
      experiments: [{ key: 'a' }, { key: 'b' }],
    };

    vi.spyOn(configValidator, 'validateDatafile').mockReturnValueOnce(configDatafile);

    const configObj = {
      foo: 'bar',
      experimentKeyMap: {
        a: { key: 'a', variationKeyMap: {} },
        b: { key: 'b', variationKeyMap: {} },
      },
    };

    const result = projectConfig.tryCreatingProjectConfig({
      datafile: configDatafile,
      logger: logger,
    });

    expect(result).toMatchObject(configObj);
    expect(logger.error).not.toHaveBeenCalled();
  });
});
