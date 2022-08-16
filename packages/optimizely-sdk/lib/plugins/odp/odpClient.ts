/**
 * Copyright 2022, Optimizely
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

import { LogHandler } from '../../modules/logging';

export interface IOdpClient {
  querySegments(apiKey: string, apiHost: string, userKey: string, userValue: string): string;
}

export class OdpClient implements IOdpClient {
  constructor(logger: LogHandler, client: unknown) {
  }

  querySegments(apiKey: string, apiHost: string, userKey: string, userValue: string): string {
    return '';
  }
}
