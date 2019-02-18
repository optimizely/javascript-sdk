import { Client } from '@optimizely/optimizely-sdk'
import NoopNotificationCenter from './noop_notification_center'

class DefaultClient implements Client {
  notificationCenter = new NoopNotificationCenter()

  isValidInstance = true

  activate(): null {
    return null
  }

  getVariation(): null {
    return null
  }

  track(): void {
  }

  isFeatureEnabled(): boolean {
    return false
  }

  getEnabledFeatures(): Array<string> {
    return []
  }

  getFeatureVariableString(): null {
    return null
  }

  getFeatureVariableBoolean(): null {
    return null
  }

  getFeatureVariableInteger(): null {
    return null
  }

  getFeatureVariableDouble():  null {
    return null
  }

  getForcedVariation(): null {
    return null
  }

  setForcedVariation(): boolean {
    return false
  }
}

export default function createDefaultClient() {
  return new DefaultClient()
}
