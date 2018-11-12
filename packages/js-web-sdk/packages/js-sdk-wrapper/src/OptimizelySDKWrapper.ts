import * as optimizely from '@optimizely/optimizely-sdk'
import { find } from './utils'
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

  // deprecated
  readonly typedAudiences: Array<object> /* TODO */
  readonly variables: Array<object>
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
  readonly defaultValue: string | number | boolean
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
  readonly value: string | boolean | number
}

namespace Experiment {
  export type Variation = {
    readonly variables: ExperimentVariationVariables
    readonly id: string
    readonly key: string
    readonly featureEnabled: boolean
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
  [key: string]: VariableValue
}

export interface IOptimizelySDKWrapper {
  datafile: OptimizelyDatafile
  instance: optimizely.Client

  getFeatureVariable: (feature: string, variable: string) => VariableValue | null
  getFeatureVariables: (feature: string) => VariableValuesObject
  isFeatureEnabled: (feature: string) => boolean
  activate: (experimentKey: string) => string | null
  track: (eventKey: string, eventTags?: optimizely.EventTags) => void
}

export type OptimizelySDKWrapperConfig = {
  datafile: OptimizelyDatafile
  userId: string
  attributes?: optimizely.UserAttributes
  bucketingId?: string
}

export class OptimizelySDKWrapper implements IOptimizelySDKWrapper {
  datafile: OptimizelyDatafile
  instance: optimizely.Client
  userId: string
  bucketingId: string | undefined
  attributes: optimizely.UserAttributes | undefined
  featureVariableGetters: {
    string: (
      feature: string,
      variable: string,
      userid: string,
      attributes: object | undefined,
    ) => string
    boolean: (
      feature: string,
      variable: string,
      userid: string,
      attributes: object | undefined,
    ) => boolean
    double: (
      feature: string,
      variable: string,
      userid: string,
      attributes: object | undefined,
    ) => number
    integer: (
      feature: string,
      variable: string,
      userid: string,
      attributes: object | undefined,
    ) => number
  }

  constructor(config: OptimizelySDKWrapperConfig) {
    this.datafile = config.datafile
    this.userId = config.userId
    this.attributes = config.attributes
    this.bucketingId = config.bucketingId
    this.instance = optimizely.createInstance({
      datafile: config.datafile,
    })

    this.featureVariableGetters = {
      string: this.instance.getFeatureVariableString.bind(this.instance),
      boolean: this.instance.getFeatureVariableBoolean.bind(this.instance),
      double: this.instance.getFeatureVariableDouble.bind(this.instance),
      integer: this.instance.getFeatureVariableInteger.bind(this.instance),
    }
  }

  activate(experimentKey: string): string | null {
    let id = this.bucketingId !== undefined ? this.bucketingId : this.userId

    return this.instance.activate(experimentKey, id, this.attributes)
  }

  track(eventKey: string, eventTags?: optimizely.EventTags): void {
    this.instance.track(eventKey, this.userId, this.attributes, eventTags)
  }

  isFeatureEnabled(feature: string): boolean {
    return this.instance.isFeatureEnabled(feature, this.userId, this.attributes)
  }

  getFeatureVariables = (feature: string): VariableValuesObject => {
    const { attributes, userId } = this
    const variableDefs = this.getVariableDefsForFeature(feature)
    if (!variableDefs) {
      // TODO: error
      return {}
    }

    const variableObj = {}
    variableDefs.forEach(({ key, type }) => {
      const getFn = this.featureVariableGetters[type]
      const value = getFn ? getFn(feature, key, userId, attributes) : null

      variableObj[key] = value
    })

    return variableObj
  }

  getFeatureVariable = (feature: string, variable: string): VariableValue | null => {
    const { attributes, userId } = this
    const variableType = this.getFeatureVariableType(feature, variable)
    if (!variableType) {
      return null
    }
    const getFn = this.featureVariableGetters[variableType]
    if (!getFn) {
      return null
    }
    return getFn(feature, variable, userId, attributes)
  }

  protected getVariableDefsForFeature(feature: string): VariableDef[] | null {
    const featureDef = find(this.datafile.featureFlags, entry => entry.key === feature)
    if (!featureDef) {
      return null
    }

    return featureDef.variables
  }

  protected getFeatureVariableType(
    feature: string,
    variable: string,
  ): VariableType | null {
    const variableDef = this.getVariableDef(feature, variable)
    if (!variableDef) {
      return null
    }

    return variableDef.type
  }

  protected getVariableDef(feature: string, variable: string): VariableDef | null {
    const featureDef = find(this.datafile.featureFlags, entry => entry.key === feature)
    if (!featureDef) {
      return null
    }

    const variableDef = find(featureDef.variables, i => i.key === variable)
    if (!variableDef) {
      return null
    }

    return variableDef
  }
}
