import * as optimizely from '@optimizely/optimizely-sdk'
import { OptimizelyDatafile, VariableValue, VariableValuesObject, VariableDef } from './Datafile'
import { UserIdManager, StaticUserIdManager } from './UserIdManagers'
import { find } from './utils'
import { InitializationResourceLoader, ProvidedDatafileLoader, FetchUrlDatafileLoader } from './DatafileLoaders'
import { ProvidedAttributesLoader } from './UserAttributesLoaders'

// export types
export { OptimizelyDatafile }
export { VariableValuesObject, VariableValue }

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
}

export type OptimizelySDKWrapperConfig = {
  datafile?: OptimizelyDatafile
  datafileUrl?: string
  datafileLoader?: InitializationResourceLoader<OptimizelyDatafile>

  attributes?: optimizely.UserAttributes
  attributesLoader?: InitializationResourceLoader<optimizely.UserAttributes>

  userId?: string
  userIdManager?: UserIdManager
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

  public instance: optimizely.Client
  public isInitialized: boolean
  public datafile: OptimizelyDatafile | null

  private userIdManager: UserIdManager
  private attributes: optimizely.UserAttributes

  private trackEventQueue: Array<TrackEventCallArgs>
  // promise keeping track of async requests for initializing client instance
  // This will be `datafile` and `attributes`
  private initializingPromise: Promise<any>
  private initializingLoaders: Array<Promise<any> | true>

  /**
   * Creates an instance of OptimizelySDKWrapper.
   * @param {OptimizelySDKWrapperConfig} [config={}]
   * @memberof OptimizelySDKWrapper
   */
  constructor(config: OptimizelySDKWrapperConfig = {}) {
    this.isInitialized = false
    this.datafile = null
    this.attributes = {}
    this.trackEventQueue = []
    this.initializingLoaders = []

    if (config.userIdManager) {
      this.userIdManager = config.userIdManager
    } else if (config.userId) {
      this.userIdManager = new StaticUserIdManager(config.userId)
    }

    this.initializingLoaders.push(this.setupDatafileLoader(config))
    this.initializingLoaders.push(this.setupAttributesLoader(config))

    if (this.initializingLoaders.every(a => a === true)) {
      // handle case where everything initializes synchronously
      this.onInitialized()
      this.initializingPromise = Promise.resolve()
    } else {
      this.initializingPromise = Promise.all(this.initializingLoaders).then(() => this.onInitialized())
    }
  }

  /**
   * onREady happens when the datafile and attributes are fully loaded
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

    if (this.isInitialized) {
      return Promise.resolve(true)
    } else if (config.timeout == null) {
      return this.initializingPromise.then(() => true)
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
    console.log('tracking', eventKey, userId, attributes, eventTags)
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

  protected getUserIdAndAttributes(
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes,
  ): [string, optimizely.UserAttributes] {
    let userId
    if (overrideUserId) {
      userId = overrideUserId
    } else if (this.userIdManager) {
      userId = this.userIdManager.lookup()
    }

    if (!userId) {
      // TODO make this a warning
      throw new Error('No userId supplied')
    }

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

  private setupAttributesLoader(config: OptimizelySDKWrapperConfig): Promise<optimizely.UserAttributes | null> | true {
    let attributesLoader: InitializationResourceLoader<optimizely.UserAttributes>

    if (config.attributesLoader) {
      attributesLoader = config.attributesLoader
    } else {
      attributesLoader = new ProvidedAttributesLoader({
        attributes: config.attributes,
      })
    }

    return this.setupInitializationResourceLoader(attributesLoader, val => {
      // attributes *can* be null here in the case of a Loader returning null
      this.attributes = val || {}
    })
  }

  private setupDatafileLoader(config: OptimizelySDKWrapperConfig): Promise<OptimizelyDatafile | null> | true {
    let datafileLoader: InitializationResourceLoader<OptimizelyDatafile>

    if (config.datafile) {
      datafileLoader = new ProvidedDatafileLoader({
        datafile: config.datafile,
      })
    } else if (config.datafileUrl) {
      datafileLoader = new FetchUrlDatafileLoader({
        datafileUrl: config.datafileUrl,
        preferCached: true,
        backgroundLoadIfCacheHit: true,
      })
    } else if (config.datafileLoader) {
      datafileLoader = config.datafileLoader
    } else {
      throw new Error('Must supply either "datafile", "datafileUrl" or "datafileLoader"')
    }

    return this.setupInitializationResourceLoader(datafileLoader, val => {
      this.datafile = val
    })
  }

  private setupInitializationResourceLoader<K>(
    loader: InitializationResourceLoader<K>,
    propertySetter: (value: K | null) => void,
  ): Promise<K | null> | true {
    const { preferCached, loadIfCacheHit } = loader
    const cachedResult = loader.loadFromCache()

    if (cachedResult) {
      propertySetter(cachedResult)
      // this[property] = cachedResult

      if (loadIfCacheHit) {
        // fire off background loading for next page view
        // load can have the side-effect of saving to cache
        loader.load().then(result => {
          // what do we do with null here, does that indicate there is an error
          // an empty project would still have a bare bones datafile
          // only case where null would happen is if the environment was deleted
          propertySetter(result)
        })
      }

      if (preferCached) {
        // by returning true here we are saying this initializer is ready to go
        return true
      }
    }
    // returning the `load()` allows us to race against the timeout in onReady()
    return loader.load().then(result => {
      propertySetter(result)
      return result
    })
  }

  private onInitialized() {
    if (!this.datafile) {
      // could not initialize
      return
    }
    this.instance = optimizely.createInstance({
      datafile: this.datafile,
    })
    this.isInitialized = true
    this.flushTrackEventQueue()
  }
}
