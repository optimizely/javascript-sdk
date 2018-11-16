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
  DatafileLoader,
  LocalStorageDatafileCache,
  DatafileCache,
  UrlDatafileLoader,
} from './DatafileManagers'

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
  datafileLoader?: DatafileLoader
  datafileCache?: DatafileCache
  datafileUrl?: string
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
  static featureVariableGetters: {
    string: 'getFeatureVariableString',
    double: 'getFeatureVariableDouble',
    boolean: 'getFeatureVariableBoolean',
    integer: 'getFeatureVariableInteger',
  }

  public instance: optimizely.Client
  public isInitialized: boolean

  protected userIdManager: UserIdManager

  protected datafileCache: DatafileCache
  protected datafileLoader?: DatafileLoader
  public datafile: OptimizelyDatafile

  // state
  protected userId: string
  protected attributes: optimizely.UserAttributes
  protected onInitializeQueue: Array<Function>
  protected trackEventQueue: Array<TrackEventCallArgs>
  // promise keeping track of async requests for initializing client instance
  // This will be `datafile` and `attributes`
  private initializingPromise: Promise<any>

  constructor(config: OptimizelySDKWrapperConfig = {}) {
    this.isInitialized = false
    this.attributes = {}
    this.onInitializeQueue = []
    this.trackEventQueue = []
    this.datafileCache = config.datafileCache || new LocalStorageDatafileCache()
    this.datafileLoader = config.datafileLoader


    if (config.userIdManager) {
      this.userIdManager = config.userIdManager
    } else if (config.userId) {
      this.userIdManager = new StaticUserIdManager(config.userId)
    } else {
      throw new Error('Must supply "userId" or "userIdManager"')
    }

    if (!config.datafile && !config.datafileUrl && !config.datafileLoader) {
      throw new Error(
        'Must either provide "datafile", "datafileUrl", or "datafileLoader',
      )
    }

    if (config.datafileUrl && config.datafileLoader) {
      throw new Error('Must provide either "datafileUrl", or "datafileLoader')
    }

    if (config.datafileUrl) {
      this.datafileLoader = new UrlDatafileLoader({
        datafileUrl: config.datafileUrl,
      })
    }

    let initializingPromise: Promise<any> = this.loadDatafile(config.datafile)
    if (this.isInitialized) {
      // handle the case where datafile and attributes are both loaded synchronously
      this.onInitialized()
    } else {
      initializingPromise = initializingPromise.then(() => this.onInitialized())
    }
    this.initializingPromise = initializingPromise
  }

  private onInitialized() {
    this.instance = optimizely.createInstance({
      datafile: this.datafile,
    })
    this.isInitialized = true
    this.flushTrackEventQueue()
    this.flushOnInitializeQueue()
  }

  /**
   * initial load of datafile using datafileLoader
   * If a cache is present try to load from cache
   *
   * Returns a promise that's resolved when the datafile is loaded,
   * in the case where a cached datafile exists and a background load happens
   * returns an immediately resolved promise
   */
  private loadDatafile(datafile?: OptimizelyDatafile) {
    if (datafile) {
      this.onDatafileLoaded(datafile)
      return Promise.resolve(datafile)
    }
    if (!this.datafileLoader) {
      throw new Error('Cannot call loadDatafile without instantiated DatafileLoader')
    }

    const cachedResult = this.datafileCache.get()

    if (cachedResult) {
      this.onDatafileLoaded(cachedResult, false)
      this.datafileLoader
        .load()
        .then(datafile => this.onBackgroundDatafileLoaded(datafile))
      return Promise.resolve(cachedResult)
    }

    return this.datafileLoader.load().then(datafile => this.onDatafileLoaded(datafile))
  }

  private onDatafileLoaded(
    datafile: OptimizelyDatafile,
    saveToCache: boolean = true,
  ): OptimizelyDatafile {
    this.datafile = datafile
    if (saveToCache) {
      this.datafileCache.cache(datafile)
    }

    // handle checking if attribtues are here and calling on onInitialized
    return datafile
    // call onReady stuff
  }

  private onBackgroundDatafileLoaded(datafile: OptimizelyDatafile): void {
    this.datafileCache.cache(datafile)
    // TODO determine if we should have another hook for bg datafile loaded
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
    overrides: ClientProxyOverrides = {},
  ): string | null {
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

  public isFeatureEnabled(
    feature: string,
    overrides: ClientProxyOverrides = {},
  ): boolean {
    if (!this.isInitialized) {
      return false
    }
    const [userId, attributes] = this.getUserIdAndAttributes(overrides)
    return this.instance.isFeatureEnabled(feature, userId, attributes)
  }

  public getFeatureVariables = (
    feature: string,
    overrides: ClientProxyOverrides = {},
  ): VariableValuesObject => {
    if (!this.isInitialized) {
      return {}
    }
    const [userId, attributes] = this.getUserIdAndAttributes(overrides)
    const variableDefs = this.getVariableDefsForFeature(feature)
    if (!variableDefs) {
      // TODO: error
      return {}
    }

    const variableObj = {}
    variableDefs.forEach(({ key, type }) => {
      const variableGetFnName = OptimizelySDKWrapper.featureVariableGetters[type]
      const getFn = OptimizelySDKWrapper.featureVariableGetters[type]
      const value = getFn
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
