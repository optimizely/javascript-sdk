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

/**
 * Handles parameters used in querying ODP segments
 */
export class QuerySegmentsParameters {
  /**
   * Optimizely Data Platform API key
   */
  public apiKey: string | undefined;

  /**
   * Fully-qualified URL to ODP endpoint
   */
  public apiHost: string | undefined;

  /**
   * 'vuid' or 'fs_user_id' (client device id or fullstack id)
   */
  public userKey: string | undefined;

  /**
   * Value for the user key
   */
  public userValue: string | undefined;

  /**
   * Audience segments to check for inclusion in the experiment
   */
  public segmentsToCheck: string[] | undefined;

  constructor(parameters: { apiKey: string, apiHost: string, userKey: string, userValue: string, segmentsToCheck: string[] }) {
    Object.assign(this, parameters);
  }

  /**
   * Converts the QuerySegmentsParameters to a GraphQL JSON payload
   * @returns GraphQL JSON string
   */
  public toGraphQLJson(): string {
    const segmentsArrayJson = JSON.stringify(this.segmentsToCheck);

    const json: string[] = [];
    json.push('{"query" : "query {customer"');
    json.push(`(${this.userKey} : "${this.userValue}") `);
    json.push('{audiences');
    json.push(`(subset: ${segmentsArrayJson})`);
    json.push('{edges {node {name state}}}}}"}');

    return json.join('');
  }
}
