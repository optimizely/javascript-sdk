// TODO: Too complex. isReady, resolveOnReady, status, async stuff

import { Datafile, DatafileManager, DatafileUpdateListener } from './datafile_manager_types'
import EventEmitter from './event_emitter';

export interface ManagerOptions {
  datafile?: string | Datafile
  fetchDatafile: (datafileUrl: string) => Promise<string>
  sdkKey: string,
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

  private resolveOnReady: ((datafile: Datafile) => void) | undefined

  // TODO: Reject with what?
  private rejectOnReady: (() => void) | undefined

  // TODO: Clean up this constructor
  constructor({ datafile, sdkKey, urlBuilder = defaultUrlBuilder, fetchDatafile }: ManagerOptions) {
    this.sdkKey = sdkKey
    this.urlBuilder = urlBuilder
    this.emitter = new EventEmitter()
    this.status = ManagerStatus.INITIAL
    this.fetchDatafile = fetchDatafile

    this.currentDatafile = null

    switch (typeof datafile) {
      case 'undefined':
        break

      case 'string':
        let datafileObj: Datafile | undefined
        try {
          datafileObj = JSON.parse(datafile)
        } catch (e) {
          // TODO: log
        }
        if (datafileObj) {
          this.currentDatafile = datafileObj
        }
        break

      default: // type is object
        this.currentDatafile = datafile
        break
    }

    if (this.currentDatafile !== null) {
      this.onReady = Promise.resolve(this.currentDatafile)
    } else {
      this.onReady = new Promise((resolve, reject) => {
        this.resolveOnReady = resolve
        this.rejectOnReady = reject
      })
    }

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

    if (this.currentDatafile !== null) {
      this.startPolling()
    } else {
      // TODO: Should handle errors & retry N times on failure, before rejecting?
      this.fetchAndUpdateCurrentDatafile()
        .then(
          (datafile: Datafile) => {
            if (this.status === ManagerStatus.STARTED) {
              this.startPolling()
            }
            this.resolveOnReady && this.resolveOnReady(datafile)
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
