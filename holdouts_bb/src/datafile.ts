export const datafile = {
  "accountId": "24535200037",
  "projectId": "5160206733148160",
  "revision": "22",
  "attributes": [
    {
      "id": "4854277638717440",
      "key": "ho"
    },
    {
      "id": "6064325333352448",
      "key": "all"
    }
  ],
  "audiences": [
    {
      "name": "ho_3_aud",
      "conditions": "[\"or\", {\"match\": \"exact\", \"name\": \"$opt_dummy_attribute\", \"type\": \"custom_attribute\", \"value\": \"$opt_dummy_value\"}]",
      "id": "4716615665713152"
    },
    {
      "name": "ho_5_aud",
      "conditions": "[\"or\", {\"match\": \"exact\", \"name\": \"$opt_dummy_attribute\", \"type\": \"custom_attribute\", \"value\": \"$opt_dummy_value\"}]",
      "id": "5264696039702528"
    },
    {
      "name": "ho_6_aud",
      "conditions": "[\"or\", {\"match\": \"exact\", \"name\": \"$opt_dummy_attribute\", \"type\": \"custom_attribute\", \"value\": \"$opt_dummy_value\"}]",
      "id": "5525856223756288"
    },
    {
      "name": "ho_4_aud",
      "conditions": "[\"or\", {\"match\": \"exact\", \"name\": \"$opt_dummy_attribute\", \"type\": \"custom_attribute\", \"value\": \"$opt_dummy_value\"}]",
      "id": "6562077683220480"
    },
    {
      "id": "$opt_dummy_audience",
      "name": "Optimizely-Generated Audience for Backwards Compatibility",
      "conditions": "[\"or\", {\"match\": \"exact\", \"name\": \"$opt_dummy_attribute\", \"type\": \"custom_attribute\", \"value\": \"$opt_dummy_value\"}]"
    }
  ],
  "version": "4",
  "events": [],
  "integrations": [],
  "holdouts": [
    {
      "id": "1644773",
      "key": "ho_3",
      "status": "Running",
      "variations": [
        {
          "id": "$opt_dummy_variation_id",
          "key": "off",
          "featureEnabled": false,
          "variables": []
        }
      ],
      "trafficAllocation": [
        {
          "entityId": "$opt_dummy_variation_id",
          "endOfRange": 1000
        }
      ],
      "audienceIds": [
        "4716615665713152"
      ],
      "audienceConditions": [
        "or",
        "4716615665713152"
      ]
    },
    {
      "id": "1645646",
      "key": "hold_4",
      "status": "Running",
      "variations": [
        {
          "id": "$opt_dummy_variation_id",
          "key": "off",
          "featureEnabled": false,
          "variables": []
        }
      ],
      "trafficAllocation": [
        {
          "entityId": "$opt_dummy_variation_id",
          "endOfRange": 5000
        }
      ],
      "audienceIds": [
        "6562077683220480"
      ],
      "audienceConditions": [
        "or",
        "6562077683220480"
      ]
    },
    {
      "id": "1645647",
      "key": "holdout_5",
      "status": "Running",
      "variations": [
        {
          "id": "$opt_dummy_variation_id",
          "key": "off",
          "featureEnabled": false,
          "variables": []
        }
      ],
      "trafficAllocation": [
        {
          "entityId": "$opt_dummy_variation_id",
          "endOfRange": 2000
        }
      ],
      "audienceIds": [
        "5264696039702528"
      ],
      "audienceConditions": [
        "or",
        "5264696039702528"
      ]
    },
    {
      "id": "1645648",
      "key": "holdout_6",
      "status": "Running",
      "variations": [
        {
          "id": "$opt_dummy_variation_id",
          "key": "off",
          "featureEnabled": false,
          "variables": []
        }
      ],
      "trafficAllocation": [
        {
          "entityId": "$opt_dummy_variation_id",
          "endOfRange": 4000
        }
      ],
      "audienceIds": [
        "5525856223756288"
      ],
      "audienceConditions": [
        "or",
        "5525856223756288"
      ]
    }
  ],
  "anonymizeIP": true,
  "botFiltering": false,
  "typedAudiences": [
    {
      "name": "ho_3_aud",
      "conditions": [
        "and",
        [
          "or",
          [
            "or",
            {
              "match": "exact",
              "name": "ho",
              "type": "custom_attribute",
              "value": 3
            }
          ],
          [
            "or",
            {
              "match": "le",
              "name": "all",
              "type": "custom_attribute",
              "value": 3
            }
          ]
        ]
      ],
      "id": "4716615665713152"
    },
    {
      "name": "ho_5_aud",
      "conditions": [
        "and",
        [
          "or",
          [
            "or",
            {
              "match": "exact",
              "name": "ho",
              "type": "custom_attribute",
              "value": 5
            }
          ],
          [
            "or",
            {
              "match": "le",
              "name": "all",
              "type": "custom_attribute",
              "value": 5
            }
          ]
        ]
      ],
      "id": "5264696039702528"
    },
    {
      "name": "ho_6_aud",
      "conditions": [
        "and",
        [
          "or",
          [
            "or",
            {
              "match": "exact",
              "name": "ho",
              "type": "custom_attribute",
              "value": 6
            }
          ],
          [
            "or",
            {
              "match": "le",
              "name": "all",
              "type": "custom_attribute",
              "value": 6
            }
          ]
        ]
      ],
      "id": "5525856223756288"
    },
    {
      "name": "ho_4_aud",
      "conditions": [
        "and",
        [
          "or",
          [
            "or",
            {
              "match": "exact",
              "name": "ho",
              "type": "custom_attribute",
              "value": 4
            }
          ],
          [
            "or",
            {
              "match": "le",
              "name": "all",
              "type": "custom_attribute",
              "value": 4
            }
          ]
        ]
      ],
      "id": "6562077683220480"
    }
  ],
  "variables": [],
  "environmentKey": "production",
  "sdkKey": "WnRFQEiC9BN6aWjBP78pf",
  "featureFlags": [
    {
      "id": "486801",
      "key": "flag_1",
      "rolloutId": "rollout-486801-931762175217415",
      "experimentIds": [],
      "variables": []
    },
    {
      "id": "486802",
      "key": "flag_2",
      "rolloutId": "rollout-486802-931762175217415",
      "experimentIds": [],
      "variables": []
    }
  ],
  "rollouts": [
    {
      "id": "rollout-486801-931762175217415",
      "experiments": [
        {
          "id": "default-rollout-486801-931762175217415",
          "key": "default-rollout-486801-931762175217415",
          "status": "Running",
          "layerId": "rollout-486801-931762175217415",
          "variations": [
            {
              "id": "1546659",
              "key": "var_1",
              "featureEnabled": true,
              "variables": []
            }
          ],
          "trafficAllocation": [
            {
              "entityId": "1546659",
              "endOfRange": 10000
            }
          ],
          "forcedVariations": {

          },
          "audienceIds": [],
          "audienceConditions": []
        }
      ]
    },
    {
      "id": "rollout-486802-931762175217415",
      "experiments": [
        {
          "id": "default-rollout-486802-931762175217415",
          "key": "default-rollout-486802-931762175217415",
          "status": "Running",
          "layerId": "rollout-486802-931762175217415",
          "variations": [
            {
              "id": "1546664",
              "key": "var_2",
              "featureEnabled": true,
              "variables": []
            }
          ],
          "trafficAllocation": [
            {
              "entityId": "1546664",
              "endOfRange": 10000
            }
          ],
          "forcedVariations": {

          },
          "audienceIds": [],
          "audienceConditions": []
        }
      ]
    }
  ],
  "experiments": [],
  "groups": [],
  "region": "US"
}
