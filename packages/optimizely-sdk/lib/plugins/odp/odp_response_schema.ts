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

import { JSONSchema4 } from 'json-schema';

/**
 * ODP Response JSON Schema file used to validate the project json datafile
 */
const definition = {
  $schema: 'http://json-schema.org/draft-04/schema#',
  type: 'object',
  properties: {
    data: {
      type: 'object',
      required: true,
    },
    errors: {
      type: 'object',
      required: false,
    },
  },
};

export default definition as JSONSchema4
