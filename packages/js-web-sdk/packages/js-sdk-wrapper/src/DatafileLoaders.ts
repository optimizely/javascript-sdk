import { OptimizelyDatafile } from './Datafile'
const fetch = require('node-fetch')

export interface InitializationResourceLoader<K> {
  load: () => Promise<K | null>
  loadFromCache: () => K | null
  // if true it will trigger ready if for a cache hit
  preferCached: boolean
  // call load even if a cache hit occurs
  loadIfCacheHit: boolean
}

export class ProvidedDatafileLoader implements InitializationResourceLoader<OptimizelyDatafile> {
  private datafile: OptimizelyDatafile
  public preferCached: boolean
  public loadIfCacheHit: boolean

  constructor(config: { datafile: OptimizelyDatafile }) {
    this.datafile = config.datafile
    this.preferCached = true
    this.loadIfCacheHit = false
  }

  async load(): Promise<OptimizelyDatafile | null> {
    return Promise.resolve(null)
  }

  loadFromCache() {
    return this.datafile
  }
}

export class FetchUrlDatafileLoader implements InitializationResourceLoader<OptimizelyDatafile> {
  private datafileUrl: string
  private localStorageKey: string
  public preferCached: boolean
  public loadIfCacheHit: boolean

  constructor(config: {
    datafileUrl: string
    localStorageKey?: string
    preferCached?: boolean
    backgroundLoadIfCacheHit?: boolean
  }) {
    this.datafileUrl = config.datafileUrl
    this.localStorageKey = config.localStorageKey || 'optly_fs_datafile'
    this.preferCached = !!config.preferCached
    this.loadIfCacheHit = !!config.backgroundLoadIfCacheHit
  }

  async load(): Promise<OptimizelyDatafile> {
    const resp = await fetch(this.datafileUrl, { mode: 'cors' })
    let datafile: any = await resp.json()

    // hanlde this async, dont block on a potentially expensive stringify
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        const toSave = JSON.stringify(datafile)
        window.localStorage.setItem(this.localStorageKey, toSave)
      }, 0)
    }

    return datafile
  }

  loadFromCache(): OptimizelyDatafile | null {
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
