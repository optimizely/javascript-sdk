/****************************************************************************
 * Copyright 2017-2021 Optimizely, Inc. and contributors                    *
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
import sinon from 'sinon';
import { assert } from 'chai';
import cloneDeep from 'lodash/cloneDeep';
import { sprintf } from '@optimizely/js-sdk-utils';
import { createDecisionService } from './';
import * as bucketer from '../bucketer';
import {
  LOG_LEVEL,
  DECISION_SOURCES,
} from '../../utils/enums';
import { createLogger } from '../../plugins/logger';
import Optimizely from '../../optimizely';
import projectConfig from '../project_config';
import AudienceEvaluator from '../audience_evaluator';
import errorHandler from '../../plugins/error_handler';
import eventDispatcher from '../../plugins/event_dispatcher/index.node';
import * as jsonSchemaValidator from '../../utils/json_schema_validator';
import {
  getTestProjectConfig,
  getTestProjectConfigWithFeatures,
} from '../../tests/test_data';

var testData = getTestProjectConfig();
var testDataWithFeatures = getTestProjectConfigWithFeatures();

describe('lib/core/decision_service', function() {
  describe('APIs', function() {
    var configObj = projectConfig.createProjectConfig(cloneDeep(testData));
    var decisionServiceInstance;
    var mockLogger = createLogger({ logLevel: LOG_LEVEL.INFO });
    var bucketerStub;
    var experiment;

    beforeEach(function() {
      bucketerStub = sinon.stub(bucketer, 'bucket');
      sinon.stub(mockLogger, 'log');
      decisionServiceInstance = createDecisionService({
        logger: mockLogger,
      });
    });

    afterEach(function() {
      bucketer.bucket.restore();
      mockLogger.log.restore();
    });

    describe('#getVariation', function() {
      it('should return the correct variation for the given experiment key and user ID for a running experiment', function() {
        var fakeDecisionResponse = {
          result: '111128',
          reasons: [],
        };
        experiment = configObj.experimentIdMap['111127'];
        bucketerStub.returns(fakeDecisionResponse); // contains variation ID of the 'control' variation from `test_data`
        assert.strictEqual(
          'control',
          decisionServiceInstance.getVariation(configObj, experiment, 'decision_service_user').result
        );
        sinon.assert.calledOnce(bucketerStub);
      });

      it('should return the whitelisted variation if the user is whitelisted', function() {
        experiment = configObj.experimentIdMap['122227'];
        assert.strictEqual(
          'variationWithAudience',
          decisionServiceInstance.getVariation(configObj, experiment, 'user2').result
        );
        sinon.assert.notCalled(bucketerStub);
        assert.strictEqual(2, mockLogger.log.callCount);
        assert.strictEqual(
          mockLogger.log.args[0][1],
          'DECISION_SERVICE: User user2 is not in the forced variation map.'
        );
        assert.strictEqual(
          mockLogger.log.args[1][1],
          'DECISION_SERVICE: User user2 is forced in variation variationWithAudience.'
        );
      });

      it('should return null if the user does not meet audience conditions', function() {
        experiment = configObj.experimentIdMap['122227'];
        assert.isNull(
          decisionServiceInstance.getVariation(configObj, experiment, 'user3', { foo: 'bar' }).result
        );
        assert.strictEqual(4, mockLogger.log.callCount);
        assert.strictEqual(
          mockLogger.log.args[0][1],
          'DECISION_SERVICE: User user3 is not in the forced variation map.'
        );
        assert.strictEqual(
          mockLogger.log.args[1][1],
          'DECISION_SERVICE: Evaluating audiences for experiment "testExperimentWithAudiences": ["11154"].'
        );
        assert.strictEqual(
          mockLogger.log.args[2][1],
          'DECISION_SERVICE: Audiences for experiment testExperimentWithAudiences collectively evaluated to FALSE.'
        );
        assert.strictEqual(
          mockLogger.log.args[3][1],
          'DECISION_SERVICE: User user3 does not meet conditions to be in experiment testExperimentWithAudiences.'
        );
      });

      it('should return null if the experiment is not running', function() {
        experiment = configObj.experimentIdMap['133337'];
        assert.isNull(decisionServiceInstance.getVariation(configObj, experiment, 'user1').result);
        sinon.assert.notCalled(bucketerStub);
        assert.strictEqual(1, mockLogger.log.callCount);
        assert.strictEqual(
          mockLogger.log.args[0][1],
          'DECISION_SERVICE: Experiment testExperimentNotRunning is not running.'
        );
      });

      describe('when attributes.$opt_experiment_bucket_map is supplied', function() {
        it('should respect the sticky bucketing information for attributes', function() {
          var fakeDecisionResponse = {
            result: '111128',
            reasons: [],
          };
          experiment = configObj.experimentIdMap['111127'];
          bucketerStub.returns(fakeDecisionResponse); // ID of the 'control' variation from `test_data`
          var attributes = {
            $opt_experiment_bucket_map: {
              '111127': {
                variation_id: '111129', // ID of the 'variation' variation
              },
            },
          };

          assert.strictEqual(
            'variation',
            decisionServiceInstance.getVariation(configObj, experiment, 'decision_service_user', attributes).result
          );
          sinon.assert.notCalled(bucketerStub);
        });
      });

      describe('when a user profile service is provided', function() {
        var fakeDecisionResponse = {
          result: '111128',
          reasons: [],
        };
        var userProfileServiceInstance = null;
        var userProfileLookupStub;
        var userProfileSaveStub;
        var fakeDecisionWhitelistedVariation = {
          result: null,
          reasons: [],
        }
        beforeEach(function() {
          userProfileServiceInstance = {
            lookup: function() {},
            save: function() {},
          };

          decisionServiceInstance = createDecisionService({
            logger: mockLogger,
            userProfileService: userProfileServiceInstance,
          });
          userProfileLookupStub = sinon.stub(userProfileServiceInstance, 'lookup');
          userProfileSaveStub = sinon.stub(userProfileServiceInstance, 'save');
          sinon.stub(decisionServiceInstance, 'getWhitelistedVariation').returns(fakeDecisionWhitelistedVariation);
        });

        afterEach(function() {
          userProfileServiceInstance.lookup.restore();
          userProfileServiceInstance.save.restore();
          decisionServiceInstance.getWhitelistedVariation.restore();
        });

        it('should return the previously bucketed variation', function() {
          userProfileLookupStub.returns({
            user_id: 'decision_service_user',
            experiment_bucket_map: {
              '111127': {
                variation_id: '111128', // ID of the 'control' variation
              },
            },
          });
          experiment = configObj.experimentIdMap['111127'];

          assert.strictEqual(
            'control',
            decisionServiceInstance.getVariation(configObj, experiment, 'decision_service_user').result
          );
          sinon.assert.calledWith(userProfileLookupStub, 'decision_service_user');
          sinon.assert.notCalled(bucketerStub);
          assert.strictEqual(
            mockLogger.log.args[0][1],
            'DECISION_SERVICE: User decision_service_user is not in the forced variation map.'
          );
          assert.strictEqual(
            mockLogger.log.args[1][1],
            'DECISION_SERVICE: Returning previously activated variation "control" of experiment "testExperiment" for user "decision_service_user" from user profile.'
          );
        });

        it('should bucket if there was no prevously bucketed variation', function() {
          bucketerStub.returns(fakeDecisionResponse); // ID of the 'control' variation
          userProfileLookupStub.returns({
            user_id: 'decision_service_user',
            experiment_bucket_map: {},
          });
          experiment = configObj.experimentIdMap['111127'];

          assert.strictEqual(
            'control',
            decisionServiceInstance.getVariation(configObj, experiment, 'decision_service_user').result
          );
          sinon.assert.calledWith(userProfileLookupStub, 'decision_service_user');
          sinon.assert.calledOnce(bucketerStub);
          // make sure we save the decision
          sinon.assert.calledWith(userProfileSaveStub, {
            user_id: 'decision_service_user',
            experiment_bucket_map: {
              '111127': {
                variation_id: '111128',
              },
            },
          });
        });

        it('should bucket if the user profile service returns null', function() {
          bucketerStub.returns(fakeDecisionResponse); // ID of the 'control' variation
          userProfileLookupStub.returns(null);
          experiment = configObj.experimentIdMap['111127'];

          assert.strictEqual(
            'control',
            decisionServiceInstance.getVariation(configObj, experiment, 'decision_service_user').result
          );
          sinon.assert.calledWith(userProfileLookupStub, 'decision_service_user');
          sinon.assert.calledOnce(bucketerStub);
          // make sure we save the decision
          sinon.assert.calledWith(userProfileSaveStub, {
            user_id: 'decision_service_user',
            experiment_bucket_map: {
              '111127': {
                variation_id: '111128',
              },
            },
          });
        });

        it('should re-bucket if the stored variation is no longer valid', function() {
          bucketerStub.returns(fakeDecisionResponse); // ID of the 'control' variation
          userProfileLookupStub.returns({
            user_id: 'decision_service_user',
            experiment_bucket_map: {
              '111127': {
                variation_id: 'not valid variation',
              },
            },
          });
          experiment = configObj.experimentIdMap['111127'];

          assert.strictEqual(
            'control',
            decisionServiceInstance.getVariation(configObj, experiment, 'decision_service_user').result
          );
          sinon.assert.calledWith(userProfileLookupStub, 'decision_service_user');
          sinon.assert.calledOnce(bucketerStub);
          assert.strictEqual(
            mockLogger.log.args[0][1],
            'DECISION_SERVICE: User decision_service_user is not in the forced variation map.'
          );
          assert.strictEqual(
            mockLogger.log.args[1][1],
            'DECISION_SERVICE: User decision_service_user was previously bucketed into variation with ID not valid variation for experiment testExperiment, but no matching variation was found.'
          );
          // make sure we save the decision
          sinon.assert.calledWith(userProfileSaveStub, {
            user_id: 'decision_service_user',
            experiment_bucket_map: {
              '111127': {
                variation_id: '111128',
              },
            },
          });
        });

        it('should store the bucketed variation for the user', function() {
          bucketerStub.returns(fakeDecisionResponse); // ID of the 'control' variation
          userProfileLookupStub.returns({
            user_id: 'decision_service_user',
            experiment_bucket_map: {}, // no decisions for user
          });
          experiment = configObj.experimentIdMap['111127'];

          assert.strictEqual(
            'control',
            decisionServiceInstance.getVariation(configObj, experiment, 'decision_service_user').result
          );
          sinon.assert.calledWith(userProfileLookupStub, 'decision_service_user');
          sinon.assert.calledOnce(bucketerStub);
          assert.strictEqual(5, mockLogger.log.callCount);
          sinon.assert.calledWith(userProfileServiceInstance.save, {
            user_id: 'decision_service_user',
            experiment_bucket_map: {
              '111127': {
                variation_id: '111128',
              },
            },
          });
          assert.strictEqual(
            mockLogger.log.args[0][1],
            'DECISION_SERVICE: User decision_service_user is not in the forced variation map.'
          );
          assert.strictEqual(
            mockLogger.log.args[4][1],
            'DECISION_SERVICE: Saved variation "control" of experiment "testExperiment" for user "decision_service_user".'
          );
        });

        it('should log an error message if "lookup" throws an error', function() {
          bucketerStub.returns(fakeDecisionResponse); // ID of the 'control' variation
          userProfileLookupStub.throws(new Error('I am an error'));
          experiment = configObj.experimentIdMap['111127'];

          assert.strictEqual(
            'control',
            decisionServiceInstance.getVariation(configObj, experiment, 'decision_service_user').result
          );
          sinon.assert.calledWith(userProfileLookupStub, 'decision_service_user');
          sinon.assert.calledOnce(bucketerStub); // should still go through with bucketing
          assert.strictEqual(
            mockLogger.log.args[0][1],
            'DECISION_SERVICE: User decision_service_user is not in the forced variation map.'
          );
          assert.strictEqual(
            mockLogger.log.args[1][1],
            'DECISION_SERVICE: Error while looking up user profile for user ID "decision_service_user": I am an error.'
          );
        });

        it('should log an error message if "save" throws an error', function() {
          bucketerStub.returns(fakeDecisionResponse); // ID of the 'control' variation
          userProfileLookupStub.returns(null);
          userProfileSaveStub.throws(new Error('I am an error'));
          experiment = configObj.experimentIdMap['111127'];

          assert.strictEqual(
            'control',
            decisionServiceInstance.getVariation(configObj, experiment, 'decision_service_user').result
          );
          sinon.assert.calledWith(userProfileLookupStub, 'decision_service_user');
          sinon.assert.calledOnce(bucketerStub); // should still go through with bucketing

          assert.strictEqual(5, mockLogger.log.callCount);
          assert.strictEqual(
            mockLogger.log.args[0][1],
            'DECISION_SERVICE: User decision_service_user is not in the forced variation map.'
          );
          assert.strictEqual(
            mockLogger.log.args[4][1],
            'DECISION_SERVICE: Error while saving user profile for user ID "decision_service_user": I am an error.'
          );

          // make sure that we save the decision
          sinon.assert.calledWith(userProfileSaveStub, {
            user_id: 'decision_service_user',
            experiment_bucket_map: {
              '111127': {
                variation_id: '111128',
              },
            },
          });
        });

        describe('when passing `attributes.$opt_experiment_bucket_map`', function() {
          it('should respect attributes over the userProfileService for the matching experiment id', function() {
            userProfileLookupStub.returns({
              user_id: 'decision_service_user',
              experiment_bucket_map: {
                '111127': {
                  variation_id: '111128', // ID of the 'control' variation
                },
              },
            });

            var attributes = {
              $opt_experiment_bucket_map: {
                '111127': {
                  variation_id: '111129', // ID of the 'variation' variation
                },
              },
            };

            experiment = configObj.experimentIdMap['111127'];

            assert.strictEqual(
              'variation',
              decisionServiceInstance.getVariation(configObj, experiment, 'decision_service_user', attributes).result
            );
            sinon.assert.calledWith(userProfileLookupStub, 'decision_service_user');
            sinon.assert.notCalled(bucketerStub);
            assert.strictEqual(
              mockLogger.log.args[0][1],
              'DECISION_SERVICE: User decision_service_user is not in the forced variation map.'
            );
            assert.strictEqual(
              mockLogger.log.args[1][1],
              'DECISION_SERVICE: Returning previously activated variation "variation" of experiment "testExperiment" for user "decision_service_user" from user profile.'
            );
          });

          it('should ignore attributes for a different experiment id', function() {
            userProfileLookupStub.returns({
              user_id: 'decision_service_user',
              experiment_bucket_map: {
                '111127': {
                  // 'testExperiment' ID
                  variation_id: '111128', // ID of the 'control' variation
                },
              },
            });

            experiment = configObj.experimentIdMap['111127'];

            var attributes = {
              $opt_experiment_bucket_map: {
                '122227': {
                  // other experiment ID
                  variation_id: '122229', // ID of the 'variationWithAudience' variation
                },
              },
            };

            assert.strictEqual(
              'control',
              decisionServiceInstance.getVariation(configObj, experiment, 'decision_service_user', attributes).result
            );
            sinon.assert.calledWith(userProfileLookupStub, 'decision_service_user');
            sinon.assert.notCalled(bucketerStub);
            assert.strictEqual(
              mockLogger.log.args[0][1],
              'DECISION_SERVICE: User decision_service_user is not in the forced variation map.'
            );
            assert.strictEqual(
              mockLogger.log.args[1][1],
              'DECISION_SERVICE: Returning previously activated variation "control" of experiment "testExperiment" for user "decision_service_user" from user profile.'
            );
          });

          it('should use attributes when the userProfileLookup variations for other experiments', function() {
            userProfileLookupStub.returns({
              user_id: 'decision_service_user',
              experiment_bucket_map: {
                '122227': {
                  // other experiment ID
                  variation_id: '122229', // ID of the 'variationWithAudience' variation
                },
              },
            });

            experiment = configObj.experimentIdMap['111127'];

            var attributes = {
              $opt_experiment_bucket_map: {
                '111127': {
                  // 'testExperiment' ID
                  variation_id: '111129', // ID of the 'variation' variation
                },
              },
            };

            assert.strictEqual(
              'variation',
              decisionServiceInstance.getVariation(configObj, experiment, 'decision_service_user', attributes).result
            );
            sinon.assert.calledWith(userProfileLookupStub, 'decision_service_user');
            sinon.assert.notCalled(bucketerStub);
            assert.strictEqual(
              mockLogger.log.args[0][1],
              'DECISION_SERVICE: User decision_service_user is not in the forced variation map.'
            );
            assert.strictEqual(
              mockLogger.log.args[1][1],
              'DECISION_SERVICE: Returning previously activated variation "variation" of experiment "testExperiment" for user "decision_service_user" from user profile.'
            );
          });

          it('should use attributes when the userProfileLookup returns null', function() {
            userProfileLookupStub.returns(null);

            experiment = configObj.experimentIdMap['111127'];

            var attributes = {
              $opt_experiment_bucket_map: {
                '111127': {
                  variation_id: '111129', // ID of the 'variation' variation
                },
              },
            };

            assert.strictEqual(
              'variation',
              decisionServiceInstance.getVariation(configObj, experiment, 'decision_service_user', attributes).result
            );
            sinon.assert.calledWith(userProfileLookupStub, 'decision_service_user');
            sinon.assert.notCalled(bucketerStub);
            assert.strictEqual(
              mockLogger.log.args[0][1],
              'DECISION_SERVICE: User decision_service_user is not in the forced variation map.'
            );
            assert.strictEqual(
              mockLogger.log.args[1][1],
              'DECISION_SERVICE: Returning previously activated variation "variation" of experiment "testExperiment" for user "decision_service_user" from user profile.'
            );
          });
        });
      });
    });

    describe('buildBucketerParams', function() {
      it('should return params object with correct properties', function() {
        experiment = configObj.experimentIdMap['111127'];
        var bucketerParams = decisionServiceInstance.buildBucketerParams(
          configObj,
          experiment,
          'testUser',
          'testUser'
        );

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
          experimentIdMap: configObj.experimentIdMap,
          experimentKeyMap: configObj.experimentKeyMap,
          groupIdMap: configObj.groupIdMap,
        };

        assert.deepEqual(bucketerParams, expectedParams);

        sinon.assert.notCalled(mockLogger.log);
      });
    });

    describe('checkIfExperimentIsActive', function() {
      it('should return true if experiment is running', function() {
        assert.isTrue(decisionServiceInstance.checkIfExperimentIsActive(configObj, 'testExperiment'));
      });

      it('should return false when experiment is not running', function() {
        assert.isFalse(decisionServiceInstance.checkIfExperimentIsActive(configObj, 'testExperimentNotRunning'));
      });
    });

    describe('checkIfUserIsInAudience', function() {
      var __audienceEvaluateSpy;

      beforeEach(function() {
        __audienceEvaluateSpy = sinon.spy(AudienceEvaluator.prototype, 'evaluate');
      });

      afterEach(function() {
        __audienceEvaluateSpy.restore();
      });

      it('should return decision response with result true when audience conditions are met', function() {
        experiment = configObj.experimentIdMap['122227'];
        assert.isTrue(
          decisionServiceInstance.checkIfUserIsInAudience(
            configObj,
            experiment,
            "experiment",
            { browser_type: 'firefox' },
            ''
          ).result
        );
        assert.strictEqual(2, mockLogger.log.callCount);
        assert.strictEqual(
          mockLogger.log.args[0][1],
          'DECISION_SERVICE: Evaluating audiences for experiment "testExperimentWithAudiences": ["11154"].'
        );
        assert.strictEqual(
          mockLogger.log.args[1][1],
          'DECISION_SERVICE: Audiences for experiment testExperimentWithAudiences collectively evaluated to TRUE.'
        );
      });

      it('should return decision response with result true when experiment has no audience', function() {
        experiment = configObj.experimentIdMap['111127'];
        assert.isTrue(
          decisionServiceInstance.checkIfUserIsInAudience(
            configObj,
            experiment,
            'experiment',
            {},
            ''
          ).result
        );
        assert.isTrue(__audienceEvaluateSpy.alwaysReturned(true));

        assert.strictEqual(2, mockLogger.log.callCount);
        assert.strictEqual(
          mockLogger.log.args[0][1],
          'DECISION_SERVICE: Evaluating audiences for experiment "testExperiment": [].'
        );
        assert.strictEqual(
          mockLogger.log.args[1][1],
          'DECISION_SERVICE: Audiences for experiment testExperiment collectively evaluated to TRUE.'
        );
      });

      it('should return decision response with result false when audience conditions can not be evaluated', function() {
        experiment = configObj.experimentIdMap['122227'];
        assert.isFalse(
          decisionServiceInstance.checkIfUserIsInAudience(
            configObj,
            experiment,
            "experiment",
            {},
            ''
          ).result
        );
        assert.isTrue(__audienceEvaluateSpy.alwaysReturned(false));

        assert.strictEqual(2, mockLogger.log.callCount);
        assert.strictEqual(
          mockLogger.log.args[0][1],
          'DECISION_SERVICE: Evaluating audiences for experiment "testExperimentWithAudiences": ["11154"].'
        );
        assert.strictEqual(
          mockLogger.log.args[1][1],
          'DECISION_SERVICE: Audiences for experiment testExperimentWithAudiences collectively evaluated to FALSE.'
        );
      });

      it('should return decision response with result false when audience conditions are not met', function() {
        experiment = configObj.experimentIdMap['122227'];
        assert.isFalse(
          decisionServiceInstance.checkIfUserIsInAudience(
            configObj,
            experiment,
            "experiment",
            { browser_type: 'chrome' },
            ''
          ).result
        );
        assert.isTrue(__audienceEvaluateSpy.alwaysReturned(false));

        assert.strictEqual(2, mockLogger.log.callCount);
        assert.strictEqual(
          mockLogger.log.args[0][1],
          'DECISION_SERVICE: Evaluating audiences for experiment "testExperimentWithAudiences": ["11154"].'
        );
        assert.strictEqual(
          mockLogger.log.args[1][1],
          'DECISION_SERVICE: Audiences for experiment testExperimentWithAudiences collectively evaluated to FALSE.'
        );
      });
    });

    describe('getWhitelistedVariation', function() {
      it('should return forced variation ID if forced variation is provided for the user ID', function() {
        var testExperiment = configObj.experimentKeyMap['testExperiment'];
        var expectedVariation = configObj.variationIdMap['111128'];
        assert.strictEqual(
          decisionServiceInstance.getWhitelistedVariation(testExperiment, 'user1').result,
          expectedVariation
        );
      });

      it('should return null if forced variation is not provided for the user ID', function() {
        var testExperiment = configObj.experimentKeyMap['testExperiment'];
        assert.isNull(decisionServiceInstance.getWhitelistedVariation(testExperiment, 'notInForcedVariations').result);
      });
    });

    describe('getForcedVariation', function() {
      it('should return null for valid experimentKey, not set', function() {
        var variation = decisionServiceInstance.getForcedVariation(configObj, 'testExperiment', 'user1').result;
        assert.strictEqual(variation, null);
      });

      it('should return null for invalid experimentKey, not set', function() {
        var variation = decisionServiceInstance.getForcedVariation(configObj, 'definitely_not_valid_exp_key', 'user1').result;
        assert.strictEqual(variation, null);
      });

      it('should return null for invalid experimentKey when a variation was previously successfully forced on another experiment for the same user', function() {
        decisionServiceInstance.setForcedVariation(configObj, 'testExperiment', 'user1', 'control');
        var variation = decisionServiceInstance.getForcedVariation(configObj, 'definitely_not_valid_exp_key', 'user1').result;
        assert.strictEqual(variation, null);
      });

      it('should return null for valid experiment key, not set on this experiment key, but set on another experiment key', function() {
        decisionServiceInstance.setForcedVariation(configObj, 'testExperiment', 'user1', 'control');
        var variation = decisionServiceInstance.getForcedVariation(configObj, 'testExperimentLaunched', 'user1').result;
        assert.strictEqual(variation, null);
      });
    });

    describe('#setForcedVariation', function() {
      it('should return true for a valid forcedVariation in setForcedVariation', function() {
        var didSetVariation = decisionServiceInstance.setForcedVariation(
          configObj,
          'testExperiment',
          'user1',
          'control'
        );
        assert.strictEqual(didSetVariation, true);
      });

      it('should return the same variation from getVariation as was set in setVariation', function() {
        decisionServiceInstance.setForcedVariation(configObj, 'testExperiment', 'user1', 'control');
        var variation = decisionServiceInstance.getForcedVariation(configObj, 'testExperiment', 'user1').result;
        assert.strictEqual(variation, 'control');
      });

      it('should not set for an invalid variation key', function() {
        decisionServiceInstance.setForcedVariation(
          configObj,
          'testExperiment',
          'user1',
          'definitely_not_valid_variation_key'
        );
        var variation = decisionServiceInstance.getForcedVariation(configObj, 'testExperiment', 'user1').result;
        assert.strictEqual(variation, null);
      });

      it('should reset the forcedVariation if passed null', function() {
        var didSetVariation = decisionServiceInstance.setForcedVariation(
          configObj,
          'testExperiment',
          'user1',
          'control'
        );
        assert.strictEqual(didSetVariation, true);

        var variation = decisionServiceInstance.getForcedVariation(configObj, 'testExperiment', 'user1').result;
        assert.strictEqual(variation, 'control');

        var didSetVariationAgain = decisionServiceInstance.setForcedVariation(
          configObj,
          'testExperiment',
          'user1',
          null
        );
        assert.strictEqual(didSetVariationAgain, true);

        var variation = decisionServiceInstance.getForcedVariation(configObj, 'testExperiment', 'user1').result;
        assert.strictEqual(variation, null);
      });

      it('should be able to add variations for multiple experiments for one user', function() {
        var didSetVariation = decisionServiceInstance.setForcedVariation(
          configObj,
          'testExperiment',
          'user1',
          'control'
        );
        assert.strictEqual(didSetVariation, true);

        var didSetVariation2 = decisionServiceInstance.setForcedVariation(
          configObj,
          'testExperimentLaunched',
          'user1',
          'controlLaunched'
        );
        assert.strictEqual(didSetVariation2, true);

        var variation = decisionServiceInstance.getForcedVariation(configObj, 'testExperiment', 'user1').result;
        var variation2 = decisionServiceInstance.getForcedVariation(configObj, 'testExperimentLaunched', 'user1').result;

        assert.strictEqual(variation, 'control');
        assert.strictEqual(variation2, 'controlLaunched');
      });

      it('should be able to add experiments for multiple users', function() {
        var didSetVariation = decisionServiceInstance.setForcedVariation(
          configObj,
          'testExperiment',
          'user1',
          'control'
        );
        assert.strictEqual(didSetVariation, true);

        var didSetVariation = decisionServiceInstance.setForcedVariation(
          configObj,
          'testExperiment',
          'user2',
          'variation'
        );
        assert.strictEqual(didSetVariation, true);

        var variationControl = decisionServiceInstance.getForcedVariation(configObj, 'testExperiment', 'user1').result;
        var variationVariation = decisionServiceInstance.getForcedVariation(configObj, 'testExperiment', 'user2').result;

        assert.strictEqual(variationControl, 'control');
        assert.strictEqual(variationVariation, 'variation');
      });

      it('should be able to reset a variation for a user with multiple experiments', function() {
        //set the first time
        var didSetVariation = decisionServiceInstance.setForcedVariation(
          configObj,
          'testExperiment',
          'user1',
          'control'
        );
        assert.strictEqual(didSetVariation, true);

        var didSetVariation2 = decisionServiceInstance.setForcedVariation(
          configObj,
          'testExperimentLaunched',
          'user1',
          'controlLaunched'
        );
        assert.strictEqual(didSetVariation2, true);

        var variation = decisionServiceInstance.getForcedVariation(configObj, 'testExperiment', 'user1').result;
        var variation2 = decisionServiceInstance.getForcedVariation(configObj, 'testExperimentLaunched', 'user1').result;

        assert.strictEqual(variation, 'control');
        assert.strictEqual(variation2, 'controlLaunched');

        //reset for one of the experiments
        var didSetVariationAgain = decisionServiceInstance.setForcedVariation(
          configObj,
          'testExperiment',
          'user1',
          'variation'
        );
        assert.strictEqual(didSetVariationAgain, true);

        var variation = decisionServiceInstance.getForcedVariation(configObj, 'testExperiment', 'user1').result;
        var variation2 = decisionServiceInstance.getForcedVariation(configObj, 'testExperimentLaunched', 'user1').result;

        assert.strictEqual(variation, 'variation');
        assert.strictEqual(variation2, 'controlLaunched');
      });

      it('should be able to unset a variation for a user with multiple experiments', function() {
        //set the first time
        var didSetVariation = decisionServiceInstance.setForcedVariation(
          configObj,
          'testExperiment',
          'user1',
          'control'
        );
        assert.strictEqual(didSetVariation, true);

        var didSetVariation2 = decisionServiceInstance.setForcedVariation(
          configObj,
          'testExperimentLaunched',
          'user1',
          'controlLaunched'
        );
        assert.strictEqual(didSetVariation2, true);

        var variation = decisionServiceInstance.getForcedVariation(configObj, 'testExperiment', 'user1').result;
        var variation2 = decisionServiceInstance.getForcedVariation(configObj, 'testExperimentLaunched', 'user1').result;

        assert.strictEqual(variation, 'control');
        assert.strictEqual(variation2, 'controlLaunched');

        //reset for one of the experiments
        decisionServiceInstance.setForcedVariation(configObj, 'testExperiment', 'user1', null);
        assert.strictEqual(didSetVariation, true);

        var variation = decisionServiceInstance.getForcedVariation(configObj, 'testExperiment', 'user1').result;
        var variation2 = decisionServiceInstance.getForcedVariation(configObj, 'testExperimentLaunched', 'user1').result;

        assert.strictEqual(variation, null);
        assert.strictEqual(variation2, 'controlLaunched');
      });

      it('should return false for an empty variation key', function() {
        var didSetVariation = decisionServiceInstance.setForcedVariation(configObj, 'testExperiment', 'user1', '');
        assert.strictEqual(didSetVariation, false);
      });

      it('should return null when a variation was previously set, and that variation no longer exists on the config object', function() {
        var didSetVariation = decisionServiceInstance.setForcedVariation(
          configObj,
          'testExperiment',
          'user1',
          'control'
        );
        assert.strictEqual(didSetVariation, true);
        var newDatafile = cloneDeep(testData);
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
        var newConfigObj = projectConfig.createProjectConfig(newDatafile);
        var forcedVar = decisionServiceInstance.getForcedVariation(newConfigObj, 'testExperiment', 'user1').result;
        assert.strictEqual(forcedVar, null);
      });

      it("should return null when a variation was previously set, and that variation's experiment no longer exists on the config object", function() {
        var didSetVariation = decisionServiceInstance.setForcedVariation(
          configObj,
          'testExperiment',
          'user1',
          'control'
        );
        assert.strictEqual(didSetVariation, true);
        var newConfigObj = projectConfig.createProjectConfig(cloneDeep(testDataWithFeatures));
        var forcedVar = decisionServiceInstance.getForcedVariation(newConfigObj, 'testExperiment', 'user1').result;
        assert.strictEqual(forcedVar, null);
      });

      it('should return false from setForcedVariation and not set for invalid experiment key', function() {
        var didSetVariation = decisionServiceInstance.setForcedVariation(
          configObj,
          'definitelyNotAValidExperimentKey',
          'user1',
          'definitely_not_valid_variation_key'
        );
        assert.strictEqual(didSetVariation, false);
        var variation = decisionServiceInstance.getForcedVariation(
          configObj,
          'definitelyNotAValidExperimentKey',
          'user1'
        ).result;
        assert.strictEqual(variation, null);
      });
    });
  });

  // TODO: Move tests that test methods of Optimizely to lib/optimizely/index.tests.js
  describe('when a bucketingID is provided', function() {
    var configObj = projectConfig.createProjectConfig(cloneDeep(testData));
    var createdLogger = createLogger({
      logLevel: LOG_LEVEL.DEBUG,
      logToConsole: false,
    });
    var optlyInstance;
    beforeEach(function() {
      optlyInstance = new Optimizely({
        clientEngine: 'node-sdk',
        datafile: cloneDeep(testData),
        jsonSchemaValidator: jsonSchemaValidator,
        isValidInstance: true,
        logger: createdLogger,
        eventDispatcher: eventDispatcher,
        errorHandler: errorHandler,
      });

      sinon.stub(eventDispatcher, 'dispatchEvent');
      sinon.stub(errorHandler, 'handleError');
    });

    afterEach(function() {
      eventDispatcher.dispatchEvent.restore();
      errorHandler.handleError.restore();
    });

    var testUserAttributes = {
      browser_type: 'firefox',
    };
    var userAttributesWithBucketingId = {
      browser_type: 'firefox',
      $opt_bucketing_id: '123456789',
    };
    var invalidUserAttributesWithBucketingId = {
      browser_type: 'safari',
      $opt_bucketing_id: 'testBucketingIdControl!',
    };

    it('confirm normal bucketing occurs before setting bucketingId', function() {
      assert.strictEqual('variation', optlyInstance.getVariation('testExperiment', 'test_user', testUserAttributes));
    });

    it('confirm valid bucketing with bucketing ID set in attributes', function() {
      assert.strictEqual(
        'variationWithAudience',
        optlyInstance.getVariation('testExperimentWithAudiences', 'test_user', userAttributesWithBucketingId)
      );
    });

    it('check invalid audience with bucketingId', function() {
      assert.strictEqual(
        null,
        optlyInstance.getVariation('testExperimentWithAudiences', 'test_user', invalidUserAttributesWithBucketingId)
      );
    });

    it('test that an experiment that is not running returns a null variation', function() {
      assert.strictEqual(
        null,
        optlyInstance.getVariation('testExperimentNotRunning', 'test_user', userAttributesWithBucketingId)
      );
    });

    it('test that an invalid experiment key gets a null variation', function() {
      assert.strictEqual(
        null,
        optlyInstance.getVariation('invalidExperiment', 'test_user', userAttributesWithBucketingId)
      );
    });

    it('check forced variation', function() {
      assert.isTrue(
        optlyInstance.setForcedVariation('testExperiment', 'test_user', 'control'),
        sprintf('Set variation to "%s" failed', 'control')
      );
      assert.strictEqual(
        'control',
        optlyInstance.getVariation('testExperiment', 'test_user', userAttributesWithBucketingId)
      );
    });

    it('check whitelisted variation', function() {
      assert.strictEqual(
        'control',
        optlyInstance.getVariation('testExperiment', 'user1', userAttributesWithBucketingId)
      );
    });

    it('check user profile', function() {
      var userProfileLookupStub;
      var userProfileServiceInstance = {
        lookup: function() {},
      };
      userProfileLookupStub = sinon.stub(userProfileServiceInstance, 'lookup');
      userProfileLookupStub.returns({
        user_id: 'test_user',
        experiment_bucket_map: {
          '111127': {
            variation_id: '111128', // ID of the 'control' variation
          },
        },
      });
      var experiment = configObj.experimentIdMap['111127'];

      var decisionServiceInstance = createDecisionService({
        logger: createdLogger,
        userProfileService: userProfileServiceInstance,
      });

      assert.strictEqual(
        'control',
        decisionServiceInstance.getVariation(configObj, experiment, 'test_user', userAttributesWithBucketingId).result
      );
      sinon.assert.calledWithExactly(userProfileLookupStub, 'test_user');
    });
  });

  describe('getBucketingId', function() {
    var configObj;
    var decisionService;
    var mockLogger = createLogger({ logLevel: LOG_LEVEL.INFO });
    var userId = 'testUser1';
    var userAttributesWithBucketingId = {
      browser_type: 'firefox',
      $opt_bucketing_id: '123456789',
    };
    var userAttributesWithInvalidBucketingId = {
      browser_type: 'safari',
      $opt_bucketing_id: 50,
    };

    beforeEach(function() {
      sinon.stub(mockLogger, 'log');
      configObj = projectConfig.createProjectConfig(cloneDeep(testData));
      decisionService = createDecisionService({
        logger: mockLogger,
      });
    });

    afterEach(function() {
      mockLogger.log.restore();
    });

    it('should return userId if bucketingId is not defined in user attributes', function() {
      assert.strictEqual(userId, decisionService.getBucketingId(userId, null));
      assert.strictEqual(userId, decisionService.getBucketingId(userId, { browser_type: 'safari' }));
    });

    it('should log warning in case of invalid bucketingId', function() {
      assert.strictEqual(userId, decisionService.getBucketingId(userId, userAttributesWithInvalidBucketingId));
      assert.strictEqual(1, mockLogger.log.callCount);
      assert.strictEqual(
        mockLogger.log.args[0][1],
        'DECISION_SERVICE: BucketingID attribute is not a string. Defaulted to userId'
      );
    });

    it('should return correct bucketingId when provided in attributes', function() {
      assert.strictEqual('123456789', decisionService.getBucketingId(userId, userAttributesWithBucketingId));
      assert.strictEqual(1, mockLogger.log.callCount);
      assert.strictEqual(mockLogger.log.args[0][1], 'DECISION_SERVICE: BucketingId is valid: "123456789"');
    });
  });

  describe('feature management', function() {
    describe('#getVariationForFeature', function() {
      var configObj;
      var decisionServiceInstance;
      var sandbox;
      var mockLogger = createLogger({ logLevel: LOG_LEVEL.INFO });
      var fakeDecisionResponseWithArgs;
      var fakeDecisionResponse = {
        result: null,
        reasons: [],
      };
      beforeEach(function() {
        configObj = projectConfig.createProjectConfig(cloneDeep(testDataWithFeatures));
        sandbox = sinon.sandbox.create();
        sandbox.stub(mockLogger, 'log');
        decisionServiceInstance = createDecisionService({
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
          var experiment;
          beforeEach(function() {
            fakeDecisionResponseWithArgs = {
              result: 'variation',
              reasons: [],
            };
            experiment = configObj.experimentIdMap['594098'];
            getVariationStub = sandbox.stub(decisionServiceInstance, 'getVariation');
            getVariationStub.returns(fakeDecisionResponse);
            getVariationStub.withArgs(configObj, experiment, 'user1').returns(fakeDecisionResponseWithArgs);
          });

          it('returns a decision with a variation in the experiment the feature is attached to', function() {
            var decision = decisionServiceInstance.getVariationForFeature(configObj, feature, 'user1', {
              test_attribute: 'test_value',
            }).result;

            var expectedDecision = {
              experiment: {
                forcedVariations: {},
                status: 'Running',
                key: 'testing_my_feature',
                id: '594098',
                variations: [
                  {
                    id: '594096',
                    variables: [
                      {
                        id: '4792309476491264',
                        value: '2',
                      },
                      {
                        id: '5073784453201920',
                        value: 'true',
                      },
                      {
                        id: '5636734406623232',
                        value: 'Buy me NOW',
                      },
                      {
                        id: '6199684360044544',
                        value: '20.25',
                      },
                      {
                        id: '1547854156498475',
                        value: '{ "num_buttons": 1, "text": "first variation"}',
                      },
                    ],
                    featureEnabled: true,
                    key: 'variation',
                  },
                  {
                    id: '594097',
                    variables: [
                      {
                        id: '4792309476491264',
                        value: '10',
                      },
                      {
                        id: '5073784453201920',
                        value: 'false',
                      },
                      {
                        id: '5636734406623232',
                        value: 'Buy me',
                      },
                      {
                        id: '6199684360044544',
                        value: '50.55',
                      },
                      {
                        id: '1547854156498475',
                        value: '{ "num_buttons": 2, "text": "second variation"}',
                      },
                    ],
                    featureEnabled: true,
                    key: 'control',
                  },
                  {
                    id: '594099',
                    variables: [
                      {
                        id: '4792309476491264',
                        value: '40',
                      },
                      {
                        id: '5073784453201920',
                        value: 'true',
                      },
                      {
                        id: '5636734406623232',
                        value: 'Buy me Later',
                      },
                      {
                        id: '6199684360044544',
                        value: '99.99',
                      },
                      {
                        id: '1547854156498475',
                        value: '{ "num_buttons": 3, "text": "third variation"}',
                      },
                    ],
                    featureEnabled: false,
                    key: 'variation2',
                  },
                ],
                audienceIds: [],
                trafficAllocation: [
                  { endOfRange: 5000, entityId: '594096' },
                  { endOfRange: 10000, entityId: '594097' },
                ],
                layerId: '594093',
                variationKeyMap: {
                  control: {
                    id: '594097',
                    variables: [
                      {
                        id: '4792309476491264',
                        value: '10',
                      },
                      {
                        id: '5073784453201920',
                        value: 'false',
                      },
                      {
                        id: '5636734406623232',
                        value: 'Buy me',
                      },
                      {
                        id: '6199684360044544',
                        value: '50.55',
                      },
                      {
                        id: '1547854156498475',
                        value: '{ "num_buttons": 2, "text": "second variation"}',
                      },
                    ],
                    featureEnabled: true,
                    key: 'control',
                  },
                  variation: {
                    id: '594096',
                    variables: [
                      {
                        id: '4792309476491264',
                        value: '2',
                      },
                      {
                        id: '5073784453201920',
                        value: 'true',
                      },
                      {
                        id: '5636734406623232',
                        value: 'Buy me NOW',
                      },
                      {
                        id: '6199684360044544',
                        value: '20.25',
                      },
                      {
                        id: '1547854156498475',
                        value: '{ "num_buttons": 1, "text": "first variation"}',
                      },
                    ],
                    featureEnabled: true,
                    key: 'variation',
                  },
                  variation2: {
                    id: '594099',
                    variables: [
                      {
                        id: '4792309476491264',
                        value: '40',
                      },
                      {
                        id: '5073784453201920',
                        value: 'true',
                      },
                      {
                        id: '5636734406623232',
                        value: 'Buy me Later',
                      },
                      {
                        id: '6199684360044544',
                        value: '99.99',
                      },
                      {
                        id: '1547854156498475',
                        value: '{ "num_buttons": 3, "text": "third variation"}',
                      },
                    ],
                    featureEnabled: false,
                    key: 'variation2',
                  },
                },
              },
              variation: {
                id: '594096',
                variables: [
                  {
                    id: '4792309476491264',
                    value: '2',
                  },
                  {
                    id: '5073784453201920',
                    value: 'true',
                  },
                  {
                    id: '5636734406623232',
                    value: 'Buy me NOW',
                  },
                  {
                    id: '6199684360044544',
                    value: '20.25',
                  },
                  {
                    id: '1547854156498475',
                    value: '{ "num_buttons": 1, "text": "first variation"}',
                  },
                ],
                featureEnabled: true,
                key: 'variation',
              },
              decisionSource: DECISION_SOURCES.FEATURE_TEST,
            };
            assert.deepEqual(decision, expectedDecision);
            sinon.assert.calledWithExactly(
              getVariationStub,
              configObj,
              experiment,
              'user1',
              {
                test_attribute: 'test_value',
              },
              {}
            );
          });
        });

        describe('user not bucketed into this experiment', function() {
          var getVariationStub;
          beforeEach(function() {
            getVariationStub = sandbox.stub(decisionServiceInstance, 'getVariation');
            getVariationStub.returns(fakeDecisionResponse);
          });

          it('returns a decision with no variation and source rollout', function() {
            var decision = decisionServiceInstance.getVariationForFeature(configObj, feature, 'user1').result;
            var expectedDecision = {
              experiment: null,
              variation: null,
              decisionSource: DECISION_SOURCES.ROLLOUT,
            };
            assert.deepEqual(decision, expectedDecision);
            sinon.assert.calledWithExactly(
              mockLogger.log,
              LOG_LEVEL.DEBUG,
              'DECISION_SERVICE: User user1 is not in rollout of feature test_feature_for_experiment.'
            );
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
            fakeDecisionResponseWithArgs = {
              result: 'var',
              reasons: [],
            };
            getVariationStub = sandbox.stub(decisionServiceInstance, 'getVariation');
            getVariationStub.returns(fakeDecisionResponseWithArgs);
            getVariationStub.withArgs(configObj, 'exp_with_group', 'user1').returns(fakeDecisionResponseWithArgs);
          });

          it('returns a decision with a variation in an experiment in a group', function() {
            var decision = decisionServiceInstance.getVariationForFeature(configObj, feature, 'user1').result;
            var expectedDecision = {
              experiment: {
                forcedVariations: {},
                status: 'Running',
                key: 'exp_with_group',
                id: '595010',
                variations: [
                  { id: '595008', variables: [], key: 'var' },
                  { id: '595009', variables: [], key: 'con' },
                ],
                audienceIds: [],
                trafficAllocation: [
                  { endOfRange: 5000, entityId: '595008' },
                  { endOfRange: 10000, entityId: '595009' },
                ],
                layerId: '595005',
                groupId: '595024',
                variationKeyMap: {
                  con: {
                    id: '595009',
                    variables: [],
                    key: 'con',
                  },
                  var: {
                    id: '595008',
                    variables: [],
                    key: 'var',
                  },
                },
              },
              variation: {
                id: '595008',
                variables: [],
                key: 'var',
              },
              decisionSource: DECISION_SOURCES.FEATURE_TEST,
            };
            assert.deepEqual(decision, expectedDecision);
          });
        });

        describe('user not bucketed into an experiment in the group', function() {
          var getVariationStub;
          beforeEach(function() {
            getVariationStub = sandbox.stub(decisionServiceInstance, 'getVariation');
            getVariationStub.returns(fakeDecisionResponse);
          });

          it('returns a decision with no experiment, no variation and source rollout', function() {
            var decision = decisionServiceInstance.getVariationForFeature(configObj, feature, 'user1').result;
            var expectedDecision = {
              experiment: null,
              variation: null,
              decisionSource: DECISION_SOURCES.ROLLOUT,
            };
            assert.deepEqual(decision, expectedDecision);
            sinon.assert.calledWithExactly(
              mockLogger.log,
              LOG_LEVEL.DEBUG,
              'DECISION_SERVICE: User user1 is not in rollout of feature feature_with_group.'
            );
          });

          it('returns null decision for group experiment not referenced by the feature', function() {
            var noTrafficExpFeature = configObj.featureKeyMap.feature_exp_no_traffic;
            var decision = decisionServiceInstance.getVariationForFeature(configObj, noTrafficExpFeature, 'user1').result;
            var expectedDecision = {
              experiment: null,
              variation: null,
              decisionSource: DECISION_SOURCES.ROLLOUT,
            };
            assert.deepEqual(decision, expectedDecision);
            sinon.assert.calledWithExactly(
              mockLogger.log,
              LOG_LEVEL.DEBUG,
              'DECISION_SERVICE: There is no rollout of feature feature_exp_no_traffic.'
            );
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
            fakeDecisionResponse = {
              result: '594032', // ID of variation in rollout experiment - audience targeting rule for 'test_audience'
              reasons: [],
            };
            bucketStub.returns(fakeDecisionResponse)
          });

          it('returns a decision with a variation and experiment from the audience targeting rule', function() {
            var attributes = { test_attribute: 'test_value' };
            var decision = decisionServiceInstance.getVariationForFeature(configObj, feature, 'user1', attributes).result;
            var expectedDecision = {
              experiment: {
                forcedVariations: {},
                status: 'Not started',
                key: '594031',
                id: '594031',
                variations: [
                  {
                    id: '594032',
                    variables: [
                      {
                        id: '4919852825313280',
                        value: 'true',
                      },
                      {
                        id: '5482802778734592',
                        value: '395',
                      },
                      {
                        id: '6045752732155904',
                        value: '4.99',
                      },
                      {
                        id: '6327227708866560',
                        value: 'Hello audience',
                      },
                      {
                        id: "8765345281230956",
                        value: '{ "count": 2, "message": "Hello audience" }',
                      },
                    ],
                    featureEnabled: true,
                    key: '594032',
                  },
                ],
                variationKeyMap: {
                  594032: {
                    id: '594032',
                    variables: [
                      {
                        id: '4919852825313280',
                        value: 'true',
                      },
                      {
                        id: '5482802778734592',
                        value: '395',
                      },
                      {
                        id: '6045752732155904',
                        value: '4.99',
                      },
                      {
                        id: '6327227708866560',
                        value: 'Hello audience',
                      },
                      {
                        id: "8765345281230956",
                        value: '{ "count": 2, "message": "Hello audience" }',
                      },
                    ],
                    featureEnabled: true,
                    key: '594032',
                  },
                },
                audienceIds: ['594017'],
                trafficAllocation: [{ endOfRange: 5000, entityId: '594032' }],
                layerId: '594030',
              },
              variation: {
                id: '594032',
                variables: [
                  {
                    id: '4919852825313280',
                    value: 'true',
                  },
                  {
                    id: '5482802778734592',
                    value: '395',
                  },
                  {
                    id: '6045752732155904',
                    value: '4.99',
                  },
                  {
                    id: '6327227708866560',
                    value: 'Hello audience',
                  },
                  {
                    id: "8765345281230956",
                    value: '{ "count": 2, "message": "Hello audience" }',
                  },
                ],
                featureEnabled: true,
                key: '594032',
              },
              decisionSource: DECISION_SOURCES.ROLLOUT,
            };
            assert.deepEqual(decision, expectedDecision);
            sinon.assert.calledWithExactly(
              mockLogger.log,
              LOG_LEVEL.DEBUG,
              'DECISION_SERVICE: User user1 meets conditions for targeting rule 1.'
            );
            sinon.assert.calledWithExactly(
              mockLogger.log,
              LOG_LEVEL.DEBUG,
              'DECISION_SERVICE: User user1 bucketed into targeting rule 1.'
            );
            sinon.assert.calledWithExactly(
              mockLogger.log,
              LOG_LEVEL.DEBUG,
              'DECISION_SERVICE: User user1 is in rollout of feature test_feature.'
            );
          });
        });

        describe('user bucketed into everyone else targeting rule', function() {
          beforeEach(function() {
            fakeDecisionResponse = {
              result: '594038', // ID of variation in rollout experiment - everyone else targeting rule
              reasons: [],
            };
            bucketStub.returns(fakeDecisionResponse)
          });

          it('returns a decision with a variation and experiment from the everyone else targeting rule', function() {
            var attributes = {};
            var decision = decisionServiceInstance.getVariationForFeature(configObj, feature, 'user1', attributes).result;
            var expectedDecision = {
              experiment: {
                forcedVariations: {},
                status: 'Not started',
                key: '594037',
                id: '594037',
                variations: [
                  {
                    id: '594038',
                    variables: [
                      {
                        id: '4919852825313280',
                        value: 'false',
                      },
                      {
                        id: '5482802778734592',
                        value: '400',
                      },
                      {
                        id: '6045752732155904',
                        value: '14.99',
                      },
                      {
                        id: '6327227708866560',
                        value: 'Hello',
                      },
                      {
                        id: '8765345281230956',
                        value: '{ "count": 1, "message": "Hello" }',
                      },
                    ],
                    featureEnabled: false,
                    key: '594038',
                  },
                ],
                audienceIds: [],
                trafficAllocation: [{ endOfRange: 0, entityId: '594038' }],
                layerId: '594030',
                variationKeyMap: {
                  594038: {
                    id: '594038',
                    variables: [
                      {
                        id: '4919852825313280',
                        value: 'false',
                      },
                      {
                        id: '5482802778734592',
                        value: '400',
                      },
                      {
                        id: '6045752732155904',
                        value: '14.99',
                      },
                      {
                        id: '6327227708866560',
                        value: 'Hello',
                      },
                      {
                        id: '8765345281230956',
                        value: '{ "count": 1, "message": "Hello" }',
                      },
                    ],
                    featureEnabled: false,
                    key: '594038',
                  },
                },
              },
              variation: {
                id: '594038',
                variables: [
                  {
                    id: '4919852825313280',
                    value: 'false',
                  },
                  {
                    id: '5482802778734592',
                    value: '400',
                  },
                  {
                    id: '6045752732155904',
                    value: '14.99',
                  },
                  {
                    id: '6327227708866560',
                    value: 'Hello',
                  },
                  {
                    id: '8765345281230956',
                    value: '{ "count": 1, "message": "Hello" }',
                  },
                ],
                featureEnabled: false,
                key: '594038',
              },
              decisionSource: DECISION_SOURCES.ROLLOUT,
            };
            assert.deepEqual(decision, expectedDecision);
            sinon.assert.calledWithExactly(
              mockLogger.log,
              LOG_LEVEL.DEBUG,
              'DECISION_SERVICE: User user1 does not meet conditions for targeting rule 1.'
            );
            sinon.assert.calledWithExactly(
              mockLogger.log,
              LOG_LEVEL.DEBUG,
              'DECISION_SERVICE: User user1 bucketed into everyone targeting rule.'
            );
            sinon.assert.calledWithExactly(
              mockLogger.log,
              LOG_LEVEL.DEBUG,
              'DECISION_SERVICE: User user1 is in rollout of feature test_feature.'
            );
          });
        });

        describe('user not bucketed into audience targeting rule or everyone else rule', function() {
          beforeEach(function() {
            fakeDecisionResponse = {
              result: null,
              reasons: [],
            };
            bucketStub.returns(fakeDecisionResponse)
          });

          it('returns a decision with no variation, no experiment and source rollout', function() {
            var decision = decisionServiceInstance.getVariationForFeature(configObj, feature, 'user1').result;
            var expectedDecision = {
              experiment: null,
              variation: null,
              decisionSource: DECISION_SOURCES.ROLLOUT,
            };
            assert.deepEqual(decision, expectedDecision);
            sinon.assert.calledWithExactly(
              mockLogger.log,
              LOG_LEVEL.DEBUG,
              'DECISION_SERVICE: User user1 does not meet conditions for targeting rule 1.'
            );
            sinon.assert.calledWithExactly(
              mockLogger.log,
              LOG_LEVEL.DEBUG,
              'DECISION_SERVICE: User user1 is not in rollout of feature test_feature.'
            );
          });
        });

        describe('user excluded from audience targeting rule due to traffic allocation, and bucketed into everyone else', function() {
          beforeEach(function() {
            fakeDecisionResponse = {
              result: null,
              reasons: [],
            };
            fakeDecisionResponseWithArgs = {
              result: '594038',
              reasons: [],
            };
            bucketStub.returns(fakeDecisionResponse); // returns no variation for other calls
            bucketStub
              .withArgs(
                sinon.match({
                  experimentKey: '594037',
                })
              )
              .returns(fakeDecisionResponseWithArgs); // returns variation from everyone else targeitng rule when called with everyone else experiment key;
          });

          it('returns a decision with a variation and experiment from the everyone else targeting rule', function() {
            var attributes = { test_attribute: 'test_value' };
            var decision = decisionServiceInstance.getVariationForFeature(configObj, feature, 'user1', attributes).result;
            var expectedDecision = {
              experiment: {
                forcedVariations: {},
                status: 'Not started',
                key: '594037',
                id: '594037',
                variations: [
                  {
                    id: '594038',
                    variables: [
                      {
                        id: '4919852825313280',
                        value: 'false',
                      },
                      {
                        id: '5482802778734592',
                        value: '400',
                      },
                      {
                        id: '6045752732155904',
                        value: '14.99',
                      },
                      {
                        id: '6327227708866560',
                        value: 'Hello',
                      },
                      {
                        id: '8765345281230956',
                        value: '{ "count": 1, "message": "Hello" }',
                      },
                    ],
                    featureEnabled: false,
                    key: '594038',
                  },
                ],
                audienceIds: [],
                trafficAllocation: [{ endOfRange: 0, entityId: '594038' }],
                layerId: '594030',
                variationKeyMap: {
                  594038: {
                    id: '594038',
                    variables: [
                      {
                        id: '4919852825313280',
                        value: 'false',
                      },
                      {
                        id: '5482802778734592',
                        value: '400',
                      },
                      {
                        id: '6045752732155904',
                        value: '14.99',
                      },
                      {
                        id: '6327227708866560',
                        value: 'Hello',
                      },
                      {
                        id: '8765345281230956',
                        value: '{ "count": 1, "message": "Hello" }',
                      },
                    ],
                    featureEnabled: false,
                    key: '594038',
                  },
                },
              },
              variation: {
                id: '594038',
                variables: [
                  {
                    id: '4919852825313280',
                    value: 'false',
                  },
                  {
                    id: '5482802778734592',
                    value: '400',
                  },
                  {
                    id: '6045752732155904',
                    value: '14.99',
                  },
                  {
                    id: '6327227708866560',
                    value: 'Hello',
                  },
                  {
                    id: '8765345281230956',
                    value: '{ "count": 1, "message": "Hello" }',
                  },
                ],
                featureEnabled: false,
                key: '594038',
              },
              decisionSource: DECISION_SOURCES.ROLLOUT,
            };
            assert.deepEqual(decision, expectedDecision);
            sinon.assert.calledWithExactly(
              mockLogger.log,
              LOG_LEVEL.DEBUG,
              'DECISION_SERVICE: User user1 meets conditions for targeting rule 1.'
            );
            sinon.assert.calledWithExactly(
              mockLogger.log,
              LOG_LEVEL.DEBUG,
              'DECISION_SERVICE User user1 not bucketed into targeting rule 1 due to traffic allocation. Trying everyone rule.'
            );
            sinon.assert.calledWithExactly(
              mockLogger.log,
              LOG_LEVEL.DEBUG,
              'DECISION_SERVICE: User user1 bucketed into everyone targeting rule.'
            );
          });
        });
      });

      describe('feature attached to both an experiment and a rollout', function() {
        var feature;
        var getVariationStub;
        var bucketStub;
        fakeDecisionResponse = {
          result: null,
          reasons: [],
        };
        var fakeBucketStubDecisionResponse = {
          result: '599057',
          reasons: [],
        }
        beforeEach(function() {
          feature = configObj.featureKeyMap.shared_feature;
          getVariationStub = sandbox.stub(decisionServiceInstance, 'getVariation');
          getVariationStub.returns(fakeDecisionResponse); // No variation returned by getVariation
          bucketStub = sandbox.stub(bucketer, 'bucket');
          bucketStub.returns(fakeBucketStubDecisionResponse); // Id of variation in rollout of shared feature
        });

        it('can bucket a user into the rollout when the user is not bucketed into the experiment', function() {
          // No attributes passed, so user is not in the audience for the experiment
          // It should fall through to the rollout
          var decision = decisionServiceInstance.getVariationForFeature(configObj, feature, 'user1').result;
          var expectedDecision = {
            experiment: {
              trafficAllocation: [
                {
                  endOfRange: 10000,
                  entityId: '599057',
                },
              ],
              layerId: '599055',
              forcedVariations: {},
              audienceIds: [],
              variations: [
                {
                  key: '599057',
                  id: '599057',
                  featureEnabled: true,
                  variables: [
                    {
                      id: '4937719889264640',
                      value: '200',
                    },
                    {
                      id: '6345094772817920',
                      value: "i'm a rollout",
                    },
                  ],
                },
              ],
              status: 'Not started',
              key: '599056',
              id: '599056',
              variationKeyMap: {
                599057: {
                  key: '599057',
                  id: '599057',
                  featureEnabled: true,
                  variables: [
                    {
                      id: '4937719889264640',
                      value: '200',
                    },
                    {
                      id: '6345094772817920',
                      value: "i'm a rollout",
                    },
                  ],
                },
              },
            },
            variation: {
              key: '599057',
              id: '599057',
              featureEnabled: true,
              variables: [
                {
                  id: '4937719889264640',
                  value: '200',
                },
                {
                  id: '6345094772817920',
                  value: "i'm a rollout",
                },
              ],
            },
            decisionSource: DECISION_SOURCES.ROLLOUT,
          };
          assert.deepEqual(decision, expectedDecision);
          sinon.assert.calledWithExactly(
            mockLogger.log,
            LOG_LEVEL.DEBUG,
            'DECISION_SERVICE: User user1 bucketed into everyone targeting rule.'
          );
          sinon.assert.calledWithExactly(
            mockLogger.log,
            LOG_LEVEL.DEBUG,
            'DECISION_SERVICE: User user1 is in rollout of feature shared_feature.'
          );
        });
      });

      describe('feature not attached to an experiment or a rollout', function() {
        var feature;
        beforeEach(function() {
          feature = configObj.featureKeyMap.unused_flag;
        });

        it('returns a decision with no variation, no experiment and source rollout', function() {
          var decision = decisionServiceInstance.getVariationForFeature(configObj, feature, 'user1').result;
          var expectedDecision = {
            experiment: null,
            variation: null,
            decisionSource: DECISION_SOURCES.ROLLOUT,
          };
          assert.deepEqual(decision, expectedDecision);
          sinon.assert.calledWithExactly(
            mockLogger.log,
            LOG_LEVEL.DEBUG,
            'DECISION_SERVICE: Feature unused_flag is not attached to any experiments.'
          );
          sinon.assert.calledWithExactly(
            mockLogger.log,
            LOG_LEVEL.DEBUG,
            'DECISION_SERVICE: There is no rollout of feature unused_flag.'
          );
        });
      });

      describe('feature attached to exclusion group', function() {
        var feature;
        var generateBucketValueStub;
        beforeEach(function() {
          feature = configObj.featureKeyMap.test_feature_in_exclusion_group;
          generateBucketValueStub = sandbox.stub(bucketer, '_generateBucketValue');
        });

        it('returns a decision with a variation in mutex group bucket less than 2500', function() {
          generateBucketValueStub.returns(2400);
          var decision = decisionServiceInstance.getVariationForFeature(configObj, feature, 'user1', {
            experiment_attr: 'group_experiment',
          }).result;
          var expectedExperiment = projectConfig.getExperimentFromKey(configObj, 'group_2_exp_1');
          var expectedDecision = {
            experiment: expectedExperiment,
            variation: {
              id: '38901',
              key: 'var_1',
              featureEnabled: false,
            },
            decisionSource: DECISION_SOURCES.FEATURE_TEST,
          };
          assert.deepEqual(decision, expectedDecision);
          assert.strictEqual(
            mockLogger.log.args[3][1],
            'BUCKETER: Assigned bucket 2400 to user with bucketing ID user1.'
          );
          sinon.assert.calledWithExactly(
            generateBucketValueStub,
            'user142222'
          );
        });

        it('returns a decision with a variation in mutex group bucket range 2500 to 5000', function() {
          generateBucketValueStub.returns(4000);
          var decision = decisionServiceInstance.getVariationForFeature(configObj, feature, 'user1', {
            experiment_attr: 'group_experiment',
          }).result;
          var expectedExperiment = projectConfig.getExperimentFromKey(configObj, 'group_2_exp_2');
          var expectedDecision = {
            experiment: expectedExperiment,
            variation: {
              id: '38905',
              key: 'var_1',
              featureEnabled: false,
            },
            decisionSource: DECISION_SOURCES.FEATURE_TEST,
          };
          assert.deepEqual(decision, expectedDecision);
          assert.strictEqual(
            mockLogger.log.args[3][1],
            'BUCKETER: Assigned bucket 4000 to user with bucketing ID user1.'
          );
          sinon.assert.calledWithExactly(
            generateBucketValueStub,
            'user142223'
          );
        });

        it('returns a decision with a variation in mutex group bucket range 5000 to 7500', function() {
          generateBucketValueStub.returns(6500);
          var decision = decisionServiceInstance.getVariationForFeature(configObj, feature, 'user1', {
            experiment_attr: 'group_experiment',
          }).result;
          var expectedExperiment = projectConfig.getExperimentFromKey(configObj, 'group_2_exp_3');
          var expectedDecision = {
            experiment: expectedExperiment,
            variation: {
              id: '38906',
              key: 'var_1',
              featureEnabled: false,
            },
            decisionSource: DECISION_SOURCES.FEATURE_TEST,
          };
          assert.deepEqual(decision, expectedDecision);
          assert.strictEqual(
            mockLogger.log.args[3][1],
            'BUCKETER: Assigned bucket 6500 to user with bucketing ID user1.'
          );
          sinon.assert.calledWithExactly(
            generateBucketValueStub,
            'user142224'
          );
        });

        it('returns a decision with variation and source rollout in mutex group bucket greater than 7500', function() {
          generateBucketValueStub.returns(8000);
          var decision = decisionServiceInstance.getVariationForFeature(configObj, feature, 'user1', {
            experiment_attr: 'group_experiment',
          }).result;
          var expectedExperiment = projectConfig.getExperimentFromId(configObj, '594066');
          var expectedDecision = {
            experiment: expectedExperiment,
            variation: {
              id: '594067',
              key: '594067',
              featureEnabled: true,
              variables: [
                {
                  id: '5060590313668608',
                  value: '30.34'
                },
                {
                  id: '5342065290379264',
                  value: 'Winter is coming definitely'
                },
                {
                  id: '6186490220511232',
                  value: '500'
                },
                {
                  id: '6467965197221888',
                  value: 'true'
                },
              ],
            },
            decisionSource: DECISION_SOURCES.ROLLOUT,
          }
          assert.deepEqual(decision, expectedDecision);
          assert.strictEqual(
            mockLogger.log.args[3][1],
            'BUCKETER: Assigned bucket 8000 to user with bucketing ID user1.'
          );
          sinon.assert.calledWithExactly(
            generateBucketValueStub,
            'user1594066'
          );
        });

        it('returns a decision with variation for rollout in mutex group with audience mismatch', function() {
          generateBucketValueStub.returns(2400);
          var decision = decisionServiceInstance.getVariationForFeature(configObj, feature, 'user1', {
            experiment_attr: 'group_experiment_invalid',
          }).result;
          var expectedExperiment = projectConfig.getExperimentFromId(configObj, '594066', mockLogger);
          var expectedDecision = {
            experiment: expectedExperiment,
            variation: {
              id: '594067',
              key: '594067',
              featureEnabled: true,
              variables: [
                {
                  id: '5060590313668608',
                  value: '30.34'
                },
                {
                  id: '5342065290379264',
                  value: 'Winter is coming definitely'
                },
                {
                  id: '6186490220511232',
                  value: '500'
                },
                {
                  id: '6467965197221888',
                  value: 'true'
                },
              ],
            },
            decisionSource: DECISION_SOURCES.ROLLOUT,
          }
          assert.deepEqual(decision, expectedDecision);
          assert.strictEqual(
            mockLogger.log.args[18][1],
            'BUCKETER: Assigned bucket 2400 to user with bucketing ID user1.'
          );
          sinon.assert.calledWithExactly(
            generateBucketValueStub,
            'user1594066'
          );
        });
      });

      describe('feature attached to multiple experiments', function() {
        var feature;
        var generateBucketValueStub;
        beforeEach(function() {
          feature = configObj.featureKeyMap.test_feature_in_multiple_experiments;
          generateBucketValueStub = sandbox.stub(bucketer, '_generateBucketValue');
        });

        it('returns a decision with a variation in mutex group bucket less than 2500', function() {
          generateBucketValueStub.returns(2400);
          var decision = decisionServiceInstance.getVariationForFeature(configObj, feature, 'user1', {
            experiment_attr: 'group_experiment',
          }).result;
          var expectedExperiment = projectConfig.getExperimentFromKey(configObj, 'test_experiment3');
          var expectedDecision = {
            experiment: expectedExperiment,
            variation: {
              id: '222239',
              key: 'control',
              featureEnabled: false,
              variables: [],
            },
            decisionSource: DECISION_SOURCES.FEATURE_TEST,
          };
          assert.deepEqual(decision, expectedDecision);
          assert.strictEqual(
            mockLogger.log.args[3][1],
            'BUCKETER: Assigned bucket 2400 to user with bucketing ID user1.'
          );
          sinon.assert.calledWithExactly(
            generateBucketValueStub,
            'user1111134'
          );
        });

        it('returns a decision with a variation in mutex group bucket range 2500 to 5000', function() {
          generateBucketValueStub.returns(4000);
          var decision = decisionServiceInstance.getVariationForFeature(configObj, feature, 'user1', {
            experiment_attr: 'group_experiment',
          }).result;
          var expectedExperiment = projectConfig.getExperimentFromKey(configObj, 'test_experiment4');
          var expectedDecision = {
            experiment: expectedExperiment,
            variation: {
              id: '222240',
              key: 'control',
              featureEnabled: false,
              variables: [],
            },
            decisionSource: DECISION_SOURCES.FEATURE_TEST,
          };
          assert.deepEqual(decision, expectedDecision);
          assert.strictEqual(
            mockLogger.log.args[3][1],
            'BUCKETER: Assigned bucket 4000 to user with bucketing ID user1.'
          );
          sinon.assert.calledWithExactly(
            generateBucketValueStub,
            'user1111135'
          );
        });

        it('returns a decision with a variation in mutex group bucket range 5000 to 7500', function() {
          generateBucketValueStub.returns(6500);
          var decision = decisionServiceInstance.getVariationForFeature(configObj, feature, 'user1', {
            experiment_attr: 'group_experiment',
          }).result;
          var expectedExperiment = projectConfig.getExperimentFromKey(configObj, 'test_experiment5');
          var expectedDecision = {
            experiment: expectedExperiment,
            variation: {
              id: '222241',
              key: 'control',
              featureEnabled: false,
              variables: [],
            },
            decisionSource: DECISION_SOURCES.FEATURE_TEST,
          };
          assert.deepEqual(decision, expectedDecision);
          assert.strictEqual(
            mockLogger.log.args[3][1],
            'BUCKETER: Assigned bucket 6500 to user with bucketing ID user1.'
          );
          sinon.assert.calledWithExactly(
            generateBucketValueStub,
            'user1111136'
          );
        });

        it('returns a decision with variation and source rollout in mutex group bucket greater than 7500', function() {
          generateBucketValueStub.returns(8000);
          var decision = decisionServiceInstance.getVariationForFeature(configObj, feature, 'user1', {
            experiment_attr: 'group_experiment',
          }).result;
          var expectedExperiment = projectConfig.getExperimentFromId(configObj, '594066');
          var expectedDecision = {
            experiment: expectedExperiment,
            variation: {
              id: '594067',
              key: '594067',
              featureEnabled: true,
              variables: [
                {
                  id: '5060590313668608',
                  value: '30.34'
                },
                {
                  id: '5342065290379264',
                  value: 'Winter is coming definitely'
                },
                {
                  id: '6186490220511232',
                  value: '500'
                },
                {
                  id: '6467965197221888',
                  value: 'true'
                },
              ],
            },
            decisionSource: DECISION_SOURCES.ROLLOUT,
          }
          assert.deepEqual(decision, expectedDecision);
          assert.strictEqual(
            mockLogger.log.args[3][1],
            'BUCKETER: Assigned bucket 8000 to user with bucketing ID user1.'
          );
          sinon.assert.calledWithExactly(
            generateBucketValueStub,
            'user1594066'
          );
        });

        it('returns a decision with variation for rollout in mutex group bucket range 2500 to 5000', function() {
          generateBucketValueStub.returns(4000);
          var decision = decisionServiceInstance.getVariationForFeature(configObj, feature, 'user1', {
            experiment_attr: 'group_experiment_invalid',
          }).result;
          var expectedExperiment = projectConfig.getExperimentFromId(configObj, '594066', mockLogger);
          var expectedDecision = {
            experiment: expectedExperiment,
            variation: {
              id: '594067',
              key: '594067',
              featureEnabled: true,
              variables: [
                {
                  id: '5060590313668608',
                  value: '30.34'
                },
                {
                  id: '5342065290379264',
                  value: 'Winter is coming definitely'
                },
                {
                  id: '6186490220511232',
                  value: '500'
                },
                {
                  id: '6467965197221888',
                  value: 'true'
                },
              ],
            },
            decisionSource: DECISION_SOURCES.ROLLOUT,
          }
          assert.deepEqual(decision, expectedDecision);
          assert.strictEqual(
            mockLogger.log.args[18][1],
            'BUCKETER: Assigned bucket 4000 to user with bucketing ID user1.'
          );
          sinon.assert.calledWithExactly(
            generateBucketValueStub,
            'user1594066'
          );
        });
      });
    });

    describe('getVariationForRollout', function() {
      var feature;
      var configObj;
      var decisionService;
      var buildBucketerParamsSpy;

      beforeEach(function() {
        configObj = projectConfig.createProjectConfig(cloneDeep(testDataWithFeatures));
        feature = configObj.featureKeyMap.test_feature;
        decisionService = createDecisionService({
          logger: createLogger({ logLevel: LOG_LEVEL.INFO }),
        });
        buildBucketerParamsSpy = sinon.spy(decisionService, 'buildBucketerParams');
      });

      afterEach(function() {
        buildBucketerParamsSpy.restore();
      });

      it('should call buildBucketerParams with user Id when bucketing Id is not provided in the attributes', function() {
        var attributes = { test_attribute: 'test_value' };
        decisionService.getVariationForRollout(configObj, feature, 'testUser', attributes).result;

        sinon.assert.callCount(buildBucketerParamsSpy, 2);
        sinon.assert.calledWithExactly(buildBucketerParamsSpy, configObj, configObj.experimentIdMap['594031'], 'testUser', 'testUser');
        sinon.assert.calledWithExactly(buildBucketerParamsSpy, configObj, configObj.experimentIdMap['594037'], 'testUser', 'testUser');
      });

      it('should call buildBucketerParams with bucketing Id when bucketing Id is provided in the attributes', function() {
        var attributes = {
          test_attribute: 'test_value',
          $opt_bucketing_id: 'abcdefg',
        };
        decisionService.getVariationForRollout(configObj, feature, 'testUser', attributes).result;

        sinon.assert.callCount(buildBucketerParamsSpy, 2);
        sinon.assert.calledWithExactly(buildBucketerParamsSpy, configObj, configObj.experimentIdMap['594031'], 'abcdefg', 'testUser');
        sinon.assert.calledWithExactly(buildBucketerParamsSpy, configObj, configObj.experimentIdMap['594037'], 'abcdefg', 'testUser');
      });
    });
  });
});
