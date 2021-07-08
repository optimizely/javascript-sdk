/**
 * Copyright 2016-2017, 2019-2021, Optimizely
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
import { assert, expect } from 'chai';
import { cloneDeep } from 'lodash';
import { sprintf } from '@optimizely/js-sdk-utils';

import * as bucketer from './';
import {
  ERROR_MESSAGES,
  LOG_MESSAGES,
  LOG_LEVEL,
} from '../../utils/enums';
import { createLogger } from '../../plugins/logger';
import projectConfig from '../project_config';
import { getTestProjectConfig } from '../../tests/test_data';

var testData = getTestProjectConfig();

describe('lib/core/bucketer', function() {
  describe('APIs', function() {
    describe('bucket', function() {
      var configObj;
      var createdLogger = createLogger({ logLevel: LOG_LEVEL.INFO });
      var bucketerParams;

      beforeEach(function() {
        sinon.stub(createdLogger, 'log');
      });

      afterEach(function() {
        createdLogger.log.restore();
      });

      describe('return values for bucketing (excluding groups)', function() {
        beforeEach(function() {
          configObj = projectConfig.createProjectConfig(cloneDeep(testData));
          bucketerParams = {
            experimentId: configObj.experiments[0].id,
            experimentKey: configObj.experiments[0].key,
            trafficAllocationConfig: configObj.experiments[0].trafficAllocation,
            variationIdMap: configObj.variationIdMap,
            experimentIdMap: configObj.experimentIdMap,
            groupIdMap: configObj.groupIdMap,
            logger: createdLogger,
          };
          sinon
            .stub(bucketer, '_generateBucketValue')
            .onFirstCall()
            .returns(50)
            .onSecondCall()
            .returns(50000);
        });

        afterEach(function() {
          bucketer._generateBucketValue.restore();
        });

        it('should return decision response with correct variation ID when provided bucket value', function() {
          var bucketerParamsTest1 = cloneDeep(bucketerParams);
          bucketerParamsTest1.userId = 'ppid1';
          var decisionResponse = bucketer.bucket(bucketerParamsTest1);
          expect(decisionResponse.result).to.equal('111128');

          var bucketedUser_log1 = createdLogger.log.args[0][1];
          expect(bucketedUser_log1).to.equal(
            sprintf(LOG_MESSAGES.USER_ASSIGNED_TO_EXPERIMENT_BUCKET, 'BUCKETER', '50', 'ppid1')
          );

          var bucketerParamsTest2 = cloneDeep(bucketerParams);
          bucketerParamsTest2.userId = 'ppid2';
          expect(bucketer.bucket(bucketerParamsTest2).result).to.equal(null);

          var notBucketedUser_log1 = createdLogger.log.args[1][1];

          expect(notBucketedUser_log1).to.equal(
            sprintf(LOG_MESSAGES.USER_ASSIGNED_TO_EXPERIMENT_BUCKET, 'BUCKETER', '50000', 'ppid2')
          );
        });
      });

      describe('return values for bucketing (including groups)', function() {
        var bucketerStub;
        beforeEach(function() {
          configObj = projectConfig.createProjectConfig(cloneDeep(testData));
          bucketerParams = {
            experimentId: configObj.experiments[0].id,
            experimentKey: configObj.experiments[0].key,
            trafficAllocationConfig: configObj.experiments[0].trafficAllocation,
            variationIdMap: configObj.variationIdMap,
            experimentIdMap: configObj.experimentIdMap,
            groupIdMap: configObj.groupIdMap,
            logger: createdLogger,
          };
          bucketerStub = sinon.stub(bucketer, '_generateBucketValue');
        });

        afterEach(function() {
          bucketer._generateBucketValue.restore();
        });

        describe('random groups', function() {
          bucketerParams = {};
          beforeEach(function() {
            bucketerParams = {
              experimentId: configObj.experiments[4].id,
              experimentKey: configObj.experiments[4].key,
              trafficAllocationConfig: configObj.experiments[4].trafficAllocation,
              variationIdMap: configObj.variationIdMap,
              experimentIdMap: configObj.experimentIdMap,
              groupIdMap: configObj.groupIdMap,
              logger: createdLogger,
              userId: 'testUser',
            };
          });

          it('should return decision response with the proper variation for a user in a grouped experiment', function() {
            bucketerStub.onFirstCall().returns(50);
            bucketerStub.onSecondCall().returns(50);

            var decisionResponse = bucketer.bucket(bucketerParams);
            expect(decisionResponse.result).to.equal('551');

            sinon.assert.calledTwice(bucketerStub);
            sinon.assert.callCount(createdLogger.log, 3);

            var log1 = createdLogger.log.args[0][1];
            expect(log1).to.equal(
              sprintf(LOG_MESSAGES.USER_ASSIGNED_TO_EXPERIMENT_BUCKET, 'BUCKETER', '50', 'testUser')
            );

            var log2 = createdLogger.log.args[1][1];
            expect(log2).to.equal(
              sprintf(
                LOG_MESSAGES.USER_BUCKETED_INTO_EXPERIMENT_IN_GROUP,
                'BUCKETER',
                'testUser',
                'groupExperiment1',
                '666'
              )
            );

            var log3 = createdLogger.log.args[2][1];
            expect(log3).to.equal(
              sprintf(LOG_MESSAGES.USER_ASSIGNED_TO_EXPERIMENT_BUCKET, 'BUCKETER', '50', 'testUser')
            );
          });

          it('should return decision response with variation null when a user is bucketed into a different grouped experiment than the one speicfied', function() {
            bucketerStub.returns(5000);

            var decisionResponse = bucketer.bucket(bucketerParams);
            expect(decisionResponse.result).to.equal(null);

            sinon.assert.calledOnce(bucketerStub);
            sinon.assert.calledTwice(createdLogger.log);

            var log1 = createdLogger.log.args[0][1];
            expect(log1).to.equal(
              sprintf(LOG_MESSAGES.USER_ASSIGNED_TO_EXPERIMENT_BUCKET, 'BUCKETER', '5000', 'testUser')
            );
            var log2 = createdLogger.log.args[1][1];
            expect(log2).to.equal(
              sprintf(
                LOG_MESSAGES.USER_NOT_BUCKETED_INTO_EXPERIMENT_IN_GROUP,
                'BUCKETER',
                'testUser',
                'groupExperiment1',
                '666'
              )
            );
          });

          it('should return decision response with variation null when a user is not bucketed into any experiments in the random group', function() {
            bucketerStub.returns(50000);

            var decisionResponse = bucketer.bucket(bucketerParams);
            expect(decisionResponse.result).to.equal(null);

            sinon.assert.calledOnce(bucketerStub);
            sinon.assert.calledTwice(createdLogger.log);

            var log1 = createdLogger.log.args[0][1];
            expect(log1).to.equal(
              sprintf(LOG_MESSAGES.USER_ASSIGNED_TO_EXPERIMENT_BUCKET, 'BUCKETER', '50000', 'testUser')
            );
            var log2 = createdLogger.log.args[1][1];
            expect(log2).to.equal(sprintf(LOG_MESSAGES.USER_NOT_IN_ANY_EXPERIMENT, 'BUCKETER', 'testUser', '666'));
          });

          it('should return decision response with variation null when a user is bucketed into traffic space of deleted experiment within a random group', function() {
            bucketerStub.returns(9000);

            var decisionResponse = bucketer.bucket(bucketerParams);
            expect(decisionResponse.result).to.equal(null);

            sinon.assert.calledOnce(bucketerStub);
            sinon.assert.calledTwice(createdLogger.log);

            var log1 = createdLogger.log.args[0][1];
            expect(log1).to.equal(
              sprintf(LOG_MESSAGES.USER_ASSIGNED_TO_EXPERIMENT_BUCKET, 'BUCKETER', '9000', 'testUser')
            );
            var log2 = createdLogger.log.args[1][1];
            expect(log2).to.equal(sprintf(LOG_MESSAGES.USER_NOT_IN_ANY_EXPERIMENT, 'BUCKETER', 'testUser', '666'));
          });

          it('should throw an error if group ID is not in the datafile', function() {
            var bucketerParamsWithInvalidGroupId = cloneDeep(bucketerParams);
            bucketerParamsWithInvalidGroupId.experimentIdMap[configObj.experiments[4].id].groupId = '6969';

            assert.throws(function() {
              bucketer.bucket(bucketerParamsWithInvalidGroupId);
            }, sprintf(ERROR_MESSAGES.INVALID_GROUP_ID, 'BUCKETER', '6969'));
          });
        });

        describe('overlapping groups', function() {
          bucketerParams = {};
          beforeEach(function() {
            bucketerParams = {
              experimentId: configObj.experiments[6].id,
              experimentKey: configObj.experiments[6].key,
              trafficAllocationConfig: configObj.experiments[6].trafficAllocation,
              variationIdMap: configObj.variationIdMap,
              experimentIdMap: configObj.experimentIdMap,
              groupIdMap: configObj.groupIdMap,
              logger: createdLogger,
              userId: 'testUser',
            };
          });

          it('should return decision response with variation when a user falls into an experiment within an overlapping group', function() {
            bucketerStub.returns(0);

            var decisionResponse = bucketer.bucket(bucketerParams);
            expect(decisionResponse.result).to.equal('553');

            sinon.assert.calledOnce(bucketerStub);
            sinon.assert.calledOnce(createdLogger.log);

            var log1 = createdLogger.log.args[0][1];
            expect(log1).to.equal(sprintf(LOG_MESSAGES.USER_ASSIGNED_TO_EXPERIMENT_BUCKET, 'BUCKETER', '0', 'testUser'));
          });

          it('should return decision response with variation null when a user does not fall into an experiment within an overlapping group', function() {
            bucketerStub.returns(3000);

            var decisionResponse = bucketer.bucket(bucketerParams);
            expect(decisionResponse.result).to.equal(null);
          });
        });
      });

      describe('when the bucket value falls into empty traffic allocation ranges', function() {
        beforeEach(function() {
          configObj = projectConfig.createProjectConfig(cloneDeep(testData));
          bucketerParams = {
            experimentId: configObj.experiments[0].id,
            experimentKey: configObj.experiments[0].key,
            trafficAllocationConfig: [
              {
                entityId: '',
                endOfRange: 5000,
              },
              {
                entityId: '',
                endOfRange: 10000,
              },
            ],
            variationIdMap: configObj.variationIdMap,
            experimentIdMap: configObj.experimentIdMap,
            groupIdMap: configObj.groupIdMap,
            logger: createdLogger,
          };
        });

        it('should return decision response with variation null', function() {
          var bucketerParamsTest1 = cloneDeep(bucketerParams);
          bucketerParamsTest1.userId = 'ppid1';
          var decisionResponse = bucketer.bucket(bucketerParamsTest1);
          expect(decisionResponse.result).to.equal(null);
        });

        it('should not log an invalid variation ID warning', function() {
          bucketer.bucket(bucketerParams)
          const foundInvalidVariationWarning = createdLogger.log.getCalls().some((call) => {
            const message = call.args[1];
            return message.includes('Bucketed into an invalid variation ID')
          });
          expect(foundInvalidVariationWarning).to.equal(false);
        });
      });

      describe('when the traffic allocation has invalid variation ids', function() {
        beforeEach(function() {
          configObj = projectConfig.createProjectConfig(cloneDeep(testData));
          bucketerParams = {
            experimentId: configObj.experiments[0].id,
            experimentKey: configObj.experiments[0].key,
            trafficAllocationConfig: [
              {
                entityId: -1,
                endOfRange: 5000,
              },
              {
                entityId: -2,
                endOfRange: 10000,
              },
            ],
            variationIdMap: configObj.variationIdMap,
            experimentIdMap: configObj.experimentIdMap,
            groupIdMap: configObj.groupIdMap,
            logger: createdLogger,
          };
        });

        it('should return decision response with variation null', function() {
          var bucketerParamsTest1 = cloneDeep(bucketerParams);
          bucketerParamsTest1.userId = 'ppid1';
          var decisionResponse = bucketer.bucket(bucketerParamsTest1);
          expect(decisionResponse.result).to.equal(null);
        });
      });
    });

    describe('_generateBucketValue', function() {
      it('should return a bucket value for different inputs', function() {
        var experimentId = 1886780721;
        var bucketingKey1 = sprintf('%s%s', 'ppid1', experimentId);
        var bucketingKey2 = sprintf('%s%s', 'ppid2', experimentId);
        var bucketingKey3 = sprintf('%s%s', 'ppid2', 1886780722);
        var bucketingKey4 = sprintf('%s%s', 'ppid3', experimentId);

        expect(bucketer._generateBucketValue(bucketingKey1)).to.equal(5254);
        expect(bucketer._generateBucketValue(bucketingKey2)).to.equal(4299);
        expect(bucketer._generateBucketValue(bucketingKey3)).to.equal(2434);
        expect(bucketer._generateBucketValue(bucketingKey4)).to.equal(5439);
      });

      it('should return an error if it cannot generate the hash value', function() {
        assert.throws(function() {
          bucketer._generateBucketValue(null);
        }, sprintf(ERROR_MESSAGES.INVALID_BUCKETING_ID, 'BUCKETER', null, "Cannot read property 'length' of null"));
      });
    });

    describe('testBucketWithBucketingId', function() {
      var bucketerParams;
      var createdLogger = createLogger({
        logLevel: LOG_LEVEL.INFO,
        logToConsole: false,
      });

      beforeEach(function() {
        var configObj = projectConfig.createProjectConfig(cloneDeep(testData));
        bucketerParams = {
          trafficAllocationConfig: configObj.experiments[0].trafficAllocation,
          variationIdMap: configObj.variationIdMap,
          experimentIdMap: configObj.experimentIdMap,
          groupIdMap: configObj.groupIdMap,
          logger: createdLogger,
        };
      });

      it('check that a non null bucketingId buckets a variation different than the one expected with userId', function() {
        var bucketerParams1 = cloneDeep(bucketerParams);
        bucketerParams1['userId'] = 'testBucketingIdControl';
        bucketerParams1['bucketingId'] = '123456789';
        bucketerParams1['experimentKey'] = 'testExperiment';
        bucketerParams1['experimentId'] = '111127';
        expect(bucketer.bucket(bucketerParams1).result).to.equal('111129');
      });

      it('check that a null bucketing ID defaults to bucketing with the userId', function() {
        var bucketerParams2 = cloneDeep(bucketerParams);
        bucketerParams2['userId'] = 'testBucketingIdControl';
        bucketerParams2['bucketingId'] = null;
        bucketerParams2['experimentKey'] = 'testExperiment';
        bucketerParams2['experimentId'] = '111127';
        expect(bucketer.bucket(bucketerParams2).result).to.equal('111128');
      });

      it('check that bucketing works with an experiment in group', function() {
        var bucketerParams4 = cloneDeep(bucketerParams);
        bucketerParams4['userId'] = 'testBucketingIdControl';
        bucketerParams4['bucketingId'] = '123456789';
        bucketerParams4['experimentKey'] = 'groupExperiment2';
        bucketerParams4['experimentId'] = '443';
        expect(bucketer.bucket(bucketerParams4).result).to.equal('111128');
      });
    });
  });
});
