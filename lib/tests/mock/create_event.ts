export function createImpressionEvent(id: string = 'uuid') {
  return {
    type: 'impression' as const,
    timestamp: 69,
    uuid: id,

    context: {
      accountId: 'accountId',
      projectId: 'projectId',
      clientName: 'node-sdk',
      clientVersion: '3.0.0',
      revision: '1',
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
}