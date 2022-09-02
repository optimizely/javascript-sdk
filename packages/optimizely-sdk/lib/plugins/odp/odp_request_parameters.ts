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

export interface IOdpRequestParameters {
  apiKey: string | undefined;
  apiEndpoint: string | undefined;
  httpVerb: string;

  toGraphQLJson(): string;
}

export abstract class OdpRequestParameters implements IOdpRequestParameters {
  /**
   * Optimizely Data Platform API key
   */
  public apiKey: string | undefined;

  /**
   * Fully-qualified URL to ODP events endpoint
   */
  public apiEndpoint: string | undefined;

  /**
   * HTTP Verb used to send request
   */
  public abstract readonly httpVerb: string;

  /**
   * Method to convert object(s) into expected GraphQL JSON string
   */
  public abstract toGraphQLJson(): string;
}
