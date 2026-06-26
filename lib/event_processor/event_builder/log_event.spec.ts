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
import { describe, it, expect, vi } from 'vitest';

import {
  makeEventBatch,
  buildLogEvent,
} from './log_event';

import { ImpressionEvent, ConversionEvent } from './user_event';
import { Region } from '../../project_config/project_config';


describe('makeEventBatch', () => {
    it('should build a batch with single impression event when experiment and variation are defined', () => {
    // Fixtures use valid numeric IDs so the wire output matches the
    // post-normalization happy-path expectations.
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
        id: '11111',
      },

      experiment: {
        id: '22222',
        key: 'expKey',
      },

      variation: {
        id: '33333',
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
                  campaign_id: '11111',
                  experiment_id: '22222',
                  variation_id: '33333',
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
                  entity_id: '11111',
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
    // When campaign_id, experiment_id, and variation_id are all
    // missing/invalid, the normalized wire output is campaign_id=null,
    // variation_id=null, and entity_id mirrors campaign_id byte-for-byte.
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
                  variation_id: null,
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

      // Use numeric-string IDs so the happy-path wire output is unchanged.
      layer: {
        id: '11111',
      },

      experiment: {
        id: '22222',
        key: 'expKey',
      },

      variation: {
        id: '33333',
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
                  campaign_id: '11111',
                  experiment_id: '22222',
                  variation_id: '33333',
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
                  entity_id: '11111',
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
    // Use numeric-string IDs so normalization is a no-op here; this test
    // only covers URL-region behavior.
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
        id: '11111'
      },
      experiment: {
        id: '22222',
        key: 'expKey'
      },
      variation: {
        id: '33333',
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

/**
 * Decision-event ID normalization tests.
 *
 * Pins the normalization contract for decisions[].campaign_id,
 * decisions[].variation_id, and events[].entity_id on impression events:
 *
 *   - campaign_id: non-empty string (opaque IDs allowed); fall back to
 *     experiment_id when empty/null/missing; emit null when both are
 *     empty/null.
 *   - variation_id: non-empty decimal-digit string OR null; any invalid
 *     input (empty, whitespace, non-numeric) normalizes to null.
 *   - events[].entity_id (impression only) follows the campaign_id rule
 *     and must equal decisions[].campaign_id byte-for-byte.
 *   - Rule applies uniformly across all decision types (experiment,
 *     feature-test, rollout, holdout) — no per-type branching.
 *   - Conversion events derive entity_id from event.id and are unchanged.
 *   - Normalization never drops, fails, or logs.
 */
describe('decision event ID normalization', () => {
  const baseContext = {
    accountId: 'accountId',
    projectId: 'projectId',
    clientName: 'node-sdk',
    clientVersion: '3.0.0',
    revision: 'revision',
    botFiltering: true,
    anonymizeIP: true,
  };

  const baseUser = {
    id: 'userId',
    attributes: [],
  };

  const makeImpression = (overrides: {
    layerId: string | null;
    experimentId: string | null;
    variationId: string | null;
    ruleType: string;
  }): ImpressionEvent => ({
    type: 'impression',
    timestamp: 69,
    uuid: 'uuid',
    context: { ...baseContext },
    user: { ...baseUser, attributes: [] },
    layer: { id: overrides.layerId },
    experiment: { id: overrides.experimentId, key: 'expKey' },
    variation: { id: overrides.variationId, key: 'varKey' },
    ruleKey: 'expKey',
    flagKey: 'flagKey1',
    ruleType: overrides.ruleType,
    enabled: true,
  });

  const getDecision = (event: ImpressionEvent) =>
    makeEventBatch([event]).visitors[0].snapshots[0].decisions![0];

  const getSnapshotEvent = (event: ImpressionEvent) =>
    makeEventBatch([event]).visitors[0].snapshots[0].events[0];

  // ---------------------------------------------------------------------------
  // FR-001 / FR-002: campaign_id normalization
  // ---------------------------------------------------------------------------
  describe('campaign_id (FR-001 / FR-002)', () => {
    it('preserves a valid numeric-string layerId', () => {
      const decision = getDecision(
        makeImpression({ layerId: '12345', experimentId: '67890', variationId: '111', ruleType: 'experiment' })
      );
      expect(decision.campaign_id).toBe('12345');
    });

    it('preserves a numeric-string layerId with leading zeros', () => {
      const decision = getDecision(
        makeImpression({ layerId: '00042', experimentId: '67890', variationId: '111', ruleType: 'experiment' })
      );
      expect(decision.campaign_id).toBe('00042');
    });

    it('preserves an opaque non-numeric layerId unchanged', () => {
      // campaign_id contract is "any non-empty string"; opaque IDs like
      // "layer_abc" or "default-12345" pass through unchanged.
      const decision = getDecision(
        makeImpression({ layerId: 'layer_abc', experimentId: '67890', variationId: '111', ruleType: 'experiment' })
      );
      expect(decision.campaign_id).toBe('layer_abc');
    });

    it('preserves a layerId with a negative sign unchanged', () => {
      const decision = getDecision(
        makeImpression({ layerId: '-123', experimentId: '67890', variationId: '111', ruleType: 'experiment' })
      );
      expect(decision.campaign_id).toBe('-123');
    });

    it('preserves a decimal-formatted layerId unchanged', () => {
      const decision = getDecision(
        makeImpression({ layerId: '123.45', experimentId: '67890', variationId: '111', ruleType: 'experiment' })
      );
      expect(decision.campaign_id).toBe('123.45');
    });

    it('preserves an exponential-notation layerId unchanged', () => {
      const decision = getDecision(
        makeImpression({ layerId: '1e5', experimentId: '67890', variationId: '111', ruleType: 'experiment' })
      );
      expect(decision.campaign_id).toBe('1e5');
    });

    it('preserves a whitespace-only layerId unchanged', () => {
      // Whitespace is a non-empty string; only empty string, null, and
      // undefined trigger the experiment_id fallback.
      const decision = getDecision(
        makeImpression({ layerId: '   ', experimentId: '67890', variationId: '111', ruleType: 'experiment' })
      );
      expect(decision.campaign_id).toBe('   ');
    });

    it('substitutes experiment_id when layerId is null', () => {
      const decision = getDecision(
        makeImpression({ layerId: null, experimentId: '67890', variationId: '111', ruleType: 'experiment' })
      );
      expect(decision.campaign_id).toBe('67890');
    });

    it('substitutes experiment_id when layerId is an empty string', () => {
      const decision = getDecision(
        makeImpression({ layerId: '', experimentId: '67890', variationId: '111', ruleType: 'experiment' })
      );
      expect(decision.campaign_id).toBe('67890');
    });

    it('substitutes an opaque experiment_id when layerId is null', () => {
      // experiment_id fallback also accepts any non-empty string.
      const decision = getDecision(
        makeImpression({ layerId: null, experimentId: 'exp_42', variationId: '111', ruleType: 'experiment' })
      );
      expect(decision.campaign_id).toBe('exp_42');
    });

    it('emits null when both layerId and experiment_id are null', () => {
      const decision = getDecision(
        makeImpression({ layerId: null, experimentId: null, variationId: '111', ruleType: 'experiment' })
      );
      expect(decision.campaign_id).toBeNull();
    });

    it('emits null when both layerId and experiment_id are empty strings', () => {
      const decision = getDecision(
        makeImpression({ layerId: '', experimentId: '', variationId: '111', ruleType: 'experiment' })
      );
      expect(decision.campaign_id).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // FR-003 / FR-004: variation_id normalization
  // ---------------------------------------------------------------------------
  describe('variation_id (FR-003 / FR-004)', () => {
    it('preserves a valid numeric-string variationId', () => {
      const decision = getDecision(
        makeImpression({ layerId: '12345', experimentId: '67890', variationId: '99999', ruleType: 'experiment' })
      );
      expect(decision.variation_id).toBe('99999');
    });

    it('preserves a numeric-string variationId with leading zeros', () => {
      const decision = getDecision(
        makeImpression({ layerId: '12345', experimentId: '67890', variationId: '00007', ruleType: 'experiment' })
      );
      expect(decision.variation_id).toBe('00007');
    });

    it('normalizes null variationId to null', () => {
      const decision = getDecision(
        makeImpression({ layerId: '12345', experimentId: '67890', variationId: null, ruleType: 'experiment' })
      );
      expect(decision.variation_id).toBeNull();
    });

    it('normalizes empty-string variationId to null', () => {
      const decision = getDecision(
        makeImpression({ layerId: '12345', experimentId: '67890', variationId: '', ruleType: 'experiment' })
      );
      expect(decision.variation_id).toBeNull();
    });

    it('normalizes whitespace variationId to null', () => {
      const decision = getDecision(
        makeImpression({ layerId: '12345', experimentId: '67890', variationId: '   ', ruleType: 'experiment' })
      );
      expect(decision.variation_id).toBeNull();
    });

    it('normalizes non-numeric variationId to null', () => {
      const decision = getDecision(
        makeImpression({ layerId: '12345', experimentId: '67890', variationId: 'variation_a', ruleType: 'experiment' })
      );
      expect(decision.variation_id).toBeNull();
    });

    it('normalizes negative numeric variationId to null', () => {
      const decision = getDecision(
        makeImpression({ layerId: '12345', experimentId: '67890', variationId: '-1', ruleType: 'experiment' })
      );
      expect(decision.variation_id).toBeNull();
    });

    it('normalizes decimal variationId to null', () => {
      const decision = getDecision(
        makeImpression({ layerId: '12345', experimentId: '67890', variationId: '1.5', ruleType: 'experiment' })
      );
      expect(decision.variation_id).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // FR-005: Uniform application across all decision types
  // ---------------------------------------------------------------------------
  describe('uniform application across decision types (FR-005)', () => {
    const ruleTypes = ['experiment', 'feature-test', 'rollout', 'holdout'];

    ruleTypes.forEach((ruleType) => {
      it(`normalizes campaign_id identically for ruleType=${ruleType}`, () => {
        // null layerId triggers fallback to experiment_id; the fallback
        // fires identically regardless of rule type.
        const decision = getDecision(
          makeImpression({ layerId: null, experimentId: '67890', variationId: '111', ruleType })
        );
        expect(decision.campaign_id).toBe('67890');
      });

      it(`normalizes variation_id identically for ruleType=${ruleType}`, () => {
        const decision = getDecision(
          makeImpression({ layerId: '12345', experimentId: '67890', variationId: 'bad', ruleType })
        );
        expect(decision.variation_id).toBeNull();
      });
    });

    it('produces byte-equivalent campaign_id for the same invalid input across all rule types', () => {
      const outputs = ruleTypes.map((ruleType) =>
        getDecision(
          makeImpression({ layerId: null, experimentId: '67890', variationId: '111', ruleType })
        ).campaign_id
      );
      expect(new Set(outputs).size).toBe(1);
      expect(outputs[0]).toBe('67890');
    });
  });

  // ---------------------------------------------------------------------------
  // FR-006: Never drop, defer, or fail event dispatch
  // ---------------------------------------------------------------------------
  describe('event dispatch resilience (FR-006)', () => {
    it('does not throw on all-invalid inputs', () => {
      expect(() =>
        makeEventBatch([
          makeImpression({ layerId: null, experimentId: null, variationId: null, ruleType: 'holdout' }),
        ])
      ).not.toThrow();
    });

    it('still produces a single visitor + snapshot when ids are invalid', () => {
      const batch = makeEventBatch([
        makeImpression({ layerId: null, experimentId: null, variationId: null, ruleType: 'rollout' }),
      ]);
      expect(batch.visitors).toHaveLength(1);
      expect(batch.visitors[0].snapshots).toHaveLength(1);
      expect(batch.visitors[0].snapshots[0].decisions).toHaveLength(1);
      expect(batch.visitors[0].snapshots[0].events).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // FR-007: Normalization path must not log
  // ---------------------------------------------------------------------------
  describe('silent normalization (FR-007)', () => {
    it('does not write to console.warn or console.error on invalid inputs', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      try {
        makeEventBatch([
          makeImpression({ layerId: 'abc', experimentId: 'def', variationId: 'ghi', ruleType: 'experiment' }),
        ]);
        expect(warnSpy).not.toHaveBeenCalled();
        expect(errorSpy).not.toHaveBeenCalled();
      } finally {
        warnSpy.mockRestore();
        errorSpy.mockRestore();
      }
    });
  });

  // ---------------------------------------------------------------------------
  // FR-008: Cross-SDK byte-equivalent wire output for the same input
  // ---------------------------------------------------------------------------
  describe('byte-equivalent output (FR-008)', () => {
    it('produces identical JSON for two identical event inputs', () => {
      // layerId here is a valid non-empty string (passes through); the
      // variationId is non-numeric and normalizes to null.
      const e1 = makeImpression({
        layerId: 'layer_abc',
        experimentId: '67890',
        variationId: 'bad',
        ruleType: 'experiment',
      });
      const e2 = makeImpression({
        layerId: 'layer_abc',
        experimentId: '67890',
        variationId: 'bad',
        ruleType: 'experiment',
      });
      const out1 = JSON.stringify(makeEventBatch([e1]));
      const out2 = JSON.stringify(makeEventBatch([e2]));
      expect(out1).toBe(out2);
    });
  });

  // ---------------------------------------------------------------------------
  // FR-009: entity_id on impression events equals campaign_id byte-for-byte
  // ---------------------------------------------------------------------------
  describe('impression entity_id equals campaign_id byte-for-byte (FR-009)', () => {
    const cases: Array<{
      name: string;
      layerId: string | null;
      experimentId: string | null;
    }> = [
      { name: 'valid numeric layerId', layerId: '12345', experimentId: '67890' },
      { name: 'opaque non-numeric layerId preserved', layerId: 'layer_abc', experimentId: '67890' },
      { name: 'empty-string layerId falls back to experiment_id', layerId: '', experimentId: '67890' },
      { name: 'null layerId falls back to experiment_id', layerId: null, experimentId: '67890' },
      { name: 'both empty/null -> null', layerId: '', experimentId: '' },
      { name: 'both null -> null', layerId: null, experimentId: null },
      { name: 'layerId leading zeros preserved', layerId: '00099', experimentId: '67890' },
    ];

    cases.forEach(({ name, layerId, experimentId }) => {
      it(`entity_id === campaign_id (${name})`, () => {
        const event = makeImpression({ layerId, experimentId, variationId: '111', ruleType: 'experiment' });
        const decision = getDecision(event);
        const snapshotEvent = getSnapshotEvent(event);
        expect(snapshotEvent.entity_id).toBe(decision.campaign_id);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // FR-010: Conversion events derive entity_id from a different source
  // ---------------------------------------------------------------------------
  describe('conversion entity_id is not normalized (FR-010)', () => {
    const makeConversion = (eventId: string | null): ConversionEvent => ({
      type: 'conversion',
      timestamp: 69,
      uuid: 'uuid',
      context: { ...baseContext },
      user: { ...baseUser, attributes: [] },
      event: { id: eventId, key: 'event-key' },
      tags: undefined,
      revenue: null,
      value: null,
    });

    it('passes through a non-numeric conversion event id unchanged', () => {
      const batch = makeEventBatch([makeConversion('event-id-string')]);
      expect(batch.visitors[0].snapshots[0].events[0].entity_id).toBe('event-id-string');
    });

    it('passes through null conversion event id unchanged', () => {
      const batch = makeEventBatch([makeConversion(null)]);
      expect(batch.visitors[0].snapshots[0].events[0].entity_id).toBeNull();
    });

    it('passes through a numeric conversion event id unchanged', () => {
      const batch = makeEventBatch([makeConversion('42')]);
      expect(batch.visitors[0].snapshots[0].events[0].entity_id).toBe('42');
    });
  });
});
