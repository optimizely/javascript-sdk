/**
 * Copyright 2024 Optimizely
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

import { vi } from 'vitest';
import { AbortableRequest, Response } from '../../utils/http_request_handler/http';
import { ResolvablePromise, resolvablePromise } from '../../utils/promise/resolvablePromise';


export type MockAbortableRequest = AbortableRequest & {
  mockResponse: ResolvablePromise<Response>;
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const getMockAbortableRequest = (res?: Promise<Response>) => {
  const response = resolvablePromise<Response>();
  if (res) response.resolve(res);
  return {
    mockResponse: response,
    responsePromise: response.promise,
    abort: vi.fn(),
  };
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const getMockRequestHandler = () => {
  const mock = {
    makeRequest: vi.fn(),
  }
  return mock;
}
