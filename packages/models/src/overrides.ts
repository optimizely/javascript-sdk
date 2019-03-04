import { VariablesMap } from './models'

export type OverrideType = 'custom-feature' | 'feature' | 'experiment'

interface BaseOverride {
  type: OverrideType
  userId: string
}

export interface CustomFeatureOverride extends BaseOverride {
  type: 'custom-feature'
  userId: string
  featureKey: string
  featureEnabled: boolean
  featureVariables: VariablesMap
}

export interface FeatureOverride extends BaseOverride {
  type: 'feature'
  userId: string
  featureKey: string
  experimentId: string
  variationId: string
}

export interface ExperimentOverride extends BaseOverride {
  type: 'experiment'
  userId: string
  experimentId: string
  variationId: string
}

export type Override =
  | ExperimentOverride
  | FeatureOverride
  | CustomFeatureOverride

