import { Event, Experiment, FeatureFlag, Audience, Attribute } from './models'

import { keyBy } from '@optimizely/js-sdk-utils'

export interface ProjectConfig {
  getAccountId(): string

  getProjectId(): string

  getRevision(): string

  getAnonymizeIP(): boolean

  getBotFiltering(): boolean

  getExperimentByKey(experimentKey: string): Experiment | null

  getExperimentById(experimentId: string): Experiment | null

  getAudiencesById(): { [audienceId: string]: Audience }

  getFeatureFlagByKey(featureKey: string): FeatureFlag | null

  getAttributeByKey(attributeKey: string): Attribute | null

  getEventByKey(eventKey: string): Event | null

  getAllFeatureKeys(): string[]

  getAllExperimentKeys(): string[]
}

export class OptimizelyProjectConfig implements ProjectConfig {
  private projectId: string
  private accountId: string
  private anonymizeIP: boolean
  private botFiltering: boolean
  private revision: string

  private abExperimentKeys: string[]
  private featureKeys: string[]

  private experimentsByKey: {
    [experimentKey: string]: Experiment
  }

  private experimentsById: {
    [experimentId: string]: Experiment
  }

  private audiencesById: {
    [audienceId: string]: Audience
  }

  private featureFlagsByKey: {
    [featureKey: string]: FeatureFlag
  }

  private eventsByKey: {
    [eventKey: string]: Event
  }

  private attributesByKey: {
    [eventKey: string]: Attribute
  }

  constructor(config: {
    projectId: string
    accountId: string
    anonymizeIP: boolean
    botFiltering: boolean
    revision: string
    featureFlags: FeatureFlag[]
    abExperiments: Experiment[]
    audiences: Audience[]
    events: Event[]
    attributes: Attribute[]
  }) {
    this.projectId = config.projectId
    this.accountId = config.accountId
    this.anonymizeIP = config.anonymizeIP
    this.botFiltering = config.botFiltering
    this.revision = config.revision

    this.audiencesById = keyBy(config.audiences, f => f.id)
    this.eventsByKey = keyBy(config.events, f => f.key)
    this.experimentsById = keyBy(config.abExperiments, f => f.id)
    this.experimentsByKey = keyBy(config.abExperiments, f => f.key)
    this.featureFlagsByKey = keyBy(config.featureFlags, f => f.key)
    this.attributesByKey = keyBy(config.attributes, f => f.key)

    this.abExperimentKeys = Object.keys(this.experimentsByKey)

    config.featureFlags.forEach(flag => {
      const rolloutExp = flag.rolloutExperiment
      if (rolloutExp) {
        // TODO verify that we want to index rollout experiments
        this.experimentsById[rolloutExp.id] = rolloutExp
        this.experimentsByKey[rolloutExp.key] = rolloutExp
      }

      const featureExp = flag.featureExperiment
      if (featureExp) {
        this.experimentsById[featureExp.id] = featureExp
        this.experimentsByKey[featureExp.key] = featureExp
      }
    })

    this.featureKeys = Object.keys(this.featureFlagsByKey)
  }

  getProjectId(): string {
    return this.projectId
  }

  getAccountId(): string {
    return this.accountId
  }

  getAnonymizeIP(): boolean {
    return this.anonymizeIP
  }

  getBotFiltering(): boolean {
    return this.botFiltering
  }

  getRevision(): string {
    return this.revision
  }

  getExperimentById(experimentId: string): Experiment | null {
    return this.experimentsById[experimentId] || null
  }

  getExperimentByKey(experimentKey: string): Experiment | null {
    return this.experimentsByKey[experimentKey] || null
  }

  // TODO handle lookups in typedAudiences and more specific Audience type
  getAudiencesById(): { [audienceId: string]: Audience } {
    return this.audiencesById
  }

  getFeatureFlagByKey(featureKey: string): FeatureFlag | null {
    return this.featureFlagsByKey[featureKey] || null
  }

  getAttributeByKey(attributeKey: string): Attribute | null {
    return this.attributesByKey[attributeKey] || null
  }

  getEventByKey(eventKey: string): Event | null {
    return this.eventsByKey[eventKey] || null
  }

  getAllFeatureKeys(): string[] {
    return this.featureKeys
  }

  // TODO figure out if this should only return AB test keys or include feature test keys
  getAllExperimentKeys(): string[] {
    return this.abExperimentKeys
  }
}

export class TestProjectConfig extends OptimizelyProjectConfig {
  constructor({
    projectId = 'projectId',
    accountId = 'accoundId',
    anonymizeIP = false,
    botFiltering = false,
    revision = 'revision',
    featureFlags = [],
    abExperiments = [],
    audiences = [],
    events = [],
    attributes = [],
  }: {
    projectId?: string
    accountId?: string
    anonymizeIP?: boolean
    botFiltering?: boolean
    revision?: string
    featureFlags?: FeatureFlag[]
    abExperiments?: Experiment[]
    audiences?: Audience[]
    events?: Event[]
    attributes?: Attribute[]
  } = {}) {
    super({
      projectId,
      accountId,
      anonymizeIP,
      botFiltering,
      revision,
      featureFlags,
      abExperiments,
      audiences,
      events,
      attributes,
    })
  }
}
