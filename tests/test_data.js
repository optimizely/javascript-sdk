/**
 * Copyright 2017, Optimizely
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
var fns = require('optimizely-server-sdk/lib/utils/fns');

var config = {
  revision: '42',
  version: '2',
  events: [
    {
      key: 'testEvent',
      experimentIds: ['111127'],
      id: '111095'
    },
    {
      key: 'Total Revenue',
      experimentIds: ['111127'],
      id: '111096'
    },
    {
      key: 'testEventWithAudiences',
      experimentIds: ['122227'],
      id: '111097'
    },
    {
      key: 'testEventWithoutExperiments',
      experimentIds: [],
      id: '111098'
    },
    {
      key: 'testEventWithExperimentNotRunning',
      experimentIds: ['133337'],
      id: '111099'
    },
    {
      key: 'testEventWithMultipleExperiments',
      experimentIds: ['111127', '122227', '133337'],
      id: '111100'
    },
    {
      key: 'testEventLaunched',
      experimentIds: ['144447'],
      id: '111101'
    }
  ],
  groups: [
    {
      id: '666',
      policy: 'random',
      trafficAllocation: [{
        entityId: '442',
        endOfRange: 3000
      }, {
        entityId: '443',
        endOfRange: 6000
      }],
      experiments: [{
        id: '442',
        key: 'groupExperiment1',
        status: 'Running',
        variations: [{
          id: '551',
          key: 'var1exp1'
        }, {
          id: '552',
          key: 'var2exp1'
        }],
        trafficAllocation: [{
          entityId: '551',
          endOfRange: 5000
        }, {
          entityId: '552',
          endOfRange: 9000
        }, {
          entityId: '',
          endOfRange: 10000
        }],
        audienceIds: ['11154'],
        forcedVariations: {},
        layerId: '1'
      }, {
        id: '443',
        key: 'groupExperiment2',
        status: 'Running',
        variations: [{
          id: '661',
          key: 'var1exp2'
        }, {
          id: '662',
          key: 'var2exp2'
        }],
        trafficAllocation: [{
          entityId: '661',
          endOfRange: 5000
        }, {
          entityId: '662',
          endOfRange: 10000
        }],
        audienceIds: [],
        forcedVariations: {},
        layerId: '2'
      }]
    }, {
      id: '667',
      policy: 'overlapping',
      trafficAllocation: [],
      experiments: [{
        id: '444',
        key: 'overlappingGroupExperiment1',
        status: 'Running',
        variations: [{
          id: '553',
          key: 'overlappingvar1'
        }, {
          id: '554',
          key: 'overlappingvar2'
        }],
        trafficAllocation: [{
          entityId: '553',
          endOfRange: 1500
        }, {
          entityId: '554',
          endOfRange: 3000
        }],
        audienceIds: [],
        forcedVariations: {},
        layerId: '3'
      }]
    }
  ],
  experiments: [
    {
      key: 'testExperiment',
      status: 'Running',
      forcedVariations: {
        'user1': 'control',
        'user2': 'variation'
      },
      audienceIds: [],
      layerId: '4',
      trafficAllocation: [{
        entityId: '111128',
        endOfRange: 4000
      }, {
        entityId: '111129',
        endOfRange: 9000
      }],
      id: '111127',
      variations: [{
        key: 'control',
        id: '111128'
      }, {
        key: 'variation',
        id: '111129'
      }]
    }, {
      key: 'testExperimentWithAudiences',
      status: 'Running',
      forcedVariations: {
        'user1': 'controlWithAudience',
        'user2': 'variationWithAudience'
      },
      audienceIds: ['11154'],
      layerId: '5',
      trafficAllocation: [{
        entityId: '122228',
        endOfRange: 4000,
      }, {
        entityId: '122229',
        endOfRange: 10000
      }],
      id: '122227',
      variations: [{
        key: 'controlWithAudience',
        id: '122228'
      }, {
        key: 'variationWithAudience',
        id: '122229'
      }]
    }, {
      key: 'testExperimentNotRunning',
      status: 'Not started',
      forcedVariations: {
        'user1': 'controlNotRunning',
        'user2': 'variationNotRunning'
      },
      audienceIds: [],
      layerId: '6',
      trafficAllocation: [{
        entityId: '133338',
        endOfRange: 4000
      }, {
        entityId: '133339',
        endOfRange: 10000
      }],
      id: '133337',
      variations: [{
        key: 'controlNotRunning',
        id: '133338'
      }, {
        key: 'variationNotRunning',
        id: '133339'
      }]
    }, {
      key: 'testExperimentLaunched',
      status: 'Launched',
      forcedVariations: {},
      audienceIds: [],
      layerId: '7',
      trafficAllocation: [{
        entityId: '144448',
        endOfRange: 5000,
      }, {
        entityId: '144449',
        endOfRange: 10000
      }],
      id: '144447',
      variations: [{
        key: 'controlLaunched',
        id: '144448'
      }, {
        key: 'variationLaunched',
        id: '144449'
      }]
    }],
    accountId: '12001',
    attributes: [{
      key: 'browser_type',
      id: '111094'
    }
  ],
  audiences: [{
    name: 'Firefox users',
    conditions: '["and", ["or", ["or", {"name": "browser_type", "type": "custom_attribute", "value": "firefox"}]]]',
    id: '11154'
  }],
  projectId: '111001'
};

var getParsedAudiences = [{
  name: 'Firefox users',
  conditions: ["and", ["or", ["or", {"name": "browser_type", "type": "custom_attribute", "value": "firefox"}]]],
  id: '11154'
}];

var getTestProjectConfig = function() {
  return fns.cloneDeep(config);
};


module.exports = {
  getTestProjectConfig: getTestProjectConfig,
  getParsedAudiences: getParsedAudiences,
};
