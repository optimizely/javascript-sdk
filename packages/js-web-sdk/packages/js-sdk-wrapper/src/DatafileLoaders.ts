import { OptimizelyDatafile } from './Datafile'
const fetch = require('node-fetch')

export interface ResourceLoader<K> {
  load: (connection: ResourceLoaderConnection<K>) => void
}

export interface LoadedResourceMetadata {
  source: 'fresh' | 'cache'
}

export interface FailedLoadedResourceMetadata extends LoadedResourceMetadata {
  reason: string
}

export interface ResourceLoaderConnection<K> {
  load: (resource: K, metadata: LoadedResourceMetadata) => void
  fail: (metadata: FailedLoadedResourceMetadata) => void
  ready: () => void
}

export class ProvidedDatafileLoader implements ResourceLoader<OptimizelyDatafile> {
  private datafile: OptimizelyDatafile

  constructor(config: { datafile: OptimizelyDatafile }) {
    this.datafile = config.datafile
  }

  load(connection: ResourceLoaderConnection<OptimizelyDatafile>): void {
    connection.load(this.datafile, { source: 'fresh' })
    connection.ready()
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

  load(connection: ResourceLoaderConnection<OptimizelyDatafile>): void {
    const cacheResult = this.getFromCache()
    if (cacheResult && this.shouldUseCache(cacheResult)) {
      connection.load(cacheResult.datafile, { source: 'cache' })
      if (this.preferCached) {
        connection.ready()
      }
      if (!this.backgroundLoadIfCacheHit) {
        // no need to load anything else, we're done
        return
      }
    }
    this.fetchDatafile().then(
      datafile => {
        connection.load(datafile, { source: 'fresh' })
        connection.ready()
        const cacheEntry: FetchUrlCacheEntry = {
          datafile,
          metadata: {
            timestampCached: new Date().getTime(),
          },
        }
        this.saveToCache(cacheEntry)
      },
      response => {
        connection.fail({ source: 'fresh', reason: 'failed to load' })
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
