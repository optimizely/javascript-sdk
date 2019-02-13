import { NotificationCenter } from "@optimizely/optimizely-sdk"

// TODO: Logging

export default class NoopNotificationCenter implements NotificationCenter {
  addNotificationListener(): number {
    return -1
  }

  removeNotificationListener(): boolean {
    return false
  }

  clearAllNotificationListeners(): void {
  }

  clearNotificationListeners(): void {
  }
}
