// flag id starts from 1000
// experiment id starts from 2000
// rollout experiment id starts from 3000
// audience id starts from 4000
// variation id starts from 5000
// variable id starts from 6000
// attribute id starts from 7000

const testDatafile = {
  accountId: "24535200037",
  projectId: "5088239376138240",
  revision: "21",
  attributes: [
    {
      id: "7001",
      key: "age"
    }
  ],
  audiences: [
    {
      name: "age_22",
      conditions: "[\"or\", {\"match\": \"exact\", \"name\": \"$opt_dummy_attribute\", \"type\": \"custom_attribute\", \"value\": \"$opt_dummy_value\"}]",
      id: "4001"
    },
    {
      name: "age_60",
      conditions: "[\"or\", {\"match\": \"exact\", \"name\": \"$opt_dummy_attribute\", \"type\": \"custom_attribute\", \"value\": \"$opt_dummy_value\"}]",
      id: "4002"
    },
    {
      name: "age_90",
      conditions: "[\"or\", {\"match\": \"exact\", \"name\": \"$opt_dummy_attribute\", \"type\": \"custom_attribute\", \"value\": \"$opt_dummy_value\"}]",
      id: "4003"
    },
    {
      id: "$opt_dummy_audience",
      name: "Optimizely-Generated Audience for Backwards Compatibility",
      conditions: "[\"or\", {\"match\": \"exact\", \"name\": \"$opt_dummy_attribute\", \"type\": \"custom_attribute\", \"value\": \"$opt_dummy_value\"}]"
    }
  ],
  version: "4",
  events: [],
  integrations: [],
  anonymizeIP: true,
  botFiltering: false,
  typedAudiences: [
    {
      name: "age_22",
      conditions: [
        "and",
        [
          "or",
          [
            "or",
            {
              "match": "le",
              name: "age",
              "type": "custom_attribute",
              value: 22
            }
          ]
        ]
      ],
      id: "4001"
    },
    {
      name: "age_60",
      conditions: [
        "and",
        [
          "or",
          [
            "or",
            {
              "match": "le",
              name: "age",
              "type": "custom_attribute",
              value: 60
            }
          ]
        ],
        [
          "or",
          [
            "or",
            {
              "match": "gt",
              name: "age",
              "type": "custom_attribute",
              value: 22
            }
          ]
        ]
      ],
      id: "4002"
    },
    {
      name: "age_90",
      conditions: [
        "and",
        [
          "or",
          [
            "or",
            {
              "match": "le",
              name: "age",
              "type": "custom_attribute",
              value: 90
            }
          ]
        ],
        [
          "or",
          [
            "or",
            {
              "match": "gt",
              name: "age",
              "type": "custom_attribute",
              value: 60
            }
          ]
        ]
      ],
      id: "4003"
    },
  ],
  variables: [],
  environmentKey: "production",
  sdkKey: "sdk_key",
  featureFlags: [
    {
      id: "1001",
      key: "flag_1",
      rolloutId: "rollout-371334-671741182375276",
      experimentIds: [
        "2001",
        "2002",
        "2003"
      ],
      variables: [
        {
          id: "6001",
          key: "integer_variable",
          "type": "integer",
          "defaultValue": "0"
        }
      ]
    }
  ],
  "rollouts": [
    {
      id: "rollout-371334-671741182375276",
      experiments: [
        {
          id: "3001",
          key: "delivery_1",
          status: "Running",
          layerId: "9300001480454",
          variations: [
            {
              id: "5004",
              key: "variation_4",
              featureEnabled: true,
              variables: [
                {
                  id: "6001",
                  value: "4"
                }
              ]
            }
          ],
          trafficAllocation: [
            {
              entityId: "5004",
              endOfRange: 1500
            }
          ],
          forcedVariations: {

          },
          audienceIds: [
            "4001"
          ],
          audienceConditions: [
            "or",
            "4001"
          ]
        },
        {
          id: "3002",
          key: "delivery_2",
          status: "Running",
          layerId: "9300001480455",
          variations: [
            {
              id: "5005",
              key: "variation_5",
              featureEnabled: true,
              variables: [
                {
                  id: "6001",
                  value: "5"
                }
              ]
            }
          ],
          trafficAllocation: [
            {
              entityId: "5005",
              endOfRange: 4000
            }
          ],
          forcedVariations: {

          },
          audienceIds: [
            "4002"
          ],
          audienceConditions: [
            "or",
            "4002"
          ]
        },
        {
          id: "3003",
          key: "delivery_3",
          status: "Running",
          layerId: "9300001495996",
          variations: [
            {
              id: "5006",
              key: "variation_6",
              featureEnabled: true,
              variables: [
                {
                  id: "6001",
                  value: "6"
                }
              ]
            }
          ],
          trafficAllocation: [
            {
              entityId: "5006",
              endOfRange: 8000
            }
          ],
          forcedVariations: {

          },
          audienceIds: [
            "4003"
          ],
          audienceConditions: [
            "or",
            "4003"
          ]
        },
        {
          id: "default-rollout-id",
          key: "default-rollout-key",
          status: "Running",
          layerId: "rollout-371334-671741182375276",
          variations: [
            {
              id: "5007",
              key: "variation_7",
              featureEnabled: true,
              variables: [
                {
                  id: "6001",
                  value: "7"
                }
              ]
            }
          ],
          trafficAllocation: [
            {
              entityId: "5007",
              endOfRange: 10000
            }
          ],
          forcedVariations: {

          },
          audienceIds: [],
          audienceConditions: []
        }
      ]
    }
  ],
  experiments: [
    {
      id: "2001",
      key: "exp_1",
      status: "Running",
      layerId: "9300001480444",
      variations: [
        {
          id: "5001",
          key: "variation_1",
          featureEnabled: true,
          variables: [
            {
              id: "6001",
              value: "1"
            }
          ]
        }
      ],
      trafficAllocation: [
        {
          entityId: "5001",
          endOfRange: 5000
        },
        {
          entityId: "5001",
          endOfRange: 10000
        }
      ],
      forcedVariations: {

      },
      audienceIds: [
        "4001"
      ],
      audienceConditions: [
        "or",
        "4001"
      ]
    },
    {
      id: "2002",
      key: "exp_2",
      status: "Running",
      layerId: "9300001480448",
      variations: [
        {
          id: "5002",
          key: "variation_2",
          featureEnabled: true,
          variables: [
            {
              id: "6001",
              value: "2"
            }
          ]
        }
      ],
      trafficAllocation: [
        {
          entityId: "5002",
          endOfRange: 5000
        },
        {
          entityId: "5002",
          endOfRange: 10000
        }
      ],
      forcedVariations: {

      },
      audienceIds: [],
      audienceConditions: []
    },
    {
      id: "2003",
      key: "exp_3",
      status: "Running",
      layerId: "9300001480451",
      variations: [
        {
          id: "5003",
          key: "variation_3",
          featureEnabled: true,
          variables: [
            {
              id: "6001",
              value: "3"
            }
          ]
        }
      ],
      trafficAllocation: [
        {
          entityId: "5003",
          endOfRange: 5000
        },
        {
          entityId: "5003",
          endOfRange: 10000
        }
      ],
      forcedVariations: {

      },
      audienceIds: [],
      audienceConditions: []
    }
  ],
  "groups": []
}

export const getDecisionTestDatafile = () => {
  return JSON.parse(JSON.stringify(testDatafile));
}
