/**
 * Copyright 2022, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { JSONSchema4 } from 'json-schema';

/**
 * ODP Response JSON Schema file used to validate the project json datafile
 */
const definition = {
  $schema: 'https://json-schema.org/draft/2019-09/schema',
  $id: 'http://example.com/example.json',
  title: 'Root Schema',
  type: 'object',
  default: {},
  required: [ ],  
  properties: {
    data: {
      title: 'The data Schema',
      type: 'object',
      default: {},
      required: [
        'customer',
      ],
      properties: {
        customer: {
          title: 'The customer Schema',
          type: 'object',
          default: {},
          required: [
            'audiences',
          ],
          properties: {
            audiences: {
              title: 'The audiences Schema',
              type: 'object',
              default: {},
              required: [
                'edges',
              ],
              properties: {
                edges: {
                  title: 'The edges Schema',
                  type: 'array',
                  default: [],
                  items: {
                    title: 'A Schema',
                    type: 'object',
                    required: [
                      'node',
                    ],
                    properties: {
                      node: {
                        title: 'The node Schema',
                        type: 'object',
                        required: [
                          'name',
                          'state',
                        ],
                        properties: {
                          name: {
                            title: 'The name Schema',
                            type: 'string',
                            examples: [
                              'has_email',
                              'has_email_opted_in',
                            ],
                          },
                          state: {
                            title: 'The state Schema',
                            type: 'string',
                            examples: [
                              'qualified',
                            ],
                          },
                        },
                        examples: [],
                      },
                    },
                    examples: [],
                  },
                  examples: [],
                },
              },
              examples: [],
            },
          },
          examples: [],
        },
      },
      examples: [],
    },
    errors: {
      title: 'The errors Schema',
      type: 'array',
      default: [],
      items: {
        title: 'A Schema',
        type: 'object',
        default: {},
        required: [
          'message',
          'extensions'
        ],
        properties: {
          message: {
            title: 'The message Schema',
            type: 'string',
            default: '',
            examples: [
              'Exception while fetching data (/customer) : java.lang.RuntimeException: could not resolve _fs_user_id = invalid-user'
            ]
          },
          extensions: {
            title: 'The extensions Schema',
            type: 'object',
            default: {},
            required: [
              'classification'
            ],
            properties: {
              classification: {
                title: 'The classification Schema',
                type: 'string',
                default: '',
                examples: [
                  'InvalidIdentifierException'
                ]
              }
            },
            examples: []
          }
        },
        examples: []
      },
      examples: []
    },
  },
  examples: [],
};

export default definition as JSONSchema4;
