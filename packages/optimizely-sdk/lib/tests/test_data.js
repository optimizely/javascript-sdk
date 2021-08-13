/**
 * Copyright 2016-2021, Optimizely
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
import cloneDeep from 'lodash/cloneDeep';

var config = {
  revision: '42',
  version: '2',
  events: [
    {
      key: 'testEvent',
      experimentIds: ['111127'],
      id: '111095',
    },
    {
      key: 'Total Revenue',
      experimentIds: ['111127'],
      id: '111096',
    },
    {
      key: 'testEventWithAudiences',
      experimentIds: ['122227'],
      id: '111097',
    },
    {
      key: 'testEventWithoutExperiments',
      experimentIds: [],
      id: '111098',
    },
    {
      key: 'testEventWithExperimentNotRunning',
      experimentIds: ['133337'],
      id: '111099',
    },
    {
      key: 'testEventWithMultipleExperiments',
      experimentIds: ['111127', '122227', '133337'],
      id: '111100',
    },
    {
      key: 'testEventLaunched',
      experimentIds: ['144447'],
      id: '111101',
    },
  ],
  groups: [
    {
      id: '666',
      policy: 'random',
      trafficAllocation: [
        {
          entityId: '442',
          endOfRange: 3000,
        },
        {
          entityId: '443',
          endOfRange: 6000,
        },
      ],
      experiments: [
        {
          id: '442',
          key: 'groupExperiment1',
          status: 'Running',
          variations: [
            {
              id: '551',
              key: 'var1exp1',
            },
            {
              id: '552',
              key: 'var2exp1',
            },
          ],
          trafficAllocation: [
            {
              entityId: '551',
              endOfRange: 5000,
            },
            {
              entityId: '552',
              endOfRange: 9000,
            },
            {
              entityId: '',
              endOfRange: 10000,
            },
          ],
          audienceIds: ['11154'],
          forcedVariations: {},
          layerId: '1',
        },
        {
          id: '443',
          key: 'groupExperiment2',
          status: 'Running',
          variations: [
            {
              id: '661',
              key: 'var1exp2',
            },
            {
              id: '662',
              key: 'var2exp2',
            },
          ],
          trafficAllocation: [
            {
              entityId: '661',
              endOfRange: 5000,
            },
            {
              entityId: '662',
              endOfRange: 10000,
            },
          ],
          audienceIds: [],
          forcedVariations: {},
          layerId: '2',
        },
      ],
    },
    {
      id: '667',
      policy: 'overlapping',
      trafficAllocation: [],
      experiments: [
        {
          id: '444',
          key: 'overlappingGroupExperiment1',
          status: 'Running',
          variations: [
            {
              id: '553',
              key: 'overlappingvar1',
            },
            {
              id: '554',
              key: 'overlappingvar2',
            },
          ],
          trafficAllocation: [
            {
              entityId: '553',
              endOfRange: 1500,
            },
            {
              entityId: '554',
              endOfRange: 3000,
            },
          ],
          audienceIds: [],
          forcedVariations: {},
          layerId: '3',
        },
      ],
    },
  ],
  experiments: [
    {
      key: 'testExperiment',
      status: 'Running',
      forcedVariations: {
        user1: 'control',
        user2: 'variation',
      },
      audienceIds: [],
      layerId: '4',
      trafficAllocation: [
        {
          entityId: '111128',
          endOfRange: 4000,
        },
        {
          entityId: '111129',
          endOfRange: 9000,
        },
      ],
      id: '111127',
      variations: [
        {
          key: 'control',
          id: '111128',
        },
        {
          key: 'variation',
          id: '111129',
        },
      ],
    },
    {
      key: 'testExperimentWithAudiences',
      status: 'Running',
      forcedVariations: {
        user1: 'controlWithAudience',
        user2: 'variationWithAudience',
      },
      audienceIds: ['11154'],
      layerId: '5',
      trafficAllocation: [
        {
          entityId: '122228',
          endOfRange: 4000,
        },
        {
          entityId: '122229',
          endOfRange: 10000,
        },
      ],
      id: '122227',
      variations: [
        {
          key: 'controlWithAudience',
          id: '122228',
        },
        {
          key: 'variationWithAudience',
          id: '122229',
        },
      ],
    },
    {
      key: 'testExperimentNotRunning',
      status: 'Not started',
      forcedVariations: {
        user1: 'controlNotRunning',
        user2: 'variationNotRunning',
      },
      audienceIds: [],
      layerId: '6',
      trafficAllocation: [
        {
          entityId: '133338',
          endOfRange: 4000,
        },
        {
          entityId: '133339',
          endOfRange: 10000,
        },
      ],
      id: '133337',
      variations: [
        {
          key: 'controlNotRunning',
          id: '133338',
        },
        {
          key: 'variationNotRunning',
          id: '133339',
        },
      ],
    },
    {
      key: 'testExperimentLaunched',
      status: 'Launched',
      forcedVariations: {},
      audienceIds: [],
      layerId: '7',
      trafficAllocation: [
        {
          entityId: '144448',
          endOfRange: 5000,
        },
        {
          entityId: '144449',
          endOfRange: 10000,
        },
      ],
      id: '144447',
      variations: [
        {
          key: 'controlLaunched',
          id: '144448',
        },
        {
          key: 'variationLaunched',
          id: '144449',
        },
      ],
    },
  ],
  accountId: '12001',
  attributes: [
    {
      key: 'browser_type',
      id: '111094',
    },
    {
      id: '323434545',
      key: 'boolean_key',
    },
    {
      id: '616727838',
      key: 'integer_key',
    },
    {
      id: '808797686',
      key: 'double_key',
    },
    {
      id: '808797687',
      key: 'valid_positive_number',
    },
    {
      id: '808797688',
      key: 'valid_negative_number',
    },
    {
      id: '808797689',
      key: 'invalid_number',
    },
    {
      id: '808797690',
      key: 'array',
    },
  ],
  audiences: [
    {
      name: 'Firefox users',
      conditions: '["and", ["or", ["or", {"name": "browser_type", "type": "custom_attribute", "value": "firefox"}]]]',
      id: '11154',
    },
  ],
  projectId: '111001',
};

var decideConfig = {
  version: '4',
  sendFlagDecisions: true,
  rollouts: [
    {
      experiments: [
        {
          audienceIds: [
            '13389130056'
          ],
          forcedVariations: {},
          id: '3332020515',
          key: '3332020515',
          layerId: '3319450668',
          status: 'Running',
          trafficAllocation: [
            {
              endOfRange: 10000,
              entityId: '3324490633'
            }
          ],
          variations: [
            {
              featureEnabled: true,
              id: '3324490633',
              key: '3324490633',
              variables: []
            }
          ]
        },
        {
          audienceIds: [
            '12208130097'
          ],
          forcedVariations: {},
          id: '3332020494',
          key: '3332020494',
          layerId: '3319450668',
          status: 'Running',
          trafficAllocation: [
            {
              endOfRange: 0,
              entityId: '3324490562'
            }
          ],
          variations: [
            {
              featureEnabled: true,
              id: '3324490562',
              key: '3324490562',
              variables: []
            }
          ]
        },
        {
          status: 'Running',
          audienceIds: [],
          variations: [
            {
              variables: [],
              id: '18257766532',
              key: '18257766532',
              featureEnabled: true
            }
          ],
          id: '18322080788',
          key: '18322080788',
          layerId: '18263344648',
          trafficAllocation: [
            {
              entityId: '18257766532',
              endOfRange: 10000
            }
          ],
          forcedVariations: {}
        }
      ],
      id: '3319450668'
    }
  ],
  anonymizeIP: true,
  botFiltering: true,
  sdkKey: 'ValidProjectConfigV4',
  environmentKey: 'production',
  projectId: '10431130345',
  variables: [],
  featureFlags: [
    {
      experimentIds: [
        '10390977673'
      ],
      id: '4482920077',
      key: 'feature_1',
      rolloutId: '3319450668',
      variables: [
        {
          defaultValue: '42',
          id: '2687470095',
          key: 'i_42',
          type: 'integer'
        },
        {
          defaultValue: '4.2',
          id: '2689280165',
          key: 'd_4_2',
          type: 'double'
        },
        {
          defaultValue: 'true',
          id: '2689660112',
          key: 'b_true',
          type: 'boolean'
        },
        {
          defaultValue: 'foo',
          id: '2696150066',
          key: 's_foo',
          type: 'string'
        },
        {
          defaultValue: {
            value: 1
          },
          id: '2696150067',
          key: 'j_1',
          type: 'string',
          subType: 'json'
        },
        {
          defaultValue: 'invalid',
          id: '2696150068',
          key: 'i_1',
          type: 'invalid',
          subType: ''
        }
      ]
    },
    {
      experimentIds: [
        '10420810910'
      ],
      id: '4482920078',
      key: 'feature_2',
      rolloutId: '',
      variables: [
        {
          defaultValue: '42',
          id: '2687470095',
          key: 'i_42',
          type: 'integer'
        }
      ]
    },
    {
      experimentIds: [],
      id: '44829230000',
      key: 'feature_3',
      rolloutId: '',
      variables: []
    }
  ],
  experiments: [
    {
      status: 'Running',
      key: 'exp_with_audience',
      layerId: '10420273888',
      trafficAllocation: [
        {
          entityId: '10389729780',
          endOfRange: 10000
        }
      ],
      audienceIds: [
        '13389141123'
      ],
      variations: [
        {
          variables: [],
          featureEnabled: true,
          id: '10389729780',
          key: 'a'
        },
        {
          variables: [],
          id: '10416523121',
          key: 'b'
        }
      ],
      forcedVariations: {},
      id: '10390977673'
    },
    {
      status: 'Running',
      key: 'exp_no_audience',
      layerId: '10417730432',
      trafficAllocation: [
        {
          entityId: '10418551353',
          endOfRange: 10000
        }
      ],
      audienceIds: [],
      variations: [
        {
          variables: [],
          featureEnabled: true,
          id: '10418551353',
          key: 'variation_with_traffic'
        },
        {
          variables: [],
          featureEnabled: false,
          id: '10418510624',
          key: 'variation_no_traffic'
        }
      ],
      forcedVariations: {},
      id: '10420810910'
    }
  ],
  audiences: [
    {
      id: '13389141123',
      conditions: '["and",["or",["or",{ "match": "exact", "name": "gender", "type": "custom_attribute", "value": "f"}]]]',
      name: 'gender'
    },
    {
      id: '13389130056',
      conditions: '["and",["or",["or",{ "match": "exact","name": "country","type": "custom_attribute","value": "US"}]]]',
      name: 'US'
    },
    {
      id: '12208130097',
      conditions: '["and",["or",["or",{"match": "exact","name": "browser","type": "custom_attribute","value": "safari"}]]]',
      name: 'safari'
    },
    {
      id: "age_18",
      conditions: '["and",["or",["or",{"match": "gt","name": "age","type": "custom_attribute","value": 18}]]]',
      name: 'age_18'
    },
    {
      id: 'invalid_format',
      conditions: '[]',
      name: 'invalid_format'
    },
    {
      id: 'invalid_condition',
      conditions: '["and",["or",["or",{"match": "gt","name": "age","type": "custom_attribute","value": "US"}]]]',
      name: 'invalid_condition'
    },
    {
      id: 'invalid_type',
      conditions: '["and",["or",["or",{"match": "gt","name": "age","type": "invalid","value": 18}]]]',
      name: 'invalid_type'
    },
    {
      id: 'invalid_match',
      conditions: '["and",["or",["or",{"match": "invalid","name": "age","type": "custom_attribute","value": 18}]]]',
      name: 'invalid_match'
    },
    {
      id: 'nil_value',
      conditions: '["and",["or",["or",{"match": "gt","name": "age","type": "custom_attribute"}]]]',
      name: 'nil_value'
    },
    {
      id: 'invalid_name',
      conditions: '["and",["or",["or",{"match": "gt","type": "custom_attribute","value": 18}]]]',
      name: 'invalid_name'
    }
  ],
  groups: [
    {
      policy: 'random',
      trafficAllocation: [
        {
          entityId: '10390965532',
          endOfRange: 10000
        }
      ],
      experiments: [
        {
          status: 'Running',
          key: 'group_exp_1',
          layerId: '10420222423',
          trafficAllocation: [
            {
              entityId: '10389752311',
              endOfRange: 10000
            }
          ],
          audienceIds: [],
          variations: [
            {
              variables: [],
              featureEnabled: false,
              id: '10389752311',
              key: 'a'
            }
          ],
          forcedVariations: {},
          id: '10390965532'
        },
        {
          status: 'Running',
          key: 'group_exp_2',
          layerId: '10417730432',
          trafficAllocation: [
            {
              entityId: '10418524243',
              endOfRange: 10000
            }
          ],
          audienceIds: [],
          variations: [
            {
              variables: [],
              featureEnabled: false,
              id: '10418524243',
              key: 'a'
            }
          ],
          forcedVariations: {},
          id: '10420843432'
        }
      ],
      id: '13142870430'
    }
  ],
  attributes: [
    {
      id: '10401066117',
      key: 'gender'
    },
    {
      id: '10401066170',
      key: 'testvar'
    }
  ],
  accountId: '10367498574',
  events: [
    {
      experimentIds: [
        '10420810910'
      ],
      id: '10404198134',
      key: 'event1'
    },
    {
      experimentIds: [
        '10420810910',
        '10390977673'
      ],
      id: '10404198135',
      key: 'event_multiple_running_exp_attached'
    }
  ],
  revision: '241'
};

export var getParsedAudiences = [
  {
    name: 'Firefox users',
    conditions: ['and', ['or', ['or', { name: 'browser_type', type: 'custom_attribute', value: 'firefox' }]]],
    id: '11154',
  },
];

export var getTestProjectConfig = function() {
  return cloneDeep(config);
};

export var getTestDecideProjectConfig = function() {
  return cloneDeep(decideConfig);
};

var configWithFeatures = {
  events: [
    {
      key: 'item_bought',
      id: '594089',
      experimentIds: ['594098', '595010', '599028', '599082'],
    },
  ],
  featureFlags: [
    {
      rolloutId: '594030',
      key: 'test_feature',
      id: '594021',
      experimentIds: [],
      variables: [
        {
          type: 'boolean',
          key: 'new_content',
          id: '4919852825313280',
          defaultValue: 'false',
        },
        {
          type: 'integer',
          key: 'lasers',
          id: '5482802778734592',
          defaultValue: '400',
        },
        {
          type: 'double',
          key: 'price',
          id: '6045752732155904',
          defaultValue: '14.99',
        },
        {
          type: 'string',
          key: 'message',
          id: '6327227708866560',
          defaultValue: 'Hello',
        },
        {
          type: 'string',
          subType: 'json',
          key: 'message_info',
          id: '8765345281230956',
          defaultValue: '{ "count": 1, "message": "Hello" }',
        },
      ],
    },
    {
      rolloutId: '594059',
      key: 'test_feature_2',
      id: '594050',
      experimentIds: [],
      variables: [
        {
          type: 'double',
          key: 'miles_to_the_wall',
          id: '5060590313668608',
          defaultValue: '30.34',
        },
        {
          type: 'string',
          key: 'motto',
          id: '5342065290379264',
          defaultValue: 'Winter is coming',
        },
        {
          type: 'integer',
          key: 'soldiers_available',
          id: '6186490220511232',
          defaultValue: '1000',
        },
        {
          type: 'boolean',
          key: 'is_winter_coming',
          id: '6467965197221888',
          defaultValue: 'true',
        },
      ],
    },
    {
      rolloutId: '',
      key: 'test_feature_for_experiment',
      id: '594081',
      experimentIds: ['594098'],
      variables: [
        {
          type: 'integer',
          key: 'num_buttons',
          id: '4792309476491264',
          defaultValue: '10',
        },
        {
          type: 'boolean',
          key: 'is_button_animated',
          id: '5073784453201920',
          defaultValue: 'false',
        },
        {
          type: 'string',
          key: 'button_txt',
          id: '5636734406623232',
          defaultValue: 'Buy me',
        },        
        {
          type: 'double',
          key: 'button_width',
          id: '6199684360044544',
          defaultValue: '50.55',
        },
        {
          type: 'string',
          subType: 'json',
          key: 'button_info',
          id: '1547854156498475',
          defaultValue: '{ "num_buttons": 0, "text": "default value"}',
        },
      ],
    },
    {
      rolloutId: '',
      key: 'feature_with_group',
      id: '595001',
      experimentIds: ['595010'],
      variables: [],
    },
    {
      rolloutId: '599055',
      key: 'shared_feature',
      id: '599011',
      experimentIds: ['599028'],
      variables: [
        {
          type: 'integer',
          key: 'lasers',
          id: '4937719889264640',
          defaultValue: '100',
        },
        {
          type: 'string',
          key: 'message',
          id: '6345094772817920',
          defaultValue: 'shared',
        },
      ],
    },
    {
      rolloutId: '',
      key: 'unused_flag',
      id: '599110',
      experimentIds: [],
      variables: [],
    },
    {
      rolloutId: '',
      key: 'feature_exp_no_traffic',
      id: '4482920079',
      experimentIds: ['12115595439'],
      variables: [],
    },
    {
      id: '91115',
      key: 'test_feature_in_exclusion_group',
      experimentIds: ['42222', '42223', '42224'],
      rolloutId: '594059',
      variables: [],
    },
    {
      id: '91116',
      key: 'test_feature_in_multiple_experiments',
      experimentIds: ['111134', '111135', '111136'],
      rolloutId: '594059',
      variables: [],
    },
  ],
  experiments: [
    {
      trafficAllocation: [
        {
          endOfRange: 5000,
          entityId: '594096',
        },
        {
          endOfRange: 10000,
          entityId: '594097',
        },
      ],
      layerId: '594093',
      forcedVariations: {},
      audienceIds: [],
      variations: [
        {
          key: 'variation',
          id: '594096',
          featureEnabled: true,
          variables: [
            {
              id: '4792309476491264',
              value: '2',
            },
            {
              id: '5073784453201920',
              value: 'true',
            },
            {
              id: '5636734406623232',
              value: 'Buy me NOW',
            },
            {
              id: '6199684360044544',
              value: '20.25',
            },
            {
              id: '1547854156498475',
              value: '{ "num_buttons": 1, "text": "first variation"}',
            },
          ],
        },
        {
          key: 'control',
          id: '594097',
          featureEnabled: true,
          variables: [
            {
              id: '4792309476491264',
              value: '10',
            },
            {
              id: '5073784453201920',
              value: 'false',
            },
            {
              id: '5636734406623232',
              value: 'Buy me',
            },
            {
              id: '6199684360044544',
              value: '50.55',
            },
            {
              id: '1547854156498475',
              value: '{ "num_buttons": 2, "text": "second variation"}',
            },
          ],
        },
        {
          key: 'variation2',
          id: '594099',
          featureEnabled: false,
          variables: [
            {
              id: '4792309476491264',
              value: '40',
            },
            {
              id: '5073784453201920',
              value: 'true',
            },
            {
              id: '5636734406623232',
              value: 'Buy me Later',
            },
            {
              id: '6199684360044544',
              value: '99.99',
            },
            {
              id: '1547854156498475',
              value: '{ "num_buttons": 3, "text": "third variation"}',
            },
          ],
        },
      ],
      status: 'Running',
      key: 'testing_my_feature',
      id: '594098',
    },
    {
      trafficAllocation: [
        {
          endOfRange: 5000,
          entityId: '599026',
        },
        {
          endOfRange: 10000,
          entityId: '599027',
        },
      ],
      layerId: '599023',
      forcedVariations: {},
      audienceIds: ['594017'],
      variations: [
        {
          key: 'treatment',
          id: '599026',
          featureEnabled: true,
          variables: [
            {
              id: '4937719889264640',
              value: '100',
            },
            {
              id: '6345094772817920',
              value: 'shared',
            },
          ],
        },
        {
          key: 'control',
          id: '599027',
          featureEnabled: false,
          variables: [
            {
              id: '4937719889264640',
              value: '100',
            },
            {
              id: '6345094772817920',
              value: 'shared',
            },
          ],
        },
      ],
      status: 'Running',
      key: 'test_shared_feature',
      id: '599028',
    },
    {
      key: 'test_experiment3',
      status: 'Running',
      layerId: '6',
      audienceConditions : [
        "or",
        "11160"
      ],
      audienceIds: ['11160'],
      id: '111134',
      forcedVariations: {},
      trafficAllocation: [
        {
          entityId: '222239',
          endOfRange: 2500
        },
        {
          entityId: '',
          endOfRange: 5000
        },
        {
          entityId: '',
          endOfRange: 7500
        },
        {
          entityId: '',
          endOfRange: 10000
        }
      ],
      variations: [
        {
          id: '222239',
          key: 'control',
          variables: [],
          featureEnabled: false,
        }
      ],
    },
    {
      key: 'test_experiment4',
      status: 'Running',
      layerId: '7',
      audienceConditions: [
        "or",
        "11160"
      ],
      audienceIds: ['11160'],
      id: '111135',
      forcedVariations: {},
      trafficAllocation: [
        {
          entityId: '222240',
          endOfRange: 5000
        },
        {
          entityId: '',
          endOfRange: 7500
        },
        {
          entityId: '',
          endOfRange: 10000
        }
      ],
      variations: [
        {
          id: '222240',
          key: 'control',
          variables: [],
          featureEnabled: false,
        }
      ],
    },
    {
      key: 'test_experiment5',
      status: 'Running',
      layerId: '8',
      audienceConditions: [
          "or",
          "11160"
      ],
      audienceIds: ['11160'],
      id: '111136',
      forcedVariations: {},
      trafficAllocation: [
        {
          entityId: '222241',
          endOfRange: 7500
        },
        {
          entityId: '',
          endOfRange: 10000
        }
      ],
      variations: [
        {
          id: '222241',
          key: 'control',
          variables: [],
          featureEnabled: false,
        }
      ],
    },
  ],
  anonymizeIP: true,
  botFiltering: true,
  sdkKey: 'ValidProjectConfigV4',
  environmentKey: 'development',
  audiences: [
    {
      id: '594017',
      name: 'test_audience',
      conditions:
        '["and", ["or", ["or", {"type": "custom_attribute", "name": "test_attribute", "value": "test_value"}]]]',
    },
    {
      id: '11160',
      name: 'Test attribute users 3',
      conditions:
      '["and", ["or", ["or", {"match": "exact", "name": "experiment_attr", "type": "custom_attribute", "value": "group_experiment"}]]]',
  }
  ],
  revision: '35',
  groups: [
    {
      policy: 'random',
      id: '595024',
      experiments: [
        {
          trafficAllocation: [
            {
              endOfRange: 5000,
              entityId: '595008',
            },
            {
              endOfRange: 10000,
              entityId: '595009',
            },
          ],
          layerId: '595005',
          forcedVariations: {},
          audienceIds: [],
          variations: [
            {
              key: 'var',
              id: '595008',
              variables: [],
            },
            {
              key: 'con',
              id: '595009',
              variables: [],
            },
          ],
          status: 'Running',
          key: 'exp_with_group',
          id: '595010',
        },
        {
          trafficAllocation: [
            {
              endOfRange: 5000,
              entityId: '599080',
            },
            {
              endOfRange: 10000,
              entityId: '599081',
            },
          ],
          layerId: '599077',
          forcedVariations: {},
          audienceIds: [],
          variations: [
            {
              key: 'treatment',
              id: '599080',
              variables: [],
            },
            {
              key: 'control',
              id: '599081',
              variables: [],
            },
          ],
          status: 'Running',
          key: 'other_exp_with_grup',
          id: '599082',
        },
      ],
      trafficAllocation: [
        {
          endOfRange: 5000,
          entityId: '595010',
        },
        {
          endOfRange: 10000,
          entityId: '599082',
        },
      ],
    },
    {
      policy: 'random',
      id: '595025',
      experiments: [
        {
          trafficAllocation: [
            {
              endOfRange: 10000,
              entityId: '12098126627',
            },
          ],
          layerId: '595005',
          forcedVariations: {},
          audienceIds: [],
          variations: [
            {
              key: 'all_traffic_variation',
              id: '12098126627',
              variables: [],
            },
            {
              key: 'no_traffic_variation',
              id: '12098126628',
              variables: [],
            },
          ],
          status: 'Running',
          key: 'all_traffic_experiment',
          id: '12198292375',
        },
        {
          trafficAllocation: [
            {
              endOfRange: 5000,
              entityId: '12098126629',
            },
            {
              endOfRange: 10000,
              entityId: '12098126630',
            },
          ],
          layerId: '12187694826',
          forcedVariations: {},
          audienceIds: [],
          variations: [
            {
              key: 'variation_5000',
              id: '12098126629',
              variables: [],
            },
            {
              key: 'variation_10000',
              id: '12098126630',
              variables: [],
            },
          ],
          status: 'Running',
          key: 'no_traffic_experiment',
          id: '12115595439',
        },
      ],
      trafficAllocation: [
        {
          endOfRange: 10000,
          entityId: '12198292375',
        },
      ],
    },
    {
      id: '19229',
      policy: 'random',
      experiments: [
        {
          id: '42222',
          key: 'group_2_exp_1',
          status: 'Running',
          audienceConditions: [
              "or",
              "11160"
          ],
          audienceIds: ['11160'],
          layerId: '211183',
          variations: [
              {
                key: 'var_1',
                id: '38901',
                featureEnabled: false,
              },
          ],
          forcedVariations: {},
          trafficAllocation: [
            {
              entityId: '38901',
              endOfRange: 10000
            }
          ],
          variationKeyMap: {
            var_1: {
              key: 'var_1',
              id: '38901',
              featureEnabled: false,
            }
          }
        },
        {
          id: '42223',
          key: 'group_2_exp_2',
          status: 'Running',
          audienceConditions: [
              "or",
              "11160"
          ],
          audienceIds: ['11160'],
          layerId: '211184',
          variations: [
            {
              key: 'var_1',
              id: '38905',
              featureEnabled: false,
            },
          ],
          forcedVariations: {},
          trafficAllocation: [
            {
              entityId: '38905',
              endOfRange: 10000
            }
          ],
        },
        {
          id: '42224',
          key: 'group_2_exp_3',
          status: 'Running',
          audienceConditions: [
              "or",
              "11160"
          ],
          audienceIds: ['11160'],
          layerId: '211185',
          variations: [
            {
              key: 'var_1',
              id: '38906',
              featureEnabled: false,
            },
          ],
          forcedVariations: {},
          trafficAllocation: [
            {
              entityId: '38906',
              endOfRange: 10000
            }
          ],
        }
      ],
      trafficAllocation: [
        {
          entityId: '42222',
          endOfRange: 2500
        },
        {
          entityId: '42223',
          endOfRange: 5000
        },
        {
          entityId: '42224',
          endOfRange: 7500
        },
        {
          entityId: '',
          endOfRange: 10000
        },
      ],
    }
  ],
  attributes: [
    {
      key: 'test_attribute',
      id: '594014',
    },
  ],
  rollouts: [
    {
      id: '594030',
      experiments: [
        {
          trafficAllocation: [
            {
              endOfRange: 5000,
              entityId: '594032',
            },
          ],
          layerId: '594030',
          forcedVariations: {},
          audienceIds: ['594017'],
          variations: [
            {
              key: '594032',
              id: '594032',
              featureEnabled: true,
              variables: [
                {
                  id: '4919852825313280',
                  value: 'true',
                },
                {
                  id: '5482802778734592',
                  value: '395',
                },
                {
                  id: '6045752732155904',
                  value: '4.99',
                },
                {
                  id: '6327227708866560',
                  value: 'Hello audience',
                },
                {
                  id: "8765345281230956",
                  value: '{ "count": 2, "message": "Hello audience" }',
                }
              ],
            },
          ],
          status: 'Not started',
          key: '594031',
          id: '594031',
        },
        {
          trafficAllocation: [
            {
              endOfRange: 0,
              entityId: '594038',
            },
          ],
          layerId: '594030',
          forcedVariations: {},
          audienceIds: [],
          variations: [
            {
              key: '594038',
              id: '594038',
              featureEnabled: false,
              variables: [
                {
                  id: '4919852825313280',
                  value: 'false',
                },
                {
                  id: '5482802778734592',
                  value: '400',
                },
                {
                  id: '6045752732155904',
                  value: '14.99',
                },
                {
                  id: '6327227708866560',
                  value: 'Hello',
                },
                {
                  id: '8765345281230956',
                  value: '{ "count": 1, "message": "Hello" }',
                }
              ],
            },
          ],
          status: 'Not started',
          key: '594037',
          id: '594037',
        },
      ],
    },
    {
      id: '594059',
      experiments: [
        {
          trafficAllocation: [
            {
              endOfRange: 10000,
              entityId: '594061',
            },
          ],
          layerId: '594059',
          forcedVariations: {},
          audienceIds: ['594017'],
          variations: [
            {
              key: '594061',
              id: '594061',
              featureEnabled: true,
              variables: [
                {
                  id: '5060590313668608',
                  value: '27.34',
                },
                {
                  id: '5342065290379264',
                  value: 'Winter is NOT coming',
                },
                {
                  id: '6186490220511232',
                  value: '10003',
                },
                {
                  id: '6467965197221888',
                  value: 'false',
                },
              ],
            },
          ],
          status: 'Not started',
          key: '594060',
          id: '594060',
        },
        {
          trafficAllocation: [
            {
              endOfRange: 10000,
              entityId: '594067',
            },
          ],
          layerId: '594059',
          forcedVariations: {},
          audienceIds: [],
          variations: [
            {
              key: '594067',
              id: '594067',
              featureEnabled: true,
              variables: [
                {
                  id: '5060590313668608',
                  value: '30.34',
                },
                {
                  id: '5342065290379264',
                  value: 'Winter is coming definitely',
                },
                {
                  id: '6186490220511232',
                  value: '500',
                },
                {
                  id: '6467965197221888',
                  value: 'true',
                },
              ],
            },
          ],
          status: 'Not started',
          key: '594066',
          id: '594066',
        },
      ],
    },
    {
      id: '599055',
      experiments: [
        {
          trafficAllocation: [
            {
              endOfRange: 10000,
              entityId: '599057',
            },
          ],
          layerId: '599055',
          forcedVariations: {},
          audienceIds: [],
          variations: [
            {
              key: '599057',
              id: '599057',
              featureEnabled: true,
              variables: [
                {
                  id: '4937719889264640',
                  value: '200',
                },
                {
                  id: '6345094772817920',
                  value: "i'm a rollout",
                },
              ],
            },
          ],
          status: 'Not started',
          key: '599056',
          id: '599056',
        },
      ],
    },
  ],
  projectId: '594001',
  accountId: '572018',
  version: '4',
  variables: [],
};

export var getTestProjectConfigWithFeatures = function() {
  return cloneDeep(configWithFeatures);
};

export var datafileWithFeaturesExpectedData = {
  rolloutIdMap: {
    599055: {
      id: '599055',
      experiments: [
        {
          trafficAllocation: [
            {
              endOfRange: 10000,
              entityId: '599057',
            },
          ],
          layerId: '599055',
          forcedVariations: {},
          audienceIds: [],
          variations: [
            {
              key: '599057',
              id: '599057',
              featureEnabled: true,
              variables: [
                {
                  id: '4937719889264640',
                  value: '200',
                },
                {
                  id: '6345094772817920',
                  value: "i'm a rollout",
                },
              ],
            },
          ],
          status: 'Not started',
          key: '599056',
          id: '599056',
          variationKeyMap: {
            599057: {
              key: '599057',
              id: '599057',
              featureEnabled: true,
              variables: [
                {
                  id: '4937719889264640',
                  value: '200',
                },
                {
                  id: '6345094772817920',
                  value: "i'm a rollout",
                },
              ],
            },
          },
        },
      ],
    },
    594030: {
      experiments: [
        {
          audienceIds: ['594017'],
          status: 'Not started',
          layerId: '594030',
          forcedVariations: {},
          variations: [
            {
              variables: [
                {
                  value: 'true',
                  id: '4919852825313280',
                },
                {
                  value: '395',
                  id: '5482802778734592',
                },
                {
                  value: '4.99',
                  id: '6045752732155904',
                },
                {
                  value: 'Hello audience',
                  id: '6327227708866560',
                },
                {
                  id: '8765345281230956',
                  value: '{ "count": 2, "message": "Hello audience" }',
                },
              ],
              featureEnabled: true,
              key: '594032',
              id: '594032',
            },
          ],
          trafficAllocation: [
            {
              entityId: '594032',
              endOfRange: 5000,
            },
          ],
          key: '594031',
          id: '594031',
          variationKeyMap: {
            594032: {
              variables: [
                {
                  value: 'true',
                  id: '4919852825313280',
                },
                {
                  value: '395',
                  id: '5482802778734592',
                },
                {
                  value: '4.99',
                  id: '6045752732155904',
                },
                {
                  value: 'Hello audience',
                  id: '6327227708866560',
                },
                {
                  id: '8765345281230956',
                  value: '{ "count": 2, "message": "Hello audience" }',
                },
              ],
              featureEnabled: true,
              key: '594032',
              id: '594032',
            },
          },
        },
        {
          audienceIds: [],
          status: 'Not started',
          layerId: '594030',
          forcedVariations: {},
          variations: [
            {
              variables: [
                {
                  value: 'false',
                  id: '4919852825313280',
                },
                {
                  value: '400',
                  id: '5482802778734592',
                },
                {
                  value: '14.99',
                  id: '6045752732155904',
                },
                {
                  value: 'Hello',
                  id: '6327227708866560',
                },
                {
                  id: '8765345281230956',
                  value: '{ "count": 1, "message": "Hello" }',
                },
              ],
              featureEnabled: false,
              key: '594038',
              id: '594038',
            },
          ],
          trafficAllocation: [
            {
              entityId: '594038',
              endOfRange: 0,
            },
          ],
          key: '594037',
          id: '594037',
          variationKeyMap: {
            594038: {
              variables: [
                {
                  value: 'false',
                  id: '4919852825313280',
                },
                {
                  value: '400',
                  id: '5482802778734592',
                },
                {
                  value: '14.99',
                  id: '6045752732155904',
                },
                {
                  value: 'Hello',
                  id: '6327227708866560',
                },
                {
                  id: '8765345281230956',
                  value: '{ "count": 1, "message": "Hello" }',
                },
              ],
              featureEnabled: false,
              key: '594038',
              id: '594038',
            },
          },
        },
      ],
      id: '594030',
    },
    594059: {
      experiments: [
        {
          audienceIds: ['594017'],
          status: 'Not started',
          layerId: '594059',
          forcedVariations: {},
          variations: [
            {
              variables: [
                {
                  value: '27.34',
                  id: '5060590313668608',
                },
                {
                  value: 'Winter is NOT coming',
                  id: '5342065290379264',
                },
                {
                  value: '10003',
                  id: '6186490220511232',
                },
                {
                  value: 'false',
                  id: '6467965197221888',
                },
              ],
              featureEnabled: true,
              key: '594061',
              id: '594061',
            },
          ],
          trafficAllocation: [
            {
              entityId: '594061',
              endOfRange: 10000,
            },
          ],
          key: '594060',
          id: '594060',
          variationKeyMap: {
            594061: {
              variables: [
                {
                  value: '27.34',
                  id: '5060590313668608',
                },
                {
                  value: 'Winter is NOT coming',
                  id: '5342065290379264',
                },
                {
                  value: '10003',
                  id: '6186490220511232',
                },
                {
                  value: 'false',
                  id: '6467965197221888',
                },
              ],
              featureEnabled: true,
              key: '594061',
              id: '594061',
            },
          },
        },
        {
          audienceIds: [],
          status: 'Not started',
          layerId: '594059',
          forcedVariations: {},
          variations: [
            {
              variables: [
                {
                  value: '30.34',
                  id: '5060590313668608',
                },
                {
                  value: 'Winter is coming definitely',
                  id: '5342065290379264',
                },
                {
                  value: '500',
                  id: '6186490220511232',
                },
                {
                  value: 'true',
                  id: '6467965197221888',
                },
              ],
              featureEnabled: true,
              key: '594067',
              id: '594067',
            },
          ],
          trafficAllocation: [
            {
              entityId: '594067',
              endOfRange: 10000,
            },
          ],
          key: '594066',
          id: '594066',
          variationKeyMap: {
            594067: {
              variables: [
                {
                  value: '30.34',
                  id: '5060590313668608',
                },
                {
                  value: 'Winter is coming definitely',
                  id: '5342065290379264',
                },
                {
                  value: '500',
                  id: '6186490220511232',
                },
                {
                  value: 'true',
                  id: '6467965197221888',
                },
              ],
              featureEnabled: true,
              key: '594067',
              id: '594067',
            },
          },
        },
      ],
      id: '594059',
    },
  },

  variationVariableUsageMap: {
    222239: {},
    222240: {},
    222241: {},
    594032: {
      4919852825313280: {
        id: '4919852825313280',
        value: 'true',
      },
      5482802778734592: {
        id: '5482802778734592',
        value: '395',
      },
      6045752732155904: {
        id: '6045752732155904',
        value: '4.99',
      },
      6327227708866560: {
        id: '6327227708866560',
        value: 'Hello audience',
      },
      8765345281230956: {
        id:'8765345281230956',
        value: '{ "count": 2, "message": "Hello audience" }',
      }
    },
    594038: {
      4919852825313280: {
        id: '4919852825313280',
        value: 'false',
      },
      5482802778734592: {
        id: '5482802778734592',
        value: '400',
      },
      6045752732155904: {
        id: '6045752732155904',
        value: '14.99',
      },
      6327227708866560: {
        id: '6327227708866560',
        value: 'Hello',
      },
      8765345281230956: {
        id:'8765345281230956',
        value: '{ "count": 1, "message": "Hello" }',
      }
    },
    594061: {
      5060590313668608: {
        id: '5060590313668608',
        value: '27.34',
      },
      5342065290379264: {
        id: '5342065290379264',
        value: 'Winter is NOT coming',
      },
      6186490220511232: {
        id: '6186490220511232',
        value: '10003',
      },
      6467965197221888: {
        id: '6467965197221888',
        value: 'false',
      },
    },
    594067: {
      5060590313668608: {
        id: '5060590313668608',
        value: '30.34',
      },
      5342065290379264: {
        id: '5342065290379264',
        value: 'Winter is coming definitely',
      },
      6186490220511232: {
        id: '6186490220511232',
        value: '500',
      },
      6467965197221888: {
        id: '6467965197221888',
        value: 'true',
      },
    },
    594096: {
      4792309476491264: {
        value: '2',
        id: '4792309476491264',
      },
      5073784453201920: {
        value: 'true',
        id: '5073784453201920',
      },
      5636734406623232: {
        value: 'Buy me NOW',
        id: '5636734406623232',
      },
      6199684360044544: {
        value: '20.25',
        id: '6199684360044544',
      },
      1547854156498475: {
        id:'1547854156498475',
        value: '{ "num_buttons": 1, "text": "first variation"}',
      },
    },
    594097: {
      4792309476491264: {
        value: '10',
        id: '4792309476491264',
      },
      5073784453201920: {
        value: 'false',
        id: '5073784453201920',
      },
      5636734406623232: {
        value: 'Buy me',
        id: '5636734406623232',
      },
      6199684360044544: {
        value: '50.55',
        id: '6199684360044544',
      },
      1547854156498475: {
        id:'1547854156498475',
        value: '{ "num_buttons": 2, "text": "second variation"}',
      },
    },
    594099: {
      4792309476491264: {
        value: '40',
        id: '4792309476491264',
      },
      5073784453201920: {
        value: 'true',
        id: '5073784453201920',
      },
      5636734406623232: {
        value: 'Buy me Later',
        id: '5636734406623232',
      },
      6199684360044544: {
        value: '99.99',
        id: '6199684360044544',
      },
      1547854156498475: {
        id:'1547854156498475',
        value: '{ "num_buttons": 3, "text": "third variation"}',
      },
    },
    595008: {},
    595009: {},
    599026: {
      4937719889264640: {
        id: '4937719889264640',
        value: '100',
      },
      6345094772817920: {
        id: '6345094772817920',
        value: 'shared',
      },
    },
    599027: {
      4937719889264640: {
        id: '4937719889264640',
        value: '100',
      },
      6345094772817920: {
        id: '6345094772817920',
        value: 'shared',
      },
    },
    599057: {
      4937719889264640: {
        id: '4937719889264640',
        value: '200',
      },
      6345094772817920: {
        id: '6345094772817920',
        value: "i'm a rollout",
      },
    },
    599080: {},
    599081: {},
    12098126627: {},
    12098126628: {},
    12098126629: {},
    12098126630: {},
  },

  featureKeyMap: {
    test_feature: {
      variables: [
        {
          defaultValue: 'false',
          key: 'new_content',
          type: 'boolean',
          id: '4919852825313280',
        },
        {
          defaultValue: '400',
          key: 'lasers',
          type: 'integer',
          id: '5482802778734592',
        },
        {
          defaultValue: '14.99',
          key: 'price',
          type: 'double',
          id: '6045752732155904',
        },
        {
          defaultValue: 'Hello',
          key: 'message',
          type: 'string',
          id: '6327227708866560',
        },
        {
          type: 'json',
          key: 'message_info',
          id: '8765345281230956',
          defaultValue: '{ "count": 1, "message": "Hello" }',
        },
      ],
      experimentIds: [],
      rolloutId: '594030',
      key: 'test_feature',
      id: '594021',
      variableKeyMap: {
        new_content: {
          defaultValue: 'false',
          key: 'new_content',
          type: 'boolean',
          id: '4919852825313280',
        },
        lasers: {
          defaultValue: '400',
          key: 'lasers',
          type: 'integer',
          id: '5482802778734592',
        },
        price: {
          defaultValue: '14.99',
          key: 'price',
          type: 'double',
          id: '6045752732155904',
        },
        message: {
          defaultValue: 'Hello',
          key: 'message',
          type: 'string',
          id: '6327227708866560',
        },
        message_info: {
          type: 'json',
          key: 'message_info',
          id: '8765345281230956',
          defaultValue: '{ "count": 1, "message": "Hello" }',
        },
      },
    },
    test_feature_2: {
      variables: [
        {
          defaultValue: '30.34',
          key: 'miles_to_the_wall',
          type: 'double',
          id: '5060590313668608',
        },
        {
          defaultValue: 'Winter is coming',
          key: 'motto',
          type: 'string',
          id: '5342065290379264',
        },
        {
          defaultValue: '1000',
          key: 'soldiers_available',
          type: 'integer',
          id: '6186490220511232',
        },
        {
          defaultValue: 'true',
          key: 'is_winter_coming',
          type: 'boolean',
          id: '6467965197221888',
        },
      ],
      experimentIds: [],
      rolloutId: '594059',
      key: 'test_feature_2',
      id: '594050',
      variableKeyMap: {
        miles_to_the_wall: {
          defaultValue: '30.34',
          key: 'miles_to_the_wall',
          type: 'double',
          id: '5060590313668608',
        },
        motto: {
          defaultValue: 'Winter is coming',
          key: 'motto',
          type: 'string',
          id: '5342065290379264',
        },
        soldiers_available: {
          defaultValue: '1000',
          key: 'soldiers_available',
          type: 'integer',
          id: '6186490220511232',
        },
        is_winter_coming: {
          defaultValue: 'true',
          key: 'is_winter_coming',
          type: 'boolean',
          id: '6467965197221888',
        },
      },
    },
    test_feature_for_experiment: {
      variables: [
        {
          defaultValue: '10',
          key: 'num_buttons',
          type: 'integer',
          id: '4792309476491264',
        },
        {
          defaultValue: 'false',
          key: 'is_button_animated',
          type: 'boolean',
          id: '5073784453201920',
        },
        {
          defaultValue: 'Buy me',
          key: 'button_txt',
          type: 'string',
          id: '5636734406623232',
        },
        {
          defaultValue: '50.55',
          key: 'button_width',
          type: 'double',
          id: '6199684360044544',
        },
        {
          type: 'json',
          key: 'button_info',
          id: '1547854156498475',
          defaultValue: "{ \"num_buttons\": 0, \"text\": \"default value\"}"
        },
      ],
      experimentIds: ['594098'],
      rolloutId: '',
      key: 'test_feature_for_experiment',
      id: '594081',
      variableKeyMap: {
        num_buttons: {
          defaultValue: '10',
          key: 'num_buttons',
          type: 'integer',
          id: '4792309476491264',
        },
        is_button_animated: {
          defaultValue: 'false',
          key: 'is_button_animated',
          type: 'boolean',
          id: '5073784453201920',
        },
        button_txt: {
          defaultValue: 'Buy me',
          key: 'button_txt',
          type: 'string',
          id: '5636734406623232',
        },
        button_width: {
          defaultValue: '50.55',
          key: 'button_width',
          type: 'double',
          id: '6199684360044544',
        },
        button_info: {
          defaultValue: "{ \"num_buttons\": 0, \"text\": \"default value\"}",
          id: '1547854156498475',
          key: 'button_info',
          type: 'json',
        },
      },
    },
    // This feature should have a groupId assigned because its experiment is in a group
    feature_with_group: {
      variables: [],
      rolloutId: '',
      experimentIds: ['595010'],
      key: 'feature_with_group',
      id: '595001',
      variableKeyMap: {},
    },
    shared_feature: {
      rolloutId: '599055',
      key: 'shared_feature',
      id: '599011',
      experimentIds: ['599028'],
      variables: [
        {
          type: 'integer',
          key: 'lasers',
          id: '4937719889264640',
          defaultValue: '100',
        },
        {
          type: 'string',
          key: 'message',
          id: '6345094772817920',
          defaultValue: 'shared',
        },
      ],
      variableKeyMap: {
        message: {
          type: 'string',
          key: 'message',
          id: '6345094772817920',
          defaultValue: 'shared',
        },
        lasers: {
          type: 'integer',
          key: 'lasers',
          id: '4937719889264640',
          defaultValue: '100',
        },
      },
    },
    unused_flag: {
      rolloutId: '',
      key: 'unused_flag',
      id: '599110',
      experimentIds: [],
      variables: [],
      variableKeyMap: {},
    },
    feature_exp_no_traffic: {
      rolloutId: '',
      key: 'feature_exp_no_traffic',
      id: '4482920079',
      experimentIds: ['12115595439'],
      variables: [],
      variableKeyMap: {},
    },
    test_feature_in_exclusion_group: {
      experimentIds: ['42222', '42223', '42224'],
      id: '91115',
      key: 'test_feature_in_exclusion_group',
      rolloutId: '594059',
      variableKeyMap: {},
      variables: [],
    },
    test_feature_in_multiple_experiments: {
      experimentIds: ['111134', '111135', '111136'],
      id: '91116',
      key: 'test_feature_in_multiple_experiments',
      rolloutId: '594059',
      variableKeyMap: {},
      variables: [],
    },
  },
};

var unsupportedVersionConfig = {
  revision: '42',
  version: '5',
  events: [
    {
      key: 'testEvent',
      experimentIds: ['111127'],
      id: '111095',
    },
    {
      key: 'Total Revenue',
      experimentIds: ['111127'],
      id: '111096',
    },
    {
      key: 'testEventWithAudiences',
      experimentIds: ['122227'],
      id: '111097',
    },
    {
      key: 'testEventWithoutExperiments',
      experimentIds: [],
      id: '111098',
    },
    {
      key: 'testEventWithExperimentNotRunning',
      experimentIds: ['133337'],
      id: '111099',
    },
    {
      key: 'testEventWithMultipleExperiments',
      experimentIds: ['111127', '122227', '133337'],
      id: '111100',
    },
    {
      key: 'testEventLaunched',
      experimentIds: ['144447'],
      id: '111101',
    },
  ],
  groups: [
    {
      id: '666',
      policy: 'random',
      trafficAllocation: [
        {
          entityId: '442',
          endOfRange: 3000,
        },
        {
          entityId: '443',
          endOfRange: 6000,
        },
      ],
      experiments: [
        {
          id: '442',
          key: 'groupExperiment1',
          status: 'Running',
          variations: [
            {
              id: '551',
              key: 'var1exp1',
            },
            {
              id: '552',
              key: 'var2exp1',
            },
          ],
          trafficAllocation: [
            {
              entityId: '551',
              endOfRange: 5000,
            },
            {
              entityId: '552',
              endOfRange: 9000,
            },
            {
              entityId: '',
              endOfRange: 10000,
            },
          ],
          audienceIds: ['11154'],
          forcedVariations: {},
          layerId: '1',
        },
        {
          id: '443',
          key: 'groupExperiment2',
          status: 'Running',
          variations: [
            {
              id: '661',
              key: 'var1exp2',
            },
            {
              id: '662',
              key: 'var2exp2',
            },
          ],
          trafficAllocation: [
            {
              entityId: '661',
              endOfRange: 5000,
            },
            {
              entityId: '662',
              endOfRange: 10000,
            },
          ],
          audienceIds: [],
          forcedVariations: {},
          layerId: '2',
        },
      ],
    },
    {
      id: '667',
      policy: 'overlapping',
      trafficAllocation: [],
      experiments: [
        {
          id: '444',
          key: 'overlappingGroupExperiment1',
          status: 'Running',
          variations: [
            {
              id: '553',
              key: 'overlappingvar1',
            },
            {
              id: '554',
              key: 'overlappingvar2',
            },
          ],
          trafficAllocation: [
            {
              entityId: '553',
              endOfRange: 1500,
            },
            {
              entityId: '554',
              endOfRange: 3000,
            },
          ],
          audienceIds: [],
          forcedVariations: {},
          layerId: '3',
        },
      ],
    },
  ],
  experiments: [
    {
      key: 'testExperiment',
      status: 'Running',
      forcedVariations: {
        user1: 'control',
        user2: 'variation',
      },
      audienceIds: [],
      layerId: '4',
      trafficAllocation: [
        {
          entityId: '111128',
          endOfRange: 4000,
        },
        {
          entityId: '111129',
          endOfRange: 9000,
        },
      ],
      id: '111127',
      variations: [
        {
          key: 'control',
          id: '111128',
        },
        {
          key: 'variation',
          id: '111129',
        },
      ],
    },
    {
      key: 'testExperimentWithAudiences',
      status: 'Running',
      forcedVariations: {
        user1: 'controlWithAudience',
        user2: 'variationWithAudience',
      },
      audienceIds: ['11154'],
      layerId: '5',
      trafficAllocation: [
        {
          entityId: '122228',
          endOfRange: 4000,
        },
        {
          entityId: '122229',
          endOfRange: 10000,
        },
      ],
      id: '122227',
      variations: [
        {
          key: 'controlWithAudience',
          id: '122228',
        },
        {
          key: 'variationWithAudience',
          id: '122229',
        },
      ],
    },
    {
      key: 'testExperimentNotRunning',
      status: 'Not started',
      forcedVariations: {
        user1: 'controlNotRunning',
        user2: 'variationNotRunning',
      },
      audienceIds: [],
      layerId: '6',
      trafficAllocation: [
        {
          entityId: '133338',
          endOfRange: 4000,
        },
        {
          entityId: '133339',
          endOfRange: 10000,
        },
      ],
      id: '133337',
      variations: [
        {
          key: 'controlNotRunning',
          id: '133338',
        },
        {
          key: 'variationNotRunning',
          id: '133339',
        },
      ],
    },
    {
      key: 'testExperimentLaunched',
      status: 'Launched',
      forcedVariations: {},
      audienceIds: [],
      layerId: '7',
      trafficAllocation: [
        {
          entityId: '144448',
          endOfRange: 5000,
        },
        {
          entityId: '144449',
          endOfRange: 10000,
        },
      ],
      id: '144447',
      variations: [
        {
          key: 'controlLaunched',
          id: '144448',
        },
        {
          key: 'variationLaunched',
          id: '144449',
        },
      ],
    },
  ],
  accountId: '12001',
  attributes: [
    {
      key: 'browser_type',
      id: '111094',
    },
  ],
  audiences: [
    {
      name: 'Firefox users',
      conditions: '["and", ["or", ["or", {"name": "browser_type", "type": "custom_attribute", "value": "firefox"}]]]',
      id: '11154',
    },
  ],
  projectId: '111001',
};

export var getUnsupportedVersionConfig = function() {
  return cloneDeep(unsupportedVersionConfig);
};

var typedAudiencesConfig = {
  version: '4',
  rollouts: [
    {
      experiments: [
        {
          status: 'Running',
          key: '11488548027',
          layerId: '11551226731',
          trafficAllocation: [
            {
              entityId: '11557362669',
              endOfRange: 10000,
            },
          ],
          audienceIds: [
            '3468206642',
            '3988293898',
            '3988293899',
            '3468206646',
            '3468206647',
            '3468206644',
            '3468206643',
          ],
          variations: [
            {
              variables: [],
              id: '11557362669',
              key: '11557362669',
              featureEnabled: true,
            },
          ],
          forcedVariations: {},
          id: '11488548027',
        },
      ],
      id: '11551226731',
    },
    {
      experiments: [
        {
          status: 'Paused',
          key: '11630490911',
          layerId: '11638870867',
          trafficAllocation: [
            {
              entityId: '11475708558',
              endOfRange: 0,
            },
          ],
          audienceIds: [],
          variations: [
            {
              variables: [],
              id: '11475708558',
              key: '11475708558',
              featureEnabled: false,
            },
          ],
          forcedVariations: {},
          id: '11630490911',
        },
      ],
      id: '11638870867',
    },
    {
      experiments: [
        {
          status: 'Running',
          key: '11488548028',
          layerId: '11551226732',
          trafficAllocation: [
            {
              entityId: '11557362670',
              endOfRange: 10000,
            },
          ],
          audienceIds: ['0'],
          audienceConditions: [
            'and',
            ['or', '3468206642', '3988293898'],
            ['or', '3988293899', '3468206646', '3468206647', '3468206644', '3468206643'],
          ],
          variations: [
            {
              variables: [],
              id: '11557362670',
              key: '11557362670',
              featureEnabled: true,
            },
          ],
          forcedVariations: {},
          id: '11488548028',
        },
      ],
      id: '11551226732',
    },
    {
      experiments: [
        {
          status: 'Paused',
          key: '11630490912',
          layerId: '11638870868',
          trafficAllocation: [
            {
              entityId: '11475708559',
              endOfRange: 0,
            },
          ],
          audienceIds: [],
          variations: [
            {
              variables: [],
              id: '11475708559',
              key: '11475708559',
              featureEnabled: false,
            },
          ],
          forcedVariations: {},
          id: '11630490912',
        },
      ],
      id: '11638870868',
    },
  ],
  anonymizeIP: false,
  projectId: '11624721371',
  variables: [],
  featureFlags: [
    {
      experimentIds: [],
      rolloutId: '11551226731',
      variables: [],
      id: '11477755619',
      key: 'feat',
    },
    {
      experimentIds: ['11564051718'],
      rolloutId: '11638870867',
      variables: [
        {
          defaultValue: 'x',
          type: 'string',
          id: '11535264366',
          key: 'x',
        },
      ],
      id: '11567102051',
      key: 'feat_with_var',
    },
    {
      experimentIds: [],
      rolloutId: '11551226732',
      variables: [],
      id: '11567102052',
      key: 'feat2',
    },
    {
      experimentIds: ['1323241599'],
      rolloutId: '11638870868',
      variables: [
        {
          defaultValue: '10',
          type: 'integer',
          id: '11535264367',
          key: 'z',
        },
      ],
      id: '11567102053',
      key: 'feat2_with_var',
    },
  ],
  experiments: [
    {
      status: 'Running',
      key: 'feat_with_var_test',
      layerId: '11504144555',
      trafficAllocation: [
        {
          entityId: '11617170975',
          endOfRange: 10000,
        },
      ],
      audienceIds: ['3468206642', '3988293898', '3988293899', '3468206646', '3468206647', '3468206644', '3468206643'],
      variations: [
        {
          variables: [
            {
              id: '11535264366',
              value: 'xyz',
            },
          ],
          id: '11617170975',
          key: 'variation_2',
          featureEnabled: true,
        },
      ],
      forcedVariations: {},
      id: '11564051718',
    },
    {
      id: '1323241597',
      key: 'typed_audience_experiment',
      layerId: '1630555627',
      status: 'Running',
      variations: [
        {
          id: '1423767503',
          key: 'A',
          variables: [],
        },
      ],
      trafficAllocation: [
        {
          entityId: '1423767503',
          endOfRange: 10000,
        },
      ],
      audienceIds: ['3468206642', '3988293898', '3988293899', '3468206646', '3468206647', '3468206644', '3468206643'],
      forcedVariations: {},
    },
    {
      id: '1323241598',
      key: 'audience_combinations_experiment',
      layerId: '1323241598',
      status: 'Running',
      variations: [
        {
          id: '1423767504',
          key: 'A',
          variables: [],
        },
      ],
      trafficAllocation: [
        {
          entityId: '1423767504',
          endOfRange: 10000,
        },
      ],
      audienceIds: ['0'],
      audienceConditions: [
        'and',
        ['or', '3468206642', '3988293898'],
        ['or', '3988293899', '3468206646', '3468206647', '3468206644', '3468206643'],
      ],
      forcedVariations: {},
    },
    {
      id: '1323241599',
      key: 'feat2_with_var_test',
      layerId: '1323241600',
      status: 'Running',
      variations: [
        {
          variables: [
            {
              id: '11535264367',
              value: '150',
            },
          ],
          id: '1423767505',
          key: 'variation_2',
          featureEnabled: true,
        },
      ],
      trafficAllocation: [
        {
          entityId: '1423767505',
          endOfRange: 10000,
        },
      ],
      audienceIds: ['0'],
      audienceConditions: [
        'and',
        ['or', '3468206642', '3988293898'],
        ['or', '3988293899', '3468206646', '3468206647', '3468206644', '3468206643'],
      ],
      forcedVariations: {},
    },
  ],
  audiences: [
    {
      id: '3468206642',
      name: 'exactString',
      conditions: '["and", ["or", ["or", {"name": "house", "type": "custom_attribute", "value": "Gryffindor"}]]]',
    },
    {
      id: '3988293898',
      name: '$$dummySubstringString',
      conditions: '{ "type": "custom_attribute", "name": "$opt_dummy_attribute", "value": "impossible_value" }',
    },
    {
      id: '3988293899',
      name: '$$dummyExists',
      conditions: '{ "type": "custom_attribute", "name": "$opt_dummy_attribute", "value": "impossible_value" }',
    },
    {
      id: '3468206646',
      name: '$$dummyExactNumber',
      conditions: '{ "type": "custom_attribute", "name": "$opt_dummy_attribute", "value": "impossible_value" }',
    },
    {
      id: '3468206647',
      name: '$$dummyGtNumber',
      conditions: '{ "type": "custom_attribute", "name": "$opt_dummy_attribute", "value": "impossible_value" }',
    },
    {
      id: '3468206644',
      name: '$$dummyLtNumber',
      conditions: '{ "type": "custom_attribute", "name": "$opt_dummy_attribute", "value": "impossible_value" }',
    },
    {
      id: '3468206643',
      name: '$$dummyExactBoolean',
      conditions: '{ "type": "custom_attribute", "name": "$opt_dummy_attribute", "value": "impossible_value" }',
    },
    {
      id: '0',
      name: '$$dummy',
      conditions: '{ "type": "custom_attribute", "name": "$opt_dummy_attribute", "value": "impossible_value" }',
    },
  ],
  typedAudiences: [
    {
      id: '3988293898',
      name: 'substringString',
      conditions: [
        'and',
        ['or', ['or', { name: 'house', type: 'custom_attribute', match: 'substring', value: 'Slytherin' }]],
      ],
    },
    {
      id: '3988293899',
      name: 'exists',
      conditions: ['and', ['or', ['or', { name: 'favorite_ice_cream', type: 'custom_attribute', match: 'exists' }]]],
    },
    {
      id: '3468206646',
      name: 'exactNumber',
      conditions: ['and', ['or', ['or', { name: 'lasers', type: 'custom_attribute', match: 'exact', value: 45.5 }]]],
    },
    {
      id: '3468206647',
      name: 'gtNumber',
      conditions: ['and', ['or', ['or', { name: 'lasers', type: 'custom_attribute', match: 'gt', value: 70 }]]],
    },
    {
      id: '3468206644',
      name: 'ltNumber',
      conditions: ['and', ['or', ['or', { name: 'lasers', type: 'custom_attribute', match: 'lt', value: 1.0 }]]],
    },
    {
      id: '3468206643',
      name: 'exactBoolean',
      conditions: [
        'and',
        ['or', ['or', { name: 'should_do_it', type: 'custom_attribute', match: 'exact', value: true }]],
      ],
    },
  ],
  groups: [],
  attributes: [
    {
      key: 'house',
      id: '594015',
    },
    {
      key: 'lasers',
      id: '594016',
    },
    {
      key: 'should_do_it',
      id: '594017',
    },
    {
      key: 'favorite_ice_cream',
      id: '594018',
    },
  ],
  botFiltering: false,
  accountId: '4879520872',
  events: [
    {
      key: 'item_bought',
      id: '594089',
      experimentIds: ['11564051718', '1323241597'],
    },
    {
      key: 'user_signed_up',
      id: '594090',
      experimentIds: ['1323241598', '1323241599'],
    },
  ],
  revision: '3',
};

export var getTypedAudiencesConfig = function() {
  return cloneDeep(typedAudiencesConfig);
};

export var typedAudiencesById = {
  3468206642: {
    id: '3468206642',
    name: 'exactString',
    conditions: ['and', ['or', ['or', { name: 'house', type: 'custom_attribute', value: 'Gryffindor' }]]],
  },
  3988293898: {
    id: '3988293898',
    name: 'substringString',
    conditions: [
      'and',
      ['or', ['or', { name: 'house', type: 'custom_attribute', match: 'substring', value: 'Slytherin' }]],
    ],
  },
  3988293899: {
    id: '3988293899',
    name: 'exists',
    conditions: ['and', ['or', ['or', { name: 'favorite_ice_cream', type: 'custom_attribute', match: 'exists' }]]],
  },
  3468206646: {
    id: '3468206646',
    name: 'exactNumber',
    conditions: ['and', ['or', ['or', { name: 'lasers', type: 'custom_attribute', match: 'exact', value: 45.5 }]]],
  },
  3468206647: {
    id: '3468206647',
    name: 'gtNumber',
    conditions: ['and', ['or', ['or', { name: 'lasers', type: 'custom_attribute', match: 'gt', value: 70 }]]],
  },
  3468206644: {
    id: '3468206644',
    name: 'ltNumber',
    conditions: ['and', ['or', ['or', { name: 'lasers', type: 'custom_attribute', match: 'lt', value: 1.0 }]]],
  },
  3468206643: {
    id: '3468206643',
    name: 'exactBoolean',
    conditions: [
      'and',
      ['or', ['or', { name: 'should_do_it', type: 'custom_attribute', match: 'exact', value: true }]],
    ],
  },
  0: {
    id: '0',
    name: '$$dummy',
    conditions: { type: 'custom_attribute', name: '$opt_dummy_attribute', value: 'impossible_value' },
  },
};

var mutexFeatureTestsConfig = {
  version: '4',
  rollouts: [
    {
      experiments: [
        {
          status: 'Not started',
          audienceIds: [],
          variations: [{ variables: [], id: '17138530965', key: '17138530965', featureEnabled: false }],
          id: '17138130490',
          key: '17138130490',
          layerId: '17151011617',
          trafficAllocation: [{ entityId: '17138530965', endOfRange: 0 }],
          forcedVariations: {},
        },
      ],
      id: '17151011617',
    },
  ],
  typedAudiences: [],
  anonymizeIP: false,
  projectId: '1715448053799999',
  variables: [],
  featureFlags: [
    {
      experimentIds: ['17128410791', '17139931304'],
      rolloutId: '17151011617',
      variables: [],
      id: '17146211047',
      key: 'f',
    },
  ],
  experiments: [],
  audiences: [],
  groups: [
    {
      policy: 'random',
      trafficAllocation: [
        { entityId: '17139931304', endOfRange: 9900 },
        { entityId: '17128410791', endOfRange: 10000 },
      ],
      experiments: [
        {
          status: 'Running',
          audienceIds: [],
          variations: [
            { variables: [], id: 17155031309, key: 'variation_1', featureEnabled: false },
            { variables: [], id: 17124610952, key: 'variation_2', featureEnabled: true },
          ],
          id: '17139931304',
          key: 'f_test2',
          layerId: '17149391594',
          trafficAllocation: [
            { entityId: '17155031309', endOfRange: 5000 },
            { entityId: '17124610952', endOfRange: 10000 },
          ],
          forcedVariations: {},
        },
        {
          status: 'Running',
          audienceIds: [],
          variations: [
            { variables: [], id: '17175820099', key: 'variation_1', featureEnabled: false },
            { variables: [], id: '17144050391', key: 'variation_2', featureEnabled: true },
          ],
          id: '17128410791',
          key: 'f_test1',
          layerId: '17145581153',
          trafficAllocation: [
            { entityId: '17175820099', endOfRange: 5000 },
            { entityId: '17144050391', endOfRange: 10000 },
          ],
          forcedVariations: {},
        },
      ],
      id: '17142090293',
    },
  ],
  attributes: [],
  botFiltering: false,
  accountId: '4879520872999',
  events: [{ experimentIds: ['17128410791', '17139931304'], id: '17140380990', key: 'e' }],
  revision: '12',
};

export var getMutexFeatureTestsConfig = function() {
  return cloneDeep(mutexFeatureTestsConfig);
};

export var rolloutDecisionObj = {
  experiment: null,
  variation: null,
  decisionSource: 'rollout',
}

export var featureTestDecisionObj = {
  experiment: {
    trafficAllocation: [
      { endOfRange: 5000, entityId: '594096' },
      { endOfRange: 10000, entityId: '594097' }
    ],
    layerId: '594093',
    forcedVariations: {},
    audienceIds: [],
    variations: [
      {
        key: 'variation',
        id: '594096',
        featureEnabled: true,
        variables: [],
      },
      {
        key: 'control',
        id: '594097',
        featureEnabled: true,
        variables: [],
      },
    ],
    status: 'Running',
    key: 'testing_my_feature',
    id: '594098',
    variationKeyMap: {
      variation: {
        key: 'variation',
        id: '594096',
        featureEnabled: true,
        variables: [],
      },
      control: {
        key: 'control',
        id: '594097',
        featureEnabled: true,
        variables: [],
      },
    },
  },
  variation: {
    key: 'variation',
    id: '594096',
    featureEnabled: true,
    variables: [],
  },
  decisionSource: 'feature-test',
}

var similarRuleKeyConfig = {
  version: "4",
  rollouts: [
    {
      experiments: [
        {
          status: "Running",
          audienceConditions: [],
          audienceIds: [],
          variations: [
            {
              variables: [],
              id: "5452",
              key: "on",
              featureEnabled: true
            }
          ],
          forcedVariations: {},
          key: "targeted_delivery",
          layerId: "9300000004981",
          trafficAllocation: [
            {
              entityId: "5452",
              endOfRange: 10000
            }
          ],
          id: "9300000004981"
        }, {
          status: "Running",
          audienceConditions: [],
          audienceIds: [],
          variations: [
            {
              variables: [],
              id: "5451",
              key: "off",
              featureEnabled: false
            }
          ],
          forcedVariations: {},
          key: "default-rollout-2029-20301771717",
          layerId: "default-layer-rollout-2029-20301771717",
          trafficAllocation: [
            {
              entityId: "5451",
              endOfRange: 10000
            }
          ],
          id: "default-rollout-2029-20301771717"
        }
      ],
      id: "rollout-2029-20301771717"
    }, {
      experiments: [
        {
          status: "Running",
          audienceConditions: [],
          audienceIds: [],
          variations: [
            {
              variables: [],
              id: "5450",
              key: "on",
              featureEnabled: true
            }
          ],
          forcedVariations: {},
          key: "targeted_delivery",
          layerId: "9300000004979",
          trafficAllocation: [
            {
              entityId: "5450",
              endOfRange: 10000
            }
          ],
          id: "9300000004979"
        }, {
          status: "Running",
          audienceConditions: [],
          audienceIds: [],
          variations: [
            {
              variables: [],
              id: "5449",
              key: "off",
              featureEnabled: false
            }
          ],
          forcedVariations: {},
          key: "default-rollout-2028-20301771717",
          layerId: "default-layer-rollout-2028-20301771717",
          trafficAllocation: [
            {
              entityId: "5449",
              endOfRange: 10000
            }
          ],
          id: "default-rollout-2028-20301771717"
        }
      ],
      id: "rollout-2028-20301771717"
    }, {
      experiments: [
        {
          status: "Running",
          audienceConditions: [],
          audienceIds: [],
          variations: [
            {
              variables: [],
              id: "5448",
              key: "on",
              featureEnabled: true
            }
          ],
          forcedVariations: {},
          key: "targeted_delivery",
          layerId: "9300000004977",
          trafficAllocation: [
            {
              entityId: "5448",
              endOfRange: 10000
            }
          ],
          id: "9300000004977"
        }, {
          status: "Running",
          audienceConditions: [],
          audienceIds: [],
          variations: [
            {
              variables: [],
              id: "5447",
              key: "off",
              featureEnabled: false
            }
          ],
          forcedVariations: {},
          key: "default-rollout-2027-20301771717",
          layerId: "default-layer-rollout-2027-20301771717",
          trafficAllocation: [
            {
              entityId: "5447",
              endOfRange: 10000
            }
          ],
          id: "default-rollout-2027-20301771717"
        }
      ],
      id: "rollout-2027-20301771717"
    }
  ],
  typedAudiences: [],
  anonymizeIP: true,
  projectId: "20286295225",
  variables: [],
  featureFlags: [
    {
      experimentIds: [],
      rolloutId: "rollout-2029-20301771717",
      variables: [],
      id: "2029",
      key: "flag_3"
    }, {
      experimentIds: [],
      rolloutId: "rollout-2028-20301771717",
      variables: [],
      id: "2028",
      key: "flag_2"
    }, {
      experimentIds: [],
      rolloutId: "rollout-2027-20301771717",
      variables: [],
      id: "2027",
      key: "flag_1"
    }
  ],
  experiments: [],
  audiences: [
    {
      conditions: "[\"or\", {\"match\": \"exact\", \"name\": \"$opt_dummy_attribute\", \"type\": \"custom_attribute\", \"value\": \"$opt_dummy_value\"}]",
      id: "$opt_dummy_audience",
      name: "Optimizely-Generated Audience for Backwards Compatibility"
    }
  ],
  groups: [],
  attributes: [],
  botFiltering: false,
  accountId: "19947277778",
  events: [],
  revision: "11",
  sendFlagDecisions: true
}

export var getSimilarRuleKeyConfig = function() {
  return cloneDeep(similarRuleKeyConfig);
};

var similarExperimentKeysConfig = {
  version: "4",
  rollouts: [],
  typedAudiences: [
    {
      id: "20415611520",
      conditions: [
        "and",
        [
          "or",
          [
            "or", {
              value: true,
              type: "custom_attribute",
              name: "hiddenLiveEnabled",
              match: "exact"
            }
          ]
        ]
      ],
      name: "test1"
    }, {
      id: "20406066925",
      conditions: [
        "and",
        [
          "or",
          [
            "or", {
              value: false,
              type: "custom_attribute",
              name: "hiddenLiveEnabled",
              match: "exact"
            }
          ]
        ]
      ],
      name: "test2"
    }
  ],
  anonymizeIP: true,
  projectId: "20430981610",
  variables: [],
  featureFlags: [
    {
      experimentIds: ["9300000007569"],
      rolloutId: "",
      variables: [],
      id: "3045",
      key: "flag1"
    }, {
      experimentIds: ["9300000007573"],
      rolloutId: "",
      variables: [],
      id: "3046",
      key: "flag2"
    }
  ],
  experiments: [
    {
      status: "Running",
      audienceConditions: [
        "or", "20415611520"
      ],
      audienceIds: ["20415611520"],
      variations: [
        {
          variables: [],
          id: "8045",
          key: "variation1",
          featureEnabled: true
        }
      ],
      forcedVariations: {},
      key: "targeted_delivery",
      layerId: "9300000007569",
      trafficAllocation: [
        {
          entityId: "8045",
          endOfRange: 10000
        }
      ],
      id: "9300000007569"
    }, {
      status: "Running",
      audienceConditions: [
        "or", "20406066925"
      ],
      audienceIds: ["20406066925"],
      variations: [
        {
          variables: [],
          id: "8048",
          key: "variation2",
          featureEnabled: true
        }
      ],
      forcedVariations: {},
      key: "targeted_delivery",
      layerId: "9300000007573",
      trafficAllocation: [
        {
          entityId: "8048",
          endOfRange: 10000
        }
      ],
      id: "9300000007573"
    }
  ],
  audiences: [
    {
      id: "20415611520",
      conditions: "[\"or\", {\"match\": \"exact\", \"name\": \"$opt_dummy_attribute\", \"type\": \"custom_attribute\", \"value\": \"$opt_dummy_value\"}]",
      name: "test1"
    }, {
      id: "20406066925",
      conditions: "[\"or\", {\"match\": \"exact\", \"name\": \"$opt_dummy_attribute\", \"type\": \"custom_attribute\", \"value\": \"$opt_dummy_value\"}]",
      name: "test2"
    }, {
      conditions: "[\"or\", {\"match\": \"exact\", \"name\": \"$opt_dummy_attribute\", \"type\": \"custom_attribute\", \"value\": \"$opt_dummy_value\"}]",
      id: "$opt_dummy_audience",
      name: "Optimizely-Generated Audience for Backwards Compatibility"
    }
  ],
  groups: [],
  attributes: [
    {
      id: "20408641883",
      key: "hiddenLiveEnabled"
    }
  ],
  botFiltering: false,
  accountId: "17882702980",
  events: [],
  revision: "25",
  sendFlagDecisions: true
}

export var getSimilarExperimentKeyConfig = function() {
  return cloneDeep(similarExperimentKeysConfig);
};

export default {
  getTestProjectConfig: getTestProjectConfig,
  getTestDecideProjectConfig: getTestDecideProjectConfig,
  getParsedAudiences: getParsedAudiences,
  getTestProjectConfigWithFeatures: getTestProjectConfigWithFeatures,
  datafileWithFeaturesExpectedData: datafileWithFeaturesExpectedData,
  getUnsupportedVersionConfig: getUnsupportedVersionConfig,
  getTypedAudiencesConfig: getTypedAudiencesConfig,
  typedAudiencesById: typedAudiencesById,
  getMutexFeatureTestsConfig: getMutexFeatureTestsConfig,
  getSimilarRuleKeyConfig: getSimilarRuleKeyConfig,
  getSimilarExperimentKeyConfig: getSimilarExperimentKeyConfig
};
