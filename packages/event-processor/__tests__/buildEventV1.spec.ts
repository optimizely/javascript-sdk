/// <reference types="jest" />

import {
  buildConversionEventV1,
  buildImpressionEventV1,
  makeBatchedEventV1,
} from '../src/v1/buildEventV1'
import { ImpressionEvent, ConversionEvent } from '../src/events'

describe('buildEventV1', () => {
  describe('buildImpressionEventV1', () => {
    it('should build an build an ImpressionEventV1', () => {
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
      }

      const result = buildImpressionEventV1(impressionEvent)
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
  })

  describe('buildConversionEventV1', () => {
    it('should build an build a ConversionEventV1', () => {
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

      const result = buildConversionEventV1(conversionEvent)
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

    it('should include revenue and value if they are 0', () => {
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

      const result = buildConversionEventV1(conversionEvent)
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

      const result = buildConversionEventV1(conversionEvent)
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
  })

  describe('makeBatchedEventV1', () => {
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
      }

      const result = makeBatchedEventV1([impressionEvent, conversionEvent])

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
})
