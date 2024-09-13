import { vi } from 'vitest';
import { AbortableRequest, Headers, RequestHandler, Response } from '../../utils/http_request_handler/http';
import { ResolvablePromise, resolvablePromise } from '../../utils/promise/resolvablePromise';


export type MockAbortableRequest = AbortableRequest & {
  mockResponse: ResolvablePromise<Response>;
};

export class MockRequestHandler implements RequestHandler {
  makeRequest(requestUrl: string, headers: Headers, method: string, data?: string): MockAbortableRequest {
    const response = resolvablePromise<Response>();
    return {
      mockResponse: response,
      responsePromise: response.promise,
      abort: vi.fn(),
    };
  }
}

export const getMockRequestHandler = (): MockRequestHandler => {
  const requestHandler = new MockRequestHandler();
  vi.spyOn(requestHandler, 'makeRequest');
  return requestHandler;
}