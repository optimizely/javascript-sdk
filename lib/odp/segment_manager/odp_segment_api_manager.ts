/**
 * Copyright 2022-2023, Optimizely
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
import { validate } from '../../utils/json_schema_validator';
import { OdpResponseSchema } from '../odp_response_schema';
import { ODP_USER_KEY } from '../../utils/enums';
import { RequestHandler, Response as HttpResponse } from '../../utils/http_request_handler/http';
import { Response as GraphQLResponse } from '../odp_types';

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
 * Standard message for audience querying fetch errors
 */
const AUDIENCE_FETCH_FAILURE_MESSAGE = 'Audience segments fetch failed';

/**
 * Manager for communicating with the Optimizely Data Platform GraphQL endpoint
 */
export interface IOdpSegmentApiManager {
  fetchSegments(
    apiKey: string,
    apiHost: string,
    userKey: string,
    userValue: string,
    segmentsToCheck: string[]
  ): Promise<string[] | null>;
}

/**
 * Concrete implementation for communicating with the ODP GraphQL endpoint
 */
export class OdpSegmentApiManager implements IOdpSegmentApiManager {
  private readonly logger: LogHandler;
  private readonly requestHandler: RequestHandler;

  /**
   * Communicates with Optimizely Data Platform's GraphQL endpoint
   * @param requestHandler Desired request handler for testing
   * @param logger Collect and record events/errors for this GraphQL implementation
   */
  constructor(requestHandler: RequestHandler, logger: LogHandler) {
    this.requestHandler = requestHandler;
    this.logger = logger;
  }

  /**
   * Retrieves the audience segments from ODP
   * @param apiKey ODP public key
   * @param apiHost Host of ODP endpoint
   * @param userKey 'vuid' or 'fs_user_id key'
   * @param userValue Associated value to query for the user key
   * @param segmentsToCheck Audience segments to check for experiment inclusion
   */
  async fetchSegments(
    apiKey: string,
    apiHost: string,
    userKey: ODP_USER_KEY,
    userValue: string,
    segmentsToCheck: string[]
  ): Promise<string[] | null> {
    if (!apiKey || !apiHost) {
      this.logger.log(LogLevel.ERROR, `${AUDIENCE_FETCH_FAILURE_MESSAGE} (Parameters apiKey or apiHost invalid)`);
      return null;
    }

    if (segmentsToCheck?.length === 0) {
      return EMPTY_SEGMENTS_COLLECTION;
    }

    const endpoint = `${apiHost}/v3/graphql`;
    const query = this.toGraphQLJson(userKey, userValue, segmentsToCheck);

    const segmentsResponse = await this.querySegments(apiKey, endpoint, userKey, userValue, query);
    if (!segmentsResponse) {
      this.logger.log(LogLevel.ERROR, `${AUDIENCE_FETCH_FAILURE_MESSAGE} (network error)`);
      return null;
    }

    const parsedSegments = this.parseSegmentsResponseJson(segmentsResponse);
    if (!parsedSegments) {
      this.logger.log(LogLevel.ERROR, `${AUDIENCE_FETCH_FAILURE_MESSAGE} (decode error)`);
      return null;
    }

    if (parsedSegments.errors?.length > 0) {
      const { code, classification } = parsedSegments.errors[0].extensions;

      if (code == 'INVALID_IDENTIFIER_EXCEPTION') {
        this.logger.log(LogLevel.ERROR, `${AUDIENCE_FETCH_FAILURE_MESSAGE} (invalid identifier)`);
      } else {
        this.logger.log(LogLevel.ERROR, `${AUDIENCE_FETCH_FAILURE_MESSAGE} (${classification})`);
      }

      return null;
    }

    const edges = parsedSegments?.data?.customer?.audiences?.edges;
    if (!edges) {
      this.logger.log(LogLevel.ERROR, `${AUDIENCE_FETCH_FAILURE_MESSAGE} (decode error)`);
      return null;
    }

    return edges.filter(edge => edge.node.state == QUALIFIED).map(edge => edge.node.name);
  }

  /**
   * Converts the query parameters to a GraphQL JSON payload
   * @returns GraphQL JSON string
   */
  private toGraphQLJson = (userKey: string, userValue: string, segmentsToCheck: string[]): string =>
    [
      '{"query" : "query {customer',
      `(${userKey} : \\"${userValue}\\") `,
      '{audiences',
      '(subset: [',
      ...(segmentsToCheck?.map(
        (segment, index) => `\\"${segment}\\"${index < segmentsToCheck.length - 1 ? ',' : ''}`
      ) || ''),
      ']) {edges {node {name state}}}}}"}',
    ].join('');

  /**
   * Handler for querying the ODP GraphQL endpoint
   * @param apiKey ODP API key
   * @param endpoint Fully-qualified GraphQL endpoint URL
   * @param userKey 'vuid' or 'fs_user_id'
   * @param userValue userKey's value
   * @param query GraphQL formatted query string
   * @returns JSON response string from ODP or null
   */
  private async querySegments(
    apiKey: string,
    endpoint: string,
    userKey: string,
    userValue: string,
    query: string
  ): Promise<string | null> {
    const method = 'POST';
    const url = endpoint;
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    };

    let response: HttpResponse;
    try {
      const request = this.requestHandler.makeRequest(url, headers, method, query);
      response = await request.responsePromise;
    } catch {
      return null;
    }

    return response.body;
  }

  /**
   * Parses JSON response
   * @param jsonResponse JSON response from ODP
   * @private
   * @returns Response Strongly-typed ODP Response object
   */
  private parseSegmentsResponseJson(jsonResponse: string): GraphQLResponse | null {
    let jsonObject = {};

    try {
      jsonObject = JSON.parse(jsonResponse);
    } catch {
      return EMPTY_JSON_RESPONSE;
    }

    if (validate(jsonObject, OdpResponseSchema, false)) {
      return jsonObject as GraphQLResponse;
    }

    return EMPTY_JSON_RESPONSE;
  }
}
