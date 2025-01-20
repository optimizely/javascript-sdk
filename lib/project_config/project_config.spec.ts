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
import { describe, it, expect, beforeEach, vi } from 'vitest';
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
} from '../error_messages';
import exp from 'constants';

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

    forEach(testData.audiences, audience => {
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
    forEach(configObj.groupIdMap, (group, groupId) => {
      forEach(group.experiments, experiment => {
        experiment.groupId = groupId;
        expectedExperiments.push(experiment);
      });
    });

    forEach(expectedExperiments, experiment => {
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

  it('creates a variationVariableUsageMap from rollouts and experiments with features in the datafile', () => {
    expect(configObj.variationVariableUsageMap).toEqual(
      testDatafile.datafileWithFeaturesExpectedData.variationVariableUsageMap
    );
  });

  it('creates a featureKeyMap from features in the datafile', () => {
    expect(configObj.featureKeyMap).toEqual(testDatafile.datafileWithFeaturesExpectedData.featureKeyMap);
  });

  it('adds variations from rollout experiements to the variationKeyMap', () => {
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

  it('it should populate flagVariationsMap correctly', function() {
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
    expect(() => projectConfig.getExperimentId(configObj, 'invalidExperimentKey')).toThrowError(
      sprintf(INVALID_EXPERIMENT_KEY, 'PROJECT_CONFIG', 'invalidExperimentKey')
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
    expect(() => projectConfig.getLayerId(configObj, 'invalidExperimentKey')).toThrowError(
      sprintf(INVALID_EXPERIMENT_ID, 'PROJECT_CONFIG', 'invalidExperimentKey')
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
    expect(() => projectConfig.getExperimentStatus(configObj, 'invalidExperimentKey')).toThrowError(
      sprintf(INVALID_EXPERIMENT_KEY, 'PROJECT_CONFIG', 'invalidExperimentKey')
    );
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
    expect(() => projectConfig.getTrafficAllocation(configObj, 'invalidExperimentId')).toThrowError(
      sprintf(INVALID_EXPERIMENT_ID, 'PROJECT_CONFIG', 'invalidExperimentId')
    );
  });
});
