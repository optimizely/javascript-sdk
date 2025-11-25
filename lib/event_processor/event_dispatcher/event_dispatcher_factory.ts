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

import { Platform } from './../../platform_support';
import { RequestHandler } from '../../utils/http_request_handler/http';
import { DefaultEventDispatcher } from './default_dispatcher';
import { EventDispatcher } from './event_dispatcher';

import { validateRequestHandler } from '../../utils/http_request_handler/request_handler_validator';


export const createEventDispatcher = (requestHander: RequestHandler): EventDispatcher => {
  validateRequestHandler(requestHander);
  return new DefaultEventDispatcher(requestHander);
}

export const __platforms: Platform[] = ['__universal__'];
