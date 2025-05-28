/**
 * Copyright 2017-2022, 2024-2025, Optimizely
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
import cloneDeep from 'lodash/cloneDeep';
import { sprintf } from '../../utils/fns';

import { createDecisionService } from './';
import * as bucketer from '../bucketer';
import * as bucketValueGenerator from '../bucketer/bucket_value_generator';
import {
  LOG_LEVEL,
  DECISION_SOURCES,
} from '../../utils/enums';
import { getForwardingEventProcessor } from '../../event_processor/event_processor_factory';
import { createNotificationCenter } from '../../notification_center';
import Optimizely from '../../optimizely';
import OptimizelyUserContext from '../../optimizely_user_context';
import projectConfig, { createProjectConfig } from '../../project_config/project_config';
import AudienceEvaluator from '../audience_evaluator';
import eventDispatcher from '../../event_processor/event_dispatcher/default_dispatcher.browser';
import * as jsonSchemaValidator from '../../utils/json_schema_validator';
import { getMockProjectConfigManager } from '../../tests/mock/mock_project_config_manager';
import { Value } from '../../utils/promise/operation_value';

import {
  getTestProjectConfig,
  getTestProjectConfigWithFeatures,
} from '../../tests/test_data';

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

var testData = getTestProjectConfig();
var testDataWithFeatures = getTestProjectConfigWithFeatures();
var buildLogMessageFromArgs = args => sprintf(args[1], ...args.splice(2));

var createLogger = () => ({
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  child: () => createLogger(),
})

describe('lib/core/decision_service', function() {
  describe('APIs', function() {
    var configObj = projectConfig.createProjectConfig(cloneDeep(testData));
    var decisionServiceInstance;
    var mockLogger = createLogger({ logLevel: LOG_LEVEL.INFO });
    var bucketerStub;
    var experiment;
    var user;

    beforeEach(function() {
      bucketerStub = sinon.stub(bucketer, 'bucket');
      sinon.stub(mockLogger, 'info');
      sinon.stub(mockLogger, 'debug');
      sinon.stub(mockLogger, 'warn');
      sinon.stub(mockLogger, 'error');

      decisionServiceInstance = createDecisionService({
        logger: mockLogger,
      });
    });

    afterEach(function() {
      bucketer.bucket.restore();
      mockLogger.debug.restore();
      mockLogger.info.restore();
      mockLogger.warn.restore();
      mockLogger.error.restore();
    });

    describe('#getVariation', function() {
      it('should return the correct variation for the given experiment key and user ID for a running experiment', function() {
        user = new OptimizelyUserContext({
          shouldIdentifyUser: false,
          optimizely: {},
          userId: 'tester'
        });
        var fakeDecisionResponse = {
          result: '111128',
          reasons: [],
        };
        experiment = configObj.experimentIdMap['111127'];
        bucketerStub.returns(fakeDecisionResponse); // contains variation ID of the 'control' variation from `test_data`
        assert.strictEqual(
          'control',
          decisionServiceInstance.getVariation(configObj, experiment, user).result
        );
        sinon.assert.calledOnce(bucketerStub);
      });

      it('should return the whitelisted variation if the user is whitelisted', function() {
        user = new OptimizelyUserContext({
          shouldIdentifyUser: false,
          optimizely: {},
          userId: 'user2'
        });
        experiment = configObj.experimentIdMap['122227'];
        assert.strictEqual(
          'variationWithAudience',
          decisionServiceInstance.getVariation(configObj, experiment, user).result
        );
        sinon.assert.notCalled(bucketerStub);
        assert.strictEqual(1, mockLogger.debug.callCount);
        assert.strictEqual(1, mockLogger.info.callCount);

        assert.deepEqual(mockLogger.debug.args[0], [USER_HAS_NO_FORCED_VARIATION, 'user2']);

        assert.deepEqual(mockLogger.info.args[0], [USER_FORCED_IN_VARIATION, 'user2', 'variationWithAudience']);
      });

      it('should return null if the user does not meet audience conditions', function() {
        user = new OptimizelyUserContext({
          shouldIdentifyUser: false,
          optimizely: {},
          userId: 'user3'
        });
        experiment = configObj.experimentIdMap['122227'];
        assert.isNull(
          decisionServiceInstance.getVariation(configObj, experiment, user, { foo: 'bar' }).result
        );

        assert.deepEqual(mockLogger.debug.args[0], [USER_HAS_NO_FORCED_VARIATION, 'user3']);

        assert.deepEqual(mockLogger.debug.args[1], [EVALUATING_AUDIENCES_COMBINED, 'experiment', 'testExperimentWithAudiences', JSON.stringify(["11154"])]);

        assert.deepEqual(mockLogger.info.args[0], [AUDIENCE_EVALUATION_RESULT_COMBINED, 'experiment', 'testExperimentWithAudiences', 'FALSE']);

        assert.deepEqual(mockLogger.info.args[1], [USER_NOT_IN_EXPERIMENT, 'user3', 'testExperimentWithAudiences']);
      });

      it('should return null if the experiment is not running', function() {
        user = new OptimizelyUserContext({
          shouldIdentifyUser: false,
          optimizely: {},
          userId: 'user1'
        });
        experiment = configObj.experimentIdMap['133337'];
        assert.isNull(decisionServiceInstance.getVariation(configObj, experiment, user).result);
        sinon.assert.notCalled(bucketerStub);
        assert.strictEqual(1, mockLogger.info.callCount);

        assert.deepEqual(mockLogger.info.args[0], [EXPERIMENT_NOT_RUNNING, 'testExperimentNotRunning']);
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
          user = new OptimizelyUserContext({
            shouldIdentifyUser: false,
            optimizely: {},
            userId: 'decision_service_user',
            attributes,
          });

          assert.strictEqual(
            'variation',
            decisionServiceInstance.getVariation(configObj, experiment, user).result
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
          user = new OptimizelyUserContext({
            shouldIdentifyUser: false,
            optimizely: {},
            userId: 'decision_service_user',
          });

          assert.strictEqual(
            'control',
            decisionServiceInstance.getVariation(configObj, experiment, user).result
          );
          sinon.assert.calledWith(userProfileLookupStub, 'decision_service_user');
          sinon.assert.notCalled(bucketerStub);

          assert.deepEqual(mockLogger.debug.args[0], [USER_HAS_NO_FORCED_VARIATION, 'decision_service_user']);

          assert.deepEqual(mockLogger.info.args[0], [RETURNING_STORED_VARIATION, 'control', 'testExperiment', 'decision_service_user']);
        });

        it('should bucket if there was no prevously bucketed variation', function() {
          bucketerStub.returns(fakeDecisionResponse); // ID of the 'control' variation
          userProfileLookupStub.returns({
            user_id: 'decision_service_user',
            experiment_bucket_map: {},
          });
          experiment = configObj.experimentIdMap['111127'];
          user = new OptimizelyUserContext({
            shouldIdentifyUser: false,
            optimizely: {},
            userId: 'decision_service_user',
          });

          assert.strictEqual(
            'control',
            decisionServiceInstance.getVariation(configObj, experiment, user).result
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
          user = new OptimizelyUserContext({
            shouldIdentifyUser: false,
            optimizely: {},
            userId: 'decision_service_user',
          });
          assert.strictEqual(
            'control',
            decisionServiceInstance.getVariation(configObj, experiment, user).result
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
          user = new OptimizelyUserContext({
            shouldIdentifyUser: false,
            optimizely: {},
            userId: 'decision_service_user',
          });
          assert.strictEqual(
            'control',
            decisionServiceInstance.getVariation(configObj, experiment, user).result
          );
          sinon.assert.calledWith(userProfileLookupStub, 'decision_service_user');
          sinon.assert.calledOnce(bucketerStub);
          // assert.strictEqual(
          //   buildLogMessageFromArgs(mockLogger.log.args[0]),
          //   'DECISION_SERVICE: User decision_service_user is not in the forced variation map.'
          // );
          assert.deepEqual(mockLogger.debug.args[0], [USER_HAS_NO_FORCED_VARIATION, 'decision_service_user']);

          sinon.assert.calledWith(
            mockLogger.info,
            SAVED_VARIATION_NOT_FOUND,
            'decision_service_user',
            'not valid variation',
            'testExperiment'
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
          user = new OptimizelyUserContext({
            shouldIdentifyUser: false,
            optimizely: {},
            userId: 'decision_service_user',
          });
          experiment = configObj.experimentIdMap['111127'];

          assert.strictEqual(
            'control',
            decisionServiceInstance.getVariation(configObj, experiment, user).result
          );
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


          assert.deepEqual(mockLogger.debug.args[0], [USER_HAS_NO_FORCED_VARIATION, 'decision_service_user']);

          assert.deepEqual(mockLogger.info.lastCall.args, [SAVED_USER_VARIATION, 'decision_service_user']);
        });

        it('should log an error message if "lookup" throws an error', function() {
          bucketerStub.returns(fakeDecisionResponse); // ID of the 'control' variation
          userProfileLookupStub.throws(new Error('I am an error'));
          experiment = configObj.experimentIdMap['111127'];
          user = new OptimizelyUserContext({
            shouldIdentifyUser: false,
            optimizely: {},
            userId: 'decision_service_user',
          });

          assert.strictEqual(
            'control',
            decisionServiceInstance.getVariation(configObj, experiment, user).result
          );
          sinon.assert.calledWith(userProfileLookupStub, 'decision_service_user');
          sinon.assert.calledOnce(bucketerStub); // should still go through with bucketing

          assert.deepEqual(mockLogger.error.args[0], [USER_PROFILE_LOOKUP_ERROR, 'decision_service_user', 'I am an error']);

          assert.deepEqual(mockLogger.debug.args[0], [USER_HAS_NO_FORCED_VARIATION, 'decision_service_user']);
        });

        it('should log an error message if "save" throws an error', function() {
          bucketerStub.returns(fakeDecisionResponse); // ID of the 'control' variation
          userProfileLookupStub.returns(null);
          userProfileSaveStub.throws(new Error('I am an error'));
          experiment = configObj.experimentIdMap['111127'];
          user = new OptimizelyUserContext({
            shouldIdentifyUser: false,
            optimizely: {},
            userId: 'decision_service_user',
          });
          assert.strictEqual(
            'control',
            decisionServiceInstance.getVariation(configObj, experiment, user).result
          );
          sinon.assert.calledWith(userProfileLookupStub, 'decision_service_user');
          sinon.assert.calledOnce(bucketerStub); // should still go through with bucketing


          assert.deepEqual(mockLogger.debug.args[0], [USER_HAS_NO_FORCED_VARIATION, 'decision_service_user']);

          assert.deepEqual(mockLogger.error.args[0], [USER_PROFILE_SAVE_ERROR, 'decision_service_user', 'I am an error']);

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

            user = new OptimizelyUserContext({
              shouldIdentifyUser: false,
              optimizely: {},
              userId: 'decision_service_user',
              attributes,
            });

            assert.strictEqual(
              'variation',
              decisionServiceInstance.getVariation(configObj, experiment, user).result
            );
            sinon.assert.calledWith(userProfileLookupStub, 'decision_service_user');
            sinon.assert.notCalled(bucketerStub);

            assert.deepEqual(mockLogger.debug.args[0], [USER_HAS_NO_FORCED_VARIATION, 'decision_service_user']);

            assert.deepEqual(mockLogger.info.args[0], [RETURNING_STORED_VARIATION, 'variation', 'testExperiment', 'decision_service_user']);
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

            user = new OptimizelyUserContext({
              shouldIdentifyUser: false,
              optimizely: {},
              userId: 'decision_service_user',
              attributes,
            });

            assert.strictEqual(
              'control',
              decisionServiceInstance.getVariation(configObj, experiment, user).result
            );
            sinon.assert.calledWith(userProfileLookupStub, 'decision_service_user');
            sinon.assert.notCalled(bucketerStub);

            assert.deepEqual(mockLogger.debug.args[0], [USER_HAS_NO_FORCED_VARIATION, 'decision_service_user']);

            assert.deepEqual(mockLogger.info.args[0], [RETURNING_STORED_VARIATION, 'control', 'testExperiment', 'decision_service_user']);
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

            user = new OptimizelyUserContext({
              shouldIdentifyUser: false,
              optimizely: {},
              userId: 'decision_service_user',
              attributes,
            });

            assert.strictEqual(
              'variation',
              decisionServiceInstance.getVariation(configObj, experiment, user).result
            );
            sinon.assert.calledWith(userProfileLookupStub, 'decision_service_user');
            sinon.assert.notCalled(bucketerStub);

            assert.deepEqual(mockLogger.debug.args[0], [USER_HAS_NO_FORCED_VARIATION, 'decision_service_user']);

            assert.deepEqual(mockLogger.info.args[0], [RETURNING_STORED_VARIATION, 'variation', 'testExperiment', 'decision_service_user']);
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

            user = new OptimizelyUserContext({
              shouldIdentifyUser: false,
              optimizely: {},
              userId: 'decision_service_user',
              attributes,
            });

            assert.strictEqual(
              'variation',
              decisionServiceInstance.getVariation(configObj, experiment, user).result
            );
            sinon.assert.calledWith(userProfileLookupStub, 'decision_service_user');
            sinon.assert.notCalled(bucketerStub);

            assert.deepEqual(mockLogger.debug.args[0], [USER_HAS_NO_FORCED_VARIATION, 'decision_service_user']);

            assert.deepEqual(mockLogger.info.args[0], [RETURNING_STORED_VARIATION, 'variation', 'testExperiment', 'decision_service_user']);
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
            { getAttributes: () => ({ browser_type: 'firefox' }) },
            ''
          ).result
        );

        assert.deepEqual(mockLogger.debug.args[0], [EVALUATING_AUDIENCES_COMBINED, 'experiment', 'testExperimentWithAudiences', JSON.stringify(["11154"])]);

        assert.deepEqual(mockLogger.info.args[0], [AUDIENCE_EVALUATION_RESULT_COMBINED, 'experiment', 'testExperimentWithAudiences', 'TRUE']);
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

        assert.deepEqual(mockLogger.debug.args[0], [EVALUATING_AUDIENCES_COMBINED, 'experiment', 'testExperiment', JSON.stringify([])]);

        assert.deepEqual(mockLogger.info.args[0], [AUDIENCE_EVALUATION_RESULT_COMBINED, 'experiment', 'testExperiment', 'TRUE']);
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

        assert.deepEqual(mockLogger.debug.args[0], [EVALUATING_AUDIENCES_COMBINED, 'experiment', 'testExperimentWithAudiences', JSON.stringify(["11154"])]);

        assert.deepEqual(mockLogger.info.args[0], [AUDIENCE_EVALUATION_RESULT_COMBINED, 'experiment', 'testExperimentWithAudiences', 'FALSE']);
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


        assert.deepEqual(mockLogger.debug.args[0], [EVALUATING_AUDIENCES_COMBINED, 'experiment', 'testExperimentWithAudiences', JSON.stringify(["11154"])]);

        assert.deepEqual(mockLogger.info.args[0], [AUDIENCE_EVALUATION_RESULT_COMBINED, 'experiment', 'testExperimentWithAudiences', 'FALSE']);
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
        assert.strictEqual(variation, 'control' );

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
        var didSetVariation1 = decisionServiceInstance.setForcedVariation(
          configObj,
          'testExperiment',
          'user1',
          'control'
        );
        assert.strictEqual(didSetVariation1, true);

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
        var didSetVariation1 = decisionServiceInstance.setForcedVariation(
          configObj,
          'testExperiment',
          'user1',
          'control'
        );
        assert.strictEqual(didSetVariation1, true);

        var didSetVariation2 = decisionServiceInstance.setForcedVariation(
          configObj,
          'testExperiment',
          'user2',
          'variation'
        );
        assert.strictEqual(didSetVariation2, true);

        var variationControl = decisionServiceInstance.getForcedVariation(configObj, 'testExperiment', 'user1').result;
        var variationVariation = decisionServiceInstance.getForcedVariation(configObj, 'testExperiment', 'user2').result;

        assert.strictEqual(variationControl, 'control');
        assert.strictEqual(variationVariation, 'variation');
      });

      it('should be able to reset a variation for a user with multiple experiments', function() {
        //set the first time
        var didSetVariation1 = decisionServiceInstance.setForcedVariation(
          configObj,
          'testExperiment',
          'user1',
          'control'
        );
        assert.strictEqual(didSetVariation1, true);

        var didSetVariation2 = decisionServiceInstance.setForcedVariation(
          configObj,
          'testExperimentLaunched',
          'user1',
          'controlLaunched'
        );
        assert.strictEqual(didSetVariation2, true);

        let variation1 = decisionServiceInstance.getForcedVariation(configObj, 'testExperiment', 'user1').result;
        let variation2 = decisionServiceInstance.getForcedVariation(configObj, 'testExperimentLaunched', 'user1').result;

        assert.strictEqual(variation1, 'control');
        assert.strictEqual(variation2, 'controlLaunched');

        //reset for one of the experiments
        var didSetVariationAgain = decisionServiceInstance.setForcedVariation(
          configObj,
          'testExperiment',
          'user1',
          'variation'
        );
        assert.strictEqual(didSetVariationAgain, true);

        variation1 = decisionServiceInstance.getForcedVariation(configObj, 'testExperiment', 'user1').result;
        variation2 = decisionServiceInstance.getForcedVariation(configObj, 'testExperimentLaunched', 'user1').result;

        assert.strictEqual(variation1, 'variation');
        assert.strictEqual(variation2, 'controlLaunched');
      });

      it('should be able to unset a variation for a user with multiple experiments', function() {
        //set the first time
        var didSetVariation1 = decisionServiceInstance.setForcedVariation(
          configObj,
          'testExperiment',
          'user1',
          'control'
        );
        assert.strictEqual(didSetVariation1, true);

        var didSetVariation2 = decisionServiceInstance.setForcedVariation(
          configObj,
          'testExperimentLaunched',
          'user1',
          'controlLaunched'
        );
        assert.strictEqual(didSetVariation2, true);

        let variation1 = decisionServiceInstance.getForcedVariation(configObj, 'testExperiment', 'user1').result;
        let variation2 = decisionServiceInstance.getForcedVariation(configObj, 'testExperimentLaunched', 'user1').result;

        assert.strictEqual(variation1, 'control');
        assert.strictEqual(variation2, 'controlLaunched');

        //reset for one of the experiments
        decisionServiceInstance.setForcedVariation(configObj, 'testExperiment', 'user1', null);
        assert.strictEqual(didSetVariation1, true);

        variation1 = decisionServiceInstance.getForcedVariation(configObj, 'testExperiment', 'user1').result;
        variation2 = decisionServiceInstance.getForcedVariation(configObj, 'testExperimentLaunched', 'user1').result;

        assert.strictEqual(variation1, null);
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
    var user;
    beforeEach(function() {
      optlyInstance = new Optimizely({
        clientEngine: 'node-sdk',
        projectConfigManager: getMockProjectConfigManager({
          initConfig: createProjectConfig(cloneDeep(testData))
        }),
        jsonSchemaValidator: jsonSchemaValidator,
        isValidInstance: true,
        logger: createdLogger,
        eventProcessor: getForwardingEventProcessor(eventDispatcher),
        notificationCenter: createNotificationCenter(createdLogger),
      });

      sinon.stub(eventDispatcher, 'dispatchEvent');
    });

    afterEach(function() {
      eventDispatcher.dispatchEvent.restore();
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
      user = new OptimizelyUserContext({
        shouldIdentifyUser: false,
        optimizely: {},
        userId: 'test_user',
        attributes: userAttributesWithBucketingId,
      });
      var experiment = configObj.experimentIdMap['111127'];

      var decisionServiceInstance = createDecisionService({
        logger: createdLogger,
        userProfileService: userProfileServiceInstance,
      });

      assert.strictEqual(
        'control',
        decisionServiceInstance.getVariation(configObj, experiment, user).result
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
      sinon.stub(mockLogger, 'debug');
      sinon.stub(mockLogger, 'info');
      sinon.stub(mockLogger, 'warn');
      sinon.stub(mockLogger, 'error');

      configObj = projectConfig.createProjectConfig(cloneDeep(testData));
      decisionService = createDecisionService({
        logger: mockLogger,
      });
    });

    afterEach(function() {
      mockLogger.debug.restore();
      mockLogger.info.restore();
      mockLogger.warn.restore();
      mockLogger.error.restore();
    });

    it('should return userId if bucketingId is not defined in user attributes', function() {
      assert.strictEqual(userId, decisionService.getBucketingId(userId, null));
      assert.strictEqual(userId, decisionService.getBucketingId(userId, { browser_type: 'safari' }));
    });

    it('should log warning in case of invalid bucketingId', function() {
      assert.strictEqual(userId, decisionService.getBucketingId(userId, userAttributesWithInvalidBucketingId));
      assert.deepEqual(mockLogger.warn.args[0], [BUCKETING_ID_NOT_STRING]);
    });

    it('should return correct bucketingId when provided in attributes', function() {
      assert.strictEqual('123456789', decisionService.getBucketingId(userId, userAttributesWithBucketingId));
      assert.strictEqual(1, mockLogger.debug.callCount);
      assert.deepEqual(mockLogger.debug.args[0], [VALID_BUCKETING_ID, '123456789']);
    });
  });

  describe('feature management', function() {
    describe('#getVariationForFeature', function() {
      var configObj;
      var decisionServiceInstance;
      var sandbox;
      var mockLogger = createLogger({ logLevel: LOG_LEVEL.INFO });
      var fakeDecisionResponseWithArgs;
      var fakeDecisionResponse = Value.of('sync', {
        result: {},
        reasons: [],
      });
      var user;
      beforeEach(function() {
        configObj = projectConfig.createProjectConfig(cloneDeep(testDataWithFeatures));
        sandbox = sinon.sandbox.create();
        sandbox.stub(mockLogger, 'debug');
        sandbox.stub(mockLogger, 'info');
        sandbox.stub(mockLogger, 'warn');
        sandbox.stub(mockLogger, 'error');

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
            user = new OptimizelyUserContext({
              shouldIdentifyUser: false,
              optimizely: {},
              userId: 'user1',
              attributes: {
                test_attribute: 'test_value',
              },
            });
            fakeDecisionResponseWithArgs = Value.of('sync', {
              result: { variationKey: 'variation' },
              reasons: [],
            });
            experiment = configObj.experimentIdMap['594098'];
            getVariationStub = sandbox.stub(decisionServiceInstance, 'resolveVariation');
            getVariationStub.returns(fakeDecisionResponse);
            getVariationStub.withArgs('sync', configObj, experiment, user, sinon.match.any, sinon.match.any).returns(fakeDecisionResponseWithArgs);
          });

          it('returns a decision with a variation in the experiment the feature is attached to', function() {
            var decision = decisionServiceInstance.getVariationForFeature(configObj, feature, user).result;
            const expectedDecision = {
              cmabUuid: undefined,
              experiment: configObj.experimentIdMap['594098'],
              variation: configObj.variationIdMap['594096'],
              decisionSource: DECISION_SOURCES.FEATURE_TEST,
            };
            
            assert.deepEqual(decision, expectedDecision);
            sinon.assert.calledWith(
              getVariationStub,
              'sync',
              configObj,
              experiment,
              user,
              sinon.match.any,
              sinon.match.any
            );
          });
        });

        describe('user not bucketed into this experiment', function() {
          var getVariationStub;
          beforeEach(function() {
            user = new OptimizelyUserContext({
              shouldIdentifyUser: false,
              optimizely: {},
              userId: 'user1',
            });
            getVariationStub = sandbox.stub(decisionServiceInstance, 'resolveVariation');
            getVariationStub.returns(fakeDecisionResponse);
          });

          it('returns a decision with no variation and source rollout', function() {
            var decision = decisionServiceInstance.getVariationForFeature(configObj, feature, user).result;
            var expectedDecision = {
              experiment: null,
              variation: null,
              decisionSource: DECISION_SOURCES.ROLLOUT,
            };
            assert.deepEqual(decision, expectedDecision);

            assert.deepEqual(mockLogger.debug.lastCall.args, [USER_NOT_IN_ROLLOUT, 'user1', 'test_feature_for_experiment']);
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
          var user;
          beforeEach(function() {
            user = new OptimizelyUserContext({
              shouldIdentifyUser: false,
              optimizely: {},
              userId: 'user1',
            });
            fakeDecisionResponseWithArgs = Value.of('sync', {
              result: { variationKey: 'var' },
              reasons: [],
            });
            getVariationStub = sandbox.stub(decisionServiceInstance, 'resolveVariation');
            getVariationStub.returns(fakeDecisionResponseWithArgs);
            getVariationStub.withArgs(configObj, 'exp_with_group', user).returns(fakeDecisionResponseWithArgs);
          });

          it('returns a decision with a variation in an experiment in a group', function() {
            var decision = decisionServiceInstance.getVariationForFeature(configObj, feature, user).result;
            var expectedDecision = {
              cmabUuid: undefined,
              experiment: configObj.experimentIdMap['595010'],
              variation: configObj.variationIdMap['595008'],
              decisionSource: DECISION_SOURCES.FEATURE_TEST,
            }; 

            assert.deepEqual(decision, expectedDecision);
          });
        });

        describe('user not bucketed into an experiment in the group', function() {
          var getVariationStub;
          var user;
          beforeEach(function() {
            user = new OptimizelyUserContext({
              shouldIdentifyUser: false,
              optimizely: {},
              userId: 'user1',
            });
            getVariationStub = sandbox.stub(decisionServiceInstance, 'resolveVariation');
            getVariationStub.returns(fakeDecisionResponse);
          });

          it('returns a decision with no experiment, no variation and source rollout', function() {
            var decision = decisionServiceInstance.getVariationForFeature(configObj, feature, user).result;
            var expectedDecision = {
              experiment: null,
              variation: null,
              decisionSource: DECISION_SOURCES.ROLLOUT,
            };
            assert.deepEqual(decision, expectedDecision);

            assert.deepEqual(mockLogger.debug.lastCall.args, [USER_NOT_IN_ROLLOUT, 'user1', 'feature_with_group']);
          });

          it('returns null decision for group experiment not referenced by the feature', function() {
            var noTrafficExpFeature = configObj.featureKeyMap.feature_exp_no_traffic;
            var decision = decisionServiceInstance.getVariationForFeature(configObj, noTrafficExpFeature, user).result;
            var expectedDecision = {
              experiment: null,
              variation: null,
              decisionSource: DECISION_SOURCES.ROLLOUT,
            };
            assert.deepEqual(decision, expectedDecision);
            sinon.assert.calledWithExactly(
              mockLogger.debug,
              NO_ROLLOUT_EXISTS,
              'feature_exp_no_traffic'
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
            user = new OptimizelyUserContext({
              shouldIdentifyUser: false,
              optimizely: {},
              userId: 'user1',
              attributes: { test_attribute: 'test_value' },
            });
            var decision = decisionServiceInstance.getVariationForFeature(configObj, feature, user).result;
            var expectedDecision = {
              experiment: configObj.experimentIdMap['594031'],
              variation: configObj.variationIdMap['594032'],
              decisionSource: DECISION_SOURCES.ROLLOUT,
            };

            assert.deepEqual(decision, expectedDecision);
            sinon.assert.calledWithExactly(
              mockLogger.debug,
              USER_MEETS_CONDITIONS_FOR_TARGETING_RULE,
              'user1', 1
            );
            sinon.assert.calledWithExactly(
              mockLogger.debug,
              USER_BUCKETED_INTO_TARGETING_RULE,
              'user1', 1
              
            );
            sinon.assert.calledWithExactly(
              mockLogger.debug,
              USER_IN_ROLLOUT,
              'user1', 'test_feature'
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
            user = new OptimizelyUserContext({
              shouldIdentifyUser: false,
              optimizely: {},
              userId: 'user1',
              attributes: {},
            });
            var decision = decisionServiceInstance.getVariationForFeature(configObj, feature, user).result;
            var expectedDecision = {
              experiment: configObj.experimentIdMap['594037'],
              variation: configObj.variationIdMap['594038'],
              decisionSource: DECISION_SOURCES.ROLLOUT,
            }; 

            assert.deepEqual(decision, expectedDecision);
            sinon.assert.calledWithExactly(
              mockLogger.debug,
              USER_DOESNT_MEET_CONDITIONS_FOR_TARGETING_RULE,
              'user1', 1
            );
            sinon.assert.calledWithExactly(
              mockLogger.debug,
              USER_BUCKETED_INTO_TARGETING_RULE,
              'user1', 'Everyone Else'
            );
            sinon.assert.calledWithExactly(
              mockLogger.debug,
              USER_IN_ROLLOUT,
              'user1', 'test_feature'
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
            user = new OptimizelyUserContext({
              shouldIdentifyUser: false,
              optimizely: {},
              userId: 'user1',
            });
            var decision = decisionServiceInstance.getVariationForFeature(configObj, feature, user).result;
            var expectedDecision = {
              experiment: null,
              variation: null,
              decisionSource: DECISION_SOURCES.ROLLOUT,
            };
            assert.deepEqual(decision, expectedDecision);
            sinon.assert.calledWithExactly(
              mockLogger.debug,
              USER_DOESNT_MEET_CONDITIONS_FOR_TARGETING_RULE,
              'user1', 1
            );
            sinon.assert.calledWithExactly(
              mockLogger.debug,
              USER_NOT_IN_ROLLOUT,
              'user1', 'test_feature'
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
            user = new OptimizelyUserContext({
              shouldIdentifyUser: false,
              optimizely: {},
              userId: 'user1',
              attributes: { test_attribute: 'test_value' }
            });
            var decision = decisionServiceInstance.getVariationForFeature(configObj, feature, user).result;
            var expectedDecision = {
              experiment: configObj.experimentIdMap['594037'],
              variation: configObj.variationIdMap['594038'],
              decisionSource: DECISION_SOURCES.ROLLOUT,
            };

            assert.deepEqual(decision, expectedDecision);
            sinon.assert.calledWithExactly(
              mockLogger.debug,
              USER_MEETS_CONDITIONS_FOR_TARGETING_RULE,
              'user1', 1
            );
            sinon.assert.calledWithExactly(
              mockLogger.debug,
              USER_NOT_BUCKETED_INTO_TARGETING_RULE,
              'user1', 1
            );
            sinon.assert.calledWithExactly(
              mockLogger.debug,
              USER_BUCKETED_INTO_TARGETING_RULE,
              'user1', 'Everyone Else'
            );
          });
        });
      });

      describe('feature attached to both an experiment and a rollout', function() {
        var feature;
        var getVariationStub;
        var bucketStub;
        fakeDecisionResponse = Value.of('sync', {
          result: {},
          reasons: [],
        });
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
          // No attributes passed to the user context, so user is not in the audience for the experiment
          // It should fall through to the rollout
          user = new OptimizelyUserContext({
            shouldIdentifyUser: false,
            optimizely: {},
            userId: 'user1'
          });
          var decision = decisionServiceInstance.getVariationForFeature(configObj, feature, user).result;
          var expectedDecision = {
            experiment: configObj.experimentIdMap['599056'],
            variation: configObj.variationIdMap['599057'],
            decisionSource: DECISION_SOURCES.ROLLOUT,
          };

          assert.deepEqual(decision, expectedDecision);
          sinon.assert.calledWithExactly(
            mockLogger.debug,
            USER_BUCKETED_INTO_TARGETING_RULE,
            'user1', 'Everyone Else' 
          );
          sinon.assert.calledWithExactly(
            mockLogger.debug,
            USER_IN_ROLLOUT,
            'user1', 'shared_feature'
          );
        });
      });

      describe('feature not attached to an experiment or a rollout', function() {
        var feature;
        beforeEach(function() {
          feature = configObj.featureKeyMap.unused_flag;
        });

        it('returns a decision with no variation, no experiment and source rollout', function() {
          user = new OptimizelyUserContext({
            shouldIdentifyUser: false,
            optimizely: {},
            userId: 'user1'
          });
          var decision = decisionServiceInstance.getVariationForFeature(configObj, feature, user).result;
          var expectedDecision = {
            experiment: null,
            variation: null,
            decisionSource: DECISION_SOURCES.ROLLOUT,
          };
          assert.deepEqual(decision, expectedDecision);
          sinon.assert.calledWithExactly(
            mockLogger.debug,
            FEATURE_HAS_NO_EXPERIMENTS,
            'unused_flag'
          );
          sinon.assert.calledWithExactly(
            mockLogger.debug,
            NO_ROLLOUT_EXISTS,
            'unused_flag'
          );
        });
      });

      describe('feature attached to exclusion group', function() {
        var feature;
        var generateBucketValueStub;
        beforeEach(function() {
          feature = configObj.featureKeyMap.test_feature_in_exclusion_group;
          generateBucketValueStub = sandbox.stub(bucketValueGenerator, 'generateBucketValue');
        });

        it('returns a decision with a variation in mutex group bucket less than 2500', function() {
          generateBucketValueStub.returns(2400);
          user = new OptimizelyUserContext({
            shouldIdentifyUser: false,
            optimizely: {},
            userId: 'user1',
            attributes: { experiment_attr: 'group_experiment' }
          });
          var decision = decisionServiceInstance.getVariationForFeature(configObj, feature, user).result;
          var expectedExperiment = projectConfig.getExperimentFromKey(configObj, 'group_2_exp_1');
          var expectedDecision = {
            cmabUuid: undefined,
            experiment: expectedExperiment,
            variation: {
              id: '38901',
              key: 'var_1',
              featureEnabled: false,
            },
            decisionSource: DECISION_SOURCES.FEATURE_TEST,
          };
          assert.deepEqual(decision, expectedDecision);

          sinon.assert.calledWithExactly(
            generateBucketValueStub,
            'user142222'
          );
        });

        it('returns a decision with a variation in mutex group bucket range 2500 to 5000', function() {
          generateBucketValueStub.returns(4000);
          user = new OptimizelyUserContext({
            shouldIdentifyUser: false,
            optimizely: {},
            userId: 'user1',
            attributes: { experiment_attr: 'group_experiment' }
          });
          var decision = decisionServiceInstance.getVariationForFeature(configObj, feature, user).result;
          var expectedExperiment = projectConfig.getExperimentFromKey(configObj, 'group_2_exp_2');
          var expectedDecision = {
            cmabUuid: undefined,
            experiment: expectedExperiment,
            variation: {
              id: '38905',
              key: 'var_1',
              featureEnabled: false,
            },
            decisionSource: DECISION_SOURCES.FEATURE_TEST,
          };
          assert.deepEqual(decision, expectedDecision);

          sinon.assert.calledWithExactly(
            generateBucketValueStub,
            'user142223'
          );
        });

        it('returns a decision with a variation in mutex group bucket range 5000 to 7500', function() {
          generateBucketValueStub.returns(6500);
          user = new OptimizelyUserContext({
            shouldIdentifyUser: false,
            optimizely: {},
            userId: 'user1',
            attributes: { experiment_attr: 'group_experiment' }
          });
          var decision = decisionServiceInstance.getVariationForFeature(configObj, feature, user).result;
          var expectedExperiment = projectConfig.getExperimentFromKey(configObj, 'group_2_exp_3');
          var expectedDecision = {
            cmabUuid: undefined,
            experiment: expectedExperiment,
            variation: {
              id: '38906',
              key: 'var_1',
              featureEnabled: false,
            },
            decisionSource: DECISION_SOURCES.FEATURE_TEST,
          };
          assert.deepEqual(decision, expectedDecision);

          sinon.assert.calledWithExactly(
            generateBucketValueStub,
            'user142224'
          );
        });

        it('returns a decision with variation and source rollout in mutex group bucket greater than 7500', function() {
          generateBucketValueStub.returns(8000);
          user = new OptimizelyUserContext({
            shouldIdentifyUser: false,
            optimizely: {},
            userId: 'user1',
            attributes: { experiment_attr: 'group_experiment' }
          });
          var decision = decisionServiceInstance.getVariationForFeature(configObj, feature, user).result;
          var expectedExperiment = projectConfig.getExperimentFromId(configObj, '594066');
          var expectedDecision = {
            experiment: expectedExperiment,
            variation: configObj.variationIdMap['594067'],
            decisionSource: DECISION_SOURCES.ROLLOUT,
          }
          assert.deepEqual(decision, expectedDecision);

          sinon.assert.calledWithExactly(
            generateBucketValueStub,
            'user1594066'
          );
        });

        it('returns a decision with variation for rollout in mutex group with audience mismatch', function() {
          generateBucketValueStub.returns(2400);
          user = new OptimizelyUserContext({
            shouldIdentifyUser: false,
            optimizely: {},
            userId: 'user1',
            attributes: { experiment_attr: 'group_experiment_invalid' }
          });
          var decision = decisionServiceInstance.getVariationForFeature(configObj, feature, user).result;
          var expectedExperiment = projectConfig.getExperimentFromId(configObj, '594066', mockLogger);
          var expectedDecision = {
            experiment: expectedExperiment,
            variation: configObj.variationIdMap['594067'],
            decisionSource: DECISION_SOURCES.ROLLOUT,
          }
          assert.deepEqual(decision, expectedDecision);

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
          generateBucketValueStub = sandbox.stub(bucketValueGenerator, 'generateBucketValue');
        });

        it('returns a decision with a variation in mutex group bucket less than 2500', function() {
          generateBucketValueStub.returns(2400);
          user = new OptimizelyUserContext({
            shouldIdentifyUser: false,
            optimizely: {},
            userId: 'user1',
            attributes: { experiment_attr: 'group_experiment' }
          });
          var decision = decisionServiceInstance.getVariationForFeature(configObj, feature, user).result;
          var expectedExperiment = projectConfig.getExperimentFromKey(configObj, 'test_experiment3');
          var expectedDecision = {
            cmabUuid: undefined,
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

          sinon.assert.calledWithExactly(
            generateBucketValueStub,
            'user1111134'
          );
        });

        it('returns a decision with a variation in mutex group bucket range 2500 to 5000', function() {
          generateBucketValueStub.returns(4000);
          user = new OptimizelyUserContext({
            shouldIdentifyUser: false,
            optimizely: {},
            userId: 'user1',
            attributes: { experiment_attr: 'group_experiment' }
          });
          var decision = decisionServiceInstance.getVariationForFeature(configObj, feature, user).result;
          var expectedExperiment = projectConfig.getExperimentFromKey(configObj, 'test_experiment4');
          var expectedDecision = {
            cmabUuid: undefined,
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

          sinon.assert.calledWithExactly(
            generateBucketValueStub,
            'user1111135'
          );
        });

        it('returns a decision with a variation in mutex group bucket range 5000 to 7500', function() {
          generateBucketValueStub.returns(6500);
          user = new OptimizelyUserContext({
            shouldIdentifyUser: false,
            optimizely: {},
            userId: 'user1',
            attributes: { experiment_attr: 'group_experiment' }
          });
          var decision = decisionServiceInstance.getVariationForFeature(configObj, feature, user).result;
          var expectedExperiment = projectConfig.getExperimentFromKey(configObj, 'test_experiment5');
          var expectedDecision = {
            cmabUuid: undefined,
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

          sinon.assert.calledWithExactly(
            generateBucketValueStub,
            'user1111136'
          );
        });

        it('returns a decision with variation and source rollout in mutex group bucket greater than 7500', function() {
          generateBucketValueStub.returns(8000);
          user = new OptimizelyUserContext({
            shouldIdentifyUser: false,
            optimizely: {},
            userId: 'user1',
            attributes: { experiment_attr: 'group_experiment' }
          });
          var decision = decisionServiceInstance.getVariationForFeature(configObj, feature, user).result;
          var expectedExperiment = projectConfig.getExperimentFromId(configObj, '594066');
          var expectedDecision = {
            experiment: expectedExperiment,
            variation: configObj.variationIdMap['594067'],
            decisionSource: DECISION_SOURCES.ROLLOUT,
          }
          assert.deepEqual(decision, expectedDecision);
          
          sinon.assert.calledWithExactly(
            generateBucketValueStub,
            'user1594066'
          );
        });

        it('returns a decision with variation for rollout in mutex group bucket range 2500 to 5000', function() {
          generateBucketValueStub.returns(4000);
          user = new OptimizelyUserContext({
            shouldIdentifyUser: false,
            optimizely: {},
            userId: 'user1',
            attributes: { experiment_attr: 'group_experiment_invalid' }
          });
          var decision = decisionServiceInstance.getVariationForFeature(configObj, feature, user).result;
          var expectedExperiment = projectConfig.getExperimentFromId(configObj, '594066', mockLogger);
          var expectedDecision = {
            experiment: expectedExperiment,
            variation: configObj.variationIdMap['594067'],
            decisionSource: DECISION_SOURCES.ROLLOUT,
          }
          assert.deepEqual(decision, expectedDecision);

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
      var user;

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
        user = new OptimizelyUserContext({
          shouldIdentifyUser: false,
          optimizely: {},
          userId: 'testUser',
          attributes: { test_attribute: 'test_value' }
        });
        decisionService.getVariationForRollout(configObj, feature, user).result;

        sinon.assert.callCount(buildBucketerParamsSpy, 2);
        sinon.assert.calledWithExactly(buildBucketerParamsSpy, configObj, configObj.experimentIdMap['594031'], 'testUser', 'testUser');
        sinon.assert.calledWithExactly(buildBucketerParamsSpy, configObj, configObj.experimentIdMap['594037'], 'testUser', 'testUser');
      });

      it('should call buildBucketerParams with bucketing Id when bucketing Id is provided in the attributes', function() {
        var attributes = {
          test_attribute: 'test_value',
          $opt_bucketing_id: 'abcdefg',
        };
        user = new OptimizelyUserContext({
          shouldIdentifyUser: false,
          optimizely: {},
          userId: 'testUser',
          attributes,
        });
        decisionService.getVariationForRollout(configObj, feature, user).result;

        sinon.assert.callCount(buildBucketerParamsSpy, 2);
        sinon.assert.calledWithExactly(buildBucketerParamsSpy, configObj, configObj.experimentIdMap['594031'], 'abcdefg', 'testUser');
        sinon.assert.calledWithExactly(buildBucketerParamsSpy, configObj, configObj.experimentIdMap['594037'], 'abcdefg', 'testUser');
      });
    });
  });
});
