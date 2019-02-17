// TODO: Too complex. isReady, resolveOnReady, status, async stuff

import { Datafile, DatafileManager, DatafileUpdateListener } from './datafile_manager_types'
import EventEmitter from './event_emitter';
import { getDatafileRevision } from './datafile'
import * as Interval from './interval'

export interface ManagerOptions {
  datafile?: string | Datafile
  fetchDatafile: (datafileUrl: string) => Promise<string>
  intervalSetter: Interval.IntervalSetter,
  sdkKey: string,
  updateStrategy: PollingUpdateStrategy
  urlBuilder?: (sdkKey: string) => string
}

const enum ManagerStatus {
  INITIAL = 'initial',
  STARTED = 'started',
  STOPPED = 'stopped',
}

// TODO: Make this a boolean: liveUpdates yes or no
export const enum PollingUpdateStrategy {
  NEW_REVISION = 'new_revision',
  NEVER = 'never',
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

  private intervalSetter: Interval.IntervalSetter

  private intervalClearer: Interval.IntervalClearer | undefined

  private status: ManagerStatus

  private fetchDatafile: (datafileUrl: string) => Promise<string>

  private resolveOnReady: ((datafile: Datafile) => void) | undefined

  // TODO: Reject with what?
  private rejectOnReady: (() => void) | undefined

  private updateStrategy: PollingUpdateStrategy

  // TODO: Clean up this constructor
  constructor({
    datafile,
    fetchDatafile,
    intervalSetter,
    sdkKey,
    updateStrategy,
    urlBuilder = defaultUrlBuilder,
  }: ManagerOptions) {
    this.sdkKey = sdkKey
    this.urlBuilder = urlBuilder
    this.emitter = new EventEmitter()
    this.status = ManagerStatus.INITIAL
    this.fetchDatafile = fetchDatafile
    this.currentDatafile = null
    this.intervalSetter = intervalSetter
    this.updateStrategy = updateStrategy

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

    if (this.updateStrategy === PollingUpdateStrategy.NEVER) {
      return
    }

    if (this.currentDatafile !== null) {
      this.startPolling()
    } else {
      // TODO: Should handle errors & retry N times on failure, before rejecting?
      this.fetchAndParseDatafile()
        .then(
          (datafile: Datafile) => {
            this.currentDatafile = datafile
            this.emitter.emit(UPDATE_EVT, datafile)
            this.resolveOnReady && this.resolveOnReady(datafile)
            if (this.status === ManagerStatus.STARTED) {
              this.startPolling()
            }
          },
          () => {
            this.rejectOnReady && this.rejectOnReady()
          },
        )
    }
  }

  stop() {
    this.status = ManagerStatus.STOPPED
    if (typeof this.intervalClearer !== 'undefined') {
      this.intervalClearer()
      this.intervalClearer = void 0
    }
  }

  // TODO: Better error handling, reject reasons/messages
  private fetchAndParseDatafile(): Promise<Datafile> {
    return this.fetchDatafile(this.urlBuilder(this.sdkKey))
      .then((datafileStr: string) => JSON.parse(datafileStr))
  }

  // TODO: Ugly
  // TODO: Only call update if revision is different?
  private startPolling(): void {
    this.intervalClearer = this.intervalSetter.setInterval(() => {
      if (this.status === ManagerStatus.STARTED) {
        this.fetchAndParseDatafile().then((datafile: Datafile) => {
          if (this.status !== ManagerStatus.STARTED) {
            return
          }

          if (this.updateStrategy === PollingUpdateStrategy.NEW_REVISION) {
            const priorRevision = getDatafileRevision(this.currentDatafile)
            console.log('prior revision: ', priorRevision)
            const newRevision = getDatafileRevision(datafile)
            console.log('new revision: ', newRevision)
            if (newRevision <= priorRevision) {
              return
            }
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
