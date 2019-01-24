export type VariableValue = string | boolean | number

export type OptimizelyDatafile = {
  readonly version: string
  readonly projectId: string
  readonly accountId: string

  readonly rollouts: RolloutGroup[]
  readonly featureFlags: FeatureFlag[]
  readonly attributes: Attribute[]

  readonly audiences: Audience[]
  readonly groups: Group[]
  readonly experiments: Experiment[]

  readonly anonymizeIP: boolean
  readonly botFiltering: boolean
  readonly revision: string
  readonly events: Event[]

  // deprecated
  readonly typedAudiences: Array<object> /* TODO */
  readonly variables: Array<object>
}

export type Event = {
  experimentIds: Array<string>
  id: string
  key: string
}

export type Group = {
  readonly id: string
  readonly policy: 'random' // TODO
  readonly trafficAllocation: TrafficAllocation[]
  readonly experiments: Experiment[]
}

export type Audience = {
  readonly id: string
  readonly conditions: string
  readonly name: string
}

export type Attribute = {
  readonly id: string
  readonly key: string
}

export type VariableDef = {
  readonly defaultValue: string
  readonly type: VariableType
  readonly id: string
  readonly key: string
}

export type VariableType = 'string' | 'double' | 'integer' | 'boolean'

export type FeatureFlag = {
  readonly id: string
  readonly key: string
  readonly experimentIds: string[]
  readonly rolloutId: string
  readonly variables: VariableDef[]
}

/* is this the right name*/
export type RolloutGroup = {
  readonly id: string
  readonly experiments: Experiment[]
}

export type TrafficAllocation = {
  readonly entityId: string
  readonly endOfRange: number
}

export type ExperimentVariationVariables = {
  readonly id: string
  readonly value: string
}

namespace Experiment {
  export type Variation = {
    readonly variables: ExperimentVariationVariables[]
    readonly id: string
    readonly key: string
    readonly featureEnabled?: boolean
  }
}

export type Experiment = {
  readonly id: string
  readonly status: 'Running' | 'Paused' | 'Not started'
  readonly key: string
  readonly layerId: string
  readonly trafficAllocation: TrafficAllocation[]
  readonly audienceIds: string[]
  readonly variations: Experiment.Variation[]
  readonly forcedVariations: object /** readonly TODO: type */
}

export type VariableValuesObject = {
  [key: string]: VariableValue | null
}