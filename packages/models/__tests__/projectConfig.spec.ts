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
  Event,
  Audience,
  FeatureFlag,
  Experiment,
  Attribute,
} from '../src/models'

import { OptimizelyProjectConfig, ProjectConfig } from '../src/projectConfig'

describe('projectConfig', () => {
  describe('OptimizelyProjectConfig', () => {
    let projectConfig: ProjectConfig
    let event: Event
    let attribute: Attribute
    let audience: Audience
    let feature: FeatureFlag
    let experiment: Experiment
    let featureExperiment: Experiment
    let rolloutExperiment: Experiment

    beforeEach(() => {
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

      rolloutExperiment = new OptimizelyExperiment({
        id: 'rollout-id',
        status: 'Running',
        key: 'rollout-key',
        layerId: 'rollout-layerId',
        audienceIds: [],
        variations: [rolloutVariation],
        trafficAllocation: [{ entityId: rolloutVariation.id, endOfRange: 5000 }],
        forcedVariations: {},
      })

      const featureExpVariation1 = new OptimizelyVariation({
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

      const featureExpVariation2 = new OptimizelyVariation({
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

      featureExperiment = new OptimizelyExperiment({
        id: 'exp-id',
        status: 'Running',
        key: 'exp-key',
        layerId: 'exp-layerId',
        audienceIds: [],
        variations: [featureExpVariation1, featureExpVariation2],
        trafficAllocation: [
          { entityId: featureExpVariation1.id, endOfRange: 5000 },
          { entityId: featureExpVariation2.id, endOfRange: 10000 },
        ],
        forcedVariations: {},
      })

      feature = new OptimizelyFeature({
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

      experiment = new OptimizelyExperiment({
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

      attribute = new OptimizelyAttribute({
        id: 'id',
        key: 'key',
      })

      event = new OptimizelyEvent({
        id: 'id',
        key: 'key',
      })

      audience = new OptimizelyAudience({
        id: 'id',
        name: 'audience',
        conditions: [
          'and',
          { type: 'attribute', name: 'foo', value: 'bar', match: 'eq' },
        ],
      })

      projectConfig = new OptimizelyProjectConfig({
        projectId: 'projectId',
        accountId: 'accountId',
        anonymizeIP: true,
        botFiltering: true,
        revision: 'revision',
        featureFlags: [feature],
        abExperiments: [experiment],
        audiences: [audience],
        events: [event],
        attributes: [attribute],
      })
    })

    it('getProjectId()', () => {
      expect(projectConfig.getProjectId()).toBe('projectId')
    })

    it('getAccountId()', () => {
      expect(projectConfig.getAccountId()).toBe('accountId')
    })

    it('getAnonymizeIP()', () => {
      expect(projectConfig.getAnonymizeIP()).toBe(true)
    })

    it('getBotFiltering()', () => {
      expect(projectConfig.getBotFiltering()).toBe(true)
    })

    it('getRevision()', () => {
      expect(projectConfig.getRevision()).toBe('revision')
    })


    describe('getExperimentById', () => {
      it('should return experiment when matches', () => {
        expect(projectConfig.getExperimentById('id')).toBe(experiment)
      })

      it('should return null when no experiment matches', () => {
        expect(projectConfig.getExperimentById('uhhhh')).toBeNull()
      })

      it('should return feature experiments', () => {
        expect(projectConfig.getExperimentById('exp-id')).toBe(featureExperiment)
      })

      it('should return rollout experiments', () => {
        expect(projectConfig.getExperimentById('rollout-id')).toBe(rolloutExperiment)
      })
    })

    describe('getExperimentByKey', () => {
      it('should return experiment when matches', () => {
        expect(projectConfig.getExperimentByKey('key')).toBe(experiment)
      })

      it('should return null when no experiment matches', () => {
        expect(projectConfig.getExperimentByKey('uhhhh')).toBeNull()
      })

      it('should return feature experiments', () => {
        expect(projectConfig.getExperimentByKey('exp-key')).toBe(featureExperiment)
      })

      it('should return rollout experiments', () => {
        expect(projectConfig.getExperimentByKey('rollout-key')).toBe(rolloutExperiment)
      })
    })

    describe('getAudiencesById', () => {
      it('should return a map of audienceId => Audience', () => {
        expect(projectConfig.getAudiencesById()).toEqual({
          'id': audience
        })
      })
    })

    describe('getFeatureFlagByKey', () => {
      it('should return FeatureFlag when found', () => {
        expect(projectConfig.getFeatureFlagByKey('feature-key')).toBe(feature)
      })

      it('should return null when not found', () => {
        expect(projectConfig.getFeatureFlagByKey('uhhh')).toBeNull()
      })
    })

    describe('getAttributeByKey', () => {
      it('should return Attribute when found', () => {
        expect(projectConfig.getAttributeByKey('key')).toBe(attribute)
      })

      it('should return null when not found', () => {
        expect(projectConfig.getAttributeByKey('uhhh')).toBeNull()
      })
    })

    describe('getEventByKey', () => {
      it('should return Event when found', () => {
        expect(projectConfig.getEventByKey('key')).toBe(event)
      })

      it('should return null when not found', () => {
        expect(projectConfig.getEventByKey('uhhh')).toBeNull()
      })
    })

    describe('getAllFeatureKeys', () => {
      it('should return an array all feature keys', () => {
        expect(projectConfig.getAllFeatureKeys()).toEqual(['feature-key'])
      })
    })

    describe('getAllExperimentKeys', () => {
      it('should return only abExperiment keys', () => {
        expect(projectConfig.getAllExperimentKeys()).toEqual(['key'])
      })
    })

  })
})
