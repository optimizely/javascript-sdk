/**
 * Copyright 2020, 2022, 2024, Optimizely
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
import { LogHandler, ErrorHandler } from '../modules/logging';
import { objectValues } from '../utils/fns';

import {
  LOG_LEVEL,
  LOG_MESSAGES,
} from '../utils/enums';

import { NOTIFICATION_TYPES } from './type';
import { NotificationType, NotificationPayload } from './type';
import { Consumer } from '../utils/type';

const MODULE_NAME = 'NOTIFICATION_CENTER';

interface NotificationCenterOptions {
  logger: LogHandler;
  errorHandler: ErrorHandler;
}

interface ListenerEntry {
  id: number;
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  callback: (notificationData: any) => void;
}

type NotificationListeners = {
  [key: string]: ListenerEntry[];
}

export interface NotificationCenter {
  addNotificationListener<N extends NotificationType>(
    notificationType: N,
    callback: Consumer<NotificationPayload[N]>
  ): number
  removeNotificationListener(listenerId: number): boolean;
  clearAllNotificationListeners(): void;
  clearNotificationListeners(notificationType: NotificationType): void;
}

export interface NotificationSender {
  sendNotifications<N extends NotificationType>(
    notificationType: N,
    notificationData: NotificationPayload[N]
  ): void;
}

/**
 * NotificationCenter allows registration and triggering of callback functions using
 * notification event types defined in NOTIFICATION_TYPES of utils/enums/index.js:
 * - ACTIVATE: An impression event will be sent to Optimizely.
 * - TRACK a conversion event will be sent to Optimizely
 */
export class DefaultNotificationCenter implements NotificationCenter, NotificationSender {
  private logger: LogHandler;
  private errorHandler: ErrorHandler;
  private notificationListeners: NotificationListeners;
  private listenerId: number;

  /**
   * @constructor
   * @param   {NotificationCenterOptions}  options
   * @param   {LogHandler}                 options.logger       An instance of a logger to log messages with
   * @param   {ErrorHandler}               options.errorHandler An instance of errorHandler to handle any unexpected error
   */
  constructor(options: NotificationCenterOptions) {
    this.logger = options.logger;
    this.errorHandler = options.errorHandler;
    this.notificationListeners = {};
    objectValues(NOTIFICATION_TYPES).forEach(
      (notificationTypeEnum) => {
        this.notificationListeners[notificationTypeEnum] = [];
      }
    );
    this.listenerId = 1;
  }

  /**
   * Add a notification callback to the notification center
   * @param   {string}                   notificationType     One of the values from NOTIFICATION_TYPES in utils/enums/index.js
   * @param   {NotificationListener<T>}  callback             Function that will be called when the event is triggered
   * @returns {number}                   If the callback was successfully added, returns a listener ID which can be used
   * to remove the callback by calling removeNotificationListener. The ID is a number greater than 0.
   * If there was an error and the listener was not added, addNotificationListener returns -1. This
   * can happen if the first argument is not a valid notification type, or if the same callback
   * function was already added as a listener by a prior call to this function.
   */
  addNotificationListener<N extends NotificationType>(
    notificationType: N,
    callback: Consumer<NotificationPayload[N]>
  ): number {
    try {
      const notificationTypeValues: string[] = objectValues(NOTIFICATION_TYPES);
      const isNotificationTypeValid = notificationTypeValues.indexOf(notificationType) > -1;
      if (!isNotificationTypeValid) {
        return -1;
      }
  
      if (!this.notificationListeners[notificationType]) {
        this.notificationListeners[notificationType] = [];
      }
  
      let callbackAlreadyAdded = false;
      (this.notificationListeners[notificationType] || []).forEach(
        (listenerEntry) => {
          if (listenerEntry.callback === callback) {
            callbackAlreadyAdded = true;
            return;
          }
        });

      if (callbackAlreadyAdded) {
        return -1;
      }
  
      this.notificationListeners[notificationType].push({
        id: this.listenerId,
        callback: callback,
      });
  
      const returnId = this.listenerId;
      this.listenerId += 1;
      return returnId;
    } catch (e: any) {
      this.logger.log(LOG_LEVEL.ERROR, e.message);
      this.errorHandler.handleError(e);
      return -1;
    }
  }

  /**
   * Remove a previously added notification callback
   * @param   {number}                 listenerId ID of listener to be removed
   * @returns {boolean}                Returns true if the listener was found and removed, and false
   * otherwise.
   */
  removeNotificationListener(listenerId: number): boolean {
    try {
      let indexToRemove: number | undefined;
      let typeToRemove: string | undefined;
  
      Object.keys(this.notificationListeners).some(
        (notificationType) => {
          const listenersForType = this.notificationListeners[notificationType];
          (listenersForType || []).every((listenerEntry, i) => {
            if (listenerEntry.id === listenerId) {
              indexToRemove = i;
              typeToRemove = notificationType;
              return false;
            }

            return true;
          });

          if (indexToRemove !== undefined && typeToRemove !== undefined) {
            return true;
          }

          return false;
        }
      );
  
      if (indexToRemove !== undefined && typeToRemove !== undefined) {
        this.notificationListeners[typeToRemove].splice(indexToRemove, 1);
        return true;
      }
    } catch (e: any) {
      this.logger.log(LOG_LEVEL.ERROR, e.message);
      this.errorHandler.handleError(e);
    }

    return false;
  }

  /**
   * Removes all previously added notification listeners, for all notification types
   */
  clearAllNotificationListeners(): void {
    try {
      objectValues(NOTIFICATION_TYPES).forEach(
        (notificationTypeEnum) => {
          this.notificationListeners[notificationTypeEnum] = [];
        }
      );
    } catch (e: any) {
      this.logger.log(LOG_LEVEL.ERROR, e.message);
      this.errorHandler.handleError(e);
    }
  }

  /**
   * Remove all previously added notification listeners for the argument type
   * @param   {NOTIFICATION_TYPES}    notificationType One of NOTIFICATION_TYPES
   */
  clearNotificationListeners(notificationType: NotificationType): void {
    try {
      this.notificationListeners[notificationType] = [];
    } catch (e: any) {
      this.logger.log(LOG_LEVEL.ERROR, e.message);
      this.errorHandler.handleError(e);
    }
  }

  /**
   * Fires notifications for the argument type. All registered callbacks for this type will be
   * called. The notificationData object will be passed on to callbacks called.
   * @param {string} notificationType One of NOTIFICATION_TYPES
   * @param {Object} notificationData Will be passed to callbacks called
   */
  sendNotifications<N extends NotificationType>(
    notificationType: N,
    notificationData: NotificationPayload[N]
  ): void {
    try {
      (this.notificationListeners[notificationType] || []).forEach(
        (listenerEntry) => {
          const callback = listenerEntry.callback;
          try {
            callback(notificationData);
          } catch (ex: any) {
            this.logger.log(
              LOG_LEVEL.ERROR,
              LOG_MESSAGES.NOTIFICATION_LISTENER_EXCEPTION,
              MODULE_NAME,
              notificationType,
              ex.message,
            );
          }
        }
      );
    } catch (e: any) {
      this.logger.log(LOG_LEVEL.ERROR, e.message);
      this.errorHandler.handleError(e);
    }
  }
}

/**
 * Create an instance of NotificationCenter
 * @param   {NotificationCenterOptions}   options
 * @returns {NotificationCenter}          An instance of NotificationCenter
 */
export function createNotificationCenter(options: NotificationCenterOptions): DefaultNotificationCenter {
  return new DefaultNotificationCenter(options);
}
