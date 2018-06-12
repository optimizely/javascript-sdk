/****************************************************************************
 * Copyright 2017, Optimizely, Inc. and contributors                        *
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

var Optimizely = require('../../optimizely');
var eventBuilder = require('../../core/event_builder/index.js');
var eventDispatcher = require('../../plugins/event_dispatcher/index.node');
var errorHandler = require('../../plugins/error_handler');
var bucketer = require('../bucketer');
var DecisionService = require('./');
var enums = require('../../utils/enums');
var logger = require('../../plugins/logger');
var projectConfig = require('../project_config');
var sprintf = require('sprintf');
var testData = require('../../tests/test_data').getTestProjectConfig();
var testDataWithFeatures = require('../../tests/test_data').getTestProjectConfigWithFeatures();
var jsonSchemaValidator = require('../../utils/json_schema_validator');


var chai = require('chai');
var sinon = require('sinon');
var assert = chai.assert;

var LOG_LEVEL = enums.LOG_LEVEL;
var LOG_MESSAGES = enums.LOG_MESSAGES;
var DECISION_SOURCES = enums.DECISION_SOURCES;

describe('lib/core/decision_service', function() {
  describe('APIs', function() {
    var configObj = projectConfig.createProjectConfig(testData);
    var decisionServiceInstance;
    var mockLogger = logger.createLogger({logLevel: LOG_LEVEL.INFO});
    var bucketerStub;

    beforeEach(function () {
      bucketerStub = sinon.stub(bucketer, 'bucket');
      sinon.stub(mockLogger, 'log');
      decisionServiceInstance = DecisionService.createDecisionService({
        configObj: configObj,
        logger: mockLogger,
      });
    });

    afterEach(function () {
      bucketer.bucket.restore();
      mockLogger.log.restore();
    });

    describe('#getVariation', function () {
      it('should return the correct variation for the given experiment key and user ID for a running experiment', function () {
        bucketerStub.returns('111128'); // ID of the 'control' variation from `test_data`
        assert.strictEqual('control', decisionServiceInstance.getVariation('testExperiment', 'decision_service_user'));
        sinon.assert.calledOnce(bucketerStub);
      });

      it('should return the whitelisted variation if the user is whitelisted', function () {
        assert.strictEqual('variationWithAudience', decisionServiceInstance.getVariation('testExperimentWithAudiences', 'user2'));
        sinon.assert.notCalled(bucketerStub);
        assert.strictEqual(2, mockLogger.log.callCount);
        assert.strictEqual(mockLogger.log.args[0][1], 'PROJECT_CONFIG: User user2 is not in the forced variation map.');
        assert.strictEqual(mockLogger.log.args[1][1], 'DECISION_SERVICE: User user2 is forced in variation variationWithAudience.');
      });

      it('should return null if the user does not meet audience conditions', function () {
        assert.isNull(decisionServiceInstance.getVariation('testExperimentWithAudiences', 'user3', {foo: 'bar'}));
        assert.strictEqual(2, mockLogger.log.callCount);
        assert.strictEqual(mockLogger.log.args[0][1], 'PROJECT_CONFIG: User user3 is not in the forced variation map.');
        assert.strictEqual(mockLogger.log.args[1][1], 'DECISION_SERVICE: User user3 does not meet conditions to be in experiment testExperimentWithAudiences.');
      });

      it('should return null if the experiment is not running', function () {
        assert.isNull(decisionServiceInstance.getVariation('testExperimentNotRunning', 'user1'));
        sinon.assert.notCalled(bucketerStub);
        assert.strictEqual(1, mockLogger.log.callCount);
        assert.strictEqual(mockLogger.log.args[0][1], 'DECISION_SERVICE: Experiment testExperimentNotRunning is not running.');
      });

      describe('when a user profile service is provided', function () {
        var userProfileServiceInstance = null;
        var userProfileLookupStub;
        var userProfileSaveStub;
        beforeEach(function () {
          userProfileServiceInstance = {
            lookup: function () {
            },
            save: function () {
            },
          };

          decisionServiceInstance = DecisionService.createDecisionService({
            configObj: configObj,
            logger: mockLogger,
            userProfileService: userProfileServiceInstance,
          });
          userProfileLookupStub = sinon.stub(userProfileServiceInstance, 'lookup');
          userProfileSaveStub = sinon.stub(userProfileServiceInstance, 'save');
          sinon.stub(decisionServiceInstance, '__getWhitelistedVariation').returns(null);
        });

        afterEach(function () {
          userProfileServiceInstance.lookup.restore();
          userProfileServiceInstance.save.restore();
          decisionServiceInstance.__getWhitelistedVariation.restore();
        });

        it('should return the previously bucketed variation', function () {
          userProfileLookupStub.returns({
            user_id: 'decision_service_user',
            experiment_bucket_map: {
              '111127': {
                'variation_id': '111128' // ID of the 'control' variation
              },
            },
          });

          assert.strictEqual('control', decisionServiceInstance.getVariation('testExperiment', 'decision_service_user'));
          sinon.assert.calledWith(userProfileLookupStub, 'decision_service_user');
          sinon.assert.notCalled(bucketerStub);
          assert.strictEqual(mockLogger.log.args[0][1], 'PROJECT_CONFIG: User decision_service_user is not in the forced variation map.');
          assert.strictEqual(mockLogger.log.args[1][1], 'DECISION_SERVICE: Returning previously activated variation \"control\" of experiment \"testExperiment\" for user \"decision_service_user\" from user profile.');
        });

        it('should bucket if there was no prevously bucketed variation', function () {
          bucketerStub.returns('111128'); // ID of the 'control' variation
          userProfileLookupStub.returns({
            user_id: 'decision_service_user',
            experiment_bucket_map: {},
          });

          assert.strictEqual('control', decisionServiceInstance.getVariation('testExperiment', 'decision_service_user'));
          sinon.assert.calledWith(userProfileLookupStub, 'decision_service_user');
          sinon.assert.calledOnce(bucketerStub);
          // make sure we save the decision
          sinon.assert.calledWith(userProfileSaveStub, {
            user_id: 'decision_service_user',
            experiment_bucket_map: {
              '111127': {
                'variation_id': '111128',
              }
            },
          });
        });

        it('should bucket if the user profile service returns null', function () {
          bucketerStub.returns('111128'); // ID of the 'control' variation
          userProfileLookupStub.returns(null);

          assert.strictEqual('control', decisionServiceInstance.getVariation('testExperiment', 'decision_service_user'));
          sinon.assert.calledWith(userProfileLookupStub, 'decision_service_user');
          sinon.assert.calledOnce(bucketerStub);
          // make sure we save the decision
          sinon.assert.calledWith(userProfileSaveStub, {
            user_id: 'decision_service_user',
            experiment_bucket_map: {
              '111127': {
                'variation_id': '111128',
              }
            },
          });
        });

        it('should re-bucket if the stored variation is no longer valid', function () {
          bucketerStub.returns('111128'); // ID of the 'control' variation
          userProfileLookupStub.returns({
            user_id: 'decision_service_user',
            experiment_bucket_map: {
              '111127': {
                'variation_id': 'not valid variation',
              },
            },
          });

          assert.strictEqual('control', decisionServiceInstance.getVariation('testExperiment', 'decision_service_user'));
          sinon.assert.calledWith(userProfileLookupStub, 'decision_service_user');
          sinon.assert.calledOnce(bucketerStub);
          assert.strictEqual(mockLogger.log.args[0][1], 'PROJECT_CONFIG: User decision_service_user is not in the forced variation map.');
          assert.strictEqual(mockLogger.log.args[1][1], 'DECISION_SERVICE: User decision_service_user was previously bucketed into variation with ID not valid variation for experiment testExperiment, but no matching variation was found.');
          // make sure we save the decision
          sinon.assert.calledWith(userProfileSaveStub, {
            user_id: 'decision_service_user',
            experiment_bucket_map: {
              '111127': {
                'variation_id': '111128',
              }
            },
          });
        });

        it('should store the bucketed variation for the user', function () {
          bucketerStub.returns('111128'); // ID of the 'control' variation
          userProfileLookupStub.returns({
            user_id: 'decision_service_user',
            experiment_bucket_map: {}, // no decisions for user
          });

          assert.strictEqual('control', decisionServiceInstance.getVariation('testExperiment', 'decision_service_user'));
          sinon.assert.calledWith(userProfileLookupStub, 'decision_service_user');
          sinon.assert.calledOnce(bucketerStub);
          sinon.assert.calledWith(userProfileServiceInstance.save, {
            user_id: 'decision_service_user',
            experiment_bucket_map: {
              '111127': {
                variation_id: '111128',
              },
            },
          });
          assert.strictEqual(mockLogger.log.args[0][1], 'PROJECT_CONFIG: User decision_service_user is not in the forced variation map.');
          assert.strictEqual(mockLogger.log.args[1][1], 'DECISION_SERVICE: Saved variation "control" of experiment "testExperiment" for user "decision_service_user".');
        });

        it('should log an error message if "lookup" throws an error', function () {
          bucketerStub.returns('111128'); // ID of the 'control' variation
          userProfileLookupStub.throws(new Error('I am an error'));

          assert.strictEqual('control', decisionServiceInstance.getVariation('testExperiment', 'decision_service_user'));
          sinon.assert.calledWith(userProfileLookupStub, 'decision_service_user');
          sinon.assert.calledOnce(bucketerStub); // should still go through with bucketing
          assert.strictEqual(mockLogger.log.args[0][1], 'PROJECT_CONFIG: User decision_service_user is not in the forced variation map.');
          assert.strictEqual(mockLogger.log.args[1][1], 'DECISION_SERVICE: Error while looking up user profile for user ID "decision_service_user": I am an error.');
        });

        it('should log an error message if "save" throws an error', function () {
          bucketerStub.returns('111128'); // ID of the 'control' variation
          userProfileLookupStub.returns(null);
          userProfileSaveStub.throws(new Error('I am an error'));

          assert.strictEqual('control', decisionServiceInstance.getVariation('testExperiment', 'decision_service_user'));
          sinon.assert.calledWith(userProfileLookupStub, 'decision_service_user');
          sinon.assert.calledOnce(bucketerStub); // should still go through with bucketing
          assert.strictEqual(mockLogger.log.args[0][1], 'PROJECT_CONFIG: User decision_service_user is not in the forced variation map.');
          assert.strictEqual(mockLogger.log.args[1][1], 'DECISION_SERVICE: Error while saving user profile for user ID "decision_service_user": I am an error.');

          // make sure that we save the decision
          sinon.assert.calledWith(userProfileSaveStub, {
            user_id: 'decision_service_user',
            experiment_bucket_map: {
              '111127': {
                'variation_id': '111128',
              }
            },
          });
        });
      });
    });

    describe('__buildBucketerParams', function () {
      it('should return params object with correct properties', function () {
        var bucketerParams = decisionServiceInstance.__buildBucketerParams('testExperiment', 'testUser', 'testUser');

        var expectedParams = {
          bucketingId: 'testUser',
          experimentKey: 'testExperiment',
          userId: 'testUser',
          experimentId: '111127',
          trafficAllocationConfig: [
            {
              entityId: '111128',
              endOfRange: 4000,
            },
            {
              entityId: '111129',
              endOfRange: 9000,
            },
          ],
          variationIdMap: configObj.variationIdMap,
          logger: mockLogger,
          experimentKeyMap: configObj.experimentKeyMap,
          groupIdMap: configObj.groupIdMap,
        };

        assert.deepEqual(bucketerParams, expectedParams);

        sinon.assert.notCalled(mockLogger.log);
      });
    });

    describe('__checkIfExperimentIsActive', function () {
      it('should return true if experiment is running', function () {
        assert.isTrue(decisionServiceInstance.__checkIfExperimentIsActive('testExperiment', 'testUser'));
        sinon.assert.notCalled(mockLogger.log);
      });

      it('should return false when experiment is not running', function () {
        assert.isFalse(decisionServiceInstance.__checkIfExperimentIsActive('testExperimentNotRunning', 'testUser'));
        sinon.assert.calledOnce(mockLogger.log);
        var logMessage = mockLogger.log.args[0][1];
        assert.strictEqual(logMessage, sprintf(LOG_MESSAGES.EXPERIMENT_NOT_RUNNING, 'DECISION_SERVICE', 'testExperimentNotRunning'));
      });
    });

    describe('__checkIfUserIsInAudience', function () {
      it('should return true when audience conditions are met', function () {
        assert.isTrue(decisionServiceInstance.__checkIfUserIsInAudience('testExperimentWithAudiences', 'testUser', {browser_type: 'firefox'}));
        sinon.assert.notCalled(mockLogger.log);
      });

      it('should return true when experiment has no audience', function () {
        assert.isTrue(decisionServiceInstance.__checkIfUserIsInAudience('testExperiment', 'testUser'));
        sinon.assert.notCalled(mockLogger.log);
      });

      it('should return false when audience conditions are not met', function () {
        assert.isFalse(decisionServiceInstance.__checkIfUserIsInAudience('testExperimentWithAudiences', 'testUser', {browser_type: 'chrome'}));
        sinon.assert.calledOnce(mockLogger.log);
      });
    });

    describe('__getWhitelistedVariation', function () {
      it('should return forced variation ID if forced variation is provided for the user ID', function () {
        var testExperiment = configObj.experimentKeyMap['testExperiment'];
        var expectedVariation = configObj.variationIdMap['111128'];
        assert.strictEqual(decisionServiceInstance.__getWhitelistedVariation(testExperiment, 'user1'), expectedVariation);
      });

      it('should return null if forced variation is not provided for the user ID', function () {
        var testExperiment = configObj.experimentKeyMap['testExperiment'];
        assert.isNull(decisionServiceInstance.__getWhitelistedVariation(testExperiment, 'notInForcedVariations'));
      });
    });
  });

  describe('when a bucketingID is provided', function() {
    var configObj = projectConfig.createProjectConfig(testData);
    var createdLogger = logger.createLogger({logLevel: LOG_LEVEL.DEBUG});
    var optlyInstance;
    beforeEach(function () {
      optlyInstance = new Optimizely({
        clientEngine: 'node-sdk',
        datafile: testData,
        jsonSchemaValidator: jsonSchemaValidator,
        isValidInstance: true,
        logger: createdLogger,
        eventBuilder: eventBuilder,
        eventDispatcher: eventDispatcher,
        errorHandler: errorHandler,
      });

      sinon.stub(eventDispatcher, 'dispatchEvent');
      sinon.stub(errorHandler, 'handleError');
      sinon.stub(createdLogger, 'log');
    });

    afterEach(function () {
      eventDispatcher.dispatchEvent.restore();
      errorHandler.handleError.restore();
      createdLogger.log.restore();
    });

    var testUserAttributes = {
      'browser_type': 'firefox',
    };
    var userAttributesWithBucketingId = {
      'browser_type': 'firefox',
      '$opt_bucketing_id': '123456789'
    };
    var invalidUserAttributesWithBucketingId = {
      'browser_type': 'safari',
      '$opt_bucketing_id': 'testBucketingIdControl!'
    };

    it('confirm normal bucketing occurs before setting bucketingId', function () {
      assert.strictEqual('variation', optlyInstance.getVariation(
        'testExperiment',
        'test_user',
        testUserAttributes));
    });

    it('confirm valid bucketing with bucketing ID set in attributes', function () {
      assert.strictEqual('variationWithAudience', optlyInstance.getVariation(
          'testExperimentWithAudiences',
          'test_user',
          userAttributesWithBucketingId
      ));
    });

    it('check invalid audience with bucketingId', function () {
      assert.strictEqual(null, optlyInstance.getVariation(
          'testExperimentWithAudiences',
          'test_user',
          invalidUserAttributesWithBucketingId
      ));
    });

    it('test that an experiment that is not running returns a null variation', function () {
      assert.strictEqual(null, optlyInstance.getVariation(
          'testExperimentNotRunning',
          'test_user',
          userAttributesWithBucketingId
      ));
    });

    it('test that an invalid experiment key gets a null variation', function () {
      assert.strictEqual(null, optlyInstance.getVariation(
          'invalidExperiment',
          'test_user',
          userAttributesWithBucketingId
      ));
    });

    it('check forced variation', function () {
      assert.isTrue(optlyInstance.setForcedVariation(
          'testExperiment',
          'test_user',
          'control'),
          sprintf('Set variation to "%s" failed', 'control')
      );
      assert.strictEqual('control', optlyInstance.getVariation(
          'testExperiment',
          'test_user',
          userAttributesWithBucketingId
      ));
    });

    it('check whitelisted variation', function () {
      assert.strictEqual('control', optlyInstance.getVariation(
          'testExperiment',
          'user1',
          userAttributesWithBucketingId
      ));
    });

    it('check user profile', function () {
      var userProfileLookupStub;
      var userProfileServiceInstance = {
        lookup: function () {
        },
      };
      userProfileLookupStub = sinon.stub(userProfileServiceInstance, 'lookup');
      userProfileLookupStub.returns({
        user_id: 'test_user',
        experiment_bucket_map: {
          '111127': {
            'variation_id': '111128' // ID of the 'control' variation
          },
        },
      });

      var decisionServiceInstance = DecisionService.createDecisionService({
        configObj: configObj,
        logger: createdLogger,
        userProfileService: userProfileServiceInstance,
      });

      assert.strictEqual('control', decisionServiceInstance.getVariation(
          'testExperiment',
          'test_user',
          userAttributesWithBucketingId
      ));
    });
  });

  describe('feature management', function() {
    describe('#getVariationForFeature', function() {
      var configObj;
      var decisionServiceInstance;
      var sandbox;
      var mockLogger = logger.createLogger({logLevel: LOG_LEVEL.INFO});
      beforeEach(function() {
        configObj = projectConfig.createProjectConfig(testDataWithFeatures);
        sandbox = sinon.sandbox.create();
        sandbox.stub(mockLogger, 'log');
        decisionServiceInstance = DecisionService.createDecisionService({
          configObj: configObj,
          logger: mockLogger,
        });
      });

      afterEach(function() {
        sandbox.restore();
      });

      describe('feature attached to an experiment, and not attached to a rollout', function() {
        var feature;
        beforeEach(function() {
          feature = configObj.featureKeyMap.test_feature_for_experiment;
        });

        describe('user bucketed into this experiment', function() {
          var getVariationStub;
          beforeEach(function() {
            getVariationStub = sandbox.stub(decisionServiceInstance, 'getVariation');
            getVariationStub.returns(null);
            getVariationStub.withArgs('testing_my_feature', 'user1').returns('variation');
          });

          it('returns a decision with a variation in the experiment the feature is attached to', function() {
            var decision = decisionServiceInstance.getVariationForFeature(feature, 'user1', {
              test_attribute: 'test_value',
            });
            var expectedDecision = {
              experiment: {
                'forcedVariations': {},
                'status': 'Running',
                'key': 'testing_my_feature',
                'id': '594098',
                'variations': [
                  {
                    'id': '594096',
                    'variables': [
                      {
                        'id': '4792309476491264',
                        'value': '2'
                      },
                      {
                        'id': '5073784453201920',
                        'value': 'true'
                      },
                      {
                        'id': '5636734406623232',
                        'value': 'Buy me NOW'
                      },
                      {
                        'id': '6199684360044544',
                        'value': '20.25'
                      }
                    ],
                    'featureEnabled': true,
                    'key': 'variation'
                  },
                  {
                    'id': '594097',
                    'variables': [
                      {
                        'id': '4792309476491264',
                        'value': '10'
                      },
                      {
                        'id': '5073784453201920',
                        'value': 'false'
                      },
                      {
                        'id': '5636734406623232',
                        'value': 'Buy me'
                      },
                      {
                        'id': '6199684360044544',
                        'value': '50.55'
                      }
                    ],
                    'featureEnabled': true,
                    'key': 'control'
                  }
                ],
                'audienceIds': [],
                'trafficAllocation': [
                  { 'endOfRange': 5000, 'entityId': '594096' },
                  { 'endOfRange': 10000, 'entityId': '594097' }
                ],
                'layerId': '594093',
                variationKeyMap: {
                  control: {
                    'id': '594097',
                    'variables': [
                      {
                        'id': '4792309476491264',
                        'value': '10'
                      },
                      {
                        'id': '5073784453201920',
                        'value': 'false'
                      },
                      {
                        'id': '5636734406623232',
                        'value': 'Buy me'
                      },
                      {
                        'id': '6199684360044544',
                        'value': '50.55'
                      }
                    ],
                    'featureEnabled': true,
                    'key': 'control'
                  },
                  variation: {
                    'id': '594096',
                    'variables': [
                      {
                        'id': '4792309476491264',
                        'value': '2'
                      },
                      {
                        'id': '5073784453201920',
                        'value': 'true'
                      },
                      {
                        'id': '5636734406623232',
                        'value': 'Buy me NOW'
                      },
                      {
                        'id': '6199684360044544',
                        'value': '20.25'
                      }
                    ],
                    'featureEnabled': true,
                    'key': 'variation'
                  },
                },
              },
              variation: {
                'id': '594096',
                'variables': [
                  {
                    'id': '4792309476491264',
                    'value': '2'
                  },
                  {
                    'id': '5073784453201920',
                    'value': 'true'
                  },
                  {
                    'id': '5636734406623232',
                    'value': 'Buy me NOW'
                  },
                  {
                    'id': '6199684360044544',
                    'value': '20.25'
                  }
                ],
                'featureEnabled': true,
                'key': 'variation'
              },
              decisionSource: DECISION_SOURCES.EXPERIMENT,
            };
            assert.deepEqual(decision, expectedDecision);
            sinon.assert.calledWithExactly(mockLogger.log, LOG_LEVEL.DEBUG, 'DECISION_SERVICE: User user1 is in variation variation of experiment testing_my_feature on the feature test_feature_for_experiment.');
            sinon.assert.calledWithExactly(getVariationStub, 'testing_my_feature', 'user1', {
              test_attribute: 'test_value',
            });
          });
        });

        describe('user not bucketed into this experiment', function() {
          var getVariationStub;
          beforeEach(function() {
            getVariationStub = sandbox.stub(decisionServiceInstance, 'getVariation');
            getVariationStub.returns(null);
          });

          it('returns a decision with no variation', function() {
            var decision = decisionServiceInstance.getVariationForFeature(feature, 'user1');
            var expectedDecision = {
              experiment: null,
              variation: null,
              decisionSource: null,
            };
            assert.deepEqual(decision, expectedDecision);
            sinon.assert.calledWithExactly(mockLogger.log, LOG_LEVEL.DEBUG, 'DECISION_SERVICE: User user1 is not in any experiment on the feature test_feature_for_experiment.');
          });
        });
      });

      describe('feature attached to an experiment in a group, and not attached to a rollout', function() {
        var feature;
        beforeEach(function() {
          feature = configObj.featureKeyMap.feature_with_group;
        });

        describe('user bucketed into an experiment in the group', function() {
          var getVariationStub;
          beforeEach(function() {
            getVariationStub = sandbox.stub(decisionServiceInstance, 'getVariation');
            getVariationStub.returns(null);
            getVariationStub.withArgs('exp_with_group', 'user1').returns('var');
          });

          it('returns a decision with a variation in an experiment in a group', function() {
            var decision = decisionServiceInstance.getVariationForFeature(feature, 'user1');
            var expectedDecision = {
              experiment: {
                'forcedVariations': {},
                'status': 'Running',
                'key': 'exp_with_group',
                'id': '595010',
                'variations': [{ 'id': '595008', 'variables': [], 'key': 'var' }, { 'id': '595009', 'variables': [], 'key': 'con' }],
                'audienceIds': [],
                'trafficAllocation': [{ 'endOfRange': 5000, 'entityId': '595008' }, { 'endOfRange': 10000, 'entityId': '595009' }],
                'layerId': '595005',
                groupId: '595024',
                variationKeyMap: {
                  con: {
                    'id': '595009',
                    'variables': [],
                    'key': 'con',
                  },
                  var: {
                    'id': '595008',
                    'variables': [],
                    'key': 'var',
                  },
                },
              },
              variation: {
                'id': '595008',
                'variables': [],
                'key': 'var',
              },
              decisionSource: DECISION_SOURCES.EXPERIMENT,
            };
            assert.deepEqual(decision, expectedDecision);
            sinon.assert.calledWithExactly(mockLogger.log, LOG_LEVEL.DEBUG, 'DECISION_SERVICE: User user1 is in variation var of experiment exp_with_group on the feature feature_with_group.');
          });
        });

        describe('user not bucketed into an experiment in the group', function() {
          var getVariationStub;
          beforeEach(function() {
            getVariationStub = sandbox.stub(decisionServiceInstance, 'getVariation');
            getVariationStub.returns(null);
          });

          it('returns a decision with no experiment and no variation', function() {
            var decision = decisionServiceInstance.getVariationForFeature(feature, 'user1');
            var expectedDecision = {
              experiment: null,
              variation: null,
              decisionSource: null,
            };
            assert.deepEqual(decision, expectedDecision);
            sinon.assert.calledWithExactly(mockLogger.log, LOG_LEVEL.DEBUG, 'DECISION_SERVICE: User user1 is not in any experiment on the feature feature_with_group.');
          });
        });

        describe('user not bucketed into the group', function() {
          var bucketUserIntoExperimentStub;
          beforeEach(function() {
            bucketUserIntoExperimentStub = sandbox.stub(bucketer, 'bucketUserIntoExperiment');
            bucketUserIntoExperimentStub.returns(null);
          });

          it('returns a decision with no experiment and no variation', function() {
            var decision = decisionServiceInstance.getVariationForFeature(feature, 'user1');
            var expectedDecision = {
              experiment: null,
              variation: null,
              decisionSource: null,
            };
            assert.deepEqual(decision, expectedDecision);
            sinon.assert.calledWithExactly(mockLogger.log, LOG_LEVEL.DEBUG, 'DECISION_SERVICE: User user1 is not in any experiment on the feature feature_with_group.');
          });
        });
      });

      describe('feature attached to a rollout', function() {
        var feature;
        var bucketStub;
        beforeEach(function() {
          feature = configObj.featureKeyMap.test_feature;
          bucketStub = sandbox.stub(bucketer, 'bucket');
        });

        describe('user bucketed into an audience targeting rule', function() {
          beforeEach(function() {
            bucketStub.returns('594032'); // ID of variation in rollout experiment - audience targeting rule for 'test_audience'
          });

          it('returns a decision with a variation and experiment from the audience targeting rule', function() {
            var attributes = { test_attribute: 'test_value' };
            var decision = decisionServiceInstance.getVariationForFeature(feature, 'user1', attributes);
            var expectedDecision = {
              experiment: {
                'forcedVariations': {},
                'status': 'Not started',
                'key': '594031',
                'id': '594031',
                'variations': [{
                  'id': '594032',
                  'variables': [
                    {
                      'id': '4919852825313280',
                      'value': 'true'
                    },
                    {
                      'id': '5482802778734592',
                      'value': '395'
                    },
                    {
                      'id': '6045752732155904',
                      'value': '4.99'
                    },
                    {
                      'id': '6327227708866560',
                      'value': 'Hello audience'
                    }
                  ],
                  'featureEnabled': true,
                  'key': '594032'
                }],
                variationKeyMap: {
                  594032: {
                    'id': '594032',
                    'variables': [
                      {
                        'id': '4919852825313280',
                        'value': 'true'
                      },
                      {
                        'id': '5482802778734592',
                        'value': '395'
                      },
                      {
                        'id': '6045752732155904',
                        'value': '4.99'
                      },
                      {
                        'id': '6327227708866560',
                        'value': 'Hello audience'
                      }
                    ],
                    'featureEnabled': true,
                    'key': '594032'
                  },
                },
                'audienceIds': ['594017'],
                'trafficAllocation': [{ 'endOfRange': 5000, 'entityId': '594032' }],
                'layerId': '594030'
              },
              variation: {
                'id': '594032',
                'variables': [
                  {
                    'id': '4919852825313280',
                    'value': 'true'
                  },
                  {
                    'id': '5482802778734592',
                    'value': '395'
                  },
                  {
                    'id': '6045752732155904',
                    'value': '4.99'
                  },
                  {
                    'id': '6327227708866560',
                    'value': 'Hello audience'
                  }
                ],
                'featureEnabled': true,
                'key': '594032'
              },
              decisionSource: DECISION_SOURCES.ROLLOUT,
            };
            assert.deepEqual(decision, expectedDecision);
            sinon.assert.calledWithExactly(mockLogger.log, LOG_LEVEL.DEBUG, 'DECISION_SERVICE: User user1 meets conditions for targeting rule 1.');
            sinon.assert.calledWithExactly(mockLogger.log, LOG_LEVEL.DEBUG, 'DECISION_SERVICE: User user1 bucketed into targeting rule 1.');
            sinon.assert.calledWithExactly(mockLogger.log, LOG_LEVEL.DEBUG, 'DECISION_SERVICE: User user1 is in rollout of feature test_feature.');
          });
        });

        describe('user bucketed into everyone else targeting rule', function() {
          beforeEach(function() {
            bucketStub.returns('594038'); // ID of variation in rollout experiment - everyone else targeting rule
          });

          it('returns a decision with a variation and experiment from the everyone else targeting rule', function() {
            var attributes = {};
            var decision = decisionServiceInstance.getVariationForFeature(feature, 'user1', attributes);
            var expectedDecision = {
              experiment: {
                'forcedVariations': {},
                'status': 'Not started',
                'key': '594037',
                'id': '594037',
                'variations': [{
                  'id': '594038',
                  'variables': [
                    {
                      'id': '4919852825313280',
                      'value': 'false'
                    },
                    {
                      'id': '5482802778734592',
                      'value': '400'
                    },
                    {
                      'id': '6045752732155904',
                      'value': '14.99'
                    },
                    {
                      'id': '6327227708866560',
                      'value': 'Hello'
                    }
                  ],
                  'featureEnabled': false,
                  'key': '594038'
                }],
                'audienceIds': [],
                'trafficAllocation': [{ 'endOfRange': 0, 'entityId': '594038' }],
                'layerId': '594030',
                variationKeyMap: {
                  594038: {
                    'id': '594038',
                    'variables': [
                      {
                        'id': '4919852825313280',
                        'value': 'false'
                      },
                      {
                        'id': '5482802778734592',
                        'value': '400'
                      },
                      {
                        'id': '6045752732155904',
                        'value': '14.99'
                      },
                      {
                        'id': '6327227708866560',
                        'value': 'Hello'
                      }
                    ],
                    'featureEnabled': false,
                    'key': '594038'
                  },
                },
              },
              variation: {
                'id': '594038',
                'variables': [
                  {
                    'id': '4919852825313280',
                    'value': 'false'
                  },
                  {
                    'id': '5482802778734592',
                    'value': '400'
                  },
                  {
                    'id': '6045752732155904',
                    'value': '14.99'
                  },
                  {
                    'id': '6327227708866560',
                    'value': 'Hello'
                  }
                ],
                'featureEnabled': false,
                'key': '594038'
              },
              decisionSource: DECISION_SOURCES.ROLLOUT,
            };
            assert.deepEqual(decision, expectedDecision);
            sinon.assert.calledWithExactly(mockLogger.log, LOG_LEVEL.DEBUG, 'DECISION_SERVICE: User user1 does not meet conditions for targeting rule 1.');
            sinon.assert.calledWithExactly(mockLogger.log, LOG_LEVEL.DEBUG, 'DECISION_SERVICE: User user1 bucketed into everyone targeting rule.');
            sinon.assert.calledWithExactly(mockLogger.log, LOG_LEVEL.DEBUG, 'DECISION_SERVICE: User user1 is in rollout of feature test_feature.');
          });
        });

        describe('user not bucketed into audience targeting rule or everyone else rule', function() {
          beforeEach(function() {
            bucketStub.returns(null);
          });

          it('returns a decision with no variation and no experiment', function() {
            var decision = decisionServiceInstance.getVariationForFeature(feature, 'user1');
            var expectedDecision = {
              experiment: null,
              variation: null,
              decisionSource: null,
            };
            assert.deepEqual(decision, expectedDecision);
            sinon.assert.calledWithExactly(mockLogger.log, LOG_LEVEL.DEBUG, 'DECISION_SERVICE: User user1 does not meet conditions for targeting rule 1.');
            sinon.assert.calledWithExactly(mockLogger.log, LOG_LEVEL.DEBUG, 'DECISION_SERVICE: User user1 is not in rollout of feature test_feature.');
          });
        });

        describe('user excluded from audience targeting rule due to traffic allocation, and bucketed into everyone else', function() {
          beforeEach(function() {
            bucketStub.returns(null); // returns no variation for other calls
            bucketStub.withArgs(sinon.match({
              experimentKey: '594037',
            })).returns('594038'); // returns variation from everyone else targeitng rule when called with everyone else experiment key;
          });

          it('returns a decision with a variation and experiment from the everyone else targeting rule', function() {
            var attributes = { test_attribute: 'test_value' };
            var decision = decisionServiceInstance.getVariationForFeature(feature, 'user1', attributes);
            var expectedDecision = {
              experiment: {
                'forcedVariations': {},
                'status': 'Not started',
                'key': '594037',
                'id': '594037',
                'variations': [{
                  'id': '594038',
                  'variables': [
                    {
                      'id': '4919852825313280',
                      'value': 'false'
                    },
                    {
                      'id': '5482802778734592',
                      'value': '400'
                    },
                    {
                      'id': '6045752732155904',
                      'value': '14.99'
                    },
                    {
                      'id': '6327227708866560',
                      'value': 'Hello'
                    }
                  ],
                  'featureEnabled': false,
                  'key': '594038'
                }],
                'audienceIds': [],
                'trafficAllocation': [{ 'endOfRange': 0, 'entityId': '594038' }],
                'layerId': '594030',
                variationKeyMap: {
                  594038: {
                    'id': '594038',
                    'variables': [
                      {
                        'id': '4919852825313280',
                        'value': 'false'
                      },
                      {
                        'id': '5482802778734592',
                        'value': '400'
                      },
                      {
                        'id': '6045752732155904',
                        'value': '14.99'
                      },
                      {
                        'id': '6327227708866560',
                        'value': 'Hello'
                      }
                    ],
                    'featureEnabled': false,
                    'key': '594038'
                  },
                },
              },
              variation: {
                'id': '594038',
                'variables': [
                  {
                    'id': '4919852825313280',
                    'value': 'false'
                  },
                  {
                    'id': '5482802778734592',
                    'value': '400'
                  },
                  {
                    'id': '6045752732155904',
                    'value': '14.99'
                  },
                  {
                    'id': '6327227708866560',
                    'value': 'Hello'
                  }
                ],
                'featureEnabled': false,
                'key': '594038'
              },
              decisionSource: DECISION_SOURCES.ROLLOUT,
            };
            assert.deepEqual(decision, expectedDecision);
            sinon.assert.calledWithExactly(mockLogger.log, LOG_LEVEL.DEBUG, 'DECISION_SERVICE: User user1 meets conditions for targeting rule 1.');
            sinon.assert.calledWithExactly(mockLogger.log, LOG_LEVEL.DEBUG, 'DECISION_SERVICE User user1 not bucketed into targeting rule 1 due to traffic allocation. Trying everyone rule.');
            sinon.assert.calledWithExactly(mockLogger.log, LOG_LEVEL.DEBUG, 'DECISION_SERVICE: User user1 bucketed into everyone targeting rule.');
          });
        });
      });

      describe('feature attached to both an experiment and a rollout', function() {
        var feature;
        var getVariationStub;
        var bucketStub;
        beforeEach(function() {
          feature = configObj.featureKeyMap.shared_feature;
          getVariationStub = sandbox.stub(decisionServiceInstance, 'getVariation');
          getVariationStub.returns(null); // No variation returned by getVariation
          bucketStub = sandbox.stub(bucketer, 'bucket');
          bucketStub.returns('599057'); // Id of variation in rollout of shared feature
        });

        it('can bucket a user into the rollout when the user is not bucketed into the experiment', function() {
          // No attributes passed, so user is not in the audience for the experiment
          // It should fall through to the rollout
          var decision = decisionServiceInstance.getVariationForFeature(feature, 'user1');
          var expectedDecision = {
            experiment: {
              'trafficAllocation': [
                {
                  'endOfRange': 10000,
                  'entityId': '599057'
                }
              ],
              'layerId': '599055',
              'forcedVariations': {},
              'audienceIds': [],
              'variations': [
                {
                  'key': '599057',
                  'id': '599057',
                  'featureEnabled': true,
                  'variables': [
                    {
                      'id': '4937719889264640',
                      'value': '200'
                    },
                    {
                      'id': '6345094772817920',
                      'value': 'i\'m a rollout'
                    }
                  ]
                }
              ],
              'status': 'Not started',
              'key': '599056',
              'id': '599056',
              variationKeyMap: {
                599057: {
                  'key': '599057',
                  'id': '599057',
                  'featureEnabled': true,
                  'variables': [
                    {
                      'id': '4937719889264640',
                      'value': '200'
                    },
                    {
                      'id': '6345094772817920',
                      'value': 'i\'m a rollout'
                    }
                  ]
                }
              }
            },
            variation: {
              'key': '599057',
              'id': '599057',
              'featureEnabled': true,
              'variables': [
                {
                  'id': '4937719889264640',
                  'value': '200'
                },
                {
                  'id': '6345094772817920',
                  'value': 'i\'m a rollout'
                }
              ]
            },
            decisionSource: DECISION_SOURCES.ROLLOUT,
          };
          assert.deepEqual(decision, expectedDecision);
          sinon.assert.calledWithExactly(mockLogger.log, LOG_LEVEL.DEBUG, 'DECISION_SERVICE: User user1 is not in any experiment on the feature shared_feature.');
          sinon.assert.calledWithExactly(mockLogger.log, LOG_LEVEL.DEBUG, 'DECISION_SERVICE: User user1 bucketed into everyone targeting rule.');
          sinon.assert.calledWithExactly(mockLogger.log, LOG_LEVEL.DEBUG, 'DECISION_SERVICE: User user1 is in rollout of feature shared_feature.');
        });
      });

      describe('feature not attached to an experiment or a rollout', function() {
        var feature;
        beforeEach(function() {
          feature = configObj.featureKeyMap.unused_flag;
        });

        it('returns a decision with no variation and no experiment', function() {
          var decision = decisionServiceInstance.getVariationForFeature(feature, 'user1');
          var expectedDecision = {
            experiment: null,
            variation: null,
            decisionSource: null,
          };
          var expectedDecision = assert.deepEqual(decision, expectedDecision);
          sinon.assert.calledWithExactly(mockLogger.log, LOG_LEVEL.DEBUG, 'DECISION_SERVICE: Feature unused_flag is not attached to any experiments.');
          sinon.assert.calledWithExactly(mockLogger.log, LOG_LEVEL.DEBUG, 'DECISION_SERVICE: User user1 is not in any experiment on the feature unused_flag.');
          sinon.assert.calledWithExactly(mockLogger.log, LOG_LEVEL.DEBUG, 'DECISION_SERVICE: There is no rollout of feature unused_flag.');
        });
      });
    });
  });
});
