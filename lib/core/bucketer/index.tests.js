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
var bucketer = require('./');
var enums = require('../../utils/enums');
var logger = require('../../plugins/logger');
var projectConfig = require('../project_config');
var sprintf = require('sprintf');
var testData = require('../../tests/test_data').getTestProjectConfig();

var chai = require('chai');
var assert = chai.assert;
var expect = chai.expect;
var cloneDeep = require('lodash/cloneDeep');
var sinon = require('sinon');

var ERROR_MESSAGES = enums.ERROR_MESSAGES;
var LOG_LEVEL = enums.LOG_LEVEL;
var LOG_MESSAGES = enums.LOG_MESSAGES;

describe('lib/core/bucketer', function() {
  describe('APIs', function() {
    describe('bucket', function() {
      var configObj;
      var createdLogger = logger.createLogger({logLevel: LOG_LEVEL.INFO});
      var bucketerParams;

      beforeEach(function() {
        sinon.stub(createdLogger, 'log');
      });

      afterEach(function() {
        createdLogger.log.restore();
      });

      describe('return values for bucketing (excluding groups)', function() {
        beforeEach(function() {
          configObj = projectConfig.createProjectConfig(testData);
          bucketerParams = {
            experimentId: configObj.experiments[0].id,
            experimentKey: configObj.experiments[0].key,
            trafficAllocationConfig: configObj.experiments[0].trafficAllocation,
            variationIdMap: configObj.variationIdMap,
            experimentKeyMap: configObj.experimentKeyMap,
            groupIdMap: configObj.groupIdMap,
            logger: createdLogger,
          };
          sinon.stub(bucketer, '_generateBucketValue')
            .onFirstCall().returns(50)
            .onSecondCall().returns(50000);
        });

        afterEach(function() {
          bucketer._generateBucketValue.restore();
        });

        it('should return correct variation ID when provided bucket value', function() {
          var bucketerParamsTest1 = cloneDeep(bucketerParams);
          bucketerParamsTest1.userId = 'ppid1';
          expect(bucketer.bucket(bucketerParamsTest1)).to.equal('111128');

          var bucketedUser_log1 = createdLogger.log.args[0][1];
          var bucketedUser_log2 = createdLogger.log.args[1][1];

          expect(bucketedUser_log1).to.equal(sprintf(LOG_MESSAGES.USER_ASSIGNED_TO_VARIATION_BUCKET, 'BUCKETER', '50', 'ppid1'));
          expect(bucketedUser_log2).to.equal(sprintf(LOG_MESSAGES.USER_HAS_VARIATION, 'BUCKETER', 'ppid1', 'control', 'testExperiment'));

          var bucketerParamsTest2 = cloneDeep(bucketerParams);
          bucketerParamsTest2.userId = 'ppid2';
          expect(bucketer.bucket(bucketerParamsTest2)).to.equal(null);

          var notBucketedUser_log1 = createdLogger.log.args[2][1];
          var notBucketedUser_log2 = createdLogger.log.args[3][1];

          expect(notBucketedUser_log1).to.equal(sprintf(LOG_MESSAGES.USER_ASSIGNED_TO_VARIATION_BUCKET, 'BUCKETER', '50000', 'ppid2'));
          expect(notBucketedUser_log2).to.equal(sprintf(LOG_MESSAGES.USER_HAS_NO_VARIATION, 'BUCKETER', 'ppid2', 'testExperiment'));
        });
      });

      describe('return values for bucketing (including groups)', function() {
        var bucketerStub;
        beforeEach(function() {
          configObj = projectConfig.createProjectConfig(testData);
          bucketerParams = {
            experimentId: configObj.experiments[0].id,
            experimentKey: configObj.experiments[0].key,
            trafficAllocationConfig: configObj.experiments[0].trafficAllocation,
            variationIdMap: configObj.variationIdMap,
            experimentKeyMap: configObj.experimentKeyMap,
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
              experimentKeyMap: configObj.experimentKeyMap,
              groupIdMap: configObj.groupIdMap,
              logger: createdLogger,
              userId: 'testUser',
            };
          });

          it('should return the proper variation for a user in a grouped experiment', function() {
            bucketerStub.onFirstCall().returns(50);
            bucketerStub.onSecondCall().returns(50);

            expect(bucketer.bucket(bucketerParams)).to.equal('551');

            sinon.assert.calledTwice(bucketerStub);
            sinon.assert.callCount(createdLogger.log, 4);

            var log1 = createdLogger.log.args[0][1];
            expect(log1).to.equal(sprintf(LOG_MESSAGES.USER_ASSIGNED_TO_EXPERIMENT_BUCKET, 'BUCKETER', '50', 'testUser'));

            var log2 = createdLogger.log.args[1][1];
            expect(log2).to.equal(sprintf(LOG_MESSAGES.USER_BUCKETED_INTO_EXPERIMENT_IN_GROUP, 'BUCKETER', 'testUser', 'groupExperiment1', '666'));

            var log3 = createdLogger.log.args[2][1];
            expect(log3).to.equal(sprintf(LOG_MESSAGES.USER_ASSIGNED_TO_VARIATION_BUCKET, 'BUCKETER', '50', 'testUser'));

            var log4 = createdLogger.log.args[3][1];
            expect(log4).to.equal(sprintf(LOG_MESSAGES.USER_HAS_VARIATION, 'BUCKETER', 'testUser', 'var1exp1', 'groupExperiment1'));
          });

          it('should return null when a user is bucketed into a different grouped experiment than the one speicfied', function() {
            bucketerStub.returns(5000);

            expect(bucketer.bucket(bucketerParams)).to.equal(null);

            sinon.assert.calledOnce(bucketerStub);
            sinon.assert.calledTwice(createdLogger.log);

            var log1 = createdLogger.log.args[0][1];
            expect(log1).to.equal(sprintf(LOG_MESSAGES.USER_ASSIGNED_TO_EXPERIMENT_BUCKET, 'BUCKETER', '5000', 'testUser'));
            var log2 = createdLogger.log.args[1][1];
            expect(log2).to.equal(sprintf(LOG_MESSAGES.USER_NOT_BUCKETED_INTO_EXPERIMENT_IN_GROUP, 'BUCKETER', 'testUser', 'groupExperiment1', '666'));
          });

          it('should return null when a user is not bucketed into any experiments in the random group', function() {
            bucketerStub.returns(50000);

            expect(bucketer.bucket(bucketerParams)).to.equal(null);

            sinon.assert.calledOnce(bucketerStub);
            sinon.assert.calledTwice(createdLogger.log);

            var log1 = createdLogger.log.args[0][1];
            expect(log1).to.equal(sprintf(LOG_MESSAGES.USER_ASSIGNED_TO_EXPERIMENT_BUCKET, 'BUCKETER', '50000', 'testUser'));
            var log2 = createdLogger.log.args[1][1];
            expect(log2).to.equal(sprintf(LOG_MESSAGES.USER_NOT_IN_ANY_EXPERIMENT, 'BUCKETER', 'testUser', '666'));
          });

          it('should return null when a user is bucketed into traffic space of deleted experiment within a random group', function() {
            bucketerStub.returns(9000);

            expect(bucketer.bucket(bucketerParams)).to.equal(null);

            sinon.assert.calledOnce(bucketerStub);
            sinon.assert.calledTwice(createdLogger.log);

            var log1 = createdLogger.log.args[0][1];
            expect(log1).to.equal(sprintf(LOG_MESSAGES.USER_ASSIGNED_TO_EXPERIMENT_BUCKET, 'BUCKETER', '9000', 'testUser'));
            var log2 = createdLogger.log.args[1][1];
            expect(log2).to.equal(sprintf(LOG_MESSAGES.USER_NOT_IN_ANY_EXPERIMENT, 'BUCKETER', 'testUser', '666'));
          });

          it('should throw an error if group ID is not in the datafile', function() {
            var bucketerParamsWithInvalidGroupId = cloneDeep(bucketerParams);
            bucketerParamsWithInvalidGroupId.experimentKeyMap[configObj.experiments[4].key].groupId = '6969';

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
              experimentKeyMap: configObj.experimentKeyMap,
              groupIdMap: configObj.groupIdMap,
              logger: createdLogger,
              userId: 'testUser',
            };
          });

          it('should return a variation when a user falls into an experiment within an overlapping group', function() {
            bucketerStub.returns(0);

            expect(bucketer.bucket(bucketerParams)).to.equal('553');

            sinon.assert.calledOnce(bucketerStub);
            sinon.assert.calledTwice(createdLogger.log);

            var log1 = createdLogger.log.args[0][1];
            expect(log1).to.equal(sprintf(LOG_MESSAGES.USER_ASSIGNED_TO_VARIATION_BUCKET, 'BUCKETER', '0', 'testUser'));
            var log2 = createdLogger.log.args[1][1];
            expect(log2).to.equal(sprintf(LOG_MESSAGES.USER_HAS_VARIATION, 'BUCKETER', 'testUser', 'overlappingvar1', 'overlappingGroupExperiment1'));
          });

          it('should return null when a user does not fall into an experiment within an overlapping group', function() {
            bucketerStub.returns(3000);

            expect(bucketer.bucket(bucketerParams)).to.equal(null);
          });
        });
      });

      describe('when the bucket value falls into empty traffic allocation ranges', function() {
        beforeEach(function() {
          configObj = projectConfig.createProjectConfig(testData);
          bucketerParams = {
            experimentId: configObj.experiments[0].id,
            experimentKey: configObj.experiments[0].key,
            trafficAllocationConfig: [{
              entityId: '',
              endOfRange: 5000
            }, {
              entityId: '',
              endOfRange: 10000
            }],
            variationIdMap: configObj.variationIdMap,
            experimentKeyMap: configObj.experimentKeyMap,
            groupIdMap: configObj.groupIdMap,
            logger: createdLogger,
          };
        });

        it('should return null', function() {
          var bucketerParamsTest1 = cloneDeep(bucketerParams);
          bucketerParamsTest1.userId = 'ppid1';
          expect(bucketer.bucket(bucketerParamsTest1)).to.equal(null);
        });
      });

      describe('when the traffic allocation has invalid variation ids', function() {
        beforeEach(function() {
          configObj = projectConfig.createProjectConfig(testData);
          bucketerParams = {
            experimentId: configObj.experiments[0].id,
            experimentKey: configObj.experiments[0].key,
            trafficAllocationConfig: [{
              entityId: -1,
              endOfRange: 5000
            }, {
              entityId: -2,
              endOfRange: 10000
            }],
            variationIdMap: configObj.variationIdMap,
            experimentKeyMap: configObj.experimentKeyMap,
            groupIdMap: configObj.groupIdMap,
            logger: createdLogger,
          };
        });

        it('should return null', function() {
          var bucketerParamsTest1 = cloneDeep(bucketerParams);
          bucketerParamsTest1.userId = 'ppid1';
          expect(bucketer.bucket(bucketerParamsTest1)).to.equal(null);
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
        }, sprintf(ERROR_MESSAGES.INVALID_BUCKETING_ID, 'BUCKETER', null, 'Cannot read property \'length\' of null'));
      });
    });

    describe('testBucketWithBucketingId', function() {
      var createdLogger = logger.createLogger({logLevel: LOG_LEVEL.INFO});

      beforeEach(function() {
        configObj = projectConfig.createProjectConfig(testData);
        bucketerParams = {
          trafficAllocationConfig: configObj.experiments[0].trafficAllocation,
          variationIdMap: configObj.variationIdMap,
          experimentKeyMap: configObj.experimentKeyMap,
          groupIdMap: configObj.groupIdMap,
          logger: createdLogger,
        };
      });

      it('check that a non null bucketingId buckets a variation different than the one expected with userId', function () {
        var bucketerParams1 = cloneDeep(bucketerParams);
        bucketerParams1['userId'] = 'testBucketingIdControl';
        bucketerParams1['bucketingId'] = '123456789';
        bucketerParams1['experimentKey'] = 'testExperiment';
        bucketerParams1['experimentId'] = '111127';
        expect(bucketer.bucket(bucketerParams1)).to.equal('111129');
      });

      it('check that a null bucketing ID defaults to bucketing with the userId', function () {
        var bucketerParams2 = cloneDeep(bucketerParams);
        bucketerParams2['userId'] = 'testBucketingIdControl';
        bucketerParams2['bucketingId'] = null;
        bucketerParams2['experimentKey'] = 'testExperiment';
        bucketerParams2['experimentId'] = '111127';
        expect(bucketer.bucket(bucketerParams2)).to.equal('111128');
      });

      it('check that bucketing works with an experiment in group', function () {
        var bucketerParams4 = cloneDeep(bucketerParams);
        bucketerParams4['userId'] = 'testBucketingIdControl';
        bucketerParams4['bucketingId'] = '123456789';
        bucketerParams4['experimentKey'] = 'groupExperiment2';
        bucketerParams4['experimentId'] = '443';
        expect(bucketer.bucket(bucketerParams4)).to.equal('111128');
      });
    });
  });
});
