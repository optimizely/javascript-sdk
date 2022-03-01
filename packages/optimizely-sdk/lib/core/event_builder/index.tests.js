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
import sinon from 'sinon';
import { assert } from 'chai';

import fns from '../../utils/fns';
import testData from '../../tests/test_data';
import projectConfig from '../project_config';
import packageJSON from '../../../package.json';
import { getConversionEvent, getImpressionEvent } from './';

describe('lib/core/event_builder', function() {
  describe('APIs', function() {
    var mockLogger;
    var configObj;
    var clock;

    beforeEach(function() {
      configObj = projectConfig.createProjectConfig(testData.getTestProjectConfig());
      clock = sinon.useFakeTimers(new Date().getTime());
      sinon.stub(fns, 'uuid').returns('a68cf1ad-0393-4e18-af87-efe8f01a7c9c');
      mockLogger = {
        log: sinon.stub(),
      };
    });

    afterEach(function() {
      clock.restore();
      fns.uuid.restore();
    });

    describe('getImpressionEvent', function() {
      it('should create proper params for getImpressionEvent without attributes', function() {
        var expectedParams = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
          params: {
            account_id: '12001',
            project_id: '111001',
            visitors: [
              {
                attributes: [],
                visitor_id: 'testUser',
                snapshots: [
                  {
                    decisions: [
                      {
                        variation_id: '111128',
                        experiment_id: '111127',
                        campaign_id: '4',
                        metadata: {
                          flag_key: 'flagKey1',
                          rule_key: 'exp1',
                          rule_type: 'experiment',
                          variation_key: 'control',
                          enabled: true,
                        },
                      },
                    ],
                    events: [
                      {
                        timestamp: Math.round(new Date().getTime()),
                        entity_id: '4',
                        uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                        key: 'campaign_activated',
                      },
                    ],
                  },
                ],
              },
            ],
            revision: '42',
            client_name: 'node-sdk',
            client_version: packageJSON.version,
            anonymize_ip: false,
            enrich_decisions: true,
          },
        };

        var eventOptions = {
          clientEngine: 'node-sdk',
          clientVersion: packageJSON.version,
          configObj: configObj,
          experimentId: '111127',
          ruleKey: 'exp1',
          flagKey: 'flagKey1',
          enabled: true,
          ruleType: 'experiment',
          variationId: '111128',
          userId: 'testUser',
        };

        var actualParams = getImpressionEvent(eventOptions);

        assert.deepEqual(actualParams, expectedParams);
      });

      it('should create proper params for getImpressionEvent with attributes as a string value', function() {
        var expectedParams = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
          params: {
            account_id: '12001',
            project_id: '111001',
            visitors: [
              {
                attributes: [
                  {
                    entity_id: '111094',
                    type: 'custom',
                    value: 'firefox',
                    key: 'browser_type',
                  },
                ],
                visitor_id: 'testUser',
                snapshots: [
                  {
                    decisions: [
                      {
                        variation_id: '111128',
                        experiment_id: '111127',
                        campaign_id: '4',
                        metadata: {
                          flag_key: 'flagKey1',
                          rule_key: 'exp1',
                          rule_type: 'experiment',
                          variation_key: 'control',
                          enabled: false,
                        },
                      },
                    ],
                    events: [
                      {
                        timestamp: Math.round(new Date().getTime()),
                        entity_id: '4',
                        uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                        key: 'campaign_activated',
                      },
                    ],
                  },
                ],
              },
            ],
            revision: '42',
            client_name: 'node-sdk',
            client_version: packageJSON.version,
            anonymize_ip: false,
            enrich_decisions: true,
          },
        };
        var eventOptions = {
          attributes: { browser_type: 'firefox' },
          clientEngine: 'node-sdk',
          clientVersion: packageJSON.version,
          configObj: configObj,
          experimentId: '111127',
          variationId: '111128',
          ruleKey: 'exp1',
          flagKey: 'flagKey1',
          enabled: false,
          ruleType: 'experiment',
          userId: 'testUser',
        };

        var actualParams = getImpressionEvent(eventOptions);

        assert.deepEqual(actualParams, expectedParams);
      });

      it('should create proper params for getImpressionEvent with attributes as a false value', function() {
        var expectedParams = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
          params: {
            account_id: '12001',
            project_id: '111001',
            visitors: [
              {
                attributes: [
                  {
                    entity_id: '111094',
                    type: 'custom',
                    value: false,
                    key: 'browser_type',
                  },
                ],
                visitor_id: 'testUser',
                snapshots: [
                  {
                    decisions: [
                      {
                        variation_id: '111128',
                        experiment_id: '111127',
                        campaign_id: '4',
                        metadata: {
                          flag_key: 'flagKey1',
                          rule_key: 'exp1',
                          rule_type: 'experiment',
                          variation_key: 'control',
                          enabled: true,
                        },
                      },
                    ],
                    events: [
                      {
                        timestamp: Math.round(new Date().getTime()),
                        entity_id: '4',
                        uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                        key: 'campaign_activated',
                      },
                    ],
                  },
                ],
              },
            ],
            revision: '42',
            client_name: 'node-sdk',
            client_version: packageJSON.version,
            anonymize_ip: false,
            enrich_decisions: true,
          },
        };

        var eventOptions = {
          attributes: { browser_type: false },
          clientEngine: 'node-sdk',
          clientVersion: packageJSON.version,
          configObj: configObj,
          experimentId: '111127',
          ruleKey: 'exp1',
          flagKey: 'flagKey1',
          ruleType: 'experiment',
          enabled: true,
          variationId: '111128',
          userId: 'testUser',
        };

        var actualParams = getImpressionEvent(eventOptions);

        assert.deepEqual(actualParams, expectedParams);
      });

      it('should create proper params for getImpressionEvent with attributes as a zero value', function() {
        var expectedParams = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
          params: {
            account_id: '12001',
            project_id: '111001',
            visitors: [
              {
                attributes: [
                  {
                    entity_id: '111094',
                    type: 'custom',
                    value: 0,
                    key: 'browser_type',
                  },
                ],
                visitor_id: 'testUser',
                snapshots: [
                  {
                    decisions: [
                      {
                        variation_id: '111128',
                        experiment_id: '111127',
                        campaign_id: '4',
                        metadata: {
                          flag_key: 'flagKey1',
                          rule_key: 'exp1',
                          rule_type: 'experiment',
                          variation_key: 'control',
                          enabled: true,
                        },
                      },
                    ],
                    events: [
                      {
                        timestamp: Math.round(new Date().getTime()),
                        entity_id: '4',
                        uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                        key: 'campaign_activated',
                      },
                    ],
                  },
                ],
              },
            ],
            revision: '42',
            client_name: 'node-sdk',
            client_version: packageJSON.version,
            anonymize_ip: false,
            enrich_decisions: true,
          },
        };

        var eventOptions = {
          attributes: { browser_type: 0 },
          clientEngine: 'node-sdk',
          clientVersion: packageJSON.version,
          configObj: configObj,
          experimentId: '111127',
          ruleKey: 'exp1',
          flagKey: 'flagKey1',
          ruleType: 'experiment',
          enabled: true,
          variationId: '111128',
          userId: 'testUser',
        };

        var actualParams = getImpressionEvent(eventOptions);

        assert.deepEqual(actualParams, expectedParams);
      });

      it('should not fill in userFeatures for getImpressionEvent when attribute is not in the datafile', function() {
        var expectedParams = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
          params: {
            account_id: '12001',
            project_id: '111001',
            visitors: [
              {
                attributes: [],
                visitor_id: 'testUser',
                snapshots: [
                  {
                    decisions: [
                      {
                        variation_id: '111128',
                        experiment_id: '111127',
                        campaign_id: '4',
                        metadata: {
                          flag_key: 'flagKey1',
                          rule_key: 'exp1',
                          rule_type: 'experiment',
                          variation_key: 'control',
                          enabled: false,
                        },
                      },
                    ],
                    events: [
                      {
                        timestamp: Math.round(new Date().getTime()),
                        entity_id: '4',
                        uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                        key: 'campaign_activated',
                      },
                    ],
                  },
                ],
              },
            ],
            revision: '42',
            client_name: 'node-sdk',
            client_version: packageJSON.version,
            anonymize_ip: false,
            enrich_decisions: true,
          },
        };

        var eventOptions = {
          attributes: { invalid_attribute: 'sorry_not_sorry' },
          clientEngine: 'node-sdk',
          clientVersion: packageJSON.version,
          configObj: configObj,
          experimentId: '111127',
          ruleKey: 'exp1',
          flagKey: 'flagKey1',
          ruleType: 'experiment',
          enabled: false,
          variationId: '111128',
          userId: 'testUser',
          logger: mockLogger,
        };

        var actualParams = getImpressionEvent(eventOptions);

        assert.deepEqual(actualParams, expectedParams);
      });

      it('should fill in userFeatures for user agent and bot filtering (bot filtering enabled)', function() {
        var v4ConfigObj = projectConfig.createProjectConfig(testData.getTestProjectConfigWithFeatures());
        var expectedParams = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
          params: {
            account_id: '572018',
            project_id: '594001',
            visitors: [
              {
                attributes: [
                  {
                    entity_id: '$opt_user_agent',
                    key: '$opt_user_agent',
                    type: 'custom',
                    value: 'Chrome',
                  },
                  {
                    entity_id: '$opt_bot_filtering',
                    key: '$opt_bot_filtering',
                    type: 'custom',
                    value: true,
                  },
                ],
                visitor_id: 'testUser',
                snapshots: [
                  {
                    decisions: [
                      {
                        variation_id: '595008',
                        experiment_id: '595010',
                        campaign_id: '595005',
                        metadata: {
                          flag_key: 'flagKey2',
                          rule_key: 'exp2',
                          rule_type: 'experiment',
                          variation_key: 'var',
                          enabled: false,
                        },
                      },
                    ],
                    events: [
                      {
                        timestamp: Math.round(new Date().getTime()),
                        entity_id: '595005',
                        uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                        key: 'campaign_activated',
                      },
                    ],
                  },
                ],
              },
            ],
            revision: '35',
            client_name: 'node-sdk',
            client_version: packageJSON.version,
            anonymize_ip: true,
            enrich_decisions: true,
          },
        };

        var eventOptions = {
          attributes: { $opt_user_agent: 'Chrome' },
          clientEngine: 'node-sdk',
          clientVersion: packageJSON.version,
          configObj: v4ConfigObj,
          experimentId: '595010',
          ruleKey: 'exp2',
          flagKey: 'flagKey2',
          ruleType: 'experiment',
          enabled: false,
          variationId: '595008',
          userId: 'testUser',
        };

        var actualParams = getImpressionEvent(eventOptions);

        assert.deepEqual(actualParams, expectedParams);
      });

      it('should fill in userFeatures for user agent and bot filtering (bot filtering disabled)', function() {
        var v4ConfigObj = projectConfig.createProjectConfig(testData.getTestProjectConfigWithFeatures());
        v4ConfigObj.botFiltering = false;
        var expectedParams = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
          params: {
            account_id: '572018',
            project_id: '594001',
            visitors: [
              {
                attributes: [
                  {
                    entity_id: '$opt_user_agent',
                    key: '$opt_user_agent',
                    type: 'custom',
                    value: 'Chrome',
                  },
                  {
                    entity_id: '$opt_bot_filtering',
                    key: '$opt_bot_filtering',
                    type: 'custom',
                    value: false,
                  },
                ],
                visitor_id: 'testUser',
                snapshots: [
                  {
                    decisions: [
                      {
                        variation_id: '595008',
                        experiment_id: '595010',
                        campaign_id: '595005',
                        metadata: {
                          flag_key: 'flagKey2',
                          rule_key: 'exp2',
                          rule_type: 'experiment',
                          variation_key: 'var',
                          enabled: false,
                        },
                      },
                    ],
                    events: [
                      {
                        timestamp: Math.round(new Date().getTime()),
                        entity_id: '595005',
                        uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                        key: 'campaign_activated',
                      },
                    ],
                  },
                ],
              },
            ],
            revision: '35',
            client_name: 'node-sdk',
            client_version: packageJSON.version,
            anonymize_ip: true,
            enrich_decisions: true,
          },
        };

        var eventOptions = {
          attributes: { $opt_user_agent: 'Chrome' },
          clientEngine: 'node-sdk',
          clientVersion: packageJSON.version,
          configObj: v4ConfigObj,
          experimentId: '595010',
          ruleKey: 'exp2',
          flagKey: 'flagKey2',
          ruleType: 'experiment',
          enabled: false,
          variationId: '595008',
          userId: 'testUser',
        };

        var actualParams = getImpressionEvent(eventOptions);

        assert.deepEqual(actualParams, expectedParams);
      });

      it('should create proper params for getImpressionEvent with typed attributes', function() {
        var expectedParams = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
          params: {
            account_id: '12001',
            project_id: '111001',
            visitors: [
              {
                attributes: [
                  {
                    entity_id: '111094',
                    key: 'browser_type',
                    type: 'custom',
                    value: 'Chrome',
                  },
                  {
                    entity_id: '323434545',
                    key: 'boolean_key',
                    type: 'custom',
                    value: true,
                  },
                  {
                    entity_id: '616727838',
                    key: 'integer_key',
                    type: 'custom',
                    value: 10,
                  },
                  {
                    entity_id: '808797686',
                    key: 'double_key',
                    type: 'custom',
                    value: 3.14,
                  },
                ],
                visitor_id: 'testUser',
                snapshots: [
                  {
                    decisions: [
                      {
                        variation_id: '111128',
                        experiment_id: '111127',
                        campaign_id: '4',
                        metadata: {
                          flag_key: 'flagKey1',
                          rule_key: 'exp1',
                          rule_type: 'experiment',
                          variation_key: 'control',
                          enabled: false,
                        },
                      },
                    ],
                    events: [
                      {
                        timestamp: Math.round(new Date().getTime()),
                        entity_id: '4',
                        uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                        key: 'campaign_activated',
                      },
                    ],
                  },
                ],
              },
            ],
            revision: '42',
            client_name: 'node-sdk',
            client_version: packageJSON.version,
            anonymize_ip: false,
            enrich_decisions: true,
          },
        };

        var eventOptions = {
          attributes: {
            browser_type: 'Chrome',
            boolean_key: true,
            integer_key: 10,
            double_key: 3.14,
          },
          clientEngine: 'node-sdk',
          clientVersion: packageJSON.version,
          configObj: configObj,
          experimentId: '111127',
          ruleKey: 'exp1',
          flagKey: 'flagKey1',
          ruleType: 'experiment',
          enabled: false,
          variationId: '111128',
          userId: 'testUser',
        };

        var actualParams = getImpressionEvent(eventOptions);

        assert.deepEqual(actualParams, expectedParams);
      });

      it('should remove invalid params from impression event payload', function() {
        var expectedParams = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
          params: {
            account_id: '12001',
            project_id: '111001',
            visitors: [
              {
                attributes: [
                  {
                    entity_id: '111094',
                    key: 'browser_type',
                    type: 'custom',
                    value: 'Chrome',
                  },
                  {
                    entity_id: '808797687',
                    key: 'valid_positive_number',
                    type: 'custom',
                    value: Math.pow(2, 53),
                  },
                  {
                    entity_id: '808797688',
                    key: 'valid_negative_number',
                    type: 'custom',
                    value: -Math.pow(2, 53),
                  },
                ],
                visitor_id: 'testUser',
                snapshots: [
                  {
                    decisions: [
                      {
                        variation_id: '111128',
                        experiment_id: '111127',
                        campaign_id: '4',
                        metadata: {
                          flag_key: 'flagKey1',
                          rule_key: 'exp1',
                          rule_type: 'experiment',
                          variation_key: 'control',
                          enabled: true,
                        },
                      },
                    ],
                    events: [
                      {
                        timestamp: Math.round(new Date().getTime()),
                        entity_id: '4',
                        uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                        key: 'campaign_activated',
                      },
                    ],
                  },
                ],
              },
            ],
            revision: '42',
            client_name: 'node-sdk',
            client_version: packageJSON.version,
            anonymize_ip: false,
            enrich_decisions: true,
          },
        };

        var eventOptions = {
          attributes: {
            browser_type: 'Chrome',
            valid_positive_number: Math.pow(2, 53),
            valid_negative_number: -Math.pow(2, 53),
            invalid_number: Math.pow(2, 53) + 2,
            array: [1, 2, 3],
          },
          clientEngine: 'node-sdk',
          clientVersion: packageJSON.version,
          configObj: configObj,
          experimentId: '111127',
          ruleKey: 'exp1',
          flagKey: 'flagKey1',
          ruleType: 'experiment',
          enabled: true,
          variationId: '111128',
          userId: 'testUser',
        };

        var actualParams = getImpressionEvent(eventOptions);

        assert.deepEqual(actualParams, expectedParams);
      });
    });

    describe('getConversionEvent', function() {
      it('should create proper params for getConversionEvent without attributes or event value', function() {
        var expectedParams = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
          params: {
            account_id: '12001',
            project_id: '111001',
            visitors: [
              {
                visitor_id: 'testUser',
                attributes: [],
                snapshots: [
                  {
                    events: [
                      {
                        timestamp: Math.round(new Date().getTime()),
                        entity_id: '111095',
                        uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                        key: 'testEvent',
                      },
                    ],
                  },
                ],
              },
            ],
            revision: '42',
            client_name: 'node-sdk',
            client_version: packageJSON.version,
            anonymize_ip: false,
            enrich_decisions: true,
          },
        };

        var eventOptions = {
          clientEngine: 'node-sdk',
          clientVersion: packageJSON.version,
          configObj: configObj,
          eventKey: 'testEvent',
          logger: mockLogger,
          userId: 'testUser',
        };

        var actualParams = getConversionEvent(eventOptions);

        assert.deepEqual(actualParams, expectedParams);
      });

      it('should create proper params for getConversionEvent with attributes', function() {
        var expectedParams = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
          params: {
            account_id: '12001',
            project_id: '111001',
            visitors: [
              {
                visitor_id: 'testUser',
                attributes: [
                  {
                    entity_id: '111094',
                    type: 'custom',
                    value: 'firefox',
                    key: 'browser_type',
                  },
                ],
                snapshots: [
                  {
                    events: [
                      {
                        timestamp: Math.round(new Date().getTime()),
                        entity_id: '111095',
                        uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                        key: 'testEvent',
                      },
                    ],
                  },
                ],
              },
            ],
            revision: '42',
            client_name: 'node-sdk',
            client_version: packageJSON.version,
            anonymize_ip: false,
            enrich_decisions: true,
          },
        };

        var eventOptions = {
          attributes: { browser_type: 'firefox' },
          clientEngine: 'node-sdk',
          clientVersion: packageJSON.version,
          configObj: configObj,
          eventKey: 'testEvent',
          logger: mockLogger,
          userId: 'testUser',
        };

        var actualParams = getConversionEvent(eventOptions);

        assert.deepEqual(actualParams, expectedParams);
      });

      it('should create proper params for getConversionEvent with event value', function() {
        var expectedParams = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
          params: {
            client_version: packageJSON.version,
            project_id: '111001',
            visitors: [
              {
                attributes: [],
                visitor_id: 'testUser',
                snapshots: [
                  {
                    events: [
                      {
                        uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                        tags: {
                          revenue: 4200,
                        },
                        timestamp: Math.round(new Date().getTime()),
                        revenue: 4200,
                        key: 'testEvent',
                        entity_id: '111095',
                      },
                    ],
                  },
                ],
              },
            ],
            account_id: '12001',
            client_name: 'node-sdk',
            revision: '42',
            anonymize_ip: false,
            enrich_decisions: true,
          },
        };

        var eventOptions = {
          clientEngine: 'node-sdk',
          clientVersion: packageJSON.version,
          configObj: configObj,
          eventKey: 'testEvent',
          eventTags: {
            revenue: 4200,
          },
          logger: mockLogger,
          userId: 'testUser',
        };

        var actualParams = getConversionEvent(eventOptions);

        assert.deepEqual(actualParams, expectedParams);
      });

      it('should create proper params for getConversionEvent with attributes and event value', function() {
        var expectedParams = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
          params: {
            client_version: packageJSON.version,
            project_id: '111001',
            visitors: [
              {
                attributes: [
                  {
                    entity_id: '111094',
                    type: 'custom',
                    value: 'firefox',
                    key: 'browser_type',
                  },
                ],
                visitor_id: 'testUser',
                snapshots: [
                  {
                    events: [
                      {
                        uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                        tags: {
                          revenue: 4200,
                        },
                        timestamp: Math.round(new Date().getTime()),
                        revenue: 4200,
                        key: 'testEvent',
                        entity_id: '111095',
                      },
                    ],
                  },
                ],
              },
            ],
            account_id: '12001',
            client_name: 'node-sdk',
            revision: '42',
            anonymize_ip: false,
            enrich_decisions: true,
          },
        };

        var eventOptions = {
          attributes: { browser_type: 'firefox' },
          clientEngine: 'node-sdk',
          clientVersion: packageJSON.version,
          configObj: configObj,
          eventKey: 'testEvent',
          eventTags: {
            revenue: 4200,
          },
          logger: mockLogger,
          userId: 'testUser',
        };

        var actualParams = getConversionEvent(eventOptions);

        assert.deepEqual(actualParams, expectedParams);
      });

      it('should not fill in userFeatures for getConversion when attribute is not in the datafile', function() {
        var expectedParams = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
          params: {
            client_version: packageJSON.version,
            project_id: '111001',
            visitors: [
              {
                attributes: [],
                visitor_id: 'testUser',
                snapshots: [
                  {
                    events: [
                      {
                        uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                        timestamp: Math.round(new Date().getTime()),
                        key: 'testEvent',
                        entity_id: '111095',
                      },
                    ],
                  },
                ],
              },
            ],
            account_id: '12001',
            client_name: 'node-sdk',
            revision: '42',
            anonymize_ip: false,
            enrich_decisions: true,
          },
        };

        var eventOptions = {
          attributes: { invalid_attribute: 'sorry_not_sorry' },
          clientEngine: 'node-sdk',
          clientVersion: packageJSON.version,
          configObj: configObj,
          eventKey: 'testEvent',
          logger: mockLogger,
          userId: 'testUser',
        };

        var actualParams = getConversionEvent(eventOptions);
        sinon.assert.calledOnce(mockLogger.log);
        assert.deepEqual(actualParams, expectedParams);
      });

      it('should fill in userFeatures for user agent and bot filtering (bot filtering enabled)', function() {
        var v4ConfigObj = projectConfig.createProjectConfig(testData.getTestProjectConfigWithFeatures());
        var expectedParams = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
          params: {
            account_id: '572018',
            project_id: '594001',
            visitors: [
              {
                attributes: [
                  {
                    entity_id: '$opt_user_agent',
                    key: '$opt_user_agent',
                    type: 'custom',
                    value: 'Chrome',
                  },
                  {
                    entity_id: '$opt_bot_filtering',
                    key: '$opt_bot_filtering',
                    type: 'custom',
                    value: true,
                  },
                ],
                visitor_id: 'testUser',
                snapshots: [
                  {
                    events: [
                      {
                        timestamp: Math.round(new Date().getTime()),
                        entity_id: '594089',
                        uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                        key: 'item_bought',
                      },
                    ],
                  },
                ],
              },
            ],
            revision: '35',
            client_name: 'node-sdk',
            client_version: packageJSON.version,
            anonymize_ip: true,
            enrich_decisions: true,
          },
        };

        var eventOptions = {
          attributes: { $opt_user_agent: 'Chrome' },
          clientEngine: 'node-sdk',
          clientVersion: packageJSON.version,
          configObj: v4ConfigObj,
          eventKey: 'item_bought',
          logger: mockLogger,
          userId: 'testUser',
        };

        var actualParams = getConversionEvent(eventOptions);

        assert.deepEqual(actualParams, expectedParams);
      });

      it('should fill in userFeatures for user agent and bot filtering (bot filtering disabled)', function() {
        var v4ConfigObj = projectConfig.createProjectConfig(testData.getTestProjectConfigWithFeatures());
        v4ConfigObj.botFiltering = false;
        var expectedParams = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
          params: {
            account_id: '572018',
            project_id: '594001',
            visitors: [
              {
                attributes: [
                  {
                    entity_id: '$opt_user_agent',
                    key: '$opt_user_agent',
                    type: 'custom',
                    value: 'Chrome',
                  },
                  {
                    entity_id: '$opt_bot_filtering',
                    key: '$opt_bot_filtering',
                    type: 'custom',
                    value: false,
                  },
                ],
                visitor_id: 'testUser',
                snapshots: [
                  {
                    events: [
                      {
                        timestamp: Math.round(new Date().getTime()),
                        entity_id: '594089',
                        uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                        key: 'item_bought',
                      },
                    ],
                  },
                ],
              },
            ],
            revision: '35',
            client_name: 'node-sdk',
            client_version: packageJSON.version,
            anonymize_ip: true,
            enrich_decisions: true,
          },
        };

        var eventOptions = {
          attributes: { $opt_user_agent: 'Chrome' },
          clientEngine: 'node-sdk',
          clientVersion: packageJSON.version,
          configObj: v4ConfigObj,
          eventKey: 'item_bought',
          logger: mockLogger,
          userId: 'testUser',
        };

        var actualParams = getConversionEvent(eventOptions);

        assert.deepEqual(actualParams, expectedParams);
      });

      it('should create the correct snapshot for multiple experiments attached to the event', function() {
        var expectedParams = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
          params: {
            account_id: '12001',
            project_id: '111001',
            visitors: [
              {
                visitor_id: 'testUser',
                attributes: [],
                snapshots: [
                  {
                    events: [
                      {
                        timestamp: Math.round(new Date().getTime()),
                        entity_id: '111100',
                        uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                        key: 'testEventWithMultipleExperiments',
                      },
                    ],
                  },
                ],
              },
            ],
            revision: '42',
            client_name: 'node-sdk',
            client_version: packageJSON.version,
            anonymize_ip: false,
            enrich_decisions: true,
          },
        };

        var eventOptions = {
          clientEngine: 'node-sdk',
          clientVersion: packageJSON.version,
          configObj: configObj,
          eventKey: 'testEventWithMultipleExperiments',
          logger: mockLogger,
          userId: 'testUser',
        };

        var actualParams = getConversionEvent(eventOptions);

        assert.deepEqual(actualParams, expectedParams);
      });

      it('should remove invalid params from conversion event payload', function() {
        var expectedParams = {
          url: 'https://logx.optimizely.com/v1/events',
          httpVerb: 'POST',
          params: {
            account_id: '12001',
            project_id: '111001',
            visitors: [
              {
                visitor_id: 'testUser',
                attributes: [
                  {
                    entity_id: '111094',
                    key: 'browser_type',
                    type: 'custom',
                    value: 'Chrome',
                  },
                  {
                    entity_id: '808797687',
                    key: 'valid_positive_number',
                    type: 'custom',
                    value: Math.pow(2, 53),
                  },
                  {
                    entity_id: '808797688',
                    key: 'valid_negative_number',
                    type: 'custom',
                    value: -Math.pow(2, 53),
                  },
                ],
                snapshots: [
                  {
                    events: [
                      {
                        timestamp: Math.round(new Date().getTime()),
                        entity_id: '111100',
                        uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                        key: 'testEventWithMultipleExperiments',
                      },
                    ],
                  },
                ],
              },
            ],
            revision: '42',
            client_name: 'node-sdk',
            client_version: packageJSON.version,
            anonymize_ip: false,
            enrich_decisions: true,
          },
        };

        var eventOptions = {
          clientEngine: 'node-sdk',
          clientVersion: packageJSON.version,
          configObj: configObj,
          eventKey: 'testEventWithMultipleExperiments',
          logger: mockLogger,
          userId: 'testUser',
          attributes: {
            browser_type: 'Chrome',
            valid_positive_number: Math.pow(2, 53),
            valid_negative_number: -Math.pow(2, 53),
            invalid_number: -Math.pow(2, 53) - 2,
            array: [1, 2, 3],
          },
        };

        var actualParams = getConversionEvent(eventOptions);

        assert.deepEqual(actualParams, expectedParams);
      });

      describe('and event tags are passed it', function() {
        it('should create proper params for getConversionEvent with event tags', function() {
          var expectedParams = {
            url: 'https://logx.optimizely.com/v1/events',
            httpVerb: 'POST',
            params: {
              client_version: packageJSON.version,
              project_id: '111001',
              visitors: [
                {
                  attributes: [],
                  visitor_id: 'testUser',
                  snapshots: [
                    {
                      events: [
                        {
                          uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                          tags: {
                            'non-revenue': 'cool',
                          },
                          timestamp: Math.round(new Date().getTime()),
                          key: 'testEvent',
                          entity_id: '111095',
                        },
                      ],
                    },
                  ],
                },
              ],
              account_id: '12001',
              client_name: 'node-sdk',
              revision: '42',
              anonymize_ip: false,
              enrich_decisions: true,
            },
          };

          var eventOptions = {
            clientEngine: 'node-sdk',
            clientVersion: packageJSON.version,
            configObj: configObj,
            eventKey: 'testEvent',
            eventTags: {
              'non-revenue': 'cool',
            },
            logger: mockLogger,
            userId: 'testUser',
          };

          var actualParams = getConversionEvent(eventOptions);

          assert.deepEqual(actualParams, expectedParams);
        });

        describe('and the event tags contain an entry for "revenue"', function() {
          it('should include the revenue value in the event object', function() {
            var expectedParams = {
              url: 'https://logx.optimizely.com/v1/events',
              httpVerb: 'POST',
              params: {
                client_version: packageJSON.version,
                project_id: '111001',
                visitors: [
                  {
                    attributes: [],
                    visitor_id: 'testUser',
                    snapshots: [
                      {
                        events: [
                          {
                            uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                            tags: {
                              'non-revenue': 'cool',
                              revenue: 4200,
                            },
                            timestamp: Math.round(new Date().getTime()),
                            revenue: 4200,
                            key: 'testEvent',
                            entity_id: '111095',
                          },
                        ],
                      },
                    ],
                  },
                ],
                account_id: '12001',
                client_name: 'node-sdk',
                revision: '42',
                anonymize_ip: false,
                enrich_decisions: true,
              },
            };

            var eventOptions = {
              clientEngine: 'node-sdk',
              clientVersion: packageJSON.version,
              configObj: configObj,
              eventKey: 'testEvent',
              eventTags: {
                revenue: 4200,
                'non-revenue': 'cool',
              },
              logger: mockLogger,
              userId: 'testUser',
            };

            var actualParams = getConversionEvent(eventOptions);

            assert.deepEqual(actualParams, expectedParams);
          });

          it('should include revenue value of 0 in the event object', function() {
            var expectedParams = {
              url: 'https://logx.optimizely.com/v1/events',
              httpVerb: 'POST',
              params: {
                client_version: packageJSON.version,
                project_id: '111001',
                visitors: [
                  {
                    attributes: [],
                    visitor_id: 'testUser',
                    snapshots: [
                      {
                        events: [
                          {
                            uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                            tags: {
                              revenue: 0,
                            },
                            timestamp: Math.round(new Date().getTime()),
                            revenue: 0,
                            key: 'testEvent',
                            entity_id: '111095',
                          },
                        ],
                      },
                    ],
                  },
                ],
                account_id: '12001',
                client_name: 'node-sdk',
                revision: '42',
                anonymize_ip: false,
                enrich_decisions: true,
              },
            };

            var eventOptions = {
              clientEngine: 'node-sdk',
              clientVersion: packageJSON.version,
              configObj: configObj,
              eventKey: 'testEvent',
              eventTags: {
                revenue: 0,
              },
              logger: mockLogger,
              userId: 'testUser',
            };

            var actualParams = getConversionEvent(eventOptions);

            assert.deepEqual(actualParams, expectedParams);
          });

          describe('and the revenue value is invalid', function() {
            it('should not include the revenue value in the event object', function() {
              var expectedParams = {
                url: 'https://logx.optimizely.com/v1/events',
                httpVerb: 'POST',
                params: {
                  client_version: packageJSON.version,
                  project_id: '111001',
                  visitors: [
                    {
                      attributes: [],
                      visitor_id: 'testUser',
                      snapshots: [
                        {
                          events: [
                            {
                              uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                              tags: {
                                'non-revenue': 'cool',
                                revenue: 'invalid revenue',
                              },
                              timestamp: Math.round(new Date().getTime()),
                              key: 'testEvent',
                              entity_id: '111095',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                  account_id: '12001',
                  client_name: 'node-sdk',
                  revision: '42',
                  anonymize_ip: false,
                  enrich_decisions: true,
                },
              };

              var eventOptions = {
                clientEngine: 'node-sdk',
                clientVersion: packageJSON.version,
                configObj: configObj,
                eventKey: 'testEvent',
                eventTags: {
                  revenue: 'invalid revenue',
                  'non-revenue': 'cool',
                },
                logger: mockLogger,
                userId: 'testUser',
              };

              var actualParams = getConversionEvent(eventOptions);

              assert.deepEqual(actualParams, expectedParams);
            });
          });
        });

        describe('and the event tags contain an entry for "value"', function() {
          it('should include the event value in the event object', function() {
            var expectedParams = {
              url: 'https://logx.optimizely.com/v1/events',
              httpVerb: 'POST',
              params: {
                client_version: packageJSON.version,
                project_id: '111001',
                visitors: [
                  {
                    attributes: [],
                    visitor_id: 'testUser',
                    snapshots: [
                      {
                        events: [
                          {
                            uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                            tags: {
                              'non-revenue': 'cool',
                              value: '13.37',
                            },
                            timestamp: Math.round(new Date().getTime()),
                            value: 13.37,
                            key: 'testEvent',
                            entity_id: '111095',
                          },
                        ],
                      },
                    ],
                  },
                ],
                account_id: '12001',
                client_name: 'node-sdk',
                revision: '42',
                anonymize_ip: false,
                enrich_decisions: true,
              },
            };

            var eventOptions = {
              clientEngine: 'node-sdk',
              clientVersion: packageJSON.version,
              configObj: configObj,
              eventKey: 'testEvent',
              eventTags: {
                value: '13.37',
                'non-revenue': 'cool',
              },
              logger: mockLogger,
              userId: 'testUser',
            };

            var actualParams = getConversionEvent(eventOptions);

            assert.deepEqual(actualParams, expectedParams);
          });

          it('should include the falsy event values in the event object', function() {
            var expectedParams = {
              url: 'https://logx.optimizely.com/v1/events',
              httpVerb: 'POST',
              params: {
                client_version: packageJSON.version,
                project_id: '111001',
                visitors: [
                  {
                    attributes: [],
                    visitor_id: 'testUser',
                    snapshots: [
                      {
                        events: [
                          {
                            uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                            tags: {
                              value: '0.0',
                            },
                            timestamp: Math.round(new Date().getTime()),
                            value: 0.0,
                            key: 'testEvent',
                            entity_id: '111095',
                          },
                        ],
                      },
                    ],
                  },
                ],
                account_id: '12001',
                client_name: 'node-sdk',
                revision: '42',
                anonymize_ip: false,
                enrich_decisions: true,
              },
            };

            var eventOptions = {
              clientEngine: 'node-sdk',
              clientVersion: packageJSON.version,
              configObj: configObj,
              eventKey: 'testEvent',
              eventTags: {
                value: '0.0',
              },
              logger: mockLogger,
              userId: 'testUser',
            };

            var actualParams = getConversionEvent(eventOptions);

            assert.deepEqual(actualParams, expectedParams);
          });

          describe('and the event value is invalid', function() {
            it('should not include the event value in the event object', function() {
              var expectedParams = {
                url: 'https://logx.optimizely.com/v1/events',
                httpVerb: 'POST',
                params: {
                  client_version: packageJSON.version,
                  project_id: '111001',
                  visitors: [
                    {
                      attributes: [],
                      visitor_id: 'testUser',
                      snapshots: [
                        {
                          events: [
                            {
                              uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                              tags: {
                                'non-revenue': 'cool',
                                value: 'invalid value',
                              },
                              timestamp: Math.round(new Date().getTime()),
                              key: 'testEvent',
                              entity_id: '111095',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                  account_id: '12001',
                  client_name: 'node-sdk',
                  revision: '42',
                  anonymize_ip: false,
                  enrich_decisions: true,
                },
              };

              var eventOptions = {
                clientEngine: 'node-sdk',
                clientVersion: packageJSON.version,
                configObj: configObj,
                eventKey: 'testEvent',
                eventTags: {
                  value: 'invalid value',
                  'non-revenue': 'cool',
                },
                logger: mockLogger,
                userId: 'testUser',
              };

              var actualParams = getConversionEvent(eventOptions);

              assert.deepEqual(actualParams, expectedParams);
            });
          });
        });
      });

      describe('createEventWithBucketingId', function() {
        it('should send proper bucketingID with user attributes', function() {
          var expectedParams = {
            url: 'https://logx.optimizely.com/v1/events',
            httpVerb: 'POST',
            params: {
              account_id: '12001',
              project_id: '111001',
              visitors: [
                {
                  visitor_id: 'testUser',
                  attributes: [
                    {
                      entity_id: '$opt_bucketing_id',
                      key: '$opt_bucketing_id',
                      type: 'custom',
                      value: 'variation',
                    },
                  ],
                  snapshots: [
                    {
                      events: [
                        {
                          timestamp: Math.round(new Date().getTime()),
                          entity_id: '111095',
                          uuid: 'a68cf1ad-0393-4e18-af87-efe8f01a7c9c',
                          key: 'testEvent',
                        },
                      ],
                    },
                  ],
                },
              ],
              revision: '42',
              client_name: 'node-sdk',
              client_version: packageJSON.version,
              anonymize_ip: false,
              enrich_decisions: true,
            },
          };

          var eventOptions = {
            clientEngine: 'node-sdk',
            clientVersion: packageJSON.version,
            configObj: configObj,
            eventKey: 'testEvent',
            logger: mockLogger,
            userId: 'testUser',
            attributes: { $opt_bucketing_id: 'variation' },
          };

          var actualParams = getConversionEvent(eventOptions);

          assert.deepEqual(actualParams, expectedParams);
        });
      });
    });
  });
});
