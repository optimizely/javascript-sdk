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
import { getMockLogger } from '../tests/mock/mock_logger';
import { ServiceState } from '../service';
import * as testData from '../tests/test_data';
import { createProjectConfig } from './project_config';
import { resolvablePromise } from '../utils/promise/resolvablePromise';
import { getMockDatafileManager } from '../tests/mock/mock_datafile_manager';
import { wait } from '../tests/testUtils';

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
          const onRunning = Promise.reject(new Error("onRunning error"));
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

      it('should reject onRunning() and onTerminated if datafileManager emits an invalid datafile in the first onUpdate', async () => {
        const datafileManager = getMockDatafileManager({ onRunning: Promise.resolve() });
        const manager = new ProjectConfigManagerImpl({ datafileManager });
        manager.start();
        datafileManager.pushUpdate('foo');
        await expect(manager.onRunning()).rejects.toThrow();
        await expect(manager.onTerminated()).rejects.toThrow();
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

      const manager = new ProjectConfigManagerImpl({ datafile: JSON.stringify(datafile) });
      manager.start();

      const listener = vi.fn();
      manager.onUpdate(listener);

      await manager.onRunning();
      expect(listener).toHaveBeenCalledWith(createProjectConfig(datafile));
      expect(manager.getConfig()).toEqual(createProjectConfig(datafile));
    });

    it('should reject onRunning() and log error if the datafile string is an invalid json', async () => {
      const logger = getMockLogger();
      const manager = new ProjectConfigManagerImpl({ logger, datafile: 'foo'});
      manager.start();
      await expect(manager.onRunning()).rejects.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });

    it('should reject onRunning() and log error if the datafile version is not supported', async () => {
      const logger = getMockLogger();
      const datafile = testData.getUnsupportedVersionConfig();
      const manager = new ProjectConfigManagerImpl({ logger, datafile });
      manager.start();

      await expect(manager.onRunning()).rejects.toThrow();
      expect(logger.error).toHaveBeenCalled();
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

      it('should make datafileManager disposable if makeDisposable() is called', async () => {
        const datafileManager = getMockDatafileManager({});
        vi.spyOn(datafileManager, 'makeDisposable');
        const manager = new ProjectConfigManagerImpl({ datafileManager });
        manager.makeDisposable();

        expect(datafileManager.makeDisposable).toHaveBeenCalled();
      })
    });
  });
});
