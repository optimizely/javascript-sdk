/**
 * Copyright 2022 Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { describe, beforeEach, afterEach, beforeAll, afterAll, it, vi, expect } from 'vitest';

import nock from 'nock';
import zlib from 'zlib';
import { NodeRequestHandler } from '../lib/utils/http_request_handler/node_request_handler';
import { NoOpLogger } from '../lib/plugins/logger';

beforeAll(() => {
  nock.disableNetConnect();
});

afterAll(() => {
  nock.enableNetConnect();
});

describe('NodeRequestHandler', () => {
  const host = 'https://endpoint.example.com';
  const path = '/api/query';
  const body = '{"foo":"bar"}';

  let nodeRequestHandler: NodeRequestHandler;

  beforeEach(() => {
    nodeRequestHandler = new NodeRequestHandler(new NoOpLogger());
  });

  afterEach(async () => {
    nock.cleanAll();
  });

  describe('makeRequest', () => {
    it('should handle a 200 response back from a post', async () => {
      const scope = nock(host)
        .post(path)
        .reply(200, body);

      const request = nodeRequestHandler.makeRequest(`${host}${path}`, {}, 'post', body);
      const response = await request.responsePromise;

      expect(response).toEqual({
        statusCode: 200,
        body,
        headers: {},
      });
      scope.done();
    });

    it('should handle a 400 response back ', async () => {
      const scope = nock(host)
        .post(path)
        .reply(400, '');

      const request = nodeRequestHandler.makeRequest(`${host}${path}`, {}, 'post');
      const response = await request.responsePromise;

      expect(response).toEqual({
        statusCode: 400,
        body: '',
        headers: {},
      });
      scope.done();
    });

    it('should include headers from the headers argument in the request', async () => {
      const scope = nock(host)
        .matchHeader('if-modified-since', 'Fri, 08 Mar 2019 18:57:18 GMT')
        .get(path)
        .reply(304, '');
      const request = nodeRequestHandler.makeRequest(`${host}${path}`, {
        'if-modified-since': 'Fri, 08 Mar 2019 18:57:18 GMT',
      }, 'get');
      const response = await request.responsePromise;
      expect(response).toEqual({
        statusCode: 304,
        body: '',
        headers: {},
      });
      scope.done();
    });

    it('should add Accept-Encoding request header and unzips a gzipped response body', async () => {
      const scope = nock(host)
        .matchHeader('accept-encoding', 'gzip,deflate')
        .get(path)
        .reply(200, () => zlib.gzipSync(body), { 'content-encoding': 'gzip' });

      const request = nodeRequestHandler.makeRequest(`${host}${path}`, {}, 'get');
      const response = await request.responsePromise;

      expect(response).toMatchObject({
        statusCode: 200,
        body: body,
      });
      scope.done();
    });

    it('should include headers from the response in the eventual response in the return value', async () => {
      const scope = nock(host)
        .get(path)
        .reply(
          200,
          JSON.parse(body),
          {
            'last-modified': 'Fri, 08 Mar 2019 18:57:18 GMT',
          },
        );

      const request = nodeRequestHandler.makeRequest(`${host}${path}`, {}, 'get');
      const response = await request.responsePromise;

      expect(response).toEqual({
        statusCode: 200,
        body,
        headers: {
          'content-type': 'application/json',
          'last-modified': 'Fri, 08 Mar 2019 18:57:18 GMT',
        },
      });
      scope.done();
    });

    it('should handle a URL with a query string', async () => {
      const pathWithQuery = '/datafiles/123.json?from_my_app=true';
      const scope = nock(host)
        .get(pathWithQuery)
        .reply(200, JSON.parse(body));

      const request = nodeRequestHandler.makeRequest(`${host}${pathWithQuery}`, {}, 'get');
      await request.responsePromise;

      scope.done();
    });

    it('should throw error for a URL with http protocol (not https)', async () => {
      const invalidHttpProtocolUrl = 'http://some.example.com';

      const request = nodeRequestHandler.makeRequest(invalidHttpProtocolUrl, {}, 'get');

      await expect(request.responsePromise).rejects.toThrow();
    });

    it('should returns a rejected response promise when the URL protocol is unsupported', async () => {
      const invalidProtocolUrl = 'ftp://something/datafiles/123.json';

      const request = nodeRequestHandler.makeRequest(invalidProtocolUrl, {}, 'get');

      await expect(request.responsePromise).rejects.toThrow();
    });

    it('should return a rejected promise when there is a request error', async () => {
      const scope = nock(host)
        .get(path)
        .replyWithError({
          message: 'Connection error',
          code: 'CONNECTION_ERROR',
        });
      const request = nodeRequestHandler.makeRequest(`${host}${path}`, {}, 'get');
      await expect(request.responsePromise).rejects.toThrow();
      scope.done();
    });

    it('should handle a url with a host and a port', async () => {
      const hostWithPort = 'https://datafiles:44311';
      const path = '/12/345.json';
      const scope = nock(hostWithPort)
        .get(path)
        .reply(200, body);

      const request = nodeRequestHandler.makeRequest(`${hostWithPort}${path}`, {}, 'get');
      const response = await request.responsePromise;

      expect(response).toEqual({
        statusCode: 200,
        body,
        headers: {},
      });
      scope.done();
    });

    describe('timeout', () => {
      beforeEach(() => {
        vi.useFakeTimers();
      });

      afterEach(() => {
        vi.clearAllTimers();
      });

      it.only('should reject the response promise and abort the request when the response is not received before the timeout', async () => {
        const scope = nock(host)
          .get(path)
          .delay({ head: 2000, body: 2000 })
          .reply(200, body);

        const abortEventListener = vi.fn();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let emittedReq: any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const requestListener = (request: any): void => {
          emittedReq = request;
          emittedReq.once('timeout', abortEventListener);
        };
        scope.on('request', requestListener);

        const request = new NodeRequestHandler(new NoOpLogger(), 100).makeRequest(`${host}${path}`, {}, 'get');

        vi.advanceTimersByTime(60000);
        vi.runAllTimers(); // <- explicitly tell vi to run all setTimeout, setInterval
        vi.runAllTicks(); // <- explicitly tell vi to run all Promise callback
        await expect(request.responsePromise).rejects.toThrow();
        expect(abortEventListener).toBeCalledTimes(1);

        scope.done();
        if (emittedReq) {
          emittedReq.off('timeout', abortEventListener);
        }
        scope.off('request', requestListener);
      });
    });
  });
});
