import { OptimizelySDKWrapper } from '@optimizely/js-web-sdk'

let globalInstance: OptimizelySDKWrapper

let globalTimeout: number | undefined

export function initialize({
  instance,
  timeout,
}: {
  instance: OptimizelySDKWrapper
  timeout?: number
}) {
  globalInstance = instance
  globalTimeout = timeout
}

export function getTimeout(): number | undefined {
  return globalTimeout
}

export function getInstance(): OptimizelySDKWrapper {
  return globalInstance
}
