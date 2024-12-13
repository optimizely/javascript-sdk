/**
 * Copyright 2022, 2024, Optimizely
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
 * JSON Schema used to validate the ODP GraphQL response
 */
export const OdpResponseSchema = {
  $schema: 'https://json-schema.org/draft/2019-09/schema',
  $id: 'https://example.com/example.json',
  title: 'ODP Response Schema',
  type: 'object',
  required: [
    'data',
  ],
  properties: {
    data: {
      title: 'The data Schema',
      type: 'object',
      required: [
        'customer',
      ],
      properties: {
        customer: {
          title: 'The customer Schema',
          type: 'object',
          required: [],
          properties: {
            audiences: {
              title: 'The audiences Schema',
              type: 'object',
              required: [
                'edges',
              ],
              properties: {
                edges: {
                  title: 'The edges Schema',
                  type: 'array',
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
        required: [
          'message',
          'locations',
          'extensions',
        ],
        properties: {
          message: {
            title: 'The message Schema',
            type: 'string',
            examples: [
              'Exception while fetching data (/customer) : java.lang.RuntimeException: could not resolve _fs_user_id = asdsdaddddd',
            ],
          },
          locations: {
            title: 'The locations Schema',
            type: 'array',
            items: {
              title: 'A Schema',
              type: 'object',
              required: [
                'line',
                'column',
              ],
              properties: {
                line: {
                  title: 'The line Schema',
                  type: 'integer',
                  examples: [
                    2,
                  ],
                },
                column: {
                  title: 'The column Schema',
                  type: 'integer',
                  examples: [
                    3,
                  ],
                },
              },
              examples: [],
            },
            examples: [],
          },
          path: {
            title: 'The path Schema',
            type: 'array',
            items: {
              title: 'A Schema',
              type: 'string',
              examples: [
                'customer',
              ],
            },
            examples: [],
          },
          extensions: {
            title: 'The extensions Schema',
            type: 'object',
            required: [
              'classification',
            ],
            properties: {
              classification: {
                title: 'The classification Schema',
                type: 'string',
                examples: [
                  'InvalidIdentifierException',
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
} as JSONSchema4;
