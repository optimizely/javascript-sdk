import { OptimizelyDatafile } from './Datafile'
import { ResourceLoader } from './ResourceManager'
const fetch = require('node-fetch')

export class ProvidedDatafileLoader implements ResourceLoader<OptimizelyDatafile> {
  private datafile: OptimizelyDatafile

  constructor(config: { datafile: OptimizelyDatafile }) {
    this.datafile = config.datafile
  }

  public load() {
    return this.datafile;
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
  private sdkKey: string
  private localStorageKey: string

  // 1 week in ms = 7 days * 24 hours * 60 minutes * 60 seconds * 1000 ms
  private static MAX_CACHE_AGE_MS: number = 7 * 24 * 60 * 60 * 1000

  constructor(config: {
    sdkKey: string
    localStorageKey?: string
  }) {
    this.sdkKey = config.sdkKey
    this.localStorageKey = config.localStorageKey || 'optly_fs_datafile'
  }

  public load() {
    const cacheResult = this.getFromCache()
    const freshDatafileFetch = this.fetchDatafile().then(
      datafile => {
        this.saveToCache(datafile)
        return datafile;
      }
    )
    if (cacheResult && this.shouldUseCache(cacheResult)) {
      return cacheResult.datafile;
    }
    return freshDatafileFetch;
  }

  saveToCache(datafileToSave: OptimizelyDatafile): void {
    if (typeof window !== 'undefined') {
      const cacheEntry: FetchUrlCacheEntry = {
        datafile: datafileToSave,
        metadata: {
          timestampCached: Date.now(),
        },
      }
      // use setTimeout as to not block on a potentially expensive JSON.stringify
      setTimeout(() => {
        window.localStorage.setItem(this.localStorageKey, JSON.stringify(cacheEntry))
      }, 0)
    }
  }

  shouldUseCache(cacheResult: FetchUrlCacheEntry): boolean {
    return (Date.now() - cacheResult.metadata.timestampCached) <= FetchUrlDatafileLoader.MAX_CACHE_AGE_MS
  }

  async fetchDatafile(): Promise<OptimizelyDatafile> {
    const datafileUrl = `https://cdn.optimizely.com/datafiles/${this.sdkKey}.json`
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
