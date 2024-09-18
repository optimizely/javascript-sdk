/**
 * Copyright 2019-2020, 2022, 2024, Optimizely
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
import { describe, it, expect, vi } from 'vitest';
import { ProjectConfigManagerImpl } from './project_config_manager';
import { getMockLogger } from '../tests/mock/mockLogger';
import { ServiceState } from '../service';
import * as testData from '../tests/test_data';
import { createProjectConfig } from './project_config';
import { resolvablePromise } from '../utils/promise/resolvablePromise';
import { getMockDatafileManager } from '../tests/mock/mockDatafileManager';
import { wait } from '../../tests/testUtils';

const cloneDeep = (x: any) => JSON.parse(JSON.stringify(x));

describe('ProjectConfigManagerImpl', () => {
  it('should reject onRunning() and log error if neither datafile nor a datafileManager is passed into the constructor', async () => {
    const logger = getMockLogger();
    const manager = new ProjectConfigManagerImpl({ logger});
    manager.start();
    await expect(manager.onRunning()).rejects.toThrow();
    expect(logger.error).toHaveBeenCalled();
  });

  it('should set status to Failed if neither datafile nor a datafileManager is passed into the constructor', async () => {
    const logger = getMockLogger();
    const manager = new ProjectConfigManagerImpl({ logger});
    manager.start();
    await expect(manager.onRunning()).rejects.toThrow();
    expect(manager.getState()).toBe(ServiceState.Failed);
  });

  it('should reject onTerminated if neither datafile nor a datafileManager is passed into the constructor', async () => {
    const logger = getMockLogger();
    const manager = new ProjectConfigManagerImpl({ logger});
    manager.start();
    await expect(manager.onTerminated()).rejects.toThrow();
  });

  describe('when constructed with only a datafile', () => {
    it('should reject onRunning() and log error if the datafile is invalid', async () => {
      const logger = getMockLogger();
      const manager = new ProjectConfigManagerImpl({ logger, datafile: {}});
      manager.start();
      await expect(manager.onRunning()).rejects.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });
  
    it('should set status to Failed if the datafile is invalid', async () => {
      const logger = getMockLogger();
      const manager = new ProjectConfigManagerImpl({ logger, datafile: {}});
      manager.start();
      await expect(manager.onRunning()).rejects.toThrow();
      expect(manager.getState()).toBe(ServiceState.Failed);
    });
  
    it('should reject onTerminated if the datafile is invalid', async () => {
      const logger = getMockLogger();
      const manager = new ProjectConfigManagerImpl({ logger});
      manager.start();
      await expect(manager.onTerminated()).rejects.toThrow();
    });

    it('should fulfill onRunning() and set status to Running if the datafile is valid', async () => {
      const logger = getMockLogger();
      const manager = new ProjectConfigManagerImpl({ logger, datafile: testData.getTestProjectConfig()});
      manager.start();
      await expect(manager.onRunning()).resolves.not.toThrow();
      expect(manager.getState()).toBe(ServiceState.Running);
    });

    it('should call onUpdate listeners registered before or after start() with the project config after resolving onRunning()', async () => {
      const logger = getMockLogger();
      const manager = new ProjectConfigManagerImpl({ logger, datafile: testData.getTestProjectConfig()});
      const listener1 = vi.fn();
      manager.onUpdate(listener1);
      manager.start();
      const listener2 = vi.fn();
      manager.onUpdate(listener2);
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalledOnce();

      await manager.onRunning();

      expect(listener1).toHaveBeenCalledOnce();
      expect(listener2).toHaveBeenCalledOnce();

      expect(listener1).toHaveBeenCalledWith(createProjectConfig(testData.getTestProjectConfig()));
      expect(listener2).toHaveBeenCalledWith(createProjectConfig(testData.getTestProjectConfig()));
    });

    it('should return the correct config from getConfig() both before or after onRunning() resolves', async () => {
      const logger = getMockLogger();
      const manager = new ProjectConfigManagerImpl({ logger, datafile: testData.getTestProjectConfig()});
      manager.start();
      expect(manager.getConfig()).toEqual(createProjectConfig(testData.getTestProjectConfig()));
      await manager.onRunning();
      expect(manager.getConfig()).toEqual(createProjectConfig(testData.getTestProjectConfig()));
    });
  });

  describe('when constructed with a datafileManager', () => {
    describe('when datafile is also provided', () => {
      describe('when datafile is valid', () => {
        it('should resolve onRunning() before datafileManger.onRunning() resolves', async () => {
          const datafileManager = getMockDatafileManager({
            onRunning: resolvablePromise<void>().promise, // this will not be resolved
          });
          vi.spyOn(datafileManager, 'onRunning');
          const manager = new ProjectConfigManagerImpl({ datafile: testData.getTestProjectConfig(), datafileManager });
          manager.start();

          expect(datafileManager.onRunning).toHaveBeenCalled();
          await expect(manager.onRunning()).resolves.not.toThrow();
        });

        it('should resolve onRunning() even if datafileManger.onRunning() rejects', async () => {
          const onRunning = Promise.reject(new Error('onRunning error'));
          const datafileManager = getMockDatafileManager({
            onRunning,
          });
          vi.spyOn(datafileManager, 'onRunning');
          const manager = new ProjectConfigManagerImpl({ datafile: testData.getTestProjectConfig(), datafileManager });
          manager.start();

          expect(datafileManager.onRunning).toHaveBeenCalled();
          await expect(manager.onRunning()).resolves.not.toThrow();
        });

        it('should call the onUpdate handler before datafileManger.onRunning() resolves', async () => {
          const datafileManager = getMockDatafileManager({
            onRunning: resolvablePromise<void>().promise, // this will not be resolved
          });

          const listener = vi.fn();

          const manager = new ProjectConfigManagerImpl({ datafile: testData.getTestProjectConfig(), datafileManager });
          manager.start();
          manager.onUpdate(listener);
          await expect(manager.onRunning()).resolves.not.toThrow();
          expect(listener).toHaveBeenCalledWith(createProjectConfig(testData.getTestProjectConfig()));
        });

        it('should return the correct config from getConfig() both before or after onRunning() resolves', async () => {
          const datafileManager = getMockDatafileManager({
            onRunning: resolvablePromise<void>().promise, // this will not be resolved
          });
          
          const manager = new ProjectConfigManagerImpl({ datafile: testData.getTestProjectConfig(), datafileManager });
          manager.start();

          expect(manager.getConfig()).toEqual(createProjectConfig(testData.getTestProjectConfig()));
          await manager.onRunning();
          expect(manager.getConfig()).toEqual(createProjectConfig(testData.getTestProjectConfig()));
        });
      });

      describe('when datafile is invalid', () => {
        it('should reject onRunning() with the same error if datafileManager.onRunning() rejects', async () => {
          const datafileManager = getMockDatafileManager({ onRunning: Promise.reject('test error') });
          const manager = new ProjectConfigManagerImpl({ datafile: {}, datafileManager });
          manager.start();
          await expect(manager.onRunning()).rejects.toBe('test error');
        });

        it('should resolve onRunning() if datafileManager.onUpdate() is fired and should update config', async () => {
          const datafileManager = getMockDatafileManager({ onRunning: Promise.resolve() });
          const manager = new ProjectConfigManagerImpl({ datafile: {}, datafileManager });
          manager.start();
          datafileManager.pushUpdate(testData.getTestProjectConfig());
          await expect(manager.onRunning()).resolves.not.toThrow();
          expect(manager.getConfig()).toEqual(createProjectConfig(testData.getTestProjectConfig()));
        });

        it('should resolve onRunning(), update config and call onUpdate listeners if datafileManager.onUpdate() is fired', async () => {
          const datafileManager = getMockDatafileManager({ onRunning: Promise.resolve() });
          const manager = new ProjectConfigManagerImpl({ datafile: {}, datafileManager });
          manager.start();
          const listener = vi.fn();
          manager.onUpdate(listener);

          datafileManager.pushUpdate(testData.getTestProjectConfig());
          await expect(manager.onRunning()).resolves.not.toThrow();
          expect(manager.getConfig()).toEqual(createProjectConfig(testData.getTestProjectConfig()));
          expect(listener).toHaveBeenCalledWith(createProjectConfig(testData.getTestProjectConfig()));
        });

        it('should return undefined from getConfig() before onRunning() resolves', async () => {
          const datafileManager = getMockDatafileManager({ onRunning: Promise.resolve() });
          const manager = new ProjectConfigManagerImpl({ datafile: {}, datafileManager });
          manager.start();
          expect(manager.getConfig()).toBeUndefined();
        });
  
        it('should return the correct config from getConfig() after onRunning() resolves', async () => {
          const datafileManager = getMockDatafileManager({ onRunning: Promise.resolve() });
          const manager = new ProjectConfigManagerImpl({ datafile: {}, datafileManager });
          manager.start();
  
          datafileManager.pushUpdate(testData.getTestProjectConfig());
          await expect(manager.onRunning()).resolves.not.toThrow();
          expect(manager.getConfig()).toEqual(createProjectConfig(testData.getTestProjectConfig()));
        });
      });
    });

    describe('when datafile is not provided', () => {
      it('should reject onRunning() if datafileManager.onRunning() rejects', async () => {
        const datafileManager = getMockDatafileManager({ onRunning: Promise.reject('test error') });
        const manager = new ProjectConfigManagerImpl({ datafileManager });
        manager.start();
        await expect(manager.onRunning()).rejects.toBe('test error');
      });

      it('should resolve onRunning(), update config and call onUpdate listeners if datafileManager.onUpdate() is fired', async () => {
        const datafileManager = getMockDatafileManager({ onRunning: Promise.resolve() });
        const manager = new ProjectConfigManagerImpl({ datafileManager });
        manager.start();
        const listener = vi.fn();
        manager.onUpdate(listener);

        datafileManager.pushUpdate(testData.getTestProjectConfig());
        await expect(manager.onRunning()).resolves.not.toThrow();
        expect(manager.getConfig()).toEqual(createProjectConfig(testData.getTestProjectConfig()));
        expect(listener).toHaveBeenCalledWith(createProjectConfig(testData.getTestProjectConfig()));
      });

      it('should return undefined from getConfig() before onRunning() resolves', async () => {
        const datafileManager = getMockDatafileManager({ onRunning: Promise.resolve() });
        const manager = new ProjectConfigManagerImpl({ datafileManager });
        manager.start();
        expect(manager.getConfig()).toBeUndefined();
      });

      it('should return the correct config from getConfig() after onRunning() resolves', async () => {
        const datafileManager = getMockDatafileManager({ onRunning: Promise.resolve() });
        const manager = new ProjectConfigManagerImpl({ datafileManager });
        manager.start();

        datafileManager.pushUpdate(testData.getTestProjectConfig());
        await expect(manager.onRunning()).resolves.not.toThrow();
        expect(manager.getConfig()).toEqual(createProjectConfig(testData.getTestProjectConfig()));
      });
    });

    it('should update the config and call onUpdate handlers when datafileManager onUpdate is fired with valid datafile', async () => {
      const datafileManager = getMockDatafileManager({});
      
      const datafile = testData.getTestProjectConfig();
      const manager = new ProjectConfigManagerImpl({ datafile, datafileManager });
      manager.start();

      const listener = vi.fn();
      manager.onUpdate(listener);

      expect(manager.getConfig()).toEqual(createProjectConfig(datafile));
      await manager.onRunning();
      expect(manager.getConfig()).toEqual(createProjectConfig(datafile));
      expect(listener).toHaveBeenNthCalledWith(1, createProjectConfig(datafile));

      const updatedDatafile = cloneDeep(datafile);          
      updatedDatafile['revision'] = '99';
      datafileManager.pushUpdate(updatedDatafile);
      await Promise.resolve();

      expect(manager.getConfig()).toEqual(createProjectConfig(updatedDatafile));
      expect(listener).toHaveBeenNthCalledWith(2, createProjectConfig(updatedDatafile));
    });

    it('should not call onUpdate handlers and should log error when datafileManager onUpdate is fired with invalid datafile', async () => {
      const datafileManager = getMockDatafileManager({});
      
      const logger = getMockLogger();
      const datafile = testData.getTestProjectConfig();
      const manager = new ProjectConfigManagerImpl({ logger, datafile, datafileManager });
      manager.start();

      const listener = vi.fn();
      manager.onUpdate(listener);

      expect(manager.getConfig()).toEqual(createProjectConfig(testData.getTestProjectConfig()));
      await manager.onRunning();
      expect(manager.getConfig()).toEqual(createProjectConfig(testData.getTestProjectConfig()));

      expect(listener).toHaveBeenCalledWith(createProjectConfig(datafile));

      const updatedDatafile = {};          
      datafileManager.pushUpdate(updatedDatafile);
      await Promise.resolve();

      expect(manager.getConfig()).toEqual(createProjectConfig(datafile));
      expect(listener).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalled();
    });

    it('should use the JSON schema validator to validate the datafile', async () => {
      const datafileManager = getMockDatafileManager({});
      
      const datafile = testData.getTestProjectConfig();
      const jsonSchemaValidator = vi.fn().mockReturnValue(true);
      const manager = new ProjectConfigManagerImpl({ datafile, datafileManager, jsonSchemaValidator });
      manager.start();

      await manager.onRunning();

      const updatedDatafile = cloneDeep(datafile);          
      updatedDatafile['revision'] = '99';
      datafileManager.pushUpdate(updatedDatafile);
      await Promise.resolve();

      expect(jsonSchemaValidator).toHaveBeenCalledTimes(2);
      expect(jsonSchemaValidator).toHaveBeenNthCalledWith(1, datafile);
      expect(jsonSchemaValidator).toHaveBeenNthCalledWith(2, updatedDatafile);
    });

    it('should not call onUpdate handlers when datafileManager onUpdate is fired with the same datafile', async () => {
      const datafileManager = getMockDatafileManager({});
      
      const datafile = testData.getTestProjectConfig();
      const manager = new ProjectConfigManagerImpl({ datafile, datafileManager });
      manager.start();

      const listener = vi.fn();
      manager.onUpdate(listener);

      expect(manager.getConfig()).toEqual(createProjectConfig(datafile));
      await manager.onRunning();
      expect(manager.getConfig()).toEqual(createProjectConfig(datafile));
      expect(listener).toHaveBeenNthCalledWith(1, createProjectConfig(datafile));

      datafileManager.pushUpdate(cloneDeep(datafile));
      await Promise.resolve();

      expect(manager.getConfig()).toEqual(createProjectConfig(datafile));
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should remove onUpdate handlers when the returned fuction is called', async () => {
      const datafile = testData.getTestProjectConfig();
      const datafileManager = getMockDatafileManager({});

      const manager = new ProjectConfigManagerImpl({ datafile });
      manager.start();

      const listener = vi.fn();
      const dispose = manager.onUpdate(listener);

      await manager.onRunning();
      expect(listener).toHaveBeenNthCalledWith(1, createProjectConfig(datafile));

      dispose();

      datafileManager.pushUpdate(cloneDeep(testData.getTestProjectConfigWithFeatures()));
      await Promise.resolve();
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should work with datafile specified as string', async () => {
      const datafile = testData.getTestProjectConfig();
      const datafileManager = getMockDatafileManager({});

      const manager = new ProjectConfigManagerImpl({ datafile: JSON.stringify(datafile) });
      manager.start();

      const listener = vi.fn();
      manager.onUpdate(listener);

      await manager.onRunning();
      expect(listener).toHaveBeenCalledWith(createProjectConfig(datafile));
      expect(manager.getConfig()).toEqual(createProjectConfig(datafile));
    });

    describe('stop()', () => {
      it('should reject onRunning() if stop is called when the datafileManager state is New', async () => {
        const datafileManager = getMockDatafileManager({});
        const manager = new ProjectConfigManagerImpl({ datafileManager });

        expect(manager.getState()).toBe(ServiceState.New);
        manager.stop();
        await expect(manager.onRunning()).rejects.toThrow();
      });

      it('should reject onRunning() if stop is called when the datafileManager state is Starting', async () => {
        const datafileManager = getMockDatafileManager({});
        const manager = new ProjectConfigManagerImpl({ datafileManager });

        manager.start();
        expect(manager.getState()).toBe(ServiceState.Starting);
        manager.stop();
        await expect(manager.onRunning()).rejects.toThrow();
      });

      it('should call datafileManager.stop()', async () => {
        const datafileManager = getMockDatafileManager({});
        const spy = vi.spyOn(datafileManager, 'stop');
        const manager = new ProjectConfigManagerImpl({ datafileManager });
        manager.start();
        manager.stop();
        expect(spy).toHaveBeenCalled();
      });

      it('should set status to Terminated immediately if no datafile manager is provided and resolve onTerminated', async () => {
        const manager = new ProjectConfigManagerImpl({ datafile: testData.getTestProjectConfig() });
        manager.stop();
        expect(manager.getState()).toBe(ServiceState.Terminated);
        await expect(manager.onTerminated()).resolves.not.toThrow();
      });

      it('should set status to Stopping while awaiting for datafileManager onTerminated', async () => {
        const datafileManagerTerminated = resolvablePromise<void>();
        const datafileManager = getMockDatafileManager({ onRunning: Promise.resolve(), onTerminated: datafileManagerTerminated.promise });
        const manager = new ProjectConfigManagerImpl({ datafileManager });
        manager.start();
        datafileManager.pushUpdate(testData.getTestProjectConfig());
        await manager.onRunning();
        manager.stop();

        for (let i = 0; i < 100; i++) {
          expect(manager.getState()).toBe(ServiceState.Stopping);
          await wait(0);
        }
      });

      it('should set status to Terminated and resolve onTerminated after datafileManager.onTerminated() resolves', async () => {
        const datafileManagerTerminated = resolvablePromise<void>();
        const datafileManager = getMockDatafileManager({ onRunning: Promise.resolve(), onTerminated: datafileManagerTerminated.promise });
        const manager = new ProjectConfigManagerImpl({ datafileManager });
        manager.start();
        datafileManager.pushUpdate(testData.getTestProjectConfig());
        await manager.onRunning();
        manager.stop();

        for (let i = 0; i < 50; i++) {
          expect(manager.getState()).toBe(ServiceState.Stopping);
          await wait(0);
        }

        datafileManagerTerminated.resolve();
        await expect(manager.onTerminated()).resolves.not.toThrow();
        expect(manager.getState()).toBe(ServiceState.Terminated);
      });

      it('should set status to Failed and reject onTerminated after datafileManager.onTerminated() rejects', async () => {
        const datafileManagerTerminated = resolvablePromise<void>();
        const datafileManager = getMockDatafileManager({ onRunning: Promise.resolve(), onTerminated: datafileManagerTerminated.promise });
        const manager = new ProjectConfigManagerImpl({ datafileManager });
        manager.start();
        datafileManager.pushUpdate(testData.getTestProjectConfig());
        await manager.onRunning();
        manager.stop();

        for (let i = 0; i < 50; i++) {
          expect(manager.getState()).toBe(ServiceState.Stopping);
          await wait(0);
        }

        datafileManagerTerminated.reject();
        await expect(manager.onTerminated()).rejects.toThrow();
        expect(manager.getState()).toBe(ServiceState.Failed);
      });

      it('should not call onUpdate handlers after stop is called', async () => {
        const datafileManagerTerminated = resolvablePromise<void>();
        const datafileManager = getMockDatafileManager({ onRunning: Promise.resolve(), onTerminated: datafileManagerTerminated.promise });
        const manager = new ProjectConfigManagerImpl({ datafileManager });
        manager.start();
        const listener = vi.fn();
        manager.onUpdate(listener);

        datafileManager.pushUpdate(testData.getTestProjectConfig());
        await manager.onRunning();

        expect(listener).toHaveBeenCalledTimes(1);
        manager.stop();
        datafileManager.pushUpdate(testData.getTestProjectConfigWithFeatures());

        datafileManagerTerminated.resolve();
        await expect(manager.onTerminated()).resolves.not.toThrow();

        expect(listener).toHaveBeenCalledTimes(1);
      });
    });
  });
  
// it('should call the error handler and fulfill onReady with an unsuccessful result if the datafile JSON is malformed', function() {
//   const invalidDatafileJSON = 'abc';
//   const manager = projectConfigManager.createProjectConfigManager({
//     datafile: invalidDatafileJSON,      
//   });
//   sinon.assert.calledOnce(globalStubErrorHandler.handleError);
//   const errorMessage = globalStubErrorHandler.handleError.lastCall.args[0].message;
//   assert.strictEqual(errorMessage, sprintf(ERROR_MESSAGES.INVALID_DATAFILE_MALFORMED, 'CONFIG_VALIDATOR'));
//   return manager.onReady().then(function(result) {
//     assert.include(result, {
//       success: false,
//     });
//   });
// });

// it('should call the error handler and fulfill onReady with an unsuccessful result if the datafile is not valid', function() {
//   const invalidDatafile = testData.getTestProjectConfig();
//   delete invalidDatafile['projectId'];
//   const manager = projectConfigManager.createProjectConfigManager({
//     datafile: invalidDatafile,
//     jsonSchemaValidator: jsonSchemaValidator,      
//   });
//   sinon.assert.calledOnce(globalStubErrorHandler.handleError);
//   const errorMessage = globalStubErrorHandler.handleError.lastCall.args[0].message;
//   assert.strictEqual(
//     errorMessage,
//     sprintf(ERROR_MESSAGES.INVALID_DATAFILE, 'JSON_SCHEMA_VALIDATOR (Project Config JSON Schema)', 'projectId', 'is missing and it is required'),
//   );
//   return manager.onReady().then(function(result) {
//     assert.include(result, {
//       success: false,
//     });
//   });
// });

// it('should call the error handler and fulfill onReady with an unsuccessful result if the datafile version is not supported', function() {
//   const manager = projectConfigManager.createProjectConfigManager({
//     datafile: testData.getUnsupportedVersionConfig(),
//     jsonSchemaValidator: jsonSchemaValidator,      
//   });
//   sinon.assert.calledOnce(globalStubErrorHandler.handleError);
//   const errorMessage = globalStubErrorHandler.handleError.lastCall.args[0].message;
//   assert.strictEqual(errorMessage, sprintf(ERROR_MESSAGES.INVALID_DATAFILE_VERSION, 'CONFIG_VALIDATOR', '5'));
//   return manager.onReady().then(function(result) {
//     assert.include(result, {
//       success: false,
//     });
//   });
// });


// describe('with a datafile manager', function() {
//   it('passes the correct options to datafile manager', function() {
//     const config = testData.getTestProjectConfig()
//     let datafileOptions = {
//       autoUpdate: true,
//       updateInterval: 10000,
//     }
//     projectConfigManager.createProjectConfigManager({
//       datafile: config,
//       sdkKey: '12345',
//       datafileManager: createHttpPollingDatafileManager('12345', logger, config, datafileOptions),
//     });
//     sinon.assert.calledOnce(datafileManager.HttpPollingDatafileManager);
//     sinon.assert.calledWithExactly(
//       datafileManager.HttpPollingDatafileManager,
//       sinon.match({
//         datafile: JSON.stringify(config),
//         sdkKey: '12345',
//         autoUpdate: true,
//         updateInterval: 10000,
//       })
//     );
//   });

//   describe('when constructed with sdkKey and without datafile', function() {
//     it('updates itself when the datafile manager is ready, fulfills its onReady promise with a successful result, and then emits updates', function() {
//       const configWithFeatures = testData.getTestProjectConfigWithFeatures();
//       datafileManager.HttpPollingDatafileManager.returns({
//         start: sinon.stub(),
//         stop: sinon.stub(),
//         get: sinon.stub().returns(JSON.stringify(cloneDeep(configWithFeatures))),
//         on: sinon.stub().returns(function() {}),
//         onReady: sinon.stub().returns(Promise.resolve()),
//       });
//       const manager = projectConfigManager.createProjectConfigManager({
//         sdkKey: '12345',
//         datafileManager: createHttpPollingDatafileManager('12345', logger),
//       });
//       assert.isNull(manager.getConfig());
//       return manager.onReady().then(function(result) {
//         assert.include(result, {
//           success: true,
//         });
//         assert.deepEqual(manager.getConfig(), projectConfig.createProjectConfig(configWithFeatures));

//         const nextDatafile = testData.getTestProjectConfigWithFeatures();
//         nextDatafile.experiments.push({
//           key: 'anotherTestExp',
//           status: 'Running',
//           forcedconstiations: {},
//           audienceIds: [],
//           layerId: '253442',
//           trafficAllocation: [{ entityId: '99977477477747747', endOfRange: 10000 }],
//           id: '1237847778',
//           constiations: [{ key: 'constiation', id: '99977477477747747' }],
//         });
//         nextDatafile.revision = '36';
//         const fakeDatafileManager = datafileManager.HttpPollingDatafileManager.getCall(0).returnValue;
//         fakeDatafileManager.get.returns(cloneDeep(nextDatafile));
//         const updateListener = fakeDatafileManager.on.getCall(0).args[1];
//         updateListener({ datafile: nextDatafile });
//         assert.deepEqual(manager.getConfig(), projectConfig.createProjectConfig(nextDatafile));
//       });
//     });

//     it('calls onUpdate listeners after becoming ready, and after the datafile manager emits updates', async function() {
//       datafileManager.HttpPollingDatafileManager.returns({
//         start: sinon.stub(),
//         stop: sinon.stub(),
//         get: sinon.stub().returns(JSON.stringify(testData.getTestProjectConfigWithFeatures())),
//         on: sinon.stub().returns(function() {}),
//         onReady: sinon.stub().returns(Promise.resolve()),
//       });
//       const manager = projectConfigManager.createProjectConfigManager({
//         sdkKey: '12345',
//         datafileManager: createHttpPollingDatafileManager('12345', logger),
//       });
//       const onUpdateSpy = sinon.spy();
//       manager.onUpdate(onUpdateSpy);
//       await manager.onReady();
//       sinon.assert.calledOnce(onUpdateSpy);
//       const fakeDatafileManager = datafileManager.HttpPollingDatafileManager.getCall(0).returnValue;
//       const updateListener = fakeDatafileManager.on.getCall(0).args[1];
//       const newDatafile = testData.getTestProjectConfigWithFeatures();
//       newDatafile.revision = '36';
//       fakeDatafileManager.get.returns(newDatafile);
//       updateListener({ datafile: newDatafile });
      
//       await Promise.resolve();
//       sinon.assert.calledTwice(onUpdateSpy);
//     });

//     it('can remove onUpdate listeners using the function returned from onUpdate', async function() {
//       datafileManager.HttpPollingDatafileManager.returns({
//         start: sinon.stub(),
//         stop: sinon.stub(),
//         get: sinon.stub().returns(JSON.stringify(testData.getTestProjectConfigWithFeatures())),
//         on: sinon.stub().returns(function() {}),
//         onReady: sinon.stub().returns(Promise.resolve()),
//       });
//       const manager = projectConfigManager.createProjectConfigManager({
//         sdkKey: '12345',
//         datafileManager: createHttpPollingDatafileManager('12345', logger),
//       });
//       await manager.onReady();
//       const onUpdateSpy = sinon.spy();
//       const unsubscribe = manager.onUpdate(onUpdateSpy);
//       const fakeDatafileManager = datafileManager.HttpPollingDatafileManager.getCall(0).returnValue;
//       const updateListener = fakeDatafileManager.on.getCall(0).args[1];

//       const newDatafile = testData.getTestProjectConfigWithFeatures();
//       newDatafile.revision = '36';
//       fakeDatafileManager.get.returns(newDatafile);

//       updateListener({ datafile: newDatafile });
//       // allow queued micortasks to run
//       await Promise.resolve();
      
//       sinon.assert.calledOnce(onUpdateSpy);
//       unsubscribe();
//       newDatafile = testData.getTestProjectConfigWithFeatures();
//       newDatafile.revision = '37';
//       fakeDatafileManager.get.returns(newDatafile);
//       updateListener({ datafile: newDatafile });
//       // // Should not call onUpdateSpy again since we unsubscribed
//       updateListener({ datafile: testData.getTestProjectConfigWithFeatures() });
//       sinon.assert.calledOnce(onUpdateSpy);
//     });

//     it('fulfills its ready promise with an unsuccessful result when the datafile manager emits an invalid datafile', function() {
//       const invalidDatafile = testData.getTestProjectConfig();
//       delete invalidDatafile['projectId'];
//       datafileManager.HttpPollingDatafileManager.returns({
//         start: sinon.stub(),
//         stop: sinon.stub(),
//         get: sinon.stub().returns(JSON.stringify(invalidDatafile)),
//         on: sinon.stub().returns(function() {}),
//         onReady: sinon.stub().returns(Promise.resolve()),
//       });
//       const manager = projectConfigManager.createProjectConfigManager({
//         jsonSchemaValidator: jsonSchemaValidator,
//         sdkKey: '12345',
//         datafileManager: createHttpPollingDatafileManager('12345', logger),
//       });
//       return manager.onReady().then(function(result) {
//         assert.include(result, {
//           success: false,
//         });
//       });
//     });

//     it('fullfils its ready promise with an unsuccessful result when the datafile manager onReady promise rejects', function() {
//       datafileManager.HttpPollingDatafileManager.returns({
//         start: sinon.stub(),
//         stop: sinon.stub(),
//         get: sinon.stub().returns(null),
//         on: sinon.stub().returns(function() {}),
//         onReady: sinon.stub().returns(Promise.reject(new Error('Failed to become ready'))),
//       });
//       const manager = projectConfigManager.createProjectConfigManager({
//         jsonSchemaValidator: jsonSchemaValidator,
//         sdkKey: '12345',
//         datafileManager: createHttpPollingDatafileManager('12345', logger),
//       });
//       return manager.onReady().then(function(result) {
//         assert.include(result, {
//           success: false,
//         });
//       });
//     });

//     it('calls stop on its datafile manager when its stop method is called', function() {
//       const manager = projectConfigManager.createProjectConfigManager({
//         sdkKey: '12345',
//         datafileManager: createHttpPollingDatafileManager('12345', logger),
//       });
//       manager.stop();
//       sinon.assert.calledOnce(datafileManager.HttpPollingDatafileManager.getCall(0).returnValue.stop);
//     });

//     it('does not log an error message', function() {
//       projectConfigManager.createProjectConfigManager({
//         sdkKey: '12345',
//         datafileManager: createHttpPollingDatafileManager('12345', logger),
//       });
//       sinon.assert.notCalled(stubLogHandler.log);
//     });
//   });

//   describe('when constructed with sdkKey and with a valid datafile object', function() {
//     it('fulfills its onReady promise with a successful result, and does not call onUpdate listeners if datafile does not change', async function() {
//       const configWithFeatures = testData.getTestProjectConfigWithFeatures();

//       const handlers = [];
//       const mockDatafileManager = {
//         start: () => {},
//         get: () => JSON.stringify(configWithFeatures),
//         on: (event, fn) => handlers.push(fn),
//         onReady: () => Promise.resolve(),
//         pushUpdate: (datafile) => handlers.forEach(handler => handler({ datafile })),
//       };

//       const manager = projectConfigManager.createProjectConfigManager({
//         datafile: configWithFeatures,
//         sdkKey: '12345',
//         datafileManager: mockDatafileManager,
//       });
//       const onUpdateSpy = sinon.spy();
//       manager.onUpdate(onUpdateSpy);

//       const result = await manager.onReady();
//       assert.include(result, {
//         success: true,
//       });

//       mockDatafileManager.pushUpdate(JSON.stringify(configWithFeatures));
//       // allow queued microtasks to run
//       await Promise.resolve();

//       mockDatafileManager.pushUpdate(JSON.stringify(configWithFeatures));
//       await Promise.resolve();

//       mockDatafileManager.pushUpdate(JSON.stringify(configWithFeatures));
//       await Promise.resolve();


//       configWithFeatures.revision = '99';
//       mockDatafileManager.pushUpdate(JSON.stringify(configWithFeatures));
//       await Promise.resolve();

//       sinon.assert.callCount(onUpdateSpy, 2);
//     });
//   });

//   describe('when constructed with sdkKey and with a valid datafile string', function() {
//     it('fulfills its onReady promise with a successful result, and does not call onUpdate listeners if datafile does not change', async function() {
//       const configWithFeatures = testData.getTestProjectConfigWithFeatures();

//       const handlers = [];
//       const mockDatafileManager = {
//         start: () => {},
//         get: () => JSON.stringify(configWithFeatures),
//         on: (event, fn) => handlers.push(fn),
//         onReady: () => Promise.resolve(),
//         pushUpdate: (datafile) => handlers.forEach(handler => handler({ datafile })),
//       };

//       const manager = projectConfigManager.createProjectConfigManager({
//         datafile: JSON.stringify(configWithFeatures),
//         sdkKey: '12345',
//         datafileManager: mockDatafileManager,
//       });
//       const onUpdateSpy = sinon.spy();
//       manager.onUpdate(onUpdateSpy);

//       const result = await manager.onReady();
//       assert.include(result, {
//         success: true,
//       });

//       mockDatafileManager.pushUpdate(JSON.stringify(configWithFeatures));
//       // allow queued microtasks to run
//       await Promise.resolve();

//       mockDatafileManager.pushUpdate(JSON.stringify(configWithFeatures));
//       await Promise.resolve();

//       mockDatafileManager.pushUpdate(JSON.stringify(configWithFeatures));
//       await Promise.resolve();


//       configWithFeatures.revision = '99';
//       mockDatafileManager.pushUpdate(JSON.stringify(configWithFeatures));
//       await Promise.resolve();

//       sinon.assert.callCount(onUpdateSpy, 2);
//     });
//   });

//   describe('test caching of optimizely config', function() {
//     beforeEach(function() {
//       sinon.stub(optimizelyConfig, 'createOptimizelyConfig');
//     });

//     afterEach(function() {
//       optimizelyConfig.createOptimizelyConfig.restore();
//     });

//     it('should return the same config until revision is changed', function() {
//       const manager = projectConfigManager.createProjectConfigManager({
//         datafile: testData.getTestProjectConfig(),
//         sdkKey: '12345',
//         datafileManager: createHttpPollingDatafileManager('12345', logger, testData.getTestProjectConfig()),
//       });
//       // validate it should return the existing optimizely config
//       manager.getOptimizelyConfig();
//       sinon.assert.calledOnce(optimizelyConfig.createOptimizelyConfig);
//       // create config with new revision
//       const fakeDatafileManager = datafileManager.HttpPollingDatafileManager.getCall(0).returnValue;
//       const updateListener = fakeDatafileManager.on.getCall(0).args[1];
//       const newDatafile = testData.getTestProjectConfigWithFeatures();
//       newDatafile.revision = '36';
//       fakeDatafileManager.get.returns(newDatafile);
//       updateListener({ datafile: newDatafile });
//       manager.getOptimizelyConfig();        
//       // verify the optimizely config is updated
//       sinon.assert.calledTwice(optimizelyConfig.createOptimizelyConfig);
//     });
//   });
// });
});