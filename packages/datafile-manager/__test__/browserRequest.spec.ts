/**
 * @jest-environment jsdom
 */
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
/* global fetchMock */
import { enableFetchMocks } from 'jest-fetch-mock';
enableFetchMocks();
import { makeGetRequest } from '../src/browserRequest';
import { advanceTimersByTime } from './testUtils';

describe('browserRequest', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  it('makes a GET request to the argument URL', async () => {
    fetchMock.mockResponseOnce('{"foo":"bar"}', {
      status: 200,
      headers: {},
    });

    const req = makeGetRequest('https://cdn.optimizely.com/datafiles/123.json', {});

    expect(fetchMock).toBeCalledTimes(1);
    const firstCallArgs = fetchMock.mock.calls[0];
    expect(firstCallArgs[0]).toBe('https://cdn.optimizely.com/datafiles/123.json');
    expect(firstCallArgs[1]).not.toHaveProperty('method');

    await req.responsePromise;
  });

  it('returns a responsePromise that fulfills with a successful response', async () => {
    fetchMock.mockResponseOnce('{"foo":"bar"}', {
      status: 200,
      headers: {},
    });

    const req = makeGetRequest('https://cdn.optimizely.com/datafiles/123.json', {});

    const resp = await req.responsePromise;
    expect(resp).toMatchObject({
      statusCode: 200,
      body: '{"foo":"bar"}',
    });
  });

  it('returns a responsePromise that fulfills with a 404 response', async () => {
    fetchMock.mockResponseOnce('', { status: 404, headers: {} });

    const req = makeGetRequest('https://cdn.optimizely.com/datafiles/123.json', {});

    const resp = await req.responsePromise;
    expect(resp).toMatchObject({
      statusCode: 404,
      body: '',
    });
  });

  it('includes headers from the headers argument in the request', async () => {
    fetchMock.mockResponseOnce('', { status: 404, headers: {} });

    const req = makeGetRequest('https://cdn.optimizely.com/dataifles/123.json', {
      'if-modified-since': 'Fri, 08 Mar 2019 18:57:18 GMT',
    });

    expect(fetchMock).toBeCalledTimes(1);
    const firstCallArgs = fetchMock.mock.calls[0];
    const fetchOptions = firstCallArgs[1];
    expect(fetchOptions).toBeDefined();
    const headers = fetchOptions!.headers;
    expect(headers).toEqual({ 'if-modified-since': 'Fri, 08 Mar 2019 18:57:18 GMT' });
    await req.responsePromise;
  });

  it('returns a responsePromise that fulfills with headers from the response', async () => {
    fetchMock.mockResponseOnce('{"foo":"bar"}', {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'last-modified': 'Fri, 08 Mar 2019 18:57:18 GMT',
      },
    });

    const req = makeGetRequest('https://cdn.optimizely.com/datafiles/123.json', {});

    const resp = await req.responsePromise;
    expect(resp).toMatchObject({
      statusCode: 200,
      body: '{"foo":"bar"}',
    });
    expect(resp.headers.get('content-type')).toBe('application/json');
    expect(resp.headers.get('last-modified')).toBe('Fri, 08 Mar 2019 18:57:18 GMT');
  });

  it('returns a rejected promise when there is a request error', async () => {
    fetchMock.mockRejectOnce(new Error('Failed to fetch'));
    const req = makeGetRequest('https://cdn.optimizely.com/datafiles/123.json', {});
    await expect(req.responsePromise).rejects.toThrow();
  });

  describe('delayed response', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.clearAllTimers();
    });

    it('aborts the request when the response is not received before the timeout', async () => {
      fetchMock.mockResponseOnce(
        () => new Promise(resolve => setTimeout(() => resolve({ body: '{"foo":"bar"}' }), 61000))
      );
      makeGetRequest('https://cdn.optimizely.com/datafiles/123.json', {});
      await advanceTimersByTime(60000);
      const firstCallArgs = fetchMock.mock.calls[0];
      const fetchOptions = firstCallArgs[1];
      expect(fetchOptions).toBeDefined();
      const abortSignal = fetchOptions!.signal;
      expect(abortSignal).toBeDefined();
      expect(abortSignal!.aborted).toBe(true);
    });

    it('aborts the request when the abort method is called', () => {
      fetchMock.mockResponseOnce(
        () => new Promise(resolve => setTimeout(() => resolve({ body: '{"foo":"bar"}' }), 5000))
      );
      const req = makeGetRequest('https://cdn.optimizely.com/datafiles/123.json', {});
      req.abort();
      const firstCallArgs = fetchMock.mock.calls[0];
      const fetchOptions = firstCallArgs[1];
      expect(fetchOptions).toBeDefined();
      const abortSignal = fetchOptions!.signal;
      expect(abortSignal).toBeDefined();
      expect(abortSignal!.aborted).toBe(true);
    });
  });
});
