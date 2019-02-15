import { default as DefaultDatafileManager, ManagerOptions, PollingUpdateStrategy } from './default_datafile_manager'

const GET_METHOD = 'GET'
const READY_STATE_COMPLETE = 4

interface CacheEntry {
  timestamp: string
  datafile: string
}

const STORAGE_KEY = 'optly_js_sdk_datafile'

// 1 week in ms = 7 days * 24 hours * 60 minutes * 60 seconds * 1000 ms
const MAX_CACHE_AGE_MS: number = 7 * 24 * 60 * 60 * 1000

function makeCacheEntry(datafile: string): CacheEntry {
  return {
    timestamp: Date.now().toString(),
    datafile,
  }
}

function isFreshAndValid(cacheEntry: CacheEntry): boolean {
  if (typeof cacheEntry.timestamp !== 'number') {
    return false
  }
  return (Date.now() - cacheEntry.timestamp) < MAX_CACHE_AGE_MS
}

// TODO: Better error handling, reject reasons/messages
function fetchDatafile(datafileUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let resolvedFromCache = false
    const cacheEntryStr = window.localStorage.getItem(STORAGE_KEY)
    if (cacheEntryStr !== null) {
      let cacheEntry: CacheEntry | undefined
      try {
        cacheEntry = JSON.parse(cacheEntryStr)
      } catch(e) {
      }
      if (typeof cacheEntry !== 'undefined' && isFreshAndValid(cacheEntry)) {
        resolve(cacheEntry.datafile)
        resolvedFromCache = true
      }
    }

    const req = new XMLHttpRequest()
    req.open(GET_METHOD, datafileUrl, true)
    req.onreadystatechange = () => {
      if (req.readyState === READY_STATE_COMPLETE) {
        if (req.status >= 400 && !resolvedFromCache) {
          reject('Datafile response error')
          return
        }

        if (!resolvedFromCache) {
          resolve(req.responseText)
        }

        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(makeCacheEntry(req.responseText))
        )
      }
    }
    req.send()
  })
}

export default function create(options: ManagerOptions): DefaultDatafileManager {
  return new DefaultDatafileManager({
    ...options,
    fetchDatafile,
    updateStrategy: PollingUpdateStrategy.NEVER,
  })
}
