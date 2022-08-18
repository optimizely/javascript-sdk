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
  public ApiKey: string | undefined;

  /**
   * Fully-qualified URL to ODP endpoint
   */
  public ApiHost: string | undefined;

  /**
   * 'vuid' or 'fs_user_id' (client device id or fullstack id)
   */
  public UserKey: string | undefined;

  /**
   * Value for the user key
   */
  public UserValue: string | undefined;

  /**
   * Audience segments to check for inclusion in the experiment
   */
  public SegmentToCheck: string[] | undefined;

  constructor(parameters: { UserValue: string; ApiKey: string; UserKey: string; SegmentToCheck: string[]; ApiHost: string }) {
    Object.assign(this, parameters);
  }

  /**
   * Converts the QuerySegmentsParameters into JSON
   * @returns GraphQL JSON payload
   */
  public ToJson(): string {
    const segmentsArrayJson = JSON.stringify(this.SegmentToCheck);

    const json: string[] = [];
    json.push('{"query" : "query {customer"');
    json.push(`(${this.UserKey} : "${this.UserValue}") `);
    json.push('{audiences');
    json.push(`(subset: ${segmentsArrayJson})`);
    json.push('{edges {node {name state}}}}}"}');

    return json.join('');
  }
}
