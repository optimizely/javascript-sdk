/**
 * Copyright 2023, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { getLogger, LogHandler, LogLevel } from '../../modules/logging';
import { NotificationCenter, createNotificationCenter } from '../../core/notification_center';

/**
 * Internal notification center registry for managing multiple notification centers.
 */
export class NotificationRegistry {
  private static _notificationCenters = new Map<string, NotificationCenter>();

  constructor() {}

  /**
   * Retrieves an SDK Key's corresponding notification center in the registry if it exists, otherwise it creates one
   * @param sdkKey SDK Key to be used for the notification center tied to the ODP Manager
   * @param logger Logger to be used for the corresponding notification center
   * @returns {NotificationCenter | undefined} a notification center instance for ODP Manager if a valid SDK Key is provided, otherwise undefined
   */
  static getNotificationCenter(sdkKey?: string, logger: LogHandler = getLogger()): NotificationCenter | undefined {
    if (!sdkKey) {
      logger.log(LogLevel.ERROR, 'No SDK key provided to getNotificationCenter.');
      return undefined;
    }

    let notificationCenter;
    if (this._notificationCenters.has(sdkKey)) {
      notificationCenter = this._notificationCenters.get(sdkKey);
    } else {
      notificationCenter = createNotificationCenter({
        logger,
        errorHandler: { handleError: () => {} },
      });
      this._notificationCenters.set(sdkKey, notificationCenter);
    }

    return notificationCenter;
  }

  static removeNotificationCenter(sdkKey?: string): void {
    if (!sdkKey) {
      return;
    }

    const notificationCenter = this._notificationCenters.get(sdkKey);
    if (notificationCenter) {
      notificationCenter.clearAllNotificationListeners();
      this._notificationCenters.delete(sdkKey);
    }
  }
}
