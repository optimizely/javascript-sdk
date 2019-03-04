import { Omit, find, keyBy } from '@optimizely/js-sdk-utils'
import { ExperimentOverride } from './overrides'

export type VariableValue = string | boolean | number

export enum VariableType {
  STRING = 'string',
  DOUBLE = 'double',
  INTEGER = 'integer',
  BOOLEAN = 'boolean',
}

export type Variable = {
  key: string
  value: VariableValue | null
  type: VariableType
}

export type VariablesMap = {
  [variableKey: string]: Variable
}
/**
 * Types for Audience Conditions
 */
type ConditionOperator = 'and' | 'or' | 'not'

export type LeafCondition = {
  type: string
  name: string
  value: any
  // TODO figure out if we want to separate types for leafConditions
  // for SDK 3.0 audiences
  match?: string
}

interface DeepArray<T> extends Array<T | DeepArray<T>> {}

export type ConditionGroup<T> = DeepArray<ConditionOperator | T>

export type AudienceIdConditions = ConditionGroup<string>

export type AudienceConditions = ConditionGroup<LeafCondition>

type TrafficAllocations = { entityId: string; endOfRange: number }[]

interface TrafficAllocation<T> {
  getAllocations(): TrafficAllocations

  findContainingBucket(bucketValue: number): T | null
}

export interface Attribute {
  id: string
  key: string
}

export interface Event {
  id: string
  key: string
}

export interface Audience {
  id: string
  name: string
  conditions: AudienceConditions
}

export interface Group {
  id: string
  policy: 'random' // TODO should this be an enum / type
  experimentIds: string[]
  // return the experimentId or null
  trafficAllocation: TrafficAllocation<string>
}

type UserVariationMap = {
  [userId: string]: string // variationId
}

type ExperimentStatus = 'Running' | 'Launched' | 'Paused' | 'Not started'

export interface Experiment {
  id: string
  status: ExperimentStatus
  key: string
  layerId: string
  audienceIds: string[]
  group: Group | null

  trafficAllocation: TrafficAllocation<Variation>

  getUserForcedVariation(userId: string): Variation | null
  getVariationByKey(key: string): Variation | null
  getVariationById(id: string): Variation | null
}

export interface Variation {
  id: string
  key: string
  experimentId: string
  variables: VariablesMap
  featureEnabled?: boolean

  createOverride(): Omit<ExperimentOverride, 'userId'>
}

export interface FeatureFlag {
  id: string
  key: string
  defaultVariables: VariablesMap
  // TODO do we want to support multiple experiments on a feature
  featureExperiment: Experiment | null
  rolloutExperiment: Experiment | null
  // TODO is a method like createOverride good here?
}

export class OptimizelyFeature implements FeatureFlag {
  private _id: string
  private _key: string
  private _defaultVariables: VariablesMap
  private _featureExperiment?: Experiment
  private _rolloutExperiment: Experiment

  constructor({
    id,
    key,
    defaultVariables,
    featureExperiment,
    rolloutExperiment,
  }: {
    id: string
    key: string
    defaultVariables: VariablesMap
    featureExperiment?: Experiment
    rolloutExperiment: Experiment
  }) {
    this._id = id
    this._key = key
    this._defaultVariables = defaultVariables
    this._featureExperiment = featureExperiment
    this._rolloutExperiment = rolloutExperiment
  }

  get id(): string {
    return this._id
  }

  get key(): string {
    return this._key
  }

  get defaultVariables(): VariablesMap {
    return this._defaultVariables
  }

  get featureExperiment(): Experiment | null {
    return this._featureExperiment || null
  }

  get rolloutExperiment(): Experiment {
    return this._rolloutExperiment
  }
}

class OptimizelyTrafficAllocation<K> implements TrafficAllocation<K> {
  private entityIdMap: { [key: string]: K }
  private allocations: TrafficAllocations

  constructor(config: {
    allocations: TrafficAllocations
    entityIdMap?: { [key: string]: K }
  }) {
    this.allocations = config.allocations
    this.entityIdMap = config.entityIdMap || {}
  }

  getAllocations(): TrafficAllocations {
    return this.allocations
  }

  findContainingBucket(bucketValue: number): K | null {
    const entityId = findBucket(bucketValue, this.allocations)
    if (!entityId) {
      return null
    }

    return this.entityIdMap[entityId] || null
  }
}

export class OptimizelyExperiment implements Experiment {
  public trafficAllocation: TrafficAllocation<Variation>

  private _id: string
  private _status: ExperimentStatus
  private _key: string
  private _layerId: string
  private _audienceIds: string[]
  private _variations: Variation[]
  private _group?: Group
  // TODO namespace TrafficeAllocation to OptimizelyDatafile.TrafficAllocation
  private _forcedVariations: UserVariationMap

  constructor({
    id,
    status,
    key,
    layerId,
    audienceIds,
    variations,
    trafficAllocation,
    forcedVariations,
    group,
  }: {
    // these can be taken straight from DatafileExperiment
    id: string
    status: ExperimentStatus
    key: string
    layerId: string
    audienceIds: string[]
    trafficAllocation: TrafficAllocations
    forcedVariations: UserVariationMap
    // these must be constructed separately
    variations: Variation[]
    group?: Group
  }) {
    this._id = id
    this._status = status
    this._key = key
    this._layerId = layerId
    this._audienceIds = audienceIds
    this._variations = variations
    this._forcedVariations = forcedVariations
    this._group = group

    this.trafficAllocation = new OptimizelyTrafficAllocation({
      allocations: trafficAllocation,
      entityIdMap: keyBy(variations, variation => variation.id),
    })
  }

  get id() {
    return this._id
  }

  get status() {
    return this._status
  }

  get key() {
    return this._key
  }

  get layerId() {
    return this._layerId
  }

  get audienceIds() {
    return this._audienceIds
  }


  get group():Group | null {
    return this._group || null
  }

  getUserForcedVariation(userId: string): Variation | null {
    const variationKey = this._forcedVariations[userId]
    if (!variationKey) {
      return null
    }

    return this.getVariationByKey(variationKey)
  }

  getVariationByKey(key: string): Variation | null {
    return find(this._variations, variation => variation.key === key) || null
  }

  getVariationById(id: string): Variation | null {
    return find(this._variations, variation => variation.id === id) || null
  }
}

/**
 * Returns entity ID associated with bucket value
 * @param  {number}   bucketValue
 * @param  {DatafileTrafficAllocation[]} trafficAllocations
 * @return {string}   Entity ID for bucketing if bucket value is within traffic allocation boundaries, null otherwise
 */
function findBucket(
  bucketValue: number,
  trafficAllocations: TrafficAllocations,
): string | null {
  for (var i = 0; i < trafficAllocations.length; i++) {
    if (bucketValue < trafficAllocations[i].endOfRange) {
      return trafficAllocations[i].entityId
    }
  }
  return null
}

export class OptimizelyVariation implements Variation {
  private _id: string
  private _key: string
  private _variables: VariablesMap
  private _experimentId: string
  private _featureEnabled?: boolean

  constructor({
    id,
    experimentId,
    key,
    variables,
    featureEnabled,
  }: {
    id: string
    experimentId: string
    key: string
    variables: VariablesMap
    featureEnabled: boolean
  }) {
    this._id = id
    this._experimentId = experimentId
    this._key = key
    this._variables = variables
    this._featureEnabled = featureEnabled
  }

  get id() {
    return this._id
  }

  get key() {
    return this._key
  }

  get experimentId() {
    return this._experimentId
  }

  get variables() {
    return this._variables
  }

  get featureEnabled() {
    return this._featureEnabled
  }

  createOverride(): Omit<ExperimentOverride, 'userId'> {
    return {
      type: 'experiment',
      variationId: this.id,
      experimentId: this.experimentId,
    }
  }
}

export class OptimizelyGroup implements Group {
  _id: string
  _policy: 'random'
  _experimentIds: string[]
  _trafficAllocation: TrafficAllocation<string>

  constructor({
    id,
    policy,
    experimentIds,
    trafficAllocation,
  }: {
    id: string
    policy: 'random'
    experimentIds: string[]
    trafficAllocation: TrafficAllocations
  }) {
    this._id = id
    this._policy = policy
    this._experimentIds = experimentIds
    this._trafficAllocation = new OptimizelyTrafficAllocation({
      allocations: trafficAllocation,
    })
  }

  get id() {
    return this._id
  }

  get policy() {
    return this._policy
  }

  get experimentIds() {
    return this._experimentIds
  }

  get trafficAllocation() {
    return this._trafficAllocation
  }
}

export class OptimizelyAttribute implements Attribute {
  private _id: string
  private _key: string

  constructor(config: { id: string; key: string }) {
    this._id = config.id
    this._key = config.key
  }

  get id() {
    return this._id
  }

  get key() {
    return this._key
  }
}

export class OptimizelyEvent implements Event {
  private _id: string
  private _key: string

  constructor(config: { id: string; key: string }) {
    this._id = config.id
    this._key = config.key
  }

  get id() {
    return this._id
  }

  get key() {
    return this._key
  }
}

export class OptimizelyAudience implements Audience {
  private _id: string
  private _name: string
  private _conditions: AudienceConditions

  constructor(config: { id: string; name: string; conditions: AudienceConditions }) {
    this._id = config.id
    this._name = config.name
    this._conditions = config.conditions
  }

  get id() {
    return this._id
  }

  get name() {
    return this._name
  }

  get conditions() {
    return this._conditions
  }
}
