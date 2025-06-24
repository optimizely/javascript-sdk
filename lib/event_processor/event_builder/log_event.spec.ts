/**
 * Copyright 2022, 2024, Optimizely
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
import { describe, it, expect } from 'vitest';

import {
  makeEventBatch,
  buildLogEvent,
} from './log_event';

import { ImpressionEvent, ConversionEvent, UserEvent } from './user_event';
import { Region } from '../../project_config/project_config';


describe('makeEventBatch', () => {
    it('should build a batch with single impression event when experiment and variation are defined', () => {
    const impressionEvent: ImpressionEvent = {
      type: 'impression',
      timestamp: 69,
      uuid: 'uuid',

      context: {
        accountId: 'accountId',
        projectId: 'projectId',
        clientName: 'node-sdk',
        clientVersion: '3.0.0',
        revision: 'revision',
        botFiltering: true,
        anonymizeIP: true,
      },

      user: {
        id: 'userId',
        attributes: [{ entityId: 'attr1-id', key: 'attr1-key', value: 'attr1-value' }],
      },

      layer: {
        id: 'layerId',
      },

      experiment: {
        id: 'expId',
        key: 'expKey',
      },

      variation: {
        id: 'varId',
        key: 'varKey',
      },

      ruleKey: 'expKey',
      flagKey: 'flagKey1',
      ruleType: 'experiment',
      enabled: true,
    }

    const result = makeEventBatch([impressionEvent])
    expect(result).toEqual({
      client_name: 'node-sdk',
      client_version: '3.0.0',
      account_id: 'accountId',
      project_id: 'projectId',
      revision: 'revision',
      anonymize_ip: true,
      enrich_decisions: true,

      visitors: [
        {
          snapshots: [
            {
              decisions: [
                {
                  campaign_id: 'layerId',
                  experiment_id: 'expId',
                  variation_id: 'varId',
                  metadata: {
                    flag_key: 'flagKey1',
                    rule_key: 'expKey',
                    rule_type: 'experiment',
                    variation_key: 'varKey',
                    enabled: true,
                  },
                },
              ],
              events: [
                {
                  entity_id: 'layerId',
                  timestamp: 69,
                  key: 'campaign_activated',
                  uuid: 'uuid',
                },
              ],
            },
          ],
          visitor_id: 'userId',
          attributes: [
            {
              entity_id: 'attr1-id',
              key: 'attr1-key',
              type: 'custom',
              value: 'attr1-value',
            },
            {
              entity_id: '$opt_bot_filtering',
              key: '$opt_bot_filtering',
              type: 'custom',
              value: true,
            },
          ],
        },
      ],
    })
  })

  it('should build a batch with simlge impression event when experiment and variation are not defined', () => {
    const impressionEvent: ImpressionEvent = {
      type: 'impression',
      timestamp: 69,
      uuid: 'uuid',

      context: {
        accountId: 'accountId',
        projectId: 'projectId',
        clientName: 'node-sdk',
        clientVersion: '3.0.0',
        revision: 'revision',
        botFiltering: true,
        anonymizeIP: true,
      },

      user: {
        id: 'userId',
        attributes: [{ entityId: 'attr1-id', key: 'attr1-key', value: 'attr1-value' }],
      },

      layer: {
        id: null,
      },

      experiment: {
        id: null,
        key: '',
      },

      variation: {
        id: null,
        key: '',
      },

      ruleKey: '',
      flagKey: 'flagKey1',
      ruleType: 'rollout',
      enabled: true,
    }

    const result = makeEventBatch([impressionEvent])
    expect(result).toEqual({
      client_name: 'node-sdk',
      client_version: '3.0.0',
      account_id: 'accountId',
      project_id: 'projectId',
      revision: 'revision',
      anonymize_ip: true,
      enrich_decisions: true,

      visitors: [
        {
          snapshots: [
            {
              decisions: [
                {
                  campaign_id: null,
                  experiment_id: "",
                  variation_id: "",
                  metadata: {
                    flag_key: 'flagKey1',
                    rule_key: '',
                    rule_type: 'rollout',
                    variation_key: '',
                    enabled: true,
                  },
                },
              ],
              events: [
                {
                  entity_id: null,
                  timestamp: 69,
                  key: 'campaign_activated',
                  uuid: 'uuid',
                },
              ],
            },
          ],
          visitor_id: 'userId',
          attributes: [
            {
              entity_id: 'attr1-id',
              key: 'attr1-key',
              type: 'custom',
              value: 'attr1-value',
            },
            {
              entity_id: '$opt_bot_filtering',
              key: '$opt_bot_filtering',
              type: 'custom',
              value: true,
            },
          ],
        },
      ],
    })
  });

    it('should build a batch with single conversion event when tags object is defined', () => {
    const conversionEvent: ConversionEvent = {
      type: 'conversion',
      timestamp: 69,
      uuid: 'uuid',

      context: {
        accountId: 'accountId',
        projectId: 'projectId',
        clientName: 'node-sdk',
        clientVersion: '3.0.0',
        revision: 'revision',
        botFiltering: true,
        anonymizeIP: true,
      },

      user: {
        id: 'userId',
        attributes: [{ entityId: 'attr1-id', key: 'attr1-key', value: 'attr1-value' }],
      },

      event: {
        id: 'event-id',
        key: 'event-key',
      },

      tags: {
        foo: 'bar',
        value: '123',
        revenue: '1000',
      },

      revenue: 1000,
      value: 123,
    }

    const result = makeEventBatch([conversionEvent])
    expect(result).toEqual({
      client_name: 'node-sdk',
      client_version: '3.0.0',
      account_id: 'accountId',
      project_id: 'projectId',
      revision: 'revision',
      anonymize_ip: true,
      enrich_decisions: true,

      visitors: [
        {
          snapshots: [
            {
              events: [
                {
                  entity_id: 'event-id',
                  timestamp: 69,
                  key: 'event-key',
                  uuid: 'uuid',
                  tags: {
                    foo: 'bar',
                    value: '123',
                    revenue: '1000',
                  },
                  revenue: 1000,
                  value: 123,
                },
              ],
            },
          ],
          visitor_id: 'userId',
          attributes: [
            {
              entity_id: 'attr1-id',
              key: 'attr1-key',
              type: 'custom',
              value: 'attr1-value',
            },
            {
              entity_id: '$opt_bot_filtering',
              key: '$opt_bot_filtering',
              type: 'custom',
              value: true,
            },
          ],
        },
      ],
    })
  })

  it('should build a batch with single conversion event when when tags object is undefined', () => {
    const conversionEvent: ConversionEvent = {
      type: 'conversion',
      timestamp: 69,
      uuid: 'uuid',

      context: {
        accountId: 'accountId',
        projectId: 'projectId',
        clientName: 'node-sdk',
        clientVersion: '3.0.0',
        revision: 'revision',
        botFiltering: true,
        anonymizeIP: true,
      },

      user: {
        id: 'userId',
        attributes: [{ entityId: 'attr1-id', key: 'attr1-key', value: 'attr1-value' }],
      },

      event: {
        id: 'event-id',
        key: 'event-key',
      },

      tags: undefined,

      revenue: 1000,
      value: 123,
    }

    const result = makeEventBatch([conversionEvent])
    expect(result).toEqual({
      client_name: 'node-sdk',
      client_version: '3.0.0',
      account_id: 'accountId',
      project_id: 'projectId',
      revision: 'revision',
      anonymize_ip: true,
      enrich_decisions: true,

      visitors: [
        {
          snapshots: [
            {
              events: [
                {
                  entity_id: 'event-id',
                  timestamp: 69,
                  key: 'event-key',
                  uuid: 'uuid',
                  tags: undefined,
                  revenue: 1000,
                  value: 123,
                },
              ],
            },
          ],
          visitor_id: 'userId',
          attributes: [
            {
              entity_id: 'attr1-id',
              key: 'attr1-key',
              type: 'custom',
              value: 'attr1-value',
            },
            {
              entity_id: '$opt_bot_filtering',
              key: '$opt_bot_filtering',
              type: 'custom',
              value: true,
            },
          ],
        },
      ],
    })
  })

  it('should build a batch with single conversion event when event id is null', () => {
    const conversionEvent: ConversionEvent = {
      type: 'conversion',
      timestamp: 69,
      uuid: 'uuid',

      context: {
        accountId: 'accountId',
        projectId: 'projectId',
        clientName: 'node-sdk',
        clientVersion: '3.0.0',
        revision: 'revision',
        botFiltering: true,
        anonymizeIP: true,
      },

      user: {
        id: 'userId',
        attributes: [{ entityId: 'attr1-id', key: 'attr1-key', value: 'attr1-value' }],
      },

      event: {
        id: null,
        key: 'event-key',
      },

      tags: undefined,

      revenue: 1000,
      value: 123,
    }

    const result = makeEventBatch([conversionEvent])
    expect(result).toEqual({
      client_name: 'node-sdk',
      client_version: '3.0.0',
      account_id: 'accountId',
      project_id: 'projectId',
      revision: 'revision',
      anonymize_ip: true,
      enrich_decisions: true,

      visitors: [
        {
          snapshots: [
            {
              events: [
                {
                  entity_id: null,
                  timestamp: 69,
                  key: 'event-key',
                  uuid: 'uuid',
                  tags: undefined,
                  revenue: 1000,
                  value: 123,
                },
              ],
            },
          ],
          visitor_id: 'userId',
          attributes: [
            {
              entity_id: 'attr1-id',
              key: 'attr1-key',
              type: 'custom',
              value: 'attr1-value',
            },
            {
              entity_id: '$opt_bot_filtering',
              key: '$opt_bot_filtering',
              type: 'custom',
              value: true,
            },
          ],
        },
      ],
    })
  })

  it('should include revenue and value for conversion events if they are 0', () => {
    const conversionEvent: ConversionEvent = {
      type: 'conversion',
      timestamp: 69,
      uuid: 'uuid',

      context: {
        accountId: 'accountId',
        projectId: 'projectId',
        clientName: 'node-sdk',
        clientVersion: '3.0.0',
        revision: 'revision',
        botFiltering: true,
        anonymizeIP: true,
      },

      user: {
        id: 'userId',
        attributes: [{ entityId: 'attr1-id', key: 'attr1-key', value: 'attr1-value' }],
      },

      event: {
        id: 'event-id',
        key: 'event-key',
      },

      tags: {
        foo: 'bar',
        value: 0,
        revenue: 0,
      },

      revenue: 0,
      value: 0,
    }

    const result = makeEventBatch([conversionEvent])
    expect(result).toEqual({
      client_name: 'node-sdk',
      client_version: '3.0.0',
      account_id: 'accountId',
      project_id: 'projectId',
      revision: 'revision',
      anonymize_ip: true,
      enrich_decisions: true,

      visitors: [
        {
          snapshots: [
            {
              events: [
                {
                  entity_id: 'event-id',
                  timestamp: 69,
                  key: 'event-key',
                  uuid: 'uuid',
                  tags: {
                    foo: 'bar',
                    value: 0,
                    revenue: 0,
                  },
                  revenue: 0,
                  value: 0,
                },
              ],
            },
          ],
          visitor_id: 'userId',
          attributes: [
            {
              entity_id: 'attr1-id',
              key: 'attr1-key',
              type: 'custom',
              value: 'attr1-value',
            },
            {
              entity_id: '$opt_bot_filtering',
              key: '$opt_bot_filtering',
              type: 'custom',
              value: true,
            },
          ],
        },
      ],
    })
  })

  it('should not include $opt_bot_filtering attribute if context.botFiltering is undefined', () => {
    const conversionEvent: ConversionEvent = {
      type: 'conversion',
      timestamp: 69,
      uuid: 'uuid',

      context: {
        accountId: 'accountId',
        projectId: 'projectId',
        clientName: 'node-sdk',
        clientVersion: '3.0.0',
        revision: 'revision',
        anonymizeIP: true,
      },

      user: {
        id: 'userId',
        attributes: [{ entityId: 'attr1-id', key: 'attr1-key', value: 'attr1-value' }],
      },

      event: {
        id: 'event-id',
        key: 'event-key',
      },

      tags: {
        foo: 'bar',
        value: '123',
        revenue: '1000',
      },

      revenue: 1000,
      value: 123,
    }

    const result = makeEventBatch([conversionEvent])
    expect(result).toEqual({
      client_name: 'node-sdk',
      client_version: '3.0.0',
      account_id: 'accountId',
      project_id: 'projectId',
      revision: 'revision',
      anonymize_ip: true,
      enrich_decisions: true,

      visitors: [
        {
          snapshots: [
            {
              events: [
                {
                  entity_id: 'event-id',
                  timestamp: 69,
                  key: 'event-key',
                  uuid: 'uuid',
                  tags: {
                    foo: 'bar',
                    value: '123',
                    revenue: '1000',
                  },
                  revenue: 1000,
                  value: 123,
                },
              ],
            },
          ],
          visitor_id: 'userId',
          attributes: [
            {
              entity_id: 'attr1-id',
              key: 'attr1-key',
              type: 'custom',
              value: 'attr1-value',
            },
          ],
        },
      ],
    })
  })

  it('should batch Conversion and Impression events together', () => {
    const conversionEvent: ConversionEvent = {
      type: 'conversion',
      timestamp: 69,
      uuid: 'uuid',

      context: {
        accountId: 'accountId',
        projectId: 'projectId',
        clientName: 'node-sdk',
        clientVersion: '3.0.0',
        revision: 'revision',
        botFiltering: true,
        anonymizeIP: true,
      },

      user: {
        id: 'userId',
        attributes: [{ entityId: 'attr1-id', key: 'attr1-key', value: 'attr1-value' }],
      },

      event: {
        id: 'event-id',
        key: 'event-key',
      },

      tags: {
        foo: 'bar',
        value: '123',
        revenue: '1000',
      },

      revenue: 1000,
      value: 123,
    }

    const impressionEvent: ImpressionEvent = {
      type: 'impression',
      timestamp: 69,
      uuid: 'uuid',

      context: {
        accountId: 'accountId',
        projectId: 'projectId',
        clientName: 'node-sdk',
        clientVersion: '3.0.0',
        revision: 'revision',
        botFiltering: true,
        anonymizeIP: true,
      },

      user: {
        id: 'userId',
        attributes: [{ entityId: 'attr1-id', key: 'attr1-key', value: 'attr1-value' }],
      },

      layer: {
        id: 'layerId',
      },

      experiment: {
        id: 'expId',
        key: 'expKey',
      },

      variation: {
        id: 'varId',
        key: 'varKey',
      },

      ruleKey: 'expKey',
      flagKey: 'flagKey1',
      ruleType: 'experiment',
      enabled: true,
    }

    const result = makeEventBatch([impressionEvent, conversionEvent])

    expect(result).toEqual({
      client_name: 'node-sdk',
      client_version: '3.0.0',
      account_id: 'accountId',
      project_id: 'projectId',
      revision: 'revision',
      anonymize_ip: true,
      enrich_decisions: true,

      visitors: [
        {
          snapshots: [
            {
              decisions: [
                {
                  campaign_id: 'layerId',
                  experiment_id: 'expId',
                  variation_id: 'varId',
                  metadata: {
                    flag_key: 'flagKey1',
                    rule_key: 'expKey',
                    rule_type: 'experiment',
                    variation_key: 'varKey',
                    enabled: true,
                  },
                },
              ],
              events: [
                {
                  entity_id: 'layerId',
                  timestamp: 69,
                  key: 'campaign_activated',
                  uuid: 'uuid',
                },
              ],
            },
          ],
          visitor_id: 'userId',
          attributes: [
            {
              entity_id: 'attr1-id',
              key: 'attr1-key',
              type: 'custom',
              value: 'attr1-value',
            },
            {
              entity_id: '$opt_bot_filtering',
              key: '$opt_bot_filtering',
              type: 'custom',
              value: true,
            },
          ],
        },
        {
          snapshots: [
            {
              events: [
                {
                  entity_id: 'event-id',
                  timestamp: 69,
                  key: 'event-key',
                  uuid: 'uuid',
                  tags: {
                    foo: 'bar',
                    value: '123',
                    revenue: '1000',
                  },
                  revenue: 1000,
                  value: 123,
                },
              ],
            },
          ],
          visitor_id: 'userId',
          attributes: [
            {
              entity_id: 'attr1-id',
              key: 'attr1-key',
              type: 'custom',
              value: 'attr1-value',
            },
            {
              entity_id: '$opt_bot_filtering',
              key: '$opt_bot_filtering',
              type: 'custom',
              value: true,
            },
          ],
        },
      ],
    })
  })
})

describe('buildLogEvent', () => {
  it('should select the correct URL based on the event context region', () => {
    const baseEvent: ImpressionEvent = {
      type: 'impression',
      timestamp: 69,
      uuid: 'uuid',
      context: {
        accountId: 'accountId',
        projectId: 'projectId',
        clientName: 'node-sdk',
        clientVersion: '3.0.0',
        revision: 'revision',
        botFiltering: true,
        anonymizeIP: true
      },
      user: {
        id: 'userId',
        attributes: []
      },
      layer: {
        id: 'layerId'
      },
      experiment: {
        id: 'expId',
        key: 'expKey'
      },
      variation: {
        id: 'varId',
        key: 'varKey'
      },
      ruleKey: 'expKey',
      flagKey: 'flagKey1',
      ruleType: 'experiment',
      enabled: true
    };

    // Test for US region
    const usEvent = {
      ...baseEvent,
      context: {
        ...baseEvent.context,
        region: 'US' as Region
      }
    };

    const usResult = buildLogEvent([usEvent]);
    expect(usResult.url).toBe('https://logx.optimizely.com/v1/events');

    // Test for EU region
    const euEvent = {
      ...baseEvent,
      context: {
        ...baseEvent.context,
        region: 'EU' as Region
      }
    };

    const euResult = buildLogEvent([euEvent]);
    expect(euResult.url).toBe('https://eu.logx.optimizely.com/v1/events');
  });
});
