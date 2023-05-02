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

/**
 * Wrapper around valid data and error responses
 */
export interface Response {
  data: Data;
  errors: Error[];
}

/**
 * GraphQL response data returned from a valid query
 */
export interface Data {
  customer: Customer;
}

/**
 * GraphQL response from an errant query
 */
export interface Error {
  message: string;
  locations: Location[];
  path: string[];
  extensions: Extension;
}

/**
 * Profile used to group/segment an addressable market
 */
export interface Customer {
  audiences: Audience;
}

/**
 * Specifies the precise place in code or data where the error occurred
 */
export interface Location {
  line: number;
  column: number;
}

/**
 * Extended error information
 */
export interface Extension {
  code: string;
  classification: string;
}

/**
 * Segment of a customer base
 */
export interface Audience {
  edges: Edge[];
}

/**
 * Grouping of nodes within an audience
 */
export interface Edge {
  node: Node;
}

/**
 * Atomic grouping an audience
 */
export interface Node {
  name: string;
  state: string;
}
