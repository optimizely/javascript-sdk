/****************************************************************************
 * Copyright 2017-2020 Optimizely, Inc. and contributors                    *
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

import DecisionService from './';
import bucketer from '../bucketer';
import {
  LOG_LEVEL,
  LOG_MESSAGES,
  DECISION_SOURCES,
} from '../../utils/enums';
import logger from '../../plugins/logger';
import Optimizely from '../../optimizely';
import projectConfig from '../project_config';
import AudienceEvaluator from '../audience_evaluator';
import errorHandler from '../../plugins/error_handler';
import eventBuilder from '../../core/event_builder/index.js';
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
    var mockLogger = logger.createLogger({ logLevel: LOG_LEVEL.INFO });
    var bucketerStub;

    beforeEach(function() {
      bucketerStub = sinon.stub(bucketer, 'bucket');
      sinon.stub(mockLogger, 'log');
      decisionServiceInstance = DecisionService.createDecisionService({
        logger: mockLogger,
      });
    });

    afterEach(function() {
      bucketer.bucket.restore();
      mockLogger.log.restore();
    });

    describe('#getVariation', function() {
      it('should return the correct variation for the given experiment key and user ID for a running experiment', function() {
        bucketerStub.returns('111128'); // ID of the 'control' variation from `test_data`
        assert.strictEqual(
          'control',
          decisionServiceInstance.getVariation(configObj, 'testExperiment', 'decision_service_user')
        );
        sinon.assert.calledOnce(bucketerStub);
      });

      it('should return the whitelisted variation if the user is whitelisted', function() {
        assert.strictEqual(
          'variationWithAudience',
          decisionServiceInstance.getVariation(configObj, 'testExperimentWithAudiences', 'user2')
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
        assert.isNull(
          decisionServiceInstance.getVariation(configObj, 'testExperimentWithAudiences', 'user3', { foo: 'bar' })
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
        assert.isNull(decisionServiceInstance.getVariation(configObj, 'testExperimentNotRunning', 'user1'));
        sinon.assert.notCalled(bucketerStub);
        assert.strictEqual(1, mockLogger.log.callCount);
        assert.strictEqual(
          mockLogger.log.args[0][1],
          'DECISION_SERVICE: Experiment testExperimentNotRunning is not running.'
        );
      });

      describe('when attributes.$opt_experiment_bucket_map is supplied', function() {
        it('should respect the sticky bucketing information for attributes', function() {
          bucketerStub.returns('111128'); // ID of the 'control' variation from `test_data`
          var attributes = {
            $opt_experiment_bucket_map: {
              '111127': {
                variation_id: '111129', // ID of the 'variation' variation
              },
            },
          };

          assert.strictEqual(
            'variation',
            decisionServiceInstance.getVariation(configObj, 'testExperiment', 'decision_service_user', attributes)
          );
          sinon.assert.notCalled(bucketerStub);
        });
      });

      describe('when a user profile service is provided', function() {
        var userProfileServiceInstance = null;
        var userProfileLookupStub;
        var userProfileSaveStub;
        beforeEach(function() {
          userProfileServiceInstance = {
            lookup: function() {},
            save: function() {},
          };

          decisionServiceInstance = DecisionService.createDecisionService({
            logger: mockLogger,
            userProfileService: userProfileServiceInstance,
          });
          userProfileLookupStub = sinon.stub(userProfileServiceInstance, 'lookup');
          userProfileSaveStub = sinon.stub(userProfileServiceInstance, 'save');
          sinon.stub(decisionServiceInstance, '__getWhitelistedVariation').returns(null);
        });

        afterEach(function() {
          userProfileServiceInstance.lookup.restore();
          userProfileServiceInstance.save.restore();
          decisionServiceInstance.__getWhitelistedVariation.restore();
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

          assert.strictEqual(
            'control',
            decisionServiceInstance.getVariation(configObj, 'testExperiment', 'decision_service_user')
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
          bucketerStub.returns('111128'); // ID of the 'control' variation
          userProfileLookupStub.returns({
            user_id: 'decision_service_user',
            experiment_bucket_map: {},
          });

          assert.strictEqual(
            'control',
            decisionServiceInstance.getVariation(configObj, 'testExperiment', 'decision_service_user')
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
          bucketerStub.returns('111128'); // ID of the 'control' variation
          userProfileLookupStub.returns(null);

          assert.strictEqual(
            'control',
            decisionServiceInstance.getVariation(configObj, 'testExperiment', 'decision_service_user')
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
          bucketerStub.returns('111128'); // ID of the 'control' variation
          userProfileLookupStub.returns({
            user_id: 'decision_service_user',
            experiment_bucket_map: {
              '111127': {
                variation_id: 'not valid variation',
              },
            },
          });

          assert.strictEqual(
            'control',
            decisionServiceInstance.getVariation(configObj, 'testExperiment', 'decision_service_user')
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
          bucketerStub.returns('111128'); // ID of the 'control' variation
          userProfileLookupStub.returns({
            user_id: 'decision_service_user',
            experiment_bucket_map: {}, // no decisions for user
          });

          assert.strictEqual(
            'control',
            decisionServiceInstance.getVariation(configObj, 'testExperiment', 'decision_service_user')
          );
          sinon.assert.calledWith(userProfileLookupStub, 'decision_service_user');
          sinon.assert.calledOnce(bucketerStub);
          assert.strictEqual(4, mockLogger.log.callCount);
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
            mockLogger.log.args[3][1],
            'DECISION_SERVICE: Saved variation "control" of experiment "testExperiment" for user "decision_service_user".'
          );
        });

        it('should log an error message if "lookup" throws an error', function() {
          bucketerStub.returns('111128'); // ID of the 'control' variation
          userProfileLookupStub.throws(new Error('I am an error'));

          assert.strictEqual(
            'control',
            decisionServiceInstance.getVariation(configObj, 'testExperiment', 'decision_service_user')
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
          bucketerStub.returns('111128'); // ID of the 'control' variation
          userProfileLookupStub.returns(null);
          userProfileSaveStub.throws(new Error('I am an error'));

          assert.strictEqual(
            'control',
            decisionServiceInstance.getVariation(configObj, 'testExperiment', 'decision_service_user')
          );
          sinon.assert.calledWith(userProfileLookupStub, 'decision_service_user');
          sinon.assert.calledOnce(bucketerStub); // should still go through with bucketing

          assert.strictEqual(4, mockLogger.log.callCount);
          assert.strictEqual(
            mockLogger.log.args[0][1],
            'DECISION_SERVICE: User decision_service_user is not in the forced variation map.'
          );
          assert.strictEqual(
            mockLogger.log.args[3][1],
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

            assert.strictEqual(
              'variation',
              decisionServiceInstance.getVariation(configObj, 'testExperiment', 'decision_service_user', attributes)
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
              decisionServiceInstance.getVariation(configObj, 'testExperiment', 'decision_service_user', attributes)
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
              decisionServiceInstance.getVariation(configObj, 'testExperiment', 'decision_service_user', attributes)
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

            var attributes = {
              $opt_experiment_bucket_map: {
                '111127': {
                  variation_id: '111129', // ID of the 'variation' variation
                },
              },
            };

            assert.strictEqual(
              'variation',
              decisionServiceInstance.getVariation(configObj, 'testExperiment', 'decision_service_user', attributes)
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

    describe('__buildBucketerParams', function() {
      it('should return params object with correct properties', function() {
        var bucketerParams = decisionServiceInstance.__buildBucketerParams(
          configObj,
          'testExperiment',
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
          experimentKeyMap: configObj.experimentKeyMap,
          groupIdMap: configObj.groupIdMap,
        };

        assert.deepEqual(bucketerParams, expectedParams);

        sinon.assert.notCalled(mockLogger.log);
      });
    });

    describe('__checkIfExperimentIsActive', function() {
      it('should return true if experiment is running', function() {
        assert.isTrue(decisionServiceInstance.__checkIfExperimentIsActive(configObj, 'testExperiment'));
        sinon.assert.notCalled(mockLogger.log);
      });

      it('should return false when experiment is not running', function() {
        assert.isFalse(decisionServiceInstance.__checkIfExperimentIsActive(configObj, 'testExperimentNotRunning'));
        sinon.assert.calledOnce(mockLogger.log);
        var logMessage = mockLogger.log.args[0][1];
        assert.strictEqual(
          logMessage,
          sprintf(LOG_MESSAGES.EXPERIMENT_NOT_RUNNING, 'DECISION_SERVICE', 'testExperimentNotRunning')
        );
      });
    });

    describe('__checkIfUserIsInAudience', function() {
      var __audienceEvaluateSpy;

      beforeEach(function() {
        __audienceEvaluateSpy = sinon.spy(AudienceEvaluator.prototype, 'evaluate');
      });

      afterEach(function() {
        __audienceEvaluateSpy.restore();
      });

      it('should return true when audience conditions are met', function() {
        assert.isTrue(
          decisionServiceInstance.__checkIfUserIsInAudience(configObj, 'testExperimentWithAudiences', 'testUser', {
            browser_type: 'firefox',
          })
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

      it('should return true when experiment has no audience', function() {
        assert.isTrue(decisionServiceInstance.__checkIfUserIsInAudience(configObj, 'testExperiment', 'testUser'));
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

      it('should return false when audience conditions can not be evaluated', function() {
        assert.isFalse(
          decisionServiceInstance.__checkIfUserIsInAudience(configObj, 'testExperimentWithAudiences', 'testUser')
        );
        assert.isTrue(__audienceEvaluateSpy.alwaysReturned(false));

        assert.strictEqual(3, mockLogger.log.callCount);
        assert.strictEqual(
          mockLogger.log.args[0][1],
          'DECISION_SERVICE: Evaluating audiences for experiment "testExperimentWithAudiences": ["11154"].'
        );
        assert.strictEqual(
          mockLogger.log.args[1][1],
          'DECISION_SERVICE: Audiences for experiment testExperimentWithAudiences collectively evaluated to FALSE.'
        );
        assert.strictEqual(
          mockLogger.log.args[2][1],
          'DECISION_SERVICE: User testUser does not meet conditions to be in experiment testExperimentWithAudiences.'
        );
      });

      it('should return false when audience conditions are not met', function() {
        assert.isFalse(
          decisionServiceInstance.__checkIfUserIsInAudience(configObj, 'testExperimentWithAudiences', 'testUser', {
            browser_type: 'chrome',
          })
        );
        assert.isTrue(__audienceEvaluateSpy.alwaysReturned(false));

        assert.strictEqual(3, mockLogger.log.callCount);
        assert.strictEqual(
          mockLogger.log.args[0][1],
          'DECISION_SERVICE: Evaluating audiences for experiment "testExperimentWithAudiences": ["11154"].'
        );
        assert.strictEqual(
          mockLogger.log.args[1][1],
          'DECISION_SERVICE: Audiences for experiment testExperimentWithAudiences collectively evaluated to FALSE.'
        );
        assert.strictEqual(
          mockLogger.log.args[2][1],
          'DECISION_SERVICE: User testUser does not meet conditions to be in experiment testExperimentWithAudiences.'
        );
      });
    });

    describe('__getWhitelistedVariation', function() {
      it('should return forced variation ID if forced variation is provided for the user ID', function() {
        var testExperiment = configObj.experimentKeyMap['testExperiment'];
        var expectedVariation = configObj.variationIdMap['111128'];
        assert.strictEqual(
          decisionServiceInstance.__getWhitelistedVariation(testExperiment, 'user1'),
          expectedVariation
        );
      });

      it('should return null if forced variation is not provided for the user ID', function() {
        var testExperiment = configObj.experimentKeyMap['testExperiment'];
        assert.isNull(decisionServiceInstance.__getWhitelistedVariation(testExperiment, 'notInForcedVariations'));
      });
    });

    describe('getForcedVariation', function() {
      it('should return null for valid experimentKey, not set', function() {
        var variation = decisionServiceInstance.getForcedVariation(configObj, 'testExperiment', 'user1');
        assert.strictEqual(variation, null);
      });

      it('should return null for invalid experimentKey, not set', function() {
        var variation = decisionServiceInstance.getForcedVariation(configObj, 'definitely_not_valid_exp_key', 'user1');
        assert.strictEqual(variation, null);
      });

      it('should return null for invalid experimentKey when a variation was previously successfully forced on another experiment for the same user', function() {
        decisionServiceInstance.setForcedVariation(configObj, 'testExperiment', 'user1', 'control');
        var variation = decisionServiceInstance.getForcedVariation(configObj, 'definitely_not_valid_exp_key', 'user1');
        assert.strictEqual(variation, null);
      });

      it('should return null for valid experiment key, not set on this experiment key, but set on another experiment key', function() {
        decisionServiceInstance.setForcedVariation(configObj, 'testExperiment', 'user1', 'control');
        var variation = decisionServiceInstance.getForcedVariation(configObj, 'testExperimentLaunched', 'user1');
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
        var variation = decisionServiceInstance.getForcedVariation(configObj, 'testExperiment', 'user1');
        assert.strictEqual(variation, 'control');
      });

      it('should not set for an invalid variation key', function() {
        decisionServiceInstance.setForcedVariation(
          configObj,
          'testExperiment',
          'user1',
          'definitely_not_valid_variation_key'
        );
        var variation = decisionServiceInstance.getForcedVariation(configObj, 'testExperiment', 'user1');
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

        var variation = decisionServiceInstance.getForcedVariation(configObj, 'testExperiment', 'user1');
        assert.strictEqual(variation, 'control');

        var didSetVariationAgain = decisionServiceInstance.setForcedVariation(
          configObj,
          'testExperiment',
          'user1',
          null
        );
        assert.strictEqual(didSetVariationAgain, true);

        var variation = decisionServiceInstance.getForcedVariation(configObj, 'testExperiment', 'user1');
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

        var variation = decisionServiceInstance.getForcedVariation(configObj, 'testExperiment', 'user1');
        var variation2 = decisionServiceInstance.getForcedVariation(configObj, 'testExperimentLaunched', 'user1');

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

        var variationControl = decisionServiceInstance.getForcedVariation(configObj, 'testExperiment', 'user1');
        var variationVariation = decisionServiceInstance.getForcedVariation(configObj, 'testExperiment', 'user2');

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

        var variation = decisionServiceInstance.getForcedVariation(configObj, 'testExperiment', 'user1');
        var variation2 = decisionServiceInstance.getForcedVariation(configObj, 'testExperimentLaunched', 'user1');

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

        var variation = decisionServiceInstance.getForcedVariation(configObj, 'testExperiment', 'user1');
        var variation2 = decisionServiceInstance.getForcedVariation(configObj, 'testExperimentLaunched', 'user1');

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

        var variation = decisionServiceInstance.getForcedVariation(configObj, 'testExperiment', 'user1');
        var variation2 = decisionServiceInstance.getForcedVariation(configObj, 'testExperimentLaunched', 'user1');

        assert.strictEqual(variation, 'control');
        assert.strictEqual(variation2, 'controlLaunched');

        //reset for one of the experiments
        decisionServiceInstance.setForcedVariation(configObj, 'testExperiment', 'user1', null);
        assert.strictEqual(didSetVariation, true);

        var variation = decisionServiceInstance.getForcedVariation(configObj, 'testExperiment', 'user1');
        var variation2 = decisionServiceInstance.getForcedVariation(configObj, 'testExperimentLaunched', 'user1');

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
        var forcedVar = decisionServiceInstance.getForcedVariation(newConfigObj, 'testExperiment', 'user1');
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
        var forcedVar = decisionServiceInstance.getForcedVariation(newConfigObj, 'testExperiment', 'user1');
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
        );
        assert.strictEqual(variation, null);
      });
    });
  });

  // TODO: Move tests that test methods of Optimizely to lib/optimizely/index.tests.js
  describe('when a bucketingID is provided', function() {
    var configObj = projectConfig.createProjectConfig(cloneDeep(testData));
    var createdLogger = logger.createLogger({
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
        eventBuilder: eventBuilder,
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

      var decisionServiceInstance = DecisionService.createDecisionService({
        logger: createdLogger,
        userProfileService: userProfileServiceInstance,
      });

      assert.strictEqual(
        'control',
        decisionServiceInstance.getVariation(configObj, 'testExperiment', 'test_user', userAttributesWithBucketingId)
      );
      sinon.assert.calledWithExactly(userProfileLookupStub, 'test_user');
    });
  });

  describe('_getBucketingId', function() {
    var configObj;
    var decisionService;
    var mockLogger = logger.createLogger({ logLevel: LOG_LEVEL.INFO });
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
      decisionService = DecisionService.createDecisionService({
        logger: mockLogger,
      });
    });

    afterEach(function() {
      mockLogger.log.restore();
    });

    it('should return userId if bucketingId is not defined in user attributes', function() {
      assert.strictEqual(userId, decisionService._getBucketingId(userId, null));
      assert.strictEqual(userId, decisionService._getBucketingId(userId, { browser_type: 'safari' }));
    });

    it('should log warning in case of invalid bucketingId', function() {
      assert.strictEqual(userId, decisionService._getBucketingId(userId, userAttributesWithInvalidBucketingId));
      assert.strictEqual(1, mockLogger.log.callCount);
      assert.strictEqual(
        mockLogger.log.args[0][1],
        'DECISION_SERVICE: BucketingID attribute is not a string. Defaulted to userId'
      );
    });

    it('should return correct bucketingId when provided in attributes', function() {
      assert.strictEqual('123456789', decisionService._getBucketingId(userId, userAttributesWithBucketingId));
      assert.strictEqual(1, mockLogger.log.callCount);
      assert.strictEqual(mockLogger.log.args[0][1], 'DECISION_SERVICE: BucketingId is valid: "123456789"');
    });
  });

  describe('feature management', function() {
    describe('#getVariationForFeature', function() {
      var configObj;
      var decisionServiceInstance;
      var sandbox;
      var mockLogger = logger.createLogger({ logLevel: LOG_LEVEL.INFO });
      beforeEach(function() {
        configObj = projectConfig.createProjectConfig(cloneDeep(testDataWithFeatures));
        sandbox = sinon.sandbox.create();
        sandbox.stub(mockLogger, 'log');
        decisionServiceInstance = DecisionService.createDecisionService({
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
            getVariationStub.withArgs(configObj, 'testing_my_feature', 'user1').returns('variation');
          });

          it('returns a decision with a variation in the experiment the feature is attached to', function() {
            var decision = decisionServiceInstance.getVariationForFeature(configObj, feature, 'user1', {
              test_attribute: 'test_value',
            });
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
              mockLogger.log,
              LOG_LEVEL.DEBUG,
              'DECISION_SERVICE: User user1 is in variation variation of experiment testing_my_feature on the feature test_feature_for_experiment.'
            );
            sinon.assert.calledWithExactly(getVariationStub, configObj, 'testing_my_feature', 'user1', {
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

          it('returns a decision with no variation and source rollout', function() {
            var decision = decisionServiceInstance.getVariationForFeature(configObj, feature, 'user1');
            var expectedDecision = {
              experiment: null,
              variation: null,
              decisionSource: DECISION_SOURCES.ROLLOUT,
            };
            assert.deepEqual(decision, expectedDecision);
            sinon.assert.calledWithExactly(
              mockLogger.log,
              LOG_LEVEL.DEBUG,
              'DECISION_SERVICE: User user1 is not in any experiment on the feature test_feature_for_experiment.'
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
            getVariationStub = sandbox.stub(decisionServiceInstance, 'getVariation');
            getVariationStub.returns(null);
            getVariationStub.withArgs(configObj, 'exp_with_group', 'user1').returns('var');
          });

          it('returns a decision with a variation in an experiment in a group', function() {
            var decision = decisionServiceInstance.getVariationForFeature(configObj, feature, 'user1');
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
            sinon.assert.calledWithExactly(
              mockLogger.log,
              LOG_LEVEL.DEBUG,
              'DECISION_SERVICE: User user1 is in variation var of experiment exp_with_group on the feature feature_with_group.'
            );
          });
        });

        describe('user not bucketed into an experiment in the group', function() {
          var getVariationStub;
          beforeEach(function() {
            getVariationStub = sandbox.stub(decisionServiceInstance, 'getVariation');
            getVariationStub.returns(null);
          });

          it('returns a decision with no experiment, no variation and source rollout', function() {
            var decision = decisionServiceInstance.getVariationForFeature(configObj, feature, 'user1');
            var expectedDecision = {
              experiment: null,
              variation: null,
              decisionSource: DECISION_SOURCES.ROLLOUT,
            };
            assert.deepEqual(decision, expectedDecision);
            sinon.assert.calledWithExactly(
              mockLogger.log,
              LOG_LEVEL.DEBUG,
              'DECISION_SERVICE: User user1 is not in any experiment on the feature feature_with_group.'
            );
          });

          it('returns null decision for group experiment not referenced by the feature', function() {
            var noTrafficExpFeature = configObj.featureKeyMap.feature_exp_no_traffic;
            var decision = decisionServiceInstance.getVariationForFeature(configObj, noTrafficExpFeature, 'user1');
            var expectedDecision = {
              experiment: null,
              variation: null,
              decisionSource: DECISION_SOURCES.ROLLOUT,
            };
            assert.deepEqual(decision, expectedDecision);
            sinon.assert.calledWithExactly(
              mockLogger.log,
              LOG_LEVEL.DEBUG,
              'DECISION_SERVICE: User user1 is not in any experiment on the feature feature_exp_no_traffic.'
            );
          });
        });

        describe('user not bucketed into the group', function() {
          var bucketUserIntoExperimentStub;
          beforeEach(function() {
            bucketUserIntoExperimentStub = sandbox.stub(bucketer, 'bucketUserIntoExperiment');
            bucketUserIntoExperimentStub.returns(null);
          });

          it('returns a decision with no experiment, no variation and source rollout', function() {
            var decision = decisionServiceInstance.getVariationForFeature(configObj, feature, 'user1');
            var expectedDecision = {
              experiment: null,
              variation: null,
              decisionSource: DECISION_SOURCES.ROLLOUT,
            };
            assert.deepEqual(decision, expectedDecision);
            sinon.assert.calledWithExactly(
              mockLogger.log,
              LOG_LEVEL.DEBUG,
              'DECISION_SERVICE: User user1 is not in any experiment on the feature feature_with_group.'
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
            bucketStub.returns('594032'); // ID of variation in rollout experiment - audience targeting rule for 'test_audience'
          });

          it('returns a decision with a variation and experiment from the audience targeting rule', function() {
            var attributes = { test_attribute: 'test_value' };
            var decision = decisionServiceInstance.getVariationForFeature(configObj, feature, 'user1', attributes);
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
            bucketStub.returns('594038'); // ID of variation in rollout experiment - everyone else targeting rule
          });

          it('returns a decision with a variation and experiment from the everyone else targeting rule', function() {
            var attributes = {};
            var decision = decisionServiceInstance.getVariationForFeature(configObj, feature, 'user1', attributes);
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
            bucketStub.returns(null);
          });

          it('returns a decision with no variation, no experiment and source rollout', function() {
            var decision = decisionServiceInstance.getVariationForFeature(configObj, feature, 'user1');
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
            bucketStub.returns(null); // returns no variation for other calls
            bucketStub
              .withArgs(
                sinon.match({
                  experimentKey: '594037',
                })
              )
              .returns('594038'); // returns variation from everyone else targeitng rule when called with everyone else experiment key;
          });

          it('returns a decision with a variation and experiment from the everyone else targeting rule', function() {
            var attributes = { test_attribute: 'test_value' };
            var decision = decisionServiceInstance.getVariationForFeature(configObj, feature, 'user1', attributes);
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
          var decision = decisionServiceInstance.getVariationForFeature(configObj, feature, 'user1');
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
            'DECISION_SERVICE: User user1 is not in any experiment on the feature shared_feature.'
          );
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
          var decision = decisionServiceInstance.getVariationForFeature(configObj, feature, 'user1');
          var expectedDecision = {
            experiment: null,
            variation: null,
            decisionSource: DECISION_SOURCES.ROLLOUT,
          };
          var expectedDecision = assert.deepEqual(decision, expectedDecision);
          sinon.assert.calledWithExactly(
            mockLogger.log,
            LOG_LEVEL.DEBUG,
            'DECISION_SERVICE: Feature unused_flag is not attached to any experiments.'
          );
          sinon.assert.calledWithExactly(
            mockLogger.log,
            LOG_LEVEL.DEBUG,
            'DECISION_SERVICE: User user1 is not in any experiment on the feature unused_flag.'
          );
          sinon.assert.calledWithExactly(
            mockLogger.log,
            LOG_LEVEL.DEBUG,
            'DECISION_SERVICE: There is no rollout of feature unused_flag.'
          );
        });
      });
    });

    describe('_getVariationForRollout', function() {
      var feature;
      var configObj;
      var decisionService;
      var __buildBucketerParamsSpy;

      beforeEach(function() {
        configObj = projectConfig.createProjectConfig(cloneDeep(testDataWithFeatures));
        feature = configObj.featureKeyMap.test_feature;
        decisionService = DecisionService.createDecisionService({
          logger: logger.createLogger({ logLevel: LOG_LEVEL.INFO }),
        });
        __buildBucketerParamsSpy = sinon.spy(decisionService, '__buildBucketerParams');
      });

      afterEach(function() {
        __buildBucketerParamsSpy.restore();
      });

      it('should call __buildBucketerParams with user Id when bucketing Id is not provided in the attributes', function() {
        var attributes = { test_attribute: 'test_value' };
        decisionService._getVariationForRollout(configObj, feature, 'testUser', attributes);

        sinon.assert.callCount(__buildBucketerParamsSpy, 2);
        sinon.assert.calledWithExactly(__buildBucketerParamsSpy, configObj, '594031', 'testUser', 'testUser');
        sinon.assert.calledWithExactly(__buildBucketerParamsSpy, configObj, '594037', 'testUser', 'testUser');
      });

      it('should call __buildBucketerParams with bucketing Id when bucketing Id is provided in the attributes', function() {
        var attributes = {
          test_attribute: 'test_value',
          $opt_bucketing_id: 'abcdefg',
        };
        decisionService._getVariationForRollout(configObj, feature, 'testUser', attributes);

        sinon.assert.callCount(__buildBucketerParamsSpy, 2);
        sinon.assert.calledWithExactly(__buildBucketerParamsSpy, configObj, '594031', 'abcdefg', 'testUser');
        sinon.assert.calledWithExactly(__buildBucketerParamsSpy, configObj, '594037', 'abcdefg', 'testUser');
      });
    });
  });
});
