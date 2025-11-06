/**
 * Copyright 2025, Optimizely
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

import { describe, it, expect, vi, Mocked, Mock, MockInstance, beforeEach, afterEach } from 'vitest';

import { DefaultCmabClient } from './cmab_client';
import { getMockAbortableRequest, getMockRequestHandler } from '../../../tests/mock/mock_request_handler';
import { RequestHandler } from '../../../utils/http_request_handler/http';
import { advanceTimersByTime, exhaustMicrotasks } from '../../../tests/testUtils';
import { OptimizelyError } from '../../../error/optimizly_error';

const mockSuccessResponse = (variation: string) => Promise.resolve({
  statusCode: 200,
  body: JSON.stringify({
    predictions: [
      {
        variation_id: variation,
      },
    ],
  }),
  headers: {}
});

const mockErrorResponse = (statusCode: number) => Promise.resolve({
  statusCode,
  body: '',
  headers: {},
});

const assertRequest = (
  call: number,
  mockRequestHandler: MockInstance<RequestHandler['makeRequest']>,
  ruleId: string,
  userId: string,
  attributes: Record<string, any>,
  cmabUuid: string,
) => {
  const [requestUrl, headers, method, data] = mockRequestHandler.mock.calls[call];
  expect(requestUrl).toBe(`https://prediction.cmab.optimizely.com/predict/${ruleId}`);
  expect(method).toBe('POST');
  expect(headers).toEqual({
    'Content-Type': 'application/json',
  });

  const parsedData = JSON.parse(data!);
  expect(parsedData.instances).toEqual([
    {
      visitorId: userId,
      experimentId: ruleId,
      attributes: Object.keys(attributes).map((key) => ({
        id: key,
        value: attributes[key],
        type: 'custom_attribute',
      })),
      cmabUUID: cmabUuid,
    }
  ]);
};

describe('DefaultCmabClient', () => {
  it('should fetch variation using correct parameters', async () => {
    const requestHandler = getMockRequestHandler();

    const mockMakeRequest: MockInstance<RequestHandler['makeRequest']> = requestHandler.makeRequest;
    mockMakeRequest.mockReturnValue(getMockAbortableRequest(mockSuccessResponse('var123')));

    const cmabClient = new DefaultCmabClient({
      requestHandler,
    });

    const ruleId = '123';
    const userId = 'user123';
    const attributes = {
      browser: 'chrome',
      isMobile: true,
    };
    const cmabUuid = 'uuid123';

    const variation = await cmabClient.fetchDecision(ruleId, userId, attributes, cmabUuid);

    expect(variation).toBe('var123');
    assertRequest(0, mockMakeRequest, ruleId, userId, attributes, cmabUuid);
  });

  it('should retry fetch if retryConfig is provided', async () => {
    const requestHandler = getMockRequestHandler();

    const mockMakeRequest: MockInstance<RequestHandler['makeRequest']> = requestHandler.makeRequest;
    mockMakeRequest.mockReturnValueOnce(getMockAbortableRequest(Promise.reject('error')))
      .mockReturnValueOnce(getMockAbortableRequest(mockErrorResponse(500)))
      .mockReturnValueOnce(getMockAbortableRequest(mockSuccessResponse('var123')));

    const cmabClient = new DefaultCmabClient({
      requestHandler,
      retryConfig: {
        maxRetries: 5,
      },
    });

    const ruleId = '123';
    const userId = 'user123';
    const attributes = {
      browser: 'chrome',
      isMobile: true,
    };
    const cmabUuid = 'uuid123';

    const variation = await cmabClient.fetchDecision(ruleId, userId, attributes, cmabUuid);

    expect(variation).toBe('var123');
    expect(mockMakeRequest.mock.calls.length).toBe(3);
    for(let i = 0; i < 3; i++) {
      assertRequest(i, mockMakeRequest, ruleId, userId, attributes, cmabUuid);
    }
  });

  it('should use backoff provider if provided', async () => {
    vi.useFakeTimers();

    const requestHandler = getMockRequestHandler();

    const mockMakeRequest: MockInstance<RequestHandler['makeRequest']> = requestHandler.makeRequest;
    mockMakeRequest.mockReturnValueOnce(getMockAbortableRequest(Promise.reject('error')))
      .mockReturnValueOnce(getMockAbortableRequest(mockErrorResponse(500)))
      .mockReturnValueOnce(getMockAbortableRequest(mockErrorResponse(500)))
      .mockReturnValueOnce(getMockAbortableRequest(mockSuccessResponse('var123')));

    const backoffProvider = () => {
      let call = 0;
      const values = [100, 200, 300];
      return {
        reset: () => {},
        backoff: () => {
          return values[call++];
        },
      };
    }

    const cmabClient = new DefaultCmabClient({
      requestHandler,
      retryConfig: {
        maxRetries: 5,
        backoffProvider,
      },
    });

    const ruleId = '123';
    const userId = 'user123';
    const attributes = {
      browser: 'chrome',
      isMobile: true,
    };
    const cmabUuid = 'uuid123';

    const fetchPromise = cmabClient.fetchDecision(ruleId, userId, attributes, cmabUuid);

    await exhaustMicrotasks();
    expect(mockMakeRequest.mock.calls.length).toBe(1);

    // first backoff is 100ms, should not retry yet
    await advanceTimersByTime(90);
    await exhaustMicrotasks();
    expect(mockMakeRequest.mock.calls.length).toBe(1);

    // first backoff is 100ms, should retry now
    await advanceTimersByTime(10);
    await exhaustMicrotasks();
    expect(mockMakeRequest.mock.calls.length).toBe(2);

    // second backoff is 200ms, should not retry 2nd time yet
    await advanceTimersByTime(150);
    await exhaustMicrotasks();
    expect(mockMakeRequest.mock.calls.length).toBe(2);

    // second backoff is 200ms, should retry 2nd time now
    await advanceTimersByTime(50);
    await exhaustMicrotasks();
    expect(mockMakeRequest.mock.calls.length).toBe(3);

    // third backoff is 300ms, should not retry 3rd time yet
    await advanceTimersByTime(280);
    await exhaustMicrotasks();
    expect(mockMakeRequest.mock.calls.length).toBe(3);

    // third backoff is 300ms, should retry 3rd time now
    await advanceTimersByTime(20);
    await exhaustMicrotasks();
    expect(mockMakeRequest.mock.calls.length).toBe(4);

    const variation = await fetchPromise;

    expect(variation).toBe('var123');
    expect(mockMakeRequest.mock.calls.length).toBe(4);
    for(let i = 0; i < 4; i++) {
      assertRequest(i, mockMakeRequest, ruleId, userId, attributes, cmabUuid);
    }
    vi.useRealTimers();
  });

  it('should reject the promise after retries are exhausted', async () => {
    const requestHandler = getMockRequestHandler();

    const mockMakeRequest: MockInstance<RequestHandler['makeRequest']> = requestHandler.makeRequest;
    mockMakeRequest.mockReturnValue(getMockAbortableRequest(Promise.reject('error')));

    const cmabClient = new DefaultCmabClient({
      requestHandler,
      retryConfig: {
        maxRetries: 5,
      },
    });

    const ruleId = '123';
    const userId = 'user123';
    const attributes = {
      browser: 'chrome',
      isMobile: true,
    };
    const cmabUuid = 'uuid123';

    await expect(cmabClient.fetchDecision(ruleId, userId, attributes, cmabUuid)).rejects.toThrow();
    expect(mockMakeRequest.mock.calls.length).toBe(6);
  });

  it('should reject the promise after retries are exhausted with error status', async () => {
    const requestHandler = getMockRequestHandler();

    const mockMakeRequest: MockInstance<RequestHandler['makeRequest']> = requestHandler.makeRequest;
    mockMakeRequest.mockReturnValue(getMockAbortableRequest(mockErrorResponse(500)));

    const cmabClient = new DefaultCmabClient({
      requestHandler,
      retryConfig: {
        maxRetries: 5,
      },
    });

    const ruleId = '123';
    const userId = 'user123';
    const attributes = {
      browser: 'chrome',
      isMobile: true,
    };
    const cmabUuid = 'uuid123';

    await expect(cmabClient.fetchDecision(ruleId, userId, attributes, cmabUuid)).rejects.toThrow();
    expect(mockMakeRequest.mock.calls.length).toBe(6);
  });

  it('should not retry if retryConfig is not provided', async () => {
    const requestHandler = getMockRequestHandler();

    const mockMakeRequest: MockInstance<RequestHandler['makeRequest']> = requestHandler.makeRequest;
    mockMakeRequest.mockReturnValueOnce(getMockAbortableRequest(Promise.reject('error')));

    const cmabClient = new DefaultCmabClient({
      requestHandler,
    });

    const ruleId = '123';
    const userId = 'user123';
    const attributes = {
      browser: 'chrome',
      isMobile: true,
    };
    const cmabUuid = 'uuid123';

    await expect(cmabClient.fetchDecision(ruleId, userId, attributes, cmabUuid)).rejects.toThrow();
    expect(mockMakeRequest.mock.calls.length).toBe(1);
  });

  it('should reject the promise if response status code is not 200', async () => {
    const requestHandler = getMockRequestHandler();

    const mockMakeRequest: MockInstance<RequestHandler['makeRequest']> = requestHandler.makeRequest;
    mockMakeRequest.mockReturnValue(getMockAbortableRequest(mockErrorResponse(500)));

    const cmabClient = new DefaultCmabClient({
      requestHandler,
    });

    const ruleId = '123';
    const userId = 'user123';
    const attributes = {
      browser: 'chrome',
      isMobile: true,
    };
    const cmabUuid = 'uuid123';

    await expect(cmabClient.fetchDecision(ruleId, userId, attributes, cmabUuid)).rejects.toMatchObject(
      new OptimizelyError('CMAB_FETCH_FAILED', 500),
    );
  });

  it('should reject the promise if api response is not valid', async () => {
    const requestHandler = getMockRequestHandler();

    const mockMakeRequest: MockInstance<RequestHandler['makeRequest']> = requestHandler.makeRequest;
    mockMakeRequest.mockReturnValue(getMockAbortableRequest(Promise.resolve({
      statusCode: 200,
      body: JSON.stringify({
        predictions: [],
      }),
      headers: {},
    })));

    const cmabClient = new DefaultCmabClient({
      requestHandler,
    });

    const ruleId = '123';
    const userId = 'user123';
    const attributes = {
      browser: 'chrome',
      isMobile: true,
    };
    const cmabUuid = 'uuid123';

    await expect(cmabClient.fetchDecision(ruleId, userId, attributes, cmabUuid)).rejects.toMatchObject(
      new OptimizelyError('INVALID_CMAB_RESPONSE'),
    );
  });

  it('should reject the promise if requestHandler.makeRequest rejects', async () => {
    const requestHandler = getMockRequestHandler();

    const mockMakeRequest: MockInstance<RequestHandler['makeRequest']> = requestHandler.makeRequest;
    mockMakeRequest.mockReturnValue(getMockAbortableRequest(Promise.reject('error')));

    const cmabClient = new DefaultCmabClient({
      requestHandler,
    });

    const ruleId = '123';
    const userId = 'user123';
    const attributes = {
      browser: 'chrome',
      isMobile: true,
    };
    const cmabUuid = 'uuid123';

    await expect(cmabClient.fetchDecision(ruleId, userId, attributes, cmabUuid)).rejects.toThrow('error');
  });

  it('should use custom prediction endpoint template when provided', async () => {
    const requestHandler = getMockRequestHandler();

    const mockMakeRequest: MockInstance<RequestHandler['makeRequest']> = requestHandler.makeRequest;
    mockMakeRequest.mockReturnValue(getMockAbortableRequest(mockSuccessResponse('var456')));

    const customEndpoint = 'https://custom.example.com/predict/%s';
    const cmabClient = new DefaultCmabClient({
      requestHandler,
      predictionEndpointTemplate: customEndpoint,
    });
    const ruleId = '789';
    const userId = 'user789';
    const attributes = {
      browser: 'firefox',
    };
    const cmabUuid = 'uuid789';
    const variation = await cmabClient.fetchDecision(ruleId, userId, attributes, cmabUuid);
    const [requestUrl] = mockMakeRequest.mock.calls[0];

    expect(variation).toBe('var456');
    expect(mockMakeRequest.mock.calls.length).toBe(1);
    expect(requestUrl).toBe('https://custom.example.com/predict/789');
  });

  it('should use default prediction endpoint template when not provided', async () => {
    const requestHandler = getMockRequestHandler();
    const mockMakeRequest: MockInstance<RequestHandler['makeRequest']> = requestHandler.makeRequest;
    mockMakeRequest.mockReturnValue(getMockAbortableRequest(mockSuccessResponse('var999')));
    const cmabClient = new DefaultCmabClient({
      requestHandler,
    });
    const ruleId = '555';
    const userId = 'user555';
    const attributes = {
      browser: 'safari',
    };
    const cmabUuid = 'uuid555';
    const variation = await cmabClient.fetchDecision(ruleId, userId, attributes, cmabUuid);
    const [requestUrl] = mockMakeRequest.mock.calls[0];

    expect(variation).toBe('var999');
    expect(mockMakeRequest.mock.calls.length).toBe(1);
    expect(requestUrl).toBe('https://prediction.cmab.optimizely.com/predict/555');
  });
});
