/**
 * Copyright 2016-2020 Optimizely
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
import { assert } from 'chai';
import sinon from 'sinon';
import * as logging from '@optimizely/js-sdk-logging';
import eventProcessor from './core/event_processor';

import Optimizely from './optimizely';
import testData from './tests/test_data';
import packageJSON from '../package.json';
import optimizelyFactory from './index.browser';
import configValidator from './utils/config_validator';
import eventProcessorConfigValidator from './utils/event_processor_config_validator';

var LocalStoragePendingEventsDispatcher = eventProcessor.LocalStoragePendingEventsDispatcher;

describe('javascript-sdk', function() {
  var clock;
  beforeEach(function() {
    sinon.stub(optimizelyFactory.eventDispatcher, 'dispatchEvent');
    clock = sinon.useFakeTimers(new Date());
  });

  afterEach(function() {
    optimizelyFactory.eventDispatcher.dispatchEvent.restore();
    clock.restore();
  });

  describe('APIs', function() {
    it('should expose logger, errorHandler, eventDispatcher and enums', function() {
      assert.isDefined(optimizelyFactory.logging);
      assert.isDefined(optimizelyFactory.logging.createLogger);
      assert.isDefined(optimizelyFactory.logging.createNoOpLogger);
      assert.isDefined(optimizelyFactory.errorHandler);
      assert.isDefined(optimizelyFactory.eventDispatcher);
      assert.isDefined(optimizelyFactory.enums);
    });

    describe('createInstance', function() {
      var fakeErrorHandler = { handleError: function() {} };
      var fakeEventDispatcher = { dispatchEvent: function() {} };
      var silentLogger;

      beforeEach(function() {
        silentLogger = optimizelyFactory.logging.createLogger({
          logLevel: optimizelyFactory.enums.LOG_LEVEL.INFO,
          logToConsole: false,
        });
        sinon.spy(console, 'error');
        sinon.stub(configValidator, 'validate');

        global.XMLHttpRequest = sinon.useFakeXMLHttpRequest();

        sinon.stub(LocalStoragePendingEventsDispatcher.prototype, 'sendPendingEvents');
      });

      afterEach(function() {
        LocalStoragePendingEventsDispatcher.prototype.sendPendingEvents.restore();
        optimizelyFactory.__internalResetRetryState();
        console.error.restore();
        configValidator.validate.restore();
        delete global.XMLHttpRequest
      });

      describe('when an eventDispatcher is not passed in', function() {
        it('should wrap the default eventDispatcher and invoke sendPendingEvents', function() {
          var optlyInstance = optimizelyFactory.createInstance({
            datafile: {},
            errorHandler: fakeErrorHandler,
            logger: silentLogger,
          });
          // Invalid datafile causes onReady Promise rejection - catch this error
          optlyInstance.onReady().catch(function() {});

          sinon.assert.calledOnce(LocalStoragePendingEventsDispatcher.prototype.sendPendingEvents);
        });
      });

      describe('when an eventDispatcher is passed in', function() {
        it('should NOT wrap the default eventDispatcher and invoke sendPendingEvents', function() {
          var optlyInstance = optimizelyFactory.createInstance({
            datafile: {},
            errorHandler: fakeErrorHandler,
            eventDispatcher: fakeEventDispatcher,
            logger: silentLogger,
          });
          // Invalid datafile causes onReady Promise rejection - catch this error
          optlyInstance.onReady().catch(function() {});

          sinon.assert.notCalled(LocalStoragePendingEventsDispatcher.prototype.sendPendingEvents);
        });
      });

      it('should invoke resendPendingEvents at most once', function() {
        var optlyInstance = optimizelyFactory.createInstance({
          datafile: {},
          errorHandler: fakeErrorHandler,
          logger: silentLogger,
        });
        // Invalid datafile causes onReady Promise rejection - catch this error
        optlyInstance.onReady().catch(function() {});

        sinon.assert.calledOnce(LocalStoragePendingEventsDispatcher.prototype.sendPendingEvents);

        optlyInstance = optimizelyFactory.createInstance({
          datafile: {},
          errorHandler: fakeErrorHandler,
          logger: silentLogger,
        });
        optlyInstance.onReady().catch(function() {});

        sinon.assert.calledOnce(LocalStoragePendingEventsDispatcher.prototype.sendPendingEvents);
      });

      it('should not throw if the provided config is not valid', function() {
        configValidator.validate.throws(new Error('Invalid config or something'));
        assert.doesNotThrow(function() {
          var optlyInstance = optimizelyFactory.createInstance({
            datafile: {},
            logger: silentLogger,
          });
          // Invalid datafile causes onReady Promise rejection - catch this error
          optlyInstance.onReady().catch(function() {});
        });
      });

      it('should create an instance of optimizely', function() {
        var optlyInstance = optimizelyFactory.createInstance({
          datafile: {},
          errorHandler: fakeErrorHandler,
          eventDispatcher: fakeEventDispatcher,
          logger: silentLogger,
        });
        // Invalid datafile causes onReady Promise rejection - catch this error
        optlyInstance.onReady().catch(function() {});

        assert.instanceOf(optlyInstance, Optimizely);
        assert.equal(optlyInstance.clientVersion, '4.7.0');
      });

      it('should set the JavaScript client engine and version', function() {
        var optlyInstance = optimizelyFactory.createInstance({
          datafile: {},
          errorHandler: fakeErrorHandler,
          eventDispatcher: fakeEventDispatcher,
          logger: silentLogger,
        });
        // Invalid datafile causes onReady Promise rejection - catch this error
        optlyInstance.onReady().catch(function() {});
        assert.equal('javascript-sdk', optlyInstance.clientEngine);
        assert.equal(packageJSON.version, optlyInstance.clientVersion);
      });

      it('should allow passing of "react-sdk" as the clientEngine', function() {
        var optlyInstance = optimizelyFactory.createInstance({
          clientEngine: 'react-sdk',
          datafile: {},
          errorHandler: fakeErrorHandler,
          eventDispatcher: fakeEventDispatcher,
          logger: silentLogger,
        });
        // Invalid datafile causes onReady Promise rejection - catch this error
        optlyInstance.onReady().catch(function() {});
        assert.equal('react-sdk', optlyInstance.clientEngine);
      });

      it('should activate with provided event dispatcher', function() {
        var optlyInstance = optimizelyFactory.createInstance({
          datafile: testData.getTestProjectConfig(),
          errorHandler: fakeErrorHandler,
          eventDispatcher: optimizelyFactory.eventDispatcher,
          logger: silentLogger,
        });
        var activate = optlyInstance.activate('testExperiment', 'testUser');
        assert.strictEqual(activate, 'control');
      });

      it('should be able to set and get a forced variation', function() {
        var optlyInstance = optimizelyFactory.createInstance({
          datafile: testData.getTestProjectConfig(),
          errorHandler: fakeErrorHandler,
          eventDispatcher: optimizelyFactory.eventDispatcher,
          logger: silentLogger,
        });

        var didSetVariation = optlyInstance.setForcedVariation('testExperiment', 'testUser', 'control');
        assert.strictEqual(didSetVariation, true);

        var variation = optlyInstance.getForcedVariation('testExperiment', 'testUser');
        assert.strictEqual(variation, 'control');
      });

      it('should be able to set and unset a forced variation', function() {
        var optlyInstance = optimizelyFactory.createInstance({
          datafile: testData.getTestProjectConfig(),
          errorHandler: fakeErrorHandler,
          eventDispatcher: optimizelyFactory.eventDispatcher,
          logger: silentLogger,
        });

        var didSetVariation = optlyInstance.setForcedVariation('testExperiment', 'testUser', 'control');
        assert.strictEqual(didSetVariation, true);

        var variation = optlyInstance.getForcedVariation('testExperiment', 'testUser');
        assert.strictEqual(variation, 'control');

        var didSetVariation2 = optlyInstance.setForcedVariation('testExperiment', 'testUser', null);
        assert.strictEqual(didSetVariation2, true);

        var variation2 = optlyInstance.getForcedVariation('testExperiment', 'testUser');
        assert.strictEqual(variation2, null);
      });

      it('should be able to set multiple experiments for one user', function() {
        var optlyInstance = optimizelyFactory.createInstance({
          datafile: testData.getTestProjectConfig(),
          errorHandler: fakeErrorHandler,
          eventDispatcher: optimizelyFactory.eventDispatcher,
          logger: silentLogger,
        });

        var didSetVariation = optlyInstance.setForcedVariation('testExperiment', 'testUser', 'control');
        assert.strictEqual(didSetVariation, true);

        var didSetVariation2 = optlyInstance.setForcedVariation(
          'testExperimentLaunched',
          'testUser',
          'controlLaunched'
        );
        assert.strictEqual(didSetVariation2, true);

        var variation = optlyInstance.getForcedVariation('testExperiment', 'testUser');
        assert.strictEqual(variation, 'control');

        var variation2 = optlyInstance.getForcedVariation('testExperimentLaunched', 'testUser');
        assert.strictEqual(variation2, 'controlLaunched');
      });

      it('should be able to set multiple experiments for one user, and unset one', function() {
        var optlyInstance = optimizelyFactory.createInstance({
          datafile: testData.getTestProjectConfig(),
          errorHandler: fakeErrorHandler,
          eventDispatcher: optimizelyFactory.eventDispatcher,
          logger: silentLogger,
        });

        var didSetVariation = optlyInstance.setForcedVariation('testExperiment', 'testUser', 'control');
        assert.strictEqual(didSetVariation, true);

        var didSetVariation2 = optlyInstance.setForcedVariation(
          'testExperimentLaunched',
          'testUser',
          'controlLaunched'
        );
        assert.strictEqual(didSetVariation2, true);

        var didSetVariation2 = optlyInstance.setForcedVariation('testExperimentLaunched', 'testUser', null);
        assert.strictEqual(didSetVariation2, true);

        var variation = optlyInstance.getForcedVariation('testExperiment', 'testUser');
        assert.strictEqual(variation, 'control');

        var variation2 = optlyInstance.getForcedVariation('testExperimentLaunched', 'testUser');
        assert.strictEqual(variation2, null);
      });

      it('should be able to set multiple experiments for one user, and reset one', function() {
        var optlyInstance = optimizelyFactory.createInstance({
          datafile: testData.getTestProjectConfig(),
          errorHandler: fakeErrorHandler,
          eventDispatcher: optimizelyFactory.eventDispatcher,
          logger: silentLogger,
        });

        var didSetVariation = optlyInstance.setForcedVariation('testExperiment', 'testUser', 'control');
        assert.strictEqual(didSetVariation, true);

        var didSetVariation2 = optlyInstance.setForcedVariation(
          'testExperimentLaunched',
          'testUser',
          'controlLaunched'
        );
        assert.strictEqual(didSetVariation2, true);

        var didSetVariation2 = optlyInstance.setForcedVariation(
          'testExperimentLaunched',
          'testUser',
          'variationLaunched'
        );
        assert.strictEqual(didSetVariation2, true);

        var variation = optlyInstance.getForcedVariation('testExperiment', 'testUser');
        assert.strictEqual(variation, 'control');

        var variation2 = optlyInstance.getForcedVariation('testExperimentLaunched', 'testUser');
        assert.strictEqual(variation2, 'variationLaunched');
      });

      it('should override bucketing when setForcedVariation is called', function() {
        var optlyInstance = optimizelyFactory.createInstance({
          datafile: testData.getTestProjectConfig(),
          errorHandler: fakeErrorHandler,
          eventDispatcher: optimizelyFactory.eventDispatcher,
          logger: silentLogger,
        });

        var didSetVariation = optlyInstance.setForcedVariation('testExperiment', 'testUser', 'control');
        assert.strictEqual(didSetVariation, true);

        var variation = optlyInstance.getVariation('testExperiment', 'testUser');
        assert.strictEqual(variation, 'control');

        var didSetVariation2 = optlyInstance.setForcedVariation('testExperiment', 'testUser', 'variation');
        assert.strictEqual(didSetVariation2, true);

        var variation = optlyInstance.getVariation('testExperiment', 'testUser');
        assert.strictEqual(variation, 'variation');
      });

      it('should override bucketing when setForcedVariation is called for a not running experiment', function() {
        var optlyInstance = optimizelyFactory.createInstance({
          datafile: testData.getTestProjectConfig(),
          errorHandler: fakeErrorHandler,
          eventDispatcher: optimizelyFactory.eventDispatcher,
          logger: silentLogger,
        });

        var didSetVariation = optlyInstance.setForcedVariation(
          'testExperimentNotRunning',
          'testUser',
          'controlNotRunning'
        );
        assert.strictEqual(didSetVariation, true);

        var variation = optlyInstance.getVariation('testExperimentNotRunning', 'testUser');
        assert.strictEqual(variation, null);
      });

      describe('when passing in logLevel', function() {
        beforeEach(function() {
          sinon.stub(logging, 'setLogLevel');
        });

        afterEach(function() {
          logging.setLogLevel.restore();
        });

        it('should call logging.setLogLevel', function() {
          optimizelyFactory.createInstance({
            datafile: testData.getTestProjectConfig(),
            logLevel: optimizelyFactory.enums.LOG_LEVEL.ERROR,
          });
          sinon.assert.calledOnce(logging.setLogLevel);
          sinon.assert.calledWithExactly(logging.setLogLevel, optimizelyFactory.enums.LOG_LEVEL.ERROR);
        });
      });

      describe('when passing in logger', function() {
        beforeEach(function() {
          sinon.stub(logging, 'setLogHandler');
        });

        afterEach(function() {
          logging.setLogHandler.restore();
        });

        it('should call logging.setLogHandler with the supplied logger', function() {
          var fakeLogger = { log: function() {} };
          optimizelyFactory.createInstance({
            datafile: testData.getTestProjectConfig(),
            logger: fakeLogger,
          });
          sinon.assert.calledOnce(logging.setLogHandler);
          sinon.assert.calledWithExactly(logging.setLogHandler, fakeLogger);
        });
      });

      describe('event processor configuration', function() {
        var eventProcessorSpy;
        beforeEach(function() {
          eventProcessorSpy = sinon.spy(eventProcessor, 'createEventProcessor');
        });

        afterEach(function() {
          eventProcessor.createEventProcessor.restore();
        });

        it('should use default event flush interval when none is provided', function() {
          optimizelyFactory.createInstance({
            datafile: testData.getTestProjectConfigWithFeatures(),
            errorHandler: fakeErrorHandler,
            eventDispatcher: fakeEventDispatcher,
            logger: silentLogger,
          });
          sinon.assert.calledWithExactly(
            eventProcessorSpy,
            sinon.match({
              flushInterval: 1000,
            })
          );
        });

        describe('with an invalid flush interval', function() {
          beforeEach(function() {
            sinon.stub(eventProcessorConfigValidator, 'validateEventFlushInterval').returns(false);
          });

          afterEach(function() {
            eventProcessorConfigValidator.validateEventFlushInterval.restore();
          });

          it('should ignore the event flush interval and use the default instead', function() {
            optimizelyFactory.createInstance({
              datafile: testData.getTestProjectConfigWithFeatures(),
              errorHandler: fakeErrorHandler,
              eventDispatcher: fakeEventDispatcher,
              logger: silentLogger,
              eventFlushInterval: ['invalid', 'flush', 'interval'],
            });
            sinon.assert.calledWithExactly(
              eventProcessorSpy,
              sinon.match({
                flushInterval: 1000,
              })
            );
          });
        });

        describe('with a valid flush interval', function() {
          beforeEach(function() {
            sinon.stub(eventProcessorConfigValidator, 'validateEventFlushInterval').returns(true);
          });

          afterEach(function() {
            eventProcessorConfigValidator.validateEventFlushInterval.restore();
          });

          it('should use the provided event flush interval', function() {
            optimizelyFactory.createInstance({
              datafile: testData.getTestProjectConfigWithFeatures(),
              errorHandler: fakeErrorHandler,
              eventDispatcher: fakeEventDispatcher,
              logger: silentLogger,
              eventFlushInterval: 9000,
            });
            sinon.assert.calledWithExactly(
              eventProcessorSpy,
              sinon.match({
                flushInterval: 9000,
              })
            );
          });
        });

        it('should use default event batch size when none is provided', function() {
          optimizelyFactory.createInstance({
            datafile: testData.getTestProjectConfigWithFeatures(),
            errorHandler: fakeErrorHandler,
            eventDispatcher: fakeEventDispatcher,
            logger: silentLogger,
          });
          sinon.assert.calledWithExactly(
            eventProcessorSpy,
            sinon.match({
              batchSize: 10,
            })
          );
        });

        describe('with an invalid event batch size', function() {
          beforeEach(function() {
            sinon.stub(eventProcessorConfigValidator, 'validateEventBatchSize').returns(false);
          });

          afterEach(function() {
            eventProcessorConfigValidator.validateEventBatchSize.restore();
          });

          it('should ignore the event batch size and use the default instead', function() {
            optimizelyFactory.createInstance({
              datafile: testData.getTestProjectConfigWithFeatures(),
              errorHandler: fakeErrorHandler,
              eventDispatcher: fakeEventDispatcher,
              logger: silentLogger,
              eventBatchSize: null,
            });
            sinon.assert.calledWithExactly(
              eventProcessorSpy,
              sinon.match({
                batchSize: 10,
              })
            );
          });
        });

        describe('with a valid event batch size', function() {
          beforeEach(function() {
            sinon.stub(eventProcessorConfigValidator, 'validateEventBatchSize').returns(true);
          });

          afterEach(function() {
            eventProcessorConfigValidator.validateEventBatchSize.restore();
          });

          it('should use the provided event batch size', function() {
            optimizelyFactory.createInstance({
              datafile: testData.getTestProjectConfigWithFeatures(),
              errorHandler: fakeErrorHandler,
              eventDispatcher: fakeEventDispatcher,
              logger: silentLogger,
              eventBatchSize: 300,
            });
            sinon.assert.calledWithExactly(
              eventProcessorSpy,
              sinon.match({
                batchSize: 300,
              })
            );
          });
        });
      });
    });
  });
});
