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

import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';

import { FakeXMLHttpRequest, FakeXMLHttpRequestStatic, fakeXhr } from 'nise';
import { BrowserRequestHandler } from '../lib/utils/http_request_handler/browser_request_handler';
import { NoOpLogger } from '../lib/plugins/logger';

describe('BrowserRequestHandler', () => {
  const host = 'https://endpoint.example.com/api/query';
  const body = '{"foo":"bar"}';
  const dateString = 'Fri, 08 Mar 2019 18:57:18 GMT';

  describe('makeRequest', () => {
    let mockXHR: FakeXMLHttpRequestStatic;
    let xhrs: FakeXMLHttpRequest[];
    let browserRequestHandler: BrowserRequestHandler;

    beforeEach(() => {
      xhrs = [];
      mockXHR = fakeXhr.useFakeXMLHttpRequest();
      mockXHR.onCreate = (request): number => xhrs.push(request);
      browserRequestHandler = new BrowserRequestHandler(new NoOpLogger());
    });

    afterEach(() => {
      mockXHR.restore();
    });

    it('should make a GET request to the argument URL', async () => {
      const request = browserRequestHandler.makeRequest(host, {}, 'get');

      expect(xhrs.length).toBe(1);
      const xhr = xhrs[0];
      const { url, method } = xhr;
      expect({ url, method }).toEqual({
        url: host,
        method: 'get',
      });
      xhr.respond(200, {}, body);

      const response = await request.responsePromise;

      expect(response.body).toEqual(body);
    });

    it('should return a 200 response', async () => {
      const request = browserRequestHandler.makeRequest(host, {}, 'get');

      const xhr = xhrs[0];
      xhr.respond(200, {}, body);

      const response = await request.responsePromise;
      expect(response).toEqual({
        statusCode: 200,
        headers: {},
        body,
      });
    });

    it('should return a 404 response', async () => {
      const request = browserRequestHandler.makeRequest(host, {}, 'get');

      const xhr = xhrs[0];
      xhr.respond(404, {}, '');

      const response = await request.responsePromise;
      expect(response).toEqual({
        statusCode: 404,
        headers: {},
        body: '',
      });
    });

    it('should include headers from the headers argument in the request', async () => {
      const request = browserRequestHandler.makeRequest(host, {
        'if-modified-since': dateString,
      }, 'get');

      expect(xhrs.length).toBe(1);
      expect(xhrs[0].requestHeaders['if-modified-since']).toBe(dateString);

      xhrs[0].respond(404, {}, '');

      await request.responsePromise;
    });

    it('should include headers from the response in the eventual response in the return value', async () => {
      const request = browserRequestHandler.makeRequest(host, {}, 'get');
      const xhr = xhrs[0];
      xhr.respond(
        200,
        {
          'content-type': 'application/json',
          'last-modified': dateString,
        },
        body,
      );

      const response = await request.responsePromise;

      expect(response).toEqual({
        statusCode: 200,
        body,
        headers: {
          'content-type': 'application/json',
          'last-modified': dateString,
        },
      });
    });

    it('should return a rejected promise when there is a request error', async () => {
      const request = browserRequestHandler.makeRequest(host, {}, 'get');
      xhrs[0].error();

      await expect(request.responsePromise).rejects.toThrow();
    });

    it('should set a timeout on the request object', () => {
      const timeout = 60000;
      const onCreateMock = vi.fn();
      mockXHR.onCreate = onCreateMock;

      new BrowserRequestHandler(new NoOpLogger(), timeout).makeRequest(host, {}, 'get');

      expect(onCreateMock).toBeCalledTimes(1);
      expect(onCreateMock.mock.calls[0][0].timeout).toBe(timeout);
    });
  });
});
