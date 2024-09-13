import { vi } from 'vitest';
import { AbortableRequest, Headers, RequestHandler, Response } from '../../utils/http_request_handler/http';
import { ResolvablePromise, resolvablePromise } from '../../utils/promise/resolvablePromise';


export type MockAbortableRequest = AbortableRequest & {
  mockResponse: ResolvablePromise<Response>;
};

export const getMockAbortableRequest = (res?: Promise<Response>) => {
  const response = resolvablePromise<Response>();
  if (res) response.resolve(res);
  return {
    mockResponse: response,
    responsePromise: response.promise,
    abort: vi.fn(),
  };
};

export const getMockRequestHandler = () => {
  const mock = {
    makeRequest: vi.fn(),
  }
  return mock;
}
