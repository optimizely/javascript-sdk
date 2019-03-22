/**
 * @jest-environment jsdom
 */

// TODO: It doesn't work unless the jest-enviroment comment is at the top...
// ...so if we need the license header at the top, we have to fix this

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

import {
  SinonFakeXMLHttpRequest,
  SinonFakeXMLHttpRequestStatic,
  useFakeXMLHttpRequest,
} from 'sinon'
import { makeGetRequest } from '../src/browserRequest'

describe('browserRequest', () => {
  describe('makeGetRequest', () => {
    let mockXHR: SinonFakeXMLHttpRequestStatic
    let xhrs: SinonFakeXMLHttpRequest[]
    beforeEach(() => {
      xhrs = []
      mockXHR = useFakeXMLHttpRequest()
      mockXHR.onCreate = req => xhrs.push(req)
    })

    afterEach(() => {
      mockXHR.restore()
    })

    it('makes a GET request to the argument URL', async () => {
      const req = makeGetRequest('https://cdn.optimizely.com/datafiles/123.json', {})

      expect(xhrs.length).toBe(1)
      const xhr = xhrs[0]
      const { url, method } = xhr
      expect({ url, method }).toEqual({
        url: 'https://cdn.optimizely.com/datafiles/123.json',
        method: 'GET',
      })

      xhr.respond(200, {}, '{"foo":"bar"}')

      await req.responsePromise
    })

    it('returns a 200 response back to its superclass', async () => {
      const req = makeGetRequest('https://cdn.optimizely.com/datafiles/123.json', {})

      const xhr = xhrs[0]
      xhr.respond(200, {}, '{"foo":"bar"}')

      const resp = await req.responsePromise
      expect(resp).toEqual({
        statusCode: 200,
        headers: {},
        body: '{"foo":"bar"}',
      })
    })

    it('returns a 404 response back to its superclass', async () => {
      const req = makeGetRequest('https://cdn.optimizely.com/datafiles/123.json', {})

      const xhr = xhrs[0]
      xhr.respond(404, {}, '')

      const resp = await req.responsePromise
      expect(resp).toEqual({
        statusCode: 404,
        headers: {},
        body: '',
      })
    })

    it('includes headers from the headers argument in the request', async () => {
      const req = makeGetRequest('https://cdn.optimizely.com/dataifles/123.json', {
        'if-modified-since': 'Fri, 08 Mar 2019 18:57:18 GMT',
      })

      expect(xhrs.length).toBe(1)
      expect(xhrs[0].requestHeaders['if-modified-since']).toBe(
        'Fri, 08 Mar 2019 18:57:18 GMT',
      )

      xhrs[0].respond(404, {}, '')

      await req.responsePromise
    })

    it('includes headers from the response in the eventual response in the return value', async () => {
      const req = makeGetRequest('https://cdn.optimizely.com/datafiles/123.json', {})

      const xhr = xhrs[0]
      xhr.respond(
        200,
        {
          'content-type': 'application/json',
          'last-modified': 'Fri, 08 Mar 2019 18:57:18 GMT',
        },
        '{"foo":"bar"}',
      )

      const resp = await req.responsePromise
      expect(resp).toEqual({
        statusCode: 200,
        body: '{"foo":"bar"}',
        headers: {
          'content-type': 'application/json',
          'last-modified': 'Fri, 08 Mar 2019 18:57:18 GMT',
        },
      })
    })

    it('returns a rejected promise when there is a request error', async () => {
      const req = makeGetRequest('https://cdn.optimizely.com/datafiles/123.json', {})
      xhrs[0].error()
      await expect(req.responsePromise).rejects.toThrow()
    })
  })
})
