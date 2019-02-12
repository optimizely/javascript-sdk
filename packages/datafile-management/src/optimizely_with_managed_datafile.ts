import { Client, Config, EventTags, NotificationCenter, UserAttributes } from '@optimizely/optimizely-sdk'
import { Datafile, DatafileManager, ListenerDisposer } from './datafile_manager_types'
import StaticDatafileManager from './static_datafile_manager'
import NoopNotificationCenter from './noop_notification_center'

interface OptimizelyWithManagedDatafile extends Client {
  onReady: Promise<void>
  close: () => void
}

export interface OptimizelyWithManagedDatafileConfig {
  // TODO: Should make datafile illegal to pass in clientConfig?
  clientConfig: Partial<Config>
  datafile?: Datafile
  sdkKey?: string
  datafileManager?: DatafileManager
  defaultDatafileManagerFactory: (sdkKey: string) => DatafileManager
  createInstance: (config: Config) => Client
}

class Optimizely implements OptimizelyWithManagedDatafile {
  readonly onReady: Promise<void>

  private readonly datafileManager: DatafileManager

  private core: Client | undefined

  private datafileListenerDisposer: ListenerDisposer | undefined

  private createInstance: (config: Config) => Client

  private noopNotificationCenter: NotificationCenter

  constructor(config: OptimizelyWithManagedDatafileConfig) {
    const {
      clientConfig,
      createInstance,
      datafile,
      datafileManager,
      defaultDatafileManagerFactory,
      sdkKey,
    } = config

    this.createInstance = createInstance

    if (sdkKey) {
      this.datafileManager = defaultDatafileManagerFactory(sdkKey)
    } else if (datafileManager) {
      this.datafileManager = this.datafileManager
    } else if (datafile) {
      this.datafileManager = new StaticDatafileManager(datafile)
    }

    const managerDatafile = this.datafileManager.get()
    if (managerDatafile) {
      this.setupCore(managerDatafile, clientConfig)
      this.onReady = Promise.resolve()
    } else {
      this.onReady = this.datafileManager.onReady.then(freshDatafile => {
        this.setupCore(freshDatafile, clientConfig)
      })
    }

    // TODO: Should log or throw error if clientConfig contains datafile, which won't be used?
    // Or, use it and dont put datafile in the main config?

    // TODO: Need to do runtime config validation because we get consumed by regular JS?
  }

  activate(
    experimentKey: string,
    userId: string,
    attributes?: UserAttributes,
  ): string | null {
    return null
  }

  getVariation(
    experimentKey: string,
    userId: string,
    attributes?: UserAttributes,
  ): string | null {
    return null
  }

  track(
    eventKey: string,
    userId: string,
    attributes?: UserAttributes,
    eventTags?: EventTags,
  ): void {
  }

  isFeatureEnabled(
    feature: string,
    userId: string,
    attributes?: UserAttributes,
  ): boolean {
    return false
  }

  getEnabledFeatures(userId: string, attributes?: UserAttributes): Array<string> {
    return []
  }

  getFeatureVariableString(
    feature: string,
    variable: string,
    userId: string,
    attributes?: UserAttributes,
  ): string | null {
    return null
  }

  getFeatureVariableBoolean(
    feature: string,
    variable: string,
    userId: string,
    attributes?: UserAttributes,
  ): boolean | null {
    return null
  }

  getFeatureVariableInteger(
    feature: string,
    variable: string,
    userId: string,
    attributes?: UserAttributes,
  ): number | null {
    return null
  }

  getFeatureVariableDouble(
    feature: string,
    variable: string,
    userId: string,
    attributes?: UserAttributes,
  ): number | null {
    return null
  }

  getForcedVariation(experiment: string, userId: string): string | null {
    return null
  }

  setForcedVariation(
    experiment: string,
    userId: string,
    variationKey: string,
  ): boolean {
    return false
  }

  get notificationCenter() {
    if (this.core) {
      return this.core.notificationCenter
    }
    if (!this.noopNotificationCenter) {
      this.noopNotificationCenter = new NoopNotificationCenter()
    }
    return this.noopNotificationCenter
  }

  close(): void {
    if (this.datafileListenerDisposer) {
      this.datafileListenerDisposer()
    }
  }

  private setupCore(datafile: Datafile, clientConfig: Partial<Config>): void {
    this.core = this.createInstance({
      ...clientConfig,
      datafile,
    })

    this.datafileListenerDisposer = this.datafileManager.onUpdate(nextDatafile => {
      this.core = this.createInstance({
        ...clientConfig,
        datafile: nextDatafile,
      })
    })
  }
}

export default Optimizely
