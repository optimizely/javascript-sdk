// TODO: Too complex. isReady, resolveOnReady, status, async stuff

import { Datafile, DatafileManager, DatafileUpdateListener } from './datafile_manager_types'
import EventEmitter from './event_emitter';
import { getDatafileRevision } from './datafile'
import { IntervalListener, IntervalClearer } from './interval'

export interface ManagerOptions {
  datafile?: string | Datafile
  sdkKey: string,
  liveUpdates: boolean,
  urlBuilder?: (sdkKey: string) => string
}

const enum ManagerStatus {
  INITIAL = 'initial',
  STARTED = 'started',
  STOPPED = 'stopped',
}

// TODO: Should be configurable
const POLLING_INTERVAL = 5000

function defaultUrlBuilder(sdkKey: string): string {
  return `https://cdn.optimizely.com/datafiles/${sdkKey}.json`
}

const UPDATE_EVT = 'update'

export default abstract class DefaultDatafileManager implements DatafileManager {
  readonly onReady: Promise<Datafile>

  protected abstract fetchDatafile(datafileUrl: string): Promise<string>

  protected abstract setInterval(listener: IntervalListener, intervalMs: number): IntervalClearer

  private sdkKey: string

  private urlBuilder: (sdkKey: string) => string

  private emitter: EventEmitter

  private currentDatafile: Datafile | null

  private intervalClearer: IntervalClearer | undefined

  private status: ManagerStatus

  private resolveOnReady: ((datafile: Datafile) => void) | undefined

  // TODO: Reject with what?
  private rejectOnReady: ((err: Error) => void) | undefined

  private liveUpdates: boolean

  // TODO: Clean up this constructor
  constructor({
    datafile,
    sdkKey,
    liveUpdates,
    urlBuilder = defaultUrlBuilder,
  }: ManagerOptions) {
    this.sdkKey = sdkKey
    this.urlBuilder = urlBuilder
    this.emitter = new EventEmitter()
    this.status = ManagerStatus.INITIAL
    this.currentDatafile = null
    this.liveUpdates = liveUpdates

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

      default: // type is Datafile
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

    let datafileAvailable: Promise<void>
    if (this.currentDatafile) {
      datafileAvailable = Promise.resolve()
    } else {
      datafileAvailable = this.fetchAndParseDatafile()
        .then(
          (datafile: Datafile) => {
            this.currentDatafile = datafile
            this.resolveOnReady && this.resolveOnReady(datafile)
          },
          () => {
            this.rejectOnReady && this.rejectOnReady(new Error('Error fetching and parsing datafile'))
          }
        )
    }

    datafileAvailable.then(() => {
      if (this.liveUpdates && this.status === ManagerStatus.STARTED) {
        this.emitter.emit(UPDATE_EVT, this.currentDatafile)
        this.startPolling()
      }
    })
  }

  stop() {
    this.status = ManagerStatus.STOPPED
    if (typeof this.intervalClearer !== 'undefined') {
      this.intervalClearer()
      this.intervalClearer = void 0
    }
  }

  // TODO: Better error handling, reject reasons/messages
  // TODO: Should handle errors & retry N times on failure, before rejecting?
  private fetchAndParseDatafile(): Promise<Datafile> {
    return this.fetchDatafile(this.urlBuilder(this.sdkKey))
      .then((datafileStr: string) => JSON.parse(datafileStr))
  }

  // TODO: Ugly
  private startPolling(): void {
    this.intervalClearer = this.setInterval(() => {
      if (this.status === ManagerStatus.STARTED) {
        this.fetchAndParseDatafile().then((datafile: Datafile) => {
          if (this.status !== ManagerStatus.STARTED) {
            return
          }

          // TODO: How reliable is revision provided by the backend?
          // Should we design it in a resilient way (i.e., always emit every 5000 ms even if same revision?)
          const priorRevision = getDatafileRevision(this.currentDatafile)
          const newRevision = getDatafileRevision(datafile)
          if (newRevision <= priorRevision) {
            return
          }

          // TODO: Method or setter property to automatically emit every time it's assigned?
          // Doing this in several places
          this.currentDatafile = datafile
          this.emitter.emit(UPDATE_EVT, datafile)
        })
      }
    }, POLLING_INTERVAL)
  }
}
