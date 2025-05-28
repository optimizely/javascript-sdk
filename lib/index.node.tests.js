/**
 * Copyright 2016-2020, 2022-2025 Optimizely
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

import Optimizely from './optimizely';
import testData from './tests/test_data';
import * as optimizelyFactory from './index.node';
import configValidator from './utils/config_validator';
import { getMockProjectConfigManager } from './tests/mock/mock_project_config_manager';
import { wrapConfigManager } from './project_config/config_manager_factory';
import { wrapLogger } from './logging/logger_factory';

var createLogger = () => ({
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  child: () => createLogger(),
})

describe('optimizelyFactory', function() {
  describe('APIs', function() {
    // it('should expose logger, errorHandler, eventDispatcher and enums', function() {
    //   assert.isDefined(optimizelyFactory.logging);
    //   assert.isDefined(optimizelyFactory.logging.createLogger);
    //   assert.isDefined(optimizelyFactory.logging.createNoOpLogger);
    //   assert.isDefined(optimizelyFactory.errorHandler);
    //   assert.isDefined(optimizelyFactory.eventDispatcher);
    //   assert.isDefined(optimizelyFactory.enums);
    // });

    describe('createInstance', function() {
      var fakeErrorHandler = { handleError: function() {} };
      var fakeEventDispatcher = { dispatchEvent: function() {} };
      var fakeLogger = createLogger();

      beforeEach(function() {
        sinon.stub(fakeLogger, 'error');
      });

      afterEach(function() {
        fakeLogger.error.restore();
      });

      // it('should not throw if the provided config is not valid and log an error if logger is passed in', function() {
      //   configValidator.validate.throws(new Error('Invalid config or something'));
      //   var localLogger = loggerPlugin.createLogger({ logLevel: enums.LOG_LEVEL.INFO });
      //   assert.doesNotThrow(function() {
      //     var optlyInstance = optimizelyFactory.createInstance({
      //       projectConfigManager: getMockProjectConfigManager(),
      //       logger: localLogger,
      //     });
      //   });
      //   sinon.assert.calledWith(localLogger.log, enums.LOG_LEVEL.ERROR);
      // });

      // it('should not throw if the provided config is not valid', function() {
      //   configValidator.validate.throws(new Error('INVALID_CONFIG_OR_SOMETHING'));
      //   assert.doesNotThrow(function() {
      //     var optlyInstance = optimizelyFactory.createInstance({
      //       projectConfigManager: wrapConfigManager(getMockProjectConfigManager()),
      //       logger: wrapLogger(fakeLogger),
      //     });
      //   });
      //   // sinon.assert.calledOnce(fakeLogger.error);
      // });

      // it('should create an instance of optimizely', function() {
      //   var optlyInstance = optimizelyFactory.createInstance({
      //     projectConfigManager: getMockProjectConfigManager(),
      //     errorHandler: fakeErrorHandler,
      //     eventDispatcher: fakeEventDispatcher,
      //     logger: fakeLogger,
      //   });

      //   assert.instanceOf(optlyInstance, Optimizely);
      //   assert.equal(optlyInstance.clientVersion, '5.3.4');
      // });
      // TODO: user will create and inject an event processor
      // these tests will be refactored accordingly
      // describe('event processor configuration', function() {
      //   var eventProcessorSpy;
      //   beforeEach(function() {
      //     eventProcessorSpy = sinon.stub(eventProcessor, 'createEventProcessor').callThrough();
      //   });

      //   afterEach(function() {
      //     eventProcessor.createEventProcessor.restore();
      //   });

      //   it('should ignore invalid event flush interval and use default instead', function() {
      //     optimizelyFactory.createInstance({
      //       projectConfigManager: getMockProjectConfigManager({
      //         initConfig: createProjectConfig(testData.getTestProjectConfigWithFeatures()),
      //       }),
      //       errorHandler: fakeErrorHandler,
      //       eventDispatcher: fakeEventDispatcher,
      //       logger: fakeLogger,
      //       eventFlushInterval: ['invalid', 'flush', 'interval'],
      //     });
      //     sinon.assert.calledWithExactly(
      //       eventProcessorSpy,
      //       sinon.match({
      //         flushInterval: 30000,
      //       })
      //     );
      //   });

      //   it('should use default event flush interval when none is provided', function() {
      //     optimizelyFactory.createInstance({
      //       projectConfigManager: getMockProjectConfigManager({
      //         initConfig: createProjectConfig(testData.getTestProjectConfigWithFeatures()),
      //       }),
      //       errorHandler: fakeErrorHandler,
      //       eventDispatcher: fakeEventDispatcher,
      //       logger: fakeLogger,
      //     });
      //     sinon.assert.calledWithExactly(
      //       eventProcessorSpy,
      //       sinon.match({
      //         flushInterval: 30000,
      //       })
      //     );
      //   });

      //   it('should use provided event flush interval when valid', function() {
      //     optimizelyFactory.createInstance({
      //       projectConfigManager: getMockProjectConfigManager({
      //         initConfig: createProjectConfig(testData.getTestProjectConfigWithFeatures()),
      //       }),
      //       errorHandler: fakeErrorHandler,
      //       eventDispatcher: fakeEventDispatcher,
      //       logger: fakeLogger,
      //       eventFlushInterval: 10000,
      //     });
      //     sinon.assert.calledWithExactly(
      //       eventProcessorSpy,
      //       sinon.match({
      //         flushInterval: 10000,
      //       })
      //     );
      //   });

      //   it('should ignore invalid event batch size and use default instead', function() {
      //     optimizelyFactory.createInstance({
      //       projectConfigManager: getMockProjectConfigManager({
      //         initConfig: createProjectConfig(testData.getTestProjectConfigWithFeatures()),
      //       }),
      //       errorHandler: fakeErrorHandler,
      //       eventDispatcher: fakeEventDispatcher,
      //       logger: fakeLogger,
      //       eventBatchSize: null,
      //     });
      //     sinon.assert.calledWithExactly(
      //       eventProcessorSpy,
      //       sinon.match({
      //         batchSize: 10,
      //       })
      //     );
      //   });

      //   it('should use default event batch size when none is provided', function() {
      //     optimizelyFactory.createInstance({
      //       projectConfigManager: getMockProjectConfigManager({
      //         initConfig: createProjectConfig(testData.getTestProjectConfigWithFeatures()),
      //       }),
      //       errorHandler: fakeErrorHandler,
      //       eventDispatcher: fakeEventDispatcher,
      //       logger: fakeLogger,
      //     });
      //     sinon.assert.calledWithExactly(
      //       eventProcessorSpy,
      //       sinon.match({
      //         batchSize: 10,
      //       })
      //     );
      //   });

      //   it('should use provided event batch size when valid', function() {
      //     optimizelyFactory.createInstance({
      //       projectConfigManager: getMockProjectConfigManager({
      //         initConfig: createProjectConfig(testData.getTestProjectConfigWithFeatures()),
      //       }),
      //       errorHandler: fakeErrorHandler,
      //       eventDispatcher: fakeEventDispatcher,
      //       logger: fakeLogger,
      //       eventBatchSize: 300,
      //     });
      //     sinon.assert.calledWithExactly(
      //       eventProcessorSpy,
      //       sinon.match({
      //         batchSize: 300,
      //       })
      //     );
      //   });
      // });
    });
  });
});
