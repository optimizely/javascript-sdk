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
import { expect, vi, describe, it } from 'vitest';
import { DefaultEventDispatcher } from './default_dispatcher';
import { EventBatch } from './event_builder/build_event_v1';

const getEvent = (): EventBatch => {
  return {
    account_id: 'string',
    project_id: 'string',
    revision: 'string',
    client_name: 'string',
    client_version: 'string',
    anonymize_ip: true,
    enrich_decisions: false,
    visitors: [],
  };
};

describe('DefaultEventDispatcher', () => {
  it('reject the response promise if the eventObj.httpVerb is not POST', async () => {
    const eventObj = {
      url: 'https://cdn.com/event',
      params: getEvent(),
      httpVerb: 'GET' as const,
    };

    const requestHnadler = {
      makeRequest: vi.fn().mockReturnValue({
        abort: vi.fn(),
        responsePromise: Promise.resolve({ statusCode: 203 }),
      }),
    };

    const dispatcher = new DefaultEventDispatcher(requestHnadler);
    await expect(dispatcher.dispatchEvent(eventObj)).rejects.toThrow();
  });

  it('sends correct headers and data to the requestHandler', async () => {
    const eventObj = {
      url: 'https://cdn.com/event',
      params: getEvent(),
      httpVerb: 'POST' as const,
    };

    const requestHnadler = {
      makeRequest: vi.fn().mockReturnValue({
        abort: vi.fn(),
        responsePromise: Promise.resolve({ statusCode: 203 }),
      }),
    };

    const dispatcher = new DefaultEventDispatcher(requestHnadler);
    await dispatcher.dispatchEvent(eventObj);

    expect(requestHnadler.makeRequest).toHaveBeenCalledWith(
      eventObj.url,
      {
        'content-type': 'application/json',
        'content-length': JSON.stringify(eventObj.params).length.toString(),
      },
      'POST',
      JSON.stringify(eventObj.params)
    );
  });

  it('returns a promise that resolves with correct value if the response of the requestHandler resolves', async () => {
    const eventObj = {
      url: 'https://cdn.com/event',
      params: getEvent(),
      httpVerb: 'POST' as const,
    };

    const requestHnadler = {
      makeRequest: vi.fn().mockReturnValue({
        abort: vi.fn(),
        responsePromise: Promise.resolve({ statusCode: 203 }),
      }),
    };

    const dispatcher = new DefaultEventDispatcher(requestHnadler);
    const response = await dispatcher.dispatchEvent(eventObj);

    expect(response.statusCode).toEqual(203);
  });

  it('returns a promise that rejects if the response of the requestHandler rejects', async () => {
    const eventObj = {
      url: 'https://cdn.com/event',
      params: getEvent(),
      httpVerb: 'POST' as const,
    };

    const requestHnadler = {
      makeRequest: vi.fn().mockReturnValue({
        abort: vi.fn(),
        responsePromise: Promise.reject(new Error('error')),
      }),
    };

    const dispatcher = new DefaultEventDispatcher(requestHnadler);
    await expect(dispatcher.dispatchEvent(eventObj)).rejects.toThrow();
  });
});
