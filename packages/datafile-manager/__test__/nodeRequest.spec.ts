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

import nock from 'nock';
import zlib from 'zlib';
import { makeGetRequest } from '../src/nodeRequest';
import { advanceTimersByTime } from './testUtils';

beforeAll(() => {
  nock.disableNetConnect();
});

afterAll(() => {
  nock.enableNetConnect();
});

describe('nodeEnvironment', () => {
  const host = 'https://cdn.optimizely.com';
  const path = '/datafiles/123.json';

  afterEach(async () => {
    nock.cleanAll();
  });

  describe('makeGetRequest', () => {
    it('returns a 200 response back to its superclass', async () => {
      const scope = nock(host)
        .get(path)
        .reply(200, '{"foo":"bar"}');
      const req = makeGetRequest(`${host}${path}`, {});
      const resp = await req.responsePromise;
      expect(resp).toEqual({
        statusCode: 200,
        body: '{"foo":"bar"}',
        headers: {},
      });
      scope.done();
    });

    it('returns a 404 response back to its superclass', async () => {
      const scope = nock(host)
        .get(path)
        .reply(404, '');
      const req = makeGetRequest(`${host}${path}`, {});
      const resp = await req.responsePromise;
      expect(resp).toEqual({
        statusCode: 404,
        body: '',
        headers: {},
      });
      scope.done();
    });

    it('includes headers from the headers argument in the request', async () => {
      const scope = nock(host)
        .matchHeader('if-modified-since', 'Fri, 08 Mar 2019 18:57:18 GMT')
        .get(path)
        .reply(304, '');
      const req = makeGetRequest(`${host}${path}`, {
        'if-modified-since': 'Fri, 08 Mar 2019 18:57:18 GMT',
      });
      const resp = await req.responsePromise;
      expect(resp).toEqual({
        statusCode: 304,
        body: '',
        headers: {},
      });
      scope.done();
    });

    it('adds an Accept-Encoding request header and unzips a gzipped response body', async () => {
      const scope = nock(host)
        .matchHeader('accept-encoding', 'gzip,deflate')
        .get(path)
        .reply(200, () => zlib.gzipSync('{"foo":"bar"}'), { 'content-encoding': 'gzip' });
      const req = makeGetRequest(`${host}${path}`, {});
      const resp = await req.responsePromise;
      expect(resp).toMatchObject({
        statusCode: 200,
        body: '{"foo":"bar"}',
      });
      scope.done();
    });

    it('includes headers from the response in the eventual response in the return value', async () => {
      const scope = nock(host)
        .get(path)
        .reply(
          200,
          { foo: 'bar' },
          {
            'last-modified': 'Fri, 08 Mar 2019 18:57:18 GMT',
          }
        );
      const req = makeGetRequest(`${host}${path}`, {});
      const resp = await req.responsePromise;
      expect(resp).toEqual({
        statusCode: 200,
        body: '{"foo":"bar"}',
        headers: {
          'content-type': 'application/json',
          'last-modified': 'Fri, 08 Mar 2019 18:57:18 GMT',
        },
      });
      scope.done();
    });

    it('handles a URL with a query string', async () => {
      const pathWithQuery = '/datafiles/123.json?from_my_app=true';
      const scope = nock(host)
        .get(pathWithQuery)
        .reply(200, { foo: 'bar' });
      const req = makeGetRequest(`${host}${pathWithQuery}`, {});
      await req.responsePromise;
      scope.done();
    });

    it('handles a URL with http protocol (not https)', async () => {
      const httpHost = 'http://cdn.optimizely.com';
      const scope = nock(httpHost)
        .get(path)
        .reply(200, '{"foo":"bar"}');
      const req = makeGetRequest(`${httpHost}${path}`, {});
      const resp = await req.responsePromise;
      expect(resp).toEqual({
        statusCode: 200,
        body: '{"foo":"bar"}',
        headers: {},
      });
      scope.done();
    });

    it('returns a rejected response promise when the URL protocol is unsupported', async () => {
      const invalidProtocolUrl = 'ftp://something/datafiles/123.json';
      const req = makeGetRequest(invalidProtocolUrl, {});
      await expect(req.responsePromise).rejects.toThrow();
    });

    it('returns a rejected promise when there is a request error', async () => {
      const scope = nock(host)
        .get(path)
        .replyWithError({
          message: 'Connection error',
          code: 'CONNECTION_ERROR',
        });
      const req = makeGetRequest(`${host}${path}`, {});
      await expect(req.responsePromise).rejects.toThrow();
      scope.done();
    });

    it('handles a url with a host and a port', async () => {
      const hostWithPort = 'http://datafiles:3000';
      const path = '/12/345.json';
      const scope = nock(hostWithPort)
        .get(path)
        .reply(200, '{"foo":"bar"}');
      const req = makeGetRequest(`${hostWithPort}${path}`, {});
      const resp = await req.responsePromise;
      expect(resp).toEqual({
        statusCode: 200,
        body: '{"foo":"bar"}',
        headers: {},
      });
      scope.done();
    });

    describe('timeout', () => {
      beforeEach(() => {
        jest.useFakeTimers();
      });

      afterEach(() => {
        jest.clearAllTimers();
      });

      it('rejects the response promise and aborts the request when the response is not received before the timeout', async () => {
        const scope = nock(host)
          .get(path)
          .delay(61000)
          .reply(200, '{"foo":"bar"}');

        const abortEventListener = jest.fn();
        let emittedReq: any;
        const requestListener = (request: any): void => {
          emittedReq = request;
          emittedReq.once('abort', abortEventListener);
        };
        scope.on('request', requestListener);

        const req = makeGetRequest(`${host}${path}`, {});
        await advanceTimersByTime(60000);
        await expect(req.responsePromise).rejects.toThrow();
        expect(abortEventListener).toBeCalledTimes(1);

        scope.done();
        if (emittedReq) {
          emittedReq.off('abort', abortEventListener);
        }
        scope.off('request', requestListener);
      });
    });
  });
});
