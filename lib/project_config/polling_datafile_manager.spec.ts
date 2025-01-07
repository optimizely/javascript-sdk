/**
 * Copyright 2024, Optimizely
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

import { PollingDatafileManager} from './polling_datafile_manager';
import { getMockRepeater } from '../tests/mock/mock_repeater';
import { getMockAbortableRequest, getMockRequestHandler } from '../tests/mock/mock_request_handler';
import { getMockLogger } from '../tests/mock/mock_logger';
import { DEFAULT_AUTHENTICATED_URL_TEMPLATE, DEFAULT_URL_TEMPLATE, MIN_UPDATE_INTERVAL, UPDATE_INTERVAL_BELOW_MINIMUM_MESSAGE } from './constant';
import { resolvablePromise } from '../utils/promise/resolvablePromise';
import { ServiceState, StartupLog } from '../service';
import { getMockSyncCache, getMockAsyncCache } from '../tests/mock/mock_cache';
import { LogLevel } from '../modules/logging';

describe('PollingDatafileManager', () => {
  it('should log polling interval below MIN_UPDATE_INTERVAL', () => {
    const repeater = getMockRepeater();
    const requestHandler = getMockRequestHandler();
    const logger = getMockLogger();

    const startupLogs: StartupLog[] = [
      {
        level: LogLevel.WARNING,
        message: 'warn message',
        params: [1, 2]
      },
      {
        level: LogLevel.ERROR,
        message: 'error message',
        params: [3, 4]
      },
    ];
      
    const manager = new PollingDatafileManager({
      repeater,
      requestHandler,
      sdkKey: '123',
      logger,
      startupLogs,
    });
    
    manager.start();
    expect(logger.log).toHaveBeenNthCalledWith(1, LogLevel.WARNING, 'warn message', 1, 2);
    expect(logger.log).toHaveBeenNthCalledWith(2, LogLevel.ERROR, 'error message', 3, 4);
  });

    
  it('starts the repeater with immediateExecution on start', () => {
    const repeater = getMockRepeater();
    const requestHandler = getMockRequestHandler();
    const manager = new PollingDatafileManager({
      repeater,
      requestHandler,
      sdkKey: '123',
    });
    manager.start();
    expect(repeater.start).toHaveBeenCalledWith(true);
  });
 
  describe('when cached datafile is available', () => {
    it('uses cached version of datafile, resolves onRunning() and calls onUpdate handlers while datafile fetch request waits', async () => {
      const repeater = getMockRepeater();
      const requestHandler = getMockRequestHandler(); // response promise is pending
      const cache = getMockAsyncCache<string>();
      await cache.set('opt-datafile-keyThatExists', JSON.stringify({ name: 'keyThatExists' }));

      const manager = new PollingDatafileManager({
        repeater,
        requestHandler,
        sdkKey: 'keyThatExists',
        cache,
      });

      manager.start();
      repeater.execute(0);
      const listener = vi.fn();

      manager.onUpdate(listener);
      await expect(manager.onRunning()).resolves.toBeUndefined();
      expect(listener).toHaveBeenCalledWith(JSON.stringify({ name: 'keyThatExists' }));
    });

    it('uses cached version of datafile, resolves onRunning() and calls onUpdate handlers even if fetch request fails', async () => {
      const repeater = getMockRepeater();
      const requestHandler = getMockRequestHandler();
      const mockResponse = getMockAbortableRequest(Promise.reject('test error'));
      requestHandler.makeRequest.mockReturnValueOnce(mockResponse);

      const cache = getMockAsyncCache<string>();
      await cache.set('opt-datafile-keyThatExists', JSON.stringify({ name: 'keyThatExists' }));

      const manager = new PollingDatafileManager({
        repeater,
        requestHandler,
        sdkKey: 'keyThatExists',
        cache,
      });

      manager.start();
      repeater.execute(0);
      
      const listener = vi.fn();

      manager.onUpdate(listener);
      await expect(manager.onRunning()).resolves.toBeUndefined();
      expect(requestHandler.makeRequest).toHaveBeenCalledOnce();
      expect(listener).toHaveBeenCalledWith(JSON.stringify({ name: 'keyThatExists' }));
    });

    it('uses cached version of datafile, then calls onUpdate when fetch request succeeds after the cache read', async () => {
      const repeater = getMockRepeater();
      const requestHandler = getMockRequestHandler();
      const cache = getMockAsyncCache<string>();
      await cache.set('opt-datafile-keyThatExists', JSON.stringify({ name: 'keyThatExists' }));
      const mockResponse = getMockAbortableRequest();
      requestHandler.makeRequest.mockReturnValueOnce(mockResponse);
      
      
      const manager = new PollingDatafileManager({
        repeater,
        requestHandler,
        sdkKey: 'keyThatExists',
        cache,
      });

      manager.start();
      repeater.execute(0);
      
      const listener = vi.fn();

      manager.onUpdate(listener);
      await expect(manager.onRunning()).resolves.toBeUndefined();
      expect(requestHandler.makeRequest).toHaveBeenCalledOnce();
      expect(listener).toHaveBeenNthCalledWith(1, JSON.stringify({ name: 'keyThatExists' }));

      mockResponse.mockResponse.resolve({ statusCode: 200, body: '{"foo": "bar"}', headers: {} });
      await mockResponse.mockResponse;
      expect(listener).toHaveBeenNthCalledWith(2, '{"foo": "bar"}');
    });

    it('ignores cached datafile if fetch request succeeds before cache read completes', async () => {
      const repeater = getMockRepeater();
      const requestHandler = getMockRequestHandler();
      const mockResponse = getMockAbortableRequest(Promise.resolve({ statusCode: 200, body: '{"foo": "bar"}', headers: {} }));
      requestHandler.makeRequest.mockReturnValueOnce(mockResponse);
      
      const cache = getMockAsyncCache<string>();
      // this will be resolved after the requestHandler response is resolved
      const cachePromise = resolvablePromise<string | undefined>();
      const getSpy = vi.spyOn(cache, 'get');
      getSpy.mockReturnValueOnce(cachePromise.promise);

      const manager = new PollingDatafileManager({
        repeater,
        requestHandler,
        sdkKey: 'keyThatExists',
        cache,
      });

      manager.start();
      repeater.execute(0);
      
      const listener = vi.fn();

      manager.onUpdate(listener);
      await expect(manager.onRunning()).resolves.toBeUndefined();
      expect(requestHandler.makeRequest).toHaveBeenCalledOnce();
      expect(listener).toHaveBeenCalledWith('{"foo": "bar"}');

      cachePromise.resolve(JSON.stringify({ name: 'keyThatExists '}));
      await cachePromise.promise;
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).not.toHaveBeenCalledWith(JSON.stringify({ name: 'keyThatExists' }));
    });
  });

  it('returns a failing promise to repeater if requestHandler.makeRequest return non-success status code', async () => {
    const repeater = getMockRepeater();
    const requestHandler = getMockRequestHandler();
    const mockResponse = getMockAbortableRequest(Promise.resolve({ statusCode: 500, body: '', headers: {} }));
    requestHandler.makeRequest.mockReturnValueOnce(mockResponse);
    
    const manager = new PollingDatafileManager({
      repeater,
      requestHandler,
      sdkKey: 'keyThatExists',
    });

    manager.start();
    const ret = repeater.execute(0);
    await expect(ret).rejects.toThrow();
  });

  it('returns a failing promise to repeater if requestHandler.makeRequest promise fails', async () => {
    const repeater = getMockRepeater();
    const requestHandler = getMockRequestHandler();
    const mockResponse = getMockAbortableRequest(Promise.reject('test error'));
    requestHandler.makeRequest.mockReturnValueOnce(mockResponse);
    
    const manager = new PollingDatafileManager({
      repeater,
      requestHandler,
      sdkKey: 'keyThatExists',
    });

    manager.start();
    const ret = repeater.execute(0);
    await expect(ret).rejects.toThrow();
  });

  it('returns a promise that resolves to repeater if requestHandler.makeRequest succeedes', async () => {
    const repeater = getMockRepeater();
    const requestHandler = getMockRequestHandler();
    const mockResponse = getMockAbortableRequest(Promise.resolve({ statusCode: 200, body: '{"foo": "bar"}', headers: {} }));
    requestHandler.makeRequest.mockReturnValueOnce(mockResponse);
    
    const manager = new PollingDatafileManager({
      repeater,
      requestHandler,
      sdkKey: 'keyThatExists',
    });

    manager.start();
    const ret = repeater.execute(0);
    await expect(ret).resolves.not.toThrow();
  });

  describe('start', () => {
    it('retries specified number of times before rejecting onRunning() and onTerminated() when autoupdate is true', async () => {
      const repeater = getMockRepeater();
      const requestHandler = getMockRequestHandler();
      const mockResponse = getMockAbortableRequest(Promise.reject('test error'));
      requestHandler.makeRequest.mockReturnValue(mockResponse);
      
      const manager = new PollingDatafileManager({
        repeater,
        requestHandler,
        sdkKey: 'keyThatExists',
        initRetry: 5,
        autoUpdate: true,
      });

      manager.start();

      for(let i = 0; i < 6; i++) {
        const ret = repeater.execute(0);
        await expect(ret).rejects.toThrow();
      }

      expect(requestHandler.makeRequest).toHaveBeenCalledTimes(6);
      await expect(manager.onRunning()).rejects.toThrow();
      await expect(manager.onTerminated()).rejects.toThrow();
    });

    it('retries specified number of times before rejecting onRunning() and onTerminated() when autoupdate is false', async () => {
      const repeater = getMockRepeater();
      const requestHandler = getMockRequestHandler();
      const mockResponse = getMockAbortableRequest(Promise.reject('test error'));
      requestHandler.makeRequest.mockReturnValue(mockResponse);
      
      const manager = new PollingDatafileManager({
        repeater,
        requestHandler,
        sdkKey: 'keyThatExists',
        initRetry: 5,
        autoUpdate: false,
      });

      manager.start();

      for(let i = 0; i < 6; i++) {
        const ret = repeater.execute(0);
        await expect(ret).rejects.toThrow();
      }

      expect(requestHandler.makeRequest).toHaveBeenCalledTimes(6);
      await expect(manager.onRunning()).rejects.toThrow();
      await expect(manager.onTerminated()).rejects.toThrow();
    });

    it('stops the repeater when initalization fails', async () => {
      const repeater = getMockRepeater();
      const requestHandler = getMockRequestHandler();
      const mockResponse = getMockAbortableRequest(Promise.reject('test error'));
      requestHandler.makeRequest.mockReturnValue(mockResponse);
      
      const manager = new PollingDatafileManager({
        repeater,
        requestHandler,
        sdkKey: 'keyThatExists',
        initRetry: 0,
        autoUpdate: false,
      });

      manager.start();
      repeater.execute(0);

      expect(requestHandler.makeRequest).toHaveBeenCalledTimes(1);
      await expect(manager.onRunning()).rejects.toThrow();
      await expect(manager.onTerminated()).rejects.toThrow();
      expect(repeater.stop).toHaveBeenCalled();
    });

    it('retries specified number of times before rejecting onRunning() and onTerminated() when provided cache does not contain datafile', async () => {
      const repeater = getMockRepeater();
      const requestHandler = getMockRequestHandler();
      const mockResponse = getMockAbortableRequest(Promise.reject('test error'));
      requestHandler.makeRequest.mockReturnValue(mockResponse);
      
      const manager = new PollingDatafileManager({
        repeater,
        requestHandler,
        sdkKey: 'keyThatDoesNotExists',
        initRetry: 5,
        cache: getMockAsyncCache(),
      });

      manager.start();

      for(let i = 0; i < 6; i++) {
        const ret = repeater.execute(0);
        await expect(ret).rejects.toThrow();
      }

      expect(requestHandler.makeRequest).toHaveBeenCalledTimes(6);
      await expect(manager.onRunning()).rejects.toThrow();
      await expect(manager.onTerminated()).rejects.toThrow();
    });

    it('retries init indefinitely if initRetry is not provided when autoupdate is true', async () => {
      const repeater = getMockRepeater();
      const requestHandler = getMockRequestHandler();
      const mockResponse = getMockAbortableRequest(Promise.reject('test error'));
      requestHandler.makeRequest.mockReturnValueOnce(mockResponse);
      
      const manager = new PollingDatafileManager({
        repeater,
        requestHandler,
        sdkKey: 'keyThatExists',
      });

      const promiseCallback = vi.fn();
      manager.onRunning().finally(promiseCallback);

      manager.start();
      const testTry = 10_000;

      for(let i = 0; i < testTry; i++) {
        const ret = repeater.execute(0);
        await expect(ret).rejects.toThrow();
      }

      expect(requestHandler.makeRequest).toHaveBeenCalledTimes(testTry);
      expect(promiseCallback).not.toHaveBeenCalled();
    });

    it('retries init indefinitely if initRetry is not provided when autoupdate is false', async () => {
      const repeater = getMockRepeater();
      const requestHandler = getMockRequestHandler();
      const mockResponse = getMockAbortableRequest(Promise.reject('test error'));
      requestHandler.makeRequest.mockReturnValueOnce(mockResponse);
      
      const manager = new PollingDatafileManager({
        repeater,
        requestHandler,
        sdkKey: 'keyThatExists',
        autoUpdate: false,
      });

      const promiseCallback = vi.fn();
      manager.onRunning().finally(promiseCallback);

      manager.start();
      const testTry = 10_000;

      for(let i = 0; i < testTry; i++) {
        const ret = repeater.execute(0);
        await expect(ret).rejects.toThrow();
      }

      expect(requestHandler.makeRequest).toHaveBeenCalledTimes(testTry);
      expect(promiseCallback).not.toHaveBeenCalled();
    });

    it('successfully resolves onRunning() and calls onUpdate handlers when fetch request succeeds', async () => {
      const repeater = getMockRepeater();
      const requestHandler = getMockRequestHandler();
      const mockResponse = getMockAbortableRequest(Promise.resolve({ statusCode: 200, body: '{"foo": "bar"}', headers: {} }));
      requestHandler.makeRequest.mockReturnValueOnce(mockResponse);
      
      const manager = new PollingDatafileManager({
        repeater,
        requestHandler,
        sdkKey: 'keyThatExists',
      });

      const listener = vi.fn();

      manager.onUpdate(listener);

      manager.start();
      repeater.execute(0);
      await expect(manager.onRunning()).resolves.not.toThrow();
      expect(requestHandler.makeRequest).toHaveBeenCalledOnce();
      expect(listener).toHaveBeenCalledWith('{"foo": "bar"}');
    });

    it('successfully resolves onRunning() and calls onUpdate handlers when fetch request succeeds after retries', async () => {
      const repeater = getMockRepeater();
      const requestHandler = getMockRequestHandler();
      const mockFailure = getMockAbortableRequest(Promise.reject('test error'));
      const mockSuccess = getMockAbortableRequest(Promise.resolve({ statusCode: 200, body: '{"foo": "bar"}', headers: {} }));
      requestHandler.makeRequest.mockReturnValueOnce(mockFailure)
        .mockReturnValueOnce(mockFailure).mockReturnValueOnce(mockSuccess);
      
      const manager = new PollingDatafileManager({
        repeater,
        requestHandler,
        sdkKey: 'keyThatExists',
        initRetry: 5,
      });

      const listener = vi.fn();

      manager.onUpdate(listener);

      manager.start();
      for(let i = 0; i < 2; i++) {
        const ret = repeater.execute(0);
        expect(ret).rejects.toThrow();
      }

      repeater.execute(0);

      await expect(manager.onRunning()).resolves.not.toThrow();
      expect(requestHandler.makeRequest).toHaveBeenCalledTimes(3);
      expect(listener).toHaveBeenCalledWith('{"foo": "bar"}');
    });

    it('stops repeater after successful initialization if autoupdate is false', async () => {
      const repeater = getMockRepeater();
      const requestHandler = getMockRequestHandler();
      const mockResponse = getMockAbortableRequest(Promise.resolve({ statusCode: 200, body: '{"foo": "bar"}', headers: {} }));
      requestHandler.makeRequest.mockReturnValueOnce(mockResponse);
      
      const manager = new PollingDatafileManager({
        repeater,
        requestHandler,
        sdkKey: 'keyThatExists',
        autoUpdate: false,
      });

      manager.start();
      repeater.execute(0);

      await expect(manager.onRunning()).resolves.not.toThrow();
      expect(repeater.stop).toHaveBeenCalled();
    });

    it('stops repeater after successful initialization if disposable is true', async () => {
      const repeater = getMockRepeater();
      const requestHandler = getMockRequestHandler();
      const mockResponse = getMockAbortableRequest(Promise.resolve({ statusCode: 200, body: '{"foo": "bar"}', headers: {} }));
      requestHandler.makeRequest.mockReturnValueOnce(mockResponse);
      
      const manager = new PollingDatafileManager({
        repeater,
        requestHandler,
        sdkKey: 'keyThatExists',
      });
      manager.makeDisposable();
      manager.start();
      repeater.execute(0);

      await expect(manager.onRunning()).resolves.not.toThrow();
      expect(repeater.stop).toHaveBeenCalled();
    });

    it('saves the datafile in cache', async () => {
      const repeater = getMockRepeater();
      const requestHandler = getMockRequestHandler();
      const mockResponse = getMockAbortableRequest(Promise.resolve({ statusCode: 200, body: '{"foo": "bar"}', headers: {} }));
      requestHandler.makeRequest.mockReturnValueOnce(mockResponse);
      
      const cache = getMockAsyncCache<string>();
      const spy = vi.spyOn(cache, 'set');

      const manager = new PollingDatafileManager({
        repeater,
        requestHandler,
        sdkKey: 'keyThatDoesNotExists',
        cache,
      });

      manager.start();
      repeater.execute(0);

      await expect(manager.onRunning()).resolves.not.toThrow();
      expect(spy).toHaveBeenCalledWith('opt-datafile-keyThatDoesNotExists', '{"foo": "bar"}');
    });
  });

  describe('autoupdate', () => {
    it('fetches datafile on each tick and calls onUpdate handlers when fetch request succeeds', async () => {
      const repeater = getMockRepeater();
      const requestHandler = getMockRequestHandler();
      const mockResponse1 = getMockAbortableRequest(Promise.resolve({ statusCode: 200, body: '{"foo": "bar"}', headers: {} }));
      const mockResponse2 = getMockAbortableRequest(Promise.resolve({ statusCode: 200, body: '{"foo2": "bar2"}', headers: {} }));
      const mockResponse3 = getMockAbortableRequest(Promise.resolve({ statusCode: 200, body: '{"foo3": "bar3"}', headers: {} }));
     
      requestHandler.makeRequest.mockReturnValueOnce(mockResponse1)
        .mockReturnValueOnce(mockResponse2).mockReturnValueOnce(mockResponse3);

      const manager = new PollingDatafileManager({
        repeater,
        requestHandler,
        sdkKey: 'keyThatExists',
        autoUpdate: true,
      });

      const listener = vi.fn();
      manager.onUpdate(listener);

      manager.start();

      for(let i = 0; i <3; i++) {
        const ret = repeater.execute(0);
        await expect(ret).resolves.not.toThrow();
      }

      await expect(manager.onRunning()).resolves.not.toThrow();
      expect(requestHandler.makeRequest).toHaveBeenCalledTimes(3);
      expect(listener).toHaveBeenNthCalledWith(1, '{"foo": "bar"}');
      expect(listener).toHaveBeenNthCalledWith(2, '{"foo2": "bar2"}');
      expect(listener).toHaveBeenNthCalledWith(3, '{"foo3": "bar3"}');
    });

    it('saves the datafile each time in cache', async () => {
      const repeater = getMockRepeater();
      const requestHandler = getMockRequestHandler();
      const mockResponse1 = getMockAbortableRequest(Promise.resolve({ statusCode: 200, body: '{"foo": "bar"}', headers: {} }));
      const mockResponse2 = getMockAbortableRequest(Promise.resolve({ statusCode: 200, body: '{"foo2": "bar2"}', headers: {} }));
      const mockResponse3 = getMockAbortableRequest(Promise.resolve({ statusCode: 200, body: '{"foo3": "bar3"}', headers: {} }));
     
      requestHandler.makeRequest.mockReturnValueOnce(mockResponse1)
        .mockReturnValueOnce(mockResponse2).mockReturnValueOnce(mockResponse3);

      const cache = getMockAsyncCache<string>();
      const spy = vi.spyOn(cache, 'set');
      
      const manager = new PollingDatafileManager({
        repeater,
        requestHandler,
        sdkKey: 'keyThatDoesNotExists',
        autoUpdate: true,
        cache,
      });

      const listener = vi.fn();
      manager.onUpdate(listener);

      manager.start();

      for(let i = 0; i <3; i++) {
        const ret = repeater.execute(0);
        await expect(ret).resolves.not.toThrow();
      }

      await expect(manager.onRunning()).resolves.not.toThrow();
      expect(spy).toHaveBeenNthCalledWith(1, 'opt-datafile-keyThatDoesNotExists', '{"foo": "bar"}');
      expect(spy).toHaveBeenNthCalledWith(2, 'opt-datafile-keyThatDoesNotExists', '{"foo2": "bar2"}');
      expect(spy).toHaveBeenNthCalledWith(3, 'opt-datafile-keyThatDoesNotExists', '{"foo3": "bar3"}');
    });

    it('logs an error if fetch request fails and does not call onUpdate handler', async () => {
      const logger = getMockLogger();
      const repeater = getMockRepeater();
      const requestHandler = getMockRequestHandler();
      const mockResponse1 = getMockAbortableRequest(Promise.resolve({ statusCode: 200, body: '{"foo": "bar"}', headers: {} }));
      const mockResponse2= getMockAbortableRequest(Promise.reject('test error'));
      requestHandler.makeRequest.mockReturnValueOnce(mockResponse1)
        .mockReturnValueOnce(mockResponse2).mockReturnValueOnce(mockResponse2);
      
      const manager = new PollingDatafileManager({
        repeater,
        requestHandler,
        sdkKey: 'keyThatExists',
        autoUpdate: true,
        logger,
      });

      const listener = vi.fn();
      manager.onUpdate(listener);

      manager.start();
      for(let i = 0; i < 3; i++) {
        await repeater.execute(0).catch(() => {});
      }

      await expect(manager.onRunning()).resolves.not.toThrow();
      expect(logger.error).toHaveBeenCalledTimes(2);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('logs an error if fetch returns non success response and does not call onUpdate handler', async () => {
      const logger = getMockLogger();
      const repeater = getMockRepeater();
      const requestHandler = getMockRequestHandler();
      const mockResponse1 = getMockAbortableRequest(Promise.resolve({ statusCode: 200, body: '{"foo": "bar"}', headers: {} }));
      const mockResponse2= getMockAbortableRequest(Promise.resolve({ statusCode: 500, body: '{"foo": "bar"}', headers: {} }));
      requestHandler.makeRequest.mockReturnValueOnce(mockResponse1)
        .mockReturnValueOnce(mockResponse2).mockReturnValueOnce(mockResponse2);
      
      const manager = new PollingDatafileManager({
        repeater,
        requestHandler,
        sdkKey: 'keyThatExists',
        autoUpdate: true,
        logger,
      });

      const listener = vi.fn();
      manager.onUpdate(listener);

      manager.start();
      for(let i = 0; i < 3; i++) {
        await repeater.execute(0).catch(() => {});
      }

      await expect(manager.onRunning()).resolves.not.toThrow();
      expect(logger.error).toHaveBeenCalledTimes(2);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('saves and uses last-modified header', async () => {
      const repeater = getMockRepeater();
      const requestHandler = getMockRequestHandler();
      const mockResponse1 = getMockAbortableRequest(
        Promise.resolve({ statusCode: 200, body: '{"foo": "bar"}', headers: { 'last-modified': 'Fri, 08 Mar 2019 18:57:17 GMT' } }));
      const mockResponse2 = getMockAbortableRequest(
        Promise.resolve({ statusCode: 304, body: '', headers: {} }));
      const mockResponse3 = getMockAbortableRequest(
        Promise.resolve({ statusCode: 200, body: '{"foo2": "bar2"}', headers: {} }));
      requestHandler.makeRequest.mockReturnValueOnce(mockResponse1)
        .mockReturnValueOnce(mockResponse2).mockReturnValueOnce(mockResponse3);
      
      const manager = new PollingDatafileManager({
        repeater,
        requestHandler,
        sdkKey: 'keyThatDoesNotExists',
        autoUpdate: true,
      });

      manager.start();

      for(let i = 0; i <3; i++) {
        await repeater.execute(0);
      }

      await expect(manager.onRunning()).resolves.not.toThrow();
      const secondCallHeaders = requestHandler.makeRequest.mock.calls[1][1];
      expect(secondCallHeaders['if-modified-since']).toBe('Fri, 08 Mar 2019 18:57:17 GMT');
      const thirdCallHeaders = requestHandler.makeRequest.mock.calls[1][1];
      expect(thirdCallHeaders['if-modified-since']).toBe('Fri, 08 Mar 2019 18:57:17 GMT');
    });

    it('does not call onUpdate handler if status is 304', async () => {
      const repeater = getMockRepeater();
      const requestHandler = getMockRequestHandler();
      const mockResponse1 = getMockAbortableRequest(
        Promise.resolve({ statusCode: 200, body: '{"foo": "bar"}', headers: { 'last-modified': 'Fri, 08 Mar 2019 18:57:17 GMT' } }));
      const mockResponse2 = getMockAbortableRequest(
        Promise.resolve({ statusCode: 304, body: '{"foo2": "bar2"}', headers: {} }));
      const mockResponse3 = getMockAbortableRequest(
        Promise.resolve({ statusCode: 200, body: '{"foo3": "bar3"}', headers: {} }));
      requestHandler.makeRequest.mockReturnValueOnce(mockResponse1)
        .mockReturnValueOnce(mockResponse2).mockReturnValueOnce(mockResponse3);
      
      const manager = new PollingDatafileManager({
        repeater,
        requestHandler,
        sdkKey: 'keyThatDoesNotExists',
        autoUpdate: true,
      });

      manager.start();

      const listener = vi.fn();
      manager.onUpdate(listener);

      for(let i = 0; i <3; i++) {
        await repeater.execute(0);
      }

      await expect(manager.onRunning()).resolves.not.toThrow();
      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener).not.toHaveBeenCalledWith('{"foo2": "bar2"}');
      expect(listener).toHaveBeenNthCalledWith(1, '{"foo": "bar"}');
      expect(listener).toHaveBeenNthCalledWith(2, '{"foo3": "bar3"}');
    });
  });

  it('sends the access token in the request Authorization header', async () => {
    const repeater = getMockRepeater();
    const requestHandler = getMockRequestHandler();
    const mockResponse = getMockAbortableRequest(Promise.resolve({ statusCode: 200, body: '{"foo": "bar"}', headers: {} }));
    requestHandler.makeRequest.mockReturnValueOnce(mockResponse);
    
    const manager = new PollingDatafileManager({
      repeater,
      requestHandler,
      sdkKey: 'keyThatExists',
      datafileAccessToken: 'token123',
    });

    manager.start();
    repeater.execute(0);

    await expect(manager.onRunning()).resolves.not.toThrow();
    expect(requestHandler.makeRequest).toHaveBeenCalledOnce();
    expect(requestHandler.makeRequest.mock.calls[0][1].Authorization).toBe('Bearer token123');
  });

  it('uses the provided urlTemplate', async () => {
    const repeater = getMockRepeater();
    const requestHandler = getMockRequestHandler();
    const mockResponse = getMockAbortableRequest(Promise.resolve({ statusCode: 200, body: '{"foo": "bar"}', headers: {} }));
    requestHandler.makeRequest.mockReturnValueOnce(mockResponse);
    
    const manager = new PollingDatafileManager({
      repeater,
      requestHandler,
      sdkKey: 'keyThatExists',
      urlTemplate: 'https://example.com/datafile?key=%s',
    });

    manager.start();
    repeater.execute(0);

    await expect(manager.onRunning()).resolves.not.toThrow();
    expect(requestHandler.makeRequest).toHaveBeenCalledOnce();
    expect(requestHandler.makeRequest.mock.calls[0][0]).toBe('https://example.com/datafile?key=keyThatExists');
  });

  it('uses the default urlTemplate if none is provided and datafileAccessToken is also not provided', async () => {
    const repeater = getMockRepeater();
    const requestHandler = getMockRequestHandler();
    const mockResponse = getMockAbortableRequest(Promise.resolve({ statusCode: 200, body: '{"foo": "bar"}', headers: {} }));
    requestHandler.makeRequest.mockReturnValueOnce(mockResponse);
    
    const manager = new PollingDatafileManager({
      repeater,
      requestHandler,
      sdkKey: 'keyThatExists',
    });

    manager.start();
    repeater.execute(0);

    await expect(manager.onRunning()).resolves.not.toThrow();
    expect(requestHandler.makeRequest).toHaveBeenCalledOnce();
    expect(requestHandler.makeRequest.mock.calls[0][0]).toBe(DEFAULT_URL_TEMPLATE.replace('%s', 'keyThatExists'));
  });

  it('uses the default authenticated urlTemplate if none is provided and datafileAccessToken is provided', async () => {
    const repeater = getMockRepeater();
    const requestHandler = getMockRequestHandler();
    const mockResponse = getMockAbortableRequest(Promise.resolve({ statusCode: 200, body: '{"foo": "bar"}', headers: {} }));
    requestHandler.makeRequest.mockReturnValueOnce(mockResponse);
    
    const manager = new PollingDatafileManager({
      repeater,
      requestHandler,
      sdkKey: 'keyThatExists',
      datafileAccessToken: 'token123',
    });

    manager.start();
    repeater.execute(0);

    await expect(manager.onRunning()).resolves.not.toThrow();
    expect(requestHandler.makeRequest).toHaveBeenCalledOnce();
    expect(requestHandler.makeRequest.mock.calls[0][0]).toBe(DEFAULT_AUTHENTICATED_URL_TEMPLATE.replace('%s', 'keyThatExists'));
  });

  it('returns the datafile from get', async () => {
    const repeater = getMockRepeater();
    const requestHandler = getMockRequestHandler();
    const mockResponse = getMockAbortableRequest(Promise.resolve({ statusCode: 200, body: '{"foo": "bar"}', headers: {} }));
    requestHandler.makeRequest.mockReturnValueOnce(mockResponse);
    
    const manager = new PollingDatafileManager({
      repeater,
      requestHandler,
      sdkKey: 'keyThatExists',
    });

    manager.start();
    repeater.execute(0);

    await expect(manager.onRunning()).resolves.not.toThrow();
    expect(manager.get()).toBe('{"foo": "bar"}');
  });

  it('returns undefined from get before becoming ready', () => {
    const repeater = getMockRepeater();
    const mockResponse = getMockAbortableRequest();
    const requestHandler = getMockRequestHandler();
    requestHandler.makeRequest.mockReturnValueOnce(mockResponse);
    const manager = new PollingDatafileManager({
      repeater,
      requestHandler,
      sdkKey: 'keyThatExists',
    });
    manager.start();
    expect(manager.get()).toBeUndefined();
  });

  it('removes the onUpdate handler when the retuned function is called', async () => {
    const repeater = getMockRepeater();
    const requestHandler = getMockRequestHandler();
    const mockResponse = getMockAbortableRequest(Promise.resolve({ statusCode: 200, body: '{"foo": "bar"}', headers: {} }));
    requestHandler.makeRequest.mockReturnValue(mockResponse);
    
    const manager = new PollingDatafileManager({
      repeater,
      requestHandler,
      sdkKey: 'keyThatExists',
      autoUpdate: true,
    });

    const listener = vi.fn();
    const removeListener = manager.onUpdate(listener);

    manager.start();
    repeater.execute(0);

    await expect(manager.onRunning()).resolves.not.toThrow();
    expect(listener).toHaveBeenCalledTimes(1);
    removeListener();
    
    await repeater.execute(0);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  describe('stop', () => {
    it('rejects onRunning when stop is called if manager state is New', async () => {
      const repeater = getMockRepeater();
      const requestHandler = getMockRequestHandler();
      const manager = new PollingDatafileManager({
        repeater,
        requestHandler,
        sdkKey: 'keyThatExists',
        autoUpdate: true,
      });

      expect(manager.getState()).toBe(ServiceState.New);
      manager.stop();
      await expect(manager.onRunning()).rejects.toThrow();
    });

    it('rejects onRunning when stop is called if manager state is Starting', async () => {
      const repeater = getMockRepeater();
      const requestHandler = getMockRequestHandler();
      const manager = new PollingDatafileManager({
        repeater,
        requestHandler,
        sdkKey: 'keyThatExists',
        autoUpdate: true,
      });

      manager.start();
      expect(manager.getState()).toBe(ServiceState.Starting);
      manager.stop();
      await expect(manager.onRunning()).rejects.toThrow();
    });

    it('stops the repeater, set state to Termimated, and resolve onTerminated when stop is called', async () => {
      const repeater = getMockRepeater();
      const requestHandler = getMockRequestHandler();
      const mockResponse = getMockAbortableRequest(Promise.resolve({ statusCode: 200, body: '{"foo": "bar"}', headers: {} }));
      requestHandler.makeRequest.mockReturnValueOnce(mockResponse);
      
      const manager = new PollingDatafileManager({
        repeater,
        requestHandler,
        sdkKey: 'keyThatExists',
        autoUpdate: true,
      });

      manager.start();
      await repeater.execute(0);
      await expect(manager.onRunning()).resolves.not.toThrow();

      manager.stop();
      await expect(manager.onTerminated()).resolves.not.toThrow();
      expect(repeater.stop).toHaveBeenCalled();
      expect(manager.getState()).toBe(ServiceState.Terminated);
    });

    it('aborts the current request if stop is called', async () => {
      const repeater = getMockRepeater();
      const requestHandler = getMockRequestHandler();
      const mockResponse = getMockAbortableRequest();
      requestHandler.makeRequest.mockReturnValueOnce(mockResponse);
      
      const manager = new PollingDatafileManager({
        repeater,
        requestHandler,
        sdkKey: 'keyThatExists',
        autoUpdate: true,
      });

      manager.start();
      repeater.execute(0);

      expect(requestHandler.makeRequest).toHaveBeenCalledOnce();
      manager.stop();
      expect(mockResponse.abort).toHaveBeenCalled();
    });

    it('does not call onUpdate handler after stop is called', async () => {
      const repeater = getMockRepeater();
      const requestHandler = getMockRequestHandler();
      const mockResponse = getMockAbortableRequest(Promise.resolve({ statusCode: 200, body: '{"foo": "bar"}', headers: {} }));
      requestHandler.makeRequest.mockReturnValueOnce(mockResponse);
      
      const manager = new PollingDatafileManager({
        repeater,
        requestHandler,
        sdkKey: 'keyThatExists',
        autoUpdate: true,
      });

      const listener = vi.fn();
      manager.onUpdate(listener);

      manager.start();
      repeater.execute(0);
      manager.stop();

      expect(listener).not.toHaveBeenCalled();
    });
  })
});
