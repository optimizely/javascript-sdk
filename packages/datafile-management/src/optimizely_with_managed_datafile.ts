// TODO:
// create logger module containing a singleton, setLogger & getLogger. expose setLogger & getLogger as top-level exports of datafile-management package. Later this would be replaced.

import { Client, Config, EventTags, UserAttributes } from '@optimizely/optimizely-sdk'
import { Datafile, DatafileManager, ListenerDisposer } from './datafile_manager_types'
import createStaticDatafileManager from './static_datafile_manager'
import createDefaultClient from './default_client'
import { default as EventEmitter, Listener } from './event_emitter';

export interface OptimizelyWithManagedDatafileConfig {
  clientConfig: Config
  datafile?: Datafile
  sdkKey?: string
  datafileManager?: DatafileManager
  createDefaultDatafileManager: (sdkKey: string) => DatafileManager
  createInstance: (config: Config) => Client
}

const DATAFILE_UPDATE_EVT = 'datafileUpdate'

class OptimizelyWithManagedDatafile implements Client {
  readonly onReady: Promise<void>

  private readonly datafileManager: DatafileManager | undefined

  private client: Client

  private datafileListenerDisposer: ListenerDisposer | undefined

  private emitter: EventEmitter

  private createInstance: (config: Config) => Client

  constructor(config: OptimizelyWithManagedDatafileConfig) {
    const {
      clientConfig,
      createInstance,
      datafile,
      datafileManager,
      createDefaultDatafileManager,
      sdkKey,
    } = config

    this.emitter = new EventEmitter()

    this.createInstance = createInstance

    this.client = createDefaultClient()

    // TODO: If both datafile and sdkKey, seed manager with datafile, but keep updating in thef turue
    if (sdkKey) {
      // TODO: Provide ability to pass through datafile manager options
      this.datafileManager = createDefaultDatafileManager(sdkKey)
    } else if (datafile) {
      this.datafileManager = createStaticDatafileManager(datafile)
    } else if (datafileManager) {
      this.datafileManager = datafileManager
    } else {
      // TODO: Log? Reject with error message str?
      this.onReady = Promise.reject()
      return
    }

    this.datafileManager.start()

    const datafileFromManager = this.datafileManager.get()
    if (datafileFromManager) {
      this.setupClient(datafileFromManager, clientConfig)
      this.onReady = Promise.resolve()
    } else {
      this.onReady = this.datafileManager.onReady.then(freshDatafile => {
        this.setupClient(freshDatafile, clientConfig)
      })
    }

    // TODO: Should log or throw error if clientConfig contains datafile, which won't be used?
    // Or, use it and dont put datafile in the main config?

    // TODO: Need to do runtime config validation because we get consumed by regular JS?

    // TODO: Logging
  }

  activate(
    experimentKey: string,
    userId: string,
    attributes?: UserAttributes,
  ): string | null {
    return this.client.activate(experimentKey, userId, attributes)
  }

  getVariation(
    experimentKey: string,
    userId: string,
    attributes?: UserAttributes,
  ): string | null {
    return this.client.getVariation(experimentKey, userId, attributes)
  }

  track(
    eventKey: string,
    userId: string,
    attributes?: UserAttributes,
    eventTags?: EventTags,
  ): void {
    return this.client.track(eventKey, userId, attributes, eventTags)
  }

  isFeatureEnabled(
    feature: string,
    userId: string,
    attributes?: UserAttributes,
  ): boolean {
    return this.client.isFeatureEnabled(feature, userId, attributes)
  }

  getEnabledFeatures(userId: string, attributes?: UserAttributes): Array<string> {
    return this.client.getEnabledFeatures(userId, attributes)
  }

  getFeatureVariableString(
    feature: string,
    variable: string,
    userId: string,
    attributes?: UserAttributes,
  ): string | null {
    return this.client.getFeatureVariableString(feature, variable, userId, attributes)
  }

  getFeatureVariableBoolean(
    feature: string,
    variable: string,
    userId: string,
    attributes?: UserAttributes,
  ): boolean | null {
    return this.client.getFeatureVariableBoolean(feature, variable, userId, attributes)
  }

  getFeatureVariableInteger(
    feature: string,
    variable: string,
    userId: string,
    attributes?: UserAttributes,
  ): number | null {
    return this.client.getFeatureVariableInteger(feature, variable, userId, attributes)
  }

  getFeatureVariableDouble(
    feature: string,
    variable: string,
    userId: string,
    attributes?: UserAttributes,
  ): number | null {
    return this.client.getFeatureVariableDouble(feature, variable, userId, attributes)
  }

  getForcedVariation(experiment: string, userId: string): string | null {
    return this.client.getVariation(experiment, userId)
  }

  setForcedVariation(
    experiment: string,
    userId: string,
    variationKey: string,
  ): boolean {
    return this.client.setForcedVariation(experiment, userId, variationKey)
  }

  get notificationCenter() {
    return this.client.notificationCenter
  }

  close(): void {
    if (this.datafileListenerDisposer) {
      this.datafileListenerDisposer()
    }
    if (this.datafileManager) {
      this.datafileManager.stop()
    }
  }

  private setupClient(datafile: Datafile, clientConfig: Config): void {
    this.client = this.createInstance({
      ...clientConfig,
      datafile,
    })
    // TODO: Should emit datafile?
    this.emitter.emit(DATAFILE_UPDATE_EVT)

    if (this.datafileManager) {
      this.datafileListenerDisposer = this.datafileManager.onUpdate(nextDatafile => {
        this.client = this.createInstance({
          ...clientConfig,
          datafile: nextDatafile,
        })
        // TODO: Should emit datafile?
        this.emitter.emit(DATAFILE_UPDATE_EVT)
      })
    }
  }

  on(eventName: string, listener: Listener): ListenerDisposer {
    return this.emitter.on(eventName, listener)
  }
}

export default function create(config: OptimizelyWithManagedDatafileConfig): OptimizelyWithManagedDatafile {
  return new OptimizelyWithManagedDatafile(config)
}
