import http from 'http';
import https from 'https';
import url from 'url';
import DefaultDatafileManager from './default_datafile_manager'
import * as Interval from './interval'
import { DatafileManagerConfig } from './datafile_manager_types';

class NodeDatafileManager extends DefaultDatafileManager {
  // TODO: Better error handling, reject reasons/messages
  protected fetchDatafile(datafileUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const parsedUrl = url.parse(datafileUrl)
      const path = parsedUrl.path
      if (typeof path === 'undefined') {
        reject(new Error('Invalid url'))
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
            resolve(responseData)
          })
        }
      }

      if (typeof parsedUrl.protocol === 'undefined') {
        reject(new Error('Invalid protocol'))
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
        reject(new Error(`Unknown protocol: ${protocolString}`))
        return
      }

      req.on('error', () => {
        // TODO: Handle error
      })

      req.end()
    })
  }

  protected setInterval(listener: Interval.IntervalListener, intervalMs: number) {
    const timeout = setInterval(listener, intervalMs)
    return () => {
      clearTimeout(timeout)
    }
  }
}

// TODO: argument options type should be Partial (or something's not quite right about the interfaces here)
export default function create(options: DatafileManagerConfig): DefaultDatafileManager {
  return new NodeDatafileManager({
    ...options,
    liveUpdates: true,
  })
}
