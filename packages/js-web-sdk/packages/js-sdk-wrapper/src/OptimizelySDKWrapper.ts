import * as optimizely from '@optimizely/optimizely-sdk'
import {
  OptimizelyDatafile,
  VariableValue,
  VariableValuesObject,
  VariableType,
  VariableDef,
} from './Datafile'
import { UserIdManager, StaticUserIdManager } from './UserIdManagers'
import { find } from './utils'
import {
  InitializationResourceLoader,
  ProvidedDatafileLoader,
  FetchUrlDatafileLoader,
} from './DatafileLoaders'
import { ProvidedAttributesLoader } from './UserAttributesManagers'

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
    eventTags?: optimizely.EventTags,
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes,
  ) => void
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
  optimizely.EventTags | undefined,
  string | undefined,
  optimizely.UserAttributes | undefined
]

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

  // state
  private onInitializeQueue: Array<Function>
  private trackEventQueue: Array<TrackEventCallArgs>
  // promise keeping track of async requests for initializing client instance
  // This will be `datafile` and `attributes`
  private initializingPromise: Promise<any>
  private initializingLoaders: Array<Promise<any> | true>

  constructor(config: OptimizelySDKWrapperConfig = {}) {
    this.isInitialized = false
    this.attributes = {}
    this.onInitializeQueue = []
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
      this.initializingPromise = Promise.all(this.initializingLoaders).then(() =>
        this.onInitialized(),
      )
    }
  }

  private setupAttributesLoader(
    config: OptimizelySDKWrapperConfig,
  ): Promise<optimizely.UserAttributes | null> | true {
    let attributesLoader: InitializationResourceLoader<optimizely.UserAttributes>

    if (config.attributesLoader){
      attributesLoader = config.attributesLoader
    } else {
      attributesLoader = new ProvidedAttributesLoader({
        attributes: config.attributes,
      })
    }

    return this.setupInitializationResourceLoader(attributesLoader, (val) => {
      // attributes *can* be null here in the case of a Loader returning null
      this.attributes = val || {}
    })
  }

  private setupDatafileLoader(
    config: OptimizelySDKWrapperConfig,
  ): Promise<OptimizelyDatafile | null> | true {
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

    return this.setupInitializationResourceLoader(datafileLoader, (val) => {
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
    this.flushOnInitializeQueue()
  }

  /**
   * Initialize happens when the datafile and attributes are fully loaded
   * Returns a promise where the resolved value is a boolean indicating whether
   * the optimizely instance has been initialized.  This only is false when
   * you supply a timeout
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

  public activate(
    experimentKey: string,
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes,
  ): string | null {
    if (!this.isInitialized) {
      return null
    }
    const [userId, attributes] = this.getUserIdAndAttributes(
      overrideUserId,
      overrideAttributes,
    )
    return this.instance.activate(experimentKey, userId, attributes)
  }

  public track(
    eventKey: string,
    eventTags?: optimizely.EventTags,
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes,
  ): void {
    if (!this.isInitialized) {
      this.trackEventQueue.push([
        eventKey,
        eventTags,
        overrideUserId,
        overrideAttributes,
      ])
      return
    }
    let [userId, attributes] = this.getUserIdAndAttributes(
      overrideUserId,
      overrideAttributes,
    )
    console.log('tracking', ...arguments)
    this.instance.track(eventKey, userId, attributes, eventTags)
  }

  public isFeatureEnabled(
    feature: string,
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes,
  ): boolean {
    if (!this.isInitialized) {
      return false
    }
    const [userId, attributes] = this.getUserIdAndAttributes(
      overrideUserId,
      overrideAttributes,
    )
    return this.instance.isFeatureEnabled(feature, userId, attributes)
  }

  public getFeatureVariables(
    feature: string,
    overrideUserId?: string,
    overrideAttributes?: optimizely.UserAttributes,
  ): VariableValuesObject {
    if (!this.isInitialized) {
      return {}
    }
    const [userId, attributes] = this.getUserIdAndAttributes(
      overrideUserId,
      overrideAttributes,
    )
    const variableDefs = this.getVariableDefsForFeature(feature)
    if (!variableDefs) {
      // TODO: error
      return {}
    }

    const variableObj = {}
    variableDefs.forEach(({ key, type }) => {
      const variableGetFnName = OptimizelySDKWrapper.featureVariableGetters[type]
      const value = variableGetFnName
        ? this.instance[variableGetFnName](feature, key, userId, attributes)
        : null

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
}
