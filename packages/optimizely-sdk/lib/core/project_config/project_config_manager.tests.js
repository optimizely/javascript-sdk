/**
 * Copyright 2019, Optimizely
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

var assert = require('chai').assert;
var datafileManager = require('@optimizely/js-sdk-datafile-manager');
var logging = require('@optimizely/js-sdk-logging');
var sinon = require('sinon');
var sprintf = require('@optimizely/js-sdk-utils').sprintf;
var enums = require('../../utils/enums');
var jsonSchemaValidator = require('../../utils/json_schema_validator');
var projectConfig = require('./index');
var projectConfigManager = require('./project_config_manager');
var testData = require('../../tests/test_data');

var ERROR_MESSAGES = enums.ERROR_MESSAGES;
var LOG_MESSAGES = enums.LOG_MESSAGES;

describe('lib/core/project_config/project_config_manager', function() {
  var globalStubErrorHandler;
  beforeEach(function() {
    sinon.stub(datafileManager, 'DatafileManager').returns({
      start: sinon.stub(),
      stop: sinon.stub(),
      get: sinon.stub().returns(null),
      on: sinon.stub().returns(function() {}),
      onReady: sinon.stub().returns({ then: function() {} }),
    });
    globalStubErrorHandler = {
      handleError: sinon.stub(),
    };
    logging.setErrorHandler(globalStubErrorHandler);
    logging.setLogLevel('notset');
    stubLogHandler = {
      log: sinon.stub(),
    };
    logging.setLogHandler(stubLogHandler);
  });

  afterEach(function() {
    datafileManager.DatafileManager.restore();
    logging.resetErrorHandler();
    logging.resetLogger();
  });

  it('should throw an error if neither datafile nor sdkKey are passed into the constructor', function(done) {
    var manager = new projectConfigManager.ProjectConfigManager({
      skipJSONValidation: true,
    });
    sinon.assert.calledOnce(globalStubErrorHandler.handleError);
    var errorMessage = globalStubErrorHandler.handleError.lastCall.args[0].message;
    assert.strictEqual(errorMessage, sprintf(ERROR_MESSAGES.DATAFILE_AND_SDK_KEY_MISSING, 'PROJECT_CONFIG_MANAGER'));
    manager.onReady().catch(function() {
      done();
    });
  });

  it('should throw an error if the datafile JSON is malformed', function(done) {
    var invalidDatafileJSON = 'abc';
    var manager = new projectConfigManager.ProjectConfigManager({
      datafile: invalidDatafileJSON,
      skipJSONValidation: true,
    });
    sinon.assert.calledOnce(globalStubErrorHandler.handleError);
    var errorMessage = globalStubErrorHandler.handleError.lastCall.args[0].message;
    assert.strictEqual(errorMessage, sprintf(ERROR_MESSAGES.INVALID_DATAFILE_MALFORMED, 'CONFIG_VALIDATOR'));
    manager.onReady().catch(function() {
      done();
    });
  });

  it('should throw an error if the datafile is not valid', function(done) {
    var invalidDatafile = testData.getTestProjectConfig();
    delete invalidDatafile['projectId'];
    var manager = new projectConfigManager.ProjectConfigManager({
      datafile: invalidDatafile,
      jsonSchemaValidator: jsonSchemaValidator,
    });
    sinon.assert.calledOnce(globalStubErrorHandler.handleError);
    var errorMessage = globalStubErrorHandler.handleError.lastCall.args[0].message;
    assert.strictEqual(errorMessage, sprintf(ERROR_MESSAGES.INVALID_DATAFILE, 'JSON_SCHEMA_VALIDATOR', 'projectId', 'is missing and it is required'));
    manager.onReady().catch(function() {
      done();
    });
  });

  it('should throw an error if the datafile version is not supported', function(done) {
    var manager = new projectConfigManager.ProjectConfigManager({
      datafile: testData.getUnsupportedVersionConfig(),
      jsonSchemaValidator: jsonSchemaValidator,
    });
    sinon.assert.calledOnce(globalStubErrorHandler.handleError);
    var errorMessage = globalStubErrorHandler.handleError.lastCall.args[0].message;
    assert.strictEqual(errorMessage, sprintf(ERROR_MESSAGES.INVALID_DATAFILE_VERSION, 'CONFIG_VALIDATOR', '5'));
    manager.onReady().catch(function() {
      done();
    });
  });

  describe('skipping JSON schema validation', function() {
    beforeEach(function() {
      sinon.spy(jsonSchemaValidator, 'validate');
    });

    afterEach(function() {
      jsonSchemaValidator.validate.restore();
    });

    it('should skip JSON schema validation if skipJSONValidation is passed into instance args with `true` value', function() {
      var manager = new projectConfigManager.ProjectConfigManager({
        datafile: testData.getTestProjectConfig(),
        skipJSONValidation: true,
      });
      sinon.assert.notCalled(jsonSchemaValidator.validate);
      return manager.onReady();
    });

    it('should not skip JSON schema validation if skipJSONValidation is passed into instance args with any value other than true', function() {
      var manager = new projectConfigManager.ProjectConfigManager({
        datafile: testData.getTestProjectConfig(),
        jsonSchemaValidator: jsonSchemaValidator,
        skipJSONValidation: 'hi',
      });
      sinon.assert.calledOnce(jsonSchemaValidator.validate);
      sinon.assert.calledOnce(stubLogHandler.log);
      var logMessage = stubLogHandler.log.args[0][1];
      assert.strictEqual(logMessage, sprintf(LOG_MESSAGES.VALID_DATAFILE, 'PROJECT_CONFIG'));
      return manager.onReady();
    });
  });

  it('should return a valid datafile from getConfig and resolve onReady', function() {
    var configWithFeatures = testData.getTestProjectConfigWithFeatures();
    var manager = new projectConfigManager.ProjectConfigManager({
      datafile: configWithFeatures,
    });
    assert.deepEqual(
      manager.getConfig(),
      projectConfig.createProjectConfig(configWithFeatures)
    );
    return manager.onReady();
  });

  it('does not call onUpdate listeners after becoming ready when constructed with a valid datafile and without sdkKey', function() {
    var configWithFeatures = testData.getTestProjectConfigWithFeatures();
    var manager = new projectConfigManager.ProjectConfigManager({
      datafile: configWithFeatures,
    });
    var onUpdateSpy = sinon.spy();
    manager.onUpdate(onUpdateSpy);
    return manager.onReady().then(function() {
      sinon.assert.notCalled(onUpdateSpy);
    });
  });

  describe('with a datafile manager', function() {
    it('passes the correct options to datafile manager', function() {
      new projectConfigManager.ProjectConfigManager({
        datafile: testData.getTestProjectConfig(),
        sdkKey: '12345',
        datafileOptions: {
          autoUpdate: true,
          updateInterval: 10000,
        },
      });
      sinon.assert.calledOnce(datafileManager.DatafileManager);
      sinon.assert.calledWithExactly(datafileManager.DatafileManager, sinon.match({
        datafile: testData.getTestProjectConfig(),
        sdkKey: '12345',
        autoUpdate: true,
        updateInterval: 10000,
      }));
    });

    describe('when constructed with sdkKey and without datafile', function() {
      it('updates itself when the datafile manager is ready and then emits updates', function() {
        var configWithFeatures = testData.getTestProjectConfigWithFeatures();
        datafileManager.DatafileManager.returns({
          start: sinon.stub(),
          stop: sinon.stub(),
          get: sinon.stub().returns(configWithFeatures),
          on: sinon.stub().returns(function() {}),
          onReady: sinon.stub().returns(Promise.resolve())
        });
        var manager = new projectConfigManager.ProjectConfigManager({
          sdkKey: '12345',
        });
        assert.isNull(manager.getConfig());
        return manager.onReady().then(function() {
          assert.deepEqual(
            manager.getConfig(),
            projectConfig.createProjectConfig(configWithFeatures)
          );

          var nextDatafile = testData.getTestProjectConfigWithFeatures();
          nextDatafile.experiments.push({
            key: 'anotherTestExp',
            status: 'Running',
            forcedVariations: {},
            audienceIds: [],
            layerId: '253442',
            trafficAllocation: [{ entityId: '99977477477747747', endOfRange: 10000 }],
            id: '1237847778',
            variations: [{ key: 'variation', id: '99977477477747747' }],
          });
          nextDatafile.revision = '36';
          var fakeDatafileManager = datafileManager.DatafileManager.getCall(0).returnValue;
          fakeDatafileManager.get.returns(nextDatafile);
          var updateListener = fakeDatafileManager.on.getCall(0).args[1];
          updateListener({ datafile: nextDatafile });
          assert.deepEqual(
            manager.getConfig(),
            projectConfig.createProjectConfig(nextDatafile)
          );
        });
      });

      it('calls onUpdate listeners after becoming ready, and after the datafile manager emits updates', function() {
        datafileManager.DatafileManager.returns({
          start: sinon.stub(),
          stop: sinon.stub(),
          get: sinon.stub().returns(testData.getTestProjectConfigWithFeatures()),
          on: sinon.stub().returns(function() {}),
          onReady: sinon.stub().returns(Promise.resolve())
        });
        var manager = new projectConfigManager.ProjectConfigManager({
          sdkKey: '12345',
        });
        var onUpdateSpy = sinon.spy();
        manager.onUpdate(onUpdateSpy);
        return manager.onReady().then(function() {
          sinon.assert.calledOnce(onUpdateSpy);

          var fakeDatafileManager = datafileManager.DatafileManager.getCall(0).returnValue;
          var updateListener = fakeDatafileManager.on.getCall(0).args[1];
          var newDatafile = testData.getTestProjectConfigWithFeatures();
          newDatafile.revision = '36';
          fakeDatafileManager.get.returns(newDatafile);

          updateListener({ datafile: newDatafile });
          sinon.assert.calledTwice(onUpdateSpy);
        });
      });

      it('can remove onUpdate listeners using the function returned from onUpdate', function() {
        datafileManager.DatafileManager.returns({
          start: sinon.stub(),
          stop: sinon.stub(),
          get: sinon.stub().returns(testData.getTestProjectConfigWithFeatures()),
          on: sinon.stub().returns(function() {}),
          onReady: sinon.stub().returns(Promise.resolve())
        });
        var manager = new projectConfigManager.ProjectConfigManager({
          sdkKey: '12345',
        });
        return manager.onReady().then(function() {
          var onUpdateSpy = sinon.spy();
          var unsubscribe = manager.onUpdate(onUpdateSpy);

          var fakeDatafileManager = datafileManager.DatafileManager.getCall(0).returnValue;
          var updateListener = fakeDatafileManager.on.getCall(0).args[1];
          var newDatafile = testData.getTestProjectConfigWithFeatures();
          newDatafile.revision = '36';
          fakeDatafileManager.get.returns(newDatafile);
          updateListener({ datafile: newDatafile });

          sinon.assert.calledOnce(onUpdateSpy);

          unsubscribe();

          newDatafile = testData.getTestProjectConfigWithFeatures();
          newDatafile.revision = '37';
          fakeDatafileManager.get.returns(newDatafile);
          updateListener({ datafile: newDatafile });
          // // Should not call onUpdateSpy again since we unsubscribed
          updateListener({ datafile: testData.getTestProjectConfigWithFeatures() });
          sinon.assert.calledOnce(onUpdateSpy);
        });
      });

      it('rejects its ready promise when the datafile manager emits an invalid datafile', function(done) {
        var invalidDatafile = testData.getTestProjectConfig();
        delete invalidDatafile['projectId'];
        datafileManager.DatafileManager.returns({
          start: sinon.stub(),
          stop: sinon.stub(),
          get: sinon.stub().returns(invalidDatafile),
          on: sinon.stub().returns(function() {}),
          onReady: sinon.stub().returns(Promise.resolve())
        });
        var manager = new projectConfigManager.ProjectConfigManager({
          jsonSchemaValidator: jsonSchemaValidator,
          sdkKey: '12345',
        });
        manager.onReady().catch(function() {
          done();
        });
      });

      it('calls stop on its datafile manager when its stop method is called', function() {
        var manager = new projectConfigManager.ProjectConfigManager({
          sdkKey: '12345',
        });
        manager.stop();
        sinon.assert.calledOnce(datafileManager.DatafileManager.getCall(0).returnValue.stop);
      });
    });

    describe('when constructed with sdkKey and with a valid datafile', function() {
      it('does not call onUpdate listeners after becoming ready', function() {
        datafileManager.DatafileManager.returns({
          start: sinon.stub(),
          stop: sinon.stub(),
          get: sinon.stub().returns(testData.getTestProjectConfigWithFeatures()),
          on: sinon.stub().returns(function() {}),
          onReady: sinon.stub().returns(Promise.resolve())
        });
        var configWithFeatures = testData.getTestProjectConfigWithFeatures();
        var manager = new projectConfigManager.ProjectConfigManager({
          datafile: configWithFeatures,
          sdkKey: '12345',
        });
        var onUpdateSpy = sinon.spy();
        manager.onUpdate(onUpdateSpy);
        return manager.onReady().then(function() {
          // Datafile is the same as what it was constructed with, so should
          // not have called update listener
          sinon.assert.notCalled(onUpdateSpy);
        });
      });
    });
  });
});
