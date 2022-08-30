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

import { ConsoleLogHandler, ErrorHandler, LogHandler, LogLevel, NoopErrorHandler } from '../../modules/logging';
import { Response } from './odp_types';
import { IOdpClient, OdpClient } from './odp_client';
import { validate } from '../../utils/json_schema_validator';
import { OdpResponseSchema } from './odp_response_schema';
import { QuerySegmentsParameters } from './query_segments_parameters';

/**
 * Expected value for a qualified/valid segment
 */
const QUALIFIED = 'qualified';
/**
 * Return value when no valid segments found
 */
const EMPTY_SEGMENTS_COLLECTION: string[] = [];
/**
 * Return value for scenarios with no valid JSON
 */
const EMPTY_JSON_RESPONSE = null;

/**
 * Manager for communicating with the Optimizely Data Platform GraphQL endpoint
 */
export interface IGraphQLManager {
  fetchSegments(apiKey: string, apiHost: string, userKey: string, userValue: string, segmentsToCheck: string[]): Promise<string[]>;
}

/**
 * Concrete implementation for communicating with the Optimizely Data Platform GraphQL endpoint
 */
export class GraphqlManager implements IGraphQLManager {
  private readonly _errorHandler: ErrorHandler;
  private readonly _logger: LogHandler;
  private readonly _odpClient: IOdpClient;

  /**
   * Retrieves the audience segments from the Optimizely Data Platform (ODP)
   * @param errorHandler Handler to record exceptions
   * @param logger Collect and record events/errors for this GraphQL implementation
   * @param client Client to use to send queries to ODP
   */
  constructor(errorHandler: ErrorHandler, logger: LogHandler, client: IOdpClient) {
    this._errorHandler = errorHandler ?? new NoopErrorHandler();
    this._logger = logger ?? new ConsoleLogHandler();
    this._odpClient = client ?? new OdpClient(this._errorHandler, this._logger);
  }

  /**
   * Retrieves the audience segments from ODP
   * @param apiKey ODP public key
   * @param apiHost Fully-qualified URL of ODP
   * @param userKey 'vuid' or 'fs_user_id key'
   * @param userValue Associated value to query for the user key
   * @param segmentsToCheck Audience segments to check for experiment inclusion
   */
  public async fetchSegments(apiKey: string, apiHost: string, userKey: string, userValue: string, segmentsToCheck: string[]): Promise<string[]> {
    const parameters = new QuerySegmentsParameters({
      apiKey,
      apiHost,
      userKey,
      userValue,
      segmentsToCheck,
    });
    const segmentsResponse = await this._odpClient.querySegments(parameters);
    if (!segmentsResponse) {
      this._logger.log(LogLevel.ERROR, 'Audience segments fetch failed (network error)');
      return EMPTY_SEGMENTS_COLLECTION;
    }

    const parsedSegments = this.parseSegmentsResponseJson(segmentsResponse);
    if (!parsedSegments) {
      this._logger.log(LogLevel.ERROR, 'Audience segments fetch failed (decode error)');
      return EMPTY_SEGMENTS_COLLECTION;
    }

    if (parsedSegments.errors?.length > 0) {
      const errors = parsedSegments.errors.map((e) => e.message).join(';');

      this._logger.log(LogLevel.WARNING, `Audience segments fetch failed (${errors})`);

      return EMPTY_SEGMENTS_COLLECTION;
    }

    const edges = parsedSegments?.data?.customer?.audiences?.edges;
    if (!edges) {
      this._logger.log(LogLevel.WARNING, 'Audience segments fetch failed (decode error)');
      return EMPTY_SEGMENTS_COLLECTION;
    }

    return edges.filter(edge => edge.node.state == QUALIFIED).map(edge => edge.node.name);
  }

  /**
   * Parses JSON response
   * @param jsonResponse JSON response from ODP
   * @private
   * @returns Response Strongly-typed ODP Response object
   */
  private parseSegmentsResponseJson(jsonResponse: string): Response | null {
    let jsonObject = {};

    try {
      jsonObject = JSON.parse(jsonResponse);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      this._errorHandler.handleError(error);
      this._logger.log(LogLevel.ERROR, 'Attempted to parse invalid segment response JSON.');
      return EMPTY_JSON_RESPONSE;
    }

    if (validate(jsonObject, OdpResponseSchema, false)) {
      return jsonObject as Response;
    }

    return EMPTY_JSON_RESPONSE;
  }
}
