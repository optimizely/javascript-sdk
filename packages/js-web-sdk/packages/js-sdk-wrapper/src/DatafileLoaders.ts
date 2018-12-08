import { OptimizelyDatafile } from './Datafile'
import { ResourceLoader, ResourceEmitter } from './ResourceStream'
const fetch = require('node-fetch')

export class ProvidedDatafileLoader implements ResourceLoader<OptimizelyDatafile> {
  private datafile: OptimizelyDatafile

  constructor(config: { datafile: OptimizelyDatafile }) {
    this.datafile = config.datafile
  }

  load(emitter: ResourceEmitter<OptimizelyDatafile>): void {
    emitter.data({
      resourceKey: 'datafile',
      resource: this.datafile,
      metadata: { source: 'fresh' },
    })
    emitter.complete()
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
  private SDKKey: string
  private localStorageKey: string
  private preferCached: boolean
  private backgroundLoadIfCacheHit: boolean

  constructor(config: {
    SDKKey: string
    localStorageKey?: string
    preferCached?: boolean
    backgroundLoadIfCacheHit?: boolean
  }) {
    this.SDKKey = config.SDKKey
    this.localStorageKey = config.localStorageKey || 'optly_fs_datafile'

    this.backgroundLoadIfCacheHit = !!config.backgroundLoadIfCacheHit
    this.preferCached = !!config.preferCached
  }

  load(emitter: ResourceEmitter<OptimizelyDatafile>): void {
    const cacheResult = this.getFromCache()
    if (cacheResult && this.shouldUseCache(cacheResult)) {
      emitter.data({
        resourceKey: 'datafile',
        resource: cacheResult.datafile,
        metadata: { source: 'cache' },
      })
      if (this.preferCached) {
        emitter.complete()
      }
      if (!this.backgroundLoadIfCacheHit) {
        // no need to load anything else, we're done
        return
      }
    }
    this.fetchDatafile().then(
      datafile => {
        emitter.data({
          resourceKey: 'datafile',
          resource: datafile,
          metadata: { source: 'fresh' },
        })
        emitter.complete()
        const cacheEntry: FetchUrlCacheEntry = {
          datafile,
          metadata: {
            timestampCached: new Date().getTime(),
          },
        }
        this.saveToCache(cacheEntry)
      },
      response => {
        emitter.error({
          resourceKey: 'datafile',
          reason: 'failed to load',
        })
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
    const datafileUrl = `https://cdn.optimizely.com/datafiles/${this.SDKKey}.json`
    const resp = await fetch(datafileUrl, { mode: 'cors' })
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
