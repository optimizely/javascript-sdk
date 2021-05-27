/**
 * Copyright 2019-2020, Optimizely
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

import HttpPollingDatafileManager from '../src/httpPollingDatafileManager';
import { Headers, AbortableRequest, Response } from '../src/http';
import { DatafileManagerConfig } from '../src/datafileManager';
import { advanceTimersByTime, getTimerCount } from './testUtils';
import PersistentKeyValueCache from '../src/persistentKeyValueCache';

jest.mock('../src/backoffController', () => {
  return jest.fn().mockImplementation(() => {
    const getDelayMock = jest.fn().mockImplementation(() => 0);
    return {
      getDelay: getDelayMock,
      countError: jest.fn(),
      reset: jest.fn(),
    };
  });
});

import BackoffController from '../src/backoffController';

// Test implementation:
//   - Does not make any real requests: just resolves with queued responses (tests push onto queuedResponses)
class TestDatafileManager extends HttpPollingDatafileManager {
  queuedResponses: (Response | Error)[] = [];

  responsePromises: Promise<Response>[] = [];

  simulateResponseDelay = false;

  // Need these unsued vars for the mock call types to work (being able to check calls)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  makeGetRequest(url: string, headers: Headers): AbortableRequest {
    const nextResponse: Error | Response | undefined = this.queuedResponses.pop();
    let responsePromise: Promise<Response>;
    if (nextResponse === undefined) {
      responsePromise = Promise.reject('No responses queued');
    } else if (nextResponse instanceof Error) {
      responsePromise = Promise.reject(nextResponse);
    } else {
      if (this.simulateResponseDelay) {
        // Actual response will have some delay. This is required to get expected behavior for caching.
        responsePromise = new Promise(resolve => setTimeout(() => resolve(nextResponse), 50));
      } else {
        responsePromise = Promise.resolve(nextResponse);
      }
    }
    this.responsePromises.push(responsePromise);
    return { responsePromise, abort: jest.fn() };
  }

  getConfigDefaults(): Partial<DatafileManagerConfig> {
    return {};
  }
}

const testCache: PersistentKeyValueCache = {
  get(key: string): Promise<string> {
    let val = '';
    switch (key) {
      case 'opt-datafile-keyThatExists':
        val = JSON.stringify({ name: 'keyThatExists' });
        break;
    }
    return Promise.resolve(val);
  },

  set(): Promise<void> {
    return Promise.resolve();
  },

  contains(): Promise<boolean> {
    return Promise.resolve(false);
  },

  remove(): Promise<void> {
    return Promise.resolve();
  },
};

describe('httpPollingDatafileManager', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  let manager: TestDatafileManager;
  afterEach(async () => {
    if (manager) {
      manager.stop();
    }
    jest.clearAllMocks();
    jest.restoreAllMocks();
    jest.clearAllTimers();
  });

  describe('when constructed with sdkKey and datafile and autoUpdate: true,', () => {
    beforeEach(() => {
      manager = new TestDatafileManager({ datafile: JSON.stringify({ foo: 'abcd' }), sdkKey: '123', autoUpdate: true });
    });

    it('returns the passed datafile from get', () => {
      expect(JSON.parse(manager.get())).toEqual({ foo: 'abcd' });
    });

    it('after being started, fetches the datafile, updates itself, and updates itself again after a timeout', async () => {
      manager.queuedResponses.push(
        {
          statusCode: 200,
          body: '{"fooz": "barz"}',
          headers: {},
        },
        {
          statusCode: 200,
          body: '{"foo": "bar"}',
          headers: {},
        }
      );
      const updateFn = jest.fn();
      manager.on('update', updateFn);
      manager.start();
      expect(manager.responsePromises.length).toBe(1);
      await manager.responsePromises[0];
      expect(JSON.parse(manager.get())).toEqual({ foo: 'bar' });
      updateFn.mockReset();

      await advanceTimersByTime(300000);

      expect(manager.responsePromises.length).toBe(2);
      await manager.responsePromises[1];
      expect(updateFn).toBeCalledTimes(1);
      expect(updateFn.mock.calls[0][0]).toEqual({ datafile: '{"fooz": "barz"}' });
      expect(JSON.parse(manager.get())).toEqual({ fooz: 'barz' });
    });
  });

  describe('when constructed with sdkKey and datafile and autoUpdate: false,', () => {
    beforeEach(() => {
      manager = new TestDatafileManager({
        datafile: JSON.stringify({ foo: 'abcd' }),
        sdkKey: '123',
        autoUpdate: false,
      });
    });

    it('returns the passed datafile from get', () => {
      expect(JSON.parse(manager.get())).toEqual({ foo: 'abcd' });
    });

    it('after being started, fetches the datafile, updates itself once, but does not schedule a future update', async () => {
      manager.queuedResponses.push({
        statusCode: 200,
        body: '{"foo": "bar"}',
        headers: {},
      });
      manager.start();
      expect(manager.responsePromises.length).toBe(1);
      await manager.responsePromises[0];
      expect(JSON.parse(manager.get())).toEqual({ foo: 'bar' });
      expect(getTimerCount()).toBe(0);
    });
  });

  describe('when constructed with sdkKey and autoUpdate: true', () => {
    beforeEach(() => {
      manager = new TestDatafileManager({ sdkKey: '123', updateInterval: 1000, autoUpdate: true });
    });

    describe('initial state', () => {
      it('returns null from get before becoming ready', () => {
        expect(manager.get()).toEqual('');
      });
    });

    describe('started state', () => {
      it('passes the default datafile URL to the makeGetRequest method', async () => {
        const makeGetRequestSpy = jest.spyOn(manager, 'makeGetRequest');
        manager.queuedResponses.push({
          statusCode: 200,
          body: '{"foo": "bar"}',
          headers: {},
        });
        manager.start();
        expect(makeGetRequestSpy).toBeCalledTimes(1);
        expect(makeGetRequestSpy.mock.calls[0][0]).toBe('https://cdn.optimizely.com/datafiles/123.json');
        await manager.onReady();
      });

      it('after being started, fetches the datafile and resolves onReady', async () => {
        manager.queuedResponses.push({
          statusCode: 200,
          body: '{"foo": "bar"}',
          headers: {},
        });
        manager.start();
        await manager.onReady();
        expect(JSON.parse(manager.get())).toEqual({ foo: 'bar' });
      });

      describe('live updates', () => {
        it('sets a timeout to update again after the update interval', async () => {
          manager.queuedResponses.push(
            {
              statusCode: 200,
              body: '{"foo3": "bar3"}',
              headers: {},
            },
            {
              statusCode: 200,
              body: '{"foo4": "bar4"}',
              headers: {},
            }
          );
          const makeGetRequestSpy = jest.spyOn(manager, 'makeGetRequest');
          manager.start();
          expect(makeGetRequestSpy).toBeCalledTimes(1);
          await manager.responsePromises[0];
          await advanceTimersByTime(1000);
          expect(makeGetRequestSpy).toBeCalledTimes(2);
        });

        it('emits update events after live updates', async () => {
          manager.queuedResponses.push(
            {
              statusCode: 200,
              body: '{"foo3": "bar3"}',
              headers: {},
            },
            {
              statusCode: 200,
              body: '{"foo2": "bar2"}',
              headers: {},
            },
            {
              statusCode: 200,
              body: '{"foo": "bar"}',
              headers: {},
            }
          );

          const updateFn = jest.fn();
          manager.on('update', updateFn);

          manager.start();
          await manager.onReady();
          expect(JSON.parse(manager.get())).toEqual({ foo: 'bar' });
          expect(updateFn).toBeCalledTimes(0);

          await advanceTimersByTime(1000);
          await manager.responsePromises[1];
          expect(updateFn).toBeCalledTimes(1);
          expect(updateFn.mock.calls[0][0]).toEqual({ datafile: '{"foo2": "bar2"}' });
          expect(JSON.parse(manager.get())).toEqual({ foo2: 'bar2' });

          updateFn.mockReset();

          await advanceTimersByTime(1000);
          await manager.responsePromises[2];
          expect(updateFn).toBeCalledTimes(1);
          expect(updateFn.mock.calls[0][0]).toEqual({ datafile: '{"foo3": "bar3"}' });
          expect(JSON.parse(manager.get())).toEqual({ foo3: 'bar3' });
        });

        describe('when the update interval time fires before the request is complete', () => {
          it('waits until the request is complete before making the next request', async () => {
            let resolveResponsePromise: (resp: Response) => void;
            const responsePromise: Promise<Response> = new Promise(res => {
              resolveResponsePromise = res;
            });
            const makeGetRequestSpy = jest.spyOn(manager, 'makeGetRequest').mockReturnValueOnce({
              abort() {},
              responsePromise,
            });

            manager.start();
            expect(makeGetRequestSpy).toBeCalledTimes(1);

            await advanceTimersByTime(1000);
            expect(makeGetRequestSpy).toBeCalledTimes(1);

            resolveResponsePromise!({
              statusCode: 200,
              body: '{"foo": "bar"}',
              headers: {},
            });
            await responsePromise;
            await advanceTimersByTime(0);
            expect(makeGetRequestSpy).toBeCalledTimes(2);
          });
        });

        it('cancels a pending timeout when stop is called', async () => {
          manager.queuedResponses.push({
            statusCode: 200,
            body: '{"foo": "bar"}',
            headers: {},
          });

          manager.start();
          await manager.onReady();

          expect(getTimerCount()).toBe(1);
          manager.stop();
          expect(getTimerCount()).toBe(0);
        });

        it('cancels reactions to a pending fetch when stop is called', async () => {
          manager.queuedResponses.push(
            {
              statusCode: 200,
              body: '{"foo2": "bar2"}',
              headers: {},
            },
            {
              statusCode: 200,
              body: '{"foo": "bar"}',
              headers: {},
            }
          );

          manager.start();
          await manager.onReady();
          expect(JSON.parse(manager.get())).toEqual({ foo: 'bar' });

          await advanceTimersByTime(1000);

          expect(manager.responsePromises.length).toBe(2);
          manager.stop();
          await manager.responsePromises[1];
          // Should not have updated datafile since manager was stopped
          expect(JSON.parse(manager.get())).toEqual({ foo: 'bar' });
        });

        it('calls abort on the current request if there is a current request when stop is called', async () => {
          manager.queuedResponses.push({
            statusCode: 200,
            body: '{"foo2": "bar2"}',
            headers: {},
          });
          const makeGetRequestSpy = jest.spyOn(manager, 'makeGetRequest');
          manager.start();
          const currentRequest = makeGetRequestSpy.mock.results[0];
          expect(currentRequest.type).toBe('return');
          expect(currentRequest.value.abort).toBeCalledTimes(0);
          manager.stop();
          expect(currentRequest.value.abort).toBeCalledTimes(1);
        });

        it('can fail to become ready on the initial request, but succeed after a later polling update', async () => {
          manager.queuedResponses.push(
            {
              statusCode: 200,
              body: '{"foo": "bar"}',
              headers: {},
            },
            {
              statusCode: 404,
              body: '',
              headers: {},
            }
          );

          manager.start();
          expect(manager.responsePromises.length).toBe(1);
          await manager.responsePromises[0];
          // Not ready yet due to first request failed, but should have queued a live update
          expect(getTimerCount()).toBe(1);
          // Trigger the update, should fetch the next response which should succeed, then we get ready
          advanceTimersByTime(1000);
          await manager.onReady();
          expect(JSON.parse(manager.get())).toEqual({ foo: 'bar' });
        });

        describe('newness checking', () => {
          it('does not update if the response status is 304', async () => {
            manager.queuedResponses.push(
              {
                statusCode: 304,
                body: '',
                headers: {},
              },
              {
                statusCode: 200,
                body: '{"foo": "bar"}',
                headers: {
                  'Last-Modified': 'Fri, 08 Mar 2019 18:57:17 GMT',
                },
              }
            );

            const updateFn = jest.fn();
            manager.on('update', updateFn);

            manager.start();
            await manager.onReady();
            expect(JSON.parse(manager.get())).toEqual({ foo: 'bar' });
            // First response promise was for the initial 200 response
            expect(manager.responsePromises.length).toBe(1);
            // Trigger the queued update
            await advanceTimersByTime(1000);
            // Second response promise is for the 304 response
            expect(manager.responsePromises.length).toBe(2);
            await manager.responsePromises[1];
            // Since the response was 304, updateFn should not have been called
            expect(updateFn).toBeCalledTimes(0);
            expect(JSON.parse(manager.get())).toEqual({ foo: 'bar' });
          });

          it('sends if-modified-since using the last observed response last-modified', async () => {
            manager.queuedResponses.push(
              {
                statusCode: 304,
                body: '',
                headers: {},
              },
              {
                statusCode: 200,
                body: '{"foo": "bar"}',
                headers: {
                  'Last-Modified': 'Fri, 08 Mar 2019 18:57:17 GMT',
                },
              }
            );
            manager.start();
            await manager.onReady();
            const makeGetRequestSpy = jest.spyOn(manager, 'makeGetRequest');
            await advanceTimersByTime(1000);
            expect(makeGetRequestSpy).toBeCalledTimes(1);
            const firstCall = makeGetRequestSpy.mock.calls[0];
            const headers = firstCall[1];
            expect(headers).toEqual({
              'if-modified-since': 'Fri, 08 Mar 2019 18:57:17 GMT',
            });
          });
        });

        describe('backoff', () => {
          it('uses the delay from the backoff controller getDelay method when greater than updateInterval', async () => {
            const BackoffControllerMock = (BackoffController as unknown) as jest.Mock<BackoffController, []>;
            const getDelayMock = BackoffControllerMock.mock.results[0].value.getDelay;
            getDelayMock.mockImplementationOnce(() => 5432);

            const makeGetRequestSpy = jest.spyOn(manager, 'makeGetRequest');

            manager.queuedResponses.push({
              statusCode: 404,
              body: '',
              headers: {},
            });
            manager.start();
            await manager.responsePromises[0];
            expect(makeGetRequestSpy).toBeCalledTimes(1);

            // Should not make another request after 1 second because the error should have triggered backoff
            advanceTimersByTime(1000);
            expect(makeGetRequestSpy).toBeCalledTimes(1);

            // But after another 5 seconds, another request should be made
            await advanceTimersByTime(5000);
            expect(makeGetRequestSpy).toBeCalledTimes(2);
          });

          it('calls countError on the backoff controller when a non-success status code response is received', async () => {
            manager.queuedResponses.push({
              statusCode: 404,
              body: '',
              headers: {},
            });
            manager.start();
            await manager.responsePromises[0];
            const BackoffControllerMock = (BackoffController as unknown) as jest.Mock<BackoffController, []>;
            expect(BackoffControllerMock.mock.results[0].value.countError).toBeCalledTimes(1);
          });

          it('calls countError on the backoff controller when the response promise rejects', async () => {
            manager.queuedResponses.push(new Error('Connection failed'));
            manager.start();
            try {
              await manager.responsePromises[0];
            } catch (e) {
              //empty
            }
            const BackoffControllerMock = (BackoffController as unknown) as jest.Mock<BackoffController, []>;
            expect(BackoffControllerMock.mock.results[0].value.countError).toBeCalledTimes(1);
          });

          it('calls reset on the backoff controller when a success status code response is received', async () => {
            manager.queuedResponses.push({
              statusCode: 200,
              body: '{"foo": "bar"}',
              headers: {
                'Last-Modified': 'Fri, 08 Mar 2019 18:57:17 GMT',
              },
            });
            manager.start();
            const BackoffControllerMock = (BackoffController as unknown) as jest.Mock<BackoffController, []>;
            // Reset is called in start - we want to check that it is also called after the response, so reset the mock here
            BackoffControllerMock.mock.results[0].value.reset.mockReset();
            await manager.onReady();
            expect(BackoffControllerMock.mock.results[0].value.reset).toBeCalledTimes(1);
          });

          it('resets the backoff controller when start is called', async () => {
            const BackoffControllerMock = (BackoffController as unknown) as jest.Mock<BackoffController, []>;
            manager.start();
            expect(BackoffControllerMock.mock.results[0].value.reset).toBeCalledTimes(1);
            try {
              await manager.responsePromises[0];
            } catch (e) {
              // empty
            }
          });
        });
      });
    });
  });

  describe('when constructed with sdkKey and autoUpdate: false', () => {
    beforeEach(() => {
      manager = new TestDatafileManager({ sdkKey: '123', autoUpdate: false });
    });

    it('after being started, fetches the datafile and resolves onReady', async () => {
      manager.queuedResponses.push({
        statusCode: 200,
        body: '{"foo": "bar"}',
        headers: {},
      });
      manager.start();
      await manager.onReady();
      expect(JSON.parse(manager.get())).toEqual({ foo: 'bar' });
    });

    it('does not schedule a live update after ready', async () => {
      manager.queuedResponses.push({
        statusCode: 200,
        body: '{"foo": "bar"}',
        headers: {},
      });
      const updateFn = jest.fn();
      manager.on('update', updateFn);
      manager.start();
      await manager.onReady();
      expect(getTimerCount()).toBe(0);
    });

    // TODO: figure out what's wrong with this test
    it.skip('rejects the onReady promise if the initial request promise rejects', async () => {
      manager.queuedResponses.push({
        statusCode: 200,
        body: '{"foo": "bar"}',
        headers: {},
      });
      manager.makeGetRequest = (): AbortableRequest => ({
        abort(): void {},
        responsePromise: Promise.reject(new Error('Could not connect')),
      });
      manager.start();
      let didReject = false;
      try {
        await manager.onReady();
      } catch (e) {
        didReject = true;
      }
      expect(didReject).toBe(true);
    });
  });

  describe('when constructed with sdkKey and a valid urlTemplate', () => {
    beforeEach(() => {
      manager = new TestDatafileManager({
        sdkKey: '456',
        updateInterval: 1000,
        urlTemplate: 'https://localhost:5556/datafiles/%s',
      });
    });

    it('uses the urlTemplate to create the url passed to the makeGetRequest method', async () => {
      const makeGetRequestSpy = jest.spyOn(manager, 'makeGetRequest');
      manager.queuedResponses.push({
        statusCode: 200,
        body: '{"foo": "bar"}',
        headers: {},
      });
      manager.start();
      expect(makeGetRequestSpy).toBeCalledTimes(1);
      expect(makeGetRequestSpy.mock.calls[0][0]).toBe('https://localhost:5556/datafiles/456');
      await manager.onReady();
    });
  });

  describe('when constructed with an update interval below the minimum', () => {
    beforeEach(() => {
      manager = new TestDatafileManager({ sdkKey: '123', updateInterval: 500, autoUpdate: true });
    });

    it('uses the default update interval', async () => {
      const makeGetRequestSpy = jest.spyOn(manager, 'makeGetRequest');

      manager.queuedResponses.push({
        statusCode: 200,
        body: '{"foo3": "bar3"}',
        headers: {},
      });

      manager.start();
      await manager.onReady();
      expect(makeGetRequestSpy).toBeCalledTimes(1);
      await advanceTimersByTime(300000);
      expect(makeGetRequestSpy).toBeCalledTimes(2);
    });
  });

  describe('when constructed with a cache implementation having an already cached datafile', () => {
    beforeEach(() => {
      manager = new TestDatafileManager({
        sdkKey: 'keyThatExists',
        updateInterval: 500,
        autoUpdate: true,
        cache: testCache,
      });
      manager.simulateResponseDelay = true;
    });

    it('uses cached version of datafile first and resolves the promise while network throws error and no update event is triggered', async () => {
      manager.queuedResponses.push(new Error('Connection Error'));
      const updateFn = jest.fn();
      manager.on('update', updateFn);
      manager.start();
      await manager.onReady();
      expect(JSON.parse(manager.get())).toEqual({ name: 'keyThatExists' });
      await advanceTimersByTime(50);
      expect(JSON.parse(manager.get())).toEqual({ name: 'keyThatExists' });
      expect(updateFn).toBeCalledTimes(0);
    });

    it('uses cached datafile, resolves ready promise, fetches new datafile from network and triggers update event', async () => {
      manager.queuedResponses.push({
        statusCode: 200,
        body: '{"foo": "bar"}',
        headers: {},
      });

      const updateFn = jest.fn();
      manager.on('update', updateFn);
      manager.start();
      await manager.onReady();
      expect(JSON.parse(manager.get())).toEqual({ name: 'keyThatExists' });
      expect(updateFn).toBeCalledTimes(0);
      await advanceTimersByTime(50);
      expect(JSON.parse(manager.get())).toEqual({ foo: 'bar' });
      expect(updateFn).toBeCalledTimes(1);
    });

    it('sets newly recieved datafile in to cache', async () => {
      const cacheSetSpy = jest.spyOn(testCache, 'set');
      manager.queuedResponses.push({
        statusCode: 200,
        body: '{"foo": "bar"}',
        headers: {},
      });
      manager.start();
      await manager.onReady();
      await advanceTimersByTime(50);
      expect(JSON.parse(manager.get())).toEqual({ foo: 'bar' });
      expect(cacheSetSpy.mock.calls[0][0]).toEqual('opt-datafile-keyThatExists');
      expect(JSON.parse(cacheSetSpy.mock.calls[0][1])).toEqual({ foo: 'bar' });
    });
  });

  describe('when constructed with a cache implementation without an already cached datafile', () => {
    beforeEach(() => {
      manager = new TestDatafileManager({
        sdkKey: 'keyThatDoesExists',
        updateInterval: 500,
        autoUpdate: true,
        cache: testCache,
      });
      manager.simulateResponseDelay = true;
    });

    it('does not find cached datafile, fetches new datafile from network, resolves promise and does not trigger update event', async () => {
      manager.queuedResponses.push({
        statusCode: 200,
        body: '{"foo": "bar"}',
        headers: {},
      });

      const updateFn = jest.fn();
      manager.on('update', updateFn);
      manager.start();
      await advanceTimersByTime(50);
      await manager.onReady();
      expect(JSON.parse(manager.get())).toEqual({ foo: 'bar' });
      expect(updateFn).toBeCalledTimes(0);
    });
  });
});
