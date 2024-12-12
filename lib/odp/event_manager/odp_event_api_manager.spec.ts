/**
 * Copyright 2022-2024, Optimizely
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

import { describe, it, expect, vi } from 'vitest';

import { DefaultOdpEventApiManager, eventApiRequestGenerator, pixelApiRequestGenerator } from './odp_event_api_manager';
import { OdpEvent } from './odp_event';
import { OdpConfig } from '../odp_config';

const data1 = new Map<string, unknown>();
data1.set('key11', 'value-1');
data1.set('key12', true);
data1.set('key13', 3.5);
data1.set('key14', null);

const data2 = new Map<string, unknown>();

data2.set('key2', 'value-2');

const ODP_EVENTS = [
  new OdpEvent('t1', 'a1', new Map([['id-key-1', 'id-value-1']]), data1),
  new OdpEvent('t2', 'a2', new Map([['id-key-2', 'id-value-2']]), data2),
];

const API_KEY = 'test-api-key';
const API_HOST = 'https://odp.example.com';
const PIXEL_URL = 'https://odp.pixel.com';

const odpConfig = new OdpConfig(API_KEY, API_HOST, PIXEL_URL, []);

import { getMockRequestHandler } from '../../tests/mock/mock_request_handler';

describe('DefaultOdpEventApiManager', () => {
  it('should generate the event request using the correct odp config and event', async () => {
    const mockRequestHandler = getMockRequestHandler();
    mockRequestHandler.makeRequest.mockReturnValue({
      responsePromise: Promise.resolve({
        statusCode: 200,
        body: '',
        headers: {},
      }),
    });
    const requestGenerator = vi.fn().mockReturnValue({
      method: 'PATCH',
      endpoint: 'https://odp.example.com/v3/events',
      headers: {
        'x-api-key': 'test-api',
      },
      data: 'event-data',
    });

    const manager = new DefaultOdpEventApiManager(mockRequestHandler, requestGenerator);
    manager.sendEvents(odpConfig, ODP_EVENTS);
    
    expect(requestGenerator.mock.calls[0][0]).toEqual(odpConfig);
    expect(requestGenerator.mock.calls[0][1]).toEqual(ODP_EVENTS);
  });

  it('should send the correct request using the request handler', async () => {
    const mockRequestHandler = getMockRequestHandler();
    mockRequestHandler.makeRequest.mockReturnValue({
      responsePromise: Promise.resolve({
        statusCode: 200,
        body: '',
        headers: {},
      }),
    });
    const requestGenerator = vi.fn().mockReturnValue({
      method: 'PATCH',
      endpoint: 'https://odp.example.com/v3/events',
      headers: {
        'x-api-key': 'test-api',
      },
      data: 'event-data',
    });

    const manager = new DefaultOdpEventApiManager(mockRequestHandler, requestGenerator);
    manager.sendEvents(odpConfig, ODP_EVENTS);
  
    expect(mockRequestHandler.makeRequest.mock.calls[0][0]).toEqual('https://odp.example.com/v3/events');
    expect(mockRequestHandler.makeRequest.mock.calls[0][1]).toEqual({
      'x-api-key': 'test-api',
    });
    expect(mockRequestHandler.makeRequest.mock.calls[0][2]).toEqual('PATCH');
    expect(mockRequestHandler.makeRequest.mock.calls[0][3]).toEqual('event-data');
  });

  it('should return a promise that fails if the requestHandler response promise fails', async () => {
    const mockRequestHandler = getMockRequestHandler();
    mockRequestHandler.makeRequest.mockReturnValue({
      responsePromise: Promise.reject(new Error('Request failed')),
    });
    const requestGenerator = vi.fn().mockReturnValue({
      method: 'PATCH',
      endpoint: 'https://odp.example.com/v3/events',
      headers: {
        'x-api-key': 'test-api',
      },
      data: 'event-data',
    });

    const manager = new DefaultOdpEventApiManager(mockRequestHandler, requestGenerator);
    const response = manager.sendEvents(odpConfig, ODP_EVENTS);

    await expect(response).rejects.toThrow('Request failed');
  });

  it('should return a promise that resolves with correct response code from the requestHandler', async () => {
    const mockRequestHandler = getMockRequestHandler();
    mockRequestHandler.makeRequest.mockReturnValue({
      responsePromise: Promise.resolve({
        statusCode: 226,
        body: '',
        headers: {},
      }),
    });
    const requestGenerator = vi.fn().mockReturnValue({
      method: 'PATCH',
      endpoint: 'https://odp.example.com/v3/events',
      headers: {
        'x-api-key': 'test-api',
      },
      data: 'event-data',
    });

    const manager = new DefaultOdpEventApiManager(mockRequestHandler, requestGenerator);
    const response = manager.sendEvents(odpConfig, ODP_EVENTS);

    await expect(response).resolves.not.toThrow();
    const statusCode = await response.then((r) => r.statusCode);
    expect(statusCode).toBe(226);
  });
});

describe('pixelApiRequestGenerator', () => {
  it('should generate the correct request for the pixel API using only the first event', () => {
    const request = pixelApiRequestGenerator(odpConfig, ODP_EVENTS);
    expect(request.method).toBe('GET');
    const endpoint = new URL(request.endpoint);
    expect(endpoint.origin).toBe(PIXEL_URL);
    expect(endpoint.pathname).toBe('/v2/zaius.gif');
    expect(endpoint.searchParams.get('id-key-1')).toBe('id-value-1');
    expect(endpoint.searchParams.get('key11')).toBe('value-1');
    expect(endpoint.searchParams.get('key12')).toBe('true');
    expect(endpoint.searchParams.get('key13')).toBe('3.5');
    expect(endpoint.searchParams.get('key14')).toBe('null');
    expect(endpoint.searchParams.get('tracker_id')).toBe(API_KEY);
    expect(endpoint.searchParams.get('event_type')).toBe('t1');
    expect(endpoint.searchParams.get('vdl_action')).toBe('a1');

    expect(request.headers).toEqual({});
    expect(request.data).toBe('');
  });
});

describe('eventApiRequestGenerator', () => {
  it('should generate the correct request for the event API using all events', () => {
    const request = eventApiRequestGenerator(odpConfig, ODP_EVENTS);
    expect(request.method).toBe('POST');
    expect(request.endpoint).toBe('https://odp.example.com/v3/events');
    expect(request.headers).toEqual({
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
    });
    
    const data = JSON.parse(request.data);
    expect(data).toEqual([
      {
        type: 't1',
        action: 'a1',
        identifiers: {
          'id-key-1': 'id-value-1',
        },
        data: {
          key11: 'value-1',
          key12: true,
          key13: 3.5,
          key14: null,
        },
      },
      {
        type: 't2',
        action: 'a2',
        identifiers: {
          'id-key-2': 'id-value-2',
        },
        data: {
          key2: 'value-2',
        },
      },
    ]);
  });
});
