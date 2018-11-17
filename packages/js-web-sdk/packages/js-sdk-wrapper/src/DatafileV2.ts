declare namespace DatafileV2 {
  type VariableValue = string | boolean | number

  type VariablesObject = {
    [key: string]: VariableValue
  }

  type FeatureKey = string
  type Feature = {
    id: string
    key: FeatureKey
    allocation: number
    audienceIds?: Array<AudienceId>
    variables?: VariablesObject
  }

  type ExperimentKey = string

  type ExperimentType = 'abtest' | 'featuretest'

  interface Variation {
    id: string
    key: string
    weight: number
  }

  interface FeatureVariation extends Variation {
    featureEnabled: boolean[]
    variables: VariablesObject
  }

  type ExperimentId = string
  interface Experiment {
    id: ExperimentId
    key: ExperimentKey
    type: ExperimentType
    layerId: string
    audienceIds: Array<AudienceId>
    variations: Array<Variation>
  }

  interface ABExperiment extends Experiment {
    type: 'abtest'
  }

  interface FeatureExperiment extends Experiment {
    type: 'featuretest'
    feature: FeatureKey
    variations: Array<FeatureVariation>
  }

  type AudienceId = string

  type Audience = {
    name: string
    audienceId: AudienceId
    conditions: Array<any>
  }

  type GroupPolicy = 'random'

  type Group = {
    id: string
    policy: GroupPolicy
    experimentAllocation: Array<GroupExperimentAllocation>
  }

  type GroupExperimentAllocation = {
    experiment: ExperimentKey
    allocation: number
  }

  type Attribute = {
    id: string
    key: string
  }

  type Event = {
    experimentIds: Array<ExperimentId>
    id: string
    key: string
  }
}
