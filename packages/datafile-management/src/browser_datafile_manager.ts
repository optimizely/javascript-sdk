import { default as DefaultDatafileManager, ManagerOptions } from './default_datafile_manager'

const GET_METHOD = 'GET'
const READY_STATE_COMPLETE = 4

// TODO: Better error handling, reject reasons/messages
function fetchDatafile(datafileUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = new XMLHttpRequest()
    req.open(GET_METHOD, datafileUrl, true)
    req.onreadystatechange = () => {
      if (req.readyState === READY_STATE_COMPLETE) {
        if (req.status >= 400) {
          reject('Datafile response error')
          return
        }
        resolve(req.responseText)
      }
    }
    req.send()
  })
}

export default function create(sdkKey: string, options?: ManagerOptions): DefaultDatafileManager {
  return new DefaultDatafileManager(sdkKey, {
    ...options,
    fetchDatafile,
  })
}
