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

import { ConsoleLogHandler, LogHandler, LogLevel } from '../../modules/logging';
import { Response } from './odp_types';
import { IOdpClient, NodeOdpClient } from './odp_client';
import { validate } from '../../utils/json_schema_validator';
import { OdpResponseSchema } from './odp_response_schema';

const QUALIFIED = 'qualified';

export interface IGraphQLManager {
  fetchSegments(apiKey: string, apiHost: string, userKey: string, userValue: string): string[];
}

export class GraphqlManager implements IGraphQLManager {
  private readonly _logger: LogHandler;
  private readonly _odpClient: IOdpClient;

  constructor(logger: LogHandler, client: IOdpClient) {
    this._logger = logger ?? new ConsoleLogHandler();
    this._odpClient = client ?? new NodeOdpClient(this._logger, client);
  }

  public fetchSegments(apiKey: string, apiHost: string, userKey: string, userValue: string): string[] {
    const segmentsResponse = this._odpClient.querySegments(apiKey, apiHost, userKey, userValue);
    if (!segmentsResponse) {
      return [] as string[];
    }

    const parsedSegments = this._parseSegmentsResponseJson(segmentsResponse);
    if (!parsedSegments) {
      return [] as string[];
    }

    if (parsedSegments.errors?.length > 0) {
      const errors = parsedSegments.errors.map((e) => e.message).join(';');

      this._logger.log(LogLevel.WARNING, `Audience segments fetch failed (${errors})`);

      return [] as string[];
    }

    if (parsedSegments?.data?.customer?.audiences?.edges === null) {
      this._logger.log(LogLevel.WARNING, 'Audience segments fetch failed (decode error)');

      return [] as string[];
    }

    return parsedSegments.data.customer.audiences.edges.filter(edge => edge.node.state == QUALIFIED).map(edge => edge.node.name);
  }

  private _parseSegmentsResponseJson(jsonResponse: string): Response | undefined {
    if (validate(jsonResponse, OdpResponseSchema, false)) {
      return JSON.parse(jsonResponse) as Response;
    }
    return undefined;
  }
}
