import { OptimizelyDatafile } from '../src/Datafile'

const datafile: OptimizelyDatafile = {
  version: '4',
  rollouts: [
    {
      experiments: [
        {
          status: 'Running',
          key: '12135000122',
          layerId: '12103610772',
          trafficAllocation: [{ entityId: '12097940344', endOfRange: 10000 }],
          audienceIds: [],
          variations: [
            {
              variables: [
                { id: '12103830477', value: 'Hi Jess!' },
                {
                  id: '12134130361',
                  value:
                    'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.  shit dog',
                },
                { id: '12100011967', value: '' },
              ],
              id: '12097940344',
              key: '12097940344',
              featureEnabled: true,
            },
          ],
          forcedVariations: {},
          id: '12135000122',
        },
      ],
      id: '12103610772',
    },
  ],
  typedAudiences: [],
  anonymizeIP: false,
  projectId: '12122640456',
  variables: [],
  featureFlags: [
    {
      experimentIds: ['12125050175'],
      rolloutId: '12103610772',
      variables: [
        { defaultValue: '', type: 'string', id: '12100011967', key: 'variation' },
        { defaultValue: 'Hi Jess!', type: 'string', id: '12103830477', key: 'header' },
        {
          defaultValue:
            'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.  shit dog',
          type: 'string',
          id: '12134130361',
          key: 'content',
        },
      ],
      id: '12113321010',
      key: 'feature1',
    },
  ],
  experiments: [
    {
      status: 'Running',
      key: 'abtest1',
      layerId: '12126530518',
      trafficAllocation: [
        { entityId: '12116960297', endOfRange: 2500 },
        { entityId: '12116960297', endOfRange: 5000 },
        { entityId: '12124830390', endOfRange: 7500 },
        { entityId: '12124830390', endOfRange: 10000 },
      ],
      audienceIds: [],
      variations: [
        { variables: [], id: '12116960297', key: 'var1' },
        { variables: [], id: '12124830390', key: 'var2' },
      ],
      forcedVariations: {},
      id: '12124960244',
    },
    {
      status: 'Running',
      key: 'feature1_test',
      layerId: '12113720432',
      trafficAllocation: [
        { entityId: '12113360999', endOfRange: 1000 },
        { entityId: '12113360999', endOfRange: 5000 },
        { entityId: '12115550439', endOfRange: 6000 },
        { entityId: '12115550439', endOfRange: 10000 },
      ],
      audienceIds: [],
      variations: [
        {
          variables: [
            { id: '12103830477', value: 'Hi Jess!' },
            { id: '12134130361', value: 'content 1' },
            { id: '12100011967', value: 'jess' },
          ],
          id: '12113360999',
          key: 'var1',
          featureEnabled: true,
        },
        {
          variables: [
            { id: '12103830477', value: 'Hi Jordan' },
            { id: '12134130361', value: 'content 2' },
            { id: '12100011967', value: 'jordan' },
          ],
          id: '12115550439',
          key: 'var2',
          featureEnabled: true,
        },
      ],
      forcedVariations: {},
      id: '12125050175',
    },
    {
      status: 'Running',
      key: 'single_variation_abtest',
      layerId: '12123005403',
      trafficAllocation: [{ entityId: '12184734628', endOfRange: 10000 }],
      audienceIds: [],
      variations: [
        { variables: [], id: '12184734628', key: 'var1' },
      ],
      forcedVariations: {},
      id: '12133781795',
    },
  ],
  audiences: [
    {
      id: '12113650763',
      conditions: '["and", ["or", ["or", {"name": "attribute1", "type": "custom_attribute", "value": "value1"}]]]',
      name: 'aud1',
    },
  ],
  groups: [],
  attributes: [{ id: '12107730574', key: 'attribute1' }],
  botFiltering: false,
  accountId: '804231466',
  events: [{ experimentIds: [], id: '12113361000', key: 'event1' }],
  revision: '36',
}

export { datafile }
