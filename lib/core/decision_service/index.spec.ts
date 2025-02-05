/**
 * Copyright 2025, Optimizely
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
import { describe, it, expect, vi } from 'vitest';
import { DecisionService } from '.';
import { getMockLogger } from '../../tests/mock/mock_logger';

type MockLogger = ReturnType<typeof getMockLogger>;

type MockUserProfileService = {
  lookup: typeof vi.fn;
  save: typeof vi.fn;
};

type DecisionServiceInstanceOpt = {
  logger?: boolean;
  userProfileService?: boolean;
}

type DecisionServiceInstance = {
  logger?: MockLogger;
  userProfileService?: MockUserProfileService;
  decisionService: DecisionService;
}

const getDecisionService = (opt: DecisionServiceInstanceOpt): DecisionServiceInstance => {
  const logger = opt.logger ? getMockLogger() : undefined;
  const userProfileService = opt.userProfileService ? {
    lookup: vi.fn(),
    save: vi.fn(),
  } : undefined;

  const decisionService = new DecisionService({
    logger,
    userProfileService,
    UNSTABLE_conditionEvaluators: {},
  });

  return {
    logger,
    userProfileService,
    decisionService,
  };
};

const testGetVariationWithoutUserProfileService = (decisonService: DecisionServiceInstance) => {

}

describe('DecisionService', () => {
  describe('getVariation', function() {
    it('should return the correct variation for the given experiment key and user ID for a running experiment', () => {
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

    // it('should return the whitelisted variation if the user is whitelisted', function() {
    //   user = new OptimizelyUserContext({
    //     shouldIdentifyUser: false,
    //     optimizely: {},
    //     userId: 'user2'
    //   });
    //   experiment = configObj.experimentIdMap['122227'];
    //   assert.strictEqual(
    //     'variationWithAudience',
    //     decisionServiceInstance.getVariation(configObj, experiment, user).result
    //   );
    //   sinon.assert.notCalled(bucketerStub);
    //   assert.strictEqual(1, mockLogger.debug.callCount);
    //   assert.strictEqual(1, mockLogger.info.callCount);

    //   assert.deepEqual(mockLogger.debug.args[0], [USER_HAS_NO_FORCED_VARIATION, 'user2']);

    //   assert.deepEqual(mockLogger.info.args[0], [USER_FORCED_IN_VARIATION, 'user2', 'variationWithAudience']);
    // });

    // it('should return null if the user does not meet audience conditions', function() {
    //   user = new OptimizelyUserContext({
    //     shouldIdentifyUser: false,
    //     optimizely: {},
    //     userId: 'user3'
    //   });
    //   experiment = configObj.experimentIdMap['122227'];
    //   assert.isNull(
    //     decisionServiceInstance.getVariation(configObj, experiment, user, { foo: 'bar' }).result
    //   );

    //   assert.deepEqual(mockLogger.debug.args[0], [USER_HAS_NO_FORCED_VARIATION, 'user3']);

    //   assert.deepEqual(mockLogger.debug.args[1], [EVALUATING_AUDIENCES_COMBINED, 'experiment', 'testExperimentWithAudiences', JSON.stringify(["11154"])]);

    //   assert.deepEqual(mockLogger.info.args[0], [AUDIENCE_EVALUATION_RESULT_COMBINED, 'experiment', 'testExperimentWithAudiences', 'FALSE']);

    //   assert.deepEqual(mockLogger.info.args[1], [USER_NOT_IN_EXPERIMENT, 'user3', 'testExperimentWithAudiences']);
    // });

    // it('should return null if the experiment is not running', function() {
    //   user = new OptimizelyUserContext({
    //     shouldIdentifyUser: false,
    //     optimizely: {},
    //     userId: 'user1'
    //   });
    //   experiment = configObj.experimentIdMap['133337'];
    //   assert.isNull(decisionServiceInstance.getVariation(configObj, experiment, user).result);
    //   sinon.assert.notCalled(bucketerStub);
    //   assert.strictEqual(1, mockLogger.info.callCount);

    //   assert.deepEqual(mockLogger.info.args[0], [EXPERIMENT_NOT_RUNNING, 'testExperimentNotRunning']);
    // });

    // describe('when attributes.$opt_experiment_bucket_map is supplied', function() {
    //   it('should respect the sticky bucketing information for attributes', function() {
    //     var fakeDecisionResponse = {
    //       result: '111128',
    //       reasons: [],
    //     };
    //     experiment = configObj.experimentIdMap['111127'];
    //     bucketerStub.returns(fakeDecisionResponse); // ID of the 'control' variation from `test_data`
    //     var attributes = {
    //       $opt_experiment_bucket_map: {
    //         '111127': {
    //           variation_id: '111129', // ID of the 'variation' variation
    //         },
    //       },
    //     };
    //     user = new OptimizelyUserContext({
    //       shouldIdentifyUser: false,
    //       optimizely: {},
    //       userId: 'decision_service_user',
    //       attributes,
    //     });

    //     assert.strictEqual(
    //       'variation',
    //       decisionServiceInstance.getVariation(configObj, experiment, user).result
    //     );
    //     sinon.assert.notCalled(bucketerStub);
    //   });
    // });

    // describe('when a user profile service is provided', function() {
    //   var fakeDecisionResponse = {
    //     result: '111128',
    //     reasons: [],
    //   };
    //   var userProfileServiceInstance = null;
    //   var userProfileLookupStub;
    //   var userProfileSaveStub;
    //   var fakeDecisionWhitelistedVariation = {
    //     result: null,
    //     reasons: [],
    //   }
    //   beforeEach(function() {
    //     userProfileServiceInstance = {
    //       lookup: function() {},
    //       save: function() {},
    //     };

    //     decisionServiceInstance = createDecisionService({
    //       logger: mockLogger,
    //       userProfileService: userProfileServiceInstance,
    //     });
    //     userProfileLookupStub = sinon.stub(userProfileServiceInstance, 'lookup');
    //     userProfileSaveStub = sinon.stub(userProfileServiceInstance, 'save');
    //     sinon.stub(decisionServiceInstance, 'getWhitelistedVariation').returns(fakeDecisionWhitelistedVariation);
    //   });

    //   afterEach(function() {
    //     userProfileServiceInstance.lookup.restore();
    //     userProfileServiceInstance.save.restore();
    //     decisionServiceInstance.getWhitelistedVariation.restore();
    //   });

    //   it('should return the previously bucketed variation', function() {
    //     userProfileLookupStub.returns({
    //       user_id: 'decision_service_user',
    //       experiment_bucket_map: {
    //         '111127': {
    //           variation_id: '111128', // ID of the 'control' variation
    //         },
    //       },
    //     });
    //     experiment = configObj.experimentIdMap['111127'];
    //     user = new OptimizelyUserContext({
    //       shouldIdentifyUser: false,
    //       optimizely: {},
    //       userId: 'decision_service_user',
    //     });

    //     assert.strictEqual(
    //       'control',
    //       decisionServiceInstance.getVariation(configObj, experiment, user).result
    //     );
    //     sinon.assert.calledWith(userProfileLookupStub, 'decision_service_user');
    //     sinon.assert.notCalled(bucketerStub);

    //     assert.deepEqual(mockLogger.debug.args[0], [USER_HAS_NO_FORCED_VARIATION, 'decision_service_user']);

    //     assert.deepEqual(mockLogger.info.args[0], [RETURNING_STORED_VARIATION, 'control', 'testExperiment', 'decision_service_user']);
    //   });

    //   it('should bucket if there was no prevously bucketed variation', function() {
    //     bucketerStub.returns(fakeDecisionResponse); // ID of the 'control' variation
    //     userProfileLookupStub.returns({
    //       user_id: 'decision_service_user',
    //       experiment_bucket_map: {},
    //     });
    //     experiment = configObj.experimentIdMap['111127'];
    //     user = new OptimizelyUserContext({
    //       shouldIdentifyUser: false,
    //       optimizely: {},
    //       userId: 'decision_service_user',
    //     });

    //     assert.strictEqual(
    //       'control',
    //       decisionServiceInstance.getVariation(configObj, experiment, user).result
    //     );
    //     sinon.assert.calledWith(userProfileLookupStub, 'decision_service_user');
    //     sinon.assert.calledOnce(bucketerStub);
    //     // make sure we save the decision
    //     sinon.assert.calledWith(userProfileSaveStub, {
    //       user_id: 'decision_service_user',
    //       experiment_bucket_map: {
    //         '111127': {
    //           variation_id: '111128',
    //         },
    //       },
    //     });
    //   });

    //   it('should bucket if the user profile service returns null', function() {
    //     bucketerStub.returns(fakeDecisionResponse); // ID of the 'control' variation
    //     userProfileLookupStub.returns(null);
    //     experiment = configObj.experimentIdMap['111127'];
    //     user = new OptimizelyUserContext({
    //       shouldIdentifyUser: false,
    //       optimizely: {},
    //       userId: 'decision_service_user',
    //     });
    //     assert.strictEqual(
    //       'control',
    //       decisionServiceInstance.getVariation(configObj, experiment, user).result
    //     );
    //     sinon.assert.calledWith(userProfileLookupStub, 'decision_service_user');
    //     sinon.assert.calledOnce(bucketerStub);
    //     // make sure we save the decision
    //     sinon.assert.calledWith(userProfileSaveStub, {
    //       user_id: 'decision_service_user',
    //       experiment_bucket_map: {
    //         '111127': {
    //           variation_id: '111128',
    //         },
    //       },
    //     });
    //   });

    //   it('should re-bucket if the stored variation is no longer valid', function() {
    //     bucketerStub.returns(fakeDecisionResponse); // ID of the 'control' variation
    //     userProfileLookupStub.returns({
    //       user_id: 'decision_service_user',
    //       experiment_bucket_map: {
    //         '111127': {
    //           variation_id: 'not valid variation',
    //         },
    //       },
    //     });
    //     experiment = configObj.experimentIdMap['111127'];
    //     user = new OptimizelyUserContext({
    //       shouldIdentifyUser: false,
    //       optimizely: {},
    //       userId: 'decision_service_user',
    //     });
    //     assert.strictEqual(
    //       'control',
    //       decisionServiceInstance.getVariation(configObj, experiment, user).result
    //     );
    //     sinon.assert.calledWith(userProfileLookupStub, 'decision_service_user');
    //     sinon.assert.calledOnce(bucketerStub);
    //     // assert.strictEqual(
    //     //   buildLogMessageFromArgs(mockLogger.log.args[0]),
    //     //   'DECISION_SERVICE: User decision_service_user is not in the forced variation map.'
    //     // );
    //     assert.deepEqual(mockLogger.debug.args[0], [USER_HAS_NO_FORCED_VARIATION, 'decision_service_user']);

    //     sinon.assert.calledWith(
    //       mockLogger.info,
    //       SAVED_VARIATION_NOT_FOUND,
    //       'decision_service_user',
    //       'not valid variation',
    //       'testExperiment'
    //     );

    //     // make sure we save the decision
    //     sinon.assert.calledWith(userProfileSaveStub, {
    //       user_id: 'decision_service_user',
    //       experiment_bucket_map: {
    //         '111127': {
    //           variation_id: '111128',
    //         },
    //       },
    //     });
    //   });

    //   it('should store the bucketed variation for the user', function() {
    //     bucketerStub.returns(fakeDecisionResponse); // ID of the 'control' variation
    //     userProfileLookupStub.returns({
    //       user_id: 'decision_service_user',
    //       experiment_bucket_map: {}, // no decisions for user
    //     });
    //     user = new OptimizelyUserContext({
    //       shouldIdentifyUser: false,
    //       optimizely: {},
    //       userId: 'decision_service_user',
    //     });
    //     experiment = configObj.experimentIdMap['111127'];

    //     assert.strictEqual(
    //       'control',
    //       decisionServiceInstance.getVariation(configObj, experiment, user).result
    //     );
    //     sinon.assert.calledWith(userProfileLookupStub, 'decision_service_user');
    //     sinon.assert.calledOnce(bucketerStub);

    //     sinon.assert.calledWith(userProfileServiceInstance.save, {
    //       user_id: 'decision_service_user',
    //       experiment_bucket_map: {
    //         '111127': {
    //           variation_id: '111128',
    //         },
    //       },
    //     });


    //     assert.deepEqual(mockLogger.debug.args[0], [USER_HAS_NO_FORCED_VARIATION, 'decision_service_user']);

    //     assert.deepEqual(mockLogger.info.lastCall.args, [SAVED_USER_VARIATION, 'decision_service_user']);
    //   });

    //   it('should log an error message if "lookup" throws an error', function() {
    //     bucketerStub.returns(fakeDecisionResponse); // ID of the 'control' variation
    //     userProfileLookupStub.throws(new Error('I am an error'));
    //     experiment = configObj.experimentIdMap['111127'];
    //     user = new OptimizelyUserContext({
    //       shouldIdentifyUser: false,
    //       optimizely: {},
    //       userId: 'decision_service_user',
    //     });

    //     assert.strictEqual(
    //       'control',
    //       decisionServiceInstance.getVariation(configObj, experiment, user).result
    //     );
    //     sinon.assert.calledWith(userProfileLookupStub, 'decision_service_user');
    //     sinon.assert.calledOnce(bucketerStub); // should still go through with bucketing

    //     assert.deepEqual(mockLogger.error.args[0], [USER_PROFILE_LOOKUP_ERROR, 'decision_service_user', 'I am an error']);

    //     assert.deepEqual(mockLogger.debug.args[0], [USER_HAS_NO_FORCED_VARIATION, 'decision_service_user']);
    //   });

    //   it('should log an error message if "save" throws an error', function() {
    //     bucketerStub.returns(fakeDecisionResponse); // ID of the 'control' variation
    //     userProfileLookupStub.returns(null);
    //     userProfileSaveStub.throws(new Error('I am an error'));
    //     experiment = configObj.experimentIdMap['111127'];
    //     user = new OptimizelyUserContext({
    //       shouldIdentifyUser: false,
    //       optimizely: {},
    //       userId: 'decision_service_user',
    //     });
    //     assert.strictEqual(
    //       'control',
    //       decisionServiceInstance.getVariation(configObj, experiment, user).result
    //     );
    //     sinon.assert.calledWith(userProfileLookupStub, 'decision_service_user');
    //     sinon.assert.calledOnce(bucketerStub); // should still go through with bucketing


    //     assert.deepEqual(mockLogger.debug.args[0], [USER_HAS_NO_FORCED_VARIATION, 'decision_service_user']);

    //     assert.deepEqual(mockLogger.error.args[0], [USER_PROFILE_SAVE_ERROR, 'decision_service_user', 'I am an error']);

    //     // make sure that we save the decision
    //     sinon.assert.calledWith(userProfileSaveStub, {
    //       user_id: 'decision_service_user',
    //       experiment_bucket_map: {
    //         '111127': {
    //           variation_id: '111128',
    //         },
    //       },
    //     });
    //   });

    //   describe('when passing `attributes.$opt_experiment_bucket_map`', function() {
    //     it('should respect attributes over the userProfileService for the matching experiment id', function() {
    //       userProfileLookupStub.returns({
    //         user_id: 'decision_service_user',
    //         experiment_bucket_map: {
    //           '111127': {
    //             variation_id: '111128', // ID of the 'control' variation
    //           },
    //         },
    //       });

    //       var attributes = {
    //         $opt_experiment_bucket_map: {
    //           '111127': {
    //             variation_id: '111129', // ID of the 'variation' variation
    //           },
    //         },
    //       };

    //       experiment = configObj.experimentIdMap['111127'];

    //       user = new OptimizelyUserContext({
    //         shouldIdentifyUser: false,
    //         optimizely: {},
    //         userId: 'decision_service_user',
    //         attributes,
    //       });

    //       assert.strictEqual(
    //         'variation',
    //         decisionServiceInstance.getVariation(configObj, experiment, user).result
    //       );
    //       sinon.assert.calledWith(userProfileLookupStub, 'decision_service_user');
    //       sinon.assert.notCalled(bucketerStub);

    //       assert.deepEqual(mockLogger.debug.args[0], [USER_HAS_NO_FORCED_VARIATION, 'decision_service_user']);

    //       assert.deepEqual(mockLogger.info.args[0], [RETURNING_STORED_VARIATION, 'variation', 'testExperiment', 'decision_service_user']);
    //     });

    //     it('should ignore attributes for a different experiment id', function() {
    //       userProfileLookupStub.returns({
    //         user_id: 'decision_service_user',
    //         experiment_bucket_map: {
    //           '111127': {
    //             // 'testExperiment' ID
    //             variation_id: '111128', // ID of the 'control' variation
    //           },
    //         },
    //       });

    //       experiment = configObj.experimentIdMap['111127'];

    //       var attributes = {
    //         $opt_experiment_bucket_map: {
    //           '122227': {
    //             // other experiment ID
    //             variation_id: '122229', // ID of the 'variationWithAudience' variation
    //           },
    //         },
    //       };

    //       user = new OptimizelyUserContext({
    //         shouldIdentifyUser: false,
    //         optimizely: {},
    //         userId: 'decision_service_user',
    //         attributes,
    //       });

    //       assert.strictEqual(
    //         'control',
    //         decisionServiceInstance.getVariation(configObj, experiment, user).result
    //       );
    //       sinon.assert.calledWith(userProfileLookupStub, 'decision_service_user');
    //       sinon.assert.notCalled(bucketerStub);

    //       assert.deepEqual(mockLogger.debug.args[0], [USER_HAS_NO_FORCED_VARIATION, 'decision_service_user']);

    //       assert.deepEqual(mockLogger.info.args[0], [RETURNING_STORED_VARIATION, 'control', 'testExperiment', 'decision_service_user']);
    //     });

    //     it('should use attributes when the userProfileLookup variations for other experiments', function() {
    //       userProfileLookupStub.returns({
    //         user_id: 'decision_service_user',
    //         experiment_bucket_map: {
    //           '122227': {
    //             // other experiment ID
    //             variation_id: '122229', // ID of the 'variationWithAudience' variation
    //           },
    //         },
    //       });

    //       experiment = configObj.experimentIdMap['111127'];

    //       var attributes = {
    //         $opt_experiment_bucket_map: {
    //           '111127': {
    //             // 'testExperiment' ID
    //             variation_id: '111129', // ID of the 'variation' variation
    //           },
    //         },
    //       };

    //       user = new OptimizelyUserContext({
    //         shouldIdentifyUser: false,
    //         optimizely: {},
    //         userId: 'decision_service_user',
    //         attributes,
    //       });

    //       assert.strictEqual(
    //         'variation',
    //         decisionServiceInstance.getVariation(configObj, experiment, user).result
    //       );
    //       sinon.assert.calledWith(userProfileLookupStub, 'decision_service_user');
    //       sinon.assert.notCalled(bucketerStub);

    //       assert.deepEqual(mockLogger.debug.args[0], [USER_HAS_NO_FORCED_VARIATION, 'decision_service_user']);

    //       assert.deepEqual(mockLogger.info.args[0], [RETURNING_STORED_VARIATION, 'variation', 'testExperiment', 'decision_service_user']);
    //     });

    //     it('should use attributes when the userProfileLookup returns null', function() {
    //       userProfileLookupStub.returns(null);

    //       experiment = configObj.experimentIdMap['111127'];

    //       var attributes = {
    //         $opt_experiment_bucket_map: {
    //           '111127': {
    //             variation_id: '111129', // ID of the 'variation' variation
    //           },
    //         },
    //       };

    //       user = new OptimizelyUserContext({
    //         shouldIdentifyUser: false,
    //         optimizely: {},
    //         userId: 'decision_service_user',
    //         attributes,
    //       });

    //       assert.strictEqual(
    //         'variation',
    //         decisionServiceInstance.getVariation(configObj, experiment, user).result
    //       );
    //       sinon.assert.calledWith(userProfileLookupStub, 'decision_service_user');
    //       sinon.assert.notCalled(bucketerStub);

    //       assert.deepEqual(mockLogger.debug.args[0], [USER_HAS_NO_FORCED_VARIATION, 'decision_service_user']);

    //       assert.deepEqual(mockLogger.info.args[0], [RETURNING_STORED_VARIATION, 'variation', 'testExperiment', 'decision_service_user']);
    //     });
    //   });
    // });
  });
});
