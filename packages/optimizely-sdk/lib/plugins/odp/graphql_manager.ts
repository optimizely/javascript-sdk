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

import { LogHandler, LogLevel } from '../../modules/logging';
import { Response } from './odp_types';
import { IOdpClient, OdpClient } from './odp_client';
import { validate } from '../../utils/json_schema_validator';
import { OdpResponseSchema } from './odp_response_schema';
import { RequestHandlerFactory } from '../../utils/http_request_handler/request_handler_factory';
import { ODP_USER_KEY } from '../../utils/enums';

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
export interface IGraphQlManager {
  fetchSegments(apiKey: string, apiHost: string, userKey: string, userValue: string, segmentsToCheck: string[]): Promise<string[] | null>;
}

/**
 * Concrete implementation for communicating with the ODP GraphQL endpoint
 */
export class GraphQlManager implements IGraphQlManager {
  private readonly logger: LogHandler;
  private readonly odpClient: IOdpClient;

  /**
   * Communicates with Optimizely Data Platform's GraphQL endpoint
   * @param logger Collect and record events/errors for this GraphQL implementation
   * @param client Client to use to send queries to ODP
   */
  constructor(logger: LogHandler, client?: IOdpClient) {
    this.logger = logger;

    this.odpClient = client ?? new OdpClient(this.logger,
      RequestHandlerFactory.createHandler(this.logger));
  }

  /**
   * Retrieves the audience segments from ODP
   * @param apiKey ODP public key
   * @param apiHost Host of ODP endpoint
   * @param userKey 'vuid' or 'fs_user_id key'
   * @param userValue Associated value to query for the user key
   * @param segmentsToCheck Audience segments to check for experiment inclusion
   */
  public async fetchSegments(apiKey: string, apiHost: string, userKey: ODP_USER_KEY, userValue: string, segmentsToCheck: string[]): Promise<string[] | null> {
    if (!apiKey || !apiHost) {
      this.logger.log(LogLevel.ERROR, 'Audience segments fetch failed (Parameters apiKey or apiHost invalid)');
      return null;
    }

    if (segmentsToCheck?.length === 0) {
      return EMPTY_SEGMENTS_COLLECTION;
    }

    const endpoint = `${apiHost}/v3/graphql`;
    const query = this.toGraphQLJson(userKey, userValue, segmentsToCheck);

    const segmentsResponse = await this.odpClient.querySegments(apiKey, endpoint, userKey, userValue, query);
    if (!segmentsResponse) {
      this.logger.log(LogLevel.ERROR, 'Audience segments fetch failed (network error)');
      return null;
    }

    const parsedSegments = this.parseSegmentsResponseJson(segmentsResponse);
    if (!parsedSegments) {
      this.logger.log(LogLevel.ERROR, 'Audience segments fetch failed (decode error)');
      return null;
    }

    if (parsedSegments.errors?.length > 0) {
      const errors = parsedSegments.errors.map((e) => e.message).join('; ');

      this.logger.log(LogLevel.WARNING, `Audience segments fetch failed (${errors})`);

      return EMPTY_SEGMENTS_COLLECTION;
    }

    const edges = parsedSegments?.data?.customer?.audiences?.edges;
    if (!edges) {
      this.logger.log(LogLevel.WARNING, 'Audience segments fetch failed (decode error)');
      return EMPTY_SEGMENTS_COLLECTION;
    }

    return edges.filter(edge => edge.node.state == QUALIFIED).map(edge => edge.node.name);
  }

  /**
   * Converts the query parameters to a GraphQL JSON payload
   * @returns GraphQL JSON string
   */
  private toGraphQLJson(userKey: string, userValue: string, segmentsToCheck: string[]): string {
    const json: string[] = [];
    json.push('{"query" : "query {customer"');
    json.push(`(${userKey} : "${userValue}") `);
    json.push('{audiences');
    json.push(`(subset: [`);
    if (segmentsToCheck) {
      segmentsToCheck.forEach((segment, index) => {
        json.push(`\\"${segment}\\"${index < segmentsToCheck.length - 1 ? ',' : ''}`);
      });
    }
    json.push('] {edges {node {name state}}}}}"}');
    return json.join('');
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
    } catch {
      this.logger.log(LogLevel.ERROR, 'Attempted to parse invalid segment response JSON.');
      return EMPTY_JSON_RESPONSE;
    }

    if (validate(jsonObject, OdpResponseSchema, false)) {
      return jsonObject as Response;
    }

    return EMPTY_JSON_RESPONSE;
  }
}
