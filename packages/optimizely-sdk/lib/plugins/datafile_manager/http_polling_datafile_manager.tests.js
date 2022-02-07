/**
 * Copyright 2021 Optimizely
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
import { createHttpPollingDatafileManager } from './http_polling_datafile_manager';
import * as projectConfig from '../../core/project_config';
import * as datafileManager from '@optimizely/js-sdk-datafile-manager';
 
describe('lib/plugins/datafile_manager/http_polling_datafile_manager', function() {
  var sandbox = sinon.sandbox.create();
  
  beforeEach(() => {        
    sandbox.stub(datafileManager,'HttpPollingDatafileManager');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('when datafile is null', () => {
    beforeEach(() => {
      sandbox.stub(projectConfig, 'toDatafile');
      sandbox.stub(projectConfig, 'tryCreatingProjectConfig');
    });
    it('should create HttpPollingDatafileManager with correct options and not create project config', () => {
      var logger = {
        error: () => {},
      }
      createHttpPollingDatafileManager('SDK_KEY', logger, undefined, {
        autoUpdate: true,
        datafileAccessToken: 'THE_TOKEN',
        updateInterval: 5000,
        urlTemplate: 'http://example.com'
      });
  
      sinon.assert.calledWithExactly(datafileManager.HttpPollingDatafileManager, {
        autoUpdate: true,
        datafileAccessToken: 'THE_TOKEN',
        updateInterval: 5000,
        urlTemplate: 'http://example.com',
        sdkKey: 'SDK_KEY',
      });    
      sinon.assert.notCalled(projectConfig.tryCreatingProjectConfig);
      sinon.assert.notCalled(projectConfig.toDatafile);
    });
  });
  
  describe('when initial datafile is provided', () => {
    beforeEach(() => {
      sandbox.stub(projectConfig, 'tryCreatingProjectConfig').returns({ configObj: { dummy: "Config" }, error: null});
      sandbox.stub(projectConfig, 'toDatafile').returns('{"dummy": "datafile"}');
    });
    it('should create project config and add datafile', () => {
      var logger = {
        error: () => {},
      }
      var dummyDatafile = '{"dummy": "datafile"}';
      createHttpPollingDatafileManager('SDK_KEY', logger, dummyDatafile, {
        autoUpdate: true,
        datafileAccessToken: 'THE_TOKEN',
        updateInterval: 5000,
        urlTemplate: 'http://example.com'
      });
  
      sinon.assert.calledWithExactly(datafileManager.HttpPollingDatafileManager, {
        datafile: dummyDatafile,
        autoUpdate: true,
        datafileAccessToken: 'THE_TOKEN',
        updateInterval: 5000,
        urlTemplate: 'http://example.com',
        sdkKey: 'SDK_KEY',
      });    
      sinon.assert.calledWithExactly(projectConfig.tryCreatingProjectConfig, {
        datafile: dummyDatafile,
        jsonSchemaValidator: undefined,
        logger,
      });
      sinon.assert.calledWithExactly(projectConfig.toDatafile, {dummy: "Config"});
    })
  })

  describe('error logging', () => {
    beforeEach(() => {
      sandbox.stub(projectConfig, 'tryCreatingProjectConfig').returns({ configObj: null, error: 'Error creating config'});
      sandbox.stub(projectConfig, 'toDatafile');
    });
    it('Should log error when error is thrown while creating project config', () => {
      var logger = {
        error: () => {},
      }
      var errorSpy = sandbox.spy(logger, 'error');
      var dummyDatafile = '{"dummy": "datafile"}';
      createHttpPollingDatafileManager('SDK_KEY', logger, dummyDatafile, {
        autoUpdate: true,
        datafileAccessToken: 'THE_TOKEN',
        updateInterval: 5000,
        urlTemplate: 'http://example.com'
      });
  
      sinon.assert.calledWithExactly(datafileManager.HttpPollingDatafileManager, {
        autoUpdate: true,
        datafileAccessToken: 'THE_TOKEN',
        updateInterval: 5000,
        urlTemplate: 'http://example.com',
        sdkKey: 'SDK_KEY',
      });    
      sinon.assert.calledWithExactly(projectConfig.tryCreatingProjectConfig, {
        datafile: dummyDatafile,
        jsonSchemaValidator: undefined,
        logger,
      });
      sinon.assert.notCalled(projectConfig.toDatafile);
      sinon.assert.calledWithExactly(errorSpy, 'Error creating config');
    })
  });
});
