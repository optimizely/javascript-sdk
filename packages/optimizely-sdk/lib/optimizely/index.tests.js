/****************************************************************************
 * Copyright 2016-2018, Optimizely, Inc. and contributors                   *
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

var Optimizely = require('./');
var bluebird = require('bluebird');
var bucketer = require('../core/bucketer');
var enums = require('../utils/enums');
var eventBuilder = require('../core/event_builder/index.js');
var eventDispatcher = require('../plugins/event_dispatcher/index.node');
var errorHandler = require('../plugins/error_handler');
var fns = require('../utils/fns');
var jsonSchemaValidator = require('../utils/json_schema_validator');
var logger = require('../plugins/logger');
var decisionService = require('../core/decision_service');
var testData = require('../tests/test_data');
var jsonSchemaValidator = require('../utils/json_schema_validator');
var projectConfig = require('../core/project_config');

var chai = require('chai');
var assert = chai.assert;
var sinon = require('sinon');
var sprintf = require('sprintf');
var uuid = require('uuid');

var ERROR_MESSAGES = enums.ERROR_MESSAGES;
var LOG_LEVEL = enums.LOG_LEVEL;
var LOG_MESSAGES = enums.LOG_MESSAGES;
var DECISION_SOURCES = enums.DECISION_SOURCES;

describe('lib/optimizely', function() {
  describe('constructor', function() {
    var stubErrorHandler = { handleError: function() {}};
    var stubEventDispatcher = { dispatchEvent: function() { return bluebird.resolve(null); } };
    var createdLogger = logger.createLogger({logLevel: LOG_LEVEL.INFO});
    beforeEach(function() {
      sinon.stub(stubErrorHandler, 'handleError');
      sinon.stub(createdLogger, 'log');
    });

    afterEach(function() {
      stubErrorHandler.handleError.restore();
      createdLogger.log.restore();
    });

    describe('constructor', function() {
      it('should construct an instance of the Optimizely class', function() {
        var optlyInstance = new Optimizely({
          clientEngine: 'node-sdk',
          datafile: testData.getTestProjectConfig(),
          errorHandler: stubErrorHandler,
          eventDispatcher: stubEventDispatcher,
          jsonSchemaValidator: jsonSchemaValidator,
          logger: createdLogger,
        });
        assert.instanceOf(optlyInstance, Optimizely);
        sinon.assert.called(createdLogger.log);
        var logMessage = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage, sprintf(LOG_MESSAGES.VALID_DATAFILE, 'OPTIMIZELY'));
      });

      it('should construct an instance of the Optimizely class when datafile is JSON string', function() {
        var optlyInstance = new Optimizely({
          clientEngine: 'node-sdk',
          datafile: JSON.stringify(testData.getTestProjectConfig()),
          errorHandler: stubErrorHandler,
          eventDispatcher: stubEventDispatcher,
          jsonSchemaValidator: jsonSchemaValidator,
          logger: createdLogger,
        });
        assert.instanceOf(optlyInstance, Optimizely);
        sinon.assert.called(createdLogger.log);
        var logMessage = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage, sprintf(LOG_MESSAGES.VALID_DATAFILE, 'OPTIMIZELY'));
      });

      it('should log if the client engine passed in is invalid', function() {
        new Optimizely({
          datafile: testData.getTestProjectConfig(),
          errorHandler: stubErrorHandler,
          eventDispatcher: stubEventDispatcher,
          logger: createdLogger,
        });

        sinon.assert.called(createdLogger.log);
        var logMessage = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage, sprintf(LOG_MESSAGES.INVALID_CLIENT_ENGINE, 'OPTIMIZELY', 'undefined'));
      });

      it('should throw an error if a datafile is not passed into the constructor', function() {
        var optly = new Optimizely({
          clientEngine: 'node-sdk',
          errorHandler: stubErrorHandler,
          logger: createdLogger,
        });
        sinon.assert.calledOnce(stubErrorHandler.handleError);
        var errorMessage = stubErrorHandler.handleError.lastCall.args[0].message;
        assert.strictEqual(errorMessage, sprintf(ERROR_MESSAGES.NO_DATAFILE_SPECIFIED, 'OPTIMIZELY'));

        sinon.assert.calledOnce(createdLogger.log);
        var logMessage = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage, sprintf(ERROR_MESSAGES.NO_DATAFILE_SPECIFIED, 'OPTIMIZELY'));

        assert.isFalse(optly.isValidInstance);
      });

      it('should throw an error if the datafile JSON is malformed', function() {
        var invalidDatafileJSON = 'abc';

        new Optimizely({
          clientEngine: 'node-sdk',
          errorHandler: stubErrorHandler,
          datafile: invalidDatafileJSON,
          jsonSchemaValidator: jsonSchemaValidator,
          logger: createdLogger,
        });

        sinon.assert.calledOnce(createdLogger.log);
        var logMessage = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage, sprintf(ERROR_MESSAGES.INVALID_DATAFILE_MALFORMED, 'OPTIMIZELY'));
      });

      it('should throw an error if the datafile is not valid', function() {
        var invalidDatafile = testData.getTestProjectConfig();
        delete invalidDatafile['projectId'];

        new Optimizely({
          clientEngine: 'node-sdk',
          errorHandler: stubErrorHandler,
          datafile: invalidDatafile,
          jsonSchemaValidator: jsonSchemaValidator,
          logger: createdLogger,
        });
        sinon.assert.calledOnce(stubErrorHandler.handleError);
        var errorMessage = stubErrorHandler.handleError.lastCall.args[0].message;
        assert.strictEqual(errorMessage, sprintf(ERROR_MESSAGES.INVALID_DATAFILE, 'JSON_SCHEMA_VALIDATOR', 'projectId', 'is missing and it is required'));

        sinon.assert.calledOnce(createdLogger.log);
        var logMessage = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage, sprintf(ERROR_MESSAGES.INVALID_DATAFILE, 'JSON_SCHEMA_VALIDATOR', 'projectId', 'is missing and it is required'));
      });

      describe('skipping JSON schema validation', function() {
        beforeEach(function() {
          sinon.spy(jsonSchemaValidator, 'validate');
        });

        afterEach(function() {
          jsonSchemaValidator.validate.restore();
        });

        it('should skip JSON schema validation if skipJSONValidation is passed into instance args with `true` value', function() {
          new Optimizely({
            clientEngine: 'node-sdk',
            datafile: testData.getTestProjectConfig(),
            errorHandler: stubErrorHandler,
            eventDispatcher: stubEventDispatcher,
            logger: logger.createLogger(),
            skipJSONValidation: true,
          });

          sinon.assert.notCalled(jsonSchemaValidator.validate);
        });

        it('should not skip JSON schema validation if skipJSONValidation is passed into instance args with any value other than true', function() {
          new Optimizely({
            clientEngine: 'node-sdk',
            datafile: testData.getTestProjectConfig(),
            errorHandler: stubErrorHandler,
            eventDispatcher: stubEventDispatcher,
            jsonSchemaValidator: jsonSchemaValidator,
            logger: createdLogger,
            skipJSONValidation: 'hi',
          });

          sinon.assert.calledOnce(jsonSchemaValidator.validate);
          sinon.assert.calledOnce(createdLogger.log);
          var logMessage = createdLogger.log.args[0][1];
          assert.strictEqual(logMessage, sprintf(LOG_MESSAGES.VALID_DATAFILE, 'OPTIMIZELY'));
        });
      });

      describe('when a user profile service is provided', function() {
        beforeEach(function() {
          sinon.stub(decisionService, 'createDecisionService');
        });

        afterEach(function() {
          decisionService.createDecisionService.restore();
        });

        it('should validate and pass the user profile service to the decision service', function() {
          var userProfileServiceInstance = {
            lookup: function() {},
            save: function() {},
          };

          var optlyInstance = new Optimizely({
            clientEngine: 'node-sdk',
            logger: createdLogger,
            datafile: testData.getTestProjectConfig(),
            jsonSchemaValidator: jsonSchemaValidator,
            userProfileService: userProfileServiceInstance,
          });

          sinon.assert.calledWith(decisionService.createDecisionService, {
            configObj: optlyInstance.configObj,
            userProfileService: userProfileServiceInstance,
            logger: createdLogger,
          });

          // Checking the second log message as the first one just says "Datafile is valid"
          var logMessage = createdLogger.log.args[1][1];
          assert.strictEqual(logMessage, 'OPTIMIZELY: Valid user profile service provided.');
        });

        it('should pass in a null user profile to the decision service if the provided user profile is invalid', function() {
          var invalidUserProfile = {
            save: function() {},
          };

          var optlyInstance = new Optimizely({
            clientEngine: 'node-sdk',
            logger: createdLogger,
            datafile: testData.getTestProjectConfig(),
            jsonSchemaValidator: jsonSchemaValidator,
            userProfileService: invalidUserProfile,
          });

          sinon.assert.calledWith(decisionService.createDecisionService, {
            configObj: optlyInstance.configObj,
            userProfileService: null,
            logger: createdLogger,
          });

          // Checking the second log message as the first one just says "Datafile is valid"
          var logMessage = createdLogger.log.args[1][1];
          assert.strictEqual(logMessage, 'USER_PROFILE_SERVICE_VALIDATOR: Provided user profile service instance is in an invalid format: Missing function \'lookup\'.');
        });
      });
    });
  });

  //tests separated out because promises don't work well with fake timers
  describe('CustomEventDispatcher', function() {
    var bucketStub;
    var returnsPromiseEventDispatcher = {
      dispatchEvent: function(eventObj) {
        return bluebird.resolve(eventObj);
      }
    };

    var createdLogger = logger.createLogger({logLevel: LOG_LEVEL.INFO});
    var eventDispatcherPromise;
    beforeEach(function() {
      bucketStub = sinon.stub(bucketer, 'bucket');
      eventDispatcherPromise = bluebird.resolve();
      sinon.stub(errorHandler, 'handleError');
      sinon.stub(createdLogger, 'log');
      sinon.stub(returnsPromiseEventDispatcher, 'dispatchEvent').returns(eventDispatcherPromise);
    });

    afterEach(function() {
      bucketer.bucket.restore();
      errorHandler.handleError.restore();
      createdLogger.log.restore();
      returnsPromiseEventDispatcher.dispatchEvent.restore();
    });

    it('should execute a custom dispatchEvent\'s promise in activate', function(done) {
      var instance = new Optimizely({
        clientEngine: 'node-sdk',
        datafile: testData.getTestProjectConfig(),
        errorHandler: errorHandler,
        eventDispatcher: returnsPromiseEventDispatcher,
        jsonSchemaValidator: jsonSchemaValidator,
        logger: createdLogger,
        isValidInstance: true,
      });
      bucketStub.returns('111129');

      var activate = instance.activate('testExperiment', 'testUser');

      assert.strictEqual(activate, 'variation');
      eventDispatcherPromise.then(function() {
        var logMessage = createdLogger.log.args[3][1];
        //checking that we executed our callback after resolving the promise
        assert.strictEqual(logMessage, sprintf(LOG_MESSAGES.ACTIVATE_USER,
                                               'OPTIMIZELY',
                                               'testUser',
                                               'testExperiment'));
        done();
      });
    });

    it('should execute a custom dispatchEvent\'s promise in track', function(done) {
      var instance = new Optimizely({
        clientEngine: 'node-sdk',
        datafile: testData.getTestProjectConfig(),
        errorHandler: errorHandler,
        eventDispatcher: returnsPromiseEventDispatcher,
        jsonSchemaValidator: jsonSchemaValidator,
        logger: createdLogger,
        isValidInstance: true,
      });
      bucketStub.returns('111129');

      var activate = instance.activate('testExperiment', 'testUser');

      assert.strictEqual(activate, 'variation');
      instance.track('testEvent', 'testUser');
      //checking that we executed our callback after resolving the promise
      eventDispatcherPromise.then(function() {
        var logMessage = createdLogger.log.args[6][1];
        assert.strictEqual(logMessage, sprintf(LOG_MESSAGES.TRACK_EVENT,
                                               'OPTIMIZELY',
                                               'testEvent',
                                               'testUser'));
        done();
      });
    });
  });

  describe('APIs', function() {
    var optlyInstance;
    var bucketStub;
    var clock;

    var createdLogger = logger.createLogger({logLevel: LOG_LEVEL.INFO});
    beforeEach(function() {
      optlyInstance = new Optimizely({
        clientEngine: 'node-sdk',
        datafile: testData.getTestProjectConfig(),
        eventBuilder: eventBuilder,
        errorHandler: errorHandler,
        eventDispatcher: eventDispatcher,
        jsonSchemaValidator: jsonSchemaValidator,
        logger: createdLogger,
        isValidInstance: true,
      });

      bucketStub = sinon.stub(bucketer, 'bucket');
      sinon.stub(eventDispatcher, 'dispatchEvent');
      sinon.stub(errorHandler, 'handleError');
      sinon.stub(createdLogger, 'log');
      sinon.stub(uuid, 'v4').returns('a68cf1ad-0393-4e18-af87-efe8f01a7c9c');

      clock = sinon.useFakeTimers(new Date().getTime());
    });

    afterEach(function() {
      bucketer.bucket.restore();
      eventDispatcher.dispatchEvent.restore();
      errorHandler.handleError.restore();
      createdLogger.log.restore();
      clock.restore();
      uuid.v4.restore();
    });

    describe('#activate', function() {
      it('should call bucketer and dispatchEvent with proper args and return variation key', function() {
        bucketStub.returns('111129');
        var activate = optlyInstance.activate('testExperiment', 'testUser');
        assert.strictEqual(activate, 'variation');

        sinon.assert.calledOnce(bucketer.bucket);
        sinon.assert.calledOnce(eventDispatcher.dispatchEvent);
        sinon.assert.calledTwice(createdLogger.log);

        var expectedObj = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
          params: {
            'account_id': '12001',
            'project_id': '111001',
            'visitors': [{
              'snapshots': [{
                'decisions': [{
                  'campaign_id': '4',
                  'experiment_id': '111127',
                  'variation_id': '111129'
                }],
                'events': [{
                  'entity_id': '4',
                  'timestamp': Math.round(new Date().getTime()),
                  'key': 'campaign_activated',
                  'uuid': 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c'
                }]
              }],
              'visitor_id': 'testUser',
              'attributes': [],
            }],
            'revision': '42',
            'client_name': 'node-sdk',
            'client_version': enums.NODE_CLIENT_VERSION,
            'anonymize_ip': false,
          }
        };
        var eventDispatcherCall = eventDispatcher.dispatchEvent.args[0];
        assert.deepEqual(eventDispatcherCall[0], expectedObj);

        var logMessage1 = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage1, sprintf(LOG_MESSAGES.USER_HAS_NO_FORCED_VARIATION,
                                                'PROJECT_CONFIG',
                                                'testUser'));
        var logMessage2 = createdLogger.log.args[1][1];
        assert.strictEqual(logMessage2, sprintf(LOG_MESSAGES.DISPATCH_IMPRESSION_EVENT,
                                               'OPTIMIZELY',
                                               expectedObj.url,
                                               JSON.stringify(expectedObj.params)));
      });

      it('should dispatch proper params for null value attributes', function() {
        bucketStub.returns('122229');
        var activate = optlyInstance.activate('testExperimentWithAudiences', 'testUser', {browser_type: 'firefox', 'test_null_attribute': null});
        assert.strictEqual(activate, 'variationWithAudience');

        sinon.assert.calledOnce(bucketer.bucket);
        sinon.assert.calledOnce(eventDispatcher.dispatchEvent);
        sinon.assert.calledTwice(createdLogger.log);

        var expectedObj = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
          params: {
            'account_id': '12001',
            'project_id': '111001',
            'visitors': [{
              'snapshots': [{
                'decisions': [{
                  'campaign_id': '5',
                  'experiment_id': '122227',
                  'variation_id': '122229'
                }],
                'events': [{
                  'entity_id': '5',
                  'timestamp': Math.round(new Date().getTime()),
                  'key': 'campaign_activated',
                  'uuid': 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c'
                }]
              }],
              'visitor_id': 'testUser',
              'attributes': [{
                'entity_id': '111094',
                'key': 'browser_type',
                'type': 'custom',
                'value': 'firefox'
              }],
            }],
            'revision': '42',
            'client_name': 'node-sdk',
            'client_version': enums.NODE_CLIENT_VERSION,
            'anonymize_ip': false,
          }
        };

        var eventDispatcherCall = eventDispatcher.dispatchEvent.args[0];
        assert.deepEqual(eventDispatcherCall[0], expectedObj);

        var logMessage0 = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage0, sprintf(LOG_MESSAGES.USER_HAS_NO_FORCED_VARIATION,
                                                'PROJECT_CONFIG',
                                                'testUser'));

        var logMessage1 = createdLogger.log.args[1][1];
        assert.strictEqual(logMessage1, sprintf(LOG_MESSAGES.DISPATCH_IMPRESSION_EVENT,
                                               'OPTIMIZELY',
                                               expectedObj.url,
                                               JSON.stringify(expectedObj.params)));
      });

      it('should call bucketer and dispatchEvent with proper args and return variation key if user is in audience', function() {
        bucketStub.returns('122229');
        var activate = optlyInstance.activate('testExperimentWithAudiences', 'testUser', {browser_type: 'firefox'});
        assert.strictEqual(activate, 'variationWithAudience');

        sinon.assert.calledOnce(bucketer.bucket);
        sinon.assert.calledOnce(eventDispatcher.dispatchEvent);
        sinon.assert.calledTwice(createdLogger.log);

        var expectedObj = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
          params: {
            'account_id': '12001',
            'project_id': '111001',
            'visitors': [{
              'snapshots': [{
                'decisions': [{
                  'campaign_id': '5',
                  'experiment_id': '122227',
                  'variation_id': '122229'
                }],
                'events': [{
                  'entity_id': '5',
                  'timestamp': Math.round(new Date().getTime()),
                  'key': 'campaign_activated',
                  'uuid': 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c'
                }]
              }],
              'visitor_id': 'testUser',
              'attributes': [{
                'entity_id': '111094',
                'key': 'browser_type',
                'type': 'custom',
                'value': 'firefox'
              }],
            }],
            'revision': '42',
            'client_name': 'node-sdk',
            'client_version': enums.NODE_CLIENT_VERSION,
            'anonymize_ip': false,
          }
        };

        var eventDispatcherCall = eventDispatcher.dispatchEvent.args[0];
        assert.deepEqual(eventDispatcherCall[0], expectedObj);

        var logMessage1 = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage1, sprintf(LOG_MESSAGES.USER_HAS_NO_FORCED_VARIATION,
                                                'PROJECT_CONFIG',
                                                'testUser'));
        var logMessage2 = createdLogger.log.args[1][1];
        assert.strictEqual(logMessage2, sprintf(LOG_MESSAGES.DISPATCH_IMPRESSION_EVENT,
                                               'OPTIMIZELY',
                                               expectedObj.url,
                                               JSON.stringify(expectedObj.params)));
      });

      it('should call bucketer and dispatchEvent with proper args and return variation key if user is in grouped experiment', function() {
        bucketStub.returns('662');
        var activate = optlyInstance.activate('groupExperiment2', 'testUser');
        assert.strictEqual(activate, 'var2exp2');

        sinon.assert.calledOnce(bucketer.bucket);
        sinon.assert.calledOnce(eventDispatcher.dispatchEvent);
        sinon.assert.calledTwice(createdLogger.log);

        var expectedObj = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
          params: {
            'account_id': '12001',
            'project_id': '111001',
            'visitors': [{
              'snapshots': [{
                'decisions': [{
                  'campaign_id': '2',
                  'experiment_id': '443',
                  'variation_id': '662'
                }],
                'events': [{
                  'entity_id': '2',
                  'timestamp': Math.round(new Date().getTime()),
                  'key': 'campaign_activated',
                  'uuid': 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c'
                }]
              }],
              'visitor_id': 'testUser',
              'attributes': [],
            }],
            'revision': '42',
            'client_name': 'node-sdk',
            'client_version': enums.NODE_CLIENT_VERSION,
            'anonymize_ip': false,
          }
        };

        var eventDispatcherCall = eventDispatcher.dispatchEvent.args[0];
        assert.deepEqual(eventDispatcherCall[0], expectedObj);

        var logMessage1 = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage1, sprintf(LOG_MESSAGES.USER_HAS_NO_FORCED_VARIATION,
                                                'PROJECT_CONFIG',
                                                'testUser'));
        var logMessage2 = createdLogger.log.args[1][1];
        assert.strictEqual(logMessage2, sprintf(LOG_MESSAGES.DISPATCH_IMPRESSION_EVENT,
                                               'OPTIMIZELY',
                                               expectedObj.url,
                                               JSON.stringify(expectedObj.params)));
      });

      it('should call bucketer and dispatchEvent with proper args and return variation key if user is in grouped experiment and is in audience', function() {
        bucketStub.returns('552');
        var activate = optlyInstance.activate('groupExperiment1', 'testUser', {browser_type: 'firefox'});
        assert.strictEqual(activate, 'var2exp1');

        sinon.assert.calledOnce(bucketer.bucket);
        sinon.assert.calledOnce(eventDispatcher.dispatchEvent);
        sinon.assert.calledTwice(createdLogger.log);

        var expectedObj = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
          params: {
            'account_id': '12001',
            'project_id': '111001',
            'visitors': [{
              'snapshots': [{
                'decisions': [{
                  'campaign_id': '1',
                  'experiment_id': '442',
                  'variation_id': '552'
                }],
                'events': [{
                  'entity_id': '1',
                  'timestamp': Math.round(new Date().getTime()),
                  'key': 'campaign_activated',
                  'uuid': 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c'
                }]
              }],
              'visitor_id': 'testUser',
              'attributes': [{
                'entity_id': '111094',
                'key': 'browser_type',
                'type': 'custom',
                'value': 'firefox'
              }],
            }],
            'revision': '42',
            'client_name': 'node-sdk',
            'client_version': enums.NODE_CLIENT_VERSION,
            'anonymize_ip': false,
          }
        };

        var eventDispatcherCall = eventDispatcher.dispatchEvent.args[0];
        assert.deepEqual(eventDispatcherCall[0], expectedObj);
      });

      it('should not make a dispatch event call if variation ID is null', function() {
        bucketStub.returns(null);
        assert.isNull(optlyInstance.activate('testExperiment', 'testUser'));
        sinon.assert.notCalled(eventDispatcher.dispatchEvent);
        sinon.assert.calledTwice(createdLogger.log);

        var logMessage1 = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage1, sprintf(LOG_MESSAGES.USER_HAS_NO_FORCED_VARIATION,
                                                'PROJECT_CONFIG',
                                                'testUser'));
        var logMessage2 = createdLogger.log.args[1][1];
        assert.strictEqual(logMessage2, sprintf(LOG_MESSAGES.NOT_ACTIVATING_USER,
                                               'OPTIMIZELY',
                                               'testUser',
                                               'testExperiment'));
      });

      it('should return null if user is not in audience and user is not in group', function() {
        assert.isNull(optlyInstance.activate('testExperimentWithAudiences', 'testUser', {browser_type: 'chrome'}));
        sinon.assert.callCount(createdLogger.log, 3);

        var logMessage0 = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage0, sprintf(LOG_MESSAGES.USER_HAS_NO_FORCED_VARIATION, 'PROJECT_CONFIG', 'testUser'));

        var logMessage1 = createdLogger.log.args[1][1];
        assert.strictEqual(logMessage1, sprintf(LOG_MESSAGES.USER_NOT_IN_EXPERIMENT, 'DECISION_SERVICE', 'testUser', 'testExperimentWithAudiences'));

        var logMessage2 = createdLogger.log.args[2][1];
        assert.strictEqual(logMessage2, sprintf(LOG_MESSAGES.NOT_ACTIVATING_USER, 'OPTIMIZELY', 'testUser', 'testExperimentWithAudiences'));
      });

      it('should return null if user is not in audience and user is in group', function() {
        assert.isNull(optlyInstance.activate('groupExperiment1', 'testUser', {browser_type: 'chrome'}));
        sinon.assert.callCount(createdLogger.log, 3);

        var logMessage0 = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage0, sprintf(LOG_MESSAGES.USER_HAS_NO_FORCED_VARIATION, 'PROJECT_CONFIG', 'testUser'));

        var logMessage1 = createdLogger.log.args[1][1];
        assert.strictEqual(logMessage1, sprintf(LOG_MESSAGES.USER_NOT_IN_EXPERIMENT, 'DECISION_SERVICE', 'testUser', 'groupExperiment1'));

        var logMessage2 = createdLogger.log.args[2][1];
        assert.strictEqual(logMessage2, sprintf(LOG_MESSAGES.NOT_ACTIVATING_USER, 'OPTIMIZELY', 'testUser', 'groupExperiment1'));
      });

      it('should return null if experiment is not running', function() {
        assert.isNull(optlyInstance.activate('testExperimentNotRunning', 'testUser'));
        sinon.assert.calledTwice(createdLogger.log);

        var logMessage1 = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage1, sprintf(LOG_MESSAGES.EXPERIMENT_NOT_RUNNING, 'DECISION_SERVICE', 'testExperimentNotRunning'));
        var logMessage2 = createdLogger.log.args[1][1];
        assert.strictEqual(logMessage2, sprintf(LOG_MESSAGES.NOT_ACTIVATING_USER, 'OPTIMIZELY', 'testUser', 'testExperimentNotRunning'));
      });

      it('should throw an error for invalid user ID', function() {
        assert.isNull(optlyInstance.activate('testExperiment', null));

        sinon.assert.notCalled(eventDispatcher.dispatchEvent);

        sinon.assert.calledOnce(errorHandler.handleError);
        var errorMessage = errorHandler.handleError.lastCall.args[0].message;
        assert.strictEqual(errorMessage, sprintf(ERROR_MESSAGES.INVALID_INPUT_FORMAT, 'OPTIMIZELY', 'user_id'));

        sinon.assert.calledTwice(createdLogger.log);

        var logMessage1 = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage1, sprintf(ERROR_MESSAGES.INVALID_INPUT_FORMAT, 'OPTIMIZELY', 'user_id'));
        var logMessage2 = createdLogger.log.args[1][1];
        assert.strictEqual(logMessage2, sprintf(LOG_MESSAGES.NOT_ACTIVATING_USER, 'OPTIMIZELY', 'null', 'testExperiment'));
      });

      it('should throw an error for invalid experiment key', function() {
        assert.isNull(optlyInstance.activate('invalidExperimentKey', 'testUser'));

        sinon.assert.notCalled(eventDispatcher.dispatchEvent);

        sinon.assert.calledOnce(errorHandler.handleError);
        var errorMessage = errorHandler.handleError.lastCall.args[0].message;
        assert.strictEqual(errorMessage, sprintf(ERROR_MESSAGES.INVALID_EXPERIMENT_KEY, 'OPTIMIZELY', 'invalidExperimentKey'));

        sinon.assert.calledTwice(createdLogger.log);
        var logMessage1 = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage1, sprintf(ERROR_MESSAGES.INVALID_EXPERIMENT_KEY, 'OPTIMIZELY', 'invalidExperimentKey'));
        var logMessage2 = createdLogger.log.args[1][1];
        assert.strictEqual(logMessage2, sprintf(LOG_MESSAGES.NOT_ACTIVATING_USER, 'OPTIMIZELY', 'testUser', 'invalidExperimentKey'));
      });

      it('should throw an error for invalid attributes', function() {
        assert.isNull(optlyInstance.activate('testExperimentWithAudiences', 'testUser', []));

        sinon.assert.notCalled(eventDispatcher.dispatchEvent);
        sinon.assert.calledOnce(errorHandler.handleError);
        var errorMessage = errorHandler.handleError.lastCall.args[0].message;
        assert.strictEqual(errorMessage, sprintf(ERROR_MESSAGES.INVALID_ATTRIBUTES, 'ATTRIBUTES_VALIDATOR'));

        sinon.assert.calledTwice(createdLogger.log);
        var logMessage1 = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage1, sprintf(ERROR_MESSAGES.INVALID_ATTRIBUTES, 'ATTRIBUTES_VALIDATOR'));
        var logMessage2 = createdLogger.log.args[1][1];
        assert.strictEqual(logMessage2, sprintf(LOG_MESSAGES.NOT_ACTIVATING_USER, 'OPTIMIZELY', 'testUser', 'testExperimentWithAudiences'));
      });

      it('should activate when logger is in DEBUG mode', function() {
        bucketStub.returns('111129');
        var instance = new Optimizely({
          datafile: testData.getTestProjectConfig(),
          errorHandler: errorHandler,
          eventDispatcher: eventDispatcher,
          jsonSchemaValidator: jsonSchemaValidator,
          logger: logger.createLogger({logLevel: 1}),
          isValidInstance: true,
        });

        var variation = instance.activate('testExperiment', 'testUser');
        assert.strictEqual(variation, 'variation');
        sinon.assert.calledOnce(eventDispatcher.dispatchEvent);
      });

      describe('whitelisting', function() {
        beforeEach(function() {
          sinon.spy(Optimizely.prototype, '__validateInputs');
        });

        afterEach(function() {
          Optimizely.prototype.__validateInputs.restore();
        });

        it('should return forced variation after experiment status check and before audience check', function() {
          var activate = optlyInstance.activate('testExperiment', 'user1');
          assert.strictEqual(activate, 'control');

          sinon.assert.calledTwice(Optimizely.prototype.__validateInputs);
          sinon.assert.calledThrice(createdLogger.log);

          var logMessage0 = createdLogger.log.args[0][1];
          assert.strictEqual(logMessage0, sprintf(LOG_MESSAGES.USER_HAS_NO_FORCED_VARIATION, 'PROJECT_CONFIG', 'user1'));
          var logMessage1 = createdLogger.log.args[1][1];
          assert.strictEqual(logMessage1, sprintf(LOG_MESSAGES.USER_FORCED_IN_VARIATION, 'DECISION_SERVICE', 'user1', 'control'));

          var expectedObj = {
            url: 'https://logx.optimizely.com/v1/events',
            httpVerb: 'POST',
            params: {
              'account_id': '12001',
              'project_id': '111001',
              'visitors': [{
                'snapshots': [{
                  'decisions': [{
                    'campaign_id': '4',
                    'experiment_id': '111127',
                    'variation_id': '111128'
                  }],
                  'events': [{
                    'entity_id': '4',
                    'timestamp': Math.round(new Date().getTime()),
                    'key': 'campaign_activated',
                    'uuid': 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c'
                  }]
                }],
                'visitor_id': 'user1',
                'attributes': [],
              }],
              'revision': '42',
              'client_name': 'node-sdk',
              'client_version': enums.NODE_CLIENT_VERSION,
              'anonymize_ip': false,
            }
          };

          var logMessage2 = createdLogger.log.args[2][1];
          assert.strictEqual(logMessage2, sprintf(LOG_MESSAGES.DISPATCH_IMPRESSION_EVENT,
                                                  'OPTIMIZELY',
                                                  expectedObj.url,
                                                  JSON.stringify(expectedObj.params)));
        });
      });

      it('returns the variation key but does not dispatch the event if user is in experiment and experiment is set to Launched', function() {
        bucketStub.returns('144448');

        var bucketedVariation = optlyInstance.activate('testExperimentLaunched', 'testUser');
        assert.strictEqual(bucketedVariation, 'controlLaunched');

        sinon.assert.notCalled(eventDispatcher.dispatchEvent);
      });

      it('should not activate when optimizely object is not a valid instance', function() {
        var instance = new Optimizely({
          datafile: {},
          errorHandler: errorHandler,
          eventDispatcher: eventDispatcher,
          logger: createdLogger,
        });

        createdLogger.log.reset();

        instance.activate('testExperiment', 'testUser');

        sinon.assert.calledOnce(createdLogger.log);
        var logMessage = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage, sprintf(LOG_MESSAGES.INVALID_OBJECT, 'OPTIMIZELY', 'activate'));

        sinon.assert.notCalled(eventDispatcher.dispatchEvent);
      });
    });

    describe('#track', function() {
      it('should call bucketer and dispatchEvent with proper args', function() {
        bucketStub.returns('111129');
        optlyInstance.track('testEvent', 'testUser');

        sinon.assert.calledOnce(bucketer.bucket);
        sinon.assert.calledOnce(eventDispatcher.dispatchEvent);
        sinon.assert.called(createdLogger.log);

        var expectedObj = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
          params: {
            'account_id': '12001',
            'project_id': '111001',
            'visitors': [{
              'snapshots': [{
                'decisions': [{
                  'campaign_id': '4',
                  'experiment_id': '111127',
                  'variation_id': '111129'
                }],
                'events': [{
                  'entity_id': '111095',
                  'timestamp': Math.round(new Date().getTime()),
                  'uuid': 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                  'key': 'testEvent'
                }]
              }],
              'visitor_id': 'testUser',
              'attributes': [],
            }],
            'revision': '42',
            'client_name': 'node-sdk',
            'client_version': enums.NODE_CLIENT_VERSION,
            'anonymize_ip': false,
          }
        };
        var eventDispatcherCall = eventDispatcher.dispatchEvent.args[0];
        assert.deepEqual(eventDispatcherCall[0], expectedObj);

        var logMessage1 = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage1, sprintf(LOG_MESSAGES.USER_HAS_NO_FORCED_VARIATION,
                                                'PROJECT_CONFIG',
                                                'testUser'));

        var logMessage2 = createdLogger.log.args[1][1];
        assert.strictEqual(logMessage2, sprintf(LOG_MESSAGES.DISPATCH_CONVERSION_EVENT,
                                               'OPTIMIZELY',
                                               expectedObj.url,
                                               JSON.stringify(expectedObj.params)));
      });

      it('should call bucketer and dispatchEvent with proper args when including null value attributes', function() {
        bucketStub.returns('122229');
        optlyInstance.track('testEventWithAudiences', 'testUser', {browser_type: 'firefox', 'test_null_attribute': null});

        sinon.assert.calledOnce(bucketer.bucket);
        sinon.assert.calledOnce(eventDispatcher.dispatchEvent);
        sinon.assert.calledTwice(createdLogger.log);

        var expectedObj = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
          params: {
            'account_id': '12001',
            'project_id': '111001',
            'visitors': [{
              'snapshots': [{
                'decisions': [{
                  'campaign_id': '5',
                  'experiment_id': '122227',
                  'variation_id': '122229'
                }],
                'events': [{
                  'entity_id': '111097',
                  'timestamp': Math.round(new Date().getTime()),
                  'uuid': 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                  'key': 'testEventWithAudiences'
                }]
              }],
              'visitor_id': 'testUser',
              'attributes': [{
                'entity_id': '111094',
                'key': 'browser_type',
                'type': 'custom',
                'value': 'firefox'
              }],
            }],
            'revision': '42',
            'client_name': 'node-sdk',
            'client_version': enums.NODE_CLIENT_VERSION,
            'anonymize_ip': false,
          }
        };
        var eventDispatcherCall = eventDispatcher.dispatchEvent.args[0];
        assert.deepEqual(eventDispatcherCall[0], expectedObj);

        var logMessage0 = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage0, sprintf(LOG_MESSAGES.USER_HAS_NO_FORCED_VARIATION,
                                                'PROJECT_CONFIG',
                                                'testUser'));

        var logMessage1 = createdLogger.log.args[1][1];
        assert.strictEqual(logMessage1, sprintf(LOG_MESSAGES.DISPATCH_CONVERSION_EVENT,
                                               'OPTIMIZELY',
                                               expectedObj.url,
                                               JSON.stringify(expectedObj.params)));
      });

      it('should call bucketer and dispatchEvent with proper args when including attributes', function() {
        bucketStub.returns('122229');
        optlyInstance.track('testEventWithAudiences', 'testUser', {browser_type: 'firefox'});

        sinon.assert.calledOnce(bucketer.bucket);
        sinon.assert.calledOnce(eventDispatcher.dispatchEvent);
        sinon.assert.calledTwice(createdLogger.log);

        var expectedObj = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
          params: {
            'account_id': '12001',
            'project_id': '111001',
            'visitors': [{
              'snapshots': [{
                'decisions': [{
                  'campaign_id': '5',
                  'experiment_id': '122227',
                  'variation_id': '122229'
                }],
                'events': [{
                  'entity_id': '111097',
                  'timestamp': Math.round(new Date().getTime()),
                  'uuid': 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                  'key': 'testEventWithAudiences'
                }]
              }],
              'visitor_id': 'testUser',
              'attributes': [{
                'entity_id': '111094',
                'key': 'browser_type',
                'type': 'custom',
                'value': 'firefox'
              }],
            }],
            'revision': '42',
            'client_name': 'node-sdk',
            'client_version': enums.NODE_CLIENT_VERSION,
            'anonymize_ip': false,
          }
        };
        var eventDispatcherCall = eventDispatcher.dispatchEvent.args[0];
        assert.deepEqual(eventDispatcherCall[0], expectedObj);

        var logMessage1 = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage1, sprintf(LOG_MESSAGES.USER_HAS_NO_FORCED_VARIATION,
                                                'PROJECT_CONFIG',
                                                'testUser'));

        var logMessage2 = createdLogger.log.args[1][1];
        assert.strictEqual(logMessage2, sprintf(LOG_MESSAGES.DISPATCH_CONVERSION_EVENT,
                                               'OPTIMIZELY',
                                               expectedObj.url,
                                               JSON.stringify(expectedObj.params)));
      });

      it('should call bucketer and dispatchEvent with proper args when including event tags', function() {
        bucketStub.returns('111129');
        optlyInstance.track('testEvent', 'testUser', undefined, {eventTag: 'chill'});

        sinon.assert.calledOnce(bucketer.bucket);
        sinon.assert.calledOnce(eventDispatcher.dispatchEvent);
        sinon.assert.calledTwice(createdLogger.log);

        var expectedObj = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
          params: {
            'account_id': '12001',
            'project_id': '111001',
            'visitors': [{
              'snapshots': [{
                'decisions': [{
                  'campaign_id': '4',
                  'experiment_id': '111127',
                  'variation_id': '111129'
                }],
                'events': [{
                  'entity_id': '111095',
                  'timestamp': Math.round(new Date().getTime()),
                  'uuid': 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                  'key': 'testEvent',
                  'tags': {
                    'eventTag': 'chill'
                  }
                }]
              }],
              'visitor_id': 'testUser',
              'attributes': [],
            }],
            'revision': '42',
            'client_name': 'node-sdk',
            'client_version': enums.NODE_CLIENT_VERSION,
            'anonymize_ip': false,
          }
        };
        var eventDispatcherCall = eventDispatcher.dispatchEvent.args[0];
        assert.deepEqual(eventDispatcherCall[0], expectedObj);

        var logMessage1 = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage1, sprintf(LOG_MESSAGES.USER_HAS_NO_FORCED_VARIATION,
                                                'PROJECT_CONFIG',
                                                'testUser'));
        var logMessage2 = createdLogger.log.args[1][1];
        assert.strictEqual(logMessage2, sprintf(LOG_MESSAGES.DISPATCH_CONVERSION_EVENT,
                                               'OPTIMIZELY',
                                               expectedObj.url,
                                               JSON.stringify(expectedObj.params)));
      });

      it('should call bucketer and dispatchEvent with proper args when including event tags and revenue', function() {
        bucketStub.returns('111129');
        optlyInstance.track('testEvent', 'testUser', undefined, {revenue: 4200, eventTag: 'chill'});

        sinon.assert.calledOnce(bucketer.bucket);
        sinon.assert.calledOnce(eventDispatcher.dispatchEvent);
        sinon.assert.calledThrice(createdLogger.log);

        var expectedObj = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
          params: {
            'account_id': '12001',
            'project_id': '111001',
            'visitors': [{
              'snapshots': [{
                'decisions': [{
                  'campaign_id': '4',
                  'experiment_id': '111127',
                  'variation_id': '111129'
                }],
                'events': [{
                  'entity_id': '111095',
                  'timestamp': Math.round(new Date().getTime()),
                  'uuid': 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                  'key': 'testEvent',
                  'revenue': 4200,
                  'tags': {
                    'revenue': 4200,
                    'eventTag': 'chill'
                  }
                }]
              }],
              'visitor_id': 'testUser',
              'attributes': [],
            }],
            'revision': '42',
            'client_name': 'node-sdk',
            'client_version': enums.NODE_CLIENT_VERSION,
            'anonymize_ip': false,
          }
        };
        var eventDispatcherCall = eventDispatcher.dispatchEvent.args[0];
        assert.deepEqual(eventDispatcherCall[0], expectedObj);

        var logMessage0 = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage0, sprintf(LOG_MESSAGES.USER_HAS_NO_FORCED_VARIATION,
                                                'PROJECT_CONFIG',
                                                'testUser'));
        var logMessage1 = createdLogger.log.args[1][1];
        assert.strictEqual(logMessage1, sprintf(LOG_MESSAGES.PARSED_REVENUE_VALUE,
                                               'EVENT_TAG_UTILS',
                                               '4200'));
        var logMessage2 = createdLogger.log.args[2][1];
        assert.strictEqual(logMessage2, sprintf(LOG_MESSAGES.DISPATCH_CONVERSION_EVENT,
                                               'OPTIMIZELY',
                                               expectedObj.url,
                                               JSON.stringify(expectedObj.params)));
      });

      it('should call bucketer and dispatchEvent with proper args when including event tags and null event tag values and revenue', function() {
        bucketStub.returns('111129');
        optlyInstance.track('testEvent', 'testUser', undefined, {revenue: 4200, eventTag: 'chill', 'testNullEventTag': null});

        sinon.assert.calledOnce(bucketer.bucket);
        sinon.assert.calledOnce(eventDispatcher.dispatchEvent);
        sinon.assert.calledThrice(createdLogger.log);

        var expectedObj = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
          params: {
            'account_id': '12001',
            'project_id': '111001',
            'visitors': [{
              'snapshots': [{
                'decisions': [{
                  'campaign_id': '4',
                  'experiment_id': '111127',
                  'variation_id': '111129'
                }],
                'events': [{
                  'entity_id': '111095',
                  'timestamp': Math.round(new Date().getTime()),
                  'uuid': 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                  'key': 'testEvent',
                  'revenue': 4200,
                  'tags': {
                    'revenue': 4200,
                    'eventTag': 'chill'
                  }
                }]
              }],
              'visitor_id': 'testUser',
              'attributes': [],
            }],
            'revision': '42',
            'client_name': 'node-sdk',
            'client_version': enums.NODE_CLIENT_VERSION,
            'anonymize_ip': false,
          }
        };
        var eventDispatcherCall = eventDispatcher.dispatchEvent.args[0];
        assert.deepEqual(eventDispatcherCall[0], expectedObj);

        var logMessage0 = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage0, sprintf(LOG_MESSAGES.USER_HAS_NO_FORCED_VARIATION,
                                                'PROJECT_CONFIG',
                                                'testUser'));

        var logMessage1 = createdLogger.log.args[1][1];
        assert.strictEqual(logMessage1, sprintf(LOG_MESSAGES.PARSED_REVENUE_VALUE,
                                               'EVENT_TAG_UTILS',
                                               '4200'));
        var logMessage2 = createdLogger.log.args[2][1];
        assert.strictEqual(logMessage2, sprintf(LOG_MESSAGES.DISPATCH_CONVERSION_EVENT,
                                               'OPTIMIZELY',
                                               expectedObj.url,
                                               JSON.stringify(expectedObj.params)));
      });

      it('should call bucketer and dispatchEvent with proper args when including invalid event value', function() {
        bucketStub.returns('111129');
        optlyInstance.track('testEvent', 'testUser', undefined, '4200');

        sinon.assert.notCalled(bucketer.bucket);
        sinon.assert.notCalled(eventDispatcher.dispatchEvent);
        sinon.assert.calledOnce(createdLogger.log);
      });

      it('should not track a user for an experiment not running', function() {
        optlyInstance.track('testEventWithExperimentNotRunning', 'testUser');
        sinon.assert.notCalled(bucketer.bucket);
        sinon.assert.notCalled(eventDispatcher.dispatchEvent);

        sinon.assert.calledThrice(createdLogger.log);
        var logMessage1 = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage1, sprintf(LOG_MESSAGES.EXPERIMENT_NOT_RUNNING, 'DECISION_SERVICE', 'testExperimentNotRunning'));
        var logMessage2 = createdLogger.log.args[1][1];
        assert.strictEqual(logMessage2, sprintf(LOG_MESSAGES.NOT_TRACKING_USER_FOR_EXPERIMENT, 'OPTIMIZELY', 'testUser', 'testExperimentNotRunning'));
        var logMessage3 = createdLogger.log.args[2][1];
        assert.strictEqual(logMessage3, sprintf(LOG_MESSAGES.EVENT_NOT_ASSOCIATED_WITH_EXPERIMENTS, 'OPTIMIZELY', 'testEventWithExperimentNotRunning'));
      });

      it('should not track a user when user is not in the audience of the experiment', function() {
        optlyInstance.track('testEventWithAudiences', 'testUser', {browser_type: 'chrome'});
        sinon.assert.notCalled(bucketer.bucket);
        sinon.assert.notCalled(eventDispatcher.dispatchEvent);

        sinon.assert.callCount(createdLogger.log, 4);
        var logMessage0 = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage0, sprintf(LOG_MESSAGES.USER_HAS_NO_FORCED_VARIATION, 'PROJECT_CONFIG', 'testUser'));
        var logMessage1 = createdLogger.log.args[1][1];
        assert.strictEqual(logMessage1, sprintf(LOG_MESSAGES.USER_NOT_IN_EXPERIMENT, 'DECISION_SERVICE', 'testUser', 'testExperimentWithAudiences'));
        var logMessage2 = createdLogger.log.args[2][1];
        assert.strictEqual(logMessage2, sprintf(LOG_MESSAGES.NOT_TRACKING_USER_FOR_EXPERIMENT, 'OPTIMIZELY', 'testUser', 'testExperimentWithAudiences'));
        var logMessage3 = createdLogger.log.args[3][1];
        assert.strictEqual(logMessage3, sprintf(LOG_MESSAGES.EVENT_NOT_ASSOCIATED_WITH_EXPERIMENTS, 'OPTIMIZELY', 'testEventWithAudiences'));
      });

      it('should not track a user when the event has no associated experiments', function() {
        optlyInstance.track('testEventWithoutExperiments', 'testUser');
        sinon.assert.notCalled(bucketer.bucket);
        sinon.assert.notCalled(eventDispatcher.dispatchEvent);
        sinon.assert.calledOnce(createdLogger.log);
        var logMessage = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage, sprintf(LOG_MESSAGES.EVENT_NOT_ASSOCIATED_WITH_EXPERIMENTS, 'OPTIMIZELY', 'testEventWithoutExperiments'));
      });

      it('should not track a user when the user is not bucketed into the experiment', function() {
        bucketStub.returns(null);
        optlyInstance.track('testEvent', 'testUser');
        sinon.assert.notCalled(eventDispatcher.dispatchEvent);
        var logMessage0 = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage0, sprintf(LOG_MESSAGES.USER_HAS_NO_FORCED_VARIATION, 'PROJECT_CONFIG', 'testUser'));
        var logMessage1 = createdLogger.log.args[1][1];
        assert.strictEqual(logMessage1, sprintf(LOG_MESSAGES.NOT_TRACKING_USER_FOR_EXPERIMENT, 'OPTIMIZELY', 'testUser', 'testExperiment'));
      });

      it('should only send conversion events in experiments the user is bucketed into', function() {
        bucketStub.onCall(0).returns('111129');
        bucketStub.onCall(1).returns(null);

        optlyInstance.track('testEventWithMultipleExperiments', 'testUser', {browser_type: 'firefox'});

        sinon.assert.calledTwice(bucketer.bucket);

        // conversion event only dispatched once because user is bucketed into only 1 of 3 experiments
        sinon.assert.calledOnce(eventDispatcher.dispatchEvent);
      });

      it('should only track a user for experiments where they are in the audience and where the experiment is running', function() {
        var expectedObj = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
          params: {
            'account_id': '12001',
            'project_id': '111001',
            'visitors': [{
              'snapshots': [{
                'decisions': [{
                  'campaign_id': '4',
                  'experiment_id': '111127',
                  'variation_id': '111129'
                }],
                'events': [{
                  'entity_id': '111100',
                  'timestamp': Math.round(new Date().getTime()),
                  'uuid': 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                  'key': 'testEventWithMultipleExperiments',
                }]
              },
              {
                'decisions': [{
                  'campaign_id': '5',
                  'experiment_id': '122227',
                  'variation_id': '122229'
                }],
                'events': [{
                  'entity_id': '111100',
                  'timestamp': Math.round(new Date().getTime()),
                  'uuid': 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                  'key': 'testEventWithMultipleExperiments',
                }]
              }],
              'visitor_id': 'testUser',
              'attributes': [{
                'entity_id': '111094',
                'key': 'browser_type',
                'type': 'custom',
                'value': 'firefox'
              }],
            }],
            'revision': '42',
            'client_name': 'node-sdk',
            'client_version': enums.NODE_CLIENT_VERSION,
            'anonymize_ip': false,
          }
        };

        bucketStub.onCall(0).returns('111129');
        bucketStub.onCall(1).returns('122229');
        // Of the 3 experiments attached to the event, 2 are sent in conversion event (one without audiences and one with proper audience are in - one with experiment not running is left out)
        optlyInstance.track('testEventWithMultipleExperiments', 'testUser', {browser_type: 'firefox'});

        sinon.assert.calledTwice(bucketStub);
        sinon.assert.calledOnce(eventDispatcher.dispatchEvent);

        var eventDispatcherCall = eventDispatcher.dispatchEvent.args[0];
        assert.deepEqual(eventDispatcherCall[0], expectedObj);

        var logMessage0 = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage0, sprintf(LOG_MESSAGES.USER_HAS_NO_FORCED_VARIATION, 'PROJECT_CONFIG', 'testUser'));
        var logMessage1 = createdLogger.log.args[1][1];
        assert.strictEqual(logMessage1, sprintf(LOG_MESSAGES.USER_HAS_NO_FORCED_VARIATION, 'PROJECT_CONFIG', 'testUser'));
        var logMessage2 = createdLogger.log.args[2][1];
        assert.strictEqual(logMessage2, sprintf(LOG_MESSAGES.EXPERIMENT_NOT_RUNNING, 'DECISION_SERVICE', 'testExperimentNotRunning'));
        var logMessage3 = createdLogger.log.args[3][1];
        assert.strictEqual(logMessage3, sprintf(LOG_MESSAGES.NOT_TRACKING_USER_FOR_EXPERIMENT, 'OPTIMIZELY', 'testUser', 'testExperimentNotRunning'));
        var logMessage4 = createdLogger.log.args[4][1];
        assert.strictEqual(logMessage4, sprintf(LOG_MESSAGES.DISPATCH_CONVERSION_EVENT,
                                                'OPTIMIZELY',
                                                expectedObj.url,
                                                JSON.stringify(expectedObj.params)));
      });

      it('should throw an error for invalid user ID', function() {
        optlyInstance.track('testEvent', null);

        sinon.assert.notCalled(eventDispatcher.dispatchEvent);

        sinon.assert.calledOnce(errorHandler.handleError);
        var errorMessage = errorHandler.handleError.lastCall.args[0].message;
        assert.strictEqual(errorMessage, sprintf(ERROR_MESSAGES.INVALID_INPUT_FORMAT, 'OPTIMIZELY', 'user_id'));

        sinon.assert.calledOnce(createdLogger.log);
        var logMessage = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage, sprintf(ERROR_MESSAGES.INVALID_INPUT_FORMAT, 'OPTIMIZELY', 'user_id'));
      });

      it('should throw an error for invalid event key', function() {
        optlyInstance.track('invalidEventKey', 'testUser');

        sinon.assert.notCalled(eventDispatcher.dispatchEvent);

        sinon.assert.calledOnce(errorHandler.handleError);
        var errorMessage = errorHandler.handleError.lastCall.args[0].message;
        assert.strictEqual(errorMessage, sprintf(ERROR_MESSAGES.INVALID_EVENT_KEY, 'PROJECT_CONFIG', 'invalidEventKey'));

        sinon.assert.calledTwice(createdLogger.log);
        var logMessage1 = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage1, sprintf(ERROR_MESSAGES.INVALID_EVENT_KEY, 'PROJECT_CONFIG', 'invalidEventKey'));

        var logMessage2 = createdLogger.log.args[1][1];
        assert.strictEqual(logMessage2, sprintf(LOG_MESSAGES.NOT_TRACKING_USER, 'OPTIMIZELY', 'testUser'));
      });

      it('should throw an error for invalid attributes', function() {
        optlyInstance.track('testEvent', 'testUser', []);

        sinon.assert.notCalled(eventDispatcher.dispatchEvent);

        sinon.assert.calledOnce(errorHandler.handleError);
        var errorMessage = errorHandler.handleError.lastCall.args[0].message;
        assert.strictEqual(errorMessage, sprintf(ERROR_MESSAGES.INVALID_ATTRIBUTES, 'ATTRIBUTES_VALIDATOR'));

        sinon.assert.calledOnce(createdLogger.log);
        var logMessage = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage, sprintf(ERROR_MESSAGES.INVALID_ATTRIBUTES, 'ATTRIBUTES_VALIDATOR'));
      });

      it('should not throw an error for an event key without associated experiment IDs', function() {
        optlyInstance.track('testEventWithoutExperiments', 'testUser');
        sinon.assert.notCalled(eventDispatcher.dispatchEvent);
        sinon.assert.notCalled(errorHandler.handleError);

        sinon.assert.calledOnce(createdLogger.log);
        var logMessage = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage, sprintf(LOG_MESSAGES.EVENT_NOT_ASSOCIATED_WITH_EXPERIMENTS, 'OPTIMIZELY', 'testEventWithoutExperiments'));
      });

      it('should track when logger is in DEBUG mode', function() {
        bucketStub.returns('111129');
        var instance = new Optimizely({
          datafile: testData.getTestProjectConfig(),
          errorHandler: errorHandler,
          eventDispatcher: eventDispatcher,
          jsonSchemaValidator: jsonSchemaValidator,
          logger: logger.createLogger({logLevel: 1}),
          isValidInstance: true,
        });

        instance.track('testEvent', 'testUser');
        sinon.assert.calledOnce(eventDispatcher.dispatchEvent);
      });

      describe('whitelisting', function() {
        beforeEach(function() {
          sinon.spy(Optimizely.prototype, '__validateInputs');
        });

        afterEach(function() {
          Optimizely.prototype.__validateInputs.restore();
        });

        it('should return forced variation after experiment status check and before audience check when looping through valid experiments', function() {
          optlyInstance.track('testEvent', 'user1');

          sinon.assert.calledTwice(Optimizely.prototype.__validateInputs);

          sinon.assert.calledThrice(createdLogger.log);

          var logMessage0 = createdLogger.log.args[0][1];
          assert.strictEqual(logMessage0, sprintf(LOG_MESSAGES.USER_HAS_NO_FORCED_VARIATION, 'PROJECT_CONFIG', 'user1'));
          var logMessage1 = createdLogger.log.args[1][1];
          assert.strictEqual(logMessage1, sprintf(LOG_MESSAGES.USER_FORCED_IN_VARIATION, 'DECISION_SERVICE', 'user1', 'control'));

          var expectedObj = {
            url: 'https://logx.optimizely.com/v1/events',
            httpVerb: 'POST',
            params: {
              'account_id': '12001',
              'project_id': '111001',
              'visitors': [{
                'snapshots': [{
                  'decisions': [{
                    'campaign_id': '4',
                    'experiment_id': '111127',
                    'variation_id': '111128'
                  }],
                  'events': [{
                    'entity_id': '111095',
                    'timestamp': Math.round(new Date().getTime()),
                    'uuid': 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                    'key': 'testEvent',
                  }]
                }],
                'visitor_id': 'user1',
                'attributes': [],
              }],
              'revision': '42',
              'client_name': 'node-sdk',
              'client_version': enums.NODE_CLIENT_VERSION,
              'anonymize_ip': false,
            }
          };
          var logMessage2 = createdLogger.log.args[2][1];
          assert.strictEqual(logMessage2, sprintf(LOG_MESSAGES.DISPATCH_CONVERSION_EVENT,
                                                  'OPTIMIZELY',
                                                  expectedObj.url,
                                                  JSON.stringify(expectedObj.params)));
        });
      });

      it('does not dispatch the event if user is in experiment and experiment is set to Launched', function() {
        bucketStub.returns('144448');

        optlyInstance.track('testEventLaunched', 'testUser');

        sinon.assert.notCalled(eventDispatcher.dispatchEvent);
      });

      it('should not track when optimizely object is not a valid instance', function() {
        var instance = new Optimizely({
          datafile: {},
          errorHandler: errorHandler,
          eventDispatcher: eventDispatcher,
          logger: createdLogger,
        });

        createdLogger.log.reset();

        instance.track('testExperiment', 'testUser');

        sinon.assert.calledOnce(createdLogger.log);
        var logMessage = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage, sprintf(LOG_MESSAGES.INVALID_OBJECT, 'OPTIMIZELY', 'track'));

        sinon.assert.notCalled(eventDispatcher.dispatchEvent);
      });
    });

    describe('#getVariation', function() {
      it('should call bucketer and return variation key', function() {
        bucketStub.returns('111129');
        var getVariation = optlyInstance.getVariation('testExperiment', 'testUser');

        assert.strictEqual(getVariation, 'variation');

        sinon.assert.calledOnce(bucketer.bucket);
        sinon.assert.calledOnce(createdLogger.log);
      });

      it('should call bucketer and return variation key with attributes', function() {
        bucketStub.returns('122229');
        var getVariation = optlyInstance.getVariation('testExperimentWithAudiences',
                                                         'testUser',
                                                         {browser_type: 'firefox'});

        assert.strictEqual(getVariation, 'variationWithAudience');

        sinon.assert.calledOnce(bucketer.bucket);
        sinon.assert.calledOnce(createdLogger.log);
      });

      it('should return null if user is not in audience or experiment is not running', function() {
        var getVariationReturnsNull1 = optlyInstance.getVariation('testExperimentWithAudiences', 'testUser', {});
        var getVariationReturnsNull2 = optlyInstance.getVariation('testExperimentNotRunning', 'testUser');

        assert.isNull(getVariationReturnsNull1);
        assert.isNull(getVariationReturnsNull2);

        sinon.assert.notCalled(bucketer.bucket);
        sinon.assert.calledThrice(createdLogger.log);

        var logMessage0 = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage0, sprintf(LOG_MESSAGES.USER_HAS_NO_FORCED_VARIATION, 'PROJECT_CONFIG', 'testUser'));
        var logMessage1 = createdLogger.log.args[1][1];
        assert.strictEqual(logMessage1, sprintf(LOG_MESSAGES.USER_NOT_IN_EXPERIMENT, 'DECISION_SERVICE', 'testUser', 'testExperimentWithAudiences'));
        var logMessage2 = createdLogger.log.args[2][1];
        assert.strictEqual(logMessage2, sprintf(LOG_MESSAGES.EXPERIMENT_NOT_RUNNING, 'DECISION_SERVICE', 'testExperimentNotRunning'));
      });

      it('should throw an error for invalid user ID', function() {
        var getVariationWithError = optlyInstance.getVariation('testExperiment', null);

        assert.isNull(getVariationWithError);

        sinon.assert.calledOnce(errorHandler.handleError);
        var errorMessage = errorHandler.handleError.lastCall.args[0].message;
        assert.strictEqual(errorMessage, sprintf(ERROR_MESSAGES.INVALID_INPUT_FORMAT, 'OPTIMIZELY', 'user_id'));

        sinon.assert.calledOnce(createdLogger.log);
        var logMessage = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage, sprintf(ERROR_MESSAGES.INVALID_INPUT_FORMAT, 'OPTIMIZELY', 'user_id'));
      });

      it('should throw an error for invalid experiment key', function() {
        var getVariationWithError = optlyInstance.getVariation('invalidExperimentKey', 'testUser');

        assert.isNull(getVariationWithError);

        sinon.assert.calledOnce(errorHandler.handleError);
        var errorMessage = errorHandler.handleError.lastCall.args[0].message;
        assert.strictEqual(errorMessage, sprintf(ERROR_MESSAGES.INVALID_EXPERIMENT_KEY, 'OPTIMIZELY', 'invalidExperimentKey'));

        sinon.assert.calledOnce(createdLogger.log);
        var logMessage = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage, sprintf(ERROR_MESSAGES.INVALID_EXPERIMENT_KEY, 'OPTIMIZELY', 'invalidExperimentKey'));
      });

      it('should throw an error for invalid attributes', function() {
        var getVariationWithError = optlyInstance.getVariation('testExperimentWithAudiences', 'testUser', []);

        assert.isNull(getVariationWithError);

        sinon.assert.calledOnce(errorHandler.handleError);
        var errorMessage = errorHandler.handleError.lastCall.args[0].message;
        assert.strictEqual(errorMessage, sprintf(ERROR_MESSAGES.INVALID_ATTRIBUTES, 'ATTRIBUTES_VALIDATOR'));

        sinon.assert.calledOnce(createdLogger.log);
        var logMessage = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage, sprintf(ERROR_MESSAGES.INVALID_ATTRIBUTES, 'ATTRIBUTES_VALIDATOR'));
      });

      describe('whitelisting', function() {
        beforeEach(function() {
          sinon.spy(Optimizely.prototype, '__validateInputs');
        });

        afterEach(function() {
          Optimizely.prototype.__validateInputs.restore();
        });

        it('should return forced variation after experiment status check and before audience check', function() {
          var getVariation = optlyInstance.getVariation('testExperiment', 'user1');
          assert.strictEqual(getVariation, 'control');

          sinon.assert.calledOnce(Optimizely.prototype.__validateInputs);

          sinon.assert.calledTwice(createdLogger.log);

          var logMessage0 = createdLogger.log.args[0][1];
          assert.strictEqual(logMessage0, sprintf(LOG_MESSAGES.USER_HAS_NO_FORCED_VARIATION, 'PROJECT_CONFIG', 'user1'));
          var logMessage = createdLogger.log.args[1][1];
          assert.strictEqual(logMessage, sprintf(LOG_MESSAGES.USER_FORCED_IN_VARIATION, 'DECISION_SERVICE', 'user1', 'control'));
        });
      });

      it('should not return variation when optimizely object is not a valid instance', function() {
        var instance = new Optimizely({
          datafile: {},
          errorHandler: errorHandler,
          eventDispatcher: eventDispatcher,
          logger: createdLogger,
        });

        createdLogger.log.reset();

        instance.getVariation('testExperiment', 'testUser');

        sinon.assert.calledOnce(createdLogger.log);
        var logMessage = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage, sprintf(LOG_MESSAGES.INVALID_OBJECT, 'OPTIMIZELY', 'getVariation'));

        sinon.assert.notCalled(eventDispatcher.dispatchEvent);
      });

      describe('order of bucketing operations', function() {
        it('should properly follow the order of bucketing operations', function() {
          // Order of operations is preconditions > experiment is running > whitelisting > audience eval > variation bucketing
          bucketStub.returns('122228'); // returns the control variation

          // invalid user, running experiment
          assert.isNull(optlyInstance.activate('testExperiment', 123));

          // valid user, experiment not running, whitelisted
          assert.isNull(optlyInstance.activate('testExperimentNotRunning', 'user1'));

          // valid user, experiment running, not whitelisted, does not meet audience conditions
          assert.isNull(optlyInstance.activate('testExperimentWithAudiences', 'user3'));

          // valid user, experiment running, not whitelisted, meets audience conditions
          assert.strictEqual(optlyInstance.activate('testExperimentWithAudiences', 'user3', { browser_type: 'firefox' }), 'controlWithAudience');

          // valid user, running experiment, whitelisted, does not meet audience conditions
          // expect user to be forced into `variationWithAudience` through whitelisting
          assert.strictEqual(optlyInstance.activate('testExperimentWithAudiences', 'user2', { browser_type: 'chrome' }), 'variationWithAudience');

          // valid user, running experiment, whitelisted, meets audience conditions
          // expect user to be forced into `variationWithAudience (122229)` through whitelisting
          assert.strictEqual(optlyInstance.activate('testExperimentWithAudiences', 'user2', { browser_type: 'firefox' }), 'variationWithAudience');
        });
      });
    });

    describe('#getForcedVariation', function() {
      it('should return null when set has not been called', function() {
        var forcedVariation = optlyInstance.getForcedVariation('testExperiment', 'user1');
        assert.strictEqual(forcedVariation, null);

        var logMessage = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage, sprintf(LOG_MESSAGES.USER_HAS_NO_FORCED_VARIATION, 'PROJECT_CONFIG', 'user1'));
      });

      it('should return null with a null experimentKey', function() {
        var forcedVariation = optlyInstance.getForcedVariation(null, 'user1');
        assert.strictEqual(forcedVariation, null);

        var logMessage = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage, sprintf(LOG_MESSAGES.USER_HAS_NO_FORCED_VARIATION, 'PROJECT_CONFIG', 'user1'));
      });

      it('should return null with an undefined experimentKey', function() {
        var forcedVariation = optlyInstance.getForcedVariation(undefined, 'user1');
        assert.strictEqual(forcedVariation, null);

        var logMessage = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage, sprintf(LOG_MESSAGES.USER_HAS_NO_FORCED_VARIATION, 'PROJECT_CONFIG', 'user1'));
      });

      it('should return null with a null userId', function() {
        var forcedVariation = optlyInstance.getForcedVariation('testExperiment', null);
        assert.strictEqual(forcedVariation, null);

        var logMessage = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage, sprintf(LOG_MESSAGES.USER_HAS_NO_FORCED_VARIATION, 'PROJECT_CONFIG', null));
      });

      it('should return null with an undefined userId', function() {
        var forcedVariation = optlyInstance.getForcedVariation('testExperiment', undefined);
        assert.strictEqual(forcedVariation, null);

        var logMessage = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage, sprintf(LOG_MESSAGES.USER_HAS_NO_FORCED_VARIATION, 'PROJECT_CONFIG', undefined));
      });
    });

    describe('#setForcedVariation', function() {
      it('should be able to set a forced variation', function() {
        var didSetVariation = optlyInstance.setForcedVariation('testExperiment', 'user1', 'control');
        assert.strictEqual(didSetVariation, true);

        var logMessage = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage, sprintf(LOG_MESSAGES.USER_MAPPED_TO_FORCED_VARIATION, 'PROJECT_CONFIG', 111128, 111127, 'user1'));
      });

      it('should override bucketing in optlyInstance.getVariation', function() {
        var didSetVariation = optlyInstance.setForcedVariation('testExperiment', 'user1', 'control');
        assert.strictEqual(didSetVariation, true);

        var variation = optlyInstance.getVariation('testExperiment', 'user1', {});
        assert.strictEqual(variation, 'control');
      });

      it('should be able to set and get forced variation', function() {
        var didSetVariation = optlyInstance.setForcedVariation('testExperiment', 'user1', 'control');
        assert.strictEqual(didSetVariation, true);

        var forcedVariation = optlyInstance.getForcedVariation('testExperiment', 'user1');
        assert.strictEqual(forcedVariation, 'control');
      });

      it('should be able to set, unset, and get forced variation', function() {
        var didSetVariation = optlyInstance.setForcedVariation('testExperiment', 'user1', 'control');
        assert.strictEqual(didSetVariation, true);

        var forcedVariation = optlyInstance.getForcedVariation('testExperiment', 'user1');
        assert.strictEqual(forcedVariation, 'control');

        var didSetVariation2 = optlyInstance.setForcedVariation('testExperiment', 'user1', null);
        assert.strictEqual(didSetVariation2, true);

        var forcedVariation2 = optlyInstance.getForcedVariation('testExperiment', 'user1');
        assert.strictEqual(forcedVariation2, null);

        var setVariationLogMessage = createdLogger.log.args[0][1];
        var variationIsMappedLogMessage = createdLogger.log.args[1][1];
        var variationMappingRemovedLogMessage = createdLogger.log.args[2][1];

        assert.strictEqual(setVariationLogMessage, sprintf(LOG_MESSAGES.USER_MAPPED_TO_FORCED_VARIATION, 'PROJECT_CONFIG', 111128, 111127, 'user1'));

        assert.strictEqual(variationIsMappedLogMessage, sprintf(LOG_MESSAGES.USER_HAS_FORCED_VARIATION, 'PROJECT_CONFIG', 'control', 'testExperiment', 'user1'));

        assert.strictEqual(variationMappingRemovedLogMessage, sprintf(LOG_MESSAGES.VARIATION_REMOVED_FOR_USER, 'PROJECT_CONFIG', 'testExperiment', 'user1'));
      });

      it('should be able to set multiple experiments for one user', function() {
        var didSetVariation = optlyInstance.setForcedVariation('testExperiment', 'user1', 'control');
        assert.strictEqual(didSetVariation, true);

        var didSetVariation2 = optlyInstance.setForcedVariation('testExperimentLaunched', 'user1', 'variationLaunched');
        assert.strictEqual(didSetVariation2, true);

        var forcedVariation = optlyInstance.getForcedVariation('testExperiment', 'user1');
        assert.strictEqual(forcedVariation, 'control');

        var forcedVariation2 = optlyInstance.getForcedVariation('testExperimentLaunched', 'user1');
        assert.strictEqual(forcedVariation2, 'variationLaunched');
      });

      it('should not set an invalid variation', function() {
        var didSetVariation = optlyInstance.setForcedVariation('testExperiment', 'user1', 'definitely_not_valid_variation_key');
        assert.strictEqual(didSetVariation, false);

        var logMessage = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage, sprintf(ERROR_MESSAGES.NO_VARIATION_FOR_EXPERIMENT_KEY, 'PROJECT_CONFIG', 'definitely_not_valid_variation_key', 'testExperiment'));
      });

      it('should not set an invalid experiment', function() {
        var didSetVariation = optlyInstance.setForcedVariation('definitely_not_valid_exp_key', 'user1', 'control');
        assert.strictEqual(didSetVariation, false);

        var logMessage = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage, sprintf(ERROR_MESSAGES.EXPERIMENT_KEY_NOT_IN_DATAFILE, 'PROJECT_CONFIG', 'definitely_not_valid_exp_key'));
      });

      it('should return null for user has no forced variation for experiment', function() {
        var didSetVariation = optlyInstance.setForcedVariation('testExperiment', 'user1', 'control');
        assert.strictEqual(didSetVariation, true);

        var forcedVariation = optlyInstance.getForcedVariation('testExperimentLaunched', 'user1');
        assert.strictEqual(forcedVariation, null);

        var setVariationLogMessage = createdLogger.log.args[0][1];
        assert.strictEqual(setVariationLogMessage, sprintf(LOG_MESSAGES.USER_MAPPED_TO_FORCED_VARIATION, 'PROJECT_CONFIG', 111128, 111127, 'user1'));

        var noVariationToGetLogMessage = createdLogger.log.args[1][1];
        assert.strictEqual(noVariationToGetLogMessage, sprintf(LOG_MESSAGES.USER_HAS_NO_FORCED_VARIATION_FOR_EXPERIMENT, 'PROJECT_CONFIG', 'testExperimentLaunched', 'user1'));
      });

      it('should return false for a null experimentKey', function() {
        var didSetVariation = optlyInstance.setForcedVariation(null, 'user1', 'control');
        assert.strictEqual(didSetVariation, false);

        var setVariationLogMessage = createdLogger.log.args[0][1];
        assert.strictEqual(setVariationLogMessage, 'PROJECT_CONFIG: Experiment key null is not in datafile.');
      });

      it('should return false for an undefined experimentKey', function() {
        var didSetVariation = optlyInstance.setForcedVariation(undefined, 'user1', 'control');
        assert.strictEqual(didSetVariation, false);

        var setVariationLogMessage = createdLogger.log.args[0][1];
        assert.strictEqual(setVariationLogMessage, 'PROJECT_CONFIG: Experiment key undefined is not in datafile.');
      });

      it('should return false for a null userId', function() {
        var didSetVariation = optlyInstance.setForcedVariation('testExperiment', null, 'control');
        assert.strictEqual(didSetVariation, false);

        var setVariationLogMessage = createdLogger.log.args[0][1];
        assert.strictEqual(setVariationLogMessage, 'PROJECT_CONFIG: Provided user ID is in an invalid format.');
      });

      it('should return false for an undefined userId', function() {
        var didSetVariation = optlyInstance.setForcedVariation('testExperiment', undefined, 'control');
        assert.strictEqual(didSetVariation, false);

        var setVariationLogMessage = createdLogger.log.args[0][1];
        assert.strictEqual(setVariationLogMessage, 'PROJECT_CONFIG: Provided user ID is in an invalid format.');
      });

      it('should return false for a null variationKey', function() {
        var didSetVariation = optlyInstance.setForcedVariation('testExperiment', 'user1', null);
        assert.strictEqual(didSetVariation, false);

        var setVariationLogMessage = createdLogger.log.args[0][1];
        assert.strictEqual(setVariationLogMessage, sprintf(ERROR_MESSAGES.USER_NOT_IN_FORCED_VARIATION, 'PROJECT_CONFIG', 'user1'));
      });

      it('should return false for an undefined variationKey', function() {
        var didSetVariation = optlyInstance.setForcedVariation('testExperiment', 'user1', undefined);
        assert.strictEqual(didSetVariation, false);

        var setVariationLogMessage = createdLogger.log.args[0][1];
        assert.strictEqual(setVariationLogMessage, sprintf(ERROR_MESSAGES.USER_NOT_IN_FORCED_VARIATION, 'PROJECT_CONFIG', 'user1'));
      });

      it('should not override check for not running experiments in getVariation', function() {
        var didSetVariation = optlyInstance.setForcedVariation('testExperimentNotRunning', 'user1', 'controlNotRunning');
        assert.strictEqual(didSetVariation, true);

        var variation = optlyInstance.getVariation('testExperimentNotRunning', 'user1', {});
        assert.strictEqual(variation, null);

        var logMessage0 = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage0, sprintf(LOG_MESSAGES.USER_MAPPED_TO_FORCED_VARIATION, 'PROJECT_CONFIG', 133338, 133337, 'user1'));

        var logMessage1 = createdLogger.log.args[1][1];
        assert.strictEqual(logMessage1, sprintf(LOG_MESSAGES.EXPERIMENT_NOT_RUNNING, 'DECISION_SERVICE', 'testExperimentNotRunning'));
      });
    });

    describe('__validateInputs', function() {
      it('should return true if user ID and attributes are valid', function() {
        assert.isTrue(optlyInstance.__validateInputs({user_id: 'testUser'}));
        assert.isTrue(optlyInstance.__validateInputs({user_id: 'testUser'}, {browser_type: 'firefox'}));
        sinon.assert.notCalled(createdLogger.log);
      });

      it('should return false and throw an error if user ID is invalid', function() {
        var falseUserIdInput = optlyInstance.__validateInputs({user_id: []});
        assert.isFalse(falseUserIdInput);

        sinon.assert.calledOnce(errorHandler.handleError);
        var errorMessage = errorHandler.handleError.lastCall.args[0].message;
        assert.strictEqual(errorMessage, sprintf(ERROR_MESSAGES.INVALID_INPUT_FORMAT, 'OPTIMIZELY', 'user_id'));

        sinon.assert.calledOnce(createdLogger.log);
        var logMessage = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage, sprintf(ERROR_MESSAGES.INVALID_INPUT_FORMAT, 'OPTIMIZELY', 'user_id'));
      });

      it('should return false and throw an error if attributes are invalid', function() {
        var falseUserIdInput = optlyInstance.__validateInputs({user_id: 'testUser'}, []);
        assert.isFalse(falseUserIdInput);

        sinon.assert.calledOnce(errorHandler.handleError);
        var errorMessage = errorHandler.handleError.lastCall.args[0].message;
        assert.strictEqual(errorMessage, sprintf(ERROR_MESSAGES.INVALID_ATTRIBUTES, 'ATTRIBUTES_VALIDATOR'));

        sinon.assert.calledOnce(createdLogger.log);
        var logMessage = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage, sprintf(ERROR_MESSAGES.INVALID_ATTRIBUTES, 'ATTRIBUTES_VALIDATOR'));
      });
    });

    describe('should filter out null values', function() {
      it('should filter out a null value', function() {
        var dict = {'test': null};
        var filteredValue = optlyInstance.__filterEmptyValues(dict);
        assert.deepEqual(filteredValue, {});
      });

      it('should filter out a undefined value', function() {
        var dict = {'test': undefined};
        var filteredValue = optlyInstance.__filterEmptyValues(dict);
        assert.deepEqual(filteredValue, {});
      });

      it('should filter out a null value, leave a non null one', function() {
        var dict = {'test': null, 'test2': 'not_null'};
        var filteredValue = optlyInstance.__filterEmptyValues(dict);
        assert.deepEqual(filteredValue, {'test2': 'not_null'});
      });

      it('should not filter out a non empty value', function() {
        var dict = {'test': 'hello'};
        var filteredValue = optlyInstance.__filterEmptyValues(dict);
        assert.deepEqual(filteredValue, {'test': 'hello'});
      });
    });

    describe('notification listeners', function() {
      var decisionListener;
      var trackListener;
      var decisionListener2;
      var trackListener2;

      beforeEach(function() {
        decisionListener = sinon.spy();
        trackListener = sinon.spy();
        decisionListener2 = sinon.spy();
        trackListener2 = sinon.spy();
        bucketStub.returns('111129');
        sinon.stub(fns, 'currentTimestamp').returns(1509489766569);
      });

      afterEach(function() {
        fns.currentTimestamp.restore();
      });

      it('should call a listener added for activate when activate is called', function() {
        optlyInstance.notificationCenter.addNotificationListener(
          enums.NOTIFICATION_TYPES.ACTIVATE,
          decisionListener
        );
        var variationKey = optlyInstance.activate('testExperiment', 'testUser');
        assert.strictEqual(variationKey, 'variation');
        sinon.assert.calledOnce(decisionListener);
      });

      it('should call a listener added for track when track is called', function() {
        optlyInstance.notificationCenter.addNotificationListener(
          enums.NOTIFICATION_TYPES.TRACK,
          trackListener
        );
        optlyInstance.activate('testExperiment', 'testUser');
        optlyInstance.track('testEvent', 'testUser');
        sinon.assert.calledOnce(trackListener);
      });

      it('should not call a removed activate listener when activate is called', function() {
        var listenerId = optlyInstance.notificationCenter.addNotificationListener(
          enums.NOTIFICATION_TYPES.ACTIVATE,
          decisionListener
        );
        optlyInstance.notificationCenter.removeNotificationListener(listenerId);
        var variationKey = optlyInstance.activate('testExperiment', 'testUser');
        assert.strictEqual(variationKey, 'variation');
        sinon.assert.notCalled(decisionListener);
      });

      it('should not call a removed track listener when track is called', function() {
        var listenerId = optlyInstance.notificationCenter.addNotificationListener(
          enums.NOTIFICATION_TYPES.TRACK,
          trackListener
        );
        optlyInstance.notificationCenter.removeNotificationListener(listenerId);
        optlyInstance.activate('testExperiment', 'testUser');
        optlyInstance.track('testEvent', 'testUser');
        sinon.assert.notCalled(trackListener);
      });

      it('removeNotificationListener should only remove the listener with the argument ID', function() {
        optlyInstance.notificationCenter.addNotificationListener(
          enums.NOTIFICATION_TYPES.ACTIVATE,
          decisionListener
        );
        var trackListenerId = optlyInstance.notificationCenter.addNotificationListener(
          enums.NOTIFICATION_TYPES.TRACK,
          trackListener
        );
        optlyInstance.notificationCenter.removeNotificationListener(trackListenerId);
        optlyInstance.activate('testExperiment', 'testUser');
        optlyInstance.track('testEvent', 'testUser');
        sinon.assert.calledOnce(decisionListener);
      });

      it('should clear all notification listeners when clearAllNotificationListeners is called', function() {
        optlyInstance.notificationCenter.addNotificationListener(
          enums.NOTIFICATION_TYPES.ACTIVATE,
          decisionListener
        );
        optlyInstance.notificationCenter.addNotificationListener(
          enums.NOTIFICATION_TYPES.TRACK,
          trackListener
        );
        optlyInstance.notificationCenter.clearAllNotificationListeners();
        optlyInstance.activate('testExperiment', 'testUser');
        optlyInstance.track('testEvent', 'testUser');

        sinon.assert.notCalled(decisionListener);
        sinon.assert.notCalled(trackListener);
      });

      it('should clear listeners of certain notification type when clearNotificationListeners is called', function() {
        optlyInstance.notificationCenter.addNotificationListener(
          enums.NOTIFICATION_TYPES.ACTIVATE,
          decisionListener
        );
        optlyInstance.notificationCenter.addNotificationListener(
          enums.NOTIFICATION_TYPES.TRACK,
          trackListener
        );
        optlyInstance.notificationCenter.clearNotificationListeners(enums.NOTIFICATION_TYPES.ACTIVATE);
        optlyInstance.activate('testExperiment', 'testUser');
        optlyInstance.track('testEvent', 'testUser');

        sinon.assert.notCalled(decisionListener);
        sinon.assert.calledOnce(trackListener);
      });

      it('should only call the listener once after the same listener was added twice', function() {
        optlyInstance.notificationCenter.addNotificationListener(
          enums.NOTIFICATION_TYPES.ACTIVATE,
          decisionListener
        );
        optlyInstance.notificationCenter.addNotificationListener(
          enums.NOTIFICATION_TYPES.ACTIVATE,
          decisionListener
        );
        optlyInstance.activate('testExperiment', 'testUser');
        sinon.assert.calledOnce(decisionListener);
      });

      it('should not add a listener with an invalid type argument', function() {
        var listenerId = optlyInstance.notificationCenter.addNotificationListener(
          'not a notification type',
          decisionListener
        );
        assert.strictEqual(listenerId, -1);
        optlyInstance.activate('testExperiment', 'testUser');
        sinon.assert.notCalled(decisionListener);
        optlyInstance.track('testEvent', 'testUser');
        sinon.assert.notCalled(decisionListener);
      });

      it('should call multiple notification listeners for activate when activate is called', function() {
        optlyInstance.notificationCenter.addNotificationListener(
          enums.NOTIFICATION_TYPES.ACTIVATE,
          decisionListener
        );
        optlyInstance.notificationCenter.addNotificationListener(
          enums.NOTIFICATION_TYPES.ACTIVATE,
          decisionListener2
        );
        optlyInstance.activate('testExperiment', 'testUser');
        sinon.assert.calledOnce(decisionListener);
        sinon.assert.calledOnce(decisionListener2);
      });

      it('should call multiple notification listeners for track when track is called', function() {
        optlyInstance.notificationCenter.addNotificationListener(
          enums.NOTIFICATION_TYPES.TRACK,
          trackListener
        );
        optlyInstance.notificationCenter.addNotificationListener(
          enums.NOTIFICATION_TYPES.TRACK,
          trackListener2
        );
        optlyInstance.activate('testExperiment', 'testUser');
        optlyInstance.track('testEvent', 'testUser');
        sinon.assert.calledOnce(trackListener);
        sinon.assert.calledOnce(trackListener2);
      });

      it('should pass the correct arguments to an activate listener when activate is called', function() {
        optlyInstance.notificationCenter.addNotificationListener(
          enums.NOTIFICATION_TYPES.ACTIVATE,
          decisionListener
        );
        optlyInstance.activate('testExperiment', 'testUser');
        var expectedImpressionEvent = {
          httpVerb: 'POST',
          url: 'https://logx.optimizely.com/v1/events',
          params: {
            account_id: '12001',
            project_id: '111001',
            visitors: [
              {
                snapshots: [
                  {
                    decisions: [
                      {
                        campaign_id: '4',
                        experiment_id: '111127',
                        variation_id: '111129',
                      },
                    ],
                    events: [
                      {
                        entity_id: '4',
                        timestamp: 1509489766569,
                        key: 'campaign_activated',
                        uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                      },
                    ],
                  },
                ],
                visitor_id: 'testUser',
                attributes: [],
              },
            ],
            revision: '42',
            client_name: 'node-sdk',
            client_version: enums.NODE_CLIENT_VERSION,
            anonymize_ip: false,
          },
        };
        var instanceExperiments = optlyInstance.configObj.experiments;
        var expectedArgument = {
          experiment: instanceExperiments[0],
          userId: 'testUser',
          attributes: undefined,
          variation: instanceExperiments[0].variations[1],
          logEvent: expectedImpressionEvent,
        };
        sinon.assert.calledWith(decisionListener, expectedArgument);
      });

      it('should pass the correct arguments to an activate listener when activate is called with attributes', function() {
        var attributes = {
          browser_type: 'firefox',
        };
        optlyInstance.notificationCenter.addNotificationListener(
          enums.NOTIFICATION_TYPES.ACTIVATE,
          decisionListener
        );
        optlyInstance.activate('testExperiment', 'testUser', attributes);
        var expectedImpressionEvent = {
          httpVerb: 'POST',
          url: 'https://logx.optimizely.com/v1/events',
          params: {
            account_id: '12001',
            project_id: '111001',
            visitors: [
              {
                snapshots: [
                  {
                    decisions: [
                      {
                        campaign_id: '4',
                        experiment_id: '111127',
                        variation_id: '111129',
                      },
                    ],
                    events: [
                      {
                        entity_id: '4',
                        timestamp: 1509489766569,
                        key: 'campaign_activated',
                        uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                      },
                    ],
                  },
                ],
                visitor_id: 'testUser',
                attributes: [
                  {
                    entity_id: '111094',
                    key: 'browser_type',
                    type: 'custom',
                    value: 'firefox',
                  },
                ],
              },
            ],
            revision: '42',
            client_name: 'node-sdk',
            client_version: enums.NODE_CLIENT_VERSION,
            anonymize_ip: false,
          },
        };
        var instanceExperiments = optlyInstance.configObj.experiments;
        var expectedArgument = {
          experiment: instanceExperiments[0],
          userId: 'testUser',
          attributes: attributes,
          variation: instanceExperiments[0].variations[1],
          logEvent: expectedImpressionEvent,
        };
        sinon.assert.calledWith(decisionListener, expectedArgument);
      });

      it('should pass the correct arguments to a track listener when track is called', function() {
        optlyInstance.notificationCenter.addNotificationListener(
          enums.NOTIFICATION_TYPES.TRACK,
          trackListener
        );
        optlyInstance.activate('testExperiment', 'testUser');
        optlyInstance.track('testEvent', 'testUser');
        var expectedConversionEvent = {
          httpVerb: 'POST',
          url: 'https://logx.optimizely.com/v1/events',
          params: {
            account_id: '12001',
            project_id: '111001',
            visitors: [
              {
                snapshots: [
                  {
                    decisions: [
                      {
                        campaign_id: '4',
                        experiment_id: '111127',
                        variation_id: '111129',
                      },
                    ],
                    events: [
                      {
                        entity_id: '111095',
                        timestamp: 1509489766569,
                        uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                        key: 'testEvent',
                      },
                    ],
                  },
                ],
                visitor_id: 'testUser',
                attributes: [],
              },
            ],
            revision: '42',
            client_name: 'node-sdk',
            client_version: enums.NODE_CLIENT_VERSION,
            anonymize_ip: false,
          },
        };
        var expectedArgument = {
          eventKey: 'testEvent',
          userId: 'testUser',
          attributes: undefined,
          eventTags: undefined,
          logEvent: expectedConversionEvent,
        };
        sinon.assert.calledWith(trackListener, expectedArgument);
      });

      it('should pass the correct arguments to a track listener when track is called with attributes', function() {
        var attributes = {
          browser_type: 'firefox',
        };
        optlyInstance.notificationCenter.addNotificationListener(
          enums.NOTIFICATION_TYPES.TRACK,
          trackListener
        );
        optlyInstance.activate('testExperiment', 'testUser', attributes);
        optlyInstance.track('testEvent', 'testUser', attributes);
        var expectedConversionEvent = {
          httpVerb: 'POST',
          url: 'https://logx.optimizely.com/v1/events',
          params: {
            account_id: '12001',
            project_id: '111001',
            visitors: [
              {
                snapshots: [
                  {
                    decisions: [
                      {
                        campaign_id: '4',
                        experiment_id: '111127',
                        variation_id: '111129',
                      },
                    ],
                    events: [
                      {
                        entity_id: '111095',
                        timestamp: 1509489766569,
                        uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                        key: 'testEvent',
                      },
                    ],
                  },
                ],
                visitor_id: 'testUser',
                attributes: [
                  {
                    entity_id: '111094',
                    key: 'browser_type',
                    type: 'custom',
                    value: 'firefox',
                  },
                ],
              },
            ],
            revision: '42',
            client_name: 'node-sdk',
            client_version: enums.NODE_CLIENT_VERSION,
            anonymize_ip: false,
          },
        };
        var expectedArgument = {
          eventKey: 'testEvent',
          userId: 'testUser',
          attributes: attributes,
          eventTags: undefined,
          logEvent: expectedConversionEvent,
        };
        sinon.assert.calledWith(trackListener, expectedArgument);
      });

      it('should pass the correct arguments to a track listener when track is called with attributes and event tags', function() {
        var attributes = {
          browser_type: 'firefox',
        };
        var eventTags = {
          value: 1.234,
          non_revenue: 'abc',
        };
        optlyInstance.notificationCenter.addNotificationListener(
          enums.NOTIFICATION_TYPES.TRACK,
          trackListener
        );
        optlyInstance.activate('testExperiment', 'testUser', attributes);
        optlyInstance.track('testEvent', 'testUser', attributes, eventTags);
        var expectedConversionEvent = {
          httpVerb: 'POST',
          url: 'https://logx.optimizely.com/v1/events',
          params: {
            account_id: '12001',
            project_id: '111001',
            visitors: [
              {
                snapshots: [
                  {
                    decisions: [
                      {
                        campaign_id: '4',
                        experiment_id: '111127',
                        variation_id: '111129',
                      },
                    ],
                    events: [
                      {
                        entity_id: '111095',
                        timestamp: 1509489766569,
                        uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                        key: 'testEvent',
                        tags: {
                          non_revenue: 'abc',
                          value: 1.234,
                        },
                        value: 1.234,
                      },
                    ],
                  },
                ],
                visitor_id: 'testUser',
                attributes: [
                  {
                    entity_id: '111094',
                    key: 'browser_type',
                    type: 'custom',
                    value: 'firefox',
                  },
                ],
              },
            ],
            revision: '42',
            client_name: 'node-sdk',
            client_version: enums.NODE_CLIENT_VERSION,
            anonymize_ip: false,
          },
        };
        var expectedArgument = {
          eventKey: 'testEvent',
          userId: 'testUser',
          attributes: attributes,
          eventTags: eventTags,
          logEvent: expectedConversionEvent,
        };
        sinon.assert.calledWith(trackListener, expectedArgument);
      });
    });
  });

  //tests separated out from APIs because of mock bucketing
  describe('getVariationBucketingIdAttribute', function() {
    var optlyInstance;
    var createdLogger = logger.createLogger({logLevel: LOG_LEVEL.INFO});
    beforeEach(function() {
      optlyInstance = new Optimizely({
        clientEngine: 'node-sdk',
        datafile: testData.getTestProjectConfig(),
        eventBuilder: eventBuilder,
        errorHandler: errorHandler,
        eventDispatcher: eventDispatcher,
        jsonSchemaValidator: jsonSchemaValidator,
        logger: createdLogger,
        isValidInstance: true,
      });
    });

    var userAttributes = {
      'browser_type': 'firefox',
    };
    var userAttributesWithBucketingId = {
      'browser_type': 'firefox',
      '$opt_bucketing_id': '123456789'
    };

    it('confirm that a valid variation is bucketed without the bucketing ID', function() {
      assert.strictEqual('controlWithAudience', optlyInstance.getVariation(
          'testExperimentWithAudiences',
          'testUser',
          userAttributes
      ));
    });

    it('confirm that an invalid audience returns null', function() {
      assert.strictEqual(null, optlyInstance.getVariation(
          'testExperimentWithAudiences',
          'testUser'
      ));
    });

    it('confirm that a valid variation is bucketed with the bucketing ID', function() {
      assert.strictEqual('variationWithAudience', optlyInstance.getVariation(
          'testExperimentWithAudiences',
          'testUser',
          userAttributesWithBucketingId
      ));
    });

    it('confirm that invalid experiment with the bucketing ID returns null', function() {
      assert.strictEqual(null, optlyInstance.getVariation(
          'invalidExperimentKey',
          'testUser',
          userAttributesWithBucketingId
      ));
    });
  });

  describe('feature management', function() {
    var sandbox = sinon.sandbox.create();
    var createdLogger = logger.createLogger({logLevel: LOG_LEVEL.INFO});
    var optlyInstance;
    var clock;
    beforeEach(function() {
      optlyInstance = new Optimizely({
        clientEngine: 'node-sdk',
        datafile: testData.getTestProjectConfigWithFeatures(),
        eventBuilder: eventBuilder,
        errorHandler: errorHandler,
        eventDispatcher: eventDispatcher,
        jsonSchemaValidator: jsonSchemaValidator,
        logger: createdLogger,
        isValidInstance: true,
      });

      sandbox.stub(eventDispatcher, 'dispatchEvent');
      sandbox.stub(errorHandler, 'handleError');
      sandbox.stub(createdLogger, 'log');
      sandbox.stub(uuid, 'v4').returns('a68cf1ad-0393-4e18-af87-efe8f01a7c9c');
      sandbox.stub(fns, 'currentTimestamp').returns(1509489766569);
      clock = sinon.useFakeTimers(new Date().getTime());
    });

    afterEach(function() {
      sandbox.restore();
      clock.restore();
    });

    describe('#isFeatureEnabled', function() {
      it('returns false, and does not dispatch an impression event, for an invalid feature key', function() {
        var result = optlyInstance.isFeatureEnabled('thisIsDefinitelyNotAFeatureKey', 'user1');
        assert.strictEqual(result, false);
        sinon.assert.notCalled(eventDispatcher.dispatchEvent);
      });

      it('returns false if the instance is invalid', function() {
        optlyInstance = new Optimizely({
          clientEngine: 'node-sdk',
          datafile: {
            lasers: 300,
            message: 'this is not a valid datafile'
          },
          eventBuilder: eventBuilder,
          errorHandler: errorHandler,
          eventDispatcher: eventDispatcher,
          jsonSchemaValidator: jsonSchemaValidator,
          logger: createdLogger,
        });
        var result = optlyInstance.isFeatureEnabled('test_feature_for_experiment', 'user1');
        assert.strictEqual(result, false);
        sinon.assert.calledWith(createdLogger.log, LOG_LEVEL.ERROR, 'OPTIMIZELY: Optimizely object is not valid. Failing isFeatureEnabled.');
      });

      describe('when the user bucketed into a variation of an experiment with the feature', function() {
        var attributes = { test_attribute: 'test_value' };

        describe('when the variation is toggled ON', function() {
          beforeEach(function() {
            var experiment = optlyInstance.configObj.experimentKeyMap.testing_my_feature;
            var variation = experiment.variations[0];
            sandbox.stub(optlyInstance.decisionService, 'getVariationForFeature').returns({
              experiment: experiment,
              variation: variation,
              decisionSource: DECISION_SOURCES.EXPERIMENT,
            });
          });

          it('returns true and dispatches an impression event', function() {
            var result = optlyInstance.isFeatureEnabled('test_feature_for_experiment', 'user1', attributes);
            assert.strictEqual(result, true);
            sinon.assert.calledOnce(optlyInstance.decisionService.getVariationForFeature);
            var feature = optlyInstance.configObj.featureKeyMap.test_feature_for_experiment;
            sinon.assert.calledWithExactly(
              optlyInstance.decisionService.getVariationForFeature,
              feature,
              'user1',
              attributes
            );
            sinon.assert.calledOnce(eventDispatcher.dispatchEvent);
            var expectedImpressionEvent = {
              'httpVerb': 'POST',
              'url': 'https://logx.optimizely.com/v1/events',
              'params': {
                'account_id': '572018',
                'project_id': '594001',
                'visitors': [
                  {
                    'snapshots': [
                      {
                        'decisions': [
                          {
                            'campaign_id': '594093',
                            'experiment_id': '594098',
                            'variation_id': '594096'
                          }
                        ],
                        'events': [
                          {
                            'entity_id': '594093',
                            'timestamp': 1509489766569,
                            'key': 'campaign_activated',
                            'uuid': 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c'
                          }
                        ]
                      }
                    ],
                    'visitor_id': 'user1',
                    'attributes': [
                      {
                        'entity_id': '594014',
                        'key': 'test_attribute',
                        'type': 'custom',
                        'value': 'test_value',
                      }, {
                        'entity_id': '$opt_bot_filtering',
                        'key': '$opt_bot_filtering',
                        'type': 'custom',
                        'value': true,
                      },
                    ],
                  }
                ],
                'revision': '35',
                'client_name': 'node-sdk',
                'client_version': enums.NODE_CLIENT_VERSION,
                'anonymize_ip': true
              }
            };
            var callArgs = eventDispatcher.dispatchEvent.getCalls()[0].args;
            assert.deepEqual(callArgs[0], expectedImpressionEvent);
            assert.isFunction(callArgs[1]);
            sinon.assert.calledWith(createdLogger.log, LOG_LEVEL.INFO, 'OPTIMIZELY: Feature test_feature_for_experiment is enabled for user user1.');
          });

          it('returns false and does not dispatch an impression event when feature key is null', function() {
            var result = optlyInstance.isFeatureEnabled(null, 'user1', attributes);
            assert.strictEqual(result, false);
            sinon.assert.notCalled(eventDispatcher.dispatchEvent);
            sinon.assert.calledWithExactly(createdLogger.log, LOG_LEVEL.ERROR, 'OPTIMIZELY: Provided feature_key is in an invalid format.');
          });

          it('returns false when user id is null', function() {
            var result = optlyInstance.isFeatureEnabled('test_feature_for_experiment', null, attributes);
            assert.strictEqual(result, false);
            sinon.assert.notCalled(eventDispatcher.dispatchEvent);
            sinon.assert.calledWithExactly(createdLogger.log, LOG_LEVEL.ERROR, 'OPTIMIZELY: Provided user_id is in an invalid format.');
          });

          it('returns false when feature key and user id are null', function() {
            var result = optlyInstance.isFeatureEnabled(null, null, attributes);
            assert.strictEqual(result, false);
            sinon.assert.notCalled(eventDispatcher.dispatchEvent);
            sinon.assert.calledWithExactly(createdLogger.log, LOG_LEVEL.ERROR, 'OPTIMIZELY: Provided feature_key is in an invalid format.');
          });

          it('returns false when feature key is undefined', function() {
            var result = optlyInstance.isFeatureEnabled(undefined, 'user1', attributes);
            assert.strictEqual(result, false);
            sinon.assert.notCalled(eventDispatcher.dispatchEvent);
            sinon.assert.calledWithExactly(createdLogger.log, LOG_LEVEL.ERROR, 'OPTIMIZELY: Provided feature_key is in an invalid format.');
          });

          it('returns false when user id is undefined', function() {
            var result = optlyInstance.isFeatureEnabled('test_feature_for_experiment', undefined, attributes);
            assert.strictEqual(result, false);
            sinon.assert.notCalled(eventDispatcher.dispatchEvent);
            sinon.assert.calledWithExactly(createdLogger.log, LOG_LEVEL.ERROR, 'OPTIMIZELY: Provided user_id is in an invalid format.');
          });

          it('returns false when feature key and user id are undefined', function() {
            var result = optlyInstance.isFeatureEnabled(undefined, undefined, attributes);
            assert.strictEqual(result, false);
            sinon.assert.notCalled(eventDispatcher.dispatchEvent);
          });

          it('returns false when no arguments are provided', function() {
            var result = optlyInstance.isFeatureEnabled();
            assert.strictEqual(result, false);
            sinon.assert.notCalled(eventDispatcher.dispatchEvent);
            sinon.assert.calledWithExactly(createdLogger.log, LOG_LEVEL.ERROR, 'OPTIMIZELY: Provided feature_key is in an invalid format.');
          });

          it('returns false when user id is an object', function() {
            var result = optlyInstance.isFeatureEnabled('test_feature_for_experiment', {}, attributes);
            assert.strictEqual(result, false);
            sinon.assert.notCalled(eventDispatcher.dispatchEvent);
            sinon.assert.calledWithExactly(createdLogger.log, LOG_LEVEL.ERROR, 'OPTIMIZELY: Provided user_id is in an invalid format.');
          });

          it('returns false when user id is a number', function() {
            var result = optlyInstance.isFeatureEnabled('test_feature_for_experiment', 72, attributes);
            assert.strictEqual(result, false);
            sinon.assert.notCalled(eventDispatcher.dispatchEvent);
            sinon.assert.calledWithExactly(createdLogger.log, LOG_LEVEL.ERROR, 'OPTIMIZELY: Provided user_id is in an invalid format.');
          });

          it('returns false when feature key is an array', function() {
            var result = optlyInstance.isFeatureEnabled(['a', 'feature'], 'user1', attributes);
            assert.strictEqual(result, false);
            sinon.assert.notCalled(eventDispatcher.dispatchEvent);
            sinon.assert.calledWithExactly(createdLogger.log, LOG_LEVEL.ERROR, 'OPTIMIZELY: Provided feature_key is in an invalid format.');
          });

          it('returns false when user id is an empty string', function() {
            var result = optlyInstance.isFeatureEnabled('test_feature_for_experiment', '', attributes);
            assert.strictEqual(result, false);
            sinon.assert.notCalled(eventDispatcher.dispatchEvent);
          });

          it('returns false when feature key is an empty string', function() {
            var result = optlyInstance.isFeatureEnabled('', 'user1', attributes);
            assert.strictEqual(result, false);
            sinon.assert.notCalled(eventDispatcher.dispatchEvent);
          });

          it('returns false when a feature key is provided, but a user id is not', function() {
            var result = optlyInstance.isFeatureEnabled('test_feature_for_experiment');
            assert.strictEqual(result, false);
            sinon.assert.notCalled(eventDispatcher.dispatchEvent);
          });
        });

        describe('when the variation is toggled OFF', function() {
          var result;
          beforeEach(function() {
            var experiment = optlyInstance.configObj.experimentKeyMap.test_shared_feature;
            var variation = experiment.variations[1];
            sandbox.stub(optlyInstance.decisionService, 'getVariationForFeature').returns({
              experiment: experiment,
              variation: variation,
              decisionSource: DECISION_SOURCES.EXPERIMENT,
            });
            result = optlyInstance.isFeatureEnabled('shared_feature', 'user1', attributes);
          });

          it('should return false', function() {
            assert.strictEqual(result, false);
            sinon.assert.calledOnce(optlyInstance.decisionService.getVariationForFeature);
            var feature = optlyInstance.configObj.featureKeyMap.shared_feature;
            sinon.assert.calledWithExactly(
              optlyInstance.decisionService.getVariationForFeature,
              feature,
              'user1',
              attributes
            );
          });

          it('should dispatch an impression event', function() {
            sinon.assert.calledOnce(eventDispatcher.dispatchEvent);
            var expectedImpressionEvent = {
              'httpVerb': 'POST',
              'url': 'https://logx.optimizely.com/v1/events',
              'params': {
                'account_id': '572018',
                'project_id': '594001',
                'visitors': [
                  {
                    'snapshots': [
                      {
                        'decisions': [
                          {
                            'campaign_id': '599023',
                            'experiment_id': '599028',
                            'variation_id': '599027'
                          }
                        ],
                        'events': [
                          {
                            'entity_id': '599023',
                            'timestamp': 1509489766569,
                            'key': 'campaign_activated',
                            'uuid': 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c'
                          }
                        ]
                      }
                    ],
                    'visitor_id': 'user1',
                    'attributes': [
                      {
                        'entity_id': '594014',
                        'key': 'test_attribute',
                        'type': 'custom',
                        'value': 'test_value',
                      }, {
                        'entity_id': '$opt_bot_filtering',
                        'key': '$opt_bot_filtering',
                        'type': 'custom',
                        'value': true,
                      },
                    ],
                  }
                ],
                'revision': '35',
                'client_name': 'node-sdk',
                'client_version': enums.NODE_CLIENT_VERSION,
                'anonymize_ip': true
              }
            };
            var callArgs = eventDispatcher.dispatchEvent.getCalls()[0].args;
            assert.deepEqual(callArgs[0], expectedImpressionEvent);
            assert.isFunction(callArgs[1]);
          });
        });

        describe('when the variation is missing the toggle', function() {
          beforeEach(function() {
            var experiment = optlyInstance.configObj.experimentKeyMap.test_shared_feature;
            var variation = fns.cloneDeep(experiment.variations[0]);
            delete variation['featureEnabled'];
            sandbox.stub(optlyInstance.decisionService, 'getVariationForFeature').returns({
              experiment: experiment,
              variation: variation,
              decisionSource: DECISION_SOURCES.EXPERIMENT,
            });
          });

          it('should return false', function() {
            var result = optlyInstance.isFeatureEnabled('shared_feature', 'user1', attributes);
            assert.strictEqual(result, false);
            sinon.assert.calledOnce(optlyInstance.decisionService.getVariationForFeature);
            var feature = optlyInstance.configObj.featureKeyMap.shared_feature;
            sinon.assert.calledWithExactly(
              optlyInstance.decisionService.getVariationForFeature,
              feature,
              'user1',
              attributes
            );
          });
        });
      });

      describe('user bucketed into a variation of a rollout of the feature', function() {
        describe('when the variation is toggled ON', function() {
          beforeEach(function() {
            // This experiment is the first audience targeting rule in the rollout of feature 'test_feature'
            var experiment = optlyInstance.configObj.experimentKeyMap['594031'];
            var variation = experiment.variations[0];
            sandbox.stub(optlyInstance.decisionService, 'getVariationForFeature').returns({
              experiment: experiment,
              variation: variation,
              decisionSource: DECISION_SOURCES.ROLLOUT,
            });
          });

          it('returns true and does not dispatch an event', function() {
            var result = optlyInstance.isFeatureEnabled('test_feature', 'user1', {
              test_attribute: 'test_value',
            });
            assert.strictEqual(result, true);
            sinon.assert.notCalled(eventDispatcher.dispatchEvent);
            sinon.assert.calledWith(createdLogger.log, LOG_LEVEL.INFO, 'OPTIMIZELY: Feature test_feature is enabled for user user1.');
          });
        });

        describe('when the variation is toggled OFF', function() {
          beforeEach(function() {
            // This experiment is the second audience targeting rule in the rollout of feature 'test_feature'
            var experiment = optlyInstance.configObj.experimentKeyMap['594037'];
            var variation = experiment.variations[0];
            sandbox.stub(optlyInstance.decisionService, 'getVariationForFeature').returns({
              experiment: experiment,
              variation: variation,
              decisionSource: DECISION_SOURCES.ROLLOUT,
            });
          });

          it('returns false ', function() {
            var result = optlyInstance.isFeatureEnabled('test_feature', 'user1', {
              test_attribute: 'test_value',
            });
            assert.strictEqual(result, false);
            sinon.assert.calledWith(createdLogger.log, LOG_LEVEL.INFO, 'OPTIMIZELY: Feature test_feature is not enabled for user user1.');
          });
        });
      });

      describe('user not bucketed into an experiment or a rollout', function() {
        beforeEach(function() {
          sandbox.stub(optlyInstance.decisionService, 'getVariationForFeature').returns({
            experiment: null,
            variation: null,
            decisionSource: null,
          });
        });

        it('returns false and does not dispatch an event', function() {
          var result = optlyInstance.isFeatureEnabled('test_feature', 'user1');
          assert.strictEqual(result, false);
          sinon.assert.notCalled(eventDispatcher.dispatchEvent);
          sinon.assert.calledWith(createdLogger.log, LOG_LEVEL.INFO, 'OPTIMIZELY: Feature test_feature is not enabled for user user1.');
        });
      });
    });

    describe('#getEnabledFeatures', function() {
      beforeEach(function() {
        sandbox.stub(optlyInstance, 'isFeatureEnabled', function(featureKey) {
          return featureKey === 'test_feature' || featureKey === 'test_feature_for_experiment';
        });
      });

      it('returns an empty array if the instance is invalid', function() {
        optlyInstance = new Optimizely({
          clientEngine: 'node-sdk',
          datafile: {
            lasers: 300,
            message: 'this is not a valid datafile'
          },
          eventBuilder: eventBuilder,
          errorHandler: errorHandler,
          eventDispatcher: eventDispatcher,
          jsonSchemaValidator: jsonSchemaValidator,
          logger: createdLogger,
        });
        var result = optlyInstance.getEnabledFeatures('user1', { test_attribute: 'test_value' });
        assert.deepEqual(result, []);
        sinon.assert.calledWith(createdLogger.log, LOG_LEVEL.ERROR, 'OPTIMIZELY: Optimizely object is not valid. Failing getEnabledFeatures.');
      });

      it('returns only enabled features for the specified user and attributes', function() {
        var attributes = { test_attribute: 'test_value', };
        var result = optlyInstance.getEnabledFeatures('user1', attributes);
        assert.strictEqual(result.length, 2);
        assert.isAbove(result.indexOf('test_feature'), -1);
        assert.isAbove(result.indexOf('test_feature_for_experiment'), -1);
        sinon.assert.callCount(optlyInstance.isFeatureEnabled, 6);
        sinon.assert.calledWithExactly(
          optlyInstance.isFeatureEnabled,
          'test_feature',
          'user1',
          attributes
        );
        sinon.assert.calledWithExactly(
          optlyInstance.isFeatureEnabled,
          'test_feature_2',
          'user1',
          attributes
        );
        sinon.assert.calledWithExactly(
          optlyInstance.isFeatureEnabled,
          'test_feature_for_experiment',
          'user1',
          attributes
        );
        sinon.assert.calledWithExactly(
          optlyInstance.isFeatureEnabled,
          'feature_with_group',
          'user1',
          attributes
        );
        sinon.assert.calledWithExactly(
          optlyInstance.isFeatureEnabled,
          'shared_feature',
          'user1',
          attributes
        );
        sinon.assert.calledWithExactly(
          optlyInstance.isFeatureEnabled,
          'unused_flag',
          'user1',
          attributes
        );
      });
    });

    describe('feature variable APIs', function() {
      describe('bucketed into variation in an experiment with variable values', function() {
        beforeEach(function() {
          var experiment = optlyInstance.configObj.experimentKeyMap.testing_my_feature;
          var variation = experiment.variations[0];
          sandbox.stub(optlyInstance.decisionService, 'getVariationForFeature').returns({
            experiment: experiment,
            variation: variation,
            decisionSource: DECISION_SOURCES.EXPERIMENT,
          });
        });

        it('returns the right value from getFeatureVariableBoolean', function() {
          var result = optlyInstance.getFeatureVariableBoolean('test_feature_for_experiment', 'is_button_animated', 'user1', { test_attribute: 'test_value' });
          assert.strictEqual(result, true);
          sinon.assert.calledWith(createdLogger.log, LOG_LEVEL.INFO, 'OPTIMIZELY: Value for variable "is_button_animated" of feature flag "test_feature_for_experiment" is true for user "user1"');
        });

        it('returns the right value from getFeatureVariableDouble', function() {
          var result = optlyInstance.getFeatureVariableDouble('test_feature_for_experiment', 'button_width', 'user1', { test_attribute: 'test_value' });
          assert.strictEqual(result, 20.25);
          sinon.assert.calledWith(createdLogger.log, LOG_LEVEL.INFO, 'OPTIMIZELY: Value for variable "button_width" of feature flag "test_feature_for_experiment" is 20.25 for user "user1"');
        });

        it('returns the right value from getFeatureVariableInteger', function() {
          var result = optlyInstance.getFeatureVariableInteger('test_feature_for_experiment', 'num_buttons', 'user1', { test_attribute: 'test_value' });
          assert.strictEqual(result, 2);
          sinon.assert.calledWith(createdLogger.log, LOG_LEVEL.INFO, 'OPTIMIZELY: Value for variable "num_buttons" of feature flag "test_feature_for_experiment" is 2 for user "user1"');
        });

        it('returns the right value from getFeatureVariableString', function() {
          var result = optlyInstance.getFeatureVariableString('test_feature_for_experiment', 'button_txt', 'user1', { test_attribute: 'test_value' });
          assert.strictEqual(result, 'Buy me NOW');
          sinon.assert.calledWith(createdLogger.log, LOG_LEVEL.INFO, 'OPTIMIZELY: Value for variable "button_txt" of feature flag "test_feature_for_experiment" is Buy me NOW for user "user1"');
        });

        it('returns null from getFeatureVariableBoolean when called with a non-boolean variable', function() {
          var result = optlyInstance.getFeatureVariableBoolean('test_feature_for_experiment', 'button_width', 'user1');
          assert.strictEqual(result, null);
          sinon.assert.calledWith(createdLogger.log, LOG_LEVEL.WARNING, 'OPTIMIZELY: Requested variable type "boolean", but variable is of type "double". Use correct API to retrieve value. Returning None.');
        });

        it('returns null from getFeatureVariableDouble when called with a non-double variable', function() {
          var result = optlyInstance.getFeatureVariableDouble('test_feature_for_experiment', 'is_button_animated', 'user1');
          assert.strictEqual(result, null);
          sinon.assert.calledWith(createdLogger.log, LOG_LEVEL.WARNING, 'OPTIMIZELY: Requested variable type "double", but variable is of type "boolean". Use correct API to retrieve value. Returning None.');
        });

        it('returns null from getFeatureVariableInteger when called with a non-integer variable', function() {
          var result = optlyInstance.getFeatureVariableInteger('test_feature_for_experiment', 'button_width', 'user1');
          assert.strictEqual(result, null);
          sinon.assert.calledWith(createdLogger.log, LOG_LEVEL.WARNING, 'OPTIMIZELY: Requested variable type "integer", but variable is of type "double". Use correct API to retrieve value. Returning None.');
        });

        it('returns null from getFeatureVariableString when called with a non-string variable', function() {
          var result = optlyInstance.getFeatureVariableString('test_feature_for_experiment', 'num_buttons', 'user1');
          assert.strictEqual(result, null);
          sinon.assert.calledWith(createdLogger.log, LOG_LEVEL.WARNING, 'OPTIMIZELY: Requested variable type "string", but variable is of type "integer". Use correct API to retrieve value. Returning None.');
        });

        it('returns null from getFeatureVariableBoolean if user id is null', function() {
          var result = optlyInstance.getFeatureVariableBoolean('test_feature_for_experiment', 'is_button_animated', null, { test_attribute: 'test_value' });
          assert.strictEqual(result, null);
          sinon.assert.calledWith(createdLogger.log, LOG_LEVEL.ERROR, 'OPTIMIZELY: Provided user_id is in an invalid format.');
        });

        it('returns null from getFeatureVariableBoolean if user id is undefined', function() {
          var result = optlyInstance.getFeatureVariableBoolean('test_feature_for_experiment', 'is_button_animated', undefined, { test_attribute: 'test_value' });
          assert.strictEqual(result, null);
          sinon.assert.calledWith(createdLogger.log, LOG_LEVEL.ERROR, 'OPTIMIZELY: Provided user_id is in an invalid format.');
        });

        it('returns null from getFeatureVariableBoolean if user id is not provided', function() {
          var result = optlyInstance.getFeatureVariableBoolean('test_feature_for_experiment', 'is_button_animated');
          assert.strictEqual(result, null);
          sinon.assert.calledWith(createdLogger.log, LOG_LEVEL.ERROR, 'OPTIMIZELY: Provided user_id is in an invalid format.');
        });

        it('returns null from getFeatureVariableDouble if user id is null', function() {
          var result = optlyInstance.getFeatureVariableDouble('test_feature_for_experiment', 'button_width', null, { test_attribute: 'test_value' });
          assert.strictEqual(result, null);
          sinon.assert.calledWith(createdLogger.log, LOG_LEVEL.ERROR, 'OPTIMIZELY: Provided user_id is in an invalid format.');
        });

        it('returns null from getFeatureVariableDouble if user id is undefined', function() {
          var result = optlyInstance.getFeatureVariableDouble('test_feature_for_experiment', 'button_width', undefined, { test_attribute: 'test_value' });
          assert.strictEqual(result, null);
          sinon.assert.calledWith(createdLogger.log, LOG_LEVEL.ERROR, 'OPTIMIZELY: Provided user_id is in an invalid format.');
        });

        it('returns null from getFeatureVariableDouble if user id is not provided', function() {
          var result = optlyInstance.getFeatureVariableDouble('test_feature_for_experiment', 'button_width');
          assert.strictEqual(result, null);
          sinon.assert.calledWith(createdLogger.log, LOG_LEVEL.ERROR, 'OPTIMIZELY: Provided user_id is in an invalid format.');
        });

        it('returns null from getFeatureVariableInteger if user id is null', function() {
          var result = optlyInstance.getFeatureVariableInteger('test_feature_for_experiment', 'num_buttons', null, { test_attribute: 'test_value' });
          assert.strictEqual(result, null);
          sinon.assert.calledWith(createdLogger.log, LOG_LEVEL.ERROR, 'OPTIMIZELY: Provided user_id is in an invalid format.');
        });

        it('returns null from getFeatureVariableInteger if user id is undefined', function() {
          var result = optlyInstance.getFeatureVariableInteger('test_feature_for_experiment', 'num_buttons', undefined, { test_attribute: 'test_value' });
          assert.strictEqual(result, null);
          sinon.assert.calledWith(createdLogger.log, LOG_LEVEL.ERROR, 'OPTIMIZELY: Provided user_id is in an invalid format.');
        });

        it('returns null from getFeatureVariableInteger if user id is not provided', function() {
          var result = optlyInstance.getFeatureVariableInteger('test_feature_for_experiment', 'num_buttons');
          assert.strictEqual(result, null);
          sinon.assert.calledWith(createdLogger.log, LOG_LEVEL.ERROR, 'OPTIMIZELY: Provided user_id is in an invalid format.');
        });

        it('returns null from getFeatureVariableString if user id is null', function() {
          var result = optlyInstance.getFeatureVariableString('test_feature_for_experiment', 'button_txt', null, { test_attribute: 'test_value' });
          assert.strictEqual(result, null);
          sinon.assert.calledWith(createdLogger.log, LOG_LEVEL.ERROR, 'OPTIMIZELY: Provided user_id is in an invalid format.');
        });

        it('returns null from getFeatureVariableString if user id is undefined', function() {
          var result = optlyInstance.getFeatureVariableString('test_feature_for_experiment', 'button_txt', undefined, { test_attribute: 'test_value' });
          assert.strictEqual(result, null);
          sinon.assert.calledWith(createdLogger.log, LOG_LEVEL.ERROR, 'OPTIMIZELY: Provided user_id is in an invalid format.');
        });

        it('returns null from getFeatureVariableString if user id is not provided', function() {
          var result = optlyInstance.getFeatureVariableString('test_feature_for_experiment', 'button_txt');
          assert.strictEqual(result, null);
          sinon.assert.calledWith(createdLogger.log, LOG_LEVEL.ERROR, 'OPTIMIZELY: Provided user_id is in an invalid format.');
        });

        describe('type casting failures', function() {
          describe('invalid boolean', function() {
            beforeEach(function() {
              sandbox.stub(projectConfig, 'getVariableValueForVariation').returns('falsezzz');
            });

            it('should return null and log an error', function() {
              var result = optlyInstance.getFeatureVariableBoolean('test_feature_for_experiment', 'is_button_animated', 'user1');
              assert.strictEqual(result, null);
              sinon.assert.calledWith(createdLogger.log, LOG_LEVEL.ERROR, 'PROJECT_CONFIG: Unable to cast value falsezzz to type boolean, returning null.');
            });
          });

          describe('invalid integer', function() {
            beforeEach(function() {
              sandbox.stub(projectConfig, 'getVariableValueForVariation').returns('zzz123');
            });

            it('should return null and log an error', function() {
              var result = optlyInstance.getFeatureVariableInteger('test_feature_for_experiment', 'num_buttons', 'user1');
              assert.strictEqual(result, null);
              sinon.assert.calledWith(createdLogger.log, LOG_LEVEL.ERROR, 'PROJECT_CONFIG: Unable to cast value zzz123 to type integer, returning null.');
            });
          });

          describe('invalid double', function() {
            beforeEach(function() {
              sandbox.stub(projectConfig, 'getVariableValueForVariation').returns('zzz44.55');
            });

            it('should return null and log an error', function() {
              var result = optlyInstance.getFeatureVariableDouble('test_feature_for_experiment', 'button_width', 'user1');
              assert.strictEqual(result, null);
              sinon.assert.calledWith(createdLogger.log, LOG_LEVEL.ERROR, 'PROJECT_CONFIG: Unable to cast value zzz44.55 to type double, returning null.');
            });
          });
        });
      });

      describe('not bucketed into a variation', function() {
        beforeEach(function() {
          sandbox.stub(optlyInstance.decisionService, 'getVariationForFeature').returns({
            experiment: null,
            variation: null,
            decisionSource: null,
          });
        });

        it('returns the variable default value from getFeatureVariableBoolean', function() {
          var result = optlyInstance.getFeatureVariableBoolean('test_feature_for_experiment', 'is_button_animated', 'user1', { test_attribute: 'test_value' });
          assert.strictEqual(result, false);
          sinon.assert.calledWith(createdLogger.log, LOG_LEVEL.INFO, 'OPTIMIZELY: User "user1" is not in any variation or rollout rule. Returning default value for variable "is_button_animated" of feature flag "test_feature_for_experiment".');
        });

        it('returns the variable default value from getFeatureVariableDouble', function() {
          var result = optlyInstance.getFeatureVariableDouble('test_feature_for_experiment', 'button_width', 'user1', { test_attribute: 'test_value' });
          assert.strictEqual(result, 50.55);
          sinon.assert.calledWith(createdLogger.log, LOG_LEVEL.INFO, 'OPTIMIZELY: User "user1" is not in any variation or rollout rule. Returning default value for variable "button_width" of feature flag "test_feature_for_experiment".');
        });

        it('returns the variable default value from getFeatureVariableInteger', function() {
          var result = optlyInstance.getFeatureVariableInteger('test_feature_for_experiment', 'num_buttons', 'user1', { test_attribute: 'test_value' });
          assert.strictEqual(result, 10);
          sinon.assert.calledWith(createdLogger.log, LOG_LEVEL.INFO, 'OPTIMIZELY: User "user1" is not in any variation or rollout rule. Returning default value for variable "num_buttons" of feature flag "test_feature_for_experiment".');
        });

        it('returns the variable default value from getFeatureVariableString', function() {
          var result = optlyInstance.getFeatureVariableString('test_feature_for_experiment', 'button_txt', 'user1', { test_attribute: 'test_value' });
          assert.strictEqual(result, 'Buy me');
          sinon.assert.calledWith(createdLogger.log, LOG_LEVEL.INFO, 'OPTIMIZELY: User "user1" is not in any variation or rollout rule. Returning default value for variable "button_txt" of feature flag "test_feature_for_experiment".');
        });
      });

      it('returns null from getFeatureVariableBoolean if the argument feature key is invalid', function() {
        var result = optlyInstance.getFeatureVariableBoolean('thisIsNotAValidKey<><><>', 'is_button_animated', 'user1');
        assert.strictEqual(result, null);
        sinon.assert.calledWith(createdLogger.log, LOG_LEVEL.ERROR, 'PROJECT_CONFIG: Feature key thisIsNotAValidKey<><><> is not in datafile.');
      });

      it('returns null from getFeatureVariableDouble if the argument feature key is invalid', function() {
        var result = optlyInstance.getFeatureVariableDouble('thisIsNotAValidKey<><><>', 'button_width', 'user1');
        assert.strictEqual(result, null);
        sinon.assert.calledWith(createdLogger.log, LOG_LEVEL.ERROR, 'PROJECT_CONFIG: Feature key thisIsNotAValidKey<><><> is not in datafile.');
      });

      it('returns null from getFeatureVariableInteger if the argument feature key is invalid', function() {
        var result = optlyInstance.getFeatureVariableInteger('thisIsNotAValidKey<><><>', 'num_buttons', 'user1');
        assert.strictEqual(result, null);
        sinon.assert.calledWith(createdLogger.log, LOG_LEVEL.ERROR, 'PROJECT_CONFIG: Feature key thisIsNotAValidKey<><><> is not in datafile.');
      });

      it('returns null from getFeatureVariableString if the argument feature key is invalid', function() {
        var result = optlyInstance.getFeatureVariableString('thisIsNotAValidKey<><><>', 'button_txt', 'user1');
        assert.strictEqual(result, null);
        sinon.assert.calledWith(createdLogger.log, LOG_LEVEL.ERROR, 'PROJECT_CONFIG: Feature key thisIsNotAValidKey<><><> is not in datafile.');
      });

      it('returns null from getFeatureVariableBoolean if the argument variable key is invalid', function() {
        var result = optlyInstance.getFeatureVariableBoolean('test_feature_for_experiment', 'thisIsNotAVariableKey****', 'user1');
        assert.strictEqual(result, null);
        sinon.assert.calledWith(createdLogger.log, LOG_LEVEL.ERROR, 'PROJECT_CONFIG: Variable with key "thisIsNotAVariableKey****" associated with feature with key "test_feature_for_experiment" is not in datafile.');
      });

      it('returns null from getFeatureVariableDouble if the argument variable key is invalid', function() {
        var result = optlyInstance.getFeatureVariableDouble('test_feature_for_experiment', 'thisIsNotAVariableKey****', 'user1');
        assert.strictEqual(result, null);
        sinon.assert.calledWith(createdLogger.log, LOG_LEVEL.ERROR, 'PROJECT_CONFIG: Variable with key "thisIsNotAVariableKey****" associated with feature with key "test_feature_for_experiment" is not in datafile.');
      });

      it('returns null from getFeatureVariableInteger if the argument variable key is invalid', function() {
        var result = optlyInstance.getFeatureVariableInteger('test_feature_for_experiment', 'thisIsNotAVariableKey****', 'user1');
        assert.strictEqual(result, null);
        sinon.assert.calledWith(createdLogger.log, LOG_LEVEL.ERROR, 'PROJECT_CONFIG: Variable with key "thisIsNotAVariableKey****" associated with feature with key "test_feature_for_experiment" is not in datafile.');
      });

      it('returns null from getFeatureVariableString if the argument variable key is invalid', function() {
        var result = optlyInstance.getFeatureVariableString('test_feature_for_experiment', 'thisIsNotAVariableKey****', 'user1');
        assert.strictEqual(result, null);
        sinon.assert.calledWith(createdLogger.log, LOG_LEVEL.ERROR, 'PROJECT_CONFIG: Variable with key "thisIsNotAVariableKey****" associated with feature with key "test_feature_for_experiment" is not in datafile.');
      });

      it('returns null from getFeatureVariableBoolean when optimizely object is not a valid instance', function() {
        var instance = new Optimizely({
          datafile: {},
          errorHandler: errorHandler,
          eventDispatcher: eventDispatcher,
          logger: createdLogger,
        });

        createdLogger.log.reset();

        instance.getFeatureVariableBoolean('test_feature_for_experiment', 'thisIsNotAVariableKey****', 'user1');

        sinon.assert.calledOnce(createdLogger.log);
        var logMessage = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage, sprintf(LOG_MESSAGES.INVALID_OBJECT, 'OPTIMIZELY', 'getFeatureVariableBoolean'));
      });

      it('returns null from getFeatureVariableDouble when optimizely object is not a valid instance', function() {
        var instance = new Optimizely({
          datafile: {},
          errorHandler: errorHandler,
          eventDispatcher: eventDispatcher,
          logger: createdLogger,
        });

        createdLogger.log.reset();

        instance.getFeatureVariableDouble('test_feature_for_experiment', 'thisIsNotAVariableKey****', 'user1');

        sinon.assert.calledOnce(createdLogger.log);
        var logMessage = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage, sprintf(LOG_MESSAGES.INVALID_OBJECT, 'OPTIMIZELY', 'getFeatureVariableDouble'));
      });

      it('returns null from getFeatureVariableInteger when optimizely object is not a valid instance', function() {
        var instance = new Optimizely({
          datafile: {},
          errorHandler: errorHandler,
          eventDispatcher: eventDispatcher,
          logger: createdLogger,
        });

        createdLogger.log.reset();

        instance.getFeatureVariableInteger('test_feature_for_experiment', 'thisIsNotAVariableKey****', 'user1');

        sinon.assert.calledOnce(createdLogger.log);
        var logMessage = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage, sprintf(LOG_MESSAGES.INVALID_OBJECT, 'OPTIMIZELY', 'getFeatureVariableInteger'));
      });

      it('returns null from getFeatureVariableString when optimizely object is not a valid instance', function() {
        var instance = new Optimizely({
          datafile: {},
          errorHandler: errorHandler,
          eventDispatcher: eventDispatcher,
          logger: createdLogger,
        });

        createdLogger.log.reset();

        instance.getFeatureVariableString('test_feature_for_experiment', 'thisIsNotAVariableKey****', 'user1');

        sinon.assert.calledOnce(createdLogger.log);
        var logMessage = createdLogger.log.args[0][1];
        assert.strictEqual(logMessage, sprintf(LOG_MESSAGES.INVALID_OBJECT, 'OPTIMIZELY', 'getFeatureVariableString'));
      });
    });
  });
});
