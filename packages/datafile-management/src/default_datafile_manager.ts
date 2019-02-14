import { Datafile, DatafileManager, DatafileUpdateListener } from './datafile_manager_types'
import EventEmitter from './event_emitter';

export interface ManagerOptions {
  fetchDatafile: (datafileUrl: string) => Promise<string>
  urlBuilder?: (sdkKey: string) => string
}

const enum ManagerStatus {
  INITIAL = "initial",
  STARTED = "started",
  STOPPED = "stopped",
}

// TODO: Should be configurable
const POLLING_INTERVAL = 5000

function defaultUrlBuilder(sdkKey: string): string {
  return `https://cdn.optimizely.com/datafiles/${sdkKey}.json`
}

const UPDATE_EVT = 'update'

export default class DefaultDatafileManager implements DatafileManager {
  readonly onReady: Promise<Datafile>

  private sdkKey: string

  private urlBuilder: (sdkKey: string) => string

  private emitter: EventEmitter

  private currentDatafile: Datafile | null

  // TODO: No NodeJS-specific types in default datafile manager. Must handle this setInterval crap.
  private pollingInterval: NodeJS.Timeout | undefined

  private status: ManagerStatus

  private fetchDatafile: (datafileUrl: string) => Promise<string>

  private resolveOnReady: (() => void) | undefined

  private rejectOnReady: (() => void) | undefined

  private isReady: boolean

  constructor(sdkKey: string, { urlBuilder = defaultUrlBuilder, fetchDatafile }: ManagerOptions) {
    this.sdkKey = sdkKey
    this.urlBuilder = urlBuilder
    this.emitter = new EventEmitter()
    this.currentDatafile = null
    this.status = ManagerStatus.INITIAL
    this.fetchDatafile = fetchDatafile
    this.onReady = new Promise((resolve, reject) => {
      this.resolveOnReady = resolve
      this.rejectOnReady = reject
    })
    this.isReady = false
  }

  get() {
    return this.currentDatafile
  }

  onUpdate(listener: DatafileUpdateListener) {
    return this.emitter.on(UPDATE_EVT, listener)
  }

  // TODO: Ugly
  start() {
    if (this.status === ManagerStatus.STARTED) {
      return
    }

    this.status = ManagerStatus.STARTED

    if (this.isReady) {
      this.startPolling()
    } else {
      // TODO: Should handle errors & retry N times on failure, before rejecting?
      this.fetchAndUpdateCurrentDatafile()
        .then(
          () => {
            this.isReady = true
            if (this.status === ManagerStatus.STARTED) {
              this.startPolling()
            }
            this.resolveOnReady && this.resolveOnReady()
          },
          () => {
            this.rejectOnReady && this.rejectOnReady()
          },
        )
    }
  }

  stop() {
    this.status = ManagerStatus.STOPPED
    if (typeof this.pollingInterval !== 'undefined') {
      clearInterval(this.pollingInterval)
      this.pollingInterval = void 0
    }
  }

  // TODO: Better error handling, reject reasons/messages
  private fetchAndUpdateCurrentDatafile(): Promise<Datafile> {
    return this.fetchDatafile(this.urlBuilder(this.sdkKey))
      .then((datafileStr: string) => {
        const datafileObj = JSON.parse(datafileStr)
        this.currentDatafile = datafileObj
        return datafileObj
      })
  }

  // TODO: Ugly
  // TODO: Only call update if revision is different?
  private startPolling(): void {
    this.pollingInterval = setInterval(() => {
      if (this.status === ManagerStatus.STARTED) {
        this.fetchAndUpdateCurrentDatafile().then((datafile: Datafile) => {
          if (this.status === ManagerStatus.STARTED) {
            this.emitter.emit(UPDATE_EVT, datafile)
          }
        })
      }
    }, POLLING_INTERVAL)
  }
}
