import http from 'http';
import https from 'https';
import url from 'url';
import { Datafile, DatafileManager, DatafileUpdateListener } from './datafile_manager_types'
import EventEmitter from './event_emitter';

// TODO: Refactor to share implementation of some parts with BrowserDatafileManager

interface ManagerOptions {
  urlBuilder?: (sdkKey: string) => string
}

const enum ManagerStatus {
  INITIAL = "initial",
  STARTED = "started",
  STOPPED = "stopped",
}

const POLLING_INTERVAL = 5000

function defaultUrlBuilder(sdkKey: string): string {
  return `https://cdn.optimizely.com/datafiles/${sdkKey}.json`
}

const UPDATE_EVT = 'update'

class NodeDatafileManager implements DatafileManager {
  readonly onReady: Promise<Datafile>

  private sdkKey: string

  private urlBuilder: (sdkKey: string) => string

  private emitter: EventEmitter

  private currentDatafile: Datafile | null

  private pollingInterval: NodeJS.Timeout | undefined

  private status: ManagerStatus

  constructor(sdkKey: string, { urlBuilder = defaultUrlBuilder }: ManagerOptions = {}) {
    this.sdkKey = sdkKey
    this.urlBuilder = urlBuilder
    this.emitter = new EventEmitter()
    this.currentDatafile = null
    this.status = ManagerStatus.INITIAL
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
    return new Promise((resolve, reject) => {
      const parsedUrl = url.parse(this.urlBuilder(this.sdkKey))
      const path = parsedUrl.path
      if (typeof path === 'undefined') {
        reject('Invalid url')
        return
      }
      // TODO: Don't use type assertion
      let pathString = (path as string)
      if (parsedUrl.query) {
        pathString += '?' + parsedUrl.query
      }

      const requestOptions = {
        host: parsedUrl.host,
        path: pathString,
        method: 'GET',
      }

      const requestCallback = (res: http.IncomingMessage) => {
        // TODO: Handle errors? Reject if this condition is not truthy?
        if (typeof res.statusCode === 'number' && res.statusCode >= 200 && res.statusCode < 400) {
          res.setEncoding('utf8')
          let responseData = ''
          res.on('data', (chunk: string) => {
            if (typeof chunk === 'string') {
              responseData += chunk
            }
          })
          res.on('end', () => {
            let datafileObj: object
            try {
              datafileObj = JSON.parse(responseData)
            } catch (e) {
              reject('Error parsing response')
              return
            }
            resolve(datafileObj)
          })
        }
      }

      if (typeof parsedUrl.protocol === 'undefined') {
        reject('Invalid protocol')
        return
      }

      // TODO: Don't use type assertion
      const protocolString = (parsedUrl.protocol as string)
      let req: http.ClientRequest
      if (protocolString === 'https:') {
        req = https.request(requestOptions, requestCallback)
      } else if (protocolString === 'http:') {
        req = http.request(requestOptions, requestCallback)
      } else {
        reject(`Unknown protocol: ${protocolString}`)
        return
      }

      req.on('error', () => {
        // TODO: Handle error
      })

      req.end()
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

export default function create(sdkKey: string, options?: ManagerOptions): NodeDatafileManager {
  return new NodeDatafileManager(sdkKey, options)
}
