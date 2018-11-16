import * as optimizely from '@optimizely/optimizely-sdk'
import {
  OptimizelyDatafile,
  VariableValue,
  VariableValuesObject,
  VariableType,
  VariableDef,
} from './Datafile'
import {
  UserIdManager,
  StaticUserIdManager,
} from './UserIdManagers'
import { find } from './utils'

export interface IOptimizelySDKWrapper {
  instance: optimizely.Client

  getFeatureVariables: (
    feature: string,
    overrides?: ClientProxyOverrides,
  ) => VariableValuesObject
  isFeatureEnabled: (feature: string, overrides?: ClientProxyOverrides) => boolean
  activate: (experimentKey: string, overrides?: ClientProxyOverrides) => string | null
  track: (
    eventKey: string,
    eventTags?: optimizely.EventTags,
    overrides?: ClientProxyOverrides,
  ) => void
}

export type OptimizelySDKWrapperConfig = {
  datafile?: OptimizelyDatafile
  attributes?: optimizely.UserAttributes
  userId?: string
  userIdManager?: UserIdManager
}

type ClientProxyOverrides = {
  userId?: string
  attributes?: optimizely.UserAttributes | null
  bucketingId?: string
}

interface UserAttributesProvider {
  getAndStoreUserAttributes: () => string
}

interface UserIdProvider {
  getExistingUserId: () => string
  generateAndStoreRandomUserId: () => string
}

type TrackEventCallArgs = [
  string,
  optimizely.EventTags | undefined,
  ClientProxyOverrides
]

export class OptimizelySDKWrapper implements IOptimizelySDKWrapper {
  public instance: optimizely.Client
  public isInitialized: boolean

  protected userIdManager: UserIdManager
  protected datafile: OptimizelyDatafile
  protected userId: string
  protected attributes: optimizely.UserAttributes
  protected onInitializeQueue: Array<Function>
  protected trackEventQueue: Array<TrackEventCallArgs>
  protected featureVariableGetters: {
    string: (
      feature: string,
      variable: string,
      userid: string,
      attributes?: object | undefined,
    ) => string | null
    boolean: (
      feature: string,
      variable: string,
      userid: string,
      attributes?: object | undefined,
    ) => boolean | null
    double: (
      feature: string,
      variable: string,
      userid: string,
      attributes?: object | undefined,
    ) => number | null
    integer: (
      feature: string,
      variable: string,
      userid: string,
      attributes?: object | undefined,
    ) => number | null
  }

  constructor(config: OptimizelySDKWrapperConfig = {}) {
    this.isInitialized = false
    this.onInitializeQueue = []
    this.trackEventQueue = []

    if (config.userIdManager) {
      this.userIdManager = config.userIdManager
    } else if (config.userId) {
      this.userIdManager = new StaticUserIdManager(config.userId)
    } else {
      throw new Error('Must supply "userId" or "userIdManager"')
    }
  }

  /**
   * Initialize happens when the datafile and attributes are fully loaded
   */
  protected initialize(config: {
    datafile: OptimizelyDatafile
    userId: string
    attributes: optimizely.UserAttributes
  }) {
    this.datafile = config.datafile
    this.userId = config.userId
    this.attributes = config.attributes
    this.instance = optimizely.createInstance({
      datafile: config.datafile,
    })
    this.featureVariableGetters = {
      string: this.instance.getFeatureVariableString.bind(this.instance),
      boolean: this.instance.getFeatureVariableBoolean.bind(this.instance),
      double: this.instance.getFeatureVariableDouble.bind(this.instance),
      integer: this.instance.getFeatureVariableInteger.bind(this.instance),
    }
    this.isInitialized = true

    this.flushTrackEventQueue()
    this.flushOnInitializeQueue()
  }

  public activate(experimentKey: string, overrides: ClientProxyOverrides = {}): string | null {
    if (!this.isInitialized) {
      return null
    }
    const [userId, attributes] = this.getUserIdAndAttributes(overrides)
    return this.instance.activate(experimentKey, userId, attributes)
  }

  public track(
    eventKey: string,
    eventTags?: optimizely.EventTags,
    overrides: ClientProxyOverrides = {},
  ): void {
    if (!this.isInitialized) {
      this.trackEventQueue.push([eventKey, eventTags, overrides])
      return
    }
    const [userId, attributes] = this.getUserIdAndAttributes(overrides)
    this.instance.track(eventKey, userId, attributes, eventTags)
  }

  isFeatureEnabled(feature: string, overrides: ClientProxyOverrides = {}): boolean {
    if (!this.isInitialized) {
      return false
    }
    const [userId, attributes] = this.getUserIdAndAttributes(overrides)
    return this.instance.isFeatureEnabled(feature, userId, attributes)
  }

  getFeatureVariables = (
    feature: string,
    overrides: ClientProxyOverrides = {},
  ): VariableValuesObject => {
    const [userId, attributes] = this.getUserIdAndAttributes(overrides)
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

  protected flushOnInitializeQueue(): void {
    while (this.onInitializeQueue.length) {
      let fnToExec = this.onInitializeQueue.shift()
      if (fnToExec) {
        fnToExec()
      }
    }
  }

  protected flushTrackEventQueue(): void {
    while (this.trackEventQueue.length) {
      const args = this.trackEventQueue.shift()
      this.track.apply(this, args)
    }
  }

  protected getUserIdAndAttributes(
    overrides: ClientProxyOverrides,
  ): [string, optimizely.UserAttributes] {
    let userId = this.userIdManager.lookup()
    let attributes = this.attributes

    if (overrides.userId) {
      userId = overrides.userId
    }

    if (overrides.attributes) {
      // should we override or merge attributes here
      attributes = overrides.attributes
    }

    if (overrides.bucketingId) {
      attributes['$opt_bucketing_id'] = overrides.bucketingId
    }

    return [userId, attributes]
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
