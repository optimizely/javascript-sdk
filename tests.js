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
var configValidator = require('optimizely-server-sdk/lib/utils/config_validator');
var enums = require('optimizely-server-sdk/lib/utils/enums');
var Optimizely = require('optimizely-server-sdk/lib/optimizely');
var optimizelyFactory = require('./');
var packageJSON = require('./package.json');
var eventDispatcher = require('./lib/plugins/event_dispatcher_bulk');
var testData = require('./tests/test_data');

var chai = require('chai');
var assert = chai.assert;
var sinon = require('sinon');

describe('javascript-sdk', function() {
  describe('APIs', function() {
    var xhr;
    var requests;
    describe('createInstance', function() {
      var fakeErrorHandler = { handleError: function() {}};
      var fakeEventDispatcher = { dispatchEvent: function() {}};
      var fakeLogger = { log: function() {}};

      beforeEach(function() {
        sinon.spy(console, 'error');
        sinon.stub(configValidator, 'validate');

        xhr = sinon.useFakeXMLHttpRequest();
        global.XMLHttpRequest = xhr;
        requests = [];
        xhr.onCreate = function (xhr) {
            requests.push(xhr);
        };
      });

      afterEach(function() {
        console.error.restore();
        configValidator.validate.restore();
        xhr.restore();
      });

      it('should not throw if the provided config is not valid', function() {
        configValidator.validate.throws(new Error('Invalid config or something'));
        assert.doesNotThrow(function() {
          optimizelyFactory.createInstance({
            datafile: {},
          });
        });
      });

      it('should create an instance of optimizely', function() {
        var optlyInstance = optimizelyFactory.createInstance({
          datafile: {},
          errorHandler: fakeErrorHandler,
          eventDispatcher: fakeEventDispatcher,
          logger: fakeLogger,
        });

        assert.instanceOf(optlyInstance, Optimizely);
      });

      it('should set the JavaScript client engine and version', function() {
        var optlyInstance = optimizelyFactory.createInstance({
          datafile: {},
          errorHandler: fakeErrorHandler,
          eventDispatcher: fakeEventDispatcher,
          logger: fakeLogger,
        });
        assert.equal('javascript-sdk', optlyInstance.clientEngine);
        assert.equal(packageJSON.version, optlyInstance.clientVersion);
      });

      it('should instantiate the logger with a custom logLevel when provided', function() {
        var optlyInstance = optimizelyFactory.createInstance({
          datafile: {},
          logLevel: enums.LOG_LEVEL.ERROR,
        });

        assert.equal(optlyInstance.logger.logLevel, enums.LOG_LEVEL.ERROR);
      });

      it('should default to INFO when no logLevel is provided', function() {
        var optlyInstance = optimizelyFactory.createInstance({
          datafile: {},
        });

        assert.equal(optlyInstance.logger.logLevel, enums.LOG_LEVEL.INFO);
      });

      it('should activate with provided event dispatcher', function(done) {
        var optlyInstance = optimizelyFactory.createInstance({
          datafile: testData.getTestProjectConfig(),
          errorHandler: fakeErrorHandler,
          eventDispatcher: new eventDispatcher,
          logger: fakeLogger,
          skipJSONValidation: true,
        });
        var activate = optlyInstance.activate('testExperiment', 'testUser');
        assert.strictEqual(activate, 'control');
        done();
      });

    });
  });
});
