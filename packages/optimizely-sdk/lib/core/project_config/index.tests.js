/**
 * Copyright 2016-2021, Optimizely
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
import sinon from 'sinon';
import { assert } from 'chai';
import { forEach, cloneDeep } from 'lodash';
import { getLogger } from '@optimizely/js-sdk-logging';
import { sprintf } from '@optimizely/js-sdk-utils';

import fns from '../../utils/fns';
import projectConfig from './';
import {
  ERROR_MESSAGES,
  FEATURE_VARIABLE_TYPES,
  LOG_LEVEL,
} from '../../utils/enums';
import * as loggerPlugin from '../../plugins/logger';
import testDatafile from '../../tests/test_data';
import configValidator from '../../utils/config_validator';

var logger = getLogger();

describe('lib/core/project_config', function() {
  describe('createProjectConfig method', function() {
    it('should set properties correctly when createProjectConfig is called', function() {
      var testData = testDatafile.getTestProjectConfig();
      var configObj = projectConfig.createProjectConfig(testData);

      forEach(testData.audiences, function(audience) {
        audience.conditions = JSON.parse(audience.conditions);
      });

      assert.strictEqual(configObj.accountId, testData.accountId);
      assert.strictEqual(configObj.projectId, testData.projectId);
      assert.strictEqual(configObj.revision, testData.revision);
      assert.deepEqual(configObj.events, testData.events);
      assert.deepEqual(configObj.audiences, testData.audiences);
      testData.groups.forEach(function(group) {
        group.experiments.forEach(function(experiment) {
          experiment.groupId = group.id;
          experiment.variationKeyMap = fns.keyBy(experiment.variations, 'key');
        });
      });
      assert.deepEqual(configObj.groups, testData.groups);

      var expectedGroupIdMap = {
        666: testData.groups[0],
        667: testData.groups[1],
      };

      assert.deepEqual(configObj.groupIdMap, expectedGroupIdMap);

      var expectedExperiments = testData.experiments;
      forEach(configObj.groupIdMap, function(group, Id) {
        forEach(group.experiments, function(experiment) {
          experiment.groupId = Id;
          expectedExperiments.push(experiment);
        });
      });

      forEach(expectedExperiments, function(experiment) {
        experiment.variationKeyMap = fns.keyBy(experiment.variations, 'key');
      });

      assert.deepEqual(configObj.experiments, expectedExperiments);

      var expectedAttributeKeyMap = {
        browser_type: testData.attributes[0],
        boolean_key: testData.attributes[1],
        integer_key: testData.attributes[2],
        double_key: testData.attributes[3],
        valid_positive_number: testData.attributes[4],
        valid_negative_number: testData.attributes[5],
        invalid_number: testData.attributes[6],
        array: testData.attributes[7],
      };

      assert.deepEqual(configObj.attributeKeyMap, expectedAttributeKeyMap);

      var expectedExperimentKeyMap = {
        testExperiment: configObj.experiments[0],
        testExperimentWithAudiences: configObj.experiments[1],
        testExperimentNotRunning: configObj.experiments[2],
        testExperimentLaunched: configObj.experiments[3],
        groupExperiment1: configObj.experiments[4],
        groupExperiment2: configObj.experiments[5],
        overlappingGroupExperiment1: configObj.experiments[6],
      };

      assert.deepEqual(configObj.experimentKeyMap, expectedExperimentKeyMap);

      var expectedEventKeyMap = {
        testEvent: testData.events[0],
        'Total Revenue': testData.events[1],
        testEventWithAudiences: testData.events[2],
        testEventWithoutExperiments: testData.events[3],
        testEventWithExperimentNotRunning: testData.events[4],
        testEventWithMultipleExperiments: testData.events[5],
        testEventLaunched: testData.events[6],
      };

      assert.deepEqual(configObj.eventKeyMap, expectedEventKeyMap);

      var expectedExperimentIdMap = {
        '111127': configObj.experiments[0],
        '122227': configObj.experiments[1],
        '133337': configObj.experiments[2],
        '144447': configObj.experiments[3],
        '442': configObj.experiments[4],
        '443': configObj.experiments[5],
        '444': configObj.experiments[6],
      };

      assert.deepEqual(configObj.experimentIdMap, expectedExperimentIdMap);

      var expectedVariationKeyMap = {};
      expectedVariationKeyMap[testData.experiments[0].key + testData.experiments[0].variations[0].key] =
        testData.experiments[0].variations[0];
      expectedVariationKeyMap[testData.experiments[0].key + testData.experiments[0].variations[1].key] =
        testData.experiments[0].variations[1];
      expectedVariationKeyMap[testData.experiments[1].key + testData.experiments[1].variations[0].key] =
        testData.experiments[1].variations[0];
      expectedVariationKeyMap[testData.experiments[1].key + testData.experiments[1].variations[1].key] =
        testData.experiments[1].variations[1];
      expectedVariationKeyMap[testData.experiments[2].key + testData.experiments[2].variations[0].key] =
        testData.experiments[2].variations[0];
      expectedVariationKeyMap[testData.experiments[2].key + testData.experiments[2].variations[1].key] =
        testData.experiments[2].variations[1];
      expectedVariationKeyMap[configObj.experiments[3].key + configObj.experiments[3].variations[0].key] =
        configObj.experiments[3].variations[0];
      expectedVariationKeyMap[configObj.experiments[3].key + configObj.experiments[3].variations[1].key] =
        configObj.experiments[3].variations[1];
      expectedVariationKeyMap[configObj.experiments[4].key + configObj.experiments[4].variations[0].key] =
        configObj.experiments[4].variations[0];
      expectedVariationKeyMap[configObj.experiments[4].key + configObj.experiments[4].variations[1].key] =
        configObj.experiments[4].variations[1];
      expectedVariationKeyMap[configObj.experiments[5].key + configObj.experiments[5].variations[0].key] =
        configObj.experiments[5].variations[0];
      expectedVariationKeyMap[configObj.experiments[5].key + configObj.experiments[5].variations[1].key] =
        configObj.experiments[5].variations[1];
      expectedVariationKeyMap[configObj.experiments[6].key + configObj.experiments[6].variations[0].key] =
        configObj.experiments[6].variations[0];
      expectedVariationKeyMap[configObj.experiments[6].key + configObj.experiments[6].variations[1].key] =
        configObj.experiments[6].variations[1];

      var expectedVariationIdMap = {
        '111128': testData.experiments[0].variations[0],
        '111129': testData.experiments[0].variations[1],
        '122228': testData.experiments[1].variations[0],
        '122229': testData.experiments[1].variations[1],
        '133338': testData.experiments[2].variations[0],
        '133339': testData.experiments[2].variations[1],
        '144448': testData.experiments[3].variations[0],
        '144449': testData.experiments[3].variations[1],
        '551': configObj.experiments[4].variations[0],
        '552': configObj.experiments[4].variations[1],
        '661': configObj.experiments[5].variations[0],
        '662': configObj.experiments[5].variations[1],
        '553': configObj.experiments[6].variations[0],
        '554': configObj.experiments[6].variations[1],
      };

      assert.deepEqual(configObj.variationIdMap, expectedVariationIdMap);
    });

    it('should not mutate the datafile', function() {
      var datafile = testDatafile.getTypedAudiencesConfig();
      var datafileClone = cloneDeep(datafile);
      projectConfig.createProjectConfig(datafile);
      assert.deepEqual(datafileClone, datafile);
    });

    describe('feature management', function() {
      var configObj;
      beforeEach(function() {
        configObj = projectConfig.createProjectConfig(testDatafile.getTestProjectConfigWithFeatures());
      });

      it('creates a rolloutIdMap from rollouts in the datafile', function() {
        assert.deepEqual(configObj.rolloutIdMap, testDatafile.datafileWithFeaturesExpectedData.rolloutIdMap);
      });

      it('creates a variationVariableUsageMap from rollouts and experiments with features in the datafile', function() {
        assert.deepEqual(
          configObj.variationVariableUsageMap,
          testDatafile.datafileWithFeaturesExpectedData.variationVariableUsageMap
        );
      });

      it('creates a featureKeyMap from feature flags in the datafile', function() {
        assert.deepEqual(configObj.featureKeyMap, testDatafile.datafileWithFeaturesExpectedData.featureKeyMap);
      });

      it('adds variations from rollout experiments to variationIdMap', function() {
        assert.deepEqual(configObj.variationIdMap['594032'], {
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
        assert.deepEqual(configObj.variationIdMap['594038'], {
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
        assert.deepEqual(configObj.variationIdMap['594061'], {
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
        assert.deepEqual(configObj.variationIdMap['594067'], {
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
  });

  describe('projectConfig helper methods', function() {
    var testData = cloneDeep(testDatafile.getTestProjectConfig());
    var configObj;
    var createdLogger = loggerPlugin.createLogger({ logLevel: LOG_LEVEL.INFO });

    beforeEach(function() {
      configObj = projectConfig.createProjectConfig(cloneDeep(testData));
      sinon.stub(createdLogger, 'log');
    });

    afterEach(function() {
      createdLogger.log.restore();
    });

    it('should retrieve experiment ID for valid experiment key in getExperimentId', function() {
      assert.strictEqual(
        projectConfig.getExperimentId(configObj, testData.experiments[0].key),
        testData.experiments[0].id
      );
    });

    it('should throw error for invalid experiment key in getExperimentId', function() {
      assert.throws(function() {
        projectConfig.getExperimentId(configObj, 'invalidExperimentKey');
      }, sprintf(ERROR_MESSAGES.INVALID_EXPERIMENT_KEY, 'PROJECT_CONFIG', 'invalidExperimentKey'));
    });

    it('should retrieve layer ID for valid experiment key in getLayerId', function() {
      assert.strictEqual(projectConfig.getLayerId(configObj, '111127'), '4');
    });

    it('should throw error for invalid experiment key in getLayerId', function() {
      assert.throws(function() {
        projectConfig.getLayerId(configObj, 'invalidExperimentKey');
      }, sprintf(ERROR_MESSAGES.INVALID_EXPERIMENT_ID, 'PROJECT_CONFIG', 'invalidExperimentKey'));
    });

    it('should retrieve attribute ID for valid attribute key in getAttributeId', function() {
      assert.strictEqual(projectConfig.getAttributeId(configObj, 'browser_type'), '111094');
    });

    it('should retrieve attribute ID for reserved attribute key in getAttributeId', function() {
      assert.strictEqual(projectConfig.getAttributeId(configObj, '$opt_user_agent'), '$opt_user_agent');
    });

    it('should return null for invalid attribute key in getAttributeId', function() {
      assert.isNull(projectConfig.getAttributeId(configObj, 'invalidAttributeKey', createdLogger));
      sinon.assert.calledWithExactly(
        createdLogger.log,
        LOG_LEVEL.DEBUG,
        'PROJECT_CONFIG: Unrecognized attribute invalidAttributeKey provided. Pruning before sending event to Optimizely.'
      );
    });

    it('should return null for invalid attribute key in getAttributeId', function() {
      // Adding attribute in key map with reserved prefix
      configObj.attributeKeyMap['$opt_some_reserved_attribute'] = {
        id: '42',
        key: '$opt_some_reserved_attribute',
      };
      assert.strictEqual(projectConfig.getAttributeId(configObj, '$opt_some_reserved_attribute', createdLogger), '42');
      sinon.assert.calledWithExactly(
        createdLogger.log,
        LOG_LEVEL.WARNING,
        'Attribute $opt_some_reserved_attribute unexpectedly has reserved prefix $opt_; using attribute ID instead of reserved attribute name.'
      );
    });

    it('should retrieve event ID for valid event key in getEventId', function() {
      assert.strictEqual(projectConfig.getEventId(configObj, 'testEvent'), '111095');
    });

    it('should return null for invalid event key in getEventId', function() {
      assert.isNull(projectConfig.getEventId(configObj, 'invalidEventKey'));
    });

    it('should retrieve experiment status for valid experiment key in getExperimentStatus', function() {
      assert.strictEqual(
        projectConfig.getExperimentStatus(configObj, testData.experiments[0].key),
        testData.experiments[0].status
      );
    });

    it('should throw error for invalid experiment key in getExperimentStatus', function() {
      assert.throws(function() {
        projectConfig.getExperimentStatus(configObj, 'invalidExperimentKey');
      }, sprintf(ERROR_MESSAGES.INVALID_EXPERIMENT_KEY, 'PROJECT_CONFIG', 'invalidExperimentKey'));
    });

    it('should return true if experiment status is set to Running in isActive', function() {
      assert.isTrue(projectConfig.isActive(configObj, 'testExperiment'));
    });

    it('should return false if experiment status is not set to Running in isActive', function() {
      assert.isFalse(projectConfig.isActive(configObj, 'testExperimentNotRunning'));
    });

    it('should return true if experiment status is set to Running in isRunning', function() {
      assert.isTrue(projectConfig.isRunning(configObj, 'testExperiment'));
    });

    it('should return false if experiment status is not set to Running in isRunning', function() {
      assert.isFalse(projectConfig.isRunning(configObj, 'testExperimentLaunched'));
    });

    it('should retrieve variation key for valid experiment key and variation ID in getVariationKeyFromId', function() {
      assert.deepEqual(
        projectConfig.getVariationKeyFromId(configObj, testData.experiments[0].variations[0].id),
        testData.experiments[0].variations[0].key
      );
    });

    it('should retrieve traffic allocation given valid experiment key in getTrafficAllocation', function() {
      assert.deepEqual(
        projectConfig.getTrafficAllocation(configObj, testData.experiments[0].id),
        testData.experiments[0].trafficAllocation
      );
    });

    it('should throw error for invalid experient key in getTrafficAllocation', function() {
      assert.throws(function() {
        projectConfig.getTrafficAllocation(configObj, 'invalidExperimentId');
      }, sprintf(ERROR_MESSAGES.INVALID_EXPERIMENT_ID, 'PROJECT_CONFIG', 'invalidExperimentId'));
    });

    describe('#getVariationIdFromExperimentAndVariationKey', function() {
      it('should return the variation id for the given experiment key and variation key', function() {
        assert.strictEqual(
          projectConfig.getVariationIdFromExperimentAndVariationKey(
            configObj,
            testData.experiments[0].key,
            testData.experiments[0].variations[0].key
          ),
          testData.experiments[0].variations[0].id
        );
      });
    });

    describe('#getVariationIdFromExperimentIdAndVariationKey', function() {
      it('should return the variation id for the given experiment id and variation key', function() {
        assert.strictEqual(
          projectConfig.getVariationIdFromExperimentIdAndVariationKey(
            configObj,
            testData.experiments[0].id,
            testData.experiments[0].variations[0].key
          ),
          testData.experiments[0].variations[0].id
        );
      });
    });

    describe('#getSendFlagDecisionsValue', function() {
      it('should return false when sendFlagDecisions is undefined', function() {
        configObj.sendFlagDecisions = undefined;
        assert.deepEqual(
          projectConfig.getSendFlagDecisionsValue(configObj),
          false
        );
      });

      it('should return false when sendFlagDecisions is set to false', function() {
        configObj.sendFlagDecisions = false;
        assert.deepEqual(
          projectConfig.getSendFlagDecisionsValue(configObj),
          false
        );
      });

      it('should return true when sendFlagDecisions is set to true', function() {
        configObj.sendFlagDecisions = true;
        assert.deepEqual(
          projectConfig.getSendFlagDecisionsValue(configObj),
          true
        );
      });
    });

    describe('feature management', function() {
      var featureManagementLogger = loggerPlugin.createLogger({ logLevel: LOG_LEVEL.INFO });
      beforeEach(function() {
        configObj = projectConfig.createProjectConfig(testDatafile.getTestProjectConfigWithFeatures());
        sinon.stub(featureManagementLogger, 'log');
      });

      afterEach(function() {
        featureManagementLogger.log.restore();
      });

      describe('getVariableForFeature', function() {
        it('should return a variable object for a valid variable and feature key', function() {
          var featureKey = 'test_feature_for_experiment';
          var variableKey = 'num_buttons';
          var result = projectConfig.getVariableForFeature(configObj, featureKey, variableKey, featureManagementLogger);
          assert.deepEqual(result, {
            type: 'integer',
            key: 'num_buttons',
            id: '4792309476491264',
            defaultValue: '10',
          });
        });

        it('should return null for an invalid variable key and a valid feature key', function() {
          var featureKey = 'test_feature_for_experiment';
          var variableKey = 'notARealVariable____';
          var result = projectConfig.getVariableForFeature(configObj, featureKey, variableKey, featureManagementLogger);
          assert.strictEqual(result, null);
          sinon.assert.calledOnce(featureManagementLogger.log);
          sinon.assert.calledWithExactly(
            featureManagementLogger.log,
            LOG_LEVEL.ERROR,
            'PROJECT_CONFIG: Variable with key "notARealVariable____" associated with feature with key "test_feature_for_experiment" is not in datafile.'
          );
        });

        it('should return null for an invalid feature key', function() {
          var featureKey = 'notARealFeature_____';
          var variableKey = 'num_buttons';
          var result = projectConfig.getVariableForFeature(configObj, featureKey, variableKey, featureManagementLogger);
          assert.strictEqual(result, null);
          sinon.assert.calledOnce(featureManagementLogger.log);
          sinon.assert.calledWithExactly(
            featureManagementLogger.log,
            LOG_LEVEL.ERROR,
            'PROJECT_CONFIG: Feature key notARealFeature_____ is not in datafile.'
          );
        });

        it('should return null for an invalid variable key and an invalid feature key', function() {
          var featureKey = 'notARealFeature_____';
          var variableKey = 'notARealVariable____';
          var result = projectConfig.getVariableForFeature(configObj, featureKey, variableKey, featureManagementLogger);
          assert.strictEqual(result, null);
          sinon.assert.calledOnce(featureManagementLogger.log);
          sinon.assert.calledWithExactly(
            featureManagementLogger.log,
            LOG_LEVEL.ERROR,
            'PROJECT_CONFIG: Feature key notARealFeature_____ is not in datafile.'
          );
        });
      });

      describe('getVariableValueForVariation', function() {
        it('returns a value for a valid variation and variable', function() {
          var variation = configObj.variationIdMap['594096'];
          var variable = configObj.featureKeyMap.test_feature_for_experiment.variableKeyMap.num_buttons;
          var result = projectConfig.getVariableValueForVariation(
            configObj,
            variable,
            variation,
            featureManagementLogger
          );
          assert.strictEqual(result, '2');

          variable = configObj.featureKeyMap.test_feature_for_experiment.variableKeyMap.is_button_animated;
          result = projectConfig.getVariableValueForVariation(configObj, variable, variation, featureManagementLogger);
          assert.strictEqual(result, 'true');

          variable = configObj.featureKeyMap.test_feature_for_experiment.variableKeyMap.button_txt;
          result = projectConfig.getVariableValueForVariation(configObj, variable, variation, featureManagementLogger);
          assert.strictEqual(result, 'Buy me NOW');

          variable = configObj.featureKeyMap.test_feature_for_experiment.variableKeyMap.button_width;
          result = projectConfig.getVariableValueForVariation(configObj, variable, variation, featureManagementLogger);
          assert.strictEqual(result, '20.25');
        });

        it('returns null for a null variation', function() {
          var variation = null;
          var variable = configObj.featureKeyMap.test_feature_for_experiment.variableKeyMap.num_buttons;
          var result = projectConfig.getVariableValueForVariation(
            configObj,
            variable,
            variation,
            featureManagementLogger
          );
          assert.strictEqual(result, null);
        });

        it('returns null for a null variable', function() {
          var variation = configObj.variationIdMap['594096'];
          var variable = null;
          var result = projectConfig.getVariableValueForVariation(
            configObj,
            variable,
            variation,
            featureManagementLogger
          );
          assert.strictEqual(result, null);
        });

        it('returns null for a null variation and null variable', function() {
          var variation = null;
          var variable = null;
          var result = projectConfig.getVariableValueForVariation(
            configObj,
            variable,
            variation,
            featureManagementLogger
          );
          assert.strictEqual(result, null);
        });

        it('returns null for a variation whose id is not in the datafile', function() {
          var variation = {
            key: 'some_variation',
            id: '999999999999',
            variables: [],
          };
          var variable = configObj.featureKeyMap.test_feature_for_experiment.variableKeyMap.num_buttons;
          var result = projectConfig.getVariableValueForVariation(
            configObj,
            variable,
            variation,
            featureManagementLogger
          );
          assert.strictEqual(result, null);
        });

        it('returns null if the variation does not have a value for this variable', function() {
          var variation = configObj.variationIdMap['595008']; // This variation has no variable values associated with it
          var variable = configObj.featureKeyMap.test_feature_for_experiment.variableKeyMap.num_buttons;
          var result = projectConfig.getVariableValueForVariation(
            configObj,
            variable,
            variation,
            featureManagementLogger
          );
          assert.isNull(result);
        });
      });

      describe('getTypeCastValue', function() {
        it('can cast a boolean', function() {
          var result = projectConfig.getTypeCastValue('true', FEATURE_VARIABLE_TYPES.BOOLEAN, featureManagementLogger);
          assert.strictEqual(result, true);
          result = projectConfig.getTypeCastValue('false', FEATURE_VARIABLE_TYPES.BOOLEAN, featureManagementLogger);
          assert.strictEqual(result, false);
        });

        it('can cast an integer', function() {
          var result = projectConfig.getTypeCastValue('50', FEATURE_VARIABLE_TYPES.INTEGER, featureManagementLogger);
          assert.strictEqual(result, 50);
          var result = projectConfig.getTypeCastValue('-7', FEATURE_VARIABLE_TYPES.INTEGER, featureManagementLogger);
          assert.strictEqual(result, -7);
          var result = projectConfig.getTypeCastValue('0', FEATURE_VARIABLE_TYPES.INTEGER, featureManagementLogger);
          assert.strictEqual(result, 0);
        });

        it('can cast a double', function() {
          var result = projectConfig.getTypeCastValue('89.99', FEATURE_VARIABLE_TYPES.DOUBLE, featureManagementLogger);
          assert.strictEqual(result, 89.99);
          var result = projectConfig.getTypeCastValue(
            '-257.21',
            FEATURE_VARIABLE_TYPES.DOUBLE,
            featureManagementLogger
          );
          assert.strictEqual(result, -257.21);
          var result = projectConfig.getTypeCastValue('0', FEATURE_VARIABLE_TYPES.DOUBLE, featureManagementLogger);
          assert.strictEqual(result, 0);
          var result = projectConfig.getTypeCastValue('10', FEATURE_VARIABLE_TYPES.DOUBLE, featureManagementLogger);
          assert.strictEqual(result, 10);
        });

        it('can return a string unmodified', function() {
          var result = projectConfig.getTypeCastValue(
            'message',
            FEATURE_VARIABLE_TYPES.STRING,
            featureManagementLogger
          );
          assert.strictEqual(result, 'message');
        });

        it('returns null and logs an error for an invalid boolean', function() {
          var result = projectConfig.getTypeCastValue(
            'notabool',
            FEATURE_VARIABLE_TYPES.BOOLEAN,
            featureManagementLogger
          );
          assert.strictEqual(result, null);
          sinon.assert.calledWithExactly(
            featureManagementLogger.log,
            LOG_LEVEL.ERROR,
            'PROJECT_CONFIG: Unable to cast value notabool to type boolean, returning null.'
          );
        });

        it('returns null and logs an error for an invalid integer', function() {
          var result = projectConfig.getTypeCastValue(
            'notanint',
            FEATURE_VARIABLE_TYPES.INTEGER,
            featureManagementLogger
          );
          assert.strictEqual(result, null);
          sinon.assert.calledWithExactly(
            featureManagementLogger.log,
            LOG_LEVEL.ERROR,
            'PROJECT_CONFIG: Unable to cast value notanint to type integer, returning null.'
          );
        });

        it('returns null and logs an error for an invalid double', function() {
          var result = projectConfig.getTypeCastValue(
            'notadouble',
            FEATURE_VARIABLE_TYPES.DOUBLE,
            featureManagementLogger
          );
          assert.strictEqual(result, null);
          sinon.assert.calledWithExactly(
            featureManagementLogger.log,
            LOG_LEVEL.ERROR,
            'PROJECT_CONFIG: Unable to cast value notadouble to type double, returning null.'
          );
        });
      });
    });

    describe('#getAudiencesById', function() {
      beforeEach(function() {
        configObj = projectConfig.createProjectConfig(testDatafile.getTypedAudiencesConfig());
      });

      it('should retrieve audiences by checking first in typedAudiences, and then second in audiences', function() {
        assert.deepEqual(projectConfig.getAudiencesById(configObj), testDatafile.typedAudiencesById);
      });
    });

    describe('#getExperimentAudienceConditions', function() {
      it('should retrieve audiences for valid experiment key', function() {
        configObj = projectConfig.createProjectConfig(cloneDeep(testData));
        assert.deepEqual(projectConfig.getExperimentAudienceConditions(configObj, testData.experiments[1].id), [
          '11154',
        ]);
      });

      it('should throw error for invalid experiment key', function() {
        configObj = projectConfig.createProjectConfig(cloneDeep(testData));
        assert.throws(function() {
          projectConfig.getExperimentAudienceConditions(configObj, 'invalidExperimentId');
        }, sprintf(ERROR_MESSAGES.INVALID_EXPERIMENT_ID, 'PROJECT_CONFIG', 'invalidExperimentId'));
      });

      it('should return experiment audienceIds if experiment has no audienceConditions', function() {
        configObj = projectConfig.createProjectConfig(testDatafile.getTypedAudiencesConfig());
        var result = projectConfig.getExperimentAudienceConditions(configObj, '11564051718');
        assert.deepEqual(result, [
          '3468206642',
          '3988293898',
          '3988293899',
          '3468206646',
          '3468206647',
          '3468206644',
          '3468206643',
        ]);
      });

      it('should return experiment audienceConditions if experiment has audienceConditions', function() {
        configObj = projectConfig.createProjectConfig(testDatafile.getTypedAudiencesConfig());
        // audience_combinations_experiment has both audienceConditions and audienceIds
        // audienceConditions should be preferred over audienceIds
        var result = projectConfig.getExperimentAudienceConditions(configObj, '1323241598');
        assert.deepEqual(result, [
          'and',
          ['or', '3468206642', '3988293898'],
          ['or', '3988293899', '3468206646', '3468206647', '3468206644', '3468206643'],
        ]);
      });
    });

    describe('#isFeatureExperiment', function() {
      it('returns true for a feature test', function() {
        var config = projectConfig.createProjectConfig(testDatafile.getTestProjectConfigWithFeatures());
        var result = projectConfig.isFeatureExperiment(config, '594098'); // id of 'testing_my_feature'
        assert.isTrue(result);
      });

      it('returns false for an A/B test', function() {
        var config = projectConfig.createProjectConfig(testDatafile.getTestProjectConfig());
        var result = projectConfig.isFeatureExperiment(config, '111127'); // id of 'testExperiment'
        assert.isFalse(result);
      });

      it('returns true for a feature test in a mutex group', function() {
        var config = projectConfig.createProjectConfig(testDatafile.getMutexFeatureTestsConfig());
        var result = projectConfig.isFeatureExperiment(config, '17128410791'); // id of 'f_test1'
        assert.isTrue(result);
        result = projectConfig.isFeatureExperiment(config, '17139931304'); // id of 'f_test2'
        assert.isTrue(result);
      });
    });
  });

  describe('#tryCreatingProjectConfig', function() {
    var stubJsonSchemaValidator;
    beforeEach(function() {
      stubJsonSchemaValidator = {
        validate: sinon.stub().returns(true),
      };
      sinon.stub(configValidator, 'validateDatafile').returns(true);
      sinon.spy(logger, 'error');
    });

    afterEach(function() {
      configValidator.validateDatafile.restore();
      logger.error.restore();
    });

    it('returns a project config object created by createProjectConfig when all validation is applied and there are no errors', function() {
      var configDatafile = {
        foo: 'bar',
        experiments: [
          {key: 'a'},
          {key: 'b'}
        ]
      }
      configValidator.validateDatafile.returns(configDatafile);
      var configObj = {
        foo: 'bar',
        experimentKeyMap: {
          "a": { key: "a", variationKeyMap: {} },
          "b": { key: "b", variationKeyMap: {} }
        },
      };

      stubJsonSchemaValidator.validate.returns(true);

      var result = projectConfig.tryCreatingProjectConfig({
        datafile: configDatafile,
        jsonSchemaValidator: stubJsonSchemaValidator,
        logger: logger,
      });

      assert.deepInclude(result.configObj, configObj)
    });

    it('returns an error when validateDatafile throws', function() {
      configValidator.validateDatafile.throws();
      stubJsonSchemaValidator.validate.returns(true);
      var { error } = projectConfig.tryCreatingProjectConfig({
        datafile: { foo: 'bar' },
        jsonSchemaValidator: stubJsonSchemaValidator,
        logger: logger,
      });
      assert.isNotNull(error);
    });

    it('returns an error when jsonSchemaValidator.validate throws', function() {
      configValidator.validateDatafile.returns(true);
      stubJsonSchemaValidator.validate.throws();
      var { error } = projectConfig.tryCreatingProjectConfig({
        datafile: { foo: 'bar' },
        jsonSchemaValidator: stubJsonSchemaValidator,
        logger: logger,
      });
    assert.isNotNull(error);
    });

    it('skips json validation when jsonSchemaValidator is not provided', function() {

      var configDatafile = {
        foo: 'bar',
        experiments: [
          {key: 'a'},
          {key: 'b'}
        ]
      }

      configValidator.validateDatafile.returns(configDatafile);

      var configObj = {
        foo: 'bar',
        experimentKeyMap: {
          a: { key: 'a', variationKeyMap: {} },
          b: { key: 'b', variationKeyMap: {} },
        },
      };

      var result = projectConfig.tryCreatingProjectConfig({
        datafile: configDatafile,
        logger: logger,
      });

      assert.deepInclude(result.configObj, configObj);
      sinon.assert.notCalled(logger.error);
    });
  });
});
