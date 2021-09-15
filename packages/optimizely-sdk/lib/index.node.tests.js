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
import eventProcessor from './core/event_processor';

import * as enums from './utils/enums';
import Optimizely from './optimizely';
import testData from './tests/test_data';
import * as loggerPlugin from './plugins/logger';
import optimizelyFactory from './index.node';
import configValidator from './utils/config_validator';

describe('optimizelyFactory', function() {
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
      var fakeLogger;

      beforeEach(function() {
        fakeLogger = { log: sinon.spy(), setLogLevel: sinon.spy() };
        sinon.stub(loggerPlugin, 'createLogger').returns(fakeLogger);
        sinon.stub(configValidator, 'validate');
        sinon.stub(console, 'error');
      });

      afterEach(function() {
        loggerPlugin.createLogger.restore();
        configValidator.validate.restore();
        console.error.restore();
      });

      it('should not throw if the provided config is not valid and log an error if logger is passed in', function() {
        configValidator.validate.throws(new Error('Invalid config or something'));
        var localLogger = loggerPlugin.createLogger({ logLevel: enums.LOG_LEVEL.INFO });
        assert.doesNotThrow(function() {
          var optlyInstance = optimizelyFactory.createInstance({
            datafile: {},
            logger: localLogger,
          });
          // Invalid datafile causes onReady Promise rejection - catch this
          optlyInstance.onReady().catch(function() {});
        });
        sinon.assert.calledWith(localLogger.log, enums.LOG_LEVEL.ERROR);
      });

      it('should not throw if the provided config is not valid and log an error if no logger is provided', function() {
        configValidator.validate.throws(new Error('Invalid config or something'));
        assert.doesNotThrow(function() {
          var optlyInstance = optimizelyFactory.createInstance({
            datafile: {},
          });
          // Invalid datafile causes onReady Promise rejection - catch this
          optlyInstance.onReady().catch(function() {});
        });
        sinon.assert.calledOnce(console.error);
      });

      it('should create an instance of optimizely', function() {
        var optlyInstance = optimizelyFactory.createInstance({
          datafile: {},
          errorHandler: fakeErrorHandler,
          eventDispatcher: fakeEventDispatcher,
          logger: fakeLogger,
        });
        // Invalid datafile causes onReady Promise rejection - catch this
        optlyInstance.onReady().catch(function() {});

        assert.instanceOf(optlyInstance, Optimizely);
        assert.equal(optlyInstance.clientVersion, '4.7.0');
      });

      describe('event processor configuration', function() {
        var eventProcessorSpy;
        beforeEach(function() {
          eventProcessorSpy = sinon.stub(eventProcessor, 'createEventProcessor').callThrough();
        });

        afterEach(function() {
          eventProcessor.createEventProcessor.restore();
        });

        it('should ignore invalid event flush interval and use default instead', function() {
          optimizelyFactory.createInstance({
            datafile: testData.getTestProjectConfigWithFeatures(),
            errorHandler: fakeErrorHandler,
            eventDispatcher: fakeEventDispatcher,
            logger: fakeLogger,
            eventFlushInterval: ['invalid', 'flush', 'interval'],
          });
          sinon.assert.calledWithExactly(
            eventProcessorSpy,
            sinon.match({
              flushInterval: 30000,
            })
          );
        });

        it('should use default event flush interval when none is provided', function() {
          optimizelyFactory.createInstance({
            datafile: testData.getTestProjectConfigWithFeatures(),
            errorHandler: fakeErrorHandler,
            eventDispatcher: fakeEventDispatcher,
            logger: fakeLogger,
          });
          sinon.assert.calledWithExactly(
            eventProcessorSpy,
            sinon.match({
              flushInterval: 30000,
            })
          );
        });

        it('should use provided event flush interval when valid', function() {
          optimizelyFactory.createInstance({
            datafile: testData.getTestProjectConfigWithFeatures(),
            errorHandler: fakeErrorHandler,
            eventDispatcher: fakeEventDispatcher,
            logger: fakeLogger,
            eventFlushInterval: 10000,
          });
          sinon.assert.calledWithExactly(
            eventProcessorSpy,
            sinon.match({
              flushInterval: 10000,
            })
          );
        });

        it('should ignore invalid event batch size and use default instead', function() {
          optimizelyFactory.createInstance({
            datafile: testData.getTestProjectConfigWithFeatures(),
            errorHandler: fakeErrorHandler,
            eventDispatcher: fakeEventDispatcher,
            logger: fakeLogger,
            eventBatchSize: null,
          });
          sinon.assert.calledWithExactly(
            eventProcessorSpy,
            sinon.match({
              batchSize: 10,
            })
          );
        });

        it('should use default event batch size when none is provided', function() {
          optimizelyFactory.createInstance({
            datafile: testData.getTestProjectConfigWithFeatures(),
            errorHandler: fakeErrorHandler,
            eventDispatcher: fakeEventDispatcher,
            logger: fakeLogger,
          });
          sinon.assert.calledWithExactly(
            eventProcessorSpy,
            sinon.match({
              batchSize: 10,
            })
          );
        });

        it('should use provided event batch size when valid', function() {
          optimizelyFactory.createInstance({
            datafile: testData.getTestProjectConfigWithFeatures(),
            errorHandler: fakeErrorHandler,
            eventDispatcher: fakeEventDispatcher,
            logger: fakeLogger,
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
