import { OptimizelyDatafile } from './Datafile'
const fetch = require('node-fetch')

export interface DatafileLoader {
  load: () => Promise<OptimizelyDatafile>
}

export interface DatafileCache {
  get: () => OptimizelyDatafile | null
  cache: (datafile: OptimizelyDatafile) => void
}

export class LocalStorageDatafileCache implements DatafileCache {
  private localStorageKey: string

  constructor(
    config: {
      localStorageKey?: string
    } = {},
  ) {
    this.localStorageKey = config.localStorageKey || 'optly-fs-datafile'
  }

  cache(datafile: OptimizelyDatafile): void {
    const toSave = JSON.stringify(datafile)
    window.localStorage.setItem(this.localStorageKey, toSave)
  }

  get(): OptimizelyDatafile | null {
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

/**
 * Fetches a datafile by URL and handles storing it in LocalStorage
 *
 * Note: this uses the window.fetch API and would need to be polyfilled
 * or reimplemented for IE
 */
export class UrlDatafileLoader implements DatafileLoader {
  private datafileUrl: string

  constructor(config: { datafileUrl: string }) {
    this.datafileUrl = config.datafileUrl
  }

  async load(): Promise<OptimizelyDatafile> {
    const resp = await fetch(this.datafileUrl, { mode: 'cors' })
    let datafile: any = await resp.json()
    return datafile
  }
}
