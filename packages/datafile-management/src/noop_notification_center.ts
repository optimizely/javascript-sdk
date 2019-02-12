import { NotificationCenter } from "@optimizely/optimizely-sdk";

// TODO: Logging

export default class NoopNotificationCenter implements NotificationCenter {
  addNotificationListener(notificationType: string, callback: (args: any) => void): number {
    return -1
  }

  removeNotificationListener(listenerId: number): boolean {
    return false
  }

  clearAllNotificationListeners(): void {
  }

  clearNotificationListeners(notificationType: string): void {
  }
}
