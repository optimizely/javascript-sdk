import { OptimizelyDatafile } from './Datafile'
import { ResourceLoader, ResourceObserver } from './ResourceLoader'
const fetch = require('node-fetch')

export class ProvidedDatafileLoader implements ResourceLoader<OptimizelyDatafile> {
  private datafile: OptimizelyDatafile

  constructor(config: { datafile: OptimizelyDatafile }) {
    this.datafile = config.datafile
  }

  load(observer: ResourceObserver<OptimizelyDatafile>): void {
    observer.next({
      resource: this.datafile,
      metadata: { source: 'fresh' },
    })
    observer.complete()
  }
}

type FetchUrlCacheMetadata = {
  timestampCached: number
}
type FetchUrlCacheEntry = {
  datafile: OptimizelyDatafile
  metadata: FetchUrlCacheMetadata
}

export class FetchUrlDatafileLoader implements ResourceLoader<OptimizelyDatafile> {
  private datafileUrl: string
  private localStorageKey: string
  private preferCached: boolean
  private backgroundLoadIfCacheHit: boolean

  constructor(config: {
    datafileUrl: string
    localStorageKey?: string
    preferCached?: boolean
    backgroundLoadIfCacheHit?: boolean
  }) {
    this.datafileUrl = config.datafileUrl
    this.localStorageKey = config.localStorageKey || 'optly_fs_datafile'

    this.backgroundLoadIfCacheHit = !!config.backgroundLoadIfCacheHit
    this.preferCached = !!config.preferCached
  }

  load(observer: ResourceObserver<OptimizelyDatafile>): void {
    const cacheResult = this.getFromCache()
    if (cacheResult && this.shouldUseCache(cacheResult)) {
      observer.next({
        resource: cacheResult.datafile,
        metadata: { source: 'cache' },
      })
      if (this.preferCached) {
        observer.complete()
      }
      if (!this.backgroundLoadIfCacheHit) {
        // no need to load anything else, we're done
        return
      }
    }
    this.fetchDatafile().then(
      datafile => {
        observer.next({
          resource: datafile,
          metadata: { source: 'fresh' },
        })
        observer.complete()
        const cacheEntry: FetchUrlCacheEntry = {
          datafile,
          metadata: {
            timestampCached: new Date().getTime(),
          },
        }
        this.saveToCache(cacheEntry)
      },
      response => {
        observer.error({ source: 'fresh', reason: 'failed to load' })
      },
    )
  }

  saveToCache(toSave: FetchUrlCacheEntry): void {
    if (typeof window !== 'undefined') {
      // use setTimeout as to not block on a potentially expensive JSON.stringify
      setTimeout(() => {
        window.localStorage.setItem(this.localStorageKey, JSON.stringify(toSave))
      }, 0)
    }
  }

  shouldUseCache(cacheResult: FetchUrlCacheEntry): boolean {
    return true
  }

  async fetchDatafile(): Promise<OptimizelyDatafile> {
    const resp = await fetch(this.datafileUrl, { mode: 'cors' })
    if (resp.status !== 200) {
      return Promise.reject(resp)
    }

    let datafile: any = await resp.json()
    // TODO handle errors

    return datafile
  }

  getFromCache(): FetchUrlCacheEntry | null {
    if (typeof window === 'undefined') {
      return null
    }
    const item = window.localStorage.getItem(this.localStorageKey)
    if (!item) {
      return null
    }
    let toReturn
    try {
      toReturn = JSON.parse(item)
    } catch (e) {
      toReturn = null
    }
    return toReturn
  }
}
