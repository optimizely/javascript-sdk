/****************************************************************************
 * Copyright 2016-2021, Optimizely, Inc. and contributors                   *
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
import { assert, expect } from 'chai';
import sinon from 'sinon';
import { sprintf, NOTIFICATION_TYPES } from '@optimizely/js-sdk-utils';
import eventProcessor from '../plugins/event_processor';
import * as logging from '@optimizely/js-sdk-logging';

import Optimizely from './';
import OptimizelyUserContext from '../optimizely_user_context';
import { OptimizelyDecideOption } from '../shared_types';
import AudienceEvaluator from '../core/audience_evaluator';
import bluebird from 'bluebird';
import * as bucketer from '../core/bucketer';
import * as projectConfigManager from '../core/project_config/project_config_manager';
import * as enums from '../utils/enums';
import eventDispatcher from '../plugins/event_dispatcher/index.node';
import errorHandler from '../plugins/error_handler';
import fns from '../utils/fns';
import * as logger from '../plugins/logger';
import * as decisionService from '../core/decision_service';
import * as jsonSchemaValidator from '../utils/json_schema_validator';
import * as projectConfig from '../core/project_config';
import testData from '../tests/test_data';
import { createForwardingEventProcessor } from '../plugins/event_processor/forwarding_event_processor';
import { createEventProcessor } from '../plugins/event_processor';
import { createNotificationCenter } from '../core/notification_center';
import { createHttpPollingDatafileManager } from '../plugins/datafile_manager/http_polling_datafile_manager';

var ERROR_MESSAGES = enums.ERROR_MESSAGES;
var LOG_LEVEL = enums.LOG_LEVEL;
var LOG_MESSAGES = enums.LOG_MESSAGES;
var DECISION_SOURCES = enums.DECISION_SOURCES;
var DECISION_MESSAGES = enums.DECISION_MESSAGES;
var DECISION_NOTIFICATION_TYPES = enums.DECISION_NOTIFICATION_TYPES;
var FEATURE_VARIABLE_TYPES = enums.FEATURE_VARIABLE_TYPES;

var buildLogMessageFromArgs = args => sprintf(args[1], ...args.splice(2));

describe('lib/optimizely', function() {
  var ProjectConfigManagerStub;
  var globalStubErrorHandler;
  var stubLogHandler;
  var clock;
  beforeEach(function() {
    logging.setLogLevel('notset');
    stubLogHandler = {
      log: sinon.stub(),
    };
    logging.setLogHandler(stubLogHandler);
    globalStubErrorHandler = {
      handleError: sinon.stub(),
    };
    logging.setErrorHandler(globalStubErrorHandler);
    ProjectConfigManagerStub = sinon.stub(projectConfigManager, 'createProjectConfigManager').callsFake(function(config) {
      var currentConfig = config.datafile ? projectConfig.createProjectConfig(config.datafile) : null;
      return {
        stop: sinon.stub(),
        getConfig: sinon.stub().returns(currentConfig),
        onUpdate: sinon.stub().returns(function() {}),
        onReady: sinon.stub().returns({ then: function() {} }),
      };
    });
    sinon.stub(eventDispatcher, 'dispatchEvent');
    clock = sinon.useFakeTimers(new Date());
  });

  afterEach(function() {
    ProjectConfigManagerStub.restore();
    logging.resetErrorHandler();
    logging.resetLogger();
    eventDispatcher.dispatchEvent.restore();
    clock.restore();
  });

  describe('constructor', function() {
    var stubErrorHandler = { handleError: function() {} };
    var stubEventDispatcher = {
      dispatchEvent: function() {
        return bluebird.resolve(null);
      },
    };
    var createdLogger = logger.createLogger({ logLevel: LOG_LEVEL.INFO });
    var notificationCenter = createNotificationCenter({ logger: createdLogger, errorHandler: stubErrorHandler });
    var eventProcessor = createForwardingEventProcessor(stubEventDispatcher);
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
          notificationCenter,
          eventProcessor,
        });
        assert.instanceOf(optlyInstance, Optimizely);
      });

      it('should construct an instance of the Optimizely class when datafile is JSON string', function() {
        var optlyInstance = new Optimizely({
          clientEngine: 'node-sdk',
          datafile: JSON.stringify(testData.getTestProjectConfig()),
          errorHandler: stubErrorHandler,
          eventDispatcher: stubEventDispatcher,
          jsonSchemaValidator: jsonSchemaValidator,
          logger: createdLogger,
          notificationCenter,
          eventProcessor,
        });
        assert.instanceOf(optlyInstance, Optimizely);
      });

      it('should log if the client engine passed in is invalid', function() {
        new Optimizely({
          datafile: testData.getTestProjectConfig(),
          errorHandler: stubErrorHandler,
          eventDispatcher: stubEventDispatcher,
          logger: createdLogger,
          notificationCenter,
          eventProcessor,
        });

        sinon.assert.called(createdLogger.log);
        var logMessage = buildLogMessageFromArgs(createdLogger.log.args[0]);
        assert.strictEqual(logMessage, sprintf(LOG_MESSAGES.INVALID_CLIENT_ENGINE, 'OPTIMIZELY', 'undefined'));
      });

      it('should log if the defaultDecideOptions passed in are invalid', function() {
        new Optimizely({
          clientEngine: 'node-sdk',
          datafile: testData.getTestProjectConfig(),
          errorHandler: stubErrorHandler,
          eventDispatcher: stubEventDispatcher,
          logger: createdLogger,
          defaultDecideOptions: 'invalid_options',
          notificationCenter,
          eventProcessor,
        });

        sinon.assert.called(createdLogger.log);
        var logMessage = buildLogMessageFromArgs(createdLogger.log.args[0]);
        assert.strictEqual(logMessage, sprintf(LOG_MESSAGES.INVALID_DEFAULT_DECIDE_OPTIONS, 'OPTIMIZELY'));
      });

      it('should allow passing `react-sdk` as the clientEngine', function() {
        var instance = new Optimizely({
          clientEngine: 'react-sdk',
          datafile: testData.getTestProjectConfig(),
          errorHandler: stubErrorHandler,
          eventDispatcher: stubEventDispatcher,
          logger: createdLogger,
          notificationCenter,
          eventProcessor,
        });

        assert.strictEqual(instance.clientEngine, 'react-sdk');
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

          new Optimizely({
            clientEngine: 'node-sdk',
            logger: createdLogger,
            datafile: testData.getTestProjectConfig(),
            jsonSchemaValidator: jsonSchemaValidator,
            userProfileService: userProfileServiceInstance,
            notificationCenter,
            eventProcessor,
          });

          sinon.assert.calledWith(decisionService.createDecisionService, {
            userProfileService: userProfileServiceInstance,
            logger: createdLogger,
            UNSTABLE_conditionEvaluators: undefined,
          });

          var logMessage = buildLogMessageFromArgs(createdLogger.log.args[0]);
          assert.strictEqual(logMessage, 'OPTIMIZELY: Valid user profile service provided.');
        });

        it('should pass in a null user profile to the decision service if the provided user profile is invalid', function() {
          var invalidUserProfile = {
            save: function() {},
          };

          new Optimizely({
            clientEngine: 'node-sdk',
            logger: createdLogger,
            datafile: testData.getTestProjectConfig(),
            jsonSchemaValidator: jsonSchemaValidator,
            userProfileService: invalidUserProfile,
            notificationCenter,
            eventProcessor,
          });

          sinon.assert.calledWith(decisionService.createDecisionService, {
            userProfileService: null,
            logger: createdLogger,
            UNSTABLE_conditionEvaluators: undefined,
          });

          var logMessage = buildLogMessageFromArgs(createdLogger.log.args[0]);
          assert.strictEqual(
            logMessage,
            "USER_PROFILE_SERVICE_VALIDATOR: Provided user profile service instance is in an invalid format: Missing function 'lookup'."
          );
        });
      });

      describe('when an sdkKey is provided', function() {
        it('should not log an error when sdkKey is provided and datafile is not provided', function() {
          new Optimizely({
            clientEngine: 'node-sdk',
            errorHandler: stubErrorHandler,
            eventDispatcher: eventDispatcher,
            isValidInstance: true,
            jsonSchemaValidator: jsonSchemaValidator,
            logger: createdLogger,
            sdkKey: '12345',
            datafileManager: createHttpPollingDatafileManager('12345', createdLogger),
            notificationCenter,
            eventProcessor,            
          });
          sinon.assert.notCalled(stubErrorHandler.handleError);
        });

        it('passes datafile, datafileOptions, sdkKey, and other options to the project config manager', function() {
          var config = testData.getTestProjectConfig();
          let datafileOptions = {
            autoUpdate: true,
            updateInterval: 2 * 60 * 1000,
          }
          let datafileManager = createHttpPollingDatafileManager('12345', createdLogger, undefined, datafileOptions);
          new Optimizely({
            clientEngine: 'node-sdk',
            datafile: config,
            datafileOptions: datafileOptions,
            errorHandler: errorHandler,
            eventDispatcher: eventDispatcher,
            isValidInstance: true,
            jsonSchemaValidator: jsonSchemaValidator,
            logger: createdLogger,
            sdkKey: '12345',
            datafileManager: datafileManager,
            notificationCenter,
            eventProcessor,
          });
          sinon.assert.calledOnce(projectConfigManager.createProjectConfigManager);
          sinon.assert.calledWithExactly(projectConfigManager.createProjectConfigManager, {
            datafile: config,
            jsonSchemaValidator: jsonSchemaValidator,
            sdkKey: '12345',
            datafileManager: datafileManager
          });
        });
      });

      it('should support constructing two instances using the same datafile object', function() {
        var datafile = testData.getTypedAudiencesConfig();
        var optlyInstance = new Optimizely({
          clientEngine: 'node-sdk',
          datafile: datafile,
          errorHandler: stubErrorHandler,
          eventDispatcher: stubEventDispatcher,
          jsonSchemaValidator: jsonSchemaValidator,
          logger: createdLogger,
          notificationCenter,
          eventProcessor
        });
        assert.instanceOf(optlyInstance, Optimizely);
        var optlyInstance2 = new Optimizely({
          clientEngine: 'node-sdk',
          datafile: datafile,
          errorHandler: stubErrorHandler,
          eventDispatcher: stubEventDispatcher,
          jsonSchemaValidator: jsonSchemaValidator,
          logger: createdLogger,
          notificationCenter,
          eventProcessor,
        });
        assert.instanceOf(optlyInstance2, Optimizely);
      });
    });
  });

  describe('APIs', function() {
    var optlyInstance;
    var bucketStub;
    var fakeDecisionResponse;
    var notificationCenter = createNotificationCenter({ logger: createdLogger, errorHandler });
    var eventProcessor = createForwardingEventProcessor(eventDispatcher, notificationCenter);
    var createdLogger = logger.createLogger({
      logLevel: LOG_LEVEL.INFO,
      logToConsole: false,
    });
    beforeEach(function() {
      optlyInstance = new Optimizely({
        clientEngine: 'node-sdk',
        datafile: testData.getTestProjectConfig(),
        errorHandler: errorHandler,
        eventDispatcher: eventDispatcher,
        jsonSchemaValidator: jsonSchemaValidator,
        logger: createdLogger,
        isValidInstance: true,
        eventBatchSize: 1,
        eventProcessor,
        notificationCenter,
      });

      bucketStub = sinon.stub(bucketer, 'bucket');
      sinon.stub(errorHandler, 'handleError');
      sinon.stub(createdLogger, 'log');
      sinon.stub(fns, 'uuid').returns('a68cf1ad-0393-4e18-af87-efe8f01a7c9c');
    });

    afterEach(function() {
      bucketer.bucket.restore();
      errorHandler.handleError.restore();
      createdLogger.log.restore();
      fns.uuid.restore();
    });

    describe('#activate', function() {
      it('should call bucketer and dispatchEvent with proper args and return variation key', function() {
        fakeDecisionResponse = {
          result: '111129',
          reasons: [],
        };
        bucketStub.returns(fakeDecisionResponse);
        var variation = optlyInstance.activate('testExperiment', 'testUser');
        assert.strictEqual(variation, 'variation');

        sinon.assert.calledOnce(bucketer.bucket);
        sinon.assert.calledOnce(eventDispatcher.dispatchEvent);

        var expectedObj = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
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
                        metadata: {
                          flag_key: '',
                          rule_key: 'testExperiment',
                          rule_type: 'experiment',
                          variation_key: 'variation',
                          enabled: true,
                        },
                      },
                    ],
                    events: [
                      {
                        entity_id: '4',
                        timestamp: Math.round(new Date().getTime()),
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
            enrich_decisions: true,
          },
        };
        var eventDispatcherCall = eventDispatcher.dispatchEvent.args[0];
        assert.deepEqual(eventDispatcherCall[0], expectedObj);
      });

      it('should dispatch proper params for null value attributes', function() {
        fakeDecisionResponse = {
          result: '122229',
          reasons: [],
        };
        bucketStub.returns(fakeDecisionResponse);
        var activate = optlyInstance.activate('testExperimentWithAudiences', 'testUser', {
          browser_type: 'firefox',
          test_null_attribute: null,
        });
        assert.strictEqual(activate, 'variationWithAudience');

        sinon.assert.calledOnce(bucketer.bucket);
        sinon.assert.calledOnce(eventDispatcher.dispatchEvent);

        var expectedObj = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
          params: {
            account_id: '12001',
            project_id: '111001',
            visitors: [
              {
                snapshots: [
                  {
                    decisions: [
                      {
                        campaign_id: '5',
                        experiment_id: '122227',
                        variation_id: '122229',
                        metadata: {
                          flag_key: '',
                          rule_key: 'testExperimentWithAudiences',
                          rule_type: 'experiment',
                          variation_key: 'variationWithAudience',
                          enabled: true,
                        },

                      },
                    ],
                    events: [
                      {
                        entity_id: '5',
                        timestamp: Math.round(new Date().getTime()),
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
            enrich_decisions: true,
          },
        };

        var eventDispatcherCall = eventDispatcher.dispatchEvent.args[0];
        assert.deepEqual(eventDispatcherCall[0], expectedObj);
      });

      it('should call bucketer and dispatchEvent with proper args and return variation key if user is in audience', function() {
        fakeDecisionResponse = {
          result: '122229',
          reasons: [],
        };
        bucketStub.returns(fakeDecisionResponse);
        var activate = optlyInstance.activate('testExperimentWithAudiences', 'testUser', { browser_type: 'firefox' });
        assert.strictEqual(activate, 'variationWithAudience');

        sinon.assert.calledOnce(bucketer.bucket);
        sinon.assert.calledOnce(eventDispatcher.dispatchEvent);

        var expectedObj = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
          params: {
            account_id: '12001',
            project_id: '111001',
            visitors: [
              {
                snapshots: [
                  {
                    decisions: [
                      {
                        campaign_id: '5',
                        experiment_id: '122227',
                        variation_id: '122229',
                        metadata: {
                          flag_key: '',
                          rule_key: 'testExperimentWithAudiences',
                          rule_type: 'experiment',
                          variation_key: 'variationWithAudience',
                          enabled: true,
                        },
                      },
                    ],
                    events: [
                      {
                        entity_id: '5',
                        timestamp: Math.round(new Date().getTime()),
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
            enrich_decisions: true,
          },
        };

        var eventDispatcherCall = eventDispatcher.dispatchEvent.args[0];
        assert.deepEqual(eventDispatcherCall[0], expectedObj);
      });

      it('should call activate and dispatchEvent with typed attributes and return variation key', function() {
        fakeDecisionResponse = {
          result: '122229',
          reasons: [],
        };
        bucketStub.returns(fakeDecisionResponse);
        var activate = optlyInstance.activate('testExperimentWithAudiences', 'testUser', {
          browser_type: 'firefox',
          boolean_key: true,
          integer_key: 10,
          double_key: 3.14,
        });
        assert.strictEqual(activate, 'variationWithAudience');

        sinon.assert.calledOnce(bucketer.bucket);
        sinon.assert.calledOnce(eventDispatcher.dispatchEvent);

        var expectedObj = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
          params: {
            account_id: '12001',
            project_id: '111001',
            visitors: [
              {
                snapshots: [
                  {
                    decisions: [
                      {
                        campaign_id: '5',
                        experiment_id: '122227',
                        variation_id: '122229',
                        metadata: {
                          flag_key: '',
                          rule_key: 'testExperimentWithAudiences',
                          rule_type: 'experiment',
                          variation_key: 'variationWithAudience',
                          enabled: true,
                        },
                      },
                    ],
                    events: [
                      {
                        entity_id: '5',
                        timestamp: Math.round(new Date().getTime()),
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
                  {
                    entity_id: '323434545',
                    key: 'boolean_key',
                    type: 'custom',
                    value: true,
                  },
                  {
                    entity_id: '616727838',
                    key: 'integer_key',
                    type: 'custom',
                    value: 10,
                  },
                  {
                    entity_id: '808797686',
                    key: 'double_key',
                    type: 'custom',
                    value: 3.14,
                  },
                ],
              },
            ],
            revision: '42',
            client_name: 'node-sdk',
            client_version: enums.NODE_CLIENT_VERSION,
            anonymize_ip: false,
            enrich_decisions: true,
          },
        };

        var eventDispatcherCall = eventDispatcher.dispatchEvent.args[0];
        assert.deepEqual(eventDispatcherCall[0], expectedObj);
      });

      describe('when experiment_bucket_map attribute is present', function() {
        it('should call activate and respect attribute experiment_bucket_map', function() {
          fakeDecisionResponse = {
            result: '111128', // id of "control" variation
            reasons: [],
          };
          bucketStub.returns(fakeDecisionResponse);
          var activate = optlyInstance.activate('testExperiment', 'testUser', {
            $opt_experiment_bucket_map: {
              '111127': {
                variation_id: '111129', // id of "variation" variation
              },
            },
          });

          assert.strictEqual(activate, 'variation');
          sinon.assert.notCalled(bucketer.bucket);
        });
      });

      it('should call bucketer and dispatchEvent with proper args and return variation key if user is in grouped experiment', function() {
        fakeDecisionResponse = {
          result: '662',
          reasons: [],
        };
        bucketStub.returns(fakeDecisionResponse);
        var activate = optlyInstance.activate('groupExperiment2', 'testUser');
        assert.strictEqual(activate, 'var2exp2');

        sinon.assert.calledOnce(bucketer.bucket);
        sinon.assert.calledOnce(eventDispatcher.dispatchEvent);

        var expectedObj = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
          params: {
            account_id: '12001',
            project_id: '111001',
            visitors: [
              {
                snapshots: [
                  {
                    decisions: [
                      {
                        campaign_id: '2',
                        experiment_id: '443',
                        variation_id: '662',
                        metadata: {
                          flag_key: '',
                          rule_key: 'groupExperiment2',
                          rule_type: 'experiment',
                          variation_key: 'var2exp2',
                          enabled: true,
                        },
                      },
                    ],
                    events: [
                      {
                        entity_id: '2',
                        timestamp: Math.round(new Date().getTime()),
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
            enrich_decisions: true,
          },
        };

        var eventDispatcherCall = eventDispatcher.dispatchEvent.args[0];
        assert.deepEqual(eventDispatcherCall[0], expectedObj);
      });

      it('should call bucketer and dispatchEvent with proper args and return variation key if user is in grouped experiment and is in audience', function() {
        fakeDecisionResponse = {
          result: '552',
          reasons: [],
        };
        bucketStub.returns(fakeDecisionResponse);
        var activate = optlyInstance.activate('groupExperiment1', 'testUser', { browser_type: 'firefox' });
        assert.strictEqual(activate, 'var2exp1');

        sinon.assert.calledOnce(bucketer.bucket);
        sinon.assert.calledOnce(eventDispatcher.dispatchEvent);

        var expectedObj = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
          params: {
            account_id: '12001',
            project_id: '111001',
            visitors: [
              {
                snapshots: [
                  {
                    decisions: [
                      {
                        campaign_id: '1',
                        experiment_id: '442',
                        variation_id: '552',
                        metadata: {
                          flag_key: '',
                          rule_key: 'groupExperiment1',
                          rule_type: 'experiment',
                          variation_key: 'var2exp1',
                          enabled: true,
                        },
                      },
                    ],
                    events: [
                      {
                        entity_id: '1',
                        timestamp: Math.round(new Date().getTime()),
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
            enrich_decisions: true,
          },
        };

        var eventDispatcherCall = eventDispatcher.dispatchEvent.args[0];
        assert.deepEqual(eventDispatcherCall[0], expectedObj);
      });

      it('should not make a dispatch event call if variation ID is null', function() {
        fakeDecisionResponse = {
          result: null,
          reasons: [],
        };
        bucketStub.returns(fakeDecisionResponse);
        assert.isNull(optlyInstance.activate('testExperiment', 'testUser'));
        sinon.assert.notCalled(eventDispatcher.dispatchEvent);
        sinon.assert.called(createdLogger.log);

        sinon.assert.calledWithExactly(
          createdLogger.log,
          LOG_LEVEL.DEBUG,
          LOG_MESSAGES.USER_HAS_NO_FORCED_VARIATION, 'DECISION_SERVICE', 'testUser'
        );

        sinon.assert.calledWithExactly(
          createdLogger.log,
          LOG_LEVEL.INFO,
          LOG_MESSAGES.NOT_ACTIVATING_USER, 'OPTIMIZELY', 'testUser', 'testExperiment'
        );
      });

      it('should return null if user is not in audience and user is not in group', function() {
        assert.isNull(optlyInstance.activate('testExperimentWithAudiences', 'testUser', { browser_type: 'chrome' }));

        sinon.assert.calledWithExactly(
          createdLogger.log,
          LOG_LEVEL.DEBUG,
          LOG_MESSAGES.USER_HAS_NO_FORCED_VARIATION, 'DECISION_SERVICE', 'testUser'
        );

        sinon.assert.calledWithExactly(
          createdLogger.log,
          LOG_LEVEL.INFO,
          LOG_MESSAGES.USER_NOT_IN_EXPERIMENT, 'DECISION_SERVICE', 'testUser', 'testExperimentWithAudiences'
        );

        sinon.assert.calledWithExactly(
          createdLogger.log,
          LOG_LEVEL.INFO,
          LOG_MESSAGES.NOT_ACTIVATING_USER, 'OPTIMIZELY', 'testUser', 'testExperimentWithAudiences'
        );
      });

      it('should return null if user is not in audience and user is in group', function() {
        assert.isNull(optlyInstance.activate('groupExperiment1', 'testUser', { browser_type: 'chrome' }));

        sinon.assert.calledWithExactly(
          createdLogger.log,
          LOG_LEVEL.DEBUG,
          LOG_MESSAGES.USER_HAS_NO_FORCED_VARIATION, 'DECISION_SERVICE', 'testUser'
        );

        sinon.assert.calledWithExactly(
          createdLogger.log,
          LOG_LEVEL.INFO,
          LOG_MESSAGES.USER_NOT_IN_EXPERIMENT, 'DECISION_SERVICE', 'testUser', 'groupExperiment1'
        );

        sinon.assert.calledWithExactly(
          createdLogger.log,
          LOG_LEVEL.INFO,
          LOG_MESSAGES.NOT_ACTIVATING_USER, 'OPTIMIZELY', 'testUser', 'groupExperiment1'
        );
      });

      it('should return null if experiment is not running', function() {
        assert.isNull(optlyInstance.activate('testExperimentNotRunning', 'testUser'));
        sinon.assert.calledTwice(createdLogger.log);

        var logMessage1 = buildLogMessageFromArgs(createdLogger.log.args[0]);
        assert.strictEqual(
          logMessage1,
          sprintf(LOG_MESSAGES.EXPERIMENT_NOT_RUNNING, 'DECISION_SERVICE', 'testExperimentNotRunning')
        );
        var logMessage2 = buildLogMessageFromArgs(createdLogger.log.args[1]);
        assert.strictEqual(
          logMessage2,
          sprintf(LOG_MESSAGES.NOT_ACTIVATING_USER, 'OPTIMIZELY', 'testUser', 'testExperimentNotRunning')
        );
      });

      it('should throw an error for invalid user ID', function() {
        assert.isNull(optlyInstance.activate('testExperiment', null));

        sinon.assert.notCalled(eventDispatcher.dispatchEvent);

        sinon.assert.calledOnce(errorHandler.handleError);
        var errorMessage = errorHandler.handleError.lastCall.args[0].message;
        assert.strictEqual(errorMessage, sprintf(ERROR_MESSAGES.INVALID_INPUT_FORMAT, 'OPTIMIZELY', 'user_id'));

        sinon.assert.calledTwice(createdLogger.log);

        var logMessage1 = buildLogMessageFromArgs(createdLogger.log.args[0]);
        assert.strictEqual(logMessage1, sprintf(ERROR_MESSAGES.INVALID_INPUT_FORMAT, 'OPTIMIZELY', 'user_id'));
        var logMessage2 = buildLogMessageFromArgs(createdLogger.log.args[1]);
        assert.strictEqual(
          logMessage2,
          sprintf(LOG_MESSAGES.NOT_ACTIVATING_USER, 'OPTIMIZELY', 'null', 'testExperiment')
        );
      });

      it('should log an error for invalid experiment key', function() {
        assert.isNull(optlyInstance.activate('invalidExperimentKey', 'testUser'));

        sinon.assert.notCalled(eventDispatcher.dispatchEvent);

        sinon.assert.calledTwice(createdLogger.log);
        var logMessage1 = buildLogMessageFromArgs(createdLogger.log.args[0]);
        assert.strictEqual(
          logMessage1,
          sprintf(ERROR_MESSAGES.INVALID_EXPERIMENT_KEY, 'OPTIMIZELY', 'invalidExperimentKey')
        );
        var logMessage2 = buildLogMessageFromArgs(createdLogger.log.args[1]);
        assert.strictEqual(
          logMessage2,
          sprintf(LOG_MESSAGES.NOT_ACTIVATING_USER, 'OPTIMIZELY', 'testUser', 'invalidExperimentKey')
        );
      });

      it('should throw an error for invalid attributes', function() {
        assert.isNull(optlyInstance.activate('testExperimentWithAudiences', 'testUser', []));

        sinon.assert.notCalled(eventDispatcher.dispatchEvent);
        sinon.assert.calledOnce(errorHandler.handleError);
        var errorMessage = errorHandler.handleError.lastCall.args[0].message;
        assert.strictEqual(errorMessage, sprintf(ERROR_MESSAGES.INVALID_ATTRIBUTES, 'ATTRIBUTES_VALIDATOR'));

        sinon.assert.calledTwice(createdLogger.log);
        var logMessage1 = buildLogMessageFromArgs(createdLogger.log.args[0]);
        assert.strictEqual(logMessage1, sprintf(ERROR_MESSAGES.INVALID_ATTRIBUTES, 'ATTRIBUTES_VALIDATOR'));
        var logMessage2 = buildLogMessageFromArgs(createdLogger.log.args[1]);
        assert.strictEqual(
          logMessage2,
          sprintf(LOG_MESSAGES.NOT_ACTIVATING_USER, 'OPTIMIZELY', 'testUser', 'testExperimentWithAudiences')
        );
      });

      it('should activate when logger is in DEBUG mode', function() {
        fakeDecisionResponse = {
          result: '111129',
          reasons: [],
        };
        bucketStub.returns(fakeDecisionResponse);
        var instance = new Optimizely({
          datafile: testData.getTestProjectConfig(),
          errorHandler: errorHandler,
          eventDispatcher: eventDispatcher,
          jsonSchemaValidator: jsonSchemaValidator,
          logger: logger.createLogger({
            logLevel: enums.LOG_LEVEL.DEBUG,
            logToConsole: false,
          }),
          isValidInstance: true,
          eventBatchSize: 1,
          eventProcessor,
          notificationCenter,
        });

        var variation = instance.activate('testExperiment', 'testUser');
        assert.strictEqual(variation, 'variation');
        sinon.assert.calledOnce(eventDispatcher.dispatchEvent);
      });

      describe('whitelisting', function() {
        beforeEach(function() {
          sinon.spy(Optimizely.prototype, 'validateInputs');
        });

        afterEach(function() {
          Optimizely.prototype.validateInputs.restore();
        });

        it('should return forced variation after experiment status check and before audience check', function() {
          var activate = optlyInstance.activate('testExperiment', 'user1');
          assert.strictEqual(activate, 'control');

          sinon.assert.calledThrice(Optimizely.prototype.validateInputs);

          var logMessage0 = buildLogMessageFromArgs(createdLogger.log.args[0]);
          assert.strictEqual(
            logMessage0,
            sprintf(LOG_MESSAGES.USER_HAS_NO_FORCED_VARIATION, 'DECISION_SERVICE', 'user1')
          );
          var logMessage1 = buildLogMessageFromArgs(createdLogger.log.args[1]);
          assert.strictEqual(
            logMessage1,
            sprintf(LOG_MESSAGES.USER_FORCED_IN_VARIATION, 'DECISION_SERVICE', 'user1', 'control')
          );

          var expectedObj = {
            url: 'https://logx.optimizely.com/v1/events',
            httpVerb: 'POST',
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
                          variation_id: '111128',
                        },
                      ],
                      events: [
                        {
                          entity_id: '4',
                          timestamp: Math.round(new Date().getTime()),
                          key: 'campaign_activated',
                          uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                        },
                      ],
                    },
                  ],
                  visitor_id: 'user1',
                  attributes: [],
                },
              ],
              revision: '42',
              client_name: 'node-sdk',
              client_version: enums.NODE_CLIENT_VERSION,
              anonymize_ip: false,
              enrich_decisions: true,
            },
          };
        });
      });

      it('should not activate when optimizely object is not a valid instance', function() {
        var instance = new Optimizely({
          datafile: {},
          errorHandler: errorHandler,
          eventDispatcher: eventDispatcher,
          logger: createdLogger,
          eventProcessor,
          notificationCenter,
        });

        createdLogger.log.reset();

        instance.activate('testExperiment', 'testUser');

        sinon.assert.calledOnce(createdLogger.log);
        var logMessage = buildLogMessageFromArgs(createdLogger.log.args[0]);
        assert.strictEqual(logMessage, sprintf(LOG_MESSAGES.INVALID_OBJECT, 'OPTIMIZELY', 'activate'));

        sinon.assert.notCalled(eventDispatcher.dispatchEvent);
      });
    });

    describe('#track', function() {
      it("should dispatch an event when no attributes are provided and the event's experiment is untargeted", function() {
        optlyInstance.track('testEvent', 'testUser');

        sinon.assert.calledOnce(eventDispatcher.dispatchEvent);

        var expectedObj = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
          params: {
            account_id: '12001',
            project_id: '111001',
            visitors: [
              {
                snapshots: [
                  {
                    events: [
                      {
                        entity_id: '111095',
                        timestamp: Math.round(new Date().getTime()),
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
            enrich_decisions: true,
          },
        };
        var eventDispatcherCall = eventDispatcher.dispatchEvent.args[0];
        assert.deepEqual(eventDispatcherCall[0], expectedObj);
      });

      it("should dispatch an event when empty attributes are provided and the event's experiment is untargeted", function() {
        optlyInstance.track('testEvent', 'testUser', {});
        sinon.assert.calledOnce(eventDispatcher.dispatchEvent);
        var expectedObj = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
          params: {
            account_id: '12001',
            project_id: '111001',
            visitors: [
              {
                snapshots: [
                  {
                    events: [
                      {
                        entity_id: '111095',
                        timestamp: Math.round(new Date().getTime()),
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
            enrich_decisions: true,
          },
        };
        var eventDispatcherCall = eventDispatcher.dispatchEvent.args[0];
        assert.deepEqual(eventDispatcherCall[0], expectedObj);
      });

      it("should dispatch an event when attributes are provided and the event's experiment is untargeted", function() {
        optlyInstance.track('testEvent', 'testUser', { browser_type: 'safari' });
        sinon.assert.calledOnce(eventDispatcher.dispatchEvent);
        var expectedObj = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
          params: {
            account_id: '12001',
            project_id: '111001',
            visitors: [
              {
                snapshots: [
                  {
                    events: [
                      {
                        entity_id: '111095',
                        timestamp: Math.round(new Date().getTime()),
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
                    value: 'safari',
                  },
                ],
              },
            ],
            revision: '42',
            client_name: 'node-sdk',
            client_version: enums.NODE_CLIENT_VERSION,
            anonymize_ip: false,
            enrich_decisions: true,
          },
        };
        var eventDispatcherCall = eventDispatcher.dispatchEvent.args[0];
        assert.deepEqual(eventDispatcherCall[0], expectedObj);
      });

      it("should dispatch an event when no attributes are provided and the event's experiment is targeted", function() {
        optlyInstance.track('testEventWithAudiences', 'testUser');
        sinon.assert.calledOnce(eventDispatcher.dispatchEvent);
        var expectedObj = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
          params: {
            account_id: '12001',
            project_id: '111001',
            visitors: [
              {
                snapshots: [
                  {
                    events: [
                      {
                        entity_id: '111097',
                        timestamp: Math.round(new Date().getTime()),
                        uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                        key: 'testEventWithAudiences',
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
            enrich_decisions: true,
          },
        };
        var eventDispatcherCall = eventDispatcher.dispatchEvent.args[0];
        assert.deepEqual(eventDispatcherCall[0], expectedObj);
      });

      it("should dispatch an event when empty attributes are provided and the event's experiment is targeted", function() {
        optlyInstance.track('testEventWithAudiences', 'testUser');
        sinon.assert.calledOnce(eventDispatcher.dispatchEvent);
        var expectedObj = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
          params: {
            account_id: '12001',
            project_id: '111001',
            visitors: [
              {
                snapshots: [
                  {
                    events: [
                      {
                        entity_id: '111097',
                        timestamp: Math.round(new Date().getTime()),
                        uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                        key: 'testEventWithAudiences',
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
            enrich_decisions: true,
          },
        };
        var eventDispatcherCall = eventDispatcher.dispatchEvent.args[0];
        assert.deepEqual(eventDispatcherCall[0], expectedObj);
      });

      it('should call dispatchEvent with proper args when including null value attributes', function() {
        optlyInstance.track('testEventWithAudiences', 'testUser', {
          browser_type: 'firefox',
          test_null_attribute: null,
        });

        sinon.assert.calledOnce(eventDispatcher.dispatchEvent);

        var expectedObj = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
          params: {
            account_id: '12001',
            project_id: '111001',
            visitors: [
              {
                snapshots: [
                  {
                    events: [
                      {
                        entity_id: '111097',
                        timestamp: Math.round(new Date().getTime()),
                        uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                        key: 'testEventWithAudiences',
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
            enrich_decisions: true,
          },
        };
        var eventDispatcherCall = eventDispatcher.dispatchEvent.args[0];
        assert.deepEqual(eventDispatcherCall[0], expectedObj);
      });

      it('should call dispatchEvent with proper args when including attributes', function() {
        optlyInstance.track('testEventWithAudiences', 'testUser', { browser_type: 'firefox' });

        sinon.assert.calledOnce(eventDispatcher.dispatchEvent);

        var expectedObj = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
          params: {
            account_id: '12001',
            project_id: '111001',
            visitors: [
              {
                snapshots: [
                  {
                    events: [
                      {
                        entity_id: '111097',
                        timestamp: Math.round(new Date().getTime()),
                        uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                        key: 'testEventWithAudiences',
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
            enrich_decisions: true,
          },
        };
        var eventDispatcherCall = eventDispatcher.dispatchEvent.args[0];
        assert.deepEqual(eventDispatcherCall[0], expectedObj);
      });

      it('should call bucketer and dispatchEvent with proper args when including event tags', function() {
        optlyInstance.track('testEvent', 'testUser', undefined, { eventTag: 'chill' });

        sinon.assert.calledOnce(eventDispatcher.dispatchEvent);

        var expectedObj = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
          params: {
            account_id: '12001',
            project_id: '111001',
            visitors: [
              {
                snapshots: [
                  {
                    events: [
                      {
                        entity_id: '111095',
                        timestamp: Math.round(new Date().getTime()),
                        uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                        key: 'testEvent',
                        tags: {
                          eventTag: 'chill',
                        },
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
            enrich_decisions: true,
          },
        };
        var eventDispatcherCall = eventDispatcher.dispatchEvent.args[0];
        assert.deepEqual(eventDispatcherCall[0], expectedObj);
      });

      it('should call dispatchEvent with proper args when including event tags and revenue', function() {
        optlyInstance.track('testEvent', 'testUser', undefined, { revenue: 4200, eventTag: 'chill' });

        sinon.assert.calledOnce(eventDispatcher.dispatchEvent);

        var expectedObj = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
          params: {
            account_id: '12001',
            project_id: '111001',
            visitors: [
              {
                snapshots: [
                  {
                    events: [
                      {
                        entity_id: '111095',
                        timestamp: Math.round(new Date().getTime()),
                        uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                        key: 'testEvent',
                        revenue: 4200,
                        tags: {
                          revenue: 4200,
                          eventTag: 'chill',
                        },
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
            enrich_decisions: true,
          },
        };
        var eventDispatcherCall = eventDispatcher.dispatchEvent.args[0];
        assert.deepEqual(eventDispatcherCall[0], expectedObj);
      });

      it('should call dispatchEvent with proper args when including event tags and null event tag values and revenue', function() {
        optlyInstance.track('testEvent', 'testUser', undefined, {
          revenue: 4200,
          eventTag: 'chill',
          testNullEventTag: null,
        });

        sinon.assert.calledOnce(eventDispatcher.dispatchEvent);

        var expectedObj = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
          params: {
            account_id: '12001',
            project_id: '111001',
            visitors: [
              {
                snapshots: [
                  {
                    events: [
                      {
                        entity_id: '111095',
                        timestamp: Math.round(new Date().getTime()),
                        uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                        key: 'testEvent',
                        revenue: 4200,
                        tags: {
                          revenue: 4200,
                          eventTag: 'chill',
                        },
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
            enrich_decisions: true,
          },
        };
        var eventDispatcherCall = eventDispatcher.dispatchEvent.args[0];
        assert.deepEqual(eventDispatcherCall[0], expectedObj);
      });

      it('should not call dispatchEvent when including invalid event value', function() {
        optlyInstance.track('testEvent', 'testUser', undefined, '4200');

        sinon.assert.notCalled(eventDispatcher.dispatchEvent);
        sinon.assert.calledOnce(createdLogger.log);
      });

      it('should track a user for an experiment not running', function() {
        optlyInstance.track('testEventWithExperimentNotRunning', 'testUser');
        sinon.assert.calledOnce(eventDispatcher.dispatchEvent);
        var expectedObj = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
          params: {
            account_id: '12001',
            project_id: '111001',
            visitors: [
              {
                snapshots: [
                  {
                    events: [
                      {
                        entity_id: '111099',
                        timestamp: Math.round(new Date().getTime()),
                        uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                        key: 'testEventWithExperimentNotRunning',
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
            enrich_decisions: true,
          },
        };
        var eventDispatcherCall = eventDispatcher.dispatchEvent.args[0];
        assert.deepEqual(eventDispatcherCall[0], expectedObj);
      });

      it('should track a user when user is not in the audience of the experiment', function() {
        optlyInstance.track('testEventWithAudiences', 'testUser', { browser_type: 'chrome' });
        sinon.assert.calledOnce(eventDispatcher.dispatchEvent);
        var expectedObj = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
          params: {
            account_id: '12001',
            project_id: '111001',
            visitors: [
              {
                snapshots: [
                  {
                    events: [
                      {
                        entity_id: '111097',
                        timestamp: Math.round(new Date().getTime()),
                        uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                        key: 'testEventWithAudiences',
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
                    value: 'chrome',
                  },
                ],
              },
            ],
            revision: '42',
            client_name: 'node-sdk',
            client_version: enums.NODE_CLIENT_VERSION,
            anonymize_ip: false,
            enrich_decisions: true,
          },
        };
        var eventDispatcherCall = eventDispatcher.dispatchEvent.args[0];
        assert.deepEqual(eventDispatcherCall[0], expectedObj);
      });

      it('should track a user when the event has no associated experiments', function() {
        optlyInstance.track('testEventWithoutExperiments', 'testUser');
        sinon.assert.calledOnce(eventDispatcher.dispatchEvent);
        var expectedObj = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
          params: {
            account_id: '12001',
            project_id: '111001',
            visitors: [
              {
                snapshots: [
                  {
                    events: [
                      {
                        entity_id: '111098',
                        timestamp: Math.round(new Date().getTime()),
                        uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                        key: 'testEventWithoutExperiments',
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
            enrich_decisions: true,
          },
        };
        var eventDispatcherCall = eventDispatcher.dispatchEvent.args[0];
        assert.deepEqual(eventDispatcherCall[0], expectedObj);
      });

      it('should only send one conversion event when the event is attached to multiple experiments', function() {
        optlyInstance.track('testEventWithMultipleExperiments', 'testUser', { browser_type: 'firefox' });
        sinon.assert.calledOnce(eventDispatcher.dispatchEvent);
        var expectedObj = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
          params: {
            account_id: '12001',
            project_id: '111001',
            visitors: [
              {
                snapshots: [
                  {
                    events: [
                      {
                        entity_id: '111100',
                        timestamp: Math.round(new Date().getTime()),
                        uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                        key: 'testEventWithMultipleExperiments',
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
            enrich_decisions: true,
          },
        };
        var eventDispatcherCall = eventDispatcher.dispatchEvent.args[0];
        assert.deepEqual(eventDispatcherCall[0], expectedObj);
      });

      it('should throw an error for invalid user ID', function() {
        optlyInstance.track('testEvent', null);

        sinon.assert.notCalled(eventDispatcher.dispatchEvent);

        sinon.assert.calledOnce(errorHandler.handleError);
        var errorMessage = errorHandler.handleError.lastCall.args[0].message;
        assert.strictEqual(errorMessage, sprintf(ERROR_MESSAGES.INVALID_INPUT_FORMAT, 'OPTIMIZELY', 'user_id'));

        sinon.assert.calledOnce(createdLogger.log);
        var logMessage = buildLogMessageFromArgs(createdLogger.log.args[0]);
        assert.strictEqual(logMessage, sprintf(ERROR_MESSAGES.INVALID_INPUT_FORMAT, 'OPTIMIZELY', 'user_id'));
      });

      it('should log a warning for an event key that is not in the datafile and a warning for not tracking user', function() {
        optlyInstance.track('invalidEventKey', 'testUser');

        sinon.assert.calledTwice(createdLogger.log);

        var logCall1 = createdLogger.log.getCall(0);
        sinon.assert.calledWithExactly(
          logCall1,
          LOG_LEVEL.WARNING,
          LOG_MESSAGES.EVENT_KEY_NOT_FOUND, 'OPTIMIZELY', 'invalidEventKey'
        );

        var logCall2 = createdLogger.log.getCall(1);
        sinon.assert.calledWithExactly(
          logCall2,
          LOG_LEVEL.WARNING,
          LOG_MESSAGES.NOT_TRACKING_USER, 'OPTIMIZELY', 'testUser'
        );

        sinon.assert.notCalled(errorHandler.handleError);
      });

      it('should throw an error for invalid attributes', function() {
        optlyInstance.track('testEvent', 'testUser', []);

        sinon.assert.notCalled(eventDispatcher.dispatchEvent);

        sinon.assert.calledOnce(errorHandler.handleError);
        var errorMessage = errorHandler.handleError.lastCall.args[0].message;
        assert.strictEqual(errorMessage, sprintf(ERROR_MESSAGES.INVALID_ATTRIBUTES, 'ATTRIBUTES_VALIDATOR'));

        sinon.assert.calledOnce(createdLogger.log);
        var logMessage = buildLogMessageFromArgs(createdLogger.log.args[0]);
        assert.strictEqual(logMessage, sprintf(ERROR_MESSAGES.INVALID_ATTRIBUTES, 'ATTRIBUTES_VALIDATOR'));
      });

      it('should not throw an error for an event key without associated experiment IDs', function() {
        optlyInstance.track('testEventWithoutExperiments', 'testUser');
        sinon.assert.notCalled(errorHandler.handleError);
      });

      it('should track when logger is in DEBUG mode', function() {
        var instance = new Optimizely({
          datafile: testData.getTestProjectConfig(),
          errorHandler: errorHandler,
          eventDispatcher: eventDispatcher,
          jsonSchemaValidator: jsonSchemaValidator,
          logger: logger.createLogger({
            logLevel: enums.LOG_LEVEL.DEBUG,
            logToConsole: false,
          }),
          isValidInstance: true,
          eventBatchSize: 1,
          eventProcessor,
          notificationCenter,
        });

        instance.track('testEvent', 'testUser');
        sinon.assert.calledOnce(eventDispatcher.dispatchEvent);
      });

      it('should not track when optimizely object is not a valid instance', function() {
        var instance = new Optimizely({
          datafile: {},
          errorHandler: errorHandler,
          eventDispatcher: eventDispatcher,
          logger: createdLogger,
          eventProcessor,
          notificationCenter,
        });

        createdLogger.log.reset();

        instance.track('testExperiment', 'testUser');

        sinon.assert.calledOnce(createdLogger.log);
        var logMessage = buildLogMessageFromArgs(createdLogger.log.args[0]);
        assert.strictEqual(logMessage, sprintf(LOG_MESSAGES.INVALID_OBJECT, 'OPTIMIZELY', 'track'));

        sinon.assert.notCalled(eventDispatcher.dispatchEvent);
      });
    });

    describe('#getVariation', function() {
      it('should call bucketer and return variation key', function() {
        fakeDecisionResponse = {
          result: '111129',
          reasons: [],
        };
        bucketStub.returns(fakeDecisionResponse);
        var variation = optlyInstance.getVariation('testExperiment', 'testUser');

        assert.strictEqual(variation, 'variation');

        sinon.assert.calledOnce(bucketer.bucket);
        sinon.assert.called(createdLogger.log);

        sinon.assert.calledWithExactly(
          createdLogger.log,
          LOG_LEVEL.DEBUG,
          LOG_MESSAGES.USER_HAS_NO_FORCED_VARIATION, 'DECISION_SERVICE', 'testUser'
        );
      });

      it('should call bucketer and return variation key with attributes', function() {
        fakeDecisionResponse = {
          result: '122229',
          reasons: [],
        };
        bucketStub.returns(fakeDecisionResponse);
        var getVariation = optlyInstance.getVariation('testExperimentWithAudiences', 'testUser', {
          browser_type: 'firefox',
        });

        assert.strictEqual(getVariation, 'variationWithAudience');

        sinon.assert.calledOnce(bucketer.bucket);
        sinon.assert.called(createdLogger.log);
      });

      it('should return null if user is not in audience or experiment is not running', function() {
        var getVariationReturnsNull1 = optlyInstance.getVariation('testExperimentWithAudiences', 'testUser', {});
        var getVariationReturnsNull2 = optlyInstance.getVariation('testExperimentNotRunning', 'testUser');

        assert.isNull(getVariationReturnsNull1);
        assert.isNull(getVariationReturnsNull2);

        sinon.assert.notCalled(bucketer.bucket);
        sinon.assert.called(createdLogger.log);

        sinon.assert.calledWithExactly(
          createdLogger.log,
          LOG_LEVEL.DEBUG,
          LOG_MESSAGES.USER_HAS_NO_FORCED_VARIATION, 'DECISION_SERVICE', 'testUser'
        );

        sinon.assert.calledWithExactly(
          createdLogger.log,
          LOG_LEVEL.INFO,
          LOG_MESSAGES.USER_NOT_IN_EXPERIMENT, 'DECISION_SERVICE', 'testUser', 'testExperimentWithAudiences'
        );

        sinon.assert.calledWithExactly(
          createdLogger.log,
          LOG_LEVEL.INFO,
          LOG_MESSAGES.EXPERIMENT_NOT_RUNNING, 'DECISION_SERVICE', 'testExperimentNotRunning'
        );
      });

      it('should throw an error for invalid user ID', function() {
        var getVariationWithError = optlyInstance.getVariation('testExperiment', null);

        assert.isNull(getVariationWithError);

        sinon.assert.calledOnce(errorHandler.handleError);
        var errorMessage = errorHandler.handleError.lastCall.args[0].message;
        assert.strictEqual(errorMessage, sprintf(ERROR_MESSAGES.INVALID_INPUT_FORMAT, 'OPTIMIZELY', 'user_id'));

        sinon.assert.calledOnce(createdLogger.log);
        var logMessage = buildLogMessageFromArgs(createdLogger.log.args[0]);
        assert.strictEqual(logMessage, sprintf(ERROR_MESSAGES.INVALID_INPUT_FORMAT, 'OPTIMIZELY', 'user_id'));
      });

      it('should log an error for invalid experiment key', function() {
        var getVariationWithError = optlyInstance.getVariation('invalidExperimentKey', 'testUser');
        assert.isNull(getVariationWithError);

        sinon.assert.calledOnce(createdLogger.log);
        var logMessage = buildLogMessageFromArgs(createdLogger.log.args[0]);
        assert.strictEqual(
          logMessage,
          sprintf(ERROR_MESSAGES.INVALID_EXPERIMENT_KEY, 'OPTIMIZELY', 'invalidExperimentKey')
        );
      });

      it('should throw an error for invalid attributes', function() {
        var getVariationWithError = optlyInstance.getVariation('testExperimentWithAudiences', 'testUser', []);

        assert.isNull(getVariationWithError);

        sinon.assert.calledOnce(errorHandler.handleError);
        var errorMessage = errorHandler.handleError.lastCall.args[0].message;
        assert.strictEqual(errorMessage, sprintf(ERROR_MESSAGES.INVALID_ATTRIBUTES, 'ATTRIBUTES_VALIDATOR'));

        sinon.assert.calledOnce(createdLogger.log);
        var logMessage = buildLogMessageFromArgs(createdLogger.log.args[0]);
        assert.strictEqual(logMessage, sprintf(ERROR_MESSAGES.INVALID_ATTRIBUTES, 'ATTRIBUTES_VALIDATOR'));
      });

      describe('whitelisting', function() {
        beforeEach(function() {
          sinon.spy(Optimizely.prototype, 'validateInputs');
        });

        afterEach(function() {
          Optimizely.prototype.validateInputs.restore();
        });

        it('should return forced variation after experiment status check and before audience check', function() {
          var getVariation = optlyInstance.getVariation('testExperiment', 'user1');
          assert.strictEqual(getVariation, 'control');

          sinon.assert.calledTwice(Optimizely.prototype.validateInputs);

          sinon.assert.calledTwice(createdLogger.log);

          var logMessage0 = buildLogMessageFromArgs(createdLogger.log.args[0]);
          assert.strictEqual(
            logMessage0,
            sprintf(LOG_MESSAGES.USER_HAS_NO_FORCED_VARIATION, 'DECISION_SERVICE', 'user1')
          );
          var logMessage = buildLogMessageFromArgs(createdLogger.log.args[1]);
          assert.strictEqual(
            logMessage,
            sprintf(LOG_MESSAGES.USER_FORCED_IN_VARIATION, 'DECISION_SERVICE', 'user1', 'control')
          );
        });
      });

      it('should not return variation when optimizely object is not a valid instance', function() {
        var instance = new Optimizely({
          datafile: {},
          errorHandler: errorHandler,
          eventDispatcher: eventDispatcher,
          logger: createdLogger,
          eventProcessor,
          notificationCenter,
        });

        createdLogger.log.reset();

        instance.getVariation('testExperiment', 'testUser');

        sinon.assert.calledOnce(createdLogger.log);
        var logMessage = buildLogMessageFromArgs(createdLogger.log.args[0]);
        assert.strictEqual(logMessage, sprintf(LOG_MESSAGES.INVALID_OBJECT, 'OPTIMIZELY', 'getVariation'));

        sinon.assert.notCalled(eventDispatcher.dispatchEvent);
      });

      describe('order of bucketing operations', function() {
        it('should properly follow the order of bucketing operations', function() {
          // Order of operations is preconditions > experiment is running > whitelisting > audience eval > variation bucketing
          fakeDecisionResponse = {
            result: '122228', // returns the control variation
            reasons: [],
          };
          bucketStub.returns(fakeDecisionResponse);

          // invalid user, running experiment
          assert.isNull(optlyInstance.activate('testExperiment', 123));

          // valid user, experiment not running, whitelisted
          assert.isNull(optlyInstance.activate('testExperimentNotRunning', 'user1'));

          // valid user, experiment running, not whitelisted, does not meet audience conditions
          assert.isNull(optlyInstance.activate('testExperimentWithAudiences', 'user3'));

          // valid user, experiment running, not whitelisted, meets audience conditions
          assert.strictEqual(
            optlyInstance.activate('testExperimentWithAudiences', 'user3', { browser_type: 'firefox' }),
            'controlWithAudience'
          );

          // valid user, running experiment, whitelisted, does not meet audience conditions
          // expect user to be forced into `variationWithAudience` through whitelisting
          assert.strictEqual(
            optlyInstance.activate('testExperimentWithAudiences', 'user2', { browser_type: 'chrome' }),
            'variationWithAudience'
          );

          // valid user, running experiment, whitelisted, meets audience conditions
          // expect user to be forced into `variationWithAudience (122229)` through whitelisting
          assert.strictEqual(
            optlyInstance.activate('testExperimentWithAudiences', 'user2', { browser_type: 'firefox' }),
            'variationWithAudience'
          );
        });
      });
    });

    describe('#getForcedVariation', function() {
      it('should return null when set has not been called', function() {
        var forcedVariation = optlyInstance.getForcedVariation('testExperiment', 'user1');
        assert.strictEqual(forcedVariation, null);

        var logMessage = buildLogMessageFromArgs(createdLogger.log.args[0]);
        assert.strictEqual(logMessage, sprintf(LOG_MESSAGES.USER_HAS_NO_FORCED_VARIATION, 'DECISION_SERVICE', 'user1'));
      });

      it('should return null with a null experimentKey', function() {
        var forcedVariation = optlyInstance.getForcedVariation(null, 'user1');
        assert.strictEqual(forcedVariation, null);

        var logMessage = buildLogMessageFromArgs(createdLogger.log.args[0]);
        assert.strictEqual(logMessage, sprintf(ERROR_MESSAGES.INVALID_INPUT_FORMAT, 'OPTIMIZELY', 'experiment_key'));
      });

      it('should return null with an undefined experimentKey', function() {
        var forcedVariation = optlyInstance.getForcedVariation(undefined, 'user1');
        assert.strictEqual(forcedVariation, null);

        var logMessage = buildLogMessageFromArgs(createdLogger.log.args[0]);
        assert.strictEqual(logMessage, sprintf(ERROR_MESSAGES.INVALID_INPUT_FORMAT, 'OPTIMIZELY', 'experiment_key'));
      });

      it('should return null with a null userId', function() {
        var forcedVariation = optlyInstance.getForcedVariation('testExperiment', null);
        assert.strictEqual(forcedVariation, null);

        var logMessage = buildLogMessageFromArgs(createdLogger.log.args[0]);
        assert.strictEqual(logMessage, sprintf(ERROR_MESSAGES.INVALID_INPUT_FORMAT, 'OPTIMIZELY', 'user_id'));
      });

      it('should return null with an undefined userId', function() {
        var forcedVariation = optlyInstance.getForcedVariation('testExperiment', undefined);
        assert.strictEqual(forcedVariation, null);

        var logMessage = buildLogMessageFromArgs(createdLogger.log.args[0]);
        assert.strictEqual(logMessage, sprintf(ERROR_MESSAGES.INVALID_INPUT_FORMAT, 'OPTIMIZELY', 'user_id'));
      });
    });

    describe('#setForcedVariation', function() {
      it('should be able to set a forced variation', function() {
        var didSetVariation = optlyInstance.setForcedVariation('testExperiment', 'user1', 'control');
        assert.strictEqual(didSetVariation, true);

        var logMessage = buildLogMessageFromArgs(createdLogger.log.args[0]);
        assert.strictEqual(
          logMessage,
          sprintf(LOG_MESSAGES.USER_MAPPED_TO_FORCED_VARIATION, 'DECISION_SERVICE', 111128, 111127, 'user1')
        );
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

        var setVariationLogMessage = buildLogMessageFromArgs(createdLogger.log.args[0]);
        var variationIsMappedLogMessage = buildLogMessageFromArgs(createdLogger.log.args[1]);
        var variationMappingRemovedLogMessage = buildLogMessageFromArgs(createdLogger.log.args[2]);

        assert.strictEqual(
          setVariationLogMessage,
          sprintf(LOG_MESSAGES.USER_MAPPED_TO_FORCED_VARIATION, 'DECISION_SERVICE', 111128, 111127, 'user1')
        );

        assert.strictEqual(
          variationIsMappedLogMessage,
          sprintf(LOG_MESSAGES.USER_HAS_FORCED_VARIATION, 'DECISION_SERVICE', 'control', 'testExperiment', 'user1')
        );

        assert.strictEqual(
          variationMappingRemovedLogMessage,
          sprintf(LOG_MESSAGES.VARIATION_REMOVED_FOR_USER, 'DECISION_SERVICE', 'testExperiment', 'user1')
        );
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
        var didSetVariation = optlyInstance.setForcedVariation(
          'testExperiment',
          'user1',
          'definitely_not_valid_variation_key'
        );
        assert.strictEqual(didSetVariation, false);

        var logMessage = buildLogMessageFromArgs(createdLogger.log.args[0]);
        assert.strictEqual(
          logMessage,
          sprintf(
            ERROR_MESSAGES.NO_VARIATION_FOR_EXPERIMENT_KEY,
            'DECISION_SERVICE',
            'definitely_not_valid_variation_key',
            'testExperiment'
          )
        );
      });

      it('should not set an invalid experiment', function() {
        var didSetVariation = optlyInstance.setForcedVariation('definitely_not_valid_exp_key', 'user1', 'control');
        assert.strictEqual(didSetVariation, false);

        var logMessage = buildLogMessageFromArgs(createdLogger.log.args[0]);
        assert.strictEqual(
          logMessage,
          sprintf(ERROR_MESSAGES.EXPERIMENT_KEY_NOT_IN_DATAFILE, 'PROJECT_CONFIG', 'definitely_not_valid_exp_key')
        );
      });

      it('should return null for user has no forced variation for experiment', function() {
        var didSetVariation = optlyInstance.setForcedVariation('testExperiment', 'user1', 'control');
        assert.strictEqual(didSetVariation, true);

        var forcedVariation = optlyInstance.getForcedVariation('testExperimentLaunched', 'user1');
        assert.strictEqual(forcedVariation, null);

        var setVariationLogMessage = buildLogMessageFromArgs(createdLogger.log.args[0]);
        assert.strictEqual(
          setVariationLogMessage,
          sprintf(LOG_MESSAGES.USER_MAPPED_TO_FORCED_VARIATION, 'DECISION_SERVICE', 111128, 111127, 'user1')
        );

        var noVariationToGetLogMessage = buildLogMessageFromArgs(createdLogger.log.args[1]);
        assert.strictEqual(
          noVariationToGetLogMessage,
          sprintf(
            LOG_MESSAGES.USER_HAS_NO_FORCED_VARIATION_FOR_EXPERIMENT,
            'DECISION_SERVICE',
            'testExperimentLaunched',
            'user1'
          )
        );
      });

      it('should return false for a null experimentKey', function() {
        var didSetVariation = optlyInstance.setForcedVariation(null, 'user1', 'control');
        assert.strictEqual(didSetVariation, false);

        var setVariationLogMessage = buildLogMessageFromArgs(createdLogger.log.args[0]);
        assert.strictEqual(
          setVariationLogMessage,
          sprintf(ERROR_MESSAGES.INVALID_INPUT_FORMAT, 'OPTIMIZELY', 'experiment_key')
        );
      });

      it('should return false for an undefined experimentKey', function() {
        var didSetVariation = optlyInstance.setForcedVariation(undefined, 'user1', 'control');
        assert.strictEqual(didSetVariation, false);

        var setVariationLogMessage = buildLogMessageFromArgs(createdLogger.log.args[0]);
        assert.strictEqual(
          setVariationLogMessage,
          sprintf(ERROR_MESSAGES.INVALID_INPUT_FORMAT, 'OPTIMIZELY', 'experiment_key')
        );
      });

      it('should return false for an empty experimentKey', function() {
        var didSetVariation = optlyInstance.setForcedVariation('', 'user1', 'control');
        assert.strictEqual(didSetVariation, false);

        var setVariationLogMessage = buildLogMessageFromArgs(createdLogger.log.args[0]);
        assert.strictEqual(
          setVariationLogMessage,
          sprintf(ERROR_MESSAGES.INVALID_INPUT_FORMAT, 'OPTIMIZELY', 'experiment_key')
        );
      });

      it('should return false for a null userId', function() {
        var didSetVariation = optlyInstance.setForcedVariation('testExperiment', null, 'control');
        assert.strictEqual(didSetVariation, false);

        var setVariationLogMessage = buildLogMessageFromArgs(createdLogger.log.args[0]);
        assert.strictEqual(
          setVariationLogMessage,
          sprintf(ERROR_MESSAGES.INVALID_INPUT_FORMAT, 'OPTIMIZELY', 'user_id')
        );
      });

      it('should return false for an undefined userId', function() {
        var didSetVariation = optlyInstance.setForcedVariation('testExperiment', undefined, 'control');
        assert.strictEqual(didSetVariation, false);

        var setVariationLogMessage = buildLogMessageFromArgs(createdLogger.log.args[0]);
        assert.strictEqual(
          setVariationLogMessage,
          sprintf(ERROR_MESSAGES.INVALID_INPUT_FORMAT, 'OPTIMIZELY', 'user_id')
        );
      });

      it('should return true for an empty userId', function() {
        var didSetVariation = optlyInstance.setForcedVariation('testExperiment', '', 'control');
        assert.strictEqual(didSetVariation, true);
      });

      it('should return false for a null variationKey', function() {
        var didSetVariation = optlyInstance.setForcedVariation('testExperiment', 'user1', null);
        assert.strictEqual(didSetVariation, false);

        var setVariationLogMessage = buildLogMessageFromArgs(createdLogger.log.args[0]);
        assert.strictEqual(
          setVariationLogMessage,
          sprintf(ERROR_MESSAGES.USER_NOT_IN_FORCED_VARIATION, 'DECISION_SERVICE', 'user1')
        );
      });

      it('should return false for an undefined variationKey', function() {
        var didSetVariation = optlyInstance.setForcedVariation('testExperiment', 'user1', undefined);
        assert.strictEqual(didSetVariation, false);

        var setVariationLogMessage = buildLogMessageFromArgs(createdLogger.log.args[0]);
        assert.strictEqual(
          setVariationLogMessage,
          sprintf(ERROR_MESSAGES.USER_NOT_IN_FORCED_VARIATION, 'DECISION_SERVICE', 'user1')
        );
      });

      it('should not override check for not running experiments in getVariation', function() {
        var didSetVariation = optlyInstance.setForcedVariation(
          'testExperimentNotRunning',
          'user1',
          'controlNotRunning'
        );
        assert.strictEqual(didSetVariation, true);

        var variation = optlyInstance.getVariation('testExperimentNotRunning', 'user1', {});
        assert.strictEqual(variation, null);

        var logMessage0 = buildLogMessageFromArgs(createdLogger.log.args[0]);
        assert.strictEqual(
          logMessage0,
          sprintf(LOG_MESSAGES.USER_MAPPED_TO_FORCED_VARIATION, 'DECISION_SERVICE', 133338, 133337, 'user1')
        );

        var logMessage1 = buildLogMessageFromArgs(createdLogger.log.args[1]);
        assert.strictEqual(
          logMessage1,
          sprintf(LOG_MESSAGES.EXPERIMENT_NOT_RUNNING, 'DECISION_SERVICE', 'testExperimentNotRunning')
        );
      });
    });

    describe('validateInputs', function() {
      it('should return true if user ID and attributes are valid', function() {
        assert.isTrue(optlyInstance.validateInputs({ user_id: 'testUser' }));
        assert.isTrue(optlyInstance.validateInputs({ user_id: '' }));
        assert.isTrue(optlyInstance.validateInputs({ user_id: 'testUser' }, { browser_type: 'firefox' }));
        sinon.assert.notCalled(createdLogger.log);
      });

      it('should return false and throw an error if user ID is invalid', function() {
        var falseUserIdInput = optlyInstance.validateInputs({ user_id: [] });
        assert.isFalse(falseUserIdInput);

        falseUserIdInput = optlyInstance.validateInputs({ user_id: null });
        assert.isFalse(falseUserIdInput);

        falseUserIdInput = optlyInstance.validateInputs({ user_id: 3.14 });
        assert.isFalse(falseUserIdInput);

        sinon.assert.calledThrice(errorHandler.handleError);
        var errorMessage = errorHandler.handleError.lastCall.args[0].message;
        assert.strictEqual(errorMessage, sprintf(ERROR_MESSAGES.INVALID_INPUT_FORMAT, 'OPTIMIZELY', 'user_id'));

        sinon.assert.calledThrice(createdLogger.log);
        var logMessage = buildLogMessageFromArgs(createdLogger.log.args[0]);
        assert.strictEqual(logMessage, sprintf(ERROR_MESSAGES.INVALID_INPUT_FORMAT, 'OPTIMIZELY', 'user_id'));
      });

      it('should return false and throw an error if attributes are invalid', function() {
        var falseUserIdInput = optlyInstance.validateInputs({ user_id: 'testUser' }, []);
        assert.isFalse(falseUserIdInput);

        sinon.assert.calledOnce(errorHandler.handleError);
        var errorMessage = errorHandler.handleError.lastCall.args[0].message;
        assert.strictEqual(errorMessage, sprintf(ERROR_MESSAGES.INVALID_ATTRIBUTES, 'ATTRIBUTES_VALIDATOR'));

        sinon.assert.calledOnce(createdLogger.log);
        var logMessage = buildLogMessageFromArgs(createdLogger.log.args[0]);
        assert.strictEqual(logMessage, sprintf(ERROR_MESSAGES.INVALID_ATTRIBUTES, 'ATTRIBUTES_VALIDATOR'));
      });
    });

    describe('should filter out null values', function() {
      it('should filter out a null value', function() {
        var dict = { test: null };
        var filteredValue = optlyInstance.filterEmptyValues(dict);
        assert.deepEqual(filteredValue, {});
      });

      it('should filter out a undefined value', function() {
        var dict = { test: undefined };
        var filteredValue = optlyInstance.filterEmptyValues(dict);
        assert.deepEqual(filteredValue, {});
      });

      it('should filter out a null value, leave a non null one', function() {
        var dict = { test: null, test2: 'not_null' };
        var filteredValue = optlyInstance.filterEmptyValues(dict);
        assert.deepEqual(filteredValue, { test2: 'not_null' });
      });

      it('should not filter out a non empty value', function() {
        var dict = { test: 'hello' };
        var filteredValue = optlyInstance.filterEmptyValues(dict);
        assert.deepEqual(filteredValue, { test: 'hello' });
      });
    });

    describe('notification listeners', function() {
      var activateListener;
      var trackListener;
      var activateListener2;
      var trackListener2;

      beforeEach(function() {
        activateListener = sinon.spy();
        trackListener = sinon.spy();
        activateListener2 = sinon.spy();
        trackListener2 = sinon.spy();
        fakeDecisionResponse = {
          result: '111129',
          reasons: [],
        };
        bucketStub.returns(fakeDecisionResponse);
        sinon.stub(fns, 'currentTimestamp').returns(1509489766569);
      });

      afterEach(function() {
        fns.currentTimestamp.restore();
      });

      it('should call a listener added for activate when activate is called', function() {
        optlyInstance.notificationCenter.addNotificationListener(enums.NOTIFICATION_TYPES.ACTIVATE, activateListener);
        var variationKey = optlyInstance.activate('testExperiment', 'testUser');
        assert.strictEqual(variationKey, 'variation');
        sinon.assert.calledOnce(activateListener);
      });

      it('should call a listener added for track when track is called', function() {
        optlyInstance.notificationCenter.addNotificationListener(enums.NOTIFICATION_TYPES.TRACK, trackListener);
        optlyInstance.activate('testExperiment', 'testUser');
        optlyInstance.track('testEvent', 'testUser');
        sinon.assert.calledOnce(trackListener);
      });

      it('should not call a removed activate listener when activate is called', function() {
        var listenerId = optlyInstance.notificationCenter.addNotificationListener(
          enums.NOTIFICATION_TYPES.ACTIVATE,
          activateListener
        );
        optlyInstance.notificationCenter.removeNotificationListener(listenerId);
        var variationKey = optlyInstance.activate('testExperiment', 'testUser');
        assert.strictEqual(variationKey, 'variation');
        sinon.assert.notCalled(activateListener);
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
        optlyInstance.notificationCenter.addNotificationListener(enums.NOTIFICATION_TYPES.ACTIVATE, activateListener);
        var trackListenerId = optlyInstance.notificationCenter.addNotificationListener(
          enums.NOTIFICATION_TYPES.TRACK,
          trackListener
        );
        optlyInstance.notificationCenter.removeNotificationListener(trackListenerId);
        optlyInstance.activate('testExperiment', 'testUser');
        optlyInstance.track('testEvent', 'testUser');
        sinon.assert.calledOnce(activateListener);
      });

      it('should clear all notification listeners when clearAllNotificationListeners is called', function() {
        optlyInstance.notificationCenter.addNotificationListener(enums.NOTIFICATION_TYPES.ACTIVATE, activateListener);
        optlyInstance.notificationCenter.addNotificationListener(enums.NOTIFICATION_TYPES.TRACK, trackListener);
        optlyInstance.notificationCenter.clearAllNotificationListeners();
        optlyInstance.activate('testExperiment', 'testUser');
        optlyInstance.track('testEvent', 'testUser');

        sinon.assert.notCalled(activateListener);
        sinon.assert.notCalled(trackListener);
      });

      it('should clear listeners of certain notification type when clearNotificationListeners is called', function() {
        optlyInstance.notificationCenter.addNotificationListener(enums.NOTIFICATION_TYPES.ACTIVATE, activateListener);
        optlyInstance.notificationCenter.addNotificationListener(enums.NOTIFICATION_TYPES.TRACK, trackListener);
        optlyInstance.notificationCenter.clearNotificationListeners(enums.NOTIFICATION_TYPES.ACTIVATE);
        optlyInstance.activate('testExperiment', 'testUser');
        optlyInstance.track('testEvent', 'testUser');

        sinon.assert.notCalled(activateListener);
        sinon.assert.calledOnce(trackListener);
      });

      it('should only call the listener once after the same listener was added twice', function() {
        optlyInstance.notificationCenter.addNotificationListener(enums.NOTIFICATION_TYPES.ACTIVATE, activateListener);
        optlyInstance.notificationCenter.addNotificationListener(enums.NOTIFICATION_TYPES.ACTIVATE, activateListener);
        optlyInstance.activate('testExperiment', 'testUser');
        sinon.assert.calledOnce(activateListener);
      });

      it('should not add a listener with an invalid type argument', function() {
        var listenerId = optlyInstance.notificationCenter.addNotificationListener(
          'not a notification type',
          activateListener
        );
        assert.strictEqual(listenerId, -1);
        optlyInstance.activate('testExperiment', 'testUser');
        sinon.assert.notCalled(activateListener);
        optlyInstance.track('testEvent', 'testUser');
        sinon.assert.notCalled(activateListener);
      });

      it('should call multiple notification listeners for activate when activate is called', function() {
        optlyInstance.notificationCenter.addNotificationListener(enums.NOTIFICATION_TYPES.ACTIVATE, activateListener);
        optlyInstance.notificationCenter.addNotificationListener(enums.NOTIFICATION_TYPES.ACTIVATE, activateListener2);
        optlyInstance.activate('testExperiment', 'testUser');
        sinon.assert.calledOnce(activateListener);
        sinon.assert.calledOnce(activateListener2);
      });

      it('should call multiple notification listeners for track when track is called', function() {
        optlyInstance.notificationCenter.addNotificationListener(enums.NOTIFICATION_TYPES.TRACK, trackListener);
        optlyInstance.notificationCenter.addNotificationListener(enums.NOTIFICATION_TYPES.TRACK, trackListener2);
        optlyInstance.activate('testExperiment', 'testUser');
        optlyInstance.track('testEvent', 'testUser');
        sinon.assert.calledOnce(trackListener);
        sinon.assert.calledOnce(trackListener2);
      });

      it('should pass the correct arguments to an activate listener when activate is called', function() {
        optlyInstance.notificationCenter.addNotificationListener(enums.NOTIFICATION_TYPES.ACTIVATE, activateListener);
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
                        metadata: {
                          flag_key: '',
                          rule_key: "testExperiment",
                          rule_type: "experiment",
                          variation_key: "variation",
                          enabled: true,
                        },
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
            enrich_decisions: true,
          },
        };
        var instanceExperiments = optlyInstance.projectConfigManager.getConfig().experiments;
        var expectedArgument = {
          experiment: instanceExperiments[0],
          userId: 'testUser',
          attributes: undefined,
          variation: instanceExperiments[0].variations[1],
          logEvent: expectedImpressionEvent,
        };
        sinon.assert.calledWith(activateListener, expectedArgument);
      });

      it('should pass the correct arguments to an activate listener when activate is called with attributes', function() {
        var attributes = {
          browser_type: 'firefox',
        };
        optlyInstance.notificationCenter.addNotificationListener(enums.NOTIFICATION_TYPES.ACTIVATE, activateListener);
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
                        metadata: {
                          flag_key: '',
                          rule_key: "testExperiment",
                          rule_type: "experiment",
                          variation_key: "variation",
                          enabled: true,
                        },
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
            enrich_decisions: true,
          },
        };
        var instanceExperiments = optlyInstance.projectConfigManager.getConfig().experiments;
        var expectedArgument = {
          experiment: instanceExperiments[0],
          userId: 'testUser',
          attributes: attributes,
          variation: instanceExperiments[0].variations[1],
          logEvent: expectedImpressionEvent,
        };
        sinon.assert.calledWith(activateListener, expectedArgument);
      });

      it('should pass the correct arguments to a track listener when track is called', function() {
        optlyInstance.notificationCenter.addNotificationListener(enums.NOTIFICATION_TYPES.TRACK, trackListener);
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
            enrich_decisions: true,
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
        optlyInstance.notificationCenter.addNotificationListener(enums.NOTIFICATION_TYPES.TRACK, trackListener);
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
            enrich_decisions: true,
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
        optlyInstance.notificationCenter.addNotificationListener(enums.NOTIFICATION_TYPES.TRACK, trackListener);
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
            enrich_decisions: true,
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

      describe('Decision Listener', function() {
        var decisionListener;
        beforeEach(function() {
          decisionListener = sinon.spy();
        });

        describe('activate', function() {
          beforeEach(function() {
            optlyInstance = new Optimizely({
              clientEngine: 'node-sdk',
              datafile: testData.getTestProjectConfig(),
              errorHandler: errorHandler,
              eventDispatcher: eventDispatcher,
              jsonSchemaValidator: jsonSchemaValidator,
              logger: createdLogger,
              isValidInstance: true,
              eventProcessor,
              notificationCenter,
            });

            optlyInstance.notificationCenter.addNotificationListener(
              enums.NOTIFICATION_TYPES.DECISION,
              decisionListener
            );
          });

          it('should send notification with actual variation key when activate returns variation', function() {
            fakeDecisionResponse = {
              result: '111129',
              reasons: [],
            };
            bucketStub.returns(fakeDecisionResponse);
            var variation = optlyInstance.activate('testExperiment', 'testUser');
            assert.strictEqual(variation, 'variation');
            sinon.assert.calledWith(decisionListener, {
              type: DECISION_NOTIFICATION_TYPES.AB_TEST,
              userId: 'testUser',
              attributes: {},
              decisionInfo: {
                experimentKey: 'testExperiment',
                variationKey: variation,
              },
            });
          });

          it('should send notification with null variation key when activate returns null', function() {
            fakeDecisionResponse = {
              result: null,
              reasons: [],
            };
            bucketStub.returns(fakeDecisionResponse);
            var variation = optlyInstance.activate('testExperiment', 'testUser');
            assert.isNull(variation);
            sinon.assert.calledWith(decisionListener, {
              type: DECISION_NOTIFICATION_TYPES.AB_TEST,
              userId: 'testUser',
              attributes: {},
              decisionInfo: {
                experimentKey: 'testExperiment',
                variationKey: null,
              },
            });
          });
        });

        describe('getVariation', function() {
          beforeEach(function() {
            optlyInstance = new Optimizely({
              clientEngine: 'node-sdk',
              datafile: testData.getTestProjectConfig(),
              errorHandler: errorHandler,
              eventDispatcher: eventDispatcher,
              jsonSchemaValidator: jsonSchemaValidator,
              logger: createdLogger,
              isValidInstance: true,
              eventProcessor,
              notificationCenter,
            });

            optlyInstance.notificationCenter.addNotificationListener(
              enums.NOTIFICATION_TYPES.DECISION,
              decisionListener
            );
          });

          it('should send notification with actual variation key when getVariation returns variation', function() {
            fakeDecisionResponse = {
              result: '111129',
              reasons: [],
            };
            bucketStub.returns(fakeDecisionResponse);
            var variation = optlyInstance.getVariation('testExperiment', 'testUser');
            assert.strictEqual(variation, 'variation');
            sinon.assert.calledWith(decisionListener, {
              type: DECISION_NOTIFICATION_TYPES.AB_TEST,
              userId: 'testUser',
              attributes: {},
              decisionInfo: {
                experimentKey: 'testExperiment',
                variationKey: variation,
              },
            });
          });

          it('should send notification with null variation key when getVariation returns null', function() {
            var variation = optlyInstance.getVariation('testExperimentWithAudiences', 'testUser', {});
            assert.isNull(variation);
            sinon.assert.calledWith(decisionListener, {
              type: DECISION_NOTIFICATION_TYPES.AB_TEST,
              userId: 'testUser',
              attributes: {},
              decisionInfo: {
                experimentKey: 'testExperimentWithAudiences',
                variationKey: null,
              },
            });
          });

          it('should send notification with variation key and type feature-test when getVariation returns feature experiment variation', function() {
            var optly = new Optimizely({
              clientEngine: 'node-sdk',
              datafile: testData.getTestProjectConfigWithFeatures(),
              errorHandler: errorHandler,
              eventDispatcher: eventDispatcher,
              jsonSchemaValidator: jsonSchemaValidator,
              logger: createdLogger,
              isValidInstance: true,
              eventProcessor,
              notificationCenter,
            });

            optly.notificationCenter.addNotificationListener(enums.NOTIFICATION_TYPES.DECISION, decisionListener);

            fakeDecisionResponse = {
              result: '594099',
              reasons: [],
            };
            bucketStub.returns(fakeDecisionResponse);
            var variation = optly.getVariation('testing_my_feature', 'testUser');
            assert.strictEqual(variation, 'variation2');
            sinon.assert.calledWith(decisionListener, {
              type: DECISION_NOTIFICATION_TYPES.FEATURE_TEST,
              userId: 'testUser',
              attributes: {},
              decisionInfo: {
                experimentKey: 'testing_my_feature',
                variationKey: variation,
              },
            });
          });
        });

        describe('feature management', function() {
          var sandbox = sinon.sandbox.create();

          beforeEach(function() {
            optlyInstance = new Optimizely({
              clientEngine: 'node-sdk',
              datafile: testData.getTestProjectConfigWithFeatures(),
              errorHandler: errorHandler,
              jsonSchemaValidator: jsonSchemaValidator,
              logger: createdLogger,
              isValidInstance: true,
              eventDispatcher: eventDispatcher,
              eventProcessor,
              notificationCenter,
            });

            optlyInstance.notificationCenter.addNotificationListener(
              enums.NOTIFICATION_TYPES.DECISION,
              decisionListener
            );
          });

          afterEach(function() {
            sandbox.restore();
          });

          describe('isFeatureEnabled', function() {
            describe('when the user bucketed into a variation of an experiment of the feature', function() {
              var attributes = { test_attribute: 'test_value' };

              describe('when the variation is toggled ON', function() {
                beforeEach(function() {
                  var experiment = optlyInstance.projectConfigManager.getConfig().experimentKeyMap.testing_my_feature;
                  var variation = experiment.variations[0];
                  var decisionObj = {
                    experiment: experiment,
                    variation: variation,
                    decisionSource: DECISION_SOURCES.FEATURE_TEST,
                  };
                  fakeDecisionResponse = {
                    result: decisionObj,
                    reasons: [],
                  };
                  sandbox.stub(optlyInstance.decisionService, 'getVariationForFeature').returns(fakeDecisionResponse);
                });

                it('should return true and send notification', function() {
                  var result = optlyInstance.isFeatureEnabled('test_feature_for_experiment', 'user1', attributes);
                  assert.strictEqual(result, true);
                  sinon.assert.calledWith(decisionListener, {
                    type: DECISION_NOTIFICATION_TYPES.FEATURE,
                    userId: 'user1',
                    attributes: attributes,
                    decisionInfo: {
                      featureKey: 'test_feature_for_experiment',
                      featureEnabled: true,
                      source: DECISION_SOURCES.FEATURE_TEST,
                      sourceInfo: {
                        experimentKey: 'testing_my_feature',
                        variationKey: 'variation',
                      },
                    },
                  });
                });
              });

              describe('when the variation is toggled OFF', function() {
                beforeEach(function() {
                  var experiment = optlyInstance.projectConfigManager.getConfig().experimentKeyMap.test_shared_feature;
                  var variation = experiment.variations[1];
                  var decisionObj = {
                    experiment: experiment,
                    variation: variation,
                    decisionSource: DECISION_SOURCES.FEATURE_TEST,
                  };
                  fakeDecisionResponse = {
                    result: decisionObj,
                    reasons: [],
                  };
                  sandbox.stub(optlyInstance.decisionService, 'getVariationForFeature').returns(fakeDecisionResponse);
                });

                it('should return false and send notification', function() {
                  var result = optlyInstance.isFeatureEnabled('shared_feature', 'user1', attributes);
                  assert.strictEqual(result, false);
                  sinon.assert.calledWith(decisionListener, {
                    type: DECISION_NOTIFICATION_TYPES.FEATURE,
                    userId: 'user1',
                    attributes: attributes,
                    decisionInfo: {
                      featureKey: 'shared_feature',
                      featureEnabled: false,
                      source: DECISION_SOURCES.FEATURE_TEST,
                      sourceInfo: {
                        experimentKey: 'test_shared_feature',
                        variationKey: 'control',
                      },
                    },
                  });
                });
              });
            });

            describe('user bucketed into a variation of a rollout of the feature', function() {
              describe('when the variation is toggled ON', function() {
                beforeEach(function() {
                  // This experiment is the first audience targeting rule in the rollout of feature 'test_feature'
                  var experiment = optlyInstance.projectConfigManager.getConfig().experimentKeyMap['594031'];
                  var variation = experiment.variations[0];
                  var decisionObj = {
                    experiment: experiment,
                    variation: variation,
                    decisionSource: DECISION_SOURCES.ROLLOUT,
                  };
                  fakeDecisionResponse = {
                    result: decisionObj,
                    reasons: [],
                  };
                  sandbox.stub(optlyInstance.decisionService, 'getVariationForFeature').returns(fakeDecisionResponse);
                });

                it('should return true and send notification', function() {
                  var result = optlyInstance.isFeatureEnabled('test_feature', 'user1', {
                    test_attribute: 'test_value',
                  });
                  assert.strictEqual(result, true);
                  sinon.assert.calledWith(decisionListener, {
                    type: DECISION_NOTIFICATION_TYPES.FEATURE,
                    userId: 'user1',
                    attributes: { test_attribute: 'test_value' },
                    decisionInfo: {
                      featureKey: 'test_feature',
                      featureEnabled: true,
                      source: DECISION_SOURCES.ROLLOUT,
                      sourceInfo: {},
                    },
                  });
                });
              });

              describe('when the variation is toggled OFF', function() {
                beforeEach(function() {
                  // This experiment is the second audience targeting rule in the rollout of feature 'test_feature'
                  var experiment = optlyInstance.projectConfigManager.getConfig().experimentKeyMap['594037'];
                  var variation = experiment.variations[0];
                  var decisionObj = {
                    experiment: experiment,
                    variation: variation,
                    decisionSource: DECISION_SOURCES.ROLLOUT,
                  };
                  fakeDecisionResponse = {
                    result: decisionObj,
                    reasons: [],
                  };
                  sandbox.stub(optlyInstance.decisionService, 'getVariationForFeature').returns(fakeDecisionResponse);
                });

                it('should return false and send notification', function() {
                  var result = optlyInstance.isFeatureEnabled('test_feature', 'user1', {
                    test_attribute: 'test_value',
                  });
                  assert.strictEqual(result, false);
                  sinon.assert.calledWith(
                    createdLogger.log,
                    LOG_LEVEL.INFO,
                    '%s: Feature %s is not enabled for user %s.',
                    'OPTIMIZELY', 'test_feature', 'user1'
                  );

                  var expectedArguments = {
                    type: DECISION_NOTIFICATION_TYPES.FEATURE,
                    userId: 'user1',
                    attributes: { test_attribute: 'test_value' },
                    decisionInfo: {
                      featureKey: 'test_feature',
                      featureEnabled: false,
                      source: DECISION_SOURCES.ROLLOUT,
                      sourceInfo: {},
                    },
                  };
                  sinon.assert.calledWith(decisionListener, expectedArguments);
                });
              });
            });

            describe('user not bucketed into an experiment or a rollout', function() {
              beforeEach(function() {
                var decisionObj = {
                  experiment: null,
                  variation: null,
                  decisionSource: DECISION_SOURCES.ROLLOUT,
                };
                fakeDecisionResponse = {
                  result: decisionObj,
                  reasons: [],
                };
                sandbox.stub(optlyInstance.decisionService, 'getVariationForFeature').returns(fakeDecisionResponse);
              });

              it('should return false and send notification', function() {
                var result = optlyInstance.isFeatureEnabled('test_feature', 'user1');
                assert.strictEqual(result, false);
                sinon.assert.calledWith(decisionListener, {
                  type: DECISION_NOTIFICATION_TYPES.FEATURE,
                  userId: 'user1',
                  attributes: {},
                  decisionInfo: {
                    featureKey: 'test_feature',
                    featureEnabled: false,
                    source: DECISION_SOURCES.ROLLOUT,
                    sourceInfo: {},
                  },
                });
              });
            });
          });

          describe('feature variable APIs', function() {
            describe('bucketed into variation of an experiment with variable values', function() {
              describe('when the variation is toggled ON', function() {
                beforeEach(function() {
                  var experiment = projectConfig.getExperimentFromKey(
                    optlyInstance.projectConfigManager.getConfig(),
                    'testing_my_feature'
                  );
                  var variation = experiment.variations[0];
                  var decisionObj = {
                    experiment: experiment,
                    variation: variation,
                    decisionSource: DECISION_SOURCES.FEATURE_TEST,
                  };
                  fakeDecisionResponse = {
                    result: decisionObj,
                    reasons: [],
                  };
                  sandbox.stub(optlyInstance.decisionService, 'getVariationForFeature').returns(fakeDecisionResponse);
                });

                it('returns the right value from getFeatureVariable when variable type is boolean and send notification with featureEnabled true', function() {
                  var result = optlyInstance.getFeatureVariable(
                    'test_feature_for_experiment',
                    'is_button_animated',
                    'user1',
                    { test_attribute: 'test_value' }
                  );
                  assert.strictEqual(result, true);
                  sinon.assert.calledWith(decisionListener, {
                    type: DECISION_NOTIFICATION_TYPES.FEATURE_VARIABLE,
                    userId: 'user1',
                    attributes: { test_attribute: 'test_value' },
                    decisionInfo: {
                      featureKey: 'test_feature_for_experiment',
                      featureEnabled: true,
                      variableKey: 'is_button_animated',
                      variableValue: true,
                      variableType: FEATURE_VARIABLE_TYPES.BOOLEAN,
                      source: DECISION_SOURCES.FEATURE_TEST,
                      sourceInfo: {
                        experimentKey: 'testing_my_feature',
                        variationKey: 'variation',
                      },
                    },
                  });
                });

                it('returns the right value from getFeatureVariable when variable type is double and send notification with featureEnabled true', function() {
                  var result = optlyInstance.getFeatureVariable(
                    'test_feature_for_experiment',
                    'button_width',
                    'user1',
                    { test_attribute: 'test_value' }
                  );
                  assert.strictEqual(result, 20.25);
                  sinon.assert.calledWith(decisionListener, {
                    type: DECISION_NOTIFICATION_TYPES.FEATURE_VARIABLE,
                    userId: 'user1',
                    attributes: { test_attribute: 'test_value' },
                    decisionInfo: {
                      featureKey: 'test_feature_for_experiment',
                      featureEnabled: true,
                      variableKey: 'button_width',
                      variableValue: 20.25,
                      variableType: FEATURE_VARIABLE_TYPES.DOUBLE,
                      source: DECISION_SOURCES.FEATURE_TEST,
                      sourceInfo: {
                        experimentKey: 'testing_my_feature',
                        variationKey: 'variation',
                      },
                    },
                  });
                });

                it('returns the right value from getFeatureVariable when variable type is integer and send notification with featureEnabled true', function() {
                  var result = optlyInstance.getFeatureVariable('test_feature_for_experiment', 'num_buttons', 'user1', {
                    test_attribute: 'test_value',
                  });
                  assert.strictEqual(result, 2);
                  sinon.assert.calledWith(decisionListener, {
                    type: DECISION_NOTIFICATION_TYPES.FEATURE_VARIABLE,
                    userId: 'user1',
                    attributes: { test_attribute: 'test_value' },
                    decisionInfo: {
                      featureKey: 'test_feature_for_experiment',
                      featureEnabled: true,
                      variableKey: 'num_buttons',
                      variableValue: 2,
                      variableType: FEATURE_VARIABLE_TYPES.INTEGER,
                      source: DECISION_SOURCES.FEATURE_TEST,
                      sourceInfo: {
                        experimentKey: 'testing_my_feature',
                        variationKey: 'variation',
                      },
                    },
                  });
                });

                it('returns the right value from getFeatureVariable when variable type is string and send notification with featureEnabled true', function() {
                  var result = optlyInstance.getFeatureVariable('test_feature_for_experiment', 'button_txt', 'user1', {
                    test_attribute: 'test_value',
                  });
                  assert.strictEqual(result, 'Buy me NOW');
                  sinon.assert.calledWith(decisionListener, {
                    type: DECISION_NOTIFICATION_TYPES.FEATURE_VARIABLE,
                    userId: 'user1',
                    attributes: { test_attribute: 'test_value' },
                    decisionInfo: {
                      featureKey: 'test_feature_for_experiment',
                      featureEnabled: true,
                      variableKey: 'button_txt',
                      variableValue: 'Buy me NOW',
                      variableType: FEATURE_VARIABLE_TYPES.STRING,
                      source: DECISION_SOURCES.FEATURE_TEST,
                      sourceInfo: {
                        experimentKey: 'testing_my_feature',
                        variationKey: 'variation',
                      },
                    },
                  });
                });

                it('returns the right value from getFeatureVariable when variable type is json and send notification with featureEnabled true', function() {
                  var result = optlyInstance.getFeatureVariable('test_feature_for_experiment', 'button_info', 'user1', {
                    test_attribute: 'test_value',
                  });
                  assert.deepEqual(result, {
                    num_buttons: 1,
                    text: 'first variation',
                  });
                  sinon.assert.calledWith(decisionListener, {
                    type: DECISION_NOTIFICATION_TYPES.FEATURE_VARIABLE,
                    userId: 'user1',
                    attributes: { test_attribute: 'test_value' },
                    decisionInfo: {
                      featureKey: 'test_feature_for_experiment',
                      featureEnabled: true,
                      variableKey: 'button_info',
                      variableValue: {
                        num_buttons: 1,
                        text: "first variation",
                      },
                      variableType: FEATURE_VARIABLE_TYPES.JSON,
                      source: DECISION_SOURCES.FEATURE_TEST,
                      sourceInfo: {
                        experimentKey: 'testing_my_feature',
                        variationKey: 'variation',
                      },
                    },
                  });
                });

                it('returns the right value from getFeatureVariableBoolean and send notification with featureEnabled true', function() {
                  var result = optlyInstance.getFeatureVariableBoolean(
                    'test_feature_for_experiment',
                    'is_button_animated',
                    'user1',
                    { test_attribute: 'test_value' }
                  );
                  assert.strictEqual(result, true);
                  sinon.assert.calledWith(decisionListener, {
                    type: DECISION_NOTIFICATION_TYPES.FEATURE_VARIABLE,
                    userId: 'user1',
                    attributes: { test_attribute: 'test_value' },
                    decisionInfo: {
                      featureKey: 'test_feature_for_experiment',
                      featureEnabled: true,
                      variableKey: 'is_button_animated',
                      variableValue: true,
                      variableType: FEATURE_VARIABLE_TYPES.BOOLEAN,
                      source: DECISION_SOURCES.FEATURE_TEST,
                      sourceInfo: {
                        experimentKey: 'testing_my_feature',
                        variationKey: 'variation',
                      },
                    },
                  });
                });

                it('returns the right value from getFeatureVariableDouble and send notification with featureEnabled true', function() {
                  var result = optlyInstance.getFeatureVariableDouble(
                    'test_feature_for_experiment',
                    'button_width',
                    'user1',
                    { test_attribute: 'test_value' }
                  );
                  assert.strictEqual(result, 20.25);
                  sinon.assert.calledWith(decisionListener, {
                    type: DECISION_NOTIFICATION_TYPES.FEATURE_VARIABLE,
                    userId: 'user1',
                    attributes: { test_attribute: 'test_value' },
                    decisionInfo: {
                      featureKey: 'test_feature_for_experiment',
                      featureEnabled: true,
                      variableKey: 'button_width',
                      variableValue: 20.25,
                      variableType: FEATURE_VARIABLE_TYPES.DOUBLE,
                      source: DECISION_SOURCES.FEATURE_TEST,
                      sourceInfo: {
                        experimentKey: 'testing_my_feature',
                        variationKey: 'variation',
                      },
                    },
                  });
                });

                it('returns the right value from getFeatureVariableInteger and send notification with featureEnabled true', function() {
                  var result = optlyInstance.getFeatureVariableInteger(
                    'test_feature_for_experiment',
                    'num_buttons',
                    'user1',
                    { test_attribute: 'test_value' }
                  );
                  assert.strictEqual(result, 2);
                  sinon.assert.calledWith(decisionListener, {
                    type: DECISION_NOTIFICATION_TYPES.FEATURE_VARIABLE,
                    userId: 'user1',
                    attributes: { test_attribute: 'test_value' },
                    decisionInfo: {
                      featureKey: 'test_feature_for_experiment',
                      featureEnabled: true,
                      variableKey: 'num_buttons',
                      variableValue: 2,
                      variableType: FEATURE_VARIABLE_TYPES.INTEGER,
                      source: DECISION_SOURCES.FEATURE_TEST,
                      sourceInfo: {
                        experimentKey: 'testing_my_feature',
                        variationKey: 'variation',
                      },
                    },
                  });
                });

                it('returns the right value from getFeatureVariableString and send notification with featureEnabled true', function() {
                  var result = optlyInstance.getFeatureVariableString(
                    'test_feature_for_experiment',
                    'button_txt',
                    'user1',
                    { test_attribute: 'test_value' }
                  );
                  assert.strictEqual(result, 'Buy me NOW');
                  sinon.assert.calledWith(decisionListener, {
                    type: DECISION_NOTIFICATION_TYPES.FEATURE_VARIABLE,
                    userId: 'user1',
                    attributes: { test_attribute: 'test_value' },
                    decisionInfo: {
                      featureKey: 'test_feature_for_experiment',
                      featureEnabled: true,
                      variableKey: 'button_txt',
                      variableValue: 'Buy me NOW',
                      variableType: FEATURE_VARIABLE_TYPES.STRING,
                      source: DECISION_SOURCES.FEATURE_TEST,
                      sourceInfo: {
                        experimentKey: 'testing_my_feature',
                        variationKey: 'variation',
                      },
                    },
                  });
                });

                it('returns the right value from getFeatureVariableJSON and send notification with featureEnabled true', function() {
                  var result = optlyInstance.getFeatureVariableJSON(
                    'test_feature_for_experiment',
                    'button_info',
                    'user1',
                    { test_attribute: 'test_value' }
                  );
                  assert.deepEqual(result, {
                    num_buttons: 1,
                    text: 'first variation',
                  });
                  sinon.assert.calledWith(decisionListener, {
                    type: DECISION_NOTIFICATION_TYPES.FEATURE_VARIABLE,
                    userId: 'user1',
                    attributes: { test_attribute: 'test_value' },
                    decisionInfo: {
                      featureKey: 'test_feature_for_experiment',
                      featureEnabled: true,
                      variableKey: 'button_info',
                      variableValue: {
                        num_buttons: 1,
                        text: 'first variation',
                      },
                      variableType: FEATURE_VARIABLE_TYPES.JSON,
                      source: DECISION_SOURCES.FEATURE_TEST,
                      sourceInfo: {
                        experimentKey: 'testing_my_feature',
                        variationKey: 'variation',
                      },
                    },
                  });
                });

                it('returns the right value from getAllFeatureVariables and send notification with featureEnabled true', function() {
                  var result = optlyInstance.getAllFeatureVariables(
                    'test_feature_for_experiment',
                    'user1',
                    { test_attribute: 'test_value' }
                  );
                  assert.deepEqual(result, {
                    is_button_animated: true,
                    button_width: 20.25,
                    num_buttons: 2,
                    button_txt: 'Buy me NOW',
                    button_info: {
                      num_buttons: 1,
                      text: 'first variation',
                    },
                  });
                  sinon.assert.calledWith(decisionListener, {
                    type: DECISION_NOTIFICATION_TYPES.ALL_FEATURE_VARIABLES,
                    userId: 'user1',
                    attributes: { test_attribute: 'test_value' },
                    decisionInfo: {
                      featureKey: 'test_feature_for_experiment',
                      featureEnabled: true,
                      variableValues: {
                        is_button_animated: true,
                        button_width: 20.25,
                        num_buttons: 2,
                        button_txt: 'Buy me NOW',
                        button_info: {
                          num_buttons: 1,
                          text: 'first variation',
                        },
                      },
                      source: DECISION_SOURCES.FEATURE_TEST,
                      sourceInfo: {
                        experimentKey: 'testing_my_feature',
                        variationKey: 'variation',
                      },
                    },
                  });
                });
              });

              describe('when the variation is toggled OFF', function() {
                beforeEach(function() {
                  var experiment = projectConfig.getExperimentFromKey(
                    optlyInstance.projectConfigManager.getConfig(),
                    'testing_my_feature'
                  );
                  var variation = experiment.variations[2];
                  var decisionObj = {
                    experiment: experiment,
                    variation: variation,
                    decisionSource: DECISION_SOURCES.FEATURE_TEST,
                  };
                  fakeDecisionResponse = {
                    result: decisionObj,
                    reasons: [],
                  };
                  sandbox.stub(optlyInstance.decisionService, 'getVariationForFeature').returns(fakeDecisionResponse);
                });

                it('returns the default value from getFeatureVariableBoolean and send notification with featureEnabled false', function() {
                  var result = optlyInstance.getFeatureVariableBoolean(
                    'test_feature_for_experiment',
                    'is_button_animated',
                    'user1',
                    { test_attribute: 'test_value' }
                  );
                  assert.strictEqual(result, false);
                  sinon.assert.calledWith(decisionListener, {
                    type: DECISION_NOTIFICATION_TYPES.FEATURE_VARIABLE,
                    userId: 'user1',
                    attributes: { test_attribute: 'test_value' },
                    decisionInfo: {
                      featureKey: 'test_feature_for_experiment',
                      featureEnabled: false,
                      variableKey: 'is_button_animated',
                      variableValue: false,
                      variableType: FEATURE_VARIABLE_TYPES.BOOLEAN,
                      source: DECISION_SOURCES.FEATURE_TEST,
                      sourceInfo: {
                        experimentKey: 'testing_my_feature',
                        variationKey: 'variation2',
                      },
                    },
                  });
                });

                it('returns the default value from getFeatureVariableDouble and send notification with featureEnabled false', function() {
                  var result = optlyInstance.getFeatureVariableDouble(
                    'test_feature_for_experiment',
                    'button_width',
                    'user1',
                    { test_attribute: 'test_value' }
                  );
                  assert.strictEqual(result, 50.55);
                  sinon.assert.calledWith(decisionListener, {
                    type: DECISION_NOTIFICATION_TYPES.FEATURE_VARIABLE,
                    userId: 'user1',
                    attributes: { test_attribute: 'test_value' },
                    decisionInfo: {
                      featureKey: 'test_feature_for_experiment',
                      featureEnabled: false,
                      variableKey: 'button_width',
                      variableValue: 50.55,
                      variableType: FEATURE_VARIABLE_TYPES.DOUBLE,
                      source: DECISION_SOURCES.FEATURE_TEST,
                      sourceInfo: {
                        experimentKey: 'testing_my_feature',
                        variationKey: 'variation2',
                      },
                    },
                  });
                });

                it('returns the default value from getFeatureVariableInteger and send notification with featureEnabled false', function() {
                  var result = optlyInstance.getFeatureVariableInteger(
                    'test_feature_for_experiment',
                    'num_buttons',
                    'user1',
                    { test_attribute: 'test_value' }
                  );
                  assert.strictEqual(result, 10);
                  sinon.assert.calledWith(decisionListener, {
                    type: DECISION_NOTIFICATION_TYPES.FEATURE_VARIABLE,
                    userId: 'user1',
                    attributes: { test_attribute: 'test_value' },
                    decisionInfo: {
                      featureKey: 'test_feature_for_experiment',
                      featureEnabled: false,
                      variableKey: 'num_buttons',
                      variableValue: 10,
                      variableType: FEATURE_VARIABLE_TYPES.INTEGER,
                      source: DECISION_SOURCES.FEATURE_TEST,
                      sourceInfo: {
                        experimentKey: 'testing_my_feature',
                        variationKey: 'variation2',
                      },
                    },
                  });
                });

                it('returns the default value from getFeatureVariableString and send notification with featureEnabled false', function() {
                  var result = optlyInstance.getFeatureVariableString(
                    'test_feature_for_experiment',
                    'button_txt',
                    'user1',
                    { test_attribute: 'test_value' }
                  );
                  assert.strictEqual(result, 'Buy me');
                  sinon.assert.calledWith(decisionListener, {
                    type: DECISION_NOTIFICATION_TYPES.FEATURE_VARIABLE,
                    userId: 'user1',
                    attributes: { test_attribute: 'test_value' },
                    decisionInfo: {
                      featureKey: 'test_feature_for_experiment',
                      featureEnabled: false,
                      variableKey: 'button_txt',
                      variableValue: 'Buy me',
                      variableType: FEATURE_VARIABLE_TYPES.STRING,
                      source: DECISION_SOURCES.FEATURE_TEST,
                      sourceInfo: {
                        experimentKey: 'testing_my_feature',
                        variationKey: 'variation2',
                      },
                    },
                  });
                });

                it('returns the default value from getFeatureVariableJSON and send notification with featureEnabled false', function() {
                  var result = optlyInstance.getFeatureVariableJSON(
                    'test_feature_for_experiment',
                    'button_info',
                    'user1',
                    { test_attribute: 'test_value' }
                  );
                  assert.deepEqual(result, {
                    num_buttons: 0,
                    text: 'default value',
                  });
                  sinon.assert.calledWith(decisionListener, {
                    type: DECISION_NOTIFICATION_TYPES.FEATURE_VARIABLE,
                    userId: 'user1',
                    attributes: { test_attribute: 'test_value' },
                    decisionInfo: {
                      featureKey: 'test_feature_for_experiment',
                      featureEnabled: false,
                      variableKey: 'button_info',
                      variableValue: {
                        num_buttons: 0,
                        text: 'default value',
                      },
                      variableType: FEATURE_VARIABLE_TYPES.JSON,
                      source: DECISION_SOURCES.FEATURE_TEST,
                      sourceInfo: {
                        experimentKey: 'testing_my_feature',
                        variationKey: 'variation2',
                      },
                    },
                  });
                });

                it('returns the right value from getAllFeatureVariables and send notification with featureEnabled false', function() {
                  var result = optlyInstance.getAllFeatureVariables(
                    'test_feature_for_experiment',
                    'user1',
                    { test_attribute: 'test_value' }
                  );
                  assert.deepEqual(result, {
                    is_button_animated: false,
                    button_width: 50.55,
                    num_buttons: 10,
                    button_txt: 'Buy me',
                    button_info: {
                      num_buttons: 0,
                      text: 'default value',
                    },
                  });
                  sinon.assert.calledWith(decisionListener, {
                    type: DECISION_NOTIFICATION_TYPES.ALL_FEATURE_VARIABLES,
                    userId: 'user1',
                    attributes: { test_attribute: 'test_value' },
                    decisionInfo: {
                      featureKey: 'test_feature_for_experiment',
                      featureEnabled: false,
                      variableValues: {
                        is_button_animated: false,
                        button_width: 50.55,
                        num_buttons: 10,
                        button_txt: 'Buy me',
                        button_info: {
                          num_buttons: 0,
                          text: 'default value',
                        },
                      },
                      source: DECISION_SOURCES.FEATURE_TEST,
                      sourceInfo: {
                        experimentKey: 'testing_my_feature',
                        variationKey: 'variation2',
                      },
                    },
                  });
                });
              });
            });

            describe('bucketed into variation of a rollout with variable values', function() {
              describe('when the variation is toggled ON', function() {
                beforeEach(function() {
                  var experiment = projectConfig.getExperimentFromKey(
                    optlyInstance.projectConfigManager.getConfig(),
                    '594031'
                  );
                  var variation = experiment.variations[0];
                  var decisionObj = {
                    experiment: experiment,
                    variation: variation,
                    decisionSource: DECISION_SOURCES.ROLLOUT,
                  };
                  fakeDecisionResponse = {
                    result: decisionObj,
                    reasons: [],
                  };
                  sandbox.stub(optlyInstance.decisionService, 'getVariationForFeature').returns(fakeDecisionResponse);
                });

                it('should return the right value from getFeatureVariable when variable type is boolean and send notification with featureEnabled true', function() {
                  var result = optlyInstance.getFeatureVariable('test_feature', 'new_content', 'user1', {
                    test_attribute: 'test_value',
                  });
                  assert.strictEqual(result, true);
                  sinon.assert.calledWith(decisionListener, {
                    type: DECISION_NOTIFICATION_TYPES.FEATURE_VARIABLE,
                    userId: 'user1',
                    attributes: { test_attribute: 'test_value' },
                    decisionInfo: {
                      featureKey: 'test_feature',
                      featureEnabled: true,
                      variableKey: 'new_content',
                      variableValue: true,
                      variableType: FEATURE_VARIABLE_TYPES.BOOLEAN,
                      source: DECISION_SOURCES.ROLLOUT,
                      sourceInfo: {},
                    },
                  });
                });

                it('should return the right value from getFeatureVariable when variable type is double and send notification with featureEnabled true', function() {
                  var result = optlyInstance.getFeatureVariable('test_feature', 'price', 'user1', {
                    test_attribute: 'test_value',
                  });
                  assert.strictEqual(result, 4.99);
                  sinon.assert.calledWith(decisionListener, {
                    type: DECISION_NOTIFICATION_TYPES.FEATURE_VARIABLE,
                    userId: 'user1',
                    attributes: { test_attribute: 'test_value' },
                    decisionInfo: {
                      featureKey: 'test_feature',
                      featureEnabled: true,
                      variableKey: 'price',
                      variableValue: 4.99,
                      variableType: FEATURE_VARIABLE_TYPES.DOUBLE,
                      source: DECISION_SOURCES.ROLLOUT,
                      sourceInfo: {},
                    },
                  });
                });

                it('should return the right value from getFeatureVariable when variable type is integer and send notification with featureEnabled true', function() {
                  var result = optlyInstance.getFeatureVariable('test_feature', 'lasers', 'user1', {
                    test_attribute: 'test_value',
                  });
                  assert.strictEqual(result, 395);
                  sinon.assert.calledWith(decisionListener, {
                    type: DECISION_NOTIFICATION_TYPES.FEATURE_VARIABLE,
                    userId: 'user1',
                    attributes: { test_attribute: 'test_value' },
                    decisionInfo: {
                      featureKey: 'test_feature',
                      featureEnabled: true,
                      variableKey: 'lasers',
                      variableValue: 395,
                      variableType: FEATURE_VARIABLE_TYPES.INTEGER,
                      source: DECISION_SOURCES.ROLLOUT,
                      sourceInfo: {},
                    },
                  });
                });

                it('should return the right value from getFeatureVariable when variable type is string and send notification with featureEnabled true', function() {
                  var result = optlyInstance.getFeatureVariable('test_feature', 'message', 'user1', {
                    test_attribute: 'test_value',
                  });
                  assert.strictEqual(result, 'Hello audience');
                  sinon.assert.calledWith(decisionListener, {
                    type: DECISION_NOTIFICATION_TYPES.FEATURE_VARIABLE,
                    userId: 'user1',
                    attributes: { test_attribute: 'test_value' },
                    decisionInfo: {
                      featureKey: 'test_feature',
                      featureEnabled: true,
                      variableKey: 'message',
                      variableValue: 'Hello audience',
                      variableType: FEATURE_VARIABLE_TYPES.STRING,
                      source: DECISION_SOURCES.ROLLOUT,
                      sourceInfo: {},
                    },
                  });
                });

                it('should return the right value from getFeatureVariable when variable type is json and send notification with featureEnabled true', function() {
                  var result = optlyInstance.getFeatureVariable('test_feature', 'message_info', 'user1', {
                    test_attribute: 'test_value',
                  });
                  assert.deepEqual(result, {
                    count: 2,
                    message: 'Hello audience',
                  });
                  sinon.assert.calledWith(decisionListener, {
                    type: DECISION_NOTIFICATION_TYPES.FEATURE_VARIABLE,
                    userId: 'user1',
                    attributes: { test_attribute: 'test_value' },
                    decisionInfo: {
                      featureKey: 'test_feature',
                      featureEnabled: true,
                      variableKey: 'message_info',
                      variableValue: {
                        count: 2,
                        message: 'Hello audience',
                      },
                      variableType: FEATURE_VARIABLE_TYPES.JSON,
                      source: DECISION_SOURCES.ROLLOUT,
                      sourceInfo: {},
                    },
                  });
                });

                it('should return the right value from getFeatureVariableBoolean and send notification with featureEnabled true', function() {
                  var result = optlyInstance.getFeatureVariableBoolean('test_feature', 'new_content', 'user1', {
                    test_attribute: 'test_value',
                  });
                  assert.strictEqual(result, true);
                  sinon.assert.calledWith(decisionListener, {
                    type: DECISION_NOTIFICATION_TYPES.FEATURE_VARIABLE,
                    userId: 'user1',
                    attributes: { test_attribute: 'test_value' },
                    decisionInfo: {
                      featureKey: 'test_feature',
                      featureEnabled: true,
                      variableKey: 'new_content',
                      variableValue: true,
                      variableType: FEATURE_VARIABLE_TYPES.BOOLEAN,
                      source: DECISION_SOURCES.ROLLOUT,
                      sourceInfo: {},
                    },
                  });
                });

                it('should return the right value from getFeatureVariableDouble and send notification with featureEnabled true', function() {
                  var result = optlyInstance.getFeatureVariableDouble('test_feature', 'price', 'user1', {
                    test_attribute: 'test_value',
                  });
                  assert.strictEqual(result, 4.99);
                  sinon.assert.calledWith(decisionListener, {
                    type: DECISION_NOTIFICATION_TYPES.FEATURE_VARIABLE,
                    userId: 'user1',
                    attributes: { test_attribute: 'test_value' },
                    decisionInfo: {
                      featureKey: 'test_feature',
                      featureEnabled: true,
                      variableKey: 'price',
                      variableValue: 4.99,
                      variableType: FEATURE_VARIABLE_TYPES.DOUBLE,
                      source: DECISION_SOURCES.ROLLOUT,
                      sourceInfo: {},
                    },
                  });
                });

                it('should return the right value from getFeatureVariableInteger and send notification with featureEnabled true', function() {
                  var result = optlyInstance.getFeatureVariableInteger('test_feature', 'lasers', 'user1', {
                    test_attribute: 'test_value',
                  });
                  assert.strictEqual(result, 395);
                  sinon.assert.calledWith(decisionListener, {
                    type: DECISION_NOTIFICATION_TYPES.FEATURE_VARIABLE,
                    userId: 'user1',
                    attributes: { test_attribute: 'test_value' },
                    decisionInfo: {
                      featureKey: 'test_feature',
                      featureEnabled: true,
                      variableKey: 'lasers',
                      variableValue: 395,
                      variableType: FEATURE_VARIABLE_TYPES.INTEGER,
                      source: DECISION_SOURCES.ROLLOUT,
                      sourceInfo: {},
                    },
                  });
                });

                it('should return the right value from getFeatureVariableString and send notification with featureEnabled true', function() {
                  var result = optlyInstance.getFeatureVariableString('test_feature', 'message', 'user1', {
                    test_attribute: 'test_value',
                  });
                  assert.strictEqual(result, 'Hello audience');
                  sinon.assert.calledWith(decisionListener, {
                    type: DECISION_NOTIFICATION_TYPES.FEATURE_VARIABLE,
                    userId: 'user1',
                    attributes: { test_attribute: 'test_value' },
                    decisionInfo: {
                      featureKey: 'test_feature',
                      featureEnabled: true,
                      variableKey: 'message',
                      variableValue: 'Hello audience',
                      variableType: FEATURE_VARIABLE_TYPES.STRING,
                      source: DECISION_SOURCES.ROLLOUT,
                      sourceInfo: {},
                    },
                  });
                });

                it('should return the right value from getFeatureVariableJSON and send notification with featureEnabled true', function() {
                  var result = optlyInstance.getFeatureVariableJSON('test_feature', 'message_info', 'user1', {
                    test_attribute: 'test_value',
                  });
                  assert.deepEqual(result, {
                    count: 2,
                    message: 'Hello audience',
                  });
                  sinon.assert.calledWith(decisionListener, {
                    type: DECISION_NOTIFICATION_TYPES.FEATURE_VARIABLE,
                    userId: 'user1',
                    attributes: { test_attribute: 'test_value' },
                    decisionInfo: {
                      featureKey: 'test_feature',
                      featureEnabled: true,
                      variableKey: 'message_info',
                      variableValue: {
                        count: 2,
                        message: 'Hello audience',
                      },
                      variableType: FEATURE_VARIABLE_TYPES.JSON,
                      source: DECISION_SOURCES.ROLLOUT,
                      sourceInfo: {},
                    },
                  });
                });

                it('returns the right value from getAllFeatureVariables and send notification with featureEnabled true', function() {
                  var result = optlyInstance.getAllFeatureVariables(
                    'test_feature',
                    'user1',
                    { test_attribute: 'test_value' }
                  );
                  assert.deepEqual(result, {
                    new_content: true,
                    price: 4.99,
                    lasers: 395,
                    message: 'Hello audience',
                    message_info: {
                      count: 2,
                      message: 'Hello audience',
                    },
                  });
                  sinon.assert.calledWith(decisionListener, {
                    type: DECISION_NOTIFICATION_TYPES.ALL_FEATURE_VARIABLES,
                    userId: 'user1',
                    attributes: { test_attribute: 'test_value' },
                    decisionInfo: {
                      featureKey: 'test_feature',
                      featureEnabled: true,
                      variableValues: {
                        new_content: true,
                        price: 4.99,
                        lasers: 395,
                        message: 'Hello audience',
                        message_info: {
                          count: 2,
                          message: 'Hello audience',
                        },
                      },
                      source: DECISION_SOURCES.ROLLOUT,
                      sourceInfo: {},
                    },
                  });
                });
              });

              describe('when the variation is toggled OFF', function() {
                beforeEach(function() {
                  var experiment = projectConfig.getExperimentFromKey(
                    optlyInstance.projectConfigManager.getConfig(),
                    '594037'
                  );
                  var variation = experiment.variations[0];
                  var decisionObj = {
                    experiment: experiment,
                    variation: variation,
                    decisionSource: DECISION_SOURCES.ROLLOUT,
                  };
                  fakeDecisionResponse = {
                    result: decisionObj,
                    reasons: [],
                  };
                  sandbox.stub(optlyInstance.decisionService, 'getVariationForFeature').returns(fakeDecisionResponse);
                });

                it('should return the default value from getFeatureVariable when variable type is boolean and send notification with featureEnabled false', function() {
                  var result = optlyInstance.getFeatureVariable('test_feature', 'new_content', 'user1', {
                    test_attribute: 'test_value',
                  });
                  assert.strictEqual(result, false);
                  sinon.assert.calledWith(decisionListener, {
                    type: DECISION_NOTIFICATION_TYPES.FEATURE_VARIABLE,
                    userId: 'user1',
                    attributes: { test_attribute: 'test_value' },
                    decisionInfo: {
                      featureKey: 'test_feature',
                      featureEnabled: false,
                      variableKey: 'new_content',
                      variableValue: false,
                      variableType: FEATURE_VARIABLE_TYPES.BOOLEAN,
                      source: DECISION_SOURCES.ROLLOUT,
                      sourceInfo: {},
                    },
                  });
                });

                it('should return the default value from getFeatureVariable when variable type is double and send notification with featureEnabled false', function() {
                  var result = optlyInstance.getFeatureVariable('test_feature', 'price', 'user1', {
                    test_attribute: 'test_value',
                  });
                  assert.strictEqual(result, 14.99);
                  sinon.assert.calledWith(decisionListener, {
                    type: DECISION_NOTIFICATION_TYPES.FEATURE_VARIABLE,
                    userId: 'user1',
                    attributes: { test_attribute: 'test_value' },
                    decisionInfo: {
                      featureKey: 'test_feature',
                      featureEnabled: false,
                      variableKey: 'price',
                      variableValue: 14.99,
                      variableType: FEATURE_VARIABLE_TYPES.DOUBLE,
                      source: DECISION_SOURCES.ROLLOUT,
                      sourceInfo: {},
                    },
                  });
                });

                it('should return the default value from getFeatureVariable when variable type is integer and send notification with featureEnabled false', function() {
                  var result = optlyInstance.getFeatureVariable('test_feature', 'lasers', 'user1', {
                    test_attribute: 'test_value',
                  });
                  assert.strictEqual(result, 400);
                  sinon.assert.calledWith(decisionListener, {
                    type: DECISION_NOTIFICATION_TYPES.FEATURE_VARIABLE,
                    userId: 'user1',
                    attributes: { test_attribute: 'test_value' },
                    decisionInfo: {
                      featureKey: 'test_feature',
                      featureEnabled: false,
                      variableKey: 'lasers',
                      variableValue: 400,
                      variableType: FEATURE_VARIABLE_TYPES.INTEGER,
                      source: DECISION_SOURCES.ROLLOUT,
                      sourceInfo: {},
                    },
                  });
                });

                it('should return the default value from getFeatureVariable when variable type is string and send notification with featureEnabled false', function() {
                  var result = optlyInstance.getFeatureVariable('test_feature', 'message', 'user1', {
                    test_attribute: 'test_value',
                  });
                  assert.strictEqual(result, 'Hello');
                  sinon.assert.calledWith(decisionListener, {
                    type: DECISION_NOTIFICATION_TYPES.FEATURE_VARIABLE,
                    userId: 'user1',
                    attributes: { test_attribute: 'test_value' },
                    decisionInfo: {
                      featureKey: 'test_feature',
                      featureEnabled: false,
                      variableKey: 'message',
                      variableValue: 'Hello',
                      variableType: FEATURE_VARIABLE_TYPES.STRING,
                      source: DECISION_SOURCES.ROLLOUT,
                      sourceInfo: {},
                    },
                  });
                });

                it('should return the default value from getFeatureVariable when variable type is json and send notification with featureEnabled false', function() {
                  var result = optlyInstance.getFeatureVariable('test_feature', 'message_info', 'user1', {
                    test_attribute: 'test_value',
                  });
                  assert.deepEqual(result, {
                    count: 1,
                    message: 'Hello'
                  });
                  sinon.assert.calledWith(decisionListener, {
                    type: DECISION_NOTIFICATION_TYPES.FEATURE_VARIABLE,
                    userId: 'user1',
                    attributes: { test_attribute: 'test_value' },
                    decisionInfo: {
                      featureKey: 'test_feature',
                      featureEnabled: false,
                      variableKey: 'message_info',
                      variableValue: { count: 1, message: 'Hello' },
                      variableType: FEATURE_VARIABLE_TYPES.JSON,
                      source: DECISION_SOURCES.ROLLOUT,
                      sourceInfo: {},
                    },
                  });
                });

                it('should return the default value from getFeatureVariableBoolean and send notification with featureEnabled false', function() {
                  var result = optlyInstance.getFeatureVariableBoolean('test_feature', 'new_content', 'user1', {
                    test_attribute: 'test_value',
                  });
                  assert.strictEqual(result, false);
                  sinon.assert.calledWith(decisionListener, {
                    type: DECISION_NOTIFICATION_TYPES.FEATURE_VARIABLE,
                    userId: 'user1',
                    attributes: { test_attribute: 'test_value' },
                    decisionInfo: {
                      featureKey: 'test_feature',
                      featureEnabled: false,
                      variableKey: 'new_content',
                      variableValue: false,
                      variableType: FEATURE_VARIABLE_TYPES.BOOLEAN,
                      source: DECISION_SOURCES.ROLLOUT,
                      sourceInfo: {},
                    },
                  });
                });

                it('should return the default value from getFeatureVariableDouble and send notification with featureEnabled false', function() {
                  var result = optlyInstance.getFeatureVariableDouble('test_feature', 'price', 'user1', {
                    test_attribute: 'test_value',
                  });
                  assert.strictEqual(result, 14.99);
                  sinon.assert.calledWith(decisionListener, {
                    type: DECISION_NOTIFICATION_TYPES.FEATURE_VARIABLE,
                    userId: 'user1',
                    attributes: { test_attribute: 'test_value' },
                    decisionInfo: {
                      featureKey: 'test_feature',
                      featureEnabled: false,
                      variableKey: 'price',
                      variableValue: 14.99,
                      variableType: FEATURE_VARIABLE_TYPES.DOUBLE,
                      source: DECISION_SOURCES.ROLLOUT,
                      sourceInfo: {},
                    },
                  });
                });

                it('should return the default value from getFeatureVariableInteger and send notification with featureEnabled false', function() {
                  var result = optlyInstance.getFeatureVariableInteger('test_feature', 'lasers', 'user1', {
                    test_attribute: 'test_value',
                  });
                  assert.strictEqual(result, 400);
                  sinon.assert.calledWith(decisionListener, {
                    type: DECISION_NOTIFICATION_TYPES.FEATURE_VARIABLE,
                    userId: 'user1',
                    attributes: { test_attribute: 'test_value' },
                    decisionInfo: {
                      featureKey: 'test_feature',
                      featureEnabled: false,
                      variableKey: 'lasers',
                      variableValue: 400,
                      variableType: FEATURE_VARIABLE_TYPES.INTEGER,
                      source: DECISION_SOURCES.ROLLOUT,
                      sourceInfo: {},
                    },
                  });
                });

                it('should return the default value from getFeatureVariableString and send notification with featureEnabled false', function() {
                  var result = optlyInstance.getFeatureVariableString('test_feature', 'message', 'user1', {
                    test_attribute: 'test_value',
                  });
                  assert.strictEqual(result, 'Hello');
                  sinon.assert.calledWith(decisionListener, {
                    type: DECISION_NOTIFICATION_TYPES.FEATURE_VARIABLE,
                    userId: 'user1',
                    attributes: { test_attribute: 'test_value' },
                    decisionInfo: {
                      featureKey: 'test_feature',
                      featureEnabled: false,
                      variableKey: 'message',
                      variableValue: 'Hello',
                      variableType: FEATURE_VARIABLE_TYPES.STRING,
                      source: DECISION_SOURCES.ROLLOUT,
                      sourceInfo: {},
                    },
                  });
                });

                it('should return the default value from getFeatureVariableJSON and send notification with featureEnabled false', function() {
                  var result = optlyInstance.getFeatureVariableJSON('test_feature', 'message_info', 'user1', {
                    test_attribute: 'test_value',
                  });
                  assert.deepEqual(result, {
                    count: 1,
                    message: 'Hello',
                  });
                  sinon.assert.calledWith(decisionListener, {
                    type: DECISION_NOTIFICATION_TYPES.FEATURE_VARIABLE,
                    userId: 'user1',
                    attributes: { test_attribute: 'test_value' },
                    decisionInfo: {
                      featureKey: 'test_feature',
                      featureEnabled: false,
                      variableKey: 'message_info',
                      variableValue: {
                        count: 1,
                        message: 'Hello',
                      },
                      variableType: FEATURE_VARIABLE_TYPES.JSON,
                      source: DECISION_SOURCES.ROLLOUT,
                      sourceInfo: {},
                    },
                  });
                });

                it('returns the default value from getAllFeatureVariables and send notification with featureEnabled false', function() {
                  var result = optlyInstance.getAllFeatureVariables(
                    'test_feature',
                    'user1',
                    { test_attribute: 'test_value' }
                  );
                  assert.deepEqual(result, {
                    new_content: false,
                    price: 14.99,
                    lasers: 400,
                    message: 'Hello',
                    message_info: {
                      count: 1,
                      message: 'Hello',
                    },
                  });
                  sinon.assert.calledWith(decisionListener, {
                    type: DECISION_NOTIFICATION_TYPES.ALL_FEATURE_VARIABLES,
                    userId: 'user1',
                    attributes: { test_attribute: 'test_value' },
                    decisionInfo: {
                      featureKey: 'test_feature',
                      featureEnabled: false,
                      variableValues: {
                        new_content: false,
                        price: 14.99,
                        lasers: 400,
                        message: 'Hello',
                        message_info: {
                          count: 1,
                          message: 'Hello',
                        },
                      },
                      source: DECISION_SOURCES.ROLLOUT,
                      sourceInfo: {},
                    },
                  });
                });
              });
            });

            describe('not bucketed into an experiment or a rollout', function() {
              beforeEach(function() {
                var decisionObj = {
                  experiment: null,
                  variation: null,
                  decisionSource: DECISION_SOURCES.ROLLOUT,
                };
                fakeDecisionResponse = {
                  result: decisionObj,
                  reasons: [],
                };
                sandbox.stub(optlyInstance.decisionService, 'getVariationForFeature').returns(fakeDecisionResponse);
              });

              it('returns the variable default value from getFeatureVariable when variable type is boolean and send notification with featureEnabled false', function() {
                var result = optlyInstance.getFeatureVariable(
                  'test_feature_for_experiment',
                  'is_button_animated',
                  'user1',
                  { test_attribute: 'test_value' }
                );
                assert.strictEqual(result, false);
                sinon.assert.calledWith(decisionListener, {
                  type: DECISION_NOTIFICATION_TYPES.FEATURE_VARIABLE,
                  userId: 'user1',
                  attributes: { test_attribute: 'test_value' },
                  decisionInfo: {
                    featureKey: 'test_feature_for_experiment',
                    featureEnabled: false,
                    variableKey: 'is_button_animated',
                    variableValue: false,
                    variableType: FEATURE_VARIABLE_TYPES.BOOLEAN,
                    source: DECISION_SOURCES.ROLLOUT,
                    sourceInfo: {},
                  },
                });
              });

              it('returns the variable default value from getFeatureVariable when variable type is double and send notification with featureEnabled false', function() {
                var result = optlyInstance.getFeatureVariable('test_feature_for_experiment', 'button_width', 'user1', {
                  test_attribute: 'test_value',
                });
                assert.strictEqual(result, 50.55);
                sinon.assert.calledWith(decisionListener, {
                  type: DECISION_NOTIFICATION_TYPES.FEATURE_VARIABLE,
                  userId: 'user1',
                  attributes: { test_attribute: 'test_value' },
                  decisionInfo: {
                    featureKey: 'test_feature_for_experiment',
                    featureEnabled: false,
                    variableKey: 'button_width',
                    variableValue: 50.55,
                    variableType: FEATURE_VARIABLE_TYPES.DOUBLE,
                    source: DECISION_SOURCES.ROLLOUT,
                    sourceInfo: {},
                  },
                });
              });

              it('returns the variable default value from getFeatureVariable when variable type is integer and send notification with featureEnabled false', function() {
                var result = optlyInstance.getFeatureVariable('test_feature_for_experiment', 'num_buttons', 'user1', {
                  test_attribute: 'test_value',
                });
                assert.strictEqual(result, 10);
                sinon.assert.calledWith(decisionListener, {
                  type: DECISION_NOTIFICATION_TYPES.FEATURE_VARIABLE,
                  userId: 'user1',
                  attributes: { test_attribute: 'test_value' },
                  decisionInfo: {
                    featureKey: 'test_feature_for_experiment',
                    featureEnabled: false,
                    variableKey: 'num_buttons',
                    variableValue: 10,
                    variableType: FEATURE_VARIABLE_TYPES.INTEGER,
                    source: DECISION_SOURCES.ROLLOUT,
                    sourceInfo: {},
                  },
                });
              });

              it('returns the variable default value from getFeatureVariable when variable type is string and send notification with featureEnabled false', function() {
                var result = optlyInstance.getFeatureVariable('test_feature_for_experiment', 'button_txt', 'user1', {
                  test_attribute: 'test_value',
                });
                assert.strictEqual(result, 'Buy me');
                sinon.assert.calledWith(decisionListener, {
                  type: DECISION_NOTIFICATION_TYPES.FEATURE_VARIABLE,
                  userId: 'user1',
                  attributes: { test_attribute: 'test_value' },
                  decisionInfo: {
                    featureKey: 'test_feature_for_experiment',
                    featureEnabled: false,
                    variableKey: 'button_txt',
                    variableValue: 'Buy me',
                    variableType: FEATURE_VARIABLE_TYPES.STRING,
                    source: DECISION_SOURCES.ROLLOUT,
                    sourceInfo: {},
                  },
                });
              });

              it('returns the variable default value from getFeatureVariable when variable type is json and send notification with featureEnabled false', function() {
                var result = optlyInstance.getFeatureVariable('test_feature_for_experiment', 'button_info', 'user1', {
                  test_attribute: 'test_value',
                });
                assert.deepEqual(result, {
                  num_buttons: 0,
                  text: 'default value',
                });
                sinon.assert.calledWith(decisionListener, {
                  type: DECISION_NOTIFICATION_TYPES.FEATURE_VARIABLE,
                  userId: 'user1',
                  attributes: { test_attribute: 'test_value' },
                  decisionInfo: {
                    featureKey: 'test_feature_for_experiment',
                    featureEnabled: false,
                    variableKey: 'button_info',
                    variableValue: {
                      num_buttons: 0,
                      text: 'default value',
                    },
                    variableType: FEATURE_VARIABLE_TYPES.JSON,
                    source: DECISION_SOURCES.ROLLOUT,
                    sourceInfo: {},
                  },
                });
              });

              it('returns the variable default value from getFeatureVariableBoolean and send notification with featureEnabled false', function() {
                var result = optlyInstance.getFeatureVariableBoolean(
                  'test_feature_for_experiment',
                  'is_button_animated',
                  'user1',
                  { test_attribute: 'test_value' }
                );
                assert.strictEqual(result, false);
                sinon.assert.calledWith(decisionListener, {
                  type: DECISION_NOTIFICATION_TYPES.FEATURE_VARIABLE,
                  userId: 'user1',
                  attributes: { test_attribute: 'test_value' },
                  decisionInfo: {
                    featureKey: 'test_feature_for_experiment',
                    featureEnabled: false,
                    variableKey: 'is_button_animated',
                    variableValue: false,
                    variableType: FEATURE_VARIABLE_TYPES.BOOLEAN,
                    source: DECISION_SOURCES.ROLLOUT,
                    sourceInfo: {},
                  },
                });
              });

              it('returns the variable default value from getFeatureVariableDouble and send notification with featureEnabled false', function() {
                var result = optlyInstance.getFeatureVariableDouble(
                  'test_feature_for_experiment',
                  'button_width',
                  'user1',
                  { test_attribute: 'test_value' }
                );
                assert.strictEqual(result, 50.55);
                sinon.assert.calledWith(decisionListener, {
                  type: DECISION_NOTIFICATION_TYPES.FEATURE_VARIABLE,
                  userId: 'user1',
                  attributes: { test_attribute: 'test_value' },
                  decisionInfo: {
                    featureKey: 'test_feature_for_experiment',
                    featureEnabled: false,
                    variableKey: 'button_width',
                    variableValue: 50.55,
                    variableType: FEATURE_VARIABLE_TYPES.DOUBLE,
                    source: DECISION_SOURCES.ROLLOUT,
                    sourceInfo: {},
                  },
                });
              });

              it('returns the variable default value from getFeatureVariableInteger and send notification with featureEnabled false', function() {
                var result = optlyInstance.getFeatureVariableInteger(
                  'test_feature_for_experiment',
                  'num_buttons',
                  'user1',
                  { test_attribute: 'test_value' }
                );
                assert.strictEqual(result, 10);
                sinon.assert.calledWith(decisionListener, {
                  type: DECISION_NOTIFICATION_TYPES.FEATURE_VARIABLE,
                  userId: 'user1',
                  attributes: { test_attribute: 'test_value' },
                  decisionInfo: {
                    featureKey: 'test_feature_for_experiment',
                    featureEnabled: false,
                    variableKey: 'num_buttons',
                    variableValue: 10,
                    variableType: FEATURE_VARIABLE_TYPES.INTEGER,
                    source: DECISION_SOURCES.ROLLOUT,
                    sourceInfo: {},
                  },
                });
              });

              it('returns the variable default value from getFeatureVariableString and send notification with featureEnabled false', function() {
                var result = optlyInstance.getFeatureVariableString(
                  'test_feature_for_experiment',
                  'button_txt',
                  'user1',
                  { test_attribute: 'test_value' }
                );
                assert.strictEqual(result, 'Buy me');
                sinon.assert.calledWith(decisionListener, {
                  type: DECISION_NOTIFICATION_TYPES.FEATURE_VARIABLE,
                  userId: 'user1',
                  attributes: { test_attribute: 'test_value' },
                  decisionInfo: {
                    featureKey: 'test_feature_for_experiment',
                    featureEnabled: false,
                    variableKey: 'button_txt',
                    variableValue: 'Buy me',
                    variableType: FEATURE_VARIABLE_TYPES.STRING,
                    source: DECISION_SOURCES.ROLLOUT,
                    sourceInfo: {},
                  },
                });
              });

              it('returns the variable default value from getFeatureVariableJSON and send notification with featureEnabled false', function() {
                var result = optlyInstance.getFeatureVariableJSON(
                  'test_feature_for_experiment',
                  'button_info',
                  'user1',
                  { test_attribute: 'test_value' }
                );
                assert.deepEqual(result, {
                  num_buttons: 0,
                  text: 'default value',
                });
                sinon.assert.calledWith(decisionListener, {
                  type: DECISION_NOTIFICATION_TYPES.FEATURE_VARIABLE,
                  userId: 'user1',
                  attributes: { test_attribute: 'test_value' },
                  decisionInfo: {
                    featureKey: 'test_feature_for_experiment',
                    featureEnabled: false,
                    variableKey: 'button_info',
                    variableValue: {
                      num_buttons: 0,
                      text: 'default value',
                    },
                    variableType: FEATURE_VARIABLE_TYPES.JSON,
                    source: DECISION_SOURCES.ROLLOUT,
                    sourceInfo: {},
                  },
                });
              });

              it('returns the default value from getAllFeatureVariables and send notification with featureEnabled false', function() {
                var result = optlyInstance.getAllFeatureVariables(
                  'test_feature_for_experiment',
                  'user1',
                  { test_attribute: 'test_value' }
                );
                assert.deepEqual(result, {
                  is_button_animated: false,
                  button_width: 50.55,
                  num_buttons: 10,
                  button_txt: 'Buy me',
                  button_info: {
                    num_buttons: 0,
                    text: 'default value',
                  }
                });
                sinon.assert.calledWith(decisionListener, {
                  type: DECISION_NOTIFICATION_TYPES.ALL_FEATURE_VARIABLES,
                  userId: 'user1',
                  attributes: { test_attribute: 'test_value' },
                  decisionInfo: {
                    featureKey: 'test_feature_for_experiment',
                    featureEnabled: false,
                    variableValues: {
                      is_button_animated: false,
                      button_width: 50.55,
                      num_buttons: 10,
                      button_txt: 'Buy me',
                      button_info: {
                        num_buttons: 0,
                        text: 'default value',
                      }
                    },
                    source: DECISION_SOURCES.ROLLOUT,
                    sourceInfo: {},
                  },
                });
              });
            });
          });
        });
      });
    });
  });

  describe('decide APIs', function() {
    var optlyInstance;
    var bucketStub;
    var createdLogger = logger.createLogger({
      logLevel: LOG_LEVEL.INFO,
      logToConsole: false,
    });
    var notificationCenter = createNotificationCenter({ logger: createdLogger, errorHandler: errorHandler });
    var eventProcessor = createEventProcessor({
      dispatcher: eventDispatcher,
      batchSize: 1,
      notificationCenter: notificationCenter,
    });

    describe('#createUserContext', function() {
      beforeEach(function() {
        optlyInstance = new Optimizely({
          clientEngine: 'node-sdk',
          datafile: testData.getTestDecideProjectConfig(),
          errorHandler: errorHandler,
          eventDispatcher: eventDispatcher,
          jsonSchemaValidator: jsonSchemaValidator,
          logger: createdLogger,
          isValidInstance: true,
          eventBatchSize: 1,
          notificationCenter,
          eventProcessor,
        });

        bucketStub = sinon.stub(bucketer, 'bucket');
        sinon.stub(errorHandler, 'handleError');
        sinon.stub(createdLogger, 'log');
        sinon.stub(fns, 'uuid').returns('a68cf1ad-0393-4e18-af87-efe8f01a7c9c');
      });

      afterEach(function() {
        bucketer.bucket.restore();
        errorHandler.handleError.restore();
        createdLogger.log.restore();
        fns.uuid.restore();
      });

      it('should create OptimizelyUserContext with provided attributes and userId', function() {
        var userId = 'testUser1';
        var attributes = { test_attribute: 'test_value' };
        var user = optlyInstance.createUserContext(userId, attributes);
        assert.instanceOf(user, OptimizelyUserContext);
        assert.deepEqual(optlyInstance, user.getOptimizely());
        assert.deepEqual(attributes, user.getAttributes());
        assert.deepEqual(userId, user.getUserId());
      });

      it('should create OptimizelyUserContext when no attributes provided', function() {
        var userId = 'testUser2';
        var user = optlyInstance.createUserContext(userId);
        assert.instanceOf(user, OptimizelyUserContext);
        assert.deepEqual(optlyInstance, user.getOptimizely());
        assert.deepEqual({}, user.getAttributes());
        assert.deepEqual(userId, user.getUserId());
      });

      it('should create multiple instances of OptimizelyUserContext', function() {
        var userId1 = 'testUser1'
        var userId2 = 'testUser2';
        var attributes1 = { test_attribute: 'test_value' };
        var user1 = optlyInstance.createUserContext(userId1, attributes1);
        var user2 = optlyInstance.createUserContext(userId2);
        assert.instanceOf(user1, OptimizelyUserContext);
        assert.deepEqual(user1.getOptimizely(), optlyInstance);
        assert.deepEqual(user1.getAttributes(), attributes1);
        assert.deepEqual(user1.getUserId(), userId1);
        assert.instanceOf(user2, OptimizelyUserContext);
        assert.deepEqual(user2.getOptimizely(), optlyInstance);
        assert.deepEqual(user2.getAttributes(), {});
        assert.deepEqual(user2.getUserId(), userId2);
      });

      it('should call the error handler for invalid user ID and return null', function() {
        assert.isNull(optlyInstance.createUserContext(null));
        sinon.assert.calledOnce(errorHandler.handleError);
        var errorMessage = errorHandler.handleError.lastCall.args[0].message;
        assert.strictEqual(errorMessage, sprintf(ERROR_MESSAGES.INVALID_INPUT_FORMAT, 'OPTIMIZELY', 'user_id'));
        sinon.assert.calledOnce(createdLogger.log);
        var logMessage = buildLogMessageFromArgs(createdLogger.log.args[0]);
        assert.strictEqual(logMessage, sprintf(ERROR_MESSAGES.INVALID_INPUT_FORMAT, 'OPTIMIZELY', 'user_id'));
      });

      it('should call the error handler for invalid attributes and return null', function() {
        assert.isNull(optlyInstance.createUserContext('user1', 'invalid_attributes'));
        sinon.assert.calledOnce(errorHandler.handleError);
        var errorMessage = errorHandler.handleError.lastCall.args[0].message;
        assert.strictEqual(errorMessage, sprintf(ERROR_MESSAGES.INVALID_ATTRIBUTES, 'ATTRIBUTES_VALIDATOR'));
        sinon.assert.calledOnce(createdLogger.log);
        var logMessage = buildLogMessageFromArgs(createdLogger.log.args[0]);
        assert.strictEqual(logMessage, sprintf(ERROR_MESSAGES.INVALID_ATTRIBUTES, 'ATTRIBUTES_VALIDATOR'));
      });
    });

    describe('#decide', function() {
      var userId = 'tester';
      describe('with empty default decide options', function() {
        beforeEach(function() {
          optlyInstance = new Optimizely({
            clientEngine: 'node-sdk',
            datafile: testData.getTestDecideProjectConfig(),
            errorHandler: errorHandler,
            eventDispatcher: eventDispatcher,
            jsonSchemaValidator: jsonSchemaValidator,
            logger: createdLogger,
            isValidInstance: true,
            eventBatchSize: 1,
            defaultDecideOptions: [],
            notificationCenter,
            eventProcessor,
          });

          sinon.stub(optlyInstance.notificationCenter, 'sendNotifications');
          sinon.stub(errorHandler, 'handleError');
          sinon.stub(createdLogger, 'log');
          sinon.stub(fns, 'uuid').returns('a68cf1ad-0393-4e18-af87-efe8f01a7c9c');
        });

        afterEach(function() {
          errorHandler.handleError.restore();
          createdLogger.log.restore();
          fns.uuid.restore();
          optlyInstance.notificationCenter.sendNotifications.restore();
        });

        it('should return error decision object when provided flagKey is invalid and do not dispatch an event', function() {
          var flagKey = 'invalid_flag_key';
          var user = new OptimizelyUserContext({
            optimizely: optlyInstance,
            userId,
          });
          var decision = optlyInstance.decide(user, flagKey);
          var expectedDecision = {
            variationKey: null,
            enabled: false,
            variables: {},
            ruleKey: null,
            flagKey: flagKey,
            userContext: user,
            reasons: [ sprintf(DECISION_MESSAGES.FLAG_KEY_INVALID, flagKey) ],
          }
          assert.deepEqual(decision, expectedDecision);
          sinon.assert.notCalled(eventDispatcher.dispatchEvent);
        });

        it('should return error decision object when SDK is not ready and do not dispatch an event', function() {
          optlyInstance.projectConfigManager.getConfig.returns(null);
          var flagKey = 'feature_2';
          var user = new OptimizelyUserContext({
            optimizely: optlyInstance,
            userId,
          });
          var decision = optlyInstance.decide(user, flagKey);
          var expectedDecision = {
            variationKey: null,
            enabled: false,
            variables: {},
            ruleKey: null,
            flagKey: flagKey,
            userContext: user,
            reasons: [ DECISION_MESSAGES.SDK_NOT_READY ],
          }
          assert.deepEqual(decision, expectedDecision);
          sinon.assert.notCalled(eventDispatcher.dispatchEvent);
        });

        it('should make a decision for feature_test and dispatch an event', function() {
          var flagKey = 'feature_2';
          var expectedVariables = optlyInstance.getAllFeatureVariables(flagKey, userId);
          var user = new OptimizelyUserContext({
            optimizely: optlyInstance,
            userId,
          });
          var decision = optlyInstance.decide(user, flagKey);
          var expectedDecision = {
            variationKey: 'variation_with_traffic',
            enabled: true,
            variables: expectedVariables,
            ruleKey: 'exp_no_audience',
            flagKey: flagKey,
            userContext: user,
            reasons: [],
          }
          assert.deepEqual(decision, expectedDecision);
          sinon.assert.calledOnce(eventDispatcher.dispatchEvent);
          var expectedImpressionEvent = {
            httpVerb: 'POST',
            url: 'https://logx.optimizely.com/v1/events',
            params: {
              account_id: '10367498574',
              project_id: '10431130345',
              visitors: [
                {
                  snapshots: [
                    {
                      decisions: [
                        {
                          campaign_id: '10417730432',
                          experiment_id: '10420810910',
                          variation_id: '10418551353',
                          metadata: {
                            flag_key: 'feature_2',
                            rule_key: 'exp_no_audience',
                            rule_type: 'feature-test',
                            variation_key: 'variation_with_traffic',
                            enabled: true,
                          },
                        },
                      ],
                      events: [
                        {
                          entity_id: '10417730432',
                          timestamp: Math.round(new Date().getTime()),
                          key: 'campaign_activated',
                          uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                        },
                      ],
                    },
                  ],
                  visitor_id: 'tester',
                  attributes: [
                    {
                      entity_id: '$opt_bot_filtering',
                      key: '$opt_bot_filtering',
                      type: 'custom',
                      value: true,
                    },
                  ],
                },
              ],
              revision: '241',
              client_name: 'node-sdk',
              client_version: enums.NODE_CLIENT_VERSION,
              anonymize_ip: true,
              enrich_decisions: true,
            },
          };
          var callArgs = eventDispatcher.dispatchEvent.getCalls()[0].args;
          assert.deepEqual(callArgs[0], expectedImpressionEvent);
          sinon.assert.callCount(optlyInstance.notificationCenter.sendNotifications, 4)
          var notificationCallArgs = optlyInstance.notificationCenter.sendNotifications.getCall(3).args;
          var expectedNotificationCallArgs = [
            NOTIFICATION_TYPES.DECISION,
            {
              type: 'flag',
              userId: 'tester',
              attributes: {},
              decisionInfo: {
                flagKey: 'feature_2',
                enabled: true,
                ruleKey: "exp_no_audience",
                variationKey: "variation_with_traffic",
                variables: { i_42: 42 },
                decisionEventDispatched: true,
                reasons: [],
              },
            }
          ]
          assert.deepEqual(notificationCallArgs, expectedNotificationCallArgs);
        });

        it('should make a decision and do not dispatch an event with DISABLE_DECISION_EVENT passed in decide options', function() {
          var flagKey = 'feature_2';
          var expectedVariables = optlyInstance.getAllFeatureVariables(flagKey, userId);
          var user = new OptimizelyUserContext({
            optimizely: optlyInstance,
            userId,
          });
          var decision = optlyInstance.decide(user, flagKey, [ OptimizelyDecideOption.DISABLE_DECISION_EVENT ]);
          var expectedDecision = {
            variationKey: 'variation_with_traffic',
            enabled: true,
            variables: expectedVariables,
            ruleKey: 'exp_no_audience',
            flagKey: flagKey,
            userContext: user,
            reasons: [],
          }
          assert.deepEqual(decision, expectedDecision);
          sinon.assert.notCalled(eventDispatcher.dispatchEvent);
          sinon.assert.calledTwice(optlyInstance.notificationCenter.sendNotifications);
          var notificationCallArgs = optlyInstance.notificationCenter.sendNotifications.getCall(1).args;
          var expectedNotificationCallArgs = [
            NOTIFICATION_TYPES.DECISION,
            {
              type: 'flag',
              userId: 'tester',
              attributes: {},
              decisionInfo: {
                flagKey: 'feature_2',
                enabled: true,
                ruleKey: "exp_no_audience",
                variationKey: "variation_with_traffic",
                variables: { i_42: 42 },
                decisionEventDispatched: false,
                reasons: [],
              },
            }
          ]
          assert.deepEqual(notificationCallArgs, expectedNotificationCallArgs);
        });

        it('should make a decision with excluded variables and do not dispatch an event with DISABLE_DECISION_EVENT and EXCLUDE_VARIABLES passed in decide options', function() {
          var flagKey = 'feature_2';
          var user = new OptimizelyUserContext({
            optimizely: optlyInstance,
            userId,
          });
          var decision = optlyInstance.decide(user, flagKey, [ OptimizelyDecideOption.DISABLE_DECISION_EVENT, OptimizelyDecideOption.EXCLUDE_VARIABLES ]);
          var expectedDecision = {
            variationKey: 'variation_with_traffic',
            enabled: true,
            variables: {},
            ruleKey: 'exp_no_audience',
            flagKey: flagKey,
            userContext: user,
            reasons: [],
          }
          assert.deepEqual(decision, expectedDecision);
          sinon.assert.notCalled(eventDispatcher.dispatchEvent);
          sinon.assert.calledOnce(optlyInstance.notificationCenter.sendNotifications);
          var notificationCallArgs = optlyInstance.notificationCenter.sendNotifications.getCall(0).args;
          var expectedNotificationCallArgs = [
            NOTIFICATION_TYPES.DECISION,
            {
              type: 'flag',
              userId: 'tester',
              attributes: {},
              decisionInfo: {
                flagKey: 'feature_2',
                enabled: true,
                ruleKey: 'exp_no_audience',
                variationKey: "variation_with_traffic",
                variables: {},
                decisionEventDispatched: false,
                reasons: [],
              },
            }
          ]
          assert.deepEqual(notificationCallArgs, expectedNotificationCallArgs);
        });

        it('should make a decision for rollout and dispatch an event when sendFlagDecisions is set to true', function() {
          var flagKey = 'feature_1';
          var expectedVariables = optlyInstance.getAllFeatureVariables(flagKey, userId);
          var user = new OptimizelyUserContext({
            optimizely: optlyInstance,
            userId,
          });
          var decision = optlyInstance.decide(user, flagKey);
          var expectedDecision = {
            variationKey: '18257766532',
            enabled: true,
            variables: expectedVariables,
            ruleKey: '18322080788',
            flagKey: flagKey,
            userContext: user,
            reasons: [],
          }
          assert.deepEqual(decision, expectedDecision);
          sinon.assert.calledOnce(eventDispatcher.dispatchEvent);
          sinon.assert.callCount(optlyInstance.notificationCenter.sendNotifications, 4);
          var notificationCallArgs = optlyInstance.notificationCenter.sendNotifications.getCall(3).args;
          var expectedNotificationCallArgs = [
            NOTIFICATION_TYPES.DECISION,
            {
              type: 'flag',
              userId: 'tester',
              attributes: {},
              decisionInfo: {
                flagKey: 'feature_1',
                enabled: true,
                ruleKey: '18322080788',
                variationKey: '18257766532',
                variables: expectedVariables,
                decisionEventDispatched: true,
                reasons: [],
              },
            }
          ]
          assert.deepEqual(notificationCallArgs, expectedNotificationCallArgs);
        });

        it('should make a decision for rollout and do not dispatch an event when sendFlagDecisions is set to false', function() {
          var newConfig = optlyInstance.projectConfigManager.getConfig();
          newConfig.sendFlagDecisions = false;
          optlyInstance.projectConfigManager.getConfig.returns(newConfig);
          var flagKey = 'feature_1';
          var expectedVariables = optlyInstance.getAllFeatureVariables(flagKey, userId);
          var user = new OptimizelyUserContext({
            optimizely: optlyInstance,
            userId,
          });
          var decision = optlyInstance.decide(user, flagKey);
          var expectedDecision = {
            variationKey: '18257766532',
            enabled: true,
            variables: expectedVariables,
            ruleKey: '18322080788',
            flagKey: flagKey,
            userContext: user,
            reasons: [],
          }
          assert.deepEqual(decision, expectedDecision);
          sinon.assert.notCalled(eventDispatcher.dispatchEvent);
          sinon.assert.calledTwice(optlyInstance.notificationCenter.sendNotifications);
          var notificationCallArgs = optlyInstance.notificationCenter.sendNotifications.getCall(1).args;
          var expectedNotificationCallArgs = [
            NOTIFICATION_TYPES.DECISION,
            {
              type: 'flag',
              userId: 'tester',
              attributes: {},
              decisionInfo: {
                flagKey: 'feature_1',
                enabled: true,
                ruleKey: '18322080788',
                variationKey: '18257766532',
                variables: expectedVariables,
                decisionEventDispatched: false,
                reasons: [],
              },
            }
          ]
          assert.deepEqual(notificationCallArgs, expectedNotificationCallArgs);
        });

        it('should make a decision when variation is null and dispatch an event', function() {
          var flagKey = 'feature_3';
          var expectedVariables = optlyInstance.getAllFeatureVariables(flagKey, userId);
          var user = new OptimizelyUserContext({
            optimizely: optlyInstance,
            userId,
          });
          var decision = optlyInstance.decide(user, flagKey);
          var expectedDecision = {
            variationKey: null,
            enabled: false,
            variables: expectedVariables,
            ruleKey: null,
            flagKey: flagKey,
            userContext: user,
            reasons: [],
          }
          assert.deepEqual(decision, expectedDecision);
          sinon.assert.calledOnce(eventDispatcher.dispatchEvent);
          sinon.assert.callCount(optlyInstance.notificationCenter.sendNotifications, 4);
          var notificationCallArgs = optlyInstance.notificationCenter.sendNotifications.getCall(3).args;
          var expectedNotificationCallArgs = [
            NOTIFICATION_TYPES.DECISION,
            {
              type: 'flag',
              userId: 'tester',
              attributes: {},
              decisionInfo: {
                flagKey: 'feature_3',
                enabled: false,
                ruleKey: null,
                variationKey: null,
                variables: expectedVariables,
                decisionEventDispatched: true,
                reasons: [],
              },
            }
          ]
          assert.deepEqual(notificationCallArgs, expectedNotificationCallArgs);
        });
      });

      describe('with EXCLUDE_VARIABLES flag in default decide options', function() {
        beforeEach(function() {
          optlyInstance = new Optimizely({
            clientEngine: 'node-sdk',
            datafile: testData.getTestDecideProjectConfig(),
            errorHandler: errorHandler,
            eventDispatcher: eventDispatcher,
            jsonSchemaValidator: jsonSchemaValidator,
            logger: createdLogger,
            isValidInstance: true,
            eventBatchSize: 1,
            defaultDecideOptions: [ OptimizelyDecideOption.EXCLUDE_VARIABLES ],
            eventProcessor,
            notificationCenter,
          });

          sinon.stub(optlyInstance.notificationCenter, 'sendNotifications');
          sinon.stub(errorHandler, 'handleError');
          sinon.stub(createdLogger, 'log');
          sinon.stub(fns, 'uuid').returns('a68cf1ad-0393-4e18-af87-efe8f01a7c9c');
        });

        afterEach(function() {
          optlyInstance.notificationCenter.sendNotifications.restore();
          errorHandler.handleError.restore();
          createdLogger.log.restore();
          fns.uuid.restore();
        });

        it('should exclude variables in decision object and dispatch an event', function() {
          var flagKey = 'feature_2';
          var user = new OptimizelyUserContext({
            optimizely: optlyInstance,
            userId
          });
          var decision = optlyInstance.decide(user, flagKey);
          var expectedDecisionObj = {
            variationKey: 'variation_with_traffic',
            enabled: true,
            variables: {},
            ruleKey: 'exp_no_audience',
            flagKey: flagKey,
            userContext: user,
            reasons: [],
          }
          assert.deepEqual(decision, expectedDecisionObj);
          sinon.assert.calledOnce(eventDispatcher.dispatchEvent);
          sinon.assert.calledThrice(optlyInstance.notificationCenter.sendNotifications);
          var notificationCallArgs = optlyInstance.notificationCenter.sendNotifications.getCall(2).args;
          var expectedNotificationCallArgs = [
            NOTIFICATION_TYPES.DECISION,
            {
              type: 'flag',
              userId: 'tester',
              attributes: {},
              decisionInfo: {
                flagKey: 'feature_2',
                enabled: true,
                ruleKey: 'exp_no_audience',
                variationKey: 'variation_with_traffic',
                variables: {},
                decisionEventDispatched: true,
                reasons: [],
              },
            }
          ]
          assert.deepEqual(notificationCallArgs, expectedNotificationCallArgs);
        });

        it('should exclude variables in decision object and do not dispatch an event when DISABLE_DECISION_EVENT is passed in decide options', function() {
          var flagKey = 'feature_2';
          var user = new OptimizelyUserContext({
            optimizely: optlyInstance,
            userId
          });
          var decision = optlyInstance.decide(user, flagKey, [ OptimizelyDecideOption.DISABLE_DECISION_EVENT ]);
          var expectedDecisionObj = {
            variationKey: 'variation_with_traffic',
            enabled: true,
            variables: {},
            ruleKey: 'exp_no_audience',
            flagKey: flagKey,
            userContext: user,
            reasons: [],
          }
          assert.deepEqual(decision, expectedDecisionObj);
          sinon.assert.notCalled(eventDispatcher.dispatchEvent);
          sinon.assert.calledOnce(optlyInstance.notificationCenter.sendNotifications);
          var notificationCallArgs = optlyInstance.notificationCenter.sendNotifications.getCall(0).args;
          var expectedNotificationCallArgs = [
            NOTIFICATION_TYPES.DECISION,
            {
              type: 'flag',
              userId: 'tester',
              attributes: {},
              decisionInfo: {
                flagKey: 'feature_2',
                enabled: true,
                ruleKey: 'exp_no_audience',
                variationKey: 'variation_with_traffic',
                variables: {},
                decisionEventDispatched: false,
                reasons: [],
              },
            }
          ]
          assert.deepEqual(notificationCallArgs, expectedNotificationCallArgs);
        });
      });

      describe('with DISABLE_DECISION_EVENT flag in default decide options', function() {
        beforeEach(function() {
          optlyInstance = new Optimizely({
            clientEngine: 'node-sdk',
            datafile: testData.getTestDecideProjectConfig(),
            errorHandler: errorHandler,
            eventDispatcher: eventDispatcher,
            jsonSchemaValidator: jsonSchemaValidator,
            logger: createdLogger,
            isValidInstance: true,
            eventBatchSize: 1,
            defaultDecideOptions: [ OptimizelyDecideOption.DISABLE_DECISION_EVENT ],
            notificationCenter,
            eventProcessor,
          });

          sinon.stub(optlyInstance.notificationCenter, 'sendNotifications');
        });

        afterEach(function() {
          optlyInstance.notificationCenter.sendNotifications.restore();
        });

        it('should make a decision and do not dispatch an event', function() {
          var flagKey = 'feature_2';
          var expectedVariables= optlyInstance.getAllFeatureVariables(flagKey, userId);
          var user = new OptimizelyUserContext({
            optimizely: optlyInstance,
            userId
          });
          var decision = optlyInstance.decide(user, flagKey);
          var expectedDecisionObj = {
            variationKey: 'variation_with_traffic',
            enabled: true,
            variables: expectedVariables,
            ruleKey: 'exp_no_audience',
            flagKey: flagKey,
            userContext: user,
            reasons: [],
          }
          assert.deepEqual(decision, expectedDecisionObj);
          sinon.assert.notCalled(eventDispatcher.dispatchEvent);
          sinon.assert.calledTwice(optlyInstance.notificationCenter.sendNotifications);
          var notificationCallArgs = optlyInstance.notificationCenter.sendNotifications.getCall(1).args;
          var expectedNotificationCallArgs = [
            NOTIFICATION_TYPES.DECISION,
            {
              type: 'flag',
              userId: 'tester',
              attributes: {},
              decisionInfo: {
                flagKey: 'feature_2',
                enabled: true,
                ruleKey: 'exp_no_audience',
                variationKey: 'variation_with_traffic',
                variables: expectedVariables,
                decisionEventDispatched: false,
                reasons: [],
              },
            }
          ]
          assert.deepEqual(notificationCallArgs, expectedNotificationCallArgs);
        });
      });

      describe('with INCLUDE_REASONS flag in default decide options', function() {
        beforeEach(function() {
          optlyInstance = new Optimizely({
            clientEngine: 'node-sdk',
            datafile: testData.getTestDecideProjectConfig(),
            errorHandler: errorHandler,
            eventDispatcher: eventDispatcher,
            jsonSchemaValidator: jsonSchemaValidator,
            logger: createdLogger,
            isValidInstance: true,
            eventBatchSize: 1,
            defaultDecideOptions: [ OptimizelyDecideOption.INCLUDE_REASONS ],
            notificationCenter,
            eventProcessor,
          });

          sinon.stub(optlyInstance.notificationCenter, 'sendNotifications');
        });

        afterEach(function() {
          optlyInstance.notificationCenter.sendNotifications.restore();
        });

        it('should include reason when experiment is not running', function() {
          var newConfig = optlyInstance.projectConfigManager.getConfig();
          newConfig.experiments[0].status = "NotRunning";
          optlyInstance.projectConfigManager.getConfig.returns(newConfig);
          var flagKey = "feature_1";
          var user = new OptimizelyUserContext({
            optimizely: optlyInstance,
            userId
          });
          var decision = optlyInstance.decide(user, flagKey);
          expect(decision.reasons).to.include(
            sprintf(
              LOG_MESSAGES.EXPERIMENT_NOT_RUNNING,
              'DECISION_SERVICE',
              'exp_with_audience'
            )
          );
        });

        it('should include reason when returning stored variation from user profile', function() {
          var flagKey = 'feature_2';
          var variationKey2 = 'variation_no_traffic';
          var variationId2 = '10418510624';
          var experimentKey = 'exp_no_audience';
          var mockUserProfileServiceInstance = {
            lookup: sinon.stub().returns({
              user_id: userId,
              experiment_bucket_map: {
                '10420810910': { // "exp_no_audience"
                  variation_id: variationId2,
                },
              },
            }),
            save: sinon.stub()
          };
          var optlyInstanceWithUserProfile = new Optimizely({
            clientEngine: 'node-sdk',
            datafile: testData.getTestDecideProjectConfig(),
            errorHandler: errorHandler,
            eventDispatcher: eventDispatcher,
            jsonSchemaValidator: jsonSchemaValidator,
            userProfileService: mockUserProfileServiceInstance,
            logger: createdLogger,
            isValidInstance: true,
            eventBatchSize: 1,
            defaultDecideOptions: [ OptimizelyDecideOption.INCLUDE_REASONS ],
            notificationCenter,
            eventProcessor,
          });
          var user = new OptimizelyUserContext({
            optimizely: optlyInstanceWithUserProfile,
            userId
          });
          var decision = optlyInstanceWithUserProfile.decide(user, flagKey);
          expect(decision.reasons).to.include(
            sprintf(
              LOG_MESSAGES.RETURNING_STORED_VARIATION,
              'DECISION_SERVICE',
              variationKey2,
              experimentKey,
              userId
            )
          );
        });

        it('should include reason when user is forced in variation', function() {
          var flagKey = 'feature_1';
          var variationKey = 'b';
          var newConfig = optlyInstance.projectConfigManager.getConfig();
          newConfig.experiments[0].forcedVariations[userId] = variationKey;
          optlyInstance.projectConfigManager.getConfig.returns(newConfig);
          var user = new OptimizelyUserContext({
            optimizely: optlyInstance,
            userId
          });
          var decision = optlyInstance.decide(user, flagKey);
          expect(decision.reasons).to.include(
            sprintf(
              LOG_MESSAGES.USER_FORCED_IN_VARIATION,
              'DECISION_SERVICE',
              userId,
              variationKey
            )
          );
        });

        it('should include reason when user has forced variation', function() {
          var flagKey = 'feature_1';
          var variationKey = 'b';
          var experimentKey = 'exp_with_audience';
          optlyInstance.decisionService.forcedVariationMap[userId] = { '10390977673': variationKey };
          var newConfig = optlyInstance.projectConfigManager.getConfig();
          newConfig.variationIdMap[variationKey] = { key: variationKey };
          optlyInstance.projectConfigManager.getConfig.returns(newConfig);
          var user = new OptimizelyUserContext({
            optimizely: optlyInstance,
            userId
          });
          var decision = optlyInstance.decide(user, flagKey);
          expect(decision.reasons).to.include(
            sprintf(
              LOG_MESSAGES.USER_HAS_FORCED_VARIATION,
              'DECISION_SERVICE',
              variationKey,
              experimentKey,
              userId
            )
          );
        });

        it('should include reason when invalid forced variation found', function() {
          var flagKey = 'feature_1';
          var variationKey = 'invalid-key';
          var newConfig = optlyInstance.projectConfigManager.getConfig();
          newConfig.experiments[0].forcedVariations[userId] = variationKey;
          optlyInstance.projectConfigManager.getConfig.returns(newConfig);
          var user = new OptimizelyUserContext({
            optimizely: optlyInstance,
            userId
          });
          var decision = optlyInstance.decide(user, flagKey);
          expect(decision.reasons).to.include(
            sprintf(
              LOG_MESSAGES.FORCED_BUCKETING_FAILED,
              'DECISION_SERVICE',
              variationKey,
              userId
            )
          );
        });

        it('should include reason when user meets conditions for targeting rule', function() {
          var flagKey = 'feature_1';
          var user = new OptimizelyUserContext({
            optimizely: optlyInstance,
            userId
          });
          user.setAttribute('country', 'US');
          var decision = optlyInstance.decide(user, flagKey);
          expect(decision.reasons).to.include(
            sprintf(
              LOG_MESSAGES.USER_MEETS_CONDITIONS_FOR_TARGETING_RULE,
              'DECISION_SERVICE',
              userId,
              '1'
            )
          );
        });

        it('should include reason when user does not meet conditions for targeting rule', function() {
          var flagKey = 'feature_1';
          var user = new OptimizelyUserContext({
            optimizely: optlyInstance,
            userId
          });
          user.setAttribute('country', 'CA');
          var decision = optlyInstance.decide(user, flagKey);
          expect(decision.reasons).to.include(
            sprintf(
              LOG_MESSAGES.USER_DOESNT_MEET_CONDITIONS_FOR_TARGETING_RULE,
              'DECISION_SERVICE',
              userId,
              '1'
            )
          );
        });

        it('should include reason when user is bucketed into targeting rule', function() {
          var flagKey = 'feature_1';
          var user = new OptimizelyUserContext({
            optimizely: optlyInstance,
            userId
          });
          user.setAttribute('country', 'US');
          var decision = optlyInstance.decide(user, flagKey);
          expect(decision.reasons).to.include(
            sprintf(
              LOG_MESSAGES.USER_IN_ROLLOUT,
              'DECISION_SERVICE',
              userId,
              flagKey
            )
          );
        });

        it('should include reason when user is bucketed into everyone targeting rule', function() {
          var flagKey = 'feature_1';
          var user = new OptimizelyUserContext({
            optimizely: optlyInstance,
            userId
          });
          user.setAttribute('country', 'KO');
          var decision = optlyInstance.decide(user, flagKey);
          expect(decision.reasons).to.include(
            sprintf(
              LOG_MESSAGES.USER_MEETS_CONDITIONS_FOR_TARGETING_RULE,
              'DECISION_SERVICE',
              userId,
              'Everyone Else'
            )
          );
        });

        it('should include reason when user is not bucketed into targeting rule', function() {
          var flagKey = 'feature_1';
          var user = new OptimizelyUserContext({
            optimizely: optlyInstance,
            userId
          });
          user.setAttribute('browser', 'safari');
          var decision = optlyInstance.decide(user, flagKey);
          expect(decision.reasons).to.include(
            sprintf(
              LOG_MESSAGES.USER_NOT_BUCKETED_INTO_TARGETING_RULE,
              'DECISION_SERVICE',
              userId,
              '2'
            )
          );
        });

        it('should include reason when user is bucketed into variation of experiment', function() {
          var flagKey = 'feature_2';
          var experimentKey = 'exp_no_audience';
          var variationKey = 'variation_with_traffic';
          var user = new OptimizelyUserContext({
            optimizely: optlyInstance,
            userId
          });
          var decision = optlyInstance.decide(user, flagKey);
          expect(decision.reasons).to.include(
            sprintf(
              LOG_MESSAGES.USER_HAS_VARIATION,
              'DECISION_SERVICE',
              userId,
              variationKey,
              experimentKey,
            )
          );
        });

        it('should include reason when user is not bucketed into variation of experiment', function() {
          var flagKey = 'feature_2';
          var experimentKey = 'exp_no_audience';
          var newConfig = optlyInstance.projectConfigManager.getConfig();
          newConfig.experiments[1].trafficAllocation = [];
          newConfig.experiments[1].trafficAllocation.push({ endOfRange: 0, entityId: 'any' })
          optlyInstance.projectConfigManager.getConfig.returns(newConfig);
          var user = new OptimizelyUserContext({
            optimizely: optlyInstance,
            userId,
            attributes: { 'age': 25 },
          });
          var decision = optlyInstance.decide(user, flagKey);
          expect(decision.reasons).to.include(
            sprintf(
              LOG_MESSAGES.USER_HAS_NO_VARIATION,
              'DECISION_SERVICE',
              userId,
              experimentKey,
            )
          );
        });

        it('should include reason when user is bucketed into experiment in group', function() {
          var flagKey = 'feature_3';
          var experimentId = '10390965532';
          var experimentKey = 'group_exp_1';
          var groupId = '13142870430';
          var newConfig = optlyInstance.projectConfigManager.getConfig();
          newConfig.featureFlags[2].experimentIds.push(experimentId);
          optlyInstance.projectConfigManager.getConfig.returns(newConfig);
          var user = new OptimizelyUserContext({
            optimizely: optlyInstance,
            userId,
          });
          var decision = optlyInstance.decide(user, flagKey);
          expect(decision.reasons).to.include(
            sprintf(
              LOG_MESSAGES.USER_BUCKETED_INTO_EXPERIMENT_IN_GROUP,
              'BUCKETER',
              userId,
              experimentKey,
              groupId
            )
          );
        });

        it('should include reason when user is not attached to any experiment', function() {
          var flagKey = 'feature_3';
          var newConfig = optlyInstance.projectConfigManager.getConfig();
          newConfig.groups[0].trafficAllocation = [];
          optlyInstance.projectConfigManager.getConfig.returns(newConfig);
          var user = new OptimizelyUserContext({
            optimizely: optlyInstance,
            userId,
          });
          var decision = optlyInstance.decide(user, flagKey);
          expect(decision.reasons).to.include(
            sprintf(
              LOG_MESSAGES.FEATURE_HAS_NO_EXPERIMENTS,
              'DECISION_SERVICE',
              flagKey
            )
          );
        });

        it('should include reason when user is not in experiment', function() {
          var flagKey = 'feature_1';
          var experimentKey = 'exp_with_audience';
          var user = new OptimizelyUserContext({
            optimizely: optlyInstance,
            userId,
          });
          var decision = optlyInstance.decide(user, flagKey);
          expect(decision.reasons).to.include(
            sprintf(
              LOG_MESSAGES.USER_NOT_IN_EXPERIMENT,
              'DECISION_SERVICE',
              userId,
              experimentKey
            )
          );
        });

        it('should include reason when condition does not match the audience', function() {
          var flagKey = 'feature_1';
          var audienceId = 'invalid_id';
          var experimentKey = 'exp_with_audience';
          var newConfig = optlyInstance.projectConfigManager.getConfig();
          newConfig.experiments[0].audienceIds = [];
          newConfig.experiments[0].audienceIds.push(audienceId);
          optlyInstance.projectConfigManager.getConfig.returns(newConfig);
          var user = new OptimizelyUserContext({
            optimizely: optlyInstance,
            userId,
          });
          var decision = optlyInstance.decide(user, flagKey);
          expect(decision.reasons).to.include(
            sprintf(
              LOG_MESSAGES.AUDIENCE_EVALUATION_RESULT_COMBINED,
              'DECISION_SERVICE',
              'experiment',
              experimentKey,
              'FALSE'
            )
          );
        });

        it('should include reason when evaluating attribute with invalid type', function() {
          var flagKey = 'feature_1';
          var audienceId = '13389130056';
          var experimentKey = 'exp_with_audience';
          var newConfig = optlyInstance.projectConfigManager.getConfig();
          newConfig.experiments[0].audienceIds = [];
          newConfig.experiments[0].audienceIds.push(audienceId);
          optlyInstance.projectConfigManager.getConfig.returns(newConfig);
          var user = new OptimizelyUserContext({
            optimizely: optlyInstance,
            userId,
            attirutes: { 'country': 25 }
          });
          var decision = optlyInstance.decide(user, flagKey);
          expect(decision.reasons).to.include(
            sprintf(
              LOG_MESSAGES.AUDIENCE_EVALUATION_RESULT_COMBINED,
              'DECISION_SERVICE',
              'experiment',
              experimentKey,
              'FALSE'
            )
          );
        });

        it('should include reason when attribute value is out of range', function() {
          var flagKey = 'feature_1';
          var audienceId = 'age_18';
          var experimentKey = 'exp_with_audience';
          var newConfig = optlyInstance.projectConfigManager.getConfig();
          newConfig.experiments[0].audienceIds = [];
          newConfig.experiments[0].audienceIds.push(audienceId);
          optlyInstance.projectConfigManager.getConfig.returns(newConfig);
          var user = new OptimizelyUserContext({
            optimizely: optlyInstance,
            userId,
            attirutes: { 'age': 10000 }
          });
          var decision = optlyInstance.decide(user, flagKey);
          expect(decision.reasons).to.include(
            sprintf(
              LOG_MESSAGES.AUDIENCE_EVALUATION_RESULT_COMBINED,
              'DECISION_SERVICE',
              'experiment',
              experimentKey,
              'FALSE'
            )
          );
        });

        it('should include reason when provided invalid type user attribute', function() {
          var flagKey = 'feature_1';
          var audienceId = 'invalid_type';
          var experimentKey = 'exp_with_audience';
          var newConfig = optlyInstance.projectConfigManager.getConfig();
          newConfig.experiments[0].audienceIds = [];
          newConfig.experiments[0].audienceIds.push(audienceId);
          optlyInstance.projectConfigManager.getConfig.returns(newConfig);
          var user = new OptimizelyUserContext({
            optimizely: optlyInstance,
            userId,
            attirutes: { 'age': 25 }
          });
          var decision = optlyInstance.decide(user, flagKey);
          expect(decision.reasons).to.include(
            sprintf(
              LOG_MESSAGES.AUDIENCE_EVALUATION_RESULT_COMBINED,
              'DECISION_SERVICE',
              'experiment',
              experimentKey,
              'FALSE'
            )
          );
        });

        it('should include reason when audience id is invalid_type', function() {
          var flagKey = 'feature_1';
          var audienceId = 'invalid_type';
          var experimentKey = 'exp_with_audience';
          var newConfig = optlyInstance.projectConfigManager.getConfig();
          newConfig.experiments[0].audienceIds = [];
          newConfig.experiments[0].audienceIds.push(audienceId);
          optlyInstance.projectConfigManager.getConfig.returns(newConfig);
          var user = new OptimizelyUserContext({
            optimizely: optlyInstance,
            userId,
            attirutes: { 'age': 25 }
          });
          var decision = optlyInstance.decide(user, flagKey);
          expect(decision.reasons).to.include(
            sprintf(
              LOG_MESSAGES.AUDIENCE_EVALUATION_RESULT_COMBINED,
              'DECISION_SERVICE',
              'experiment',
              experimentKey,
              'FALSE'
            )
          );
        });

        it('should include reason when audience id is invalid_match', function() {
          var flagKey = 'feature_1';
          var audienceId = 'invalid_match';
          var experimentKey = 'exp_with_audience';
          var newConfig = optlyInstance.projectConfigManager.getConfig();
          newConfig.experiments[0].audienceIds = [];
          newConfig.experiments[0].audienceIds.push(audienceId);
          optlyInstance.projectConfigManager.getConfig.returns(newConfig);
          var user = new OptimizelyUserContext({
            optimizely: optlyInstance,
            userId,
            attirutes: { 'age': 25 }
          });
          var decision = optlyInstance.decide(user, flagKey);
          expect(decision.reasons).to.include(
            sprintf(
              LOG_MESSAGES.AUDIENCE_EVALUATION_RESULT_COMBINED,
              'DECISION_SERVICE',
              'experiment',
              experimentKey,
              'FALSE'
            )
          );
        });

        it('should include reason when audience id is nil_value', function() {
          var flagKey = 'feature_1';
          var audienceId = 'nil_value';
          var experimentKey = 'exp_with_audience';
          var newConfig = optlyInstance.projectConfigManager.getConfig();
          newConfig.experiments[0].audienceIds = [];
          newConfig.experiments[0].audienceIds.push(audienceId);
          optlyInstance.projectConfigManager.getConfig.returns(newConfig);
          var user = new OptimizelyUserContext({
            optimizely: optlyInstance,
            userId,
            attirutes: { 'age': 25 }
          });
          var decision = optlyInstance.decide(user, flagKey);
          expect(decision.reasons).to.include(
            sprintf(
              LOG_MESSAGES.AUDIENCE_EVALUATION_RESULT_COMBINED,
              'DECISION_SERVICE',
              'experiment',
              experimentKey,
              'FALSE'
            )
          );
        });

        it('should include reason when user attributes is missing', function() {
          var flagKey = 'feature_1';
          var audienceId = 'age_18';
          var experimentKey = 'exp_with_audience';
          var newConfig = optlyInstance.projectConfigManager.getConfig();
          newConfig.experiments[0].audienceIds = [];
          newConfig.experiments[0].audienceIds.push(audienceId);
          optlyInstance.projectConfigManager.getConfig.returns(newConfig);
          var user = new OptimizelyUserContext({
            optimizely: optlyInstance,
            userId
          });
          var decision = optlyInstance.decide(user, flagKey);
          expect(decision.reasons).to.include(
            sprintf(
              LOG_MESSAGES.AUDIENCE_EVALUATION_RESULT_COMBINED,
              'DECISION_SERVICE',
              'experiment',
              experimentKey,
              'FALSE'
            )
          );
        });
      });

      describe('when user profile service provided', function() {
        var mockUserProfileServiceInstance;
        var optlyInstanceWithUserProfile;
        it('should bucket if there was no previously bucketed variation and save bucketing decision to the user profile', function() {
          var flagKey = 'feature_2';           // embedding experiment: 'exp_no_audience'
          var variationId1 = '10418551353';
          var variationKey1 = 'variation_with_traffic';
          mockUserProfileServiceInstance = {
            lookup: sinon.stub().returns({
              user_id: userId,
              experiment_bucket_map: {},
            }),
            save: sinon.stub()
          };
          optlyInstanceWithUserProfile = new Optimizely({
            clientEngine: 'node-sdk',
            datafile: testData.getTestDecideProjectConfig(),
            errorHandler: errorHandler,
            eventDispatcher: eventDispatcher,
            jsonSchemaValidator: jsonSchemaValidator,
            userProfileService: mockUserProfileServiceInstance,
            logger: createdLogger,
            isValidInstance: true,
            eventBatchSize: 1,
            notificationCenter,
            eventProcessor,
          });
          var user = new OptimizelyUserContext({
            optimizely: optlyInstanceWithUserProfile,
            userId
          });
          var decision1 = optlyInstanceWithUserProfile.decide(user, flagKey);
          // should return variationId1 as no stored variation exists
          assert.equal(variationKey1, decision1.variationKey);
          // also should call mockUserProfileServiceInstance.save to save bucketing decision
          sinon.assert.calledOnce(mockUserProfileServiceInstance.save);
        });

        describe('with IGNORE_USER_PROFILE_SERVICE flag in decide options', function() {
          it('should bypass user profile service', function() {
            var flagKey = 'feature_2';           // embedding experiment: 'exp_no_audience'
            var variationId1 = '10418551353';
            var variationId2 = '10418510624';
            var variationKey1 = 'variation_with_traffic';
            var variationKey2 = 'variation_no_traffic';
            mockUserProfileServiceInstance = {
              lookup: sinon.stub().returns({
                user_id: userId,
                experiment_bucket_map: {
                  '10420810910': { // 'exp_no_audience'
                    variation_id: variationId2,
                  },
                },
              }),
              save: sinon.stub()
            };
            optlyInstanceWithUserProfile = new Optimizely({
              clientEngine: 'node-sdk',
              datafile: testData.getTestDecideProjectConfig(),
              errorHandler: errorHandler,
              eventDispatcher: eventDispatcher,
              jsonSchemaValidator: jsonSchemaValidator,
              userProfileService: mockUserProfileServiceInstance,
              logger: createdLogger,
              isValidInstance: true,
              eventBatchSize: 1,
              notificationCenter,
              eventProcessor,
            });
            var user = new OptimizelyUserContext({
              optimizely: optlyInstanceWithUserProfile,
              userId
            });
            var decision1 = optlyInstanceWithUserProfile.decide(user, flagKey);
            // should return variationId2 set by UPS
            assert.equal(variationKey2, decision1.variationKey);
            var decision2 = optlyInstanceWithUserProfile.decide(user, flagKey, [ OptimizelyDecideOption.IGNORE_USER_PROFILE_SERVICE ]);
            // should ignore variationId2 set by UPS and return variationId1
            assert.equal(variationKey1, decision2.variationKey);
            // also should not save either
            sinon.assert.notCalled(mockUserProfileServiceInstance.save);
          });
        });

        describe('with IGNORE_USER_PROFILE_SERVICE flag in default decide options', function() {
          it('should bypass user profile service', function() {
            var flagKey = 'feature_2';           // embedding experiment: 'exp_no_audience'
            var variationId2 = '10418510624';
            var variationKey1 = 'variation_with_traffic';
            mockUserProfileServiceInstance = {
              lookup: sinon.stub().returns({
                user_id: userId,
                experiment_bucket_map: {
                  '10420810910': { // 'exp_no_audience'
                    variation_id: variationId2,
                  },
                },
              }),
              save: sinon.stub()
            };
            optlyInstanceWithUserProfile = new Optimizely({
              clientEngine: 'node-sdk',
              datafile: testData.getTestDecideProjectConfig(),
              errorHandler: errorHandler,
              eventDispatcher: eventDispatcher,
              jsonSchemaValidator: jsonSchemaValidator,
              userProfileService: mockUserProfileServiceInstance,
              logger: createdLogger,
              isValidInstance: true,
              eventBatchSize: 1,
              defaultDecideOptions: [ OptimizelyDecideOption.IGNORE_USER_PROFILE_SERVICE ],
              notificationCenter,
              eventProcessor,
            });
            var user = new OptimizelyUserContext({
              optimizely: optlyInstanceWithUserProfile,
              userId
            });
            var decision = optlyInstanceWithUserProfile.decide(user, flagKey);
            // should ignore variationId2 set by UPS and return variationId1
            assert.equal(variationKey1, decision.variationKey);
            // also should not save either
            sinon.assert.notCalled(mockUserProfileServiceInstance.save);
          });
        });
      });
    });

    describe('#decideForKeys', function() {
      var userId = 'tester';
      beforeEach(function() {
        optlyInstance = new Optimizely({
          clientEngine: 'node-sdk',
          datafile: testData.getTestDecideProjectConfig(),
          errorHandler: errorHandler,
          eventDispatcher: eventDispatcher,
          jsonSchemaValidator: jsonSchemaValidator,
          logger: createdLogger,
          isValidInstance: true,
          eventBatchSize: 1,
          defaultDecideOptions: [],
          notificationCenter,
          eventProcessor,
        });

        sinon.stub(optlyInstance.notificationCenter, 'sendNotifications');
      });

      afterEach(function() {
        optlyInstance.notificationCenter.sendNotifications.restore();
      });

      it('should return decision results map with single flag key provided for feature_test and dispatch an event', function() {
        var flagKey = 'feature_2';
        var user = optlyInstance.createUserContext(userId);
        var expectedVariables = optlyInstance.getAllFeatureVariables(flagKey, userId);
        var decisionsMap = optlyInstance.decideForKeys(user, [ flagKey ]);
        var decision = decisionsMap[flagKey];
        var expectedDecision = {
          variationKey: 'variation_with_traffic',
          enabled: true,
          variables: expectedVariables,
          ruleKey: 'exp_no_audience',
          flagKey: flagKey,
          userContext: user,
          reasons: [],
        }
        assert.deepEqual(Object.values(decisionsMap).length, 1);
        assert.deepEqual(decision, expectedDecision);
        sinon.assert.calledOnce(eventDispatcher.dispatchEvent);
        sinon.assert.callCount(optlyInstance.notificationCenter.sendNotifications, 4)
        var notificationCallArgs = optlyInstance.notificationCenter.sendNotifications.getCall(3).args;
        var decisionEventDispatched = notificationCallArgs[1].decisionInfo.decisionEventDispatched;
        assert.deepEqual(decisionEventDispatched, true);
      });

      it('should return decision results map with two flag keys provided and dispatch events', function() {
        var flagKeysArray = ['feature_1', 'feature_2'];
        var user = optlyInstance.createUserContext(userId);
        var expectedVariables1 = optlyInstance.getAllFeatureVariables(flagKeysArray[0], userId);
        var expectedVariables2 = optlyInstance.getAllFeatureVariables(flagKeysArray[1], userId);
        var decisionsMap = optlyInstance.decideForKeys(user, flagKeysArray);
        var decision1 = decisionsMap[flagKeysArray[0]];
        var decision2 = decisionsMap[flagKeysArray[1]];
        var expectedDecision1 = {
          variationKey: '18257766532',
          enabled: true,
          variables: expectedVariables1,
          ruleKey: '18322080788',
          flagKey: flagKeysArray[0],
          userContext: user,
          reasons: [],
        }
        var expectedDecision2 = {
          variationKey: 'variation_with_traffic',
          enabled: true,
          variables: expectedVariables2,
          ruleKey: 'exp_no_audience',
          flagKey: flagKeysArray[1],
          userContext: user,
          reasons: [],
        }
        assert.deepEqual(Object.values(decisionsMap).length, 2);
        assert.deepEqual(decision1, expectedDecision1);
        assert.deepEqual(decision2, expectedDecision2);
        sinon.assert.calledTwice(eventDispatcher.dispatchEvent);
      });

      it('should return decision results map with only enabled flags when ENABLED_FLAGS_ONLY flag is passed in and dispatch events', function() {
        var flagKey1 = 'feature_2';
        var flagKey2 = 'feature_3';
        var user = optlyInstance.createUserContext(userId, { gender: 'female' });
        var expectedVariables = optlyInstance.getAllFeatureVariables(flagKey1, userId);
        var decisionsMap = optlyInstance.decideForKeys(user, [ flagKey1, flagKey2 ], [ OptimizelyDecideOption.ENABLED_FLAGS_ONLY ]);
        var decision = decisionsMap[flagKey1];
        var expectedDecision = {
          variationKey: 'variation_with_traffic',
          enabled: true,
          variables: expectedVariables,
          ruleKey: 'exp_no_audience',
          flagKey: flagKey1,
          userContext: user,
          reasons: [],
        }
        assert.deepEqual(Object.values(decisionsMap).length, 1);
        assert.deepEqual(decision, expectedDecision);
        sinon.assert.calledTwice(eventDispatcher.dispatchEvent);
      });
    });

    describe('#decideAll', function() {
      var userId = 'tester';
      describe('with empty default decide options', function() {
        beforeEach(function() {
          optlyInstance = new Optimizely({
            clientEngine: 'node-sdk',
            datafile: testData.getTestDecideProjectConfig(),
            errorHandler: errorHandler,
            eventDispatcher: eventDispatcher,
            jsonSchemaValidator: jsonSchemaValidator,
            logger: createdLogger,
            isValidInstance: true,
            eventBatchSize: 1,
            defaultDecideOptions: [],
            notificationCenter,
            eventProcessor,
          });

          sinon.stub(optlyInstance.notificationCenter, 'sendNotifications');
        });

        afterEach(function() {
          optlyInstance.notificationCenter.sendNotifications.restore();
        });

        it('should return decision results map with all flag keys provided and dispatch events', function() {
          var configObj = optlyInstance.projectConfigManager.getConfig();
          var allFlagKeysArray = Object.keys(configObj.featureKeyMap);
          var user = optlyInstance.createUserContext(userId);
          var expectedVariables1 = optlyInstance.getAllFeatureVariables(allFlagKeysArray[0], userId);
          var expectedVariables2 = optlyInstance.getAllFeatureVariables(allFlagKeysArray[1], userId);
          var expectedVariables3 = optlyInstance.getAllFeatureVariables(allFlagKeysArray[2], userId);
          var decisionsMap = user.decideAll(allFlagKeysArray);
          var decision1 = decisionsMap[allFlagKeysArray[0]];
          var decision2 = decisionsMap[allFlagKeysArray[1]];
          var decision3 = decisionsMap[allFlagKeysArray[2]];
          var expectedDecision1 = {
            variationKey: '18257766532',
            enabled: true,
            variables: expectedVariables1,
            ruleKey: '18322080788',
            flagKey: allFlagKeysArray[0],
            userContext: user,
            reasons: [],
          }
          var expectedDecision2 = {
            variationKey: 'variation_with_traffic',
            enabled: true,
            variables: expectedVariables2,
            ruleKey: 'exp_no_audience',
            flagKey: allFlagKeysArray[1],
            userContext: user,
            reasons: [],
          }
          var expectedDecision3 = {
            variationKey: null,
            enabled: false,
            variables: expectedVariables3,
            ruleKey: null,
            flagKey: allFlagKeysArray[2],
            userContext: user,
            reasons: [],
          }
          assert.deepEqual(Object.values(decisionsMap).length, allFlagKeysArray.length);
          assert.deepEqual(decision1, expectedDecision1);
          assert.deepEqual(decision2, expectedDecision2);
          assert.deepEqual(decision3, expectedDecision3);
          sinon.assert.calledThrice(eventDispatcher.dispatchEvent);
        });

        it('should return decision results map with only enabled flags when ENABLED_FLAGS_ONLY flag is passed in and dispatch events', function() {
          var flagKey1 = 'feature_1';
          var flagKey2 = 'feature_2';
          var user = optlyInstance.createUserContext(userId, { gender: 'female' });
          var expectedVariables1 = optlyInstance.getAllFeatureVariables(flagKey1, userId);
          var expectedVariables2 = optlyInstance.getAllFeatureVariables(flagKey2, userId);
          var decisionsMap = optlyInstance.decideAll(user, [ OptimizelyDecideOption.ENABLED_FLAGS_ONLY ]);
          var decision1 = decisionsMap[flagKey1];
          var decision2 = decisionsMap[flagKey2];
          var expectedDecision1 = {
            variationKey: '18257766532',
            enabled: true,
            variables: expectedVariables1,
            ruleKey: '18322080788',
            flagKey: flagKey1,
            userContext: user,
            reasons: [],
          }
          var expectedDecision2 = {
            variationKey: 'variation_with_traffic',
            enabled: true,
            variables: expectedVariables2,
            ruleKey: 'exp_no_audience',
            flagKey: flagKey2,
            userContext: user,
            reasons: [],
          }
          assert.deepEqual(Object.values(decisionsMap).length, 2);
          assert.deepEqual(decision1, expectedDecision1);
          assert.deepEqual(decision2, expectedDecision2);
          sinon.assert.calledThrice(eventDispatcher.dispatchEvent);
        });
      });

      describe('with ENABLED_FLAGS_ONLY flag in default decide options', function() {
        beforeEach(function() {
          optlyInstance = new Optimizely({
            clientEngine: 'node-sdk',
            datafile: testData.getTestDecideProjectConfig(),
            errorHandler: errorHandler,
            eventDispatcher: eventDispatcher,
            jsonSchemaValidator: jsonSchemaValidator,
            logger: createdLogger,
            isValidInstance: true,
            eventBatchSize: 1,
            defaultDecideOptions: [ OptimizelyDecideOption.ENABLED_FLAGS_ONLY ],
            eventProcessor,
            notificationCenter,
          });

          sinon.stub(optlyInstance.notificationCenter, 'sendNotifications');
        });

        afterEach(function() {
          optlyInstance.notificationCenter.sendNotifications.restore();
        });

        it('should return decision results map with only enabled flags and dispatch events', function() {
          var flagKey1 = 'feature_1';
          var flagKey2 = 'feature_2';
          var user = optlyInstance.createUserContext(userId, { gender: 'female' });
          var expectedVariables1 = optlyInstance.getAllFeatureVariables(flagKey1, userId);
          var expectedVariables2 = optlyInstance.getAllFeatureVariables(flagKey2, userId);
          var decisionsMap = optlyInstance.decideAll(user);
          var decision1 = decisionsMap[flagKey1];
          var decision2 = decisionsMap[flagKey2];
          var expectedDecision1 = {
            variationKey: '18257766532',
            enabled: true,
            variables: expectedVariables1,
            ruleKey: '18322080788',
            flagKey: flagKey1,
            userContext: user,
            reasons: [],
          }
          var expectedDecision2 = {
            variationKey: 'variation_with_traffic',
            enabled: true,
            variables: expectedVariables2,
            ruleKey: 'exp_no_audience',
            flagKey: flagKey2,
            userContext: user,
            reasons: [],
          }
          assert.deepEqual(Object.values(decisionsMap).length, 2);
          assert.deepEqual(decision1, expectedDecision1);
          assert.deepEqual(decision2, expectedDecision2);
          sinon.assert.calledThrice(eventDispatcher.dispatchEvent);
        });

        it('should return decision results map with only enabled flags and excluded variables when EXCLUDE_VARIABLES_FLAG is passed in', function() {
          var flagKey1 = 'feature_1';
          var flagKey2 = 'feature_2';
          var user = optlyInstance.createUserContext(userId, { gender: 'female' });
          var decisionsMap = optlyInstance.decideAll(user, [ OptimizelyDecideOption.EXCLUDE_VARIABLES ]);
          var decision1 = decisionsMap[flagKey1];
          var decision2 = decisionsMap[flagKey2];
          var expectedDecision1 = {
            variationKey: '18257766532',
            enabled: true,
            variables: {},
            ruleKey: '18322080788',
            flagKey: flagKey1,
            userContext: user,
            reasons: [],
          }
          var expectedDecision2 = {
            variationKey: 'variation_with_traffic',
            enabled: true,
            variables: {},
            ruleKey: 'exp_no_audience',
            flagKey: flagKey2,
            userContext: user,
            reasons: [],
          }
          assert.deepEqual(Object.values(decisionsMap).length, 2);
          assert.deepEqual(decision1, expectedDecision1);
          assert.deepEqual(decision2, expectedDecision2);
          sinon.assert.calledThrice(eventDispatcher.dispatchEvent);
        });
      });
    });
  });

  //tests separated out from APIs because of mock bucketing
  describe('getVariationBucketingIdAttribute', function() {
    var optlyInstance;
    var createdLogger = logger.createLogger({
      logLevel: LOG_LEVEL.INFO,
      logToConsole: false,
    });
    var notificationCenter = createNotificationCenter({ logger: createdLogger, errorHandler: errorHandler });
    var eventProcessor = createEventProcessor({
      dispatcher: eventDispatcher,
      batchSize: 1,
      notificationCenter: notificationCenter,
    });
    beforeEach(function() {
      optlyInstance = new Optimizely({
        clientEngine: 'node-sdk',
        datafile: testData.getTestProjectConfig(),
        errorHandler: errorHandler,
        eventDispatcher: eventDispatcher,
        jsonSchemaValidator: jsonSchemaValidator,
        logger: createdLogger,
        isValidInstance: true,
        notificationCenter,
        eventProcessor,
      });
    });

    var userAttributes = {
      browser_type: 'firefox',
    };
    var userAttributesWithBucketingId = {
      browser_type: 'firefox',
      $opt_bucketing_id: '123456789',
    };

    it('confirm that a valid variation is bucketed without the bucketing ID', function() {
      assert.strictEqual(
        'controlWithAudience',
        optlyInstance.getVariation('testExperimentWithAudiences', 'testUser', userAttributes)
      );
    });

    it('confirm that an invalid audience returns null', function() {
      assert.strictEqual(null, optlyInstance.getVariation('testExperimentWithAudiences', 'testUser'));
    });

    it('confirm that a valid variation is bucketed with the bucketing ID', function() {
      assert.strictEqual(
        'variationWithAudience',
        optlyInstance.getVariation('testExperimentWithAudiences', 'testUser', userAttributesWithBucketingId)
      );
    });

    it('confirm that invalid experiment with the bucketing ID returns null', function() {
      assert.strictEqual(
        null,
        optlyInstance.getVariation('invalidExperimentKey', 'testUser', userAttributesWithBucketingId)
      );
    });
  });

  describe('feature management', function() {
    var sandbox = sinon.sandbox.create();
    var createdLogger = logger.createLogger({
      logLevel: LOG_LEVEL.INFO,
      logToConsole: false,
    });
    var optlyInstance;
    var fakeDecisionResponse;
    var notificationCenter = createNotificationCenter({ logger: createdLogger, errorHandler: errorHandler });
    var eventProcessor = createEventProcessor({
      dispatcher: eventDispatcher,
      batchSize: 1,
      notificationCenter: notificationCenter,
    });

    beforeEach(function() {
      optlyInstance = new Optimizely({
        clientEngine: 'node-sdk',
        datafile: testData.getTestProjectConfigWithFeatures(),
        errorHandler: errorHandler,
        eventDispatcher: eventDispatcher,
        jsonSchemaValidator: jsonSchemaValidator,
        logger: createdLogger,
        isValidInstance: true,
        eventBatchSize: 1,
        notificationCenter,
        eventProcessor,
      });

      sandbox.stub(errorHandler, 'handleError');
      sandbox.stub(createdLogger, 'log');
      sandbox.stub(fns, 'uuid').returns('a68cf1ad-0393-4e18-af87-efe8f01a7c9c');
      sandbox.stub(fns, 'currentTimestamp').returns(1509489766569);
    });

    afterEach(function() {
      sandbox.restore();
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
            message: 'this is not a valid datafile',
          },
          errorHandler: errorHandler,
          eventDispatcher: eventDispatcher,
          jsonSchemaValidator: jsonSchemaValidator,
          logger: createdLogger,
          eventProcessor,
          notificationCenter,
        });
        var result = optlyInstance.isFeatureEnabled('test_feature_for_experiment', 'user1');
        assert.strictEqual(result, false);
        assert.equal(
            buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'OPTIMIZELY: Optimizely object is not valid. Failing isFeatureEnabled.'
        );
      });

      describe('when the user bucketed into a variation of an experiment with the feature', function() {
        var attributes = { test_attribute: 'test_value' };

        describe('when the variation is toggled ON', function() {
          beforeEach(function() {
            var experiment = optlyInstance.projectConfigManager.getConfig().experimentKeyMap.testing_my_feature;
            var variation = experiment.variations[0];
            var decisionObj = {
              experiment: experiment,
              variation: variation,
              decisionSource: DECISION_SOURCES.FEATURE_TEST,
            };
            fakeDecisionResponse = {
              result: decisionObj,
              reasons: [],
            };
            sandbox.stub(optlyInstance.decisionService, 'getVariationForFeature').returns(fakeDecisionResponse);
          });

          it('returns true and dispatches an impression event', function() {
            var user = optlyInstance.createUserContext('user1', attributes);
            var result = optlyInstance.isFeatureEnabled('test_feature_for_experiment', 'user1', attributes);
            assert.strictEqual(result, true);
            sinon.assert.calledOnce(optlyInstance.decisionService.getVariationForFeature);
            var feature = optlyInstance.projectConfigManager.getConfig().featureKeyMap.test_feature_for_experiment;
            sinon.assert.calledWithExactly(
              optlyInstance.decisionService.getVariationForFeature,
              optlyInstance.projectConfigManager.getConfig(),
              feature,
              user
            );

            sinon.assert.calledOnce(eventDispatcher.dispatchEvent);
            var expectedImpressionEvent = {
              httpVerb: 'POST',
              url: 'https://logx.optimizely.com/v1/events',
              params: {
                account_id: '572018',
                project_id: '594001',
                visitors: [
                  {
                    snapshots: [
                      {
                        decisions: [
                          {
                            campaign_id: '594093',
                            experiment_id: '594098',
                            variation_id: '594096',
                            metadata: {
                              flag_key: 'test_feature_for_experiment',
                              rule_key: 'testing_my_feature',
                              rule_type: 'feature-test',
                              variation_key: 'variation',
                              enabled: true,
                            },
                          },
                        ],
                        events: [
                          {
                            entity_id: '594093',
                            timestamp: 1509489766569,
                            key: 'campaign_activated',
                            uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                          },
                        ],
                      },
                    ],
                    visitor_id: 'user1',
                    attributes: [
                      {
                        entity_id: '594014',
                        key: 'test_attribute',
                        type: 'custom',
                        value: 'test_value',
                      },
                      {
                        entity_id: '$opt_bot_filtering',
                        key: '$opt_bot_filtering',
                        type: 'custom',
                        value: true,
                      },
                    ],
                  },
                ],
                revision: '35',
                client_name: 'node-sdk',
                client_version: enums.NODE_CLIENT_VERSION,
                anonymize_ip: true,
                enrich_decisions: true,
              },
            };
            var callArgs = eventDispatcher.dispatchEvent.getCalls()[0].args;
            assert.deepEqual(callArgs[0], expectedImpressionEvent);
            assert.isFunction(callArgs[1]);            
            assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
              'OPTIMIZELY: Feature test_feature_for_experiment is enabled for user user1.'
            );
          });

          it('returns false and does not dispatch an impression event when feature key is null', function() {
            var result = optlyInstance.isFeatureEnabled(null, 'user1', attributes);
            assert.strictEqual(result, false);
            sinon.assert.notCalled(eventDispatcher.dispatchEvent);
            sinon.assert.calledWithExactly(
              createdLogger.log,
              LOG_LEVEL.ERROR,
              'OPTIMIZELY: Provided feature_key is in an invalid format.'
            );
          });

          it('returns false when user id is null', function() {
            var result = optlyInstance.isFeatureEnabled('test_feature_for_experiment', null, attributes);
            assert.strictEqual(result, false);
            sinon.assert.notCalled(eventDispatcher.dispatchEvent);
            sinon.assert.calledWithExactly(
              createdLogger.log,
              LOG_LEVEL.ERROR,
              'OPTIMIZELY: Provided user_id is in an invalid format.'
            );
          });

          it('returns false when feature key and user id are null', function() {
            var result = optlyInstance.isFeatureEnabled(null, null, attributes);
            assert.strictEqual(result, false);
            sinon.assert.notCalled(eventDispatcher.dispatchEvent);
            sinon.assert.calledWithExactly(
              createdLogger.log,
              LOG_LEVEL.ERROR,
              'OPTIMIZELY: Provided user_id is in an invalid format.'
            );
          });

          it('returns false when feature key is undefined', function() {
            var result = optlyInstance.isFeatureEnabled(undefined, 'user1', attributes);
            assert.strictEqual(result, false);
            sinon.assert.notCalled(eventDispatcher.dispatchEvent);
            sinon.assert.calledWithExactly(
              createdLogger.log,
              LOG_LEVEL.ERROR,
              'OPTIMIZELY: Provided feature_key is in an invalid format.'
            );
          });

          it('returns false when user id is undefined', function() {
            var result = optlyInstance.isFeatureEnabled('test_feature_for_experiment', undefined, attributes);
            assert.strictEqual(result, false);
            sinon.assert.notCalled(eventDispatcher.dispatchEvent);
            sinon.assert.calledWithExactly(
              createdLogger.log,
              LOG_LEVEL.ERROR,
              'OPTIMIZELY: Provided user_id is in an invalid format.'
            );
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
            sinon.assert.calledWithExactly(
              createdLogger.log,
              LOG_LEVEL.ERROR,
              'OPTIMIZELY: Provided user_id is in an invalid format.'
            );
          });

          it('returns false when user id is an object', function() {
            var result = optlyInstance.isFeatureEnabled('test_feature_for_experiment', {}, attributes);
            assert.strictEqual(result, false);
            sinon.assert.notCalled(eventDispatcher.dispatchEvent);
            sinon.assert.calledWithExactly(
              createdLogger.log,
              LOG_LEVEL.ERROR,
              'OPTIMIZELY: Provided user_id is in an invalid format.'
            );
          });

          it('returns false when user id is a number', function() {
            var result = optlyInstance.isFeatureEnabled('test_feature_for_experiment', 72, attributes);
            assert.strictEqual(result, false);
            sinon.assert.notCalled(eventDispatcher.dispatchEvent);
            sinon.assert.calledWithExactly(
              createdLogger.log,
              LOG_LEVEL.ERROR,
              'OPTIMIZELY: Provided user_id is in an invalid format.'
            );
          });

          it('returns false when feature key is an array', function() {
            var result = optlyInstance.isFeatureEnabled(['a', 'feature'], 'user1', attributes);
            assert.strictEqual(result, false);
            sinon.assert.notCalled(eventDispatcher.dispatchEvent);
            sinon.assert.calledWithExactly(
              createdLogger.log,
              LOG_LEVEL.ERROR,
              'OPTIMIZELY: Provided feature_key is in an invalid format.'
            );
          });

          it('returns true when user id is an empty string', function() {
            var result = optlyInstance.isFeatureEnabled('test_feature_for_experiment', '', attributes);
            assert.strictEqual(result, true);
            sinon.assert.calledOnce(eventDispatcher.dispatchEvent);
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
            var experiment = optlyInstance.projectConfigManager.getConfig().experimentKeyMap.test_shared_feature;
            var variation = experiment.variations[1];
            var decisionObj = {
              experiment: experiment,
              variation: variation,
              decisionSource: DECISION_SOURCES.FEATURE_TEST,
            };
            fakeDecisionResponse = {
              result: decisionObj,
              reasons: [],
            };
            sandbox.stub(optlyInstance.decisionService, 'getVariationForFeature').returns(fakeDecisionResponse);
            result = optlyInstance.isFeatureEnabled('shared_feature', 'user1', attributes);
          });

          it('should return false', function() {
            assert.strictEqual(result, false);
            sinon.assert.calledOnce(optlyInstance.decisionService.getVariationForFeature);
            var feature = optlyInstance.projectConfigManager.getConfig().featureKeyMap.shared_feature;
            var user = optlyInstance.createUserContext('user1', attributes);
            sinon.assert.calledWithExactly(
              optlyInstance.decisionService.getVariationForFeature,
              optlyInstance.projectConfigManager.getConfig(),
              feature,
              user
            );
          });

          it('should dispatch an impression event', function() {
            sinon.assert.calledOnce(eventDispatcher.dispatchEvent);
            var expectedImpressionEvent = {
              httpVerb: 'POST',
              url: 'https://logx.optimizely.com/v1/events',
              params: {
                account_id: '572018',
                project_id: '594001',
                visitors: [
                  {
                    snapshots: [
                      {
                        decisions: [
                          {
                            campaign_id: '599023',
                            experiment_id: '599028',
                            variation_id: '599027',
                            metadata: {
                              flag_key: 'shared_feature',
                              rule_key: 'test_shared_feature',
                              rule_type: 'feature-test',
                              variation_key: 'control',
                              enabled: false,
                            },
                          },
                        ],
                        events: [
                          {
                            entity_id: '599023',
                            timestamp: 1509489766569,
                            key: 'campaign_activated',
                            uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                          },
                        ],
                      },
                    ],
                    visitor_id: 'user1',
                    attributes: [
                      {
                        entity_id: '594014',
                        key: 'test_attribute',
                        type: 'custom',
                        value: 'test_value',
                      },
                      {
                        entity_id: '$opt_bot_filtering',
                        key: '$opt_bot_filtering',
                        type: 'custom',
                        value: true,
                      },
                    ],
                  },
                ],
                revision: '35',
                client_name: 'node-sdk',
                client_version: enums.NODE_CLIENT_VERSION,
                anonymize_ip: true,
                enrich_decisions: true,
              },
            };
            var callArgs = eventDispatcher.dispatchEvent.getCalls()[0].args;
            assert.deepEqual(callArgs[0], expectedImpressionEvent);
            assert.isFunction(callArgs[1]);
          });
        });

        describe('when the variation is missing the toggle', function() {
          beforeEach(function() {
            var experiment = optlyInstance.projectConfigManager.getConfig().experimentKeyMap.test_shared_feature;
            var variation = experiment.variations[0];
            delete variation['featureEnabled'];
            sandbox.stub(optlyInstance.decisionService, 'getVariationForFeature').returns({
              experiment: experiment,
              variation: variation,
              decisionSource: DECISION_SOURCES.FEATURE_TEST,
            });
          });

          it('should return false', function() {
            var result = optlyInstance.isFeatureEnabled('shared_feature', 'user1', attributes);
            var user = optlyInstance.createUserContext('user1', attributes);
            assert.strictEqual(result, false);
            sinon.assert.calledOnce(optlyInstance.decisionService.getVariationForFeature);
            var feature = optlyInstance.projectConfigManager.getConfig().featureKeyMap.shared_feature;
            sinon.assert.calledWithExactly(
              optlyInstance.decisionService.getVariationForFeature,
              optlyInstance.projectConfigManager.getConfig(),
              feature,
              user
            );
          });
        });
      });

      describe('user bucketed into a variation of a rollout of the feature', function() {
        describe('when the variation is toggled ON', function() {
          beforeEach(function() {
            // This experiment is the first audience targeting rule in the rollout of feature 'test_feature'
            var experiment = optlyInstance.projectConfigManager.getConfig().experimentKeyMap['594031'];
            var variation = experiment.variations[0];
            var decisionObj = {
              experiment: experiment,
              variation: variation,
              decisionSource: DECISION_SOURCES.ROLLOUT,
            };
            fakeDecisionResponse = {
              result: decisionObj,
              reasons: [],
            };
            sandbox.stub(optlyInstance.decisionService, 'getVariationForFeature').returns(fakeDecisionResponse);
          });

          it('returns true and does not dispatch an event', function() {
            var result = optlyInstance.isFeatureEnabled('test_feature', 'user1', {
              test_attribute: 'test_value',
            });
            assert.strictEqual(result, true);
            sinon.assert.notCalled(eventDispatcher.dispatchEvent);
            assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
              'OPTIMIZELY: Feature test_feature is enabled for user user1.'
            );
          });
        });

        describe('when the variation is toggled OFF', function() {
          beforeEach(function() {
            // This experiment is the second audience targeting rule in the rollout of feature 'test_feature'
            var experiment = optlyInstance.projectConfigManager.getConfig().experimentKeyMap['594037'];
            var variation = experiment.variations[0];
            var decisionObj = {
              experiment: experiment,
              variation: variation,
              decisionSource: DECISION_SOURCES.ROLLOUT,
            };
            fakeDecisionResponse = {
              result: decisionObj,
              reasons: [],
            };
            sandbox.stub(optlyInstance.decisionService, 'getVariationForFeature').returns(fakeDecisionResponse);
          });

          it('returns false', function() {
            var result = optlyInstance.isFeatureEnabled('test_feature', 'user1', {
              test_attribute: 'test_value',
            });
            assert.strictEqual(result, false);
            assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
              'OPTIMIZELY: Feature test_feature is not enabled for user user1.'
            );
          });
        });
      });

      describe('user not bucketed into an experiment or a rollout', function() {
        beforeEach(function() {
          var decisionObj = {
            experiment: null,
            variation: null,
            decisionSource: DECISION_SOURCES.ROLLOUT,
          };
          fakeDecisionResponse = {
            result: decisionObj,
            reasons: [],
          };
          sandbox.stub(optlyInstance.decisionService, 'getVariationForFeature').returns(fakeDecisionResponse);
        });

        it('returns false and does not dispatch an event when sendFlagDecisions is not defined', function() {
          var newConfig = optlyInstance.projectConfigManager.getConfig();
          newConfig.sendFlagDecisions = undefined;
          optlyInstance.projectConfigManager.getConfig.returns(newConfig);
          var result = optlyInstance.isFeatureEnabled('test_feature', 'user1');
          assert.strictEqual(result, false);
          sinon.assert.notCalled(eventDispatcher.dispatchEvent);
          assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
            'OPTIMIZELY: Feature test_feature is not enabled for user user1.'
          );
        });

        it('returns false and does not dispatch an event when sendFlagDecisions is set to false', function() {
          var newConfig = optlyInstance.projectConfigManager.getConfig();
          newConfig.sendFlagDecisions = false;
          optlyInstance.projectConfigManager.getConfig.returns(newConfig);
          var result = optlyInstance.isFeatureEnabled('test_feature', 'user1');
          assert.strictEqual(result, false);
          sinon.assert.notCalled(eventDispatcher.dispatchEvent);
          assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
            'OPTIMIZELY: Feature test_feature is not enabled for user user1.'
          );
        });

        it('returns false and dispatch an event when sendFlagDecisions is set to true', function() {
          var newConfig = optlyInstance.projectConfigManager.getConfig();
          newConfig.sendFlagDecisions = true;
          optlyInstance.projectConfigManager.getConfig.returns(newConfig);
          var result = optlyInstance.isFeatureEnabled('test_feature', 'user1');
          assert.strictEqual(result, false);
          sinon.assert.calledOnce(eventDispatcher.dispatchEvent);
          var expectedImpressionEvent = {
            httpVerb: 'POST',
            url: 'https://logx.optimizely.com/v1/events',
            params: {
              account_id: '572018',
              project_id: '594001',
              visitors: [
                {
                  snapshots: [
                    {
                      decisions: [
                        {
                          campaign_id: null,
                          experiment_id: '',
                          variation_id: '',
                          metadata: {
                            flag_key: 'test_feature',
                            rule_key: '',
                            rule_type: 'rollout',
                            variation_key: '',
                            enabled: false,
                          },
                        },
                      ],
                      events: [
                        {
                          entity_id: null,
                          timestamp: 1509489766569,
                          key: 'campaign_activated',
                          uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                        },
                      ],
                    },
                  ],
                  visitor_id: 'user1',
                  attributes: [
                    {
                      entity_id: '$opt_bot_filtering',
                      key: '$opt_bot_filtering',
                      type: 'custom',
                      value: true,
                    },
                  ],
                },
              ],
              revision: '35',
              client_name: 'node-sdk',
              client_version: enums.NODE_CLIENT_VERSION,
              anonymize_ip: true,
              enrich_decisions: true,
            },
          };
          var callArgs = eventDispatcher.dispatchEvent.getCalls()[0].args;
          assert.deepEqual(callArgs[0], expectedImpressionEvent);
        });
      });
    });

    describe('#getEnabledFeatures', function() {
      beforeEach(function() {
        sandbox.stub(optlyInstance, 'isFeatureEnabled').callsFake(function(featureKey) {
          return featureKey === 'test_feature' || featureKey === 'test_feature_for_experiment';
        });
      });

      it('returns an empty array if the instance is invalid', function() {
        optlyInstance = new Optimizely({
          clientEngine: 'node-sdk',
          datafile: {
            lasers: 300,
            message: 'this is not a valid datafile',
          },
          errorHandler: errorHandler,
          eventDispatcher: eventDispatcher,
          jsonSchemaValidator: jsonSchemaValidator,
          logger: createdLogger,
          eventProcessor,
          notificationCenter,
        });
        var result = optlyInstance.getEnabledFeatures('user1', { test_attribute: 'test_value' });
        assert.deepEqual(result, []);
        assert.equal(
            buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'OPTIMIZELY: Optimizely object is not valid. Failing getEnabledFeatures.'
        );
      });

      it('returns only enabled features for the specified user and attributes', function() {
        var attributes = { test_attribute: 'test_value' };
        var result = optlyInstance.getEnabledFeatures('user1', attributes);
        assert.strictEqual(result.length, 2);
        assert.isAbove(result.indexOf('test_feature'), -1);
        assert.isAbove(result.indexOf('test_feature_for_experiment'), -1);
        sinon.assert.callCount(optlyInstance.isFeatureEnabled, 9);
        sinon.assert.calledWithExactly(optlyInstance.isFeatureEnabled, 'test_feature', 'user1', attributes);
        sinon.assert.calledWithExactly(optlyInstance.isFeatureEnabled, 'test_feature_2', 'user1', attributes);
        sinon.assert.calledWithExactly(
          optlyInstance.isFeatureEnabled,
          'test_feature_for_experiment',
          'user1',
          attributes
        );
        sinon.assert.calledWithExactly(optlyInstance.isFeatureEnabled, 'feature_with_group', 'user1', attributes);
        sinon.assert.calledWithExactly(optlyInstance.isFeatureEnabled, 'shared_feature', 'user1', attributes);
        sinon.assert.calledWithExactly(optlyInstance.isFeatureEnabled, 'unused_flag', 'user1', attributes);
        sinon.assert.calledWithExactly(optlyInstance.isFeatureEnabled, 'feature_exp_no_traffic', 'user1', attributes);
      });

      it('return features that are enabled for the user and send notification for every feature', function() {
        optlyInstance = new Optimizely({
          clientEngine: 'node-sdk',
          datafile: testData.getTestProjectConfigWithFeatures(),
          errorHandler: errorHandler,
          eventDispatcher: eventDispatcher,
          jsonSchemaValidator: jsonSchemaValidator,
          logger: createdLogger,
          isValidInstance: true,
          eventProcessor,
          notificationCenter,
        });

        var decisionListener = sinon.spy();
        var attributes = { test_attribute: 'test_value' };
        optlyInstance.notificationCenter.addNotificationListener(enums.NOTIFICATION_TYPES.DECISION, decisionListener);
        var result = optlyInstance.getEnabledFeatures('test_user', attributes);
        assert.strictEqual(result.length, 5);
        assert.deepEqual(result,
          [
            'test_feature_2',
            'test_feature_for_experiment',
            'shared_feature',
            'test_feature_in_exclusion_group',
            'test_feature_in_multiple_experiments'
          ]
        );

        sinon.assert.calledWithExactly(decisionListener.getCall(0), {
          type: DECISION_NOTIFICATION_TYPES.FEATURE,
          userId: 'test_user',
          attributes: attributes,
          decisionInfo: {
            featureKey: 'test_feature',
            featureEnabled: false,
            source: DECISION_SOURCES.ROLLOUT,
            sourceInfo: {},
          },
        });
        sinon.assert.calledWithExactly(decisionListener.getCall(1), {
          type: DECISION_NOTIFICATION_TYPES.FEATURE,
          userId: 'test_user',
          attributes: attributes,
          decisionInfo: {
            featureKey: 'test_feature_2',
            featureEnabled: true,
            source: DECISION_SOURCES.ROLLOUT,
            sourceInfo: {},
          },
        });
        sinon.assert.calledWithExactly(decisionListener.getCall(2), {
          type: DECISION_NOTIFICATION_TYPES.FEATURE,
          userId: 'test_user',
          attributes: attributes,
          decisionInfo: {
            featureKey: 'test_feature_for_experiment',
            featureEnabled: true,
            source: DECISION_SOURCES.FEATURE_TEST,
            sourceInfo: {
              experimentKey: 'testing_my_feature',
              variationKey: 'variation',
            },
          },
        });
        sinon.assert.calledWithExactly(decisionListener.getCall(3), {
          type: DECISION_NOTIFICATION_TYPES.FEATURE,
          userId: 'test_user',
          attributes: attributes,
          decisionInfo: {
            featureKey: 'feature_with_group',
            featureEnabled: false,
            source: DECISION_SOURCES.ROLLOUT,
            sourceInfo: {},
          },
        });
        sinon.assert.calledWithExactly(decisionListener.getCall(4), {
          type: DECISION_NOTIFICATION_TYPES.FEATURE,
          userId: 'test_user',
          attributes: attributes,
          decisionInfo: {
            featureKey: 'shared_feature',
            featureEnabled: true,
            source: DECISION_SOURCES.FEATURE_TEST,
            sourceInfo: {
              experimentKey: 'test_shared_feature',
              variationKey: 'treatment',
            },
          },
        });
        sinon.assert.calledWithExactly(decisionListener.getCall(5), {
          type: DECISION_NOTIFICATION_TYPES.FEATURE,
          userId: 'test_user',
          attributes: attributes,
          decisionInfo: {
            featureKey: 'unused_flag',
            featureEnabled: false,
            source: DECISION_SOURCES.ROLLOUT,
            sourceInfo: {},
          },
        });
        sinon.assert.calledWithExactly(decisionListener.getCall(6), {
          type: DECISION_NOTIFICATION_TYPES.FEATURE,
          userId: 'test_user',
          attributes: attributes,
          decisionInfo: {
            featureKey: 'feature_exp_no_traffic',
            featureEnabled: false,
            source: DECISION_SOURCES.ROLLOUT,
            sourceInfo: {},
          },
        });
      });
    });

    describe('feature variable APIs', function() {
      describe('bucketed into variation in an experiment with variable values', function() {
        describe('when the variation is toggled ON', function() {
          beforeEach(function() {
            var experiment = projectConfig.getExperimentFromKey(
              optlyInstance.projectConfigManager.getConfig(),
              'testing_my_feature'
            );
            var variation = experiment.variations[0];
            var decisionObj = {
              experiment: experiment,
              variation: variation,
              decisionSource: DECISION_SOURCES.FEATURE_TEST,
            };
            fakeDecisionResponse = {
              result: decisionObj,
              reasons: [],
            };
            sandbox.stub(optlyInstance.decisionService, 'getVariationForFeature').returns(fakeDecisionResponse);
          });

          it('returns the right value from getFeatureVariable when variable type is boolean', function() {
            var result = optlyInstance.getFeatureVariable(
              'test_feature_for_experiment',
              'is_button_animated',
              'user1',
              { test_attribute: 'test_value' }
            );
            assert.strictEqual(result, true);
            assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
              'OPTIMIZELY: Got variable value "true" for variable "is_button_animated" of feature flag "test_feature_for_experiment"'
            );
          });

          it('returns the right value from getFeatureVariable when variable type is double', function() {
            var result = optlyInstance.getFeatureVariable('test_feature_for_experiment', 'button_width', 'user1', {
              test_attribute: 'test_value',
            });
            assert.strictEqual(result, 20.25);
            assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
              'OPTIMIZELY: Got variable value "20.25" for variable "button_width" of feature flag "test_feature_for_experiment"'
            );
          });

          it('returns the right value from getFeatureVariable when variable type is integer', function() {
            var result = optlyInstance.getFeatureVariable('test_feature_for_experiment', 'num_buttons', 'user1', {
              test_attribute: 'test_value',
            });
            assert.strictEqual(result, 2);
            assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
              'OPTIMIZELY: Got variable value "2" for variable "num_buttons" of feature flag "test_feature_for_experiment"'
            );
          });

          it('returns the right value from getFeatureVariable when variable type is string', function() {
            var result = optlyInstance.getFeatureVariable('test_feature_for_experiment', 'button_txt', 'user1', {
              test_attribute: 'test_value',
            });
            assert.strictEqual(result, 'Buy me NOW');
            assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
              'OPTIMIZELY: Got variable value "Buy me NOW" for variable "button_txt" of feature flag "test_feature_for_experiment"'
            );
          });

          it('returns the right value from getFeatureVariable when variable type is json', function() {
            var result = optlyInstance.getFeatureVariable('test_feature_for_experiment', 'button_info', 'user1', {
              test_attribute: 'test_value',
            });
            assert.deepEqual(result, {
              num_buttons: 1,
              text: 'first variation',
            });
            assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
              'OPTIMIZELY: Got variable value "{ "num_buttons": 1, "text": "first variation"}" for variable "button_info" of feature flag "test_feature_for_experiment"'
            );
          });

          it('returns the right value from getFeatureVariableBoolean', function() {
            var result = optlyInstance.getFeatureVariableBoolean(
              'test_feature_for_experiment',
              'is_button_animated',
              'user1',
              { test_attribute: 'test_value' }
            );
            assert.strictEqual(result, true);
            assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
              'OPTIMIZELY: Got variable value "true" for variable "is_button_animated" of feature flag "test_feature_for_experiment"'
            );
          });

          it('returns the right value from getFeatureVariableDouble', function() {
            var result = optlyInstance.getFeatureVariableDouble(
              'test_feature_for_experiment',
              'button_width',
              'user1',
              { test_attribute: 'test_value' }
            );
            assert.strictEqual(result, 20.25);
            assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
              'OPTIMIZELY: Got variable value "20.25" for variable "button_width" of feature flag "test_feature_for_experiment"'
            );
          });

          it('returns the right value from getFeatureVariableInteger', function() {
            var result = optlyInstance.getFeatureVariableInteger(
              'test_feature_for_experiment',
              'num_buttons',
              'user1',
              { test_attribute: 'test_value' }
            );
            assert.strictEqual(result, 2);
            assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
              'OPTIMIZELY: Got variable value "2" for variable "num_buttons" of feature flag "test_feature_for_experiment"'
            );
          });

          it('returns the right value from getFeatureVariableString', function() {
            var result = optlyInstance.getFeatureVariableString('test_feature_for_experiment', 'button_txt', 'user1', {
              test_attribute: 'test_value',
            });
            assert.strictEqual(result, 'Buy me NOW');
            assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
              'OPTIMIZELY: Got variable value "Buy me NOW" for variable "button_txt" of feature flag "test_feature_for_experiment"'
            );
          });

          it('returns the right value from getFeatureVariableJSON', function() {
            var result = optlyInstance.getFeatureVariableJSON('test_feature_for_experiment', 'button_info', 'user1', {
              test_attribute: 'test_value',
            });
            assert.deepEqual(result, {
              num_buttons: 1,
              text: 'first variation',
            });
            assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
              'OPTIMIZELY: Got variable value "{ "num_buttons": 1, "text": "first variation"}" for variable "button_info" of feature flag "test_feature_for_experiment"'
            );
          });

          it('returns the right values from getAllFeatureVariables', function() {
            var result = optlyInstance.getAllFeatureVariables('test_feature_for_experiment', 'user1', {
              test_attribute: 'test_value',
            });
            assert.deepEqual(result, {
              is_button_animated: true,
              button_width: 20.25,
              num_buttons: 2,
              button_txt: 'Buy me NOW',
              button_info: {
                num_buttons: 1,
                text: 'first variation',
              },
            });
            sinon.assert.calledWith(
              createdLogger.log,
              LOG_LEVEL.INFO,
              '%s: Got variable value "%s" for variable "%s" of feature flag "%s"',
              'OPTIMIZELY',
              '2',
              'num_buttons',
              'test_feature_for_experiment',
            );
            sinon.assert.calledWith(
              createdLogger.log,
              LOG_LEVEL.INFO,
              '%s: Got variable value "%s" for variable "%s" of feature flag "%s"',
              'OPTIMIZELY',
              'true',
              'is_button_animated',
              'test_feature_for_experiment',
            );
            sinon.assert.calledWith(
              createdLogger.log,
              LOG_LEVEL.INFO,
              '%s: Got variable value "%s" for variable "%s" of feature flag "%s"',
              'OPTIMIZELY',
              'Buy me NOW',
              'button_txt',
              'test_feature_for_experiment'
            );
            sinon.assert.calledWith(
              createdLogger.log,
              LOG_LEVEL.INFO,
              '%s: Got variable value "%s" for variable "%s" of feature flag "%s"',
              'OPTIMIZELY',
              '20.25',
              'button_width',
              'test_feature_for_experiment'
            );
            sinon.assert.calledWith(
              createdLogger.log,
              LOG_LEVEL.INFO,
              '%s: Got variable value "%s" for variable "%s" of feature flag "%s"',
              'OPTIMIZELY',
              '{ "num_buttons": 1, "text": "first variation"}',
              'button_info',
              'test_feature_for_experiment'
            );
          });

          describe('when the variable is not used in the variation', function() {
            beforeEach(function() {
              sandbox.stub(projectConfig, 'getVariableValueForVariation').returns(null);
            });

            it('returns the variable default value from getFeatureVariable when variable type is boolean', function() {
              var result = optlyInstance.getFeatureVariable(
                'test_feature_for_experiment',
                'is_button_animated',
                'user1',
                { test_attribute: 'test_value' }
              );
              assert.strictEqual(result, false);
              assert.equal(
          buildLogMessageFromArgs(createdLogger.log.lastCall.args),
                'OPTIMIZELY: Variable "is_button_animated" is not used in variation "variation". Returning default value.'
              );
            });

            it('returns the variable default value from getFeatureVariable when variable type is double', function() {
              var result = optlyInstance.getFeatureVariable('test_feature_for_experiment', 'button_width', 'user1', {
                test_attribute: 'test_value',
              });
              assert.strictEqual(result, 50.55);
              assert.equal(
          buildLogMessageFromArgs(createdLogger.log.lastCall.args),
                'OPTIMIZELY: Variable "button_width" is not used in variation "variation". Returning default value.'
              );
            });

            it('returns the variable default value from getFeatureVariable when variable type is integer', function() {
              var result = optlyInstance.getFeatureVariable('test_feature_for_experiment', 'num_buttons', 'user1', {
                test_attribute: 'test_value',
              });
              assert.strictEqual(result, 10);
              assert.equal(
          buildLogMessageFromArgs(createdLogger.log.lastCall.args),
                'OPTIMIZELY: Variable "num_buttons" is not used in variation "variation". Returning default value.'
              );
            });

            it('returns the variable default value from getFeatureVariable when variable type is string', function() {
              var result = optlyInstance.getFeatureVariable('test_feature_for_experiment', 'button_txt', 'user1', {
                test_attribute: 'test_value',
              });
              assert.strictEqual(result, 'Buy me');
              assert.equal(
          buildLogMessageFromArgs(createdLogger.log.lastCall.args),
                'OPTIMIZELY: Variable "button_txt" is not used in variation "variation". Returning default value.'
              );
            });

            it('returns the variable default value from getFeatureVariable when variable type is json', function() {
              var result = optlyInstance.getFeatureVariable('test_feature_for_experiment', 'button_info', 'user1', {
                test_attribute: 'test_value',
              });
              assert.deepEqual(result, {
                num_buttons: 0,
                text: 'default value',
              });
              assert.equal(
          buildLogMessageFromArgs(createdLogger.log.lastCall.args),
                'OPTIMIZELY: Variable "button_info" is not used in variation "variation". Returning default value.'
              );
            });

            it('returns the variable default value from getFeatureVariableBoolean', function() {
              var result = optlyInstance.getFeatureVariableBoolean(
                'test_feature_for_experiment',
                'is_button_animated',
                'user1',
                { test_attribute: 'test_value' }
              );
              assert.strictEqual(result, false);
              assert.equal(
          buildLogMessageFromArgs(createdLogger.log.lastCall.args),
                'OPTIMIZELY: Variable "is_button_animated" is not used in variation "variation". Returning default value.'
              );
            });

            it('returns the variable default value from getFeatureVariableDouble', function() {
              var result = optlyInstance.getFeatureVariableDouble(
                'test_feature_for_experiment',
                'button_width',
                'user1',
                { test_attribute: 'test_value' }
              );
              assert.strictEqual(result, 50.55);
              assert.equal(
          buildLogMessageFromArgs(createdLogger.log.lastCall.args),
                'OPTIMIZELY: Variable "button_width" is not used in variation "variation". Returning default value.'
              );
            });

            it('returns the variable default value from getFeatureVariableInteger', function() {
              var result = optlyInstance.getFeatureVariableInteger(
                'test_feature_for_experiment',
                'num_buttons',
                'user1',
                { test_attribute: 'test_value' }
              );
              assert.strictEqual(result, 10);
              assert.equal(
          buildLogMessageFromArgs(createdLogger.log.lastCall.args),
                'OPTIMIZELY: Variable "num_buttons" is not used in variation "variation". Returning default value.'
              );
            });

            it('returns the variable default value from getFeatureVariableString', function() {
              var result = optlyInstance.getFeatureVariableString(
                'test_feature_for_experiment',
                'button_txt',
                'user1',
                { test_attribute: 'test_value' }
              );
              assert.strictEqual(result, 'Buy me');
              assert.equal(
          buildLogMessageFromArgs(createdLogger.log.lastCall.args),
                'OPTIMIZELY: Variable "button_txt" is not used in variation "variation". Returning default value.'
              );
            });

            it('returns the variable default value from getFeatureVariableJSON', function() {
              var result = optlyInstance.getFeatureVariableJSON(
                'test_feature_for_experiment',
                'button_info',
                'user1',
                { test_attribute: 'test_value' }
              );
              assert.deepEqual(result, {
                num_buttons: 0,
                text: "default value",
              });
              assert.equal(
                buildLogMessageFromArgs(createdLogger.log.lastCall.args),
                'OPTIMIZELY: Variable "button_info" is not used in variation "variation". Returning default value.'
              );
            });

            it('returns the right values from getAllFeatureVariables', function() {
              var result = optlyInstance.getAllFeatureVariables('test_feature_for_experiment', 'user1', {
                test_attribute: 'test_value',
              });
              assert.deepEqual(result, {
                is_button_animated: false,
                button_width: 50.55,
                num_buttons: 10,
                button_txt: 'Buy me',
                button_info: {
                  num_buttons: 0,
                  text: "default value",
                },
              });
              sinon.assert.calledWith(
                createdLogger.log,
                LOG_LEVEL.INFO,
                '%s: Variable "%s" is not used in variation "%s". Returning default value.',
                'OPTIMIZELY',
                'num_buttons',
                'variation'
              );
              sinon.assert.calledWith(
                createdLogger.log,
                LOG_LEVEL.INFO,
                '%s: Variable "%s" is not used in variation "%s". Returning default value.',
                'OPTIMIZELY',
                'is_button_animated',
                'variation'
              );
              sinon.assert.calledWith(
                createdLogger.log,
                LOG_LEVEL.INFO,
                '%s: Variable "%s" is not used in variation "%s". Returning default value.',
                'OPTIMIZELY',
                'button_txt',
                'variation'
              );
              sinon.assert.calledWith(
                createdLogger.log,
                LOG_LEVEL.INFO,
                '%s: Variable "%s" is not used in variation "%s". Returning default value.',
                'OPTIMIZELY',
                'button_width',
                'variation'
              );
              sinon.assert.calledWith(
                createdLogger.log,
                LOG_LEVEL.INFO,
                '%s: Variable "%s" is not used in variation "%s". Returning default value.',
                'OPTIMIZELY',
                'button_info',
                'variation'
              );
            });
          });
        });

        describe('when the variation is toggled OFF', function() {
          beforeEach(function() {
            var experiment = projectConfig.getExperimentFromKey(
              optlyInstance.projectConfigManager.getConfig(),
              'testing_my_feature'
            );
            var variation = experiment.variations[2];
            var decisionObj = {
              experiment: experiment,
              variation: variation,
              decisionSource: DECISION_SOURCES.FEATURE_TEST,
            };
            fakeDecisionResponse = {
              result: decisionObj,
              reasons: [],
            };
            sandbox.stub(optlyInstance.decisionService, 'getVariationForFeature').returns(fakeDecisionResponse);
          });

          it('returns the variable default value from getFeatureVariable when variable type is boolean', function() {
            var result = optlyInstance.getFeatureVariable(
              'test_feature_for_experiment',
              'is_button_animated',
              'user1',
              { test_attribute: 'test_value' }
            );
            assert.strictEqual(result, false);
            assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
              'OPTIMIZELY: Feature "test_feature_for_experiment" is not enabled for user user1. Returning the default variable value "false".'
            );
          });

          it('returns the variable default value from getFeatureVariable when variable type is double', function() {
            var result = optlyInstance.getFeatureVariable('test_feature_for_experiment', 'button_width', 'user1', {
              test_attribute: 'test_value',
            });
            assert.strictEqual(result, 50.55);
            assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
              'OPTIMIZELY: Feature "test_feature_for_experiment" is not enabled for user user1. Returning the default variable value "50.55".'
            );
          });

          it('returns the variable default value from getFeatureVariable when variable type is integer', function() {
            var result = optlyInstance.getFeatureVariable('test_feature_for_experiment', 'num_buttons', 'user1', {
              test_attribute: 'test_value',
            });
            assert.strictEqual(result, 10);
            assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
              'OPTIMIZELY: Feature "test_feature_for_experiment" is not enabled for user user1. Returning the default variable value "10".'
            );
          });

          it('returns the variable default value from getFeatureVariable when variable type is string', function() {
            var result = optlyInstance.getFeatureVariable('test_feature_for_experiment', 'button_txt', 'user1', {
              test_attribute: 'test_value',
            });
            assert.strictEqual(result, 'Buy me');
            assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
              'OPTIMIZELY: Feature "test_feature_for_experiment" is not enabled for user user1. Returning the default variable value "Buy me".'
            );
          });

          it('returns the variable default value from getFeatureVariable when variable type is json', function() {
            var result = optlyInstance.getFeatureVariable('test_feature_for_experiment', 'button_info', 'user1', {
              test_attribute: 'test_value',
            });
            assert.deepEqual(result, {
              num_buttons: 0,
              text: "default value",
            });
            assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
              'OPTIMIZELY: Feature "test_feature_for_experiment" is not enabled for user user1. Returning the default variable value "{ "num_buttons": 0, "text": "default value"}".'
            );
          });

          it('returns the variable default value from getFeatureVariableBoolean', function() {
            var result = optlyInstance.getFeatureVariableBoolean(
              'test_feature_for_experiment',
              'is_button_animated',
              'user1',
              { test_attribute: 'test_value' }
            );
            assert.strictEqual(result, false);
            assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
              'OPTIMIZELY: Feature "test_feature_for_experiment" is not enabled for user user1. Returning the default variable value "false".'
            );
          });

          it('returns the variable default value from getFeatureVariableDouble', function() {
            var result = optlyInstance.getFeatureVariableDouble(
              'test_feature_for_experiment',
              'button_width',
              'user1',
              { test_attribute: 'test_value' }
            );
            assert.strictEqual(result, 50.55);
            assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
              'OPTIMIZELY: Feature "test_feature_for_experiment" is not enabled for user user1. Returning the default variable value "50.55".'
            );
          });

          it('returns the variable default value from getFeatureVariableInteger', function() {
            var result = optlyInstance.getFeatureVariableInteger(
              'test_feature_for_experiment',
              'num_buttons',
              'user1',
              { test_attribute: 'test_value' }
            );
            assert.strictEqual(result, 10);
            assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
              'OPTIMIZELY: Feature "test_feature_for_experiment" is not enabled for user user1. Returning the default variable value "10".'
            );
          });

          it('returns the variable default value from getFeatureVariableString', function() {
            var result = optlyInstance.getFeatureVariableString('test_feature_for_experiment', 'button_txt', 'user1', {
              test_attribute: 'test_value',
            });
            assert.strictEqual(result, 'Buy me');
            assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
              'OPTIMIZELY: Feature "test_feature_for_experiment" is not enabled for user user1. Returning the default variable value "Buy me".'
            );
          });

          it('returns the variable default value from getFeatureVariableJSON', function() {
            var result = optlyInstance.getFeatureVariableJSON('test_feature_for_experiment', 'button_info', 'user1', {
              test_attribute: 'test_value',
            });
            assert.deepEqual(result, {
              num_buttons: 0,
              text: 'default value',
            });
            assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
              'OPTIMIZELY: Feature "test_feature_for_experiment" is not enabled for user user1. Returning the default variable value "{ "num_buttons": 0, "text": "default value"}".'
            );
          });

          it('returns the right values from getAllFeatureVariables', function() {
            var result = optlyInstance.getAllFeatureVariables('test_feature_for_experiment', 'user1', {
              test_attribute: 'test_value',
            });
            assert.deepEqual(result, {
              is_button_animated: false,
              button_width: 50.55,
              num_buttons: 10,
              button_txt: 'Buy me',
              button_info: {
                num_buttons: 0,
                text: "default value",
              },
            });
            assert.deepEqual(createdLogger.log.args, [
              [
                LOG_LEVEL.INFO,
                '%s: Feature "%s" is not enabled for user %s. Returning the default variable value "%s".',
                'OPTIMIZELY',
                'test_feature_for_experiment',
                'user1',
                '10'
              ],
              [
                LOG_LEVEL.INFO,
                '%s: Feature "%s" is not enabled for user %s. Returning the default variable value "%s".',
                'OPTIMIZELY',
                'test_feature_for_experiment',
                'user1',
                'false'
              ],
              [
                LOG_LEVEL.INFO,
                '%s: Feature "%s" is not enabled for user %s. Returning the default variable value "%s".',
                'OPTIMIZELY',
                'test_feature_for_experiment',
                'user1',
                'Buy me'
              ],
              [
                LOG_LEVEL.INFO,
                '%s: Feature "%s" is not enabled for user %s. Returning the default variable value "%s".',
                'OPTIMIZELY',
                'test_feature_for_experiment',
                'user1',
                '50.55'
              ],
              [
                LOG_LEVEL.INFO,
                '%s: Feature "%s" is not enabled for user %s. Returning the default variable value "%s".',
                'OPTIMIZELY',
                'test_feature_for_experiment',
                'user1',
                '{ "num_buttons": 0, "text": "default value"}'
              ]
            ]);            
          });
        });
      });

      describe('bucketed into variation of a rollout with variable values', function() {
        describe('when the variation is toggled ON', function() {
          beforeEach(function() {
            var experiment = projectConfig.getExperimentFromKey(
              optlyInstance.projectConfigManager.getConfig(),
              '594031'
            );
            var variation = experiment.variations[0];
            var decisionObj = {
              experiment: experiment,
              variation: variation,
              decisionSource: DECISION_SOURCES.ROLLOUT,
            };
            fakeDecisionResponse = {
              result: decisionObj,
              reasons: [],
            };
            sandbox.stub(optlyInstance.decisionService, 'getVariationForFeature').returns(fakeDecisionResponse);
          });

          it('returns the right value from getFeatureVariable when variable type is boolean', function() {
            var result = optlyInstance.getFeatureVariable('test_feature', 'new_content', 'user1', {
              test_attribute: 'test_value',
            });
            assert.strictEqual(result, true);
            assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
              'OPTIMIZELY: Got variable value "true" for variable "new_content" of feature flag "test_feature"'
            );
          });

          it('returns the right value from getFeatureVariable when variable type is double', function() {
            var result = optlyInstance.getFeatureVariable('test_feature', 'price', 'user1', {
              test_attribute: 'test_value',
            });
            assert.strictEqual(result, 4.99);
            assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
              'OPTIMIZELY: Got variable value "4.99" for variable "price" of feature flag "test_feature"'
            );
          });

          it('returns the right value from getFeatureVariable when variable type is integer', function() {
            var result = optlyInstance.getFeatureVariable('test_feature', 'lasers', 'user1', {
              test_attribute: 'test_value',
            });
            assert.strictEqual(result, 395);
            assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
              'OPTIMIZELY: Got variable value "395" for variable "lasers" of feature flag "test_feature"'
            );
          });

          it('returns the right value from getFeatureVariable when variable type is string', function() {
            var result = optlyInstance.getFeatureVariable('test_feature', 'message', 'user1', {
              test_attribute: 'test_value',
            });
            assert.strictEqual(result, 'Hello audience');
            assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
              'OPTIMIZELY: Got variable value "Hello audience" for variable "message" of feature flag "test_feature"'
            );
          });

          it('returns the right value from getFeatureVariable when variable type is json', function() {
            var result = optlyInstance.getFeatureVariable('test_feature', 'message_info', 'user1', {
              test_attribute: 'test_value',
            });
            assert.deepEqual(result, {
              count: 2,
              message: 'Hello audience',
            });
            assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
              'OPTIMIZELY: Got variable value "{ "count": 2, "message": "Hello audience" }" for variable "message_info" of feature flag "test_feature"'
            );
          });

          it('returns the right value from getFeatureVariableBoolean', function() {
            var result = optlyInstance.getFeatureVariableBoolean('test_feature', 'new_content', 'user1', {
              test_attribute: 'test_value',
            });
            assert.strictEqual(result, true);
            assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
              'OPTIMIZELY: Got variable value "true" for variable "new_content" of feature flag "test_feature"'
            );
          });

          it('returns the right value from getFeatureVariableDouble', function() {
            var result = optlyInstance.getFeatureVariableDouble('test_feature', 'price', 'user1', {
              test_attribute: 'test_value',
            });
            assert.strictEqual(result, 4.99);
            assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
              'OPTIMIZELY: Got variable value "4.99" for variable "price" of feature flag "test_feature"'
            );
          });

          it('returns the right value from getFeatureVariableInteger', function() {
            var result = optlyInstance.getFeatureVariableInteger('test_feature', 'lasers', 'user1', {
              test_attribute: 'test_value',
            });
            assert.strictEqual(result, 395);
            assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
              'OPTIMIZELY: Got variable value "395" for variable "lasers" of feature flag "test_feature"'
            );
          });

          it('returns the right value from getFeatureVariableString', function() {
            var result = optlyInstance.getFeatureVariableString('test_feature', 'message', 'user1', {
              test_attribute: 'test_value',
            });
            assert.strictEqual(result, 'Hello audience');
            assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
              'OPTIMIZELY: Got variable value "Hello audience" for variable "message" of feature flag "test_feature"'
            );
          });

          it('returns the right value from getFeatureVariableJSON', function() {
            var result = optlyInstance.getFeatureVariableJSON('test_feature', 'message_info', 'user1', {
              test_attribute: 'test_value',
            });
            assert.deepEqual(result, {
              count: 2,
              message: 'Hello audience',
            });
            assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
              'OPTIMIZELY: Got variable value "{ "count": 2, "message": "Hello audience" }" for variable "message_info" of feature flag "test_feature"'
            );
          });

          it('returns the right values from getAllFeatureVariables', function() {
            var result = optlyInstance.getAllFeatureVariables('test_feature', 'user1', {
              test_attribute: 'test_value',
            });
            assert.deepEqual(result, {
              new_content: true,
              price: 4.99,
              lasers: 395,
              message: 'Hello audience',
              message_info: {
                count: 2,
                message: 'Hello audience',
              },
            });
            assert.deepEqual(
              createdLogger.log.args,
              [
                [
                  LOG_LEVEL.INFO,
                  '%s: Got variable value "%s" for variable "%s" of feature flag "%s"',
                  'OPTIMIZELY',
                  'true',
                  'new_content',
                  'test_feature'
                ],
                [
                  LOG_LEVEL.INFO,
                  '%s: Got variable value "%s" for variable "%s" of feature flag "%s"',
                  'OPTIMIZELY',
                  '395',
                  'lasers',
                  'test_feature'
                ],
                [
                  LOG_LEVEL.INFO,
                  '%s: Got variable value "%s" for variable "%s" of feature flag "%s"',
                  'OPTIMIZELY',
                  '4.99',
                  'price',
                  'test_feature'
                ],
                [
                  LOG_LEVEL.INFO,
                  '%s: Got variable value "%s" for variable "%s" of feature flag "%s"',
                  'OPTIMIZELY',
                  'Hello audience',
                  'message',
                  'test_feature'
                ],
                [
                  LOG_LEVEL.INFO,
                  '%s: Got variable value "%s" for variable "%s" of feature flag "%s"',
                  'OPTIMIZELY',
                  '{ "count": 2, "message": "Hello audience" }',
                  'message_info',
                  'test_feature'
                ]
              ]              
            )
          });

          describe('when the variable is not used in the variation', function() {
            beforeEach(function() {
              sandbox.stub(projectConfig, 'getVariableValueForVariation').returns(null);
            });

            it('returns the variable default value from getFeatureVariable when variable type is boolean', function() {
              var result = optlyInstance.getFeatureVariable('test_feature', 'new_content', 'user1', {
                test_attribute: 'test_value',
              });
              assert.strictEqual(result, false);
              assert.equal(
          buildLogMessageFromArgs(createdLogger.log.lastCall.args),
                'OPTIMIZELY: Variable "new_content" is not used in variation "594032". Returning default value.'
              );
            });

            it('returns the variable default value from getFeatureVariable when variable type is double', function() {
              var result = optlyInstance.getFeatureVariable('test_feature', 'price', 'user1', {
                test_attribute: 'test_value',
              });
              assert.strictEqual(result, 14.99);
              assert.equal(
          buildLogMessageFromArgs(createdLogger.log.lastCall.args),
                'OPTIMIZELY: Variable "price" is not used in variation "594032". Returning default value.'
              );
            });

            it('returns the variable default value from getFeatureVariable when variable type is integer', function() {
              var result = optlyInstance.getFeatureVariable('test_feature', 'lasers', 'user1', {
                test_attribute: 'test_value',
              });
              assert.strictEqual(result, 400);
              assert.equal(
          buildLogMessageFromArgs(createdLogger.log.lastCall.args),
                'OPTIMIZELY: Variable "lasers" is not used in variation "594032". Returning default value.'
              );
            });

            it('returns the variable default value from getFeatureVariable when variable type is string', function() {
              var result = optlyInstance.getFeatureVariable('test_feature', 'message', 'user1', {
                test_attribute: 'test_value',
              });
              assert.strictEqual(result, 'Hello');
              assert.equal(
          buildLogMessageFromArgs(createdLogger.log.lastCall.args),
                'OPTIMIZELY: Variable "message" is not used in variation "594032". Returning default value.'
              );
            });

            it('returns the variable default value from getFeatureVariable when variable type is json', function() {
              var result = optlyInstance.getFeatureVariable('test_feature', 'message_info', 'user1', {
                test_attribute: 'test_value',
              });
              assert.deepEqual(result, {
                count: 1,
                message: 'Hello',
              });
              assert.equal(
          buildLogMessageFromArgs(createdLogger.log.lastCall.args),
                'OPTIMIZELY: Variable "message_info" is not used in variation "594032". Returning default value.'
              );
            });

            it('returns the variable default value from getFeatureVariableBoolean', function() {
              var result = optlyInstance.getFeatureVariableBoolean('test_feature', 'new_content', 'user1', {
                test_attribute: 'test_value',
              });
              assert.strictEqual(result, false);
              assert.equal(
          buildLogMessageFromArgs(createdLogger.log.lastCall.args),
                'OPTIMIZELY: Variable "new_content" is not used in variation "594032". Returning default value.'
              );
            });

            it('returns the variable default value from getFeatureVariableDouble', function() {
              var result = optlyInstance.getFeatureVariableDouble('test_feature', 'price', 'user1', {
                test_attribute: 'test_value',
              });
              assert.strictEqual(result, 14.99);
              assert.equal(
          buildLogMessageFromArgs(createdLogger.log.lastCall.args),
                'OPTIMIZELY: Variable "price" is not used in variation "594032". Returning default value.'
              );
            });

            it('returns the variable default value from getFeatureVariableInteger', function() {
              var result = optlyInstance.getFeatureVariableInteger('test_feature', 'lasers', 'user1', {
                test_attribute: 'test_value',
              });
              assert.strictEqual(result, 400);
              assert.equal(
          buildLogMessageFromArgs(createdLogger.log.lastCall.args),
                'OPTIMIZELY: Variable "lasers" is not used in variation "594032". Returning default value.'
              );
            });

            it('returns the variable default value from getFeatureVariableString', function() {
              var result = optlyInstance.getFeatureVariableString('test_feature', 'message', 'user1', {
                test_attribute: 'test_value',
              });
              assert.strictEqual(result, 'Hello');
              assert.equal(
          buildLogMessageFromArgs(createdLogger.log.lastCall.args),
                'OPTIMIZELY: Variable "message" is not used in variation "594032". Returning default value.'
              );
            });

            it('returns the variable default value from getFeatureVariableJSON', function() {
              var result = optlyInstance.getFeatureVariableJSON('test_feature', 'message_info', 'user1', {
                test_attribute: 'test_value',
              });
              assert.deepEqual(result, {
                count: 1,
                message: 'Hello'
              });
              assert.equal(
          buildLogMessageFromArgs(createdLogger.log.lastCall.args),
                'OPTIMIZELY: Variable "message_info" is not used in variation "594032". Returning default value.'
              );
            });

            it('returns the right values from getAllFeatureVariables', function() {
              var result = optlyInstance.getAllFeatureVariables('test_feature', 'user1', {
                test_attribute: 'test_value',
              });
              assert.deepEqual(result, {
                new_content: false,
                price: 14.99,
                lasers: 400,
                message: 'Hello',
                message_info: {
                  count: 1,
                  message: 'Hello',
                },
              });
              assert.deepEqual(
                createdLogger.log.args,
                [
                  [
                    LOG_LEVEL.INFO,
                    '%s: Variable "%s" is not used in variation "%s". Returning default value.',
                    'OPTIMIZELY',
                    'new_content',
                    '594032'
                  ],
                  [
                    LOG_LEVEL.INFO,
                    '%s: Variable "%s" is not used in variation "%s". Returning default value.',
                    'OPTIMIZELY',
                    'lasers',
                    '594032'
                  ],
                  [
                    LOG_LEVEL.INFO,
                    '%s: Variable "%s" is not used in variation "%s". Returning default value.',
                    'OPTIMIZELY',
                    'price',
                    '594032'
                  ],
                  [
                    LOG_LEVEL.INFO,
                    '%s: Variable "%s" is not used in variation "%s". Returning default value.',
                    'OPTIMIZELY',
                    'message',
                    '594032'
                  ],
                  [
                    LOG_LEVEL.INFO,
                    '%s: Variable "%s" is not used in variation "%s". Returning default value.',
                    'OPTIMIZELY',
                    'message_info',
                    '594032'
                  ]
                ]
                
              )
            });
          });
        });

        describe('when the variation is toggled OFF', function() {
          beforeEach(function() {
            var experiment = projectConfig.getExperimentFromKey(
              optlyInstance.projectConfigManager.getConfig(),
              '594037'
            );
            var variation = experiment.variations[0];
            var decisionObj = {
              experiment: experiment,
              variation: variation,
              decisionSource: DECISION_SOURCES.ROLLOUT,
            };
            fakeDecisionResponse = {
              result: decisionObj,
              reasons: [],
            };
            sandbox.stub(optlyInstance.decisionService, 'getVariationForFeature').returns(fakeDecisionResponse);
          });

          it('returns the variable default value from getFeatureVariable when variable type is boolean', function() {
            var result = optlyInstance.getFeatureVariable('test_feature', 'new_content', 'user1', {
              test_attribute: 'test_value',
            });
            assert.strictEqual(result, false);
            assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
              'OPTIMIZELY: Feature "test_feature" is not enabled for user user1. Returning the default variable value "false".'
            );
          });

          it('returns the variable default value from getFeatureVariable when variable type is double', function() {
            var result = optlyInstance.getFeatureVariable('test_feature', 'price', 'user1', {
              test_attribute: 'test_value',
            });
            assert.strictEqual(result, 14.99);
            assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
              'OPTIMIZELY: Feature "test_feature" is not enabled for user user1. Returning the default variable value "14.99".'
            );
          });

          it('returns the variable default value from getFeatureVariable when variable type is integer', function() {
            var result = optlyInstance.getFeatureVariable('test_feature', 'lasers', 'user1', {
              test_attribute: 'test_value',
            });
            assert.strictEqual(result, 400);
            assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
              'OPTIMIZELY: Feature "test_feature" is not enabled for user user1. Returning the default variable value "400".'
            );
          });

          it('returns the variable default value from getFeatureVariable when variable type is string', function() {
            var result = optlyInstance.getFeatureVariable('test_feature', 'message', 'user1', {
              test_attribute: 'test_value',
            });
            assert.strictEqual(result, 'Hello');
            assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
              'OPTIMIZELY: Feature "test_feature" is not enabled for user user1. Returning the default variable value "Hello".'
            );
          });

          it('returns the variable default value from getFeatureVariable when variable type is json', function() {
            var result = optlyInstance.getFeatureVariable('test_feature', 'message_info', 'user1', {
              test_attribute: 'test_value',
            });
            assert.deepEqual(result, {
              count: 1,
              message: 'Hello'
            });
            assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
              'OPTIMIZELY: Feature "test_feature" is not enabled for user user1. Returning the default variable value "{ "count": 1, "message": "Hello" }".'
            );
          });

          it('returns the variable default value from getFeatureVariableBoolean', function() {
            var result = optlyInstance.getFeatureVariableBoolean('test_feature', 'new_content', 'user1', {
              test_attribute: 'test_value',
            });
            assert.strictEqual(result, false);
            assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
              'OPTIMIZELY: Feature "test_feature" is not enabled for user user1. Returning the default variable value "false".'
            );
          });

          it('returns the variable default value from getFeatureVariableDouble', function() {
            var result = optlyInstance.getFeatureVariableDouble('test_feature', 'price', 'user1', {
              test_attribute: 'test_value',
            });
            assert.strictEqual(result, 14.99);
            assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
              'OPTIMIZELY: Feature "test_feature" is not enabled for user user1. Returning the default variable value "14.99".'
            );
          });

          it('returns the variable default value from getFeatureVariableInteger', function() {
            var result = optlyInstance.getFeatureVariableInteger('test_feature', 'lasers', 'user1', {
              test_attribute: 'test_value',
            });
            assert.strictEqual(result, 400);
            assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
              'OPTIMIZELY: Feature "test_feature" is not enabled for user user1. Returning the default variable value "400".'
            );
          });

          it('returns the variable default value from getFeatureVariableString', function() {
            var result = optlyInstance.getFeatureVariableString('test_feature', 'message', 'user1', {
              test_attribute: 'test_value',
            });
            assert.strictEqual(result, 'Hello');
            assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
              'OPTIMIZELY: Feature "test_feature" is not enabled for user user1. Returning the default variable value "Hello".'
            );
          });

          it('returns the variable default value from getFeatureVariableJSON', function() {
            var result = optlyInstance.getFeatureVariableJSON('test_feature', 'message_info', 'user1', {
              test_attribute: 'test_value',
            });
            assert.deepEqual(result, {
              count: 1,
              message: 'Hello'
            });
            assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
              'OPTIMIZELY: Feature "test_feature" is not enabled for user user1. Returning the default variable value "{ "count": 1, "message": "Hello" }".'
            );
          });

          it('returns the right values from getAllFeatureVariables', function() {
            var result = optlyInstance.getAllFeatureVariables('test_feature', 'user1', {
              test_attribute: 'test_value',
            });
            assert.deepEqual(result, {
              new_content: false,
              price: 14.99,
              lasers: 400,
              message: 'Hello',
              message_info: {
                count: 1,
                message: 'Hello',
              },
            });
            assert.deepEqual(
              createdLogger.log.args,
              [
                [
                  LOG_LEVEL.INFO,
                  '%s: Feature "%s" is not enabled for user %s. Returning the default variable value "%s".',
                  'OPTIMIZELY',
                  'test_feature',
                  'user1',
                  'false'
                ],
                [
                  LOG_LEVEL.INFO,
                  '%s: Feature "%s" is not enabled for user %s. Returning the default variable value "%s".',
                  'OPTIMIZELY',
                  'test_feature',
                  'user1',
                  '400'
                ],
                [
                  LOG_LEVEL.INFO,
                  '%s: Feature "%s" is not enabled for user %s. Returning the default variable value "%s".',
                  'OPTIMIZELY',
                  'test_feature',
                  'user1',
                  '14.99'
                ],
                [
                  LOG_LEVEL.INFO,
                  '%s: Feature "%s" is not enabled for user %s. Returning the default variable value "%s".',
                  'OPTIMIZELY',
                  'test_feature',
                  'user1',
                  'Hello'
                ],
                [
                  LOG_LEVEL.INFO,
                  '%s: Feature "%s" is not enabled for user %s. Returning the default variable value "%s".',
                  'OPTIMIZELY',
                  'test_feature',
                  'user1',
                  '{ "count": 1, "message": "Hello" }'
                ]
              ]
            )
          });
        });
      });

      describe('not bucketed into an experiment or a rollout ', function() {
        beforeEach(function() {
          var decisionObj = {
            experiment: null,
            variation: null,
            decisionSource: null,
          };
          fakeDecisionResponse = {
            result: decisionObj,
            reasons: [],
          };
          sandbox.stub(optlyInstance.decisionService, 'getVariationForFeature').returns(fakeDecisionResponse);
        });

        it('returns the variable default value from getFeatureVariable when variable type is boolean', function() {
          var result = optlyInstance.getFeatureVariable('test_feature_for_experiment', 'is_button_animated', 'user1', {
            test_attribute: 'test_value',
          });
          assert.strictEqual(result, false);
          assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
            'OPTIMIZELY: User "user1" is not in any variation or rollout rule. Returning default value for variable "is_button_animated" of feature flag "test_feature_for_experiment".'
          );
        });

        it('returns the variable default value from getFeatureVariable when variable type is double', function() {
          var result = optlyInstance.getFeatureVariable('test_feature_for_experiment', 'button_width', 'user1', {
            test_attribute: 'test_value',
          });
          assert.strictEqual(result, 50.55);
          assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
            'OPTIMIZELY: User "user1" is not in any variation or rollout rule. Returning default value for variable "button_width" of feature flag "test_feature_for_experiment".'
          );
        });

        it('returns the variable default value from getFeatureVariable when variable type is integer', function() {
          var result = optlyInstance.getFeatureVariable('test_feature_for_experiment', 'num_buttons', 'user1', {
            test_attribute: 'test_value',
          });
          assert.strictEqual(result, 10);
          assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
            'OPTIMIZELY: User "user1" is not in any variation or rollout rule. Returning default value for variable "num_buttons" of feature flag "test_feature_for_experiment".'
          );
        });

        it('returns the variable default value from getFeatureVariable when variable type is string', function() {
          var result = optlyInstance.getFeatureVariable('test_feature_for_experiment', 'button_txt', 'user1', {
            test_attribute: 'test_value',
          });
          assert.strictEqual(result, 'Buy me');
          assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
            'OPTIMIZELY: User "user1" is not in any variation or rollout rule. Returning default value for variable "button_txt" of feature flag "test_feature_for_experiment".'
          );
        });

        it('returns the variable default value from getFeatureVariable when variable type is json', function() {
          var result = optlyInstance.getFeatureVariable('test_feature_for_experiment', 'button_info', 'user1', {
            test_attribute: 'test_value',
          });
          assert.deepEqual(result, {
            num_buttons: 0,
            text: 'default value',
          });
          assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
            'OPTIMIZELY: User "user1" is not in any variation or rollout rule. Returning default value for variable "button_info" of feature flag "test_feature_for_experiment".'
          );
        });

        it('returns the variable default value from getFeatureVariableBoolean', function() {
          var result = optlyInstance.getFeatureVariableBoolean(
            'test_feature_for_experiment',
            'is_button_animated',
            'user1',
            { test_attribute: 'test_value' }
          );
          assert.strictEqual(result, false);
          assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
            'OPTIMIZELY: User "user1" is not in any variation or rollout rule. Returning default value for variable "is_button_animated" of feature flag "test_feature_for_experiment".'
          );
        });

        it('returns the variable default value from getFeatureVariableDouble', function() {
          var result = optlyInstance.getFeatureVariableDouble('test_feature_for_experiment', 'button_width', 'user1', {
            test_attribute: 'test_value',
          });
          assert.strictEqual(result, 50.55);
          assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
            'OPTIMIZELY: User "user1" is not in any variation or rollout rule. Returning default value for variable "button_width" of feature flag "test_feature_for_experiment".'
          );
        });

        it('returns the variable default value from getFeatureVariableInteger', function() {
          var result = optlyInstance.getFeatureVariableInteger('test_feature_for_experiment', 'num_buttons', 'user1', {
            test_attribute: 'test_value',
          });
          assert.strictEqual(result, 10);
          assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
            'OPTIMIZELY: User "user1" is not in any variation or rollout rule. Returning default value for variable "num_buttons" of feature flag "test_feature_for_experiment".'
          );
        });

        it('returns the variable default value from getFeatureVariableString', function() {
          var result = optlyInstance.getFeatureVariableString('test_feature_for_experiment', 'button_txt', 'user1', {
            test_attribute: 'test_value',
          });
          assert.strictEqual(result, 'Buy me');
          assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
            'OPTIMIZELY: User "user1" is not in any variation or rollout rule. Returning default value for variable "button_txt" of feature flag "test_feature_for_experiment".'
          );
        });

        it('returns the variable default value from getFeatureVariableJSON', function() {
          var result = optlyInstance.getFeatureVariableJSON('test_feature_for_experiment', 'button_info', 'user1', {
            test_attribute: 'test_value',
          });
          assert.deepEqual(result, {
            num_buttons: 0,
            text: 'default value',
          });
          assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
            'OPTIMIZELY: User "user1" is not in any variation or rollout rule. Returning default value for variable "button_info" of feature flag "test_feature_for_experiment".'
          );
        });

        it('returns the right values from getAllFeatureVariables', function() {
          var result = optlyInstance.getAllFeatureVariables('test_feature_for_experiment', 'user1', {
            test_attribute: 'test_value',
          });
          assert.deepEqual(result, {
            is_button_animated: false,
            button_width: 50.55,
            num_buttons: 10,
            button_txt: 'Buy me',
            button_info: {
              num_buttons: 0,
              text: 'default value',
            },
          });
          assert.deepEqual(
            createdLogger.log.args,
            [
              [
                LOG_LEVEL.INFO,
                '%s: User "%s" is not in any variation or rollout rule. Returning default value for variable "%s" of feature flag "%s".',
                'OPTIMIZELY',
                'user1',
                'num_buttons',
                'test_feature_for_experiment'
              ],
              [
                LOG_LEVEL.INFO,
                '%s: User "%s" is not in any variation or rollout rule. Returning default value for variable "%s" of feature flag "%s".',
                'OPTIMIZELY',
                'user1',
                'is_button_animated',
                'test_feature_for_experiment'
              ],
              [
                LOG_LEVEL.INFO,
                '%s: User "%s" is not in any variation or rollout rule. Returning default value for variable "%s" of feature flag "%s".',
                'OPTIMIZELY',
                'user1',
                'button_txt',
                'test_feature_for_experiment'
              ],
              [
                LOG_LEVEL.INFO,
                '%s: User "%s" is not in any variation or rollout rule. Returning default value for variable "%s" of feature flag "%s".',
                'OPTIMIZELY',
                'user1',
                'button_width',
                'test_feature_for_experiment'
              ],
              [
                LOG_LEVEL.INFO,
                '%s: User "%s" is not in any variation or rollout rule. Returning default value for variable "%s" of feature flag "%s".',
                'OPTIMIZELY',
                'user1',
                'button_info',
                'test_feature_for_experiment'
              ]
            ]
          );
        });
      });

      it('returns null from getFeatureVariable if user id is null when variable type is boolean', function() {
        var result = optlyInstance.getFeatureVariable('test_feature_for_experiment', 'is_button_animated', null, {
          test_attribute: 'test_value',
        });
        assert.strictEqual(result, null);
        assert.equal(
            buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'OPTIMIZELY: Provided user_id is in an invalid format.'
        );
      });

      it('returns null from getFeatureVariable if user id is undefined when variable type is boolean', function() {
        var result = optlyInstance.getFeatureVariable('test_feature_for_experiment', 'is_button_animated', undefined, {
          test_attribute: 'test_value',
        });
        assert.strictEqual(result, null);
        assert.equal(
            buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'OPTIMIZELY: Provided user_id is in an invalid format.'
        );
      });

      it('returns null from getFeatureVariable if user id is not provided when variable type is boolean', function() {
        var result = optlyInstance.getFeatureVariable('test_feature_for_experiment', 'is_button_animated');
        assert.strictEqual(result, null);
        assert.equal(
            buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'OPTIMIZELY: Provided user_id is in an invalid format.'
        );
      });

      it('returns null from getFeatureVariable if user id is null when variable type is double', function() {
        var result = optlyInstance.getFeatureVariable('test_feature_for_experiment', 'button_width', null, {
          test_attribute: 'test_value',
        });
        assert.strictEqual(result, null);
        assert.equal(
            buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'OPTIMIZELY: Provided user_id is in an invalid format.'
        );
      });

      it('returns null from getFeatureVariable if user id is undefined when variable type is double', function() {
        var result = optlyInstance.getFeatureVariable('test_feature_for_experiment', 'button_width', undefined, {
          test_attribute: 'test_value',
        });
        assert.strictEqual(result, null);
        assert.equal(
            buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'OPTIMIZELY: Provided user_id is in an invalid format.'
        );
      });

      it('returns null from getFeatureVariable if user id is not provided when variable type is double', function() {
        var result = optlyInstance.getFeatureVariable('test_feature_for_experiment', 'button_width');
        assert.strictEqual(result, null);
        assert.equal(
            buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'OPTIMIZELY: Provided user_id is in an invalid format.'
        );
      });

      it('returns null from getFeatureVariable if user id is null when variable type is integer', function() {
        var result = optlyInstance.getFeatureVariable('test_feature_for_experiment', 'num_buttons', null, {
          test_attribute: 'test_value',
        });
        assert.strictEqual(result, null);
        assert.equal(
            buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'OPTIMIZELY: Provided user_id is in an invalid format.'
        );
      });

      it('returns null from getFeatureVariable if user id is undefined when variable type is integer', function() {
        var result = optlyInstance.getFeatureVariable('test_feature_for_experiment', 'num_buttons', undefined, {
          test_attribute: 'test_value',
        });
        assert.strictEqual(result, null);
        assert.equal(
            buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'OPTIMIZELY: Provided user_id is in an invalid format.'
        );
      });

      it('returns null from getFeatureVariable if user id is not provided when variable type is integer', function() {
        var result = optlyInstance.getFeatureVariable('test_feature_for_experiment', 'num_buttons');
        assert.strictEqual(result, null);
        assert.equal(
            buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'OPTIMIZELY: Provided user_id is in an invalid format.'
        );
      });

      it('returns null from getFeatureVariable if user id is null when variable type is string', function() {
        var result = optlyInstance.getFeatureVariable('test_feature_for_experiment', 'button_txt', null, {
          test_attribute: 'test_value',
        });
        assert.strictEqual(result, null);
        assert.equal(
            buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'OPTIMIZELY: Provided user_id is in an invalid format.'
        );
      });

      it('returns null from getFeatureVariable if user id is undefined when variable type is string', function() {
        var result = optlyInstance.getFeatureVariable('test_feature_for_experiment', 'button_txt', undefined, {
          test_attribute: 'test_value',
        });
        assert.strictEqual(result, null);
        assert.equal(
            buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'OPTIMIZELY: Provided user_id is in an invalid format.'
        );
      });

      it('returns null from getFeatureVariable if user id is not provided when variable type is string', function() {
        var result = optlyInstance.getFeatureVariable('test_feature_for_experiment', 'button_txt');
        assert.strictEqual(result, null);
        assert.equal(
            buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'OPTIMIZELY: Provided user_id is in an invalid format.'
        );
      });

      it('returns null from getFeatureVariable if user id is null when variable type is json', function() {
        var result = optlyInstance.getFeatureVariable('test_feature_for_experiment', 'button_info', null, {
          test_attribute: 'test_value',
        });
        assert.strictEqual(result, null);
        assert.equal(
            buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'OPTIMIZELY: Provided user_id is in an invalid format.'
        );
      });

      it('returns null from getFeatureVariable if user id is undefined when variable type is json', function() {
        var result = optlyInstance.getFeatureVariable('test_feature_for_experiment', 'button_info', undefined, {
          test_attribute: 'test_value',
        });
        assert.strictEqual(result, null);
        assert.equal(
            buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'OPTIMIZELY: Provided user_id is in an invalid format.'
        );
      });

      it('returns null from getFeatureVariable if user id is not provided when variable type is json', function() {
        var result = optlyInstance.getFeatureVariable('test_feature_for_experiment', 'button_info');
        assert.strictEqual(result, null);
        assert.equal(
            buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'OPTIMIZELY: Provided user_id is in an invalid format.'
        );
      });

      it('returns null from getFeatureVariableBoolean when called with a non-boolean variable', function() {
        var result = optlyInstance.getFeatureVariableBoolean('test_feature_for_experiment', 'button_width', 'user1');
        assert.strictEqual(result, null);
        assert.equal(
          buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'OPTIMIZELY: Requested variable type "boolean", but variable is of type "double". Use correct API to retrieve value. Returning None.'
        );
      });

      it('returns null from getFeatureVariableDouble when called with a non-double variable', function() {
        var result = optlyInstance.getFeatureVariableDouble(
          'test_feature_for_experiment',
          'is_button_animated',
          'user1'
        );
        assert.strictEqual(result, null);
        assert.equal(
          buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'OPTIMIZELY: Requested variable type "double", but variable is of type "boolean". Use correct API to retrieve value. Returning None.'
        );
      });

      it('returns null from getFeatureVariableInteger when called with a non-integer variable', function() {
        var result = optlyInstance.getFeatureVariableInteger('test_feature_for_experiment', 'button_width', 'user1');
        assert.strictEqual(result, null);
        assert.equal(
          buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'OPTIMIZELY: Requested variable type "integer", but variable is of type "double". Use correct API to retrieve value. Returning None.'
        );
      });

      it('returns null from getFeatureVariableString when called with a non-string variable', function() {
        var result = optlyInstance.getFeatureVariableString('test_feature_for_experiment', 'num_buttons', 'user1');
        assert.strictEqual(result, null);
        assert.equal(
          buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'OPTIMIZELY: Requested variable type "string", but variable is of type "integer". Use correct API to retrieve value. Returning None.'
        );
      });

      it('returns null from getFeatureVariableJSON when called with a non-json variable', function() {
        var result = optlyInstance.getFeatureVariableJSON('test_feature_for_experiment', 'button_txt', 'user1');
        assert.strictEqual(result, null);
        assert.equal(
          buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'OPTIMIZELY: Requested variable type "json", but variable is of type "string". Use correct API to retrieve value. Returning None.'
        );
      });

      it('returns null from getFeatureVariableBoolean if user id is null', function() {
        var result = optlyInstance.getFeatureVariableBoolean(
          'test_feature_for_experiment',
          'is_button_animated',
          null,
          { test_attribute: 'test_value' }
        );
        assert.strictEqual(result, null);
        assert.equal(
            buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'OPTIMIZELY: Provided user_id is in an invalid format.'
        );
      });

      it('returns null from getFeatureVariableBoolean if user id is undefined', function() {
        var result = optlyInstance.getFeatureVariableBoolean(
          'test_feature_for_experiment',
          'is_button_animated',
          undefined,
          { test_attribute: 'test_value' }
        );
        assert.strictEqual(result, null);
        assert.equal(
            buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'OPTIMIZELY: Provided user_id is in an invalid format.'
        );
      });

      it('returns null from getFeatureVariableBoolean if user id is not provided', function() {
        var result = optlyInstance.getFeatureVariableBoolean('test_feature_for_experiment', 'is_button_animated');
        assert.strictEqual(result, null);
        assert.equal(
            buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'OPTIMIZELY: Provided user_id is in an invalid format.'
        );
      });

      it('returns null from getFeatureVariableDouble if user id is null', function() {
        var result = optlyInstance.getFeatureVariableDouble('test_feature_for_experiment', 'button_width', null, {
          test_attribute: 'test_value',
        });
        assert.strictEqual(result, null);
        assert.equal(
            buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'OPTIMIZELY: Provided user_id is in an invalid format.'
        );
      });

      it('returns null from getFeatureVariableDouble if user id is undefined', function() {
        var result = optlyInstance.getFeatureVariableDouble('test_feature_for_experiment', 'button_width', undefined, {
          test_attribute: 'test_value',
        });
        assert.strictEqual(result, null);
        assert.equal(
            buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'OPTIMIZELY: Provided user_id is in an invalid format.'
        );
      });

      it('returns null from getFeatureVariableDouble if user id is not provided', function() {
        var result = optlyInstance.getFeatureVariableDouble('test_feature_for_experiment', 'button_width');
        assert.strictEqual(result, null);
        assert.equal(
            buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'OPTIMIZELY: Provided user_id is in an invalid format.'
        );
      });

      it('returns null from getFeatureVariableInteger if user id is null', function() {
        var result = optlyInstance.getFeatureVariableInteger('test_feature_for_experiment', 'num_buttons', null, {
          test_attribute: 'test_value',
        });
        assert.strictEqual(result, null);
        assert.equal(
            buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'OPTIMIZELY: Provided user_id is in an invalid format.'
        );
      });

      it('returns null from getFeatureVariableInteger if user id is undefined', function() {
        var result = optlyInstance.getFeatureVariableInteger('test_feature_for_experiment', 'num_buttons', undefined, {
          test_attribute: 'test_value',
        });
        assert.strictEqual(result, null);
        assert.equal(
            buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'OPTIMIZELY: Provided user_id is in an invalid format.'
        );
      });

      it('returns null from getFeatureVariableInteger if user id is not provided', function() {
        var result = optlyInstance.getFeatureVariableInteger('test_feature_for_experiment', 'num_buttons');
        assert.strictEqual(result, null);
        assert.equal(
            buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'OPTIMIZELY: Provided user_id is in an invalid format.'
        );
      });

      it('returns null from getFeatureVariableString if user id is null', function() {
        var result = optlyInstance.getFeatureVariableString('test_feature_for_experiment', 'button_txt', null, {
          test_attribute: 'test_value',
        });
        assert.strictEqual(result, null);
        assert.equal(
            buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'OPTIMIZELY: Provided user_id is in an invalid format.'
        );
      });

      it('returns null from getFeatureVariableString if user id is undefined', function() {
        var result = optlyInstance.getFeatureVariableString('test_feature_for_experiment', 'button_txt', undefined, {
          test_attribute: 'test_value',
        });
        assert.strictEqual(result, null);
        assert.equal(
            buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'OPTIMIZELY: Provided user_id is in an invalid format.'
        );
      });

      it('returns null from getFeatureVariableString if user id is not provided', function() {
        var result = optlyInstance.getFeatureVariableString('test_feature_for_experiment', 'button_txt');
        assert.strictEqual(result, null);
        assert.equal(
            buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'OPTIMIZELY: Provided user_id is in an invalid format.'
        );
      });

      it('returns null from getFeatureVariableJSON if user id is null', function() {
        var result = optlyInstance.getFeatureVariableJSON('test_feature_for_experiment', 'button_info', null, {
          test_attribute: 'test_value',
        });
        assert.strictEqual(result, null);
        assert.equal(
            buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'OPTIMIZELY: Provided user_id is in an invalid format.'
        );
      });

      it('returns null from getFeatureVariableJSON if user id is undefined', function() {
        var result = optlyInstance.getFeatureVariableJSON('test_feature_for_experiment', 'button_info', undefined, {
          test_attribute: 'test_value',
        });
        assert.strictEqual(result, null);
        assert.equal(
            buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'OPTIMIZELY: Provided user_id is in an invalid format.'
        );
      });

      it('returns null from getFeatureVariableJSON if user id is not provided', function() {
        var result = optlyInstance.getFeatureVariableJSON('test_feature_for_experiment', 'button_info');
        assert.strictEqual(result, null);
        assert.equal(
            buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'OPTIMIZELY: Provided user_id is in an invalid format.'
        );
      });

      describe('type casting failures', function() {
        describe('invalid boolean', function() {
          beforeEach(function() {
            sandbox.stub(projectConfig, 'getVariableValueForVariation').returns('falsezzz');
          });

          it('should return null and log an error', function() {
            var result = optlyInstance.getFeatureVariableBoolean(
              'test_feature_for_experiment',
              'is_button_animated',
              'user1'
            );
            assert.strictEqual(result, null);
            assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
              'PROJECT_CONFIG: Unable to cast value falsezzz to type boolean, returning null.'
            );
          });
        });

        describe('invalid integer', function() {
          beforeEach(function() {
            sandbox.stub(projectConfig, 'getVariableValueForVariation').returns('zzz123');
          });

          it('should return null and log an error', function() {
            var result = optlyInstance.getFeatureVariableInteger('test_feature_for_experiment', 'num_buttons', 'user1');
            assert.strictEqual(result, null);
            assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
              'PROJECT_CONFIG: Unable to cast value zzz123 to type integer, returning null.'
            );
          });
        });

        describe('invalid double', function() {
          beforeEach(function() {
            sandbox.stub(projectConfig, 'getVariableValueForVariation').returns('zzz44.55');
          });

          it('should return null and log an error', function() {
            var result = optlyInstance.getFeatureVariableDouble('test_feature_for_experiment', 'button_width', 'user1');
            assert.strictEqual(result, null);
            assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
              'PROJECT_CONFIG: Unable to cast value zzz44.55 to type double, returning null.'
            );
          });
        });

        describe('invalid json', function() {
          beforeEach(function() {
            sandbox.stub(projectConfig, 'getVariableValueForVariation').returns('zzz44.55');
          });

          it('should return null and log an error', function() {
            var result = optlyInstance.getFeatureVariableJSON('test_feature_for_experiment', 'button_info', 'user1');
            assert.strictEqual(result, null);
            assert.equal(
              buildLogMessageFromArgs(createdLogger.log.lastCall.args),
              'PROJECT_CONFIG: Unable to cast value zzz44.55 to type json, returning null.'
            );
          });
        });
      });

      it('returns null from getFeatureVariable if the argument feature key is invalid when variable type is boolean', function() {
        var result = optlyInstance.getFeatureVariable('thisIsNotAValidKey<><><>', 'is_button_animated', 'user1');
        assert.strictEqual(result, null);
        assert.equal(
            buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'PROJECT_CONFIG: Feature key thisIsNotAValidKey<><><> is not in datafile.'
        );
      });

      it('returns null from getFeatureVariable if the argument feature key is invalid when variable type is double', function() {
        var result = optlyInstance.getFeatureVariable('thisIsNotAValidKey<><><>', 'button_width', 'user1');
        assert.strictEqual(result, null);
        assert.equal(
            buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'PROJECT_CONFIG: Feature key thisIsNotAValidKey<><><> is not in datafile.'
        );
      });

      it('returns null from getFeatureVariable if the argument feature key is invalid when variable type is integer', function() {
        var result = optlyInstance.getFeatureVariable('thisIsNotAValidKey<><><>', 'num_buttons', 'user1');
        assert.strictEqual(result, null);
        assert.equal(
            buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'PROJECT_CONFIG: Feature key thisIsNotAValidKey<><><> is not in datafile.'
        );
      });

      it('returns null from getFeatureVariable if the argument feature key is invalid when variable type is string', function() {
        var result = optlyInstance.getFeatureVariable('thisIsNotAValidKey<><><>', 'button_txt', 'user1');
        assert.strictEqual(result, null);
        assert.equal(
            buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'PROJECT_CONFIG: Feature key thisIsNotAValidKey<><><> is not in datafile.'
        );
      });

      it('returns null from getFeatureVariable if the argument feature key is invalid when variable type is json', function() {
        var result = optlyInstance.getFeatureVariable('thisIsNotAValidKey<><><>', 'button_info', 'user1');
        assert.strictEqual(result, null);
        assert.equal(
            buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'PROJECT_CONFIG: Feature key thisIsNotAValidKey<><><> is not in datafile.'
        );
      });

      it('returns null from getFeatureVariable if the argument variable key is invalid', function() {
        var result = optlyInstance.getFeatureVariable(
          'test_feature_for_experiment',
          'thisIsNotAVariableKey****',
          'user1'
        );
        assert.strictEqual(result, null);
        assert.equal(
            buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'PROJECT_CONFIG: Variable with key "thisIsNotAVariableKey****" associated with feature with key "test_feature_for_experiment" is not in datafile.'
        );
      });

      it('returns null from getFeatureVariableBoolean if the argument feature key is invalid', function() {
        var result = optlyInstance.getFeatureVariableBoolean('thisIsNotAValidKey<><><>', 'is_button_animated', 'user1');
        assert.strictEqual(result, null);
        assert.equal(
            buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'PROJECT_CONFIG: Feature key thisIsNotAValidKey<><><> is not in datafile.'
        );
      });

      it('returns null from getFeatureVariableDouble if the argument feature key is invalid', function() {
        var result = optlyInstance.getFeatureVariableDouble('thisIsNotAValidKey<><><>', 'button_width', 'user1');
        assert.strictEqual(result, null);
        assert.equal(
            buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'PROJECT_CONFIG: Feature key thisIsNotAValidKey<><><> is not in datafile.'
        );
      });

      it('returns null from getFeatureVariableInteger if the argument feature key is invalid', function() {
        var result = optlyInstance.getFeatureVariableInteger('thisIsNotAValidKey<><><>', 'num_buttons', 'user1');
        assert.strictEqual(result, null);
        assert.equal(
            buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'PROJECT_CONFIG: Feature key thisIsNotAValidKey<><><> is not in datafile.'
        );
      });

      it('returns null from getFeatureVariableString if the argument feature key is invalid', function() {
        var result = optlyInstance.getFeatureVariableString('thisIsNotAValidKey<><><>', 'button_txt', 'user1');
        assert.strictEqual(result, null);
        assert.equal(
            buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'PROJECT_CONFIG: Feature key thisIsNotAValidKey<><><> is not in datafile.'
        );
      });

      it('returns null from getFeatureVariableJSON if the argument feature key is invalid', function() {
        var result = optlyInstance.getFeatureVariableJSON('thisIsNotAValidKey<><><>', 'button_info', 'user1');
        assert.strictEqual(result, null);
        assert.equal(
            buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'PROJECT_CONFIG: Feature key thisIsNotAValidKey<><><> is not in datafile.'
        );
      });

      it('returns null from getFeatureVariableBoolean if the argument variable key is invalid', function() {
        var result = optlyInstance.getFeatureVariableBoolean(
          'test_feature_for_experiment',
          'thisIsNotAVariableKey****',
          'user1'
        );
        assert.strictEqual(result, null);
        assert.equal(
            buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'PROJECT_CONFIG: Variable with key "thisIsNotAVariableKey****" associated with feature with key "test_feature_for_experiment" is not in datafile.'
        );
      });

      it('returns null from getFeatureVariableDouble if the argument variable key is invalid', function() {
        var result = optlyInstance.getFeatureVariableDouble(
          'test_feature_for_experiment',
          'thisIsNotAVariableKey****',
          'user1'
        );
        assert.strictEqual(result, null);
        assert.equal(
            buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'PROJECT_CONFIG: Variable with key "thisIsNotAVariableKey****" associated with feature with key "test_feature_for_experiment" is not in datafile.'
        );
      });

      it('returns null from getFeatureVariableInteger if the argument variable key is invalid', function() {
        var result = optlyInstance.getFeatureVariableInteger(
          'test_feature_for_experiment',
          'thisIsNotAVariableKey****',
          'user1'
        );
        assert.strictEqual(result, null);
        assert.equal(
            buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'PROJECT_CONFIG: Variable with key "thisIsNotAVariableKey****" associated with feature with key "test_feature_for_experiment" is not in datafile.'
        );
      });

      it('returns null from getFeatureVariableString if the argument variable key is invalid', function() {
        var result = optlyInstance.getFeatureVariableString(
          'test_feature_for_experiment',
          'thisIsNotAVariableKey****',
          'user1'
        );
        assert.strictEqual(result, null);
        assert.equal(
            buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'PROJECT_CONFIG: Variable with key "thisIsNotAVariableKey****" associated with feature with key "test_feature_for_experiment" is not in datafile.'
        );
      });

      it('returns null from getFeatureVariableJSON if the argument variable key is invalid', function() {
        var result = optlyInstance.getFeatureVariableJSON(
          'test_feature_for_experiment',
          'thisIsNotAVariableKey****',
          'user1'
        );
        assert.strictEqual(result, null);
        assert.equal(
            buildLogMessageFromArgs(createdLogger.log.lastCall.args),
          'PROJECT_CONFIG: Variable with key "thisIsNotAVariableKey****" associated with feature with key "test_feature_for_experiment" is not in datafile.'
        );
      });

      it('returns null from getFeatureVariable when optimizely object is not a valid instance', function() {
        var instance = new Optimizely({
          datafile: {},
          errorHandler: errorHandler,
          eventDispatcher: eventDispatcher,
          logger: createdLogger,
          eventProcessor,
          notificationCenter,
        });

        createdLogger.log.reset();

        instance.getFeatureVariable('test_feature_for_experiment', 'thisIsNotAVariableKey****', 'user1');

        sinon.assert.calledOnce(createdLogger.log);
        var logMessage = buildLogMessageFromArgs(createdLogger.log.args[0]);
        assert.strictEqual(logMessage, sprintf(LOG_MESSAGES.INVALID_OBJECT, 'OPTIMIZELY', 'getFeatureVariable'));
      });

      it('returns null from getFeatureVariableBoolean when optimizely object is not a valid instance', function() {
        var instance = new Optimizely({
          datafile: {},
          errorHandler: errorHandler,
          eventDispatcher: eventDispatcher,
          logger: createdLogger,
          notificationCenter,
          eventProcessor,
        });

        createdLogger.log.reset();

        instance.getFeatureVariableBoolean('test_feature_for_experiment', 'thisIsNotAVariableKey****', 'user1');

        sinon.assert.calledOnce(createdLogger.log);
        var logMessage = buildLogMessageFromArgs(createdLogger.log.args[0]);
        assert.strictEqual(logMessage, sprintf(LOG_MESSAGES.INVALID_OBJECT, 'OPTIMIZELY', 'getFeatureVariableBoolean'));
      });

      it('returns null from getFeatureVariableDouble when optimizely object is not a valid instance', function() {
        var instance = new Optimizely({
          datafile: {},
          errorHandler: errorHandler,
          eventDispatcher: eventDispatcher,
          logger: createdLogger,
          notificationCenter,
          eventProcessor,
        });

        createdLogger.log.reset();

        instance.getFeatureVariableDouble('test_feature_for_experiment', 'thisIsNotAVariableKey****', 'user1');

        sinon.assert.calledOnce(createdLogger.log);
        var logMessage = buildLogMessageFromArgs(createdLogger.log.args[0]);
        assert.strictEqual(logMessage, sprintf(LOG_MESSAGES.INVALID_OBJECT, 'OPTIMIZELY', 'getFeatureVariableDouble'));
      });

      it('returns null from getFeatureVariableInteger when optimizely object is not a valid instance', function() {
        var instance = new Optimizely({
          datafile: {},
          errorHandler: errorHandler,
          eventDispatcher: eventDispatcher,
          logger: createdLogger,
          notificationCenter,
          eventProcessor,
        });

        createdLogger.log.reset();

        instance.getFeatureVariableInteger('test_feature_for_experiment', 'thisIsNotAVariableKey****', 'user1');

        sinon.assert.calledOnce(createdLogger.log);
        var logMessage = buildLogMessageFromArgs(createdLogger.log.args[0]);
        assert.strictEqual(logMessage, sprintf(LOG_MESSAGES.INVALID_OBJECT, 'OPTIMIZELY', 'getFeatureVariableInteger'));
      });

      it('returns null from getFeatureVariableString when optimizely object is not a valid instance', function() {
        var instance = new Optimizely({
          datafile: {},
          errorHandler: errorHandler,
          eventDispatcher: eventDispatcher,
          logger: createdLogger,
          notificationCenter,
          eventProcessor,
        });

        createdLogger.log.reset();

        instance.getFeatureVariableString('test_feature_for_experiment', 'thisIsNotAVariableKey****', 'user1');

        sinon.assert.calledOnce(createdLogger.log);
        var logMessage = buildLogMessageFromArgs(createdLogger.log.args[0]);
        assert.strictEqual(logMessage, sprintf(LOG_MESSAGES.INVALID_OBJECT, 'OPTIMIZELY', 'getFeatureVariableString'));
      });

      it('returns null from getFeatureVariableJSON when optimizely object is not a valid instance', function() {
        var instance = new Optimizely({
          datafile: {},
          errorHandler: errorHandler,
          eventDispatcher: eventDispatcher,
          logger: createdLogger,
          notificationCenter,
          eventProcessor,
        });

        createdLogger.log.reset();

        instance.getFeatureVariableJSON('test_feature_for_experiment', 'thisIsNotAVariableKey****', 'user1');

        sinon.assert.calledOnce(createdLogger.log);
        var logMessage = buildLogMessageFromArgs(createdLogger.log.args[0]);
        assert.strictEqual(logMessage, sprintf(LOG_MESSAGES.INVALID_OBJECT, 'OPTIMIZELY', 'getFeatureVariableJSON'));
      });
    });
  });

  describe('audience match types', function() {
    var sandbox = sinon.sandbox.create();
    var createdLogger = logger.createLogger({
      logLevel: LOG_LEVEL.INFO,
      logToConsole: false,
    });
    var optlyInstance;
    var notificationCenter = createNotificationCenter({ logger: createdLogger, errorHandler: errorHandler });
    var eventProcessor = createEventProcessor({
      dispatcher: eventDispatcher,
      batchSize: 1,
      notificationCenter: notificationCenter,
    });
    beforeEach(function() {
      optlyInstance = new Optimizely({
        clientEngine: 'node-sdk',
        datafile: testData.getTypedAudiencesConfig(),
        errorHandler: errorHandler,
        eventDispatcher: eventDispatcher,
        jsonSchemaValidator: jsonSchemaValidator,
        logger: createdLogger,
        isValidInstance: true,
        eventBatchSize: 1,
        eventProcessor,
        notificationCenter,
      });

      sandbox.stub(errorHandler, 'handleError');
      sandbox.stub(createdLogger, 'log');
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('can activate an experiment with a typed audience', function() {
      var variationKey = optlyInstance.activate('typed_audience_experiment', 'user1', {
        // Should be included via exact match string audience with id '3468206642'
        house: 'Gryffindor',
      });
      assert.strictEqual(variationKey, 'A');
      sinon.assert.calledOnce(eventDispatcher.dispatchEvent);
      assert.includeDeepMembers(eventDispatcher.dispatchEvent.getCall(0).args[0].params.visitors[0].attributes, [
        { entity_id: '594015', key: 'house', type: 'custom', value: 'Gryffindor' },
      ]);

      variationKey = optlyInstance.activate('typed_audience_experiment', 'user1', {
        // Should be included via exact match number audience with id '3468206646'
        lasers: 45.5,
      });
      assert.strictEqual(variationKey, 'A');
      sinon.assert.calledTwice(eventDispatcher.dispatchEvent);
      assert.includeDeepMembers(eventDispatcher.dispatchEvent.getCall(1).args[0].params.visitors[0].attributes, [
        { entity_id: '594016', key: 'lasers', type: 'custom', value: 45.5 },
      ]);
    });

    it('can exclude a user from an experiment with a typed audience via activate', function() {
      var variationKey = optlyInstance.activate('typed_audience_experiment', 'user1', {
        house: 'Hufflepuff',
      });
      assert.isNull(variationKey);
      sinon.assert.notCalled(eventDispatcher.dispatchEvent);
    });

    it('can track an experiment with a typed audience', function() {
      optlyInstance.track('item_bought', 'user1', {
        // Should be included via substring match string audience with id '3988293898'
        house: 'Welcome to Slytherin!',
      });
      sinon.assert.calledOnce(eventDispatcher.dispatchEvent);
      assert.includeDeepMembers(eventDispatcher.dispatchEvent.getCall(0).args[0].params.visitors[0].attributes, [
        { entity_id: '594015', key: 'house', type: 'custom', value: 'Welcome to Slytherin!' },
      ]);
    });

    it('can include a user in a rollout with a typed audience via isFeatureEnabled', function() {
      var featureEnabled = optlyInstance.isFeatureEnabled('feat', 'user1', {
        // Should be included via exists match audience with id '3988293899'
        favorite_ice_cream: 'chocolate',
      });
      assert.isTrue(featureEnabled);

      featureEnabled = optlyInstance.isFeatureEnabled('feat', 'user1', {
        // Should be included via less-than match audience with id '3468206644'
        lasers: -3,
      });
      assert.isTrue(featureEnabled);
    });

    it('can exclude a user from a rollout with a typed audience via isFeatureEnabled', function() {
      var featureEnabled = optlyInstance.isFeatureEnabled('feat', 'user1', {});
      assert.isFalse(featureEnabled);
    });

    it('can return a variable value from a feature test with a typed audience via getFeatureVariable', function() {
      var variableValue = optlyInstance.getFeatureVariable('feat_with_var', 'x', 'user1', {
        // Should be included in the feature test via greater-than match audience with id '3468206647'
        lasers: 71,
      });
      assert.strictEqual(variableValue, 'xyz');

      variableValue = optlyInstance.getFeatureVariable('feat_with_var', 'x', 'user1', {
        // Should be included in the feature test via exact match boolean audience with id '3468206643'
        should_do_it: true,
      });
      assert.strictEqual(variableValue, 'xyz');
    });

    it('can return a variable value from a feature test with a typed audience via getFeatureVariableString', function() {
      var variableValue = optlyInstance.getFeatureVariableString('feat_with_var', 'x', 'user1', {
        // Should be included in the feature test via greater-than match audience with id '3468206647'
        lasers: 71,
      });
      assert.strictEqual(variableValue, 'xyz');

      variableValue = optlyInstance.getFeatureVariableString('feat_with_var', 'x', 'user1', {
        // Should be included in the feature test via exact match boolean audience with id '3468206643'
        should_do_it: true,
      });
      assert.strictEqual(variableValue, 'xyz');
    });

    it('can return the default value from a feature variable from getFeatureVariable, via excluding a user from a feature test with a typed audience', function() {
      var variableValue = optlyInstance.getFeatureVariable('feat_with_var', 'x', 'user1', {
        lasers: 50,
      });
      assert.strictEqual(variableValue, 'x');
    });

    it('can return the default value from a feature variable from getFeatureVariableString, via excluding a user from a feature test with a typed audience', function() {
      var variableValue = optlyInstance.getFeatureVariableString('feat_with_var', 'x', 'user1', {
        lasers: 50,
      });
      assert.strictEqual(variableValue, 'x');
    });
  });

  describe('audience combinations', function() {
    var sandbox = sinon.sandbox.create();
    var createdLogger = logger.createLogger({
      logLevel: LOG_LEVEL.INFO,
      logToConsole: false,
    });
    var optlyInstance;
    var audienceEvaluator;
    var notificationCenter = createNotificationCenter({ logger: createdLogger, errorHandler: errorHandler });
    var eventProcessor = createEventProcessor({
      dispatcher: eventDispatcher,
      batchSize: 1,
      notificationCenter: notificationCenter,
    });
    beforeEach(function() {
      optlyInstance = new Optimizely({
        clientEngine: 'node-sdk',
        datafile: testData.getTypedAudiencesConfig(),
        errorHandler: errorHandler,
        eventDispatcher: eventDispatcher,
        jsonSchemaValidator: jsonSchemaValidator,
        logger: createdLogger,
        isValidInstance: true,
        eventBatchSize: 1,
        notificationCenter,
        eventProcessor,
      });
      audienceEvaluator = AudienceEvaluator.prototype;

      sandbox.stub(errorHandler, 'handleError');
      sandbox.stub(createdLogger, 'log');
      sandbox.spy(audienceEvaluator, 'evaluate');
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('can activate an experiment with complex audience conditions', function() {
      var variationKey = optlyInstance.activate('audience_combinations_experiment', 'user1', {
        // Should be included via substring match string audience with id '3988293898', and
        // exact match number audience with id '3468206646'
        house: 'Welcome to Slytherin!',
        lasers: 45.5,
      });
      assert.strictEqual(variationKey, 'A');
      sinon.assert.calledOnce(eventDispatcher.dispatchEvent);
      assert.includeDeepMembers(eventDispatcher.dispatchEvent.getCall(0).args[0].params.visitors[0].attributes, [
        { entity_id: '594015', key: 'house', type: 'custom', value: 'Welcome to Slytherin!' },
        { entity_id: '594016', key: 'lasers', type: 'custom', value: 45.5 },
      ]);
      sinon.assert.calledWithExactly(
        audienceEvaluator.evaluate,
        optlyInstance.projectConfigManager.getConfig().experiments[2].audienceConditions,
        optlyInstance.projectConfigManager.getConfig().audiencesById,
        { house: 'Welcome to Slytherin!', lasers: 45.5 }
      );
    });

    it('can exclude a user from an experiment with complex audience conditions', function() {
      var variationKey = optlyInstance.activate('audience_combinations_experiment', 'user1', {
        // Should be excluded - substring string audience with id '3988293898' does not match,
        // so the overall conditions fail
        house: 'Hufflepuff',
        lasers: 45.5,
      });
      assert.isNull(variationKey);
      sinon.assert.notCalled(eventDispatcher.dispatchEvent);
      sinon.assert.calledWithExactly(
        audienceEvaluator.evaluate,
        optlyInstance.projectConfigManager.getConfig().experiments[2].audienceConditions,
        optlyInstance.projectConfigManager.getConfig().audiencesById,
        { house: 'Hufflepuff', lasers: 45.5 }
      );
    });

    it('can track an experiment with complex audience conditions', function() {
      optlyInstance.track('user_signed_up', 'user1', {
        // Should be included via exact match string audience with id '3468206642', and
        // exact match boolean audience with id '3468206643'
        house: 'Gryffindor',
        should_do_it: true,
      });
      sinon.assert.calledOnce(eventDispatcher.dispatchEvent);
      assert.includeDeepMembers(eventDispatcher.dispatchEvent.getCall(0).args[0].params.visitors[0].attributes, [
        { entity_id: '594015', key: 'house', type: 'custom', value: 'Gryffindor' },
        { entity_id: '594017', key: 'should_do_it', type: 'custom', value: true },
      ]);
    });

    it('can include a user in a rollout with complex audience conditions via isFeatureEnabled', function() {
      var featureEnabled = optlyInstance.isFeatureEnabled('feat2', 'user1', {
        // Should be included via substring match string audience with id '3988293898', and
        // exists audience with id '3988293899'
        house: '...Slytherinnn...sss.',
        favorite_ice_cream: 'matcha',
      });
      assert.isTrue(featureEnabled);
      sinon.assert.calledWithExactly(
        audienceEvaluator.evaluate,
        optlyInstance.projectConfigManager.getConfig().rollouts[2].experiments[0].audienceConditions,
        optlyInstance.projectConfigManager.getConfig().audiencesById,
        { house: '...Slytherinnn...sss.', favorite_ice_cream: 'matcha' }
      );
    });

    it('can exclude a user from a rollout with complex audience conditions via isFeatureEnabled', function() {
      var featureEnabled = optlyInstance.isFeatureEnabled('feat2', 'user1', {
        // Should be excluded - substring match string audience with id '3988293898' does not match,
        // and no audience in the other branch of the 'and' matches either
        house: 'Lannister',
      });
      assert.isFalse(featureEnabled);
      sinon.assert.calledWithExactly(
        audienceEvaluator.evaluate,
        optlyInstance.projectConfigManager.getConfig().rollouts[2].experiments[0].audienceConditions,
        optlyInstance.projectConfigManager.getConfig().audiencesById,
        { house: 'Lannister' }
      );
    });

    it('can return a variable value from a feature test with complex audience conditions via getFeatureVariableString', function() {
      var variableValue = optlyInstance.getFeatureVariableInteger('feat2_with_var', 'z', 'user1', {
        // Should be included via exact match string audience with id '3468206642', and
        // greater than audience with id '3468206647'
        house: 'Gryffindor',
        lasers: 700,
      });
      assert.strictEqual(variableValue, 150);
      sinon.assert.calledWithExactly(
        audienceEvaluator.evaluate,
        optlyInstance.projectConfigManager.getConfig().experiments[3].audienceConditions,
        optlyInstance.projectConfigManager.getConfig().audiencesById,
        { house: 'Gryffindor', lasers: 700 }
      );
    });

    it('can return a variable value from a feature test with complex audience conditions via getFeatureVariable', function() {
      var variableValue = optlyInstance.getFeatureVariable('feat2_with_var', 'z', 'user1', {
        // Should be included via exact match string audience with id '3468206642', and
        // greater than audience with id '3468206647'
        house: 'Gryffindor',
        lasers: 700,
      });
      assert.strictEqual(variableValue, 150);
      sinon.assert.calledWithExactly(
        audienceEvaluator.evaluate,
        optlyInstance.projectConfigManager.getConfig().experiments[3].audienceConditions,
        optlyInstance.projectConfigManager.getConfig().audiencesById,
        { house: 'Gryffindor', lasers: 700 }
      );
    });

    it('can return the default value for a feature variable from getFeatureVariable, via excluding a user from a feature test with complex audience conditions', function() {
      var variableValue = optlyInstance.getFeatureVariable('feat2_with_var', 'z', 'user1', {
        // Should be excluded - no audiences match with no attributes
      });
      assert.strictEqual(variableValue, 10);
      sinon.assert.calledWithExactly(
        audienceEvaluator.evaluate,
        optlyInstance.projectConfigManager.getConfig().experiments[3].audienceConditions,
        optlyInstance.projectConfigManager.getConfig().audiencesById,
        {}
      );
    });

    it('can return the default value for a feature variable from getFeatureVariableString, via excluding a user from a feature test with complex audience conditions', function() {
      var variableValue = optlyInstance.getFeatureVariableInteger('feat2_with_var', 'z', 'user1', {
        // Should be excluded - no audiences match with no attributes
      });
      assert.strictEqual(variableValue, 10);
      sinon.assert.calledWithExactly(
        audienceEvaluator.evaluate,
        optlyInstance.projectConfigManager.getConfig().experiments[3].audienceConditions,
        optlyInstance.projectConfigManager.getConfig().audiencesById,
        {}
      );
    });
  });

  describe('event batching', function() {
    var bucketStub;
    var fakeDecisionResponse;
    var notificationCenter;
    var eventProcessor;

    var createdLogger = logger.createLogger({
      logLevel: LOG_LEVEL.INFO,
      logToConsole: false,
    });

    beforeEach(function() {
      bucketStub = sinon.stub(bucketer, 'bucket');
      sinon.stub(errorHandler, 'handleError');
      sinon.stub(createdLogger, 'log');
      sinon.stub(fns, 'uuid').returns('a68cf1ad-0393-4e18-af87-efe8f01a7c9c');
      notificationCenter = createNotificationCenter({ logger: createdLogger, errorHandler: errorHandler });
      eventProcessor = createEventProcessor({
        dispatcher: eventDispatcher,
        batchSize: 3,
        notificationCenter: notificationCenter,
        flushInterval: 100,
      });
    });

    afterEach(function() {
      bucketer.bucket.restore();
      errorHandler.handleError.restore();
      createdLogger.log.restore();
      fns.uuid.restore();
    });

    describe('when eventBatchSize = 3 and eventFlushInterval = 100', function() {
      var optlyInstance;

      beforeEach(function() {
        optlyInstance = new Optimizely({
          clientEngine: 'node-sdk',
          datafile: testData.getTestProjectConfig(),
          errorHandler: errorHandler,
          eventDispatcher: eventDispatcher,
          jsonSchemaValidator: jsonSchemaValidator,
          logger: createdLogger,
          isValidInstance: true,
          eventBatchSize: 3,
          eventFlushInterval: 100,
          eventProcessor,
          notificationCenter,
        });
      });

      afterEach(function() {
        optlyInstance.close();
      });

      it('should send batched events when the maxQueueSize is reached', function() {
        fakeDecisionResponse = {
          result: '111129',
          reasons: [],
        };
        bucketStub.returns(fakeDecisionResponse);
        var activate = optlyInstance.activate('testExperiment', 'testUser');
        assert.strictEqual(activate, 'variation');

        optlyInstance.track('testEvent', 'testUser');
        optlyInstance.track('testEvent', 'testUser');

        sinon.assert.calledOnce(eventDispatcher.dispatchEvent);

        var expectedObj = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
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
                        metadata: {
                          flag_key: '',
                          rule_key: 'testExperiment',
                          rule_type: 'experiment',
                          variation_key: 'variation',
                          enabled: true,
                        },
                      },
                    ],
                    events: [
                      {
                        entity_id: '4',
                        timestamp: Math.round(new Date().getTime()),
                        key: 'campaign_activated',
                        uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                      },
                    ],
                  },
                ],
                visitor_id: 'testUser',
                attributes: [],
              },
              {
                attributes: [],
                snapshots: [
                  {
                    events: [
                      {
                        entity_id: '111095',
                        key: 'testEvent',
                        timestamp: new Date().getTime(),
                        uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                      },
                    ],
                  },
                ],
                visitor_id: 'testUser',
              },
              {
                attributes: [],
                snapshots: [
                  {
                    events: [
                      {
                        entity_id: '111095',
                        key: 'testEvent',
                        timestamp: new Date().getTime(),
                        uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                      },
                    ],
                  },
                ],
                visitor_id: 'testUser',
              },
            ],
            revision: '42',
            client_name: 'node-sdk',
            client_version: enums.NODE_CLIENT_VERSION,
            anonymize_ip: false,
            enrich_decisions: true,
          },
        };
        var eventDispatcherCall = eventDispatcher.dispatchEvent.args[0];
        assert.deepEqual(eventDispatcherCall[0], expectedObj);
      });

      it('should flush the queue when the flushInterval occurs', function() {
        var timestamp = new Date().getTime();
        fakeDecisionResponse = {
          result: '111129',
          reasons: [],
        };
        bucketStub.returns(fakeDecisionResponse);
        var activate = optlyInstance.activate('testExperiment', 'testUser');
        assert.strictEqual(activate, 'variation');

        optlyInstance.track('testEvent', 'testUser');

        sinon.assert.notCalled(eventDispatcher.dispatchEvent);

        clock.tick(100);

        sinon.assert.calledOnce(eventDispatcher.dispatchEvent);

        var expectedObj = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
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
                        metadata: {
                          flag_key: '',
                          rule_key: 'testExperiment',
                          rule_type: 'experiment',
                          variation_key: 'variation',
                          enabled: true,
                        },
                      },
                    ],
                    events: [
                      {
                        entity_id: '4',
                        timestamp: timestamp,
                        key: 'campaign_activated',
                        uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                      },
                    ],
                  },
                ],
                visitor_id: 'testUser',
                attributes: [],
              },
              {
                attributes: [],
                snapshots: [
                  {
                    events: [
                      {
                        entity_id: '111095',
                        key: 'testEvent',
                        timestamp: timestamp,
                        uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                      },
                    ],
                  },
                ],
                visitor_id: 'testUser',
              },
            ],
            revision: '42',
            client_name: 'node-sdk',
            client_version: enums.NODE_CLIENT_VERSION,
            anonymize_ip: false,
            enrich_decisions: true,
          },
        };
        var eventDispatcherCall = eventDispatcher.dispatchEvent.args[0];
        assert.deepEqual(eventDispatcherCall[0], expectedObj);
      });

      it('should flush the queue when optimizely.close() is called', function() {
        fakeDecisionResponse = {
          result: '111129',
          reasons: [],
        };
        bucketStub.returns(fakeDecisionResponse);
        var activate = optlyInstance.activate('testExperiment', 'testUser');
        assert.strictEqual(activate, 'variation');

        optlyInstance.track('testEvent', 'testUser');

        sinon.assert.notCalled(eventDispatcher.dispatchEvent);

        optlyInstance.close();

        sinon.assert.calledOnce(eventDispatcher.dispatchEvent);

        var expectedObj = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
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
                        metadata: {
                          flag_key: '',
                          rule_key: 'testExperiment',
                          rule_type: 'experiment',
                          variation_key: 'variation',
                          enabled: true,
                        },
                      },
                    ],
                    events: [
                      {
                        entity_id: '4',
                        timestamp: Math.round(new Date().getTime()),
                        key: 'campaign_activated',
                        uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                      },
                    ],
                  },
                ],
                visitor_id: 'testUser',
                attributes: [],
              },
              {
                attributes: [],
                snapshots: [
                  {
                    events: [
                      {
                        entity_id: '111095',
                        key: 'testEvent',
                        timestamp: new Date().getTime(),
                        uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                      },
                    ],
                  },
                ],
                visitor_id: 'testUser',
              },
            ],
            revision: '42',
            client_name: 'node-sdk',
            client_version: enums.NODE_CLIENT_VERSION,
            anonymize_ip: false,
            enrich_decisions: true,
          },
        };
        var eventDispatcherCall = eventDispatcher.dispatchEvent.args[0];
        assert.deepEqual(eventDispatcherCall[0], expectedObj);
      });
    });

    describe('close method', function() {
      var eventProcessorStopPromise;
      var optlyInstance;
      var mockEventProcessor;
      beforeEach(function() {
        mockEventProcessor = {
          process: sinon.stub(),
          start: sinon.stub(),
          stop: sinon.stub(),
        };        
      });

      describe('when the event processor stop method returns a promise that fulfills', function() {
        beforeEach(function() {
          eventProcessorStopPromise = Promise.resolve();
          mockEventProcessor.stop.returns(eventProcessorStopPromise);
          optlyInstance = new Optimizely({
            clientEngine: 'node-sdk',
            datafile: testData.getTestProjectConfig(),
            errorHandler: errorHandler,
            eventDispatcher: eventDispatcher,
            jsonSchemaValidator: jsonSchemaValidator,
            logger: createdLogger,
            isValidInstance: true,
            eventBatchSize: 3,
            eventFlushInterval: 100,
            eventProcessor: mockEventProcessor,
            notificationCenter,
          });
        });

        afterEach(function() {
          return eventProcessorStopPromise.catch(function() {
            // Handle rejected promise - don't want test to fail
          });
        });

        it('returns a promise that fulfills with a successful result object', function() {
          return optlyInstance.close().then(function(result) {
            assert.deepEqual(result, { success: true });
          });
        });
      });

      describe('when the event processor stop method returns a promise that rejects', function() {
        beforeEach(function() {
          eventProcessorStopPromise = Promise.reject(new Error('Failed to stop'));
          mockEventProcessor.stop.returns(eventProcessorStopPromise);
          optlyInstance = new Optimizely({
            clientEngine: 'node-sdk',
            datafile: testData.getTestProjectConfig(),
            errorHandler: errorHandler,
            eventDispatcher: eventDispatcher,
            jsonSchemaValidator: jsonSchemaValidator,
            logger: createdLogger,
            isValidInstance: true,
            eventBatchSize: 3,
            eventFlushInterval: 100,
            eventProcessor: mockEventProcessor,
            notificationCenter,
          });
        });

        afterEach(function() {
          return eventProcessorStopPromise.catch(function() {
            // Handle rejected promise - don't want test to fail
          });
        });

        it('returns a promise that fulfills with an unsuccessful result object', function() {
          return optlyInstance.close().then(function(result) {
            assert.deepEqual(result, {
              success: false,
              reason: 'Error: Failed to stop',
            });
          });
        });
      });
    });
  });

  describe('project config management', function() {
    var createdLogger = logger.createLogger({
      logLevel: LOG_LEVEL.INFO,
      logToConsole: false,
    });

    var notificationCenter = createNotificationCenter({ logger: createdLogger, errorHandler: errorHandler });
    var eventProcessor = createEventProcessor({
      dispatcher: eventDispatcher,
      batchSize: 1,
      notificationCenter: notificationCenter,
    });

    beforeEach(function() {
      sinon.stub(errorHandler, 'handleError');
      sinon.stub(createdLogger, 'log');
    });

    afterEach(function() {
      errorHandler.handleError.restore();
      createdLogger.log.restore();
    });

    var optlyInstance;

    it('should call the project config manager stop method when the close method is called', function() {
      optlyInstance = new Optimizely({
        clientEngine: 'node-sdk',
        errorHandler: errorHandler,
        eventDispatcher: eventDispatcher,
        jsonSchemaValidator: jsonSchemaValidator,
        logger: createdLogger,
        sdkKey: '12345',
        isValidInstance: true,
        eventProcessor,
        notificationCenter,
      });
      optlyInstance.close();
      var fakeManager = projectConfigManager.createProjectConfigManager.getCall(0).returnValue;
      sinon.assert.calledOnce(fakeManager.stop);
    });

    describe('when no datafile is available yet ', function() {
      beforeEach(function() {
        optlyInstance = new Optimizely({
          clientEngine: 'node-sdk',
          errorHandler: errorHandler,
          eventDispatcher: eventDispatcher,
          jsonSchemaValidator: jsonSchemaValidator,
          logger: createdLogger,
          sdkKey: '12345',
          isValidInstance: true,
          notificationCenter,
          eventProcessor,
        });
      });

      it('returns fallback values from API methods that return meaningful values', function() {
        assert.isNull(optlyInstance.activate('my_experiment', 'user1'));
        assert.isNull(optlyInstance.getVariation('my_experiment', 'user1'));
        assert.isFalse(optlyInstance.setForcedVariation('my_experiment', 'user1', 'variation_1'));
        assert.isNull(optlyInstance.getForcedVariation('my_experiment', 'user1'));
        assert.isFalse(optlyInstance.isFeatureEnabled('my_feature', 'user1'));
        assert.deepEqual(optlyInstance.getEnabledFeatures('user1'), []);
        assert.isNull(optlyInstance.getFeatureVariable('my_feature', 'my_var', 'user1'));
        assert.isNull(optlyInstance.getFeatureVariableBoolean('my_feature', 'my_bool_var', 'user1'));
        assert.isNull(optlyInstance.getFeatureVariableDouble('my_feature', 'my_double_var', 'user1'));
        assert.isNull(optlyInstance.getFeatureVariableInteger('my_feature', 'my_int_var', 'user1'));
        assert.isNull(optlyInstance.getFeatureVariableString('my_feature', 'my_str_var', 'user1'));
      });

      it('does not dispatch any events in API methods that dispatch events', function() {
        optlyInstance.activate('my_experiment', 'user1');
        optlyInstance.track('my_event', 'user1');
        optlyInstance.isFeatureEnabled('my_feature', 'user1');
        optlyInstance.getEnabledFeatures('user1');
        sinon.assert.notCalled(eventDispatcher.dispatchEvent);
      });
    });

    describe('onReady method', function() {
      var setTimeoutSpy;
      var clearTimeoutSpy;
      beforeEach(function() {
        setTimeoutSpy = sinon.spy(clock, 'setTimeout');
        clearTimeoutSpy = sinon.spy(clock, 'clearTimeout');
      });

      afterEach(function() {
        setTimeoutSpy.restore();
        clearTimeoutSpy.restore();
      });

      it('fulfills the promise with the value from the project config manager ready promise after the project config manager ready promise is fulfilled', function() {
        projectConfigManager.createProjectConfigManager.callsFake(function(config) {
          var currentConfig = config.datafile ? projectConfig.createProjectConfig(config.datafile) : null;
          return {
            stop: sinon.stub(),
            getConfig: sinon.stub().returns(currentConfig),
            onUpdate: sinon.stub().returns(function() {}),
            onReady: sinon.stub().returns(Promise.resolve({ success: true })),
          };
        });
        optlyInstance = new Optimizely({
          clientEngine: 'node-sdk',
          errorHandler: errorHandler,
          eventDispatcher: eventDispatcher,
          jsonSchemaValidator: jsonSchemaValidator,
          logger: createdLogger,
          sdkKey: '12345',
          isValidInstance: true,
          notificationCenter,
          eventProcessor,
        });
        return optlyInstance.onReady().then(function(result) {
          assert.deepEqual(result, { success: true });
        });
      });

      it('fulfills the promise with an unsuccessful result after the timeout has expired when the project config manager onReady promise still has not resolved', function() {
        optlyInstance = new Optimizely({
          clientEngine: 'node-sdk',
          errorHandler: errorHandler,
          eventDispatcher: eventDispatcher,
          jsonSchemaValidator: jsonSchemaValidator,
          logger: createdLogger,
          sdkKey: '12345',
          isValidInstance: true,
          notificationCenter,
          eventProcessor,
        });
        var readyPromise = optlyInstance.onReady({ timeout: 500 });
        clock.tick(501);
        return readyPromise.then(function(result) {
          assert.include(result, {
            success: false,
          });
        });
      });

      it('fulfills the promise with an unsuccessful result after 30 seconds when no timeout argument is provided and the project config manager onReady promise still has not resolved', function() {
        optlyInstance = new Optimizely({
          clientEngine: 'node-sdk',
          errorHandler: errorHandler,
          eventDispatcher: eventDispatcher,
          jsonSchemaValidator: jsonSchemaValidator,
          logger: createdLogger,
          sdkKey: '12345',
          isValidInstance: true,
          notificationCenter,
          eventProcessor,
        });
        var readyPromise = optlyInstance.onReady();
        clock.tick(300001);
        return readyPromise.then(function(result) {
          assert.include(result, {
            success: false,
          });
        });
      });

      it('fulfills the promise with an unsuccessful result after the instance is closed', function() {
        optlyInstance = new Optimizely({
          clientEngine: 'node-sdk',
          errorHandler: errorHandler,
          eventDispatcher: eventDispatcher,
          jsonSchemaValidator: jsonSchemaValidator,
          logger: createdLogger,
          sdkKey: '12345',
          isValidInstance: true,
          notificationCenter,
          eventProcessor,
        });
        var readyPromise = optlyInstance.onReady({ timeout: 100 });
        optlyInstance.close();
        return readyPromise.then(function(result) {
          assert.include(result, {
            success: false,
          });
        });
      });

      it('can be called several times with different timeout values and the returned promises behave correctly', function() {
        optlyInstance = new Optimizely({
          clientEngine: 'node-sdk',
          errorHandler: errorHandler,
          eventDispatcher: eventDispatcher,
          jsonSchemaValidator: jsonSchemaValidator,
          logger: createdLogger,
          sdkKey: '12345',
          isValidInstance: true,
          notificationCenter,
          eventProcessor,
        });
        var readyPromise1 = optlyInstance.onReady({ timeout: 100 });
        var readyPromise2 = optlyInstance.onReady({ timeout: 200 });
        var readyPromise3 = optlyInstance.onReady({ timeout: 300 });
        clock.tick(101);
        return readyPromise1
          .then(function() {
            clock.tick(100);
            return readyPromise2;
          })
          .then(function() {
            // readyPromise3 has not resolved yet because only 201 ms have elapsed.
            // Calling close on the instance should resolve readyPromise3
            optlyInstance.close();
            return readyPromise3;
          });
      });

      it('clears the timeout when the project config manager ready promise fulfills', function() {
        projectConfigManager.createProjectConfigManager.callsFake(function(config) {
          return {
            stop: sinon.stub(),
            getConfig: sinon.stub().returns(null),
            onUpdate: sinon.stub().returns(function() {}),
            onReady: sinon.stub().returns(Promise.resolve({ success: true })),
          };
        });
        optlyInstance = new Optimizely({
          clientEngine: 'node-sdk',
          errorHandler: errorHandler,
          eventDispatcher: eventDispatcher,
          jsonSchemaValidator: jsonSchemaValidator,
          logger: createdLogger,
          sdkKey: '12345',
          isValidInstance: true,
          notificationCenter,
          eventProcessor,
        });
        return optlyInstance.onReady().then(function() {
          sinon.assert.calledOnce(clock.setTimeout);
          var timeout = clock.setTimeout.getCall(0).returnValue;
          sinon.assert.calledOnce(clock.clearTimeout);
          sinon.assert.calledWithExactly(clock.clearTimeout, timeout);
        });
      });
    });

    describe('project config updates', function() {
      var fakeProjectConfigManager;
      beforeEach(function() {
        fakeProjectConfigManager = {
          stop: sinon.stub(),
          getConfig: sinon.stub().returns(null),
          onUpdate: sinon.stub().returns(function() {}),
          onReady: sinon.stub().returns({ then: function() {} }),
        };
        projectConfigManager.createProjectConfigManager.returns(fakeProjectConfigManager);

        optlyInstance = new Optimizely({
          clientEngine: 'node-sdk',
          errorHandler: errorHandler,
          eventDispatcher: eventDispatcher,
          jsonSchemaValidator: jsonSchemaValidator,
          logger: createdLogger,
          sdkKey: '12345',
          isValidInstance: true,
          eventBatchSize: 1,
          notificationCenter,
          eventProcessor,
        });
      });

      it('uses the newest project config object from project config manager', function() {
        // Should start off returning false/null - no project config available
        assert.isFalse(optlyInstance.isFeatureEnabled('test_feature_for_experiment', 'user45678'));
        assert.isNull(optlyInstance.activate('myOtherExperiment', 'user98765'));

        // Project config manager receives new project config object - should use this now
        var newConfig = projectConfig.createProjectConfig(testData.getTestProjectConfigWithFeatures());
        fakeProjectConfigManager.getConfig.returns(newConfig);
        var updateListener = fakeProjectConfigManager.onUpdate.getCall(0).args[0];
        updateListener(newConfig);

        // With the new project config containing this feature, should return true
        assert.isTrue(optlyInstance.isFeatureEnabled('test_feature_for_experiment', 'user45678'));

        // Update to another project config containing a new experiment
        var differentDatafile = testData.getTestProjectConfigWithFeatures();
        differentDatafile.experiments.push({
          key: 'myOtherExperiment',
          status: 'Running',
          forcedVariations: {},
          audienceIds: [],
          layerId: '5',
          trafficAllocation: [
            {
              entityId: '99999999',
              endOfRange: 10000,
            },
          ],
          id: '999998888777776',
          variations: [
            {
              key: 'control',
              id: '99999999',
            },
          ],
        });
        differentDatafile.revision = '44';
        var differentConfig = projectConfig.createProjectConfig(differentDatafile);
        fakeProjectConfigManager.getConfig.returns(differentConfig);
        updateListener(differentConfig);

        // activate should return a variation for the new experiment
        assert.strictEqual(optlyInstance.activate('myOtherExperiment', 'user98765'), 'control');
      });

      it('emits a notification when the project config manager emits a new project config object', function() {
        var listener = sinon.spy();
        optlyInstance.notificationCenter.addNotificationListener(
          enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE,
          listener
        );
        var newConfig = projectConfig.createProjectConfig(testData.getTestProjectConfigWithFeatures());
        var updateListener = fakeProjectConfigManager.onUpdate.getCall(0).args[0];
        updateListener(newConfig);
        sinon.assert.calledOnce(listener);
      });
    });
  });

  describe('log event notification', function() {
    var optlyInstance;
    var bucketStub;
    var fakeDecisionResponse;
    var eventDispatcherSpy;
    var logger = { log: function() {} };
    var errorHandler = { handleError: function() {} };
    var notificationCenter = createNotificationCenter({ logger, errorHandler });
    var eventProcessor;
    beforeEach(function() {
      bucketStub = sinon.stub(bucketer, 'bucket');
      eventDispatcherSpy = sinon.spy();
      eventProcessor = createEventProcessor({
        dispatcher: { dispatchEvent: eventDispatcherSpy },
        batchSize: 1,
        notificationCenter: notificationCenter,
      });
      optlyInstance = new Optimizely({
        clientEngine: 'node-sdk',
        datafile: testData.getTestProjectConfig(),
        errorHandler,        
        logger,
        isValidInstance: true,
        eventBatchSize: 1,
        notificationCenter,
        eventProcessor,
      });
    });

    afterEach(function() {
      bucketer.bucket.restore();
      optlyInstance.close();
    });

    it('should trigger a log event notification when an impression event is dispatched', function() {
      var notificationListener = sinon.spy();
      optlyInstance.notificationCenter.addNotificationListener(
        enums.NOTIFICATION_TYPES.LOG_EVENT,
        notificationListener
      );
      fakeDecisionResponse = {
        result: '111129',
        reasons: [],
      };
      bucketStub.returns(fakeDecisionResponse);
      var activate = optlyInstance.activate('testExperiment', 'testUser');
      assert.strictEqual(activate, 'variation');
      sinon.assert.calledOnce(eventDispatcherSpy);
      sinon.assert.calledOnce(notificationListener);
      sinon.assert.calledWithExactly(notificationListener, eventDispatcherSpy.getCall(0).args[0]);
    });

    it('should trigger a log event notification when a conversion event is dispatched', function() {
      var notificationListener = sinon.spy();
      optlyInstance.notificationCenter.addNotificationListener(
        enums.NOTIFICATION_TYPES.LOG_EVENT,
        notificationListener
      );
      optlyInstance.track('testEvent', 'testUser');
      sinon.assert.calledOnce(eventDispatcherSpy);
      sinon.assert.calledOnce(notificationListener);
      sinon.assert.calledWithExactly(notificationListener, eventDispatcherSpy.getCall(0).args[0]);
    });
  });
});
