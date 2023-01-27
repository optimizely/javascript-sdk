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

import { getLogger, LogHandler } from '../../modules/logging';
import { NotificationCenter, createNotificationCenter } from '../../core/notification_center';

/**
 * Internal notification center registry for managing multiple notification centers.
 */
export class NotificationRegistry {
  private static _notificationCenters = new Map<string, NotificationCenter>();

  constructor() {}

  public static getNotificationCenter(sdkKey?: string, logger?: LogHandler): NotificationCenter | null {
    if (!sdkKey) return null;

    let notificationCenter;
    if (this._notificationCenters.has(sdkKey)) {
      notificationCenter = this._notificationCenters.get(sdkKey) || null;
    } else {
      notificationCenter = createNotificationCenter({
        logger: logger || getLogger(),
        errorHandler: { handleError: () => {} },
      });
      this._notificationCenters.set(sdkKey, notificationCenter);
    }

    return notificationCenter;
  }

  public static removeNotificationCenter(sdkKey?: string): void {
    if (!sdkKey) return;

    const notificationCenter = this._notificationCenters.get(sdkKey);
    if (notificationCenter) {
      notificationCenter.clearAllNotificationListeners();
      this._notificationCenters.delete(sdkKey);
    }
  }
}
