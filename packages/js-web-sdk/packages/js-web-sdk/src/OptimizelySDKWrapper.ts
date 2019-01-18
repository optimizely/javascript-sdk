import * as optimizely from '@optimizely/optimizely-sdk'
import { OptimizelyDatafile, VariableValue, VariableValuesObject, VariableDef } from './Datafile'
import { StaticUserIdLoader, UserId } from './UserIdLoaders'
import { find } from './utils'
import { ProvidedDatafileLoader, FetchUrlDatafileLoader } from './DatafileLoaders'
import { ProvidedAttributesLoader } from './UserAttributesLoaders'
import { ResourceLoader, ResourceManager } from './ResourceManager'

// export types
export { OptimizelyDatafile }
export { VariableValuesObject, VariableValue }

type Partial<T> = { [P in keyof T]?: T[P] }

export interface IOptimizelySDKWrapper {
  instance: optimizely.Client

  getFeatureVariables: (
    feature: string,
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes,
  ) => VariableValuesObject
  isFeatureEnabled: (
    feature: string,
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes,
  ) => boolean
  activate: (
    experimentKey: string,
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes,
  ) => string | null
  track: (
    eventKey: string,
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes,
    eventTags?: optimizely.EventTags,
  ) => void

  getEnabledFeatures: (overrideUserId?: string, overrideAttributes?: optimizely.UserAttributes) => Array<string>

  getVariation: (
    experimentKey: string,
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes,
  ) => string | null

  getForcedVariation: (experimentKey: string, overrideUserId?: string) => string | null

  setForcedVariation: (experimentKey: string, overrideUserId?: string, variationKey?: string) => void
}

export interface OptimizelySDKWrapperConfig extends Partial<optimizely.Config> {
  datafile?: OptimizelyDatafile
  sdkKey?: string
  UNSTABLE_datafileLoader?: ResourceLoader<OptimizelyDatafile>

  attributes?: optimizely.UserAttributes
  UNSTABLE_attributesLoader?: ResourceLoader<optimizely.UserAttributes>

  userId?: string
  UNSTABLE_userIdLoader?: ResourceLoader<UserId>
}

type TrackEventCallArgs = [
  string,
  string | undefined,
  optimizely.UserAttributes | undefined,
  optimizely.EventTags | undefined
]

/**
 * @export
 * @class OptimizelySDKWrapper
 * @implements {IOptimizelySDKWrapper}
 */
export class OptimizelySDKWrapper implements IOptimizelySDKWrapper {
  static featureVariableGetters = {
    string: 'getFeatureVariableString',
    double: 'getFeatureVariableDouble',
    boolean: 'getFeatureVariableBoolean',
    integer: 'getFeatureVariableInteger',
  }

  static passthroughConfig: Array<keyof optimizely.Config> = [
    'errorHandler',
    'eventDispatcher',
    'logger',
    'logLevel',
    'skipJSONValidation',
    'jsonSchemaValidator',
    'userProfileService',
  ]

  public instance: optimizely.Client
  public isInitialized: boolean

  public datafile: OptimizelyDatafile | null
  private userId: string | null
  private attributes: optimizely.UserAttributes

  private initialConfig: OptimizelySDKWrapperConfig

  private trackEventQueue: Array<TrackEventCallArgs>
  // promise keeping track of async requests for initializing client instance
  // This will be `datafile` and `attributes`
  private initializingPromise: Promise<any>

  private resourceManager: ResourceManager

  /**
   * Creates an instance of OptimizelySDKWrapper.
   * @param {OptimizelySDKWrapperConfig} [config={}]
   * @memberof OptimizelySDKWrapper
   */
  constructor(config: OptimizelySDKWrapperConfig = {}) {
    this.initialConfig = config
    this.isInitialized = false
    this.datafile = null
    this.trackEventQueue = []

    this.resourceManager = new ResourceManager({
      datafile: this.setupDatafileLoader(config),
      attributes: this.setupAttributesLoader(config),
      userId: this.setupUserIdLoader(config),
    })

    if (this.resourceManager.allResourcesLoaded()) {
      this.onInitialized()
      this.initializingPromise = Promise.resolve()
    } else {
      this.initializingPromise = this.resourceManager.allResourcePromises()
        .then(() => {
          this.onInitialized();
        })
    }
  }

  /**
   * onReady happens when the datafile and attributes are fully loaded
   * Returns a promise where the resolved value is a boolean indicating whether
   * the optimizely instance has been initialized.  This only is false when
   * you supply a timeout
   *
   * @param {{ timeout?: number }} [config={}]
   * @returns {Promise<boolean>}
   * @memberof OptimizelySDKWrapper
   */
  public async onReady(config: { timeout?: number } = {}): Promise<boolean> {
    let timeoutId: number | undefined

    if (config.timeout == null) {
      return this.initializingPromise.then(() => true, reason => false)
    } else {
      // handle the case where its not initialized and timeout is set

      return Promise.race([
        this.initializingPromise,
        new Promise(resolve => {
          timeoutId = setTimeout(() => resolve(), config.timeout)
        }),
      ]).then(() => {
        if (this.isInitialized && timeoutId) {
          clearTimeout(timeoutId)
        }
        return this.isInitialized
      })
    }
  }

  /**
   *
   *
   * @param {string} experimentKey
   * @param {string} [overrideUserId]
   * @param {optimizely.UserAttributes} [overrideAttributes]
   * @returns {(string | null)}
   * @memberof OptimizelySDKWrapper
   */
  public activate(
    experimentKey: string,
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes,
  ): string | null {
    if (!this.isInitialized) {
      return null
    }
    const [userId, attributes] = this.getUserIdAndAttributes(overrideUserId, overrideAttributes)
    return this.instance.activate(experimentKey, userId, attributes)
  }

  /**
   *
   * @param {string} experimentKey
   * @param {string} [overrideUserId]
   * @param {optimizely.UserAttributes} [overrideAttributes]
   * @returns {(string | null)}
   * @memberof OptimizelySDKWrapper
   */
  public getVariation(
    experimentKey: string,
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes,
  ): string | null {
    if (!this.isInitialized) {
      return null
    }
    const [userId, attributes] = this.getUserIdAndAttributes(overrideUserId, overrideAttributes)
    return this.instance.getVariation(experimentKey, userId, attributes)
  }

  /**
   *
   * Track an event, this method can take two signatures
   * 1) track(eventKey, eventTags?)
   * 2) track(eventKey, overrideUserId?, overrideAttributes?, eventTags?)
   *
   * The first is a shortcut in the case where userId and attributes are stored on the SDK instance
   *
   * @param {string} eventKey
   * @param {(string | optimizely.EventTags)} [overrideUserId]
   * @param {optimizely.UserAttributes} [overrideAttributes]
   * @param {optimizely.EventTags} [eventTags]
   * @memberof OptimizelySDKWrapper
   */
  public track(
    eventKey: string,
    overrideUserId?: string | optimizely.EventTags,
    overrideAttributes?: optimizely.UserAttributes,
    eventTags?: optimizely.EventTags,
  ): void {
    if (typeof overrideUserId !== 'undefined' && typeof overrideUserId !== 'string') {
      eventTags = overrideUserId
      overrideUserId = undefined
      overrideAttributes = undefined
    }

    if (!this.isInitialized) {
      this.trackEventQueue.push([eventKey, overrideUserId, overrideAttributes, eventTags])
      return
    }
    let [userId, attributes] = this.getUserIdAndAttributes(overrideUserId, overrideAttributes)
    this.instance.track(eventKey, userId, attributes, eventTags)
  }

  /**
   * Note: in the case where the feature isnt in the datafile or the datafile hasnt been
   * loaded, this will return `false`
   *
   * @param {string} feature
   * @param {string} [overrideUserId]
   * @param {optimizely.UserAttributes} [overrideAttributes]
   * @returns {boolean}
   * @memberof OptimizelySDKWrapper
   */
  public isFeatureEnabled(
    feature: string,
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes,
  ): boolean {
    if (!this.isInitialized) {
      return false
    }
    const [userId, attributes] = this.getUserIdAndAttributes(overrideUserId, overrideAttributes)
    return this.instance.isFeatureEnabled(feature, userId, attributes)
  }

  /**
   * Get all variables for a feature, regardless of the feature being enabled/disabled
   *
   * @param {string} feature
   * @param {string} [overrideUserId]
   * @param {optimizely.UserAttributes} [overrideAttributes]
   * @returns {VariableValuesObject}
   * @memberof OptimizelySDKWrapper
   */
  public getFeatureVariables(
    feature: string,
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes,
  ): VariableValuesObject {
    if (!this.isInitialized) {
      return {}
    }
    const [userId, attributes] = this.getUserIdAndAttributes(overrideUserId, overrideAttributes)
    const variableDefs = this.getVariableDefsForFeature(feature)
    if (!variableDefs) {
      // TODO: error
      return {}
    }

    const variableObj = {}
    variableDefs.forEach(({ key, type }) => {
      const variableGetFnName = OptimizelySDKWrapper.featureVariableGetters[type]
      const value = variableGetFnName ? this.instance[variableGetFnName](feature, key, userId, attributes) : null

      variableObj[key] = value
    })

    return variableObj
  }

  public getFeatureVariableString(
    feature: string,
    variable: string,
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes,
  ): string | null {
    if (!this.isInitialized) {
      return null
    }
    const [userId, attributes] = this.getUserIdAndAttributes(overrideUserId, overrideAttributes)

    return this.instance.getFeatureVariableString(feature, variable, userId, attributes)
  }

  public getFeatureVariableBoolean(
    feature: string,
    variable: string,
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes,
  ): boolean | null {
    if (!this.isInitialized) {
      return null
    }
    const [userId, attributes] = this.getUserIdAndAttributes(overrideUserId, overrideAttributes)

    return this.instance.getFeatureVariableBoolean(feature, variable, userId, attributes)
  }

  public getFeatureVariableInteger(
    feature: string,
    variable: string,
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes,
  ): number | null {
    if (!this.isInitialized) {
      return null
    }
    const [userId, attributes] = this.getUserIdAndAttributes(overrideUserId, overrideAttributes)

    return this.instance.getFeatureVariableInteger(feature, variable, userId, attributes)
  }

  public getFeatureVariableDouble(
    feature: string,
    variable: string,
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes,
  ): number | null {
    if (!this.isInitialized) {
      return null
    }
    const [userId, attributes] = this.getUserIdAndAttributes(overrideUserId, overrideAttributes)

    return this.instance.getFeatureVariableDouble(feature, variable, userId, attributes)
  }

  /**
   * Get an array of all enabled features
   *
   * @param {string} [overrideUserId]
   * @param {optimizely.UserAttributes} [overrideAttributes]
   * @returns {Array<string>}
   * @memberof OptimizelySDKWrapper
   */
  public getEnabledFeatures(overrideUserId?: string, overrideAttributes?: optimizely.UserAttributes): Array<string> {
    if (!this.isInitialized) {
      return []
    }
    const [userId, attributes] = this.getUserIdAndAttributes(overrideUserId, overrideAttributes)
    return this.instance.getEnabledFeatures(userId, attributes)
  }

  /**
   * @param {string} experiment
   * @param {string} [overrideUserId]
   * @returns {(string | null)}
   * @memberof OptimizelySDKWrapper
   */
  public getForcedVariation(experiment: string, overrideUserId?: string): string | null {
    const [userId] = this.getUserIdAndAttributes(overrideUserId)
    return this.instance.getForcedVariation(experiment, userId)
  }

  /**
   * @param {string} experiment
   * @param {string} overrideUserIdOrVariationKey
   * @param {string} [variationKey]
   * @returns {boolean}
   * @memberof OptimizelySDKWrapper
   */
  public setForcedVariation(experiment: string, overrideUserIdOrVariationKey: string, variationKey?: string): boolean {
    if (typeof variationKey === 'undefined') {
      const [userId] = this.getUserIdAndAttributes()
      return this.instance.setForcedVariation(experiment, userId, overrideUserIdOrVariationKey)
    }

    const [userId] = this.getUserIdAndAttributes(overrideUserIdOrVariationKey)

    return this.instance.setForcedVariation(experiment, userId, variationKey)
  }

  protected getUserIdAndAttributes(
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes,
  ): [string, optimizely.UserAttributes] {
    let userId
    if (overrideUserId) {
      userId = overrideUserId
    } else if (this.userId) {
      userId = this.userId
    }

    if (!userId) {
      // TODO make this a warning
      throw new Error('No userId supplied')
    }

    // TODO store this as state when onInitialized is called
    let attributes = this.attributes
    if (overrideAttributes) {
      // should we override or merge attributes here
      attributes = overrideAttributes
    }

    return [userId, attributes]
  }

  protected getVariableDefsForFeature(feature: string): VariableDef[] | null {
    if (!this.datafile) {
      return null
    }

    const featureDef = find(this.datafile.featureFlags, entry => entry.key === feature)
    if (!featureDef) {
      return null
    }

    return featureDef.variables
  }

  private flushTrackEventQueue(): void {
    while (this.trackEventQueue.length) {
      const args = this.trackEventQueue.shift()
      this.track.apply(this, args)
    }
  }

  private setupAttributesLoader(config: OptimizelySDKWrapperConfig): ResourceLoader<optimizely.UserAttributes> {
    let attributesLoader: ResourceLoader<optimizely.UserAttributes>

    if (config.UNSTABLE_attributesLoader) {
      attributesLoader = config.UNSTABLE_attributesLoader
    } else {
      attributesLoader = new ProvidedAttributesLoader({
        attributes: config.attributes,
      })
    }
    return attributesLoader
  }

  private setupDatafileLoader(config: OptimizelySDKWrapperConfig): ResourceLoader<OptimizelyDatafile> {
    let datafileLoader: ResourceLoader<OptimizelyDatafile>

    if (config.datafile) {
      datafileLoader = new ProvidedDatafileLoader({
        datafile: config.datafile,
      })
    } else if (config.sdkKey) {
      datafileLoader = new FetchUrlDatafileLoader({
        sdkKey: config.sdkKey,
      })
    } else if (config.UNSTABLE_datafileLoader) {
      datafileLoader = config.UNSTABLE_datafileLoader
    } else {
      throw new Error('Must supply either "datafile", "SDKKey" or "datafileLoader"')
    }

    return datafileLoader
  }

  private setupUserIdLoader(config: OptimizelySDKWrapperConfig): ResourceLoader<UserId> {
    if (config.UNSTABLE_userIdLoader) {
      return config.UNSTABLE_userIdLoader
    } else if (config.userId) {
      return new StaticUserIdLoader(config.userId)
    } else {
      return new StaticUserIdLoader(null)
    }
  }

  /**
   * Get options passed in to initialConfig to instantiate every new client with
   */
  private getInstantiationOptions(): Partial<{[k in keyof optimizely.Config]: any}> {
    const opts = {}
    OptimizelySDKWrapper.passthroughConfig.forEach(key => {
      if (this.initialConfig[key]) {
        opts[key] = this.initialConfig[key]
      }
    })
    return opts
  }

  private onInitialized() {
    const datafile = this.resourceManager.datafile.value
    this.userId = this.resourceManager.userId.value || null
    this.attributes = this.resourceManager.attributes.value || {}
    if (datafile) {
      this.datafile = datafile
    }

    // can initialize check
    if (!this.datafile) {
      return
    }

    this.isInitialized = true
    this.instance = optimizely.createInstance({
      datafile: this.datafile,
      ...this.getInstantiationOptions(),
    })
    // TODO: make sure this is flushed after notification listeners can be added
    this.flushTrackEventQueue()
  }
}
