/// <reference types="jest" />

import {
  OptimizelyExperiment,
  OptimizelyGroup,
  OptimizelyVariation,
  OptimizelyAttribute,
  OptimizelyEvent,
  OptimizelyAudience,
  VariableType,
  OptimizelyFeature,
} from '../src/models'

describe('models', () => {
  describe('OptimizelyExperiment', () => {
    it('should instantiate and have working getter methods', () => {
      const variation1 = new OptimizelyVariation({
        id: 'id1',
        key: 'key1',
        experimentId: 'id',
        featureEnabled: false,
        variables: {},
      })

      const variation2 = new OptimizelyVariation({
        id: 'id2',
        key: 'key2',
        experimentId: 'id',
        featureEnabled: false,
        variables: {},
      })

      const group = new OptimizelyGroup({
        id: 'group1',
        policy: 'random',
        experimentIds: ['id'],
        trafficAllocation: [{ entityId: 'id', endOfRange: 10000 }],
      })

      const experiment = new OptimizelyExperiment({
        id: 'id',
        status: 'Running',
        key: 'key',
        layerId: 'layerId',
        audienceIds: ['1'],
        variations: [variation1, variation2],
        trafficAllocation: [
          { entityId: variation1.id, endOfRange: 5000 },
          { entityId: variation2.id, endOfRange: 10000 },
        ],
        forcedVariations: {
          jordan: variation1.key,
        },
        group,
      })

      expect(experiment.id).toBe('id')
      expect(experiment.key).toBe('key')
      expect(experiment.status).toBe('Running')
      expect(experiment.layerId).toBe('layerId')
      expect(experiment.audienceIds).toEqual(['1'])
      expect(experiment.group).toBe(group)
      expect(experiment.audienceIds).toEqual(['1'])

      expect(experiment.getUserForcedVariation('jordan')).toEqual(variation1)
      expect(experiment.getUserForcedVariation('invalid')).toBeNull()

      expect(experiment.getVariationByKey('key2')).toBe(variation2)
      expect(experiment.getVariationById('id2')).toBe(variation2)

      expect(experiment.trafficAllocation.findContainingBucket(7000)).toBe(variation2)
    })
  })

  describe('OptimizelyAttribute', () => {
    it('should instantiate and have working getter methods', () => {
      const attribute = new OptimizelyAttribute({
        id: 'id',
        key: 'key',
      })

      expect(attribute.id).toBe('id')
      expect(attribute.key).toBe('key')
    })
  })

  describe('OptimizelyEvent', () => {
    it('should instantiate and have working getter methods', () => {
      const event = new OptimizelyEvent({
        id: 'id',
        key: 'key',
      })

      expect(event.id).toBe('id')
      expect(event.key).toBe('key')
    })
  })

  describe('OptimizelyAudience', () => {
    it('should instantiate and have working getter methods', () => {
      const event = new OptimizelyAudience({
        id: 'id',
        name: 'audience',
        conditions: [
          'and',
          { type: 'attribute', name: 'foo', value: 'bar', match: 'eq' },
        ],
      })

      expect(event.id).toBe('id')
      expect(event.name).toBe('audience')
      expect(event.conditions).toEqual([
        'and',
        { type: 'attribute', name: 'foo', value: 'bar', match: 'eq' },
      ])
    })
  })

  describe('OptimizelyFeature', () => {
    it('should instantiate and have working getter methods', () => {
      const rolloutVariation = new OptimizelyVariation({
        id: 'id1',
        key: 'key1',
        experimentId: 'rollout-id',
        featureEnabled: true,
        variables: {
          foo: {
            key: 'foo',
            value: 'bar',
            type: VariableType.STRING,
          },
        },
      })

      const rolloutExperiment = new OptimizelyExperiment({
        id: 'rollout-id',
        status: 'Running',
        key: 'rollout-key',
        layerId: 'rollout-layerId',
        audienceIds: [],
        variations: [rolloutVariation],
        trafficAllocation: [{ entityId: rolloutVariation.id, endOfRange: 5000 }],
        forcedVariations: {},
      })

      const expVariation1 = new OptimizelyVariation({
        id: 'exp-id1',
        key: 'exp-key1',
        experimentId: 'exp-id',
        featureEnabled: true,
        variables: {
          foo: {
            key: 'foo',
            value: 'value1',
            type: VariableType.STRING,
          },
        },
      })

      const expVariation2 = new OptimizelyVariation({
        id: 'exp-id2',
        key: 'exp-key2',
        experimentId: 'exp-id',
        featureEnabled: false,
        variables: {
          foo: {
            key: 'foo',
            value: 'value2',
            type: VariableType.STRING,
          },
        },
      })

      const featureExperiment = new OptimizelyExperiment({
        id: 'exp-id',
        status: 'Running',
        key: 'exp-key',
        layerId: 'exp-layerId',
        audienceIds: [],
        variations: [expVariation1, expVariation2],
        trafficAllocation: [
          { entityId: expVariation1.id, endOfRange: 5000 },
          { entityId: expVariation2.id, endOfRange: 10000 },
        ],
        forcedVariations: {},
      })

      const feature = new OptimizelyFeature({
        id: 'feature-id',
        key: 'feature-key',
        defaultVariables: {
          foo: {
            key: 'foo',
            value: 'bar',
            type: VariableType.STRING,
          },
        },
        featureExperiment,
        rolloutExperiment,
      })

      expect(feature.id).toBe('feature-id')
      expect(feature.key).toBe('feature-key')
      expect(feature.defaultVariables).toEqual({
        foo: {
          key: 'foo',
          value: 'bar',
          type: VariableType.STRING,
        },
      })
      expect(feature.rolloutExperiment).toBe(rolloutExperiment)
      expect(feature.featureExperiment).toBe(featureExperiment)
    })
  })
})
