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

export interface Response {
  data: Data;
  errors: Error[];
}

export interface Data {
  customer: Customer;
}

export interface Error {
  message: string;
  locations: Location[];
  path: string[];
  extensions: Extension;
}

export interface Customer {
  audiences: Audience;
}

export interface Location {
  line: number;
  column: number;
}

export interface Extension {
  classification: string;
}

export interface Audience {
  edges: Edge[];
}

export interface Edge {
  node: Node;
}

export interface Node {
  name: string;
  state: string;
}
