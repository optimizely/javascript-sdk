/**
 * Copyright 2016-2017, 2020, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/*eslint-disable */
/**
 * Project Config JSON Schema file used to validate the project json datafile
 */
 import { JSONSchema4 } from 'json-schema';

 var schemaDefinition = {
  $schema: 'http://json-schema.org/draft-04/schema#',
  type: 'object',
  properties: {
    projectId: {
      type: 'string',
      required: true,
    },
    accountId: {
      type: 'string',
      required: true,
    },
    groups: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            required: true,
          },
          policy: {
            type: 'string',
            required: true,
          },
          trafficAllocation: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                entityId: {
                  type: 'string',
                  required: true,
                },
                endOfRange: {
                  type: 'integer',
                  required: true,
                },
              },
            },
            required: true,
          },
          experiments: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  required: true,
                },
                key: {
                  type: 'string',
                  required: true,
                },
                status: {
                  type: 'string',
                  required: true,
                },
                layerId: {
                  type: 'string',
                  required: true,
                },
                variations: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: {
                        type: 'string',
                        required: true,
                      },
                      key: {
                        type: 'string',
                        required: true,
                      },
                    },
                  },
                  required: true,
                },
                trafficAllocation: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      entityId: {
                        type: 'string',
                        required: true,
                      },
                      endOfRange: {
                        type: 'integer',
                        required: true,
                      },
                    },
                  },
                  required: true,
                },
                audienceIds: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                  required: true,
                },
                forcedVariations: {
                  type: 'object',
                  required: true,
                },
              },
            },
            required: true,
          },
        },
      },
      required: true,
    },
    experiments: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            required: true,
          },
          key: {
            type: 'string',
            required: true,
          },
          status: {
            type: 'string',
            required: true,
          },
          layerId: {
            type: 'string',
            required: true,
          },
          variations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  required: true,
                },
                key: {
                  type: 'string',
                  required: true,
                },
              },
            },
            required: true,
          },
          trafficAllocation: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                entityId: {
                  type: 'string',
                  required: true,
                },
                endOfRange: {
                  type: 'integer',
                  required: true,
                },
              },
            },
            required: true,
          },
          audienceIds: {
            type: 'array',
            items: {
              type: 'string',
            },
            required: true,
          },
          forcedVariations: {
            type: 'object',
            required: true,
          },
        },
      },
      required: true,
    },
    events: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: {
            type: 'string',
            required: true,
          },
          experimentIds: {
            type: 'array',
            items: {
              type: 'string',
              required: true,
            },
          },
          id: {
            type: 'string',
            required: true,
          },
        },
      },
      required: true,
    },
    audiences: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            required: true,
          },
          name: {
            type: 'string',
            required: true,
          },
          conditions: {
            type: 'string',
            required: true,
          },
        },
      },
      required: true,
    },
    attributes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            required: true,
          },
          key: {
            type: 'string',
            required: true,
          },
        },
      },
      required: true,
    },
    version: {
      type: 'string',
      required: true,
    },
    revision: {
      type: 'string',
      required: true,
    },
  },
};

const schema = schemaDefinition as JSONSchema4

export default schema
