/**
 * Copyright 2016-2017, Optimizely
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
var projectConfig = require('./');
var enums = require('../../utils/enums');
var testDatafile = require('../../tests/test_data');

var _ = require('lodash/core');
var fns = require('../../utils/fns');
var chai = require('chai');
var assert = chai.assert;
var logger = require('../../plugins/logger');
var sinon = require('sinon');
var sprintf = require('sprintf');

var ERROR_MESSAGES = enums.ERROR_MESSAGES;
var FEATURE_VARIABLE_TYPES = enums.FEATURE_VARIABLE_TYPES;
var LOG_LEVEL = enums.LOG_LEVEL;

describe('lib/core/project_config', function() {
  var parsedAudiences = testDatafile.getParsedAudiences;
  describe('createProjectConfig method', function() {
    it('should set properties correctly when createProjectConfig is called', function() {
      var testData = testDatafile.getTestProjectConfig();
      var configObj = projectConfig.createProjectConfig(testData);

      _.forEach(testData.audiences, function(audience) {
        audience.conditions = JSON.parse(audience.conditions);
      });

      assert.strictEqual(configObj.accountId, testData.accountId);
      assert.strictEqual(configObj.projectId, testData.projectId);
      assert.strictEqual(configObj.revision, testData.revision);
      assert.deepEqual(configObj.events, testData.events);
      assert.deepEqual(configObj.audiences, testData.audiences);
      assert.deepEqual(configObj.groups, testData.groups);

      var expectedGroupIdMap = {
        666: testData.groups[0],
        667: testData.groups[1],
      };

      assert.deepEqual(configObj.groupIdMap, expectedGroupIdMap);

      var expectedExperiments = testData.experiments;
      _.forEach(configObj.groupIdMap, function(group, Id) {
        _.forEach(group.experiments, function(experiment) {
          experiment.groupId = Id;
          expectedExperiments.push(experiment);
        });
      });

      _.forEach(expectedExperiments, function(experiment) {
        experiment.variationKeyMap = fns.keyBy(experiment.variations, 'key');
      });

      assert.deepEqual(configObj.experiments, expectedExperiments);

      var expectedAttributeKeyMap = {
        browser_type: testData.attributes[0],
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
      expectedVariationKeyMap[testData.experiments[0].key + testData.experiments[0].variations[0].key] = testData.experiments[0].variations[0];
      expectedVariationKeyMap[testData.experiments[0].key + testData.experiments[0].variations[1].key] = testData.experiments[0].variations[1];
      expectedVariationKeyMap[testData.experiments[1].key + testData.experiments[1].variations[0].key] = testData.experiments[1].variations[0];
      expectedVariationKeyMap[testData.experiments[1].key + testData.experiments[1].variations[1].key] = testData.experiments[1].variations[1];
      expectedVariationKeyMap[testData.experiments[2].key + testData.experiments[2].variations[0].key] = testData.experiments[2].variations[0];
      expectedVariationKeyMap[testData.experiments[2].key + testData.experiments[2].variations[1].key] = testData.experiments[2].variations[1];
      expectedVariationKeyMap[configObj.experiments[3].key + configObj.experiments[3].variations[0].key] = configObj.experiments[3].variations[0];
      expectedVariationKeyMap[configObj.experiments[3].key + configObj.experiments[3].variations[1].key] = configObj.experiments[3].variations[1];
      expectedVariationKeyMap[configObj.experiments[4].key + configObj.experiments[4].variations[0].key] = configObj.experiments[4].variations[0];
      expectedVariationKeyMap[configObj.experiments[4].key + configObj.experiments[4].variations[1].key] = configObj.experiments[4].variations[1];
      expectedVariationKeyMap[configObj.experiments[5].key + configObj.experiments[5].variations[0].key] = configObj.experiments[5].variations[0];
      expectedVariationKeyMap[configObj.experiments[5].key + configObj.experiments[5].variations[1].key] = configObj.experiments[5].variations[1];
      expectedVariationKeyMap[configObj.experiments[6].key + configObj.experiments[6].variations[0].key] = configObj.experiments[6].variations[0];
      expectedVariationKeyMap[configObj.experiments[6].key + configObj.experiments[6].variations[1].key] = configObj.experiments[6].variations[1];

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

    describe('feature management', function() {
      var configObj;
      beforeEach(function() {
        configObj = projectConfig.createProjectConfig(testDatafile.getTestProjectConfigWithFeatures());
      });

      it('creates a rolloutIdMap from rollouts in the datafile', function() {
        assert.deepEqual(configObj.rolloutIdMap, testDatafile.datafileWithFeaturesExpectedData.rolloutIdMap);
      });

      it('creates a variationVariableUsageMap from rollouts and experiments with features in the datafile', function() {
        assert.deepEqual(configObj.variationVariableUsageMap, testDatafile.datafileWithFeaturesExpectedData.variationVariableUsageMap);
      });

      it('creates a featureKeyMap from feature flags in the datafile', function() {
        assert.deepEqual(configObj.featureKeyMap, testDatafile.datafileWithFeaturesExpectedData.featureKeyMap);
      });

      it('adds variations from rollout experiments to variationIdMap', function() {
        assert.deepEqual(configObj.variationIdMap['594032'], {
          'variables': [
            { 'value': 'true', 'id': '4919852825313280' },
            { 'value': '395', 'id': '5482802778734592' },
            { 'value': '4.99', 'id': '6045752732155904' },
            { 'value': 'Hello audience', 'id': '6327227708866560' }
          ],
          'featureEnabled': true,
          'key': '594032',
          'id': '594032'
        });
        assert.deepEqual(configObj.variationIdMap['594038'], {
          'variables': [
            { 'value': 'false', 'id': '4919852825313280' },
            { 'value': '400', 'id': '5482802778734592' },
            { 'value': '14.99', 'id': '6045752732155904' },
            { 'value': 'Hello', 'id': '6327227708866560' },
          ],
          'featureEnabled': false,
          'key': '594038',
          'id': '594038'
        });
        assert.deepEqual(configObj.variationIdMap['594061'], {
          'variables': [
            { 'value': '27.34', 'id': '5060590313668608' },
            { 'value': 'Winter is NOT coming', 'id': '5342065290379264' },
            { 'value': '10003', 'id': '6186490220511232' },
            { 'value': 'false', 'id': '6467965197221888' },
          ],
          'featureEnabled': true,
          'key': '594061',
          'id': '594061'
        });
        assert.deepEqual(configObj.variationIdMap['594067'], {
          'variables': [
            { 'value': '30.34', 'id': '5060590313668608' },
            { 'value': 'Winter is coming definitely', 'id': '5342065290379264' },
            { 'value': '500', 'id': '6186490220511232' },
            { 'value': 'true', 'id': '6467965197221888' }
          ],
          'featureEnabled': true,
          'key': '594067',
          'id': '594067',
        });
      });
    });
  });

  describe('projectConfig helper methods', function() {
    var testData = testDatafile.getTestProjectConfig();
    var configObj;
    var createdLogger = logger.createLogger({logLevel: LOG_LEVEL.INFO});

    beforeEach(function() {
      configObj = projectConfig.createProjectConfig(testData);
      sinon.stub(createdLogger, 'log');
    });

    afterEach(function() {
      createdLogger.log.restore();
    });

    it('should retrieve experiment ID for valid experiment key in getExperimentId', function() {
      assert.strictEqual(projectConfig.getExperimentId(configObj, testData.experiments[0].key),
                         testData.experiments[0].id);
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
      sinon.assert.calledWithExactly(createdLogger.log,
                                     LOG_LEVEL.DEBUG,
                                     'PROJECT_CONFIG: Unrecognized attribute invalidAttributeKey provided. Pruning before sending event to Optimizely.');
    });

    it('should return null for invalid attribute key in getAttributeId', function() {
      // Adding attribute in key map with reserved prefix
      configObj.attributeKeyMap['$opt_some_reserved_attribute'] = {
        id: '42',
        key: '$opt_some_reserved_attribute'
      };
      assert.strictEqual(projectConfig.getAttributeId(configObj, '$opt_some_reserved_attribute', createdLogger), '42');
      sinon.assert.calledWithExactly(createdLogger.log,
                                     LOG_LEVEL.WARN,
                                     'Attribute $opt_some_reserved_attribute unexpectedly has reserved prefix $opt_; using attribute ID instead of reserved attribute name.');
    });

    it('should retrieve event ID for valid event key in getEventId', function() {
      assert.strictEqual(projectConfig.getEventId(configObj, 'testEvent'), '111095');
    });

    it('should return null for invalid event key in getEventId', function() {
      assert.isNull(projectConfig.getEventId(configObj, 'invalidEventKey'));
    });

    it('should retrieve experiment status for valid experiment key in getExperimentStatus', function() {
      assert.strictEqual(projectConfig.getExperimentStatus(configObj, testData.experiments[0].key),
                         testData.experiments[0].status);
    });

    it('should throw error for invalid experiment key in getExperimentStatus', function() {
      assert.throws(function() {
        projectConfig.getExperimentStatus(configObj, 'invalidExperimentKey');
      }, sprintf(ERROR_MESSAGES.INVALID_EXPERIMENT_KEY, 'PROJECT_CONFIG', 'invalidExperimentKey'));
    });

    it('should retrieve audiences for valid experiment key in getAudiencesForExperiment', function() {
      assert.deepEqual(projectConfig.getAudiencesForExperiment(configObj, testData.experiments[1].key),
                       parsedAudiences);
    });

    it('should throw error for invalid experiment key in getAudiencesForExperiment', function() {
      assert.throws(function() {
        projectConfig.getAudiencesForExperiment(configObj, 'invalidExperimentKey');
      }, sprintf(ERROR_MESSAGES.INVALID_EXPERIMENT_KEY, 'PROJECT_CONFIG', 'invalidExperimentKey'));
    });

    it('should return true if experiment status is set to Running or Launch in isActive', function() {
      assert.isTrue(projectConfig.isActive(configObj, 'testExperiment'));

      assert.isTrue(projectConfig.isActive(configObj, 'testExperimentLaunched'));
    });

    it('should return true if experiment status is set to Running or Launch in isActive', function() {
      assert.isFalse(projectConfig.isActive(configObj, 'testExperimentNotRunning'));
    });

    it('should return true if experiment status is set to Running in isRunning', function() {
      assert.isTrue(projectConfig.isRunning(configObj, 'testExperiment'));
    });

    it('should return false if experiment status is not set to Running in isRunning', function() {
      assert.isFalse(projectConfig.isRunning(configObj, 'testExperimentLaunched'));
    });

    it('should retrieve variation key for valid experiment key and variation ID in getVariationKeyFromId', function() {
      assert.deepEqual(projectConfig.getVariationKeyFromId(configObj,
                                                           testData.experiments[0].variations[0].id),
                       testData.experiments[0].variations[0].key);
    });

    it('should retrieve experiment IDs for event given valid event key in getExperimentIdsForEvent', function() {
      assert.deepEqual(projectConfig.getExperimentIdsForEvent(configObj, testData.events[0].key),
                       testData.events[0].experimentIds);
    });

    it('should throw error for invalid event key in getExperimentIdsForEvent', function() {
      assert.throws(function() {
        projectConfig.getExperimentIdsForEvent(configObj, 'invalidEventKey');
      }, sprintf(ERROR_MESSAGES.INVALID_EVENT_KEY, 'PROJECT_CONFIG', 'invalidEventKey'));
    });

    it('should retrieve traffic allocation given valid experiment key in getTrafficAllocation', function() {
      assert.deepEqual(projectConfig.getTrafficAllocation(configObj, testData.experiments[0].key),
                       testData.experiments[0].trafficAllocation);
    });

    it('should throw error for invalid experient key in getTrafficAllocation', function() {
      assert.throws(function() {
        projectConfig.getTrafficAllocation(configObj, 'invalidExperimentKey');
      }, sprintf(ERROR_MESSAGES.INVALID_EXPERIMENT_KEY, 'PROJECT_CONFIG', 'invalidExperimentKey'));
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

    describe('feature management', function() {
      var featureManagementLogger = logger.createLogger({logLevel: LOG_LEVEL.INFO});
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
          sinon.assert.calledWithExactly(featureManagementLogger.log, LOG_LEVEL.ERROR, 'PROJECT_CONFIG: Variable with key "notARealVariable____" associated with feature with key "test_feature_for_experiment" is not in datafile.');
        });

        it('should return null for an invalid feature key', function() {
          var featureKey = 'notARealFeature_____';
          var variableKey = 'num_buttons';
          var result = projectConfig.getVariableForFeature(configObj, featureKey, variableKey, featureManagementLogger);
          assert.strictEqual(result, null);
          sinon.assert.calledOnce(featureManagementLogger.log);
          sinon.assert.calledWithExactly(featureManagementLogger.log, LOG_LEVEL.ERROR, 'PROJECT_CONFIG: Feature key notARealFeature_____ is not in datafile.');
        });

        it('should return null for an invalid variable key and an invalid feature key', function() {
          var featureKey = 'notARealFeature_____';
          var variableKey = 'notARealVariable____';
          var result = projectConfig.getVariableForFeature(configObj, featureKey, variableKey, featureManagementLogger);
          assert.strictEqual(result, null);
          sinon.assert.calledOnce(featureManagementLogger.log);
          sinon.assert.calledWithExactly(featureManagementLogger.log, LOG_LEVEL.ERROR, 'PROJECT_CONFIG: Feature key notARealFeature_____ is not in datafile.');
        });
      });

      describe('getVariableValueForVariation', function() {
        it('returns a value for a valid variation and variable', function() {
          var variation = configObj.variationIdMap['594096'];
          var variable = configObj.featureKeyMap.test_feature_for_experiment.variableKeyMap.num_buttons;
          var result = projectConfig.getVariableValueForVariation(configObj, variable, variation, featureManagementLogger);
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
          var result = projectConfig.getVariableValueForVariation(configObj, variable, variation, featureManagementLogger);
          assert.strictEqual(result, null);
        });

        it('returns null for a null variable', function() {
          var variation = configObj.variationIdMap['594096'];
          var variable = null;
          var result = projectConfig.getVariableValueForVariation(configObj, variable, variation, featureManagementLogger);
          assert.strictEqual(result, null);
        });

        it('returns null for a null variation and null variable', function() {
          var variation = null;
          var variable = null;
          var result = projectConfig.getVariableValueForVariation(configObj, variable, variation, featureManagementLogger);
          assert.strictEqual(result, null);
        });

        it('returns null for a variation whose id is not in the datafile', function() {
          var variation = {
            key: 'some_variation',
            id: '999999999999',
            variables: [],
          };
          var variable = configObj.featureKeyMap.test_feature_for_experiment.variableKeyMap.num_buttons;
          var result = projectConfig.getVariableValueForVariation(configObj, variable, variation, featureManagementLogger);
          assert.strictEqual(result, null);
        });

        it('returns the variable default value if the variation does not have a value for this variable', function() {
          var variation = configObj.variationIdMap['595008']; // This variation has no variable values associated with it
          var variable = configObj.featureKeyMap.test_feature_for_experiment.variableKeyMap.num_buttons;
          var result = projectConfig.getVariableValueForVariation(configObj, variable, variation, featureManagementLogger);
          assert.strictEqual(result, '10');
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
          var result = projectConfig.getTypeCastValue('-257.21', FEATURE_VARIABLE_TYPES.DOUBLE, featureManagementLogger);
          assert.strictEqual(result, -257.21);
          var result = projectConfig.getTypeCastValue('0', FEATURE_VARIABLE_TYPES.DOUBLE, featureManagementLogger);
          assert.strictEqual(result, 0);
          var result = projectConfig.getTypeCastValue('10', FEATURE_VARIABLE_TYPES.DOUBLE, featureManagementLogger);
          assert.strictEqual(result, 10);
        });

        it('can return a string unmodified', function() {
          var result = projectConfig.getTypeCastValue('message', FEATURE_VARIABLE_TYPES.STRING, featureManagementLogger);
          assert.strictEqual(result, 'message');
        });

        it('returns null and logs an error for an invalid boolean', function() {
          var result = projectConfig.getTypeCastValue('notabool', FEATURE_VARIABLE_TYPES.BOOLEAN, featureManagementLogger);
          assert.strictEqual(result, null);
          sinon.assert.calledWithExactly(featureManagementLogger.log, LOG_LEVEL.ERROR, 'PROJECT_CONFIG: Unable to cast value notabool to type boolean, returning null.');
        });

        it('returns null and logs an error for an invalid integer', function() {
          var result = projectConfig.getTypeCastValue('notanint', FEATURE_VARIABLE_TYPES.INTEGER, featureManagementLogger);
          assert.strictEqual(result, null);
          sinon.assert.calledWithExactly(featureManagementLogger.log, LOG_LEVEL.ERROR, 'PROJECT_CONFIG: Unable to cast value notanint to type integer, returning null.');
        });

        it('returns null and logs an error for an invalid double', function() {
          var result = projectConfig.getTypeCastValue('notadouble', FEATURE_VARIABLE_TYPES.DOUBLE, featureManagementLogger);
          assert.strictEqual(result, null);
          sinon.assert.calledWithExactly(featureManagementLogger.log, LOG_LEVEL.ERROR, 'PROJECT_CONFIG: Unable to cast value notadouble to type double, returning null.');
        });
      });
    });
  });

  describe('#getForcedVariation', function() {
    var createdLogger = logger.createLogger({logLevel: LOG_LEVEL.INFO});
    beforeEach(function() {
      sinon.stub(createdLogger, 'log');
    });

    afterEach(function() {
      createdLogger.log.restore();
    });

    it('should return null for valid experimentKey, not set', function() {
      var testData = testDatafile.getTestProjectConfig();
      var configObj = projectConfig.createProjectConfig(testData);

      var variation = projectConfig.getForcedVariation(configObj, 'testExperiment', 'user1', createdLogger);
      assert.strictEqual(variation, null);
    });

    it('should return null for invalid experimentKey, not set', function() {
      var testData = testDatafile.getTestProjectConfig();
      var configObj = projectConfig.createProjectConfig(testData);

      var variation = projectConfig.getForcedVariation(configObj, 'definitely_not_valid_exp_key', 'user1', createdLogger);
      assert.strictEqual(variation, null);
    });
  });

  describe('#setForcedVariation', function() {
    var createdLogger = logger.createLogger({logLevel: LOG_LEVEL.INFO});
    beforeEach(function() {
      sinon.stub(createdLogger, 'log');
    });

    afterEach(function() {
      createdLogger.log.restore();
    });

    it('should return true for a valid forcedVariation in setForcedVariation', function() {
      var testData = testDatafile.getTestProjectConfig();
      var configObj = projectConfig.createProjectConfig(testData);

      var didSetVariation = projectConfig.setForcedVariation(configObj, 'testExperiment', 'user1', 'control', createdLogger);
      assert.strictEqual(didSetVariation, true);
    });

    it('should return the same variation from getVariation as was set in setVariation', function() {
      var testData = testDatafile.getTestProjectConfig();
      var configObj = projectConfig.createProjectConfig(testData);

      projectConfig.setForcedVariation(configObj, 'testExperiment', 'user1', 'control', createdLogger);
      var variation = projectConfig.getForcedVariation(configObj, 'testExperiment', 'user1', createdLogger);
      assert.strictEqual(variation, 'control');
    });

    it('should not set for an invalid variation key', function() {
      var testData = testDatafile.getTestProjectConfig();
      var configObj = projectConfig.createProjectConfig(testData);

      projectConfig.setForcedVariation(configObj, 'testExperiment', 'user1', 'definitely_not_valid_variation_key', createdLogger);
      var variation = projectConfig.getForcedVariation(configObj, 'testExperiment', 'user1', createdLogger);
      assert.strictEqual(variation, null);
    });

    it('should reset the forcedVariation if passed null', function() {
      var testData = testDatafile.getTestProjectConfig();
      var configObj = projectConfig.createProjectConfig(testData);

      var didSetVariation = projectConfig.setForcedVariation(configObj, 'testExperiment', 'user1', 'control', createdLogger);
      assert.strictEqual(didSetVariation, true);

      var variation = projectConfig.getForcedVariation(configObj, 'testExperiment', 'user1', createdLogger);
      assert.strictEqual(variation, 'control');

      var didSetVariationAgain = projectConfig.setForcedVariation(configObj, 'testExperiment', 'user1', null, createdLogger);
      assert.strictEqual(didSetVariationAgain, true);

      var variation = projectConfig.getForcedVariation(configObj, 'testExperiment', 'user1', createdLogger);
      assert.strictEqual(variation, null);
    });

    it('should be able to add variations for multiple experiments for one user', function() {
      var testData = testDatafile.getTestProjectConfig();
      var configObj = projectConfig.createProjectConfig(testData);

      var didSetVariation = projectConfig.setForcedVariation(configObj, 'testExperiment', 'user1', 'control', createdLogger);
      assert.strictEqual(didSetVariation, true);

      var didSetVariation2 = projectConfig.setForcedVariation(configObj, 'testExperimentLaunched', 'user1', 'controlLaunched', createdLogger);
      assert.strictEqual(didSetVariation2, true);

      var variation = projectConfig.getForcedVariation(configObj, 'testExperiment', 'user1', createdLogger);
      var variation2 = projectConfig.getForcedVariation(configObj, 'testExperimentLaunched', 'user1', createdLogger);

      assert.strictEqual(variation, 'control');
      assert.strictEqual(variation2, 'controlLaunched');
    });

    it('should be able to add experiments for multiple users', function() {
      var testData = testDatafile.getTestProjectConfig();
      var configObj = projectConfig.createProjectConfig(testData);

      var didSetVariation = projectConfig.setForcedVariation(configObj, 'testExperiment', 'user1', 'control', createdLogger);
      assert.strictEqual(didSetVariation, true);

      var didSetVariation = projectConfig.setForcedVariation(configObj, 'testExperiment', 'user2', 'variation', createdLogger);
      assert.strictEqual(didSetVariation, true);

      var variationControl = projectConfig.getForcedVariation(configObj, 'testExperiment', 'user1', createdLogger);
      var variationVariation = projectConfig.getForcedVariation(configObj, 'testExperiment', 'user2', createdLogger);

      assert.strictEqual(variationControl, 'control');
      assert.strictEqual(variationVariation, 'variation');
    });

    it('should be able to reset a variation for a user with multiple experiments', function() {
      var testData = testDatafile.getTestProjectConfig();
      var configObj = projectConfig.createProjectConfig(testData);

      //set the first time
      var didSetVariation = projectConfig.setForcedVariation(configObj, 'testExperiment', 'user1', 'control', createdLogger);
      assert.strictEqual(didSetVariation, true);

      var didSetVariation2 = projectConfig.setForcedVariation(configObj, 'testExperimentLaunched', 'user1', 'controlLaunched', createdLogger);
      assert.strictEqual(didSetVariation2, true);

      var variation = projectConfig.getForcedVariation(configObj, 'testExperiment', 'user1', createdLogger);
      var variation2 = projectConfig.getForcedVariation(configObj, 'testExperimentLaunched', 'user1', createdLogger);

      assert.strictEqual(variation, 'control');
      assert.strictEqual(variation2, 'controlLaunched');

      //reset for one of the experiments
      var didSetVariationAgain = projectConfig.setForcedVariation(configObj, 'testExperiment', 'user1', 'variation', createdLogger);
      assert.strictEqual(didSetVariationAgain, true);

      var variation = projectConfig.getForcedVariation(configObj, 'testExperiment', 'user1', createdLogger);
      var variation2 = projectConfig.getForcedVariation(configObj, 'testExperimentLaunched', 'user1', createdLogger);

      assert.strictEqual(variation, 'variation');
      assert.strictEqual(variation2, 'controlLaunched');
    });

    it('should be able to unset a variation for a user with multiple experiments', function() {
      var testData = testDatafile.getTestProjectConfig();
      var configObj = projectConfig.createProjectConfig(testData);

      //set the first time
      var didSetVariation = projectConfig.setForcedVariation(configObj, 'testExperiment', 'user1', 'control', createdLogger);
      assert.strictEqual(didSetVariation, true);

      var didSetVariation2 = projectConfig.setForcedVariation(configObj, 'testExperimentLaunched', 'user1', 'controlLaunched', createdLogger);
      assert.strictEqual(didSetVariation2, true);

      var variation = projectConfig.getForcedVariation(configObj, 'testExperiment', 'user1', createdLogger);
      var variation2 = projectConfig.getForcedVariation(configObj, 'testExperimentLaunched', 'user1', createdLogger);

      assert.strictEqual(variation, 'control');
      assert.strictEqual(variation2, 'controlLaunched');

      //reset for one of the experiments
      projectConfig.setForcedVariation(configObj, 'testExperiment', 'user1', null, createdLogger);
      assert.strictEqual(didSetVariation, true);

      var variation = projectConfig.getForcedVariation(configObj, 'testExperiment', 'user1', createdLogger);
      var variation2 = projectConfig.getForcedVariation(configObj, 'testExperimentLaunched', 'user1', createdLogger);

      assert.strictEqual(variation, null);
      assert.strictEqual(variation2, 'controlLaunched');
    });

    it('should return false for a null userId', function() {
      var testData = testDatafile.getTestProjectConfig();
      var configObj = projectConfig.createProjectConfig(testData);

      var didSetVariation = projectConfig.setForcedVariation(configObj, 'testExperiment', null, 'control', createdLogger);
      assert.strictEqual(didSetVariation, false);
    });

    it('should return false for an undefined userId', function() {
      var testData = testDatafile.getTestProjectConfig();
      var configObj = projectConfig.createProjectConfig(testData);

      var didSetVariation = projectConfig.setForcedVariation(configObj, 'testExperiment', undefined, 'control', createdLogger);
      assert.strictEqual(didSetVariation, false);
    });
  });
});
