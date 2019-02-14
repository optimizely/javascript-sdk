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

  private pollingInterval: NodeJS.Timeout | undefined

  private status: ManagerStatus

  private fetchDatafile: (datafileUrl: string) => Promise<string>

  constructor(sdkKey: string, { urlBuilder = defaultUrlBuilder, fetchDatafile }: ManagerOptions) {
    this.sdkKey = sdkKey
    this.urlBuilder = urlBuilder
    this.emitter = new EventEmitter()
    this.currentDatafile = null
    this.status = ManagerStatus.INITIAL
    this.fetchDatafile = fetchDatafile
    // TODO: Only fetch when start is called
    this.onReady = this.fetchAndUpdateCurrentDatafile()
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

    this.onReady.then(() => {
      if (this.status === ManagerStatus.STARTED) {
        this.startPolling()
      }
    })
  }

  stop() {
    this.status = ManagerStatus.STOPPED
    if (typeof this.pollingInterval !== 'undefined') {
      clearInterval(this.pollingInterval)
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

