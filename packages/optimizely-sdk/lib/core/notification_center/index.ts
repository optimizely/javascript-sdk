/**
 * Copyright 2020, Optimizely
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
import { sprintf, objectValues } from '@optimizely/js-sdk-utils';
import { LogHandler, ErrorHandler } from '@optimizely/js-sdk-logging';
import { NOTIFICATION_TYPES as notificationTypesEnum } from '@optimizely/js-sdk-utils';
import { UserAttributes } from '../../shared_types';

import {
  LOG_LEVEL,
  LOG_MESSAGES,
  NOTIFICATION_TYPES,
} from '../../utils/enums';

const MODULE_NAME = 'NOTIFICATION_CENTER';

export interface NotificationCenterOptions {
  logger: LogHandler;
  errorHandler: ErrorHandler;
}

export type NotificationListener<T extends ListenerPayload> = (notificationData: T) => void;

// export interface ListenerEntry {
//   id: number;
//   callback: NotificationListener;
// }
// export type NotificationListeners = {
//   [key: string]: ListenerEntry[];
// }

export interface ListenerPayload {
  userId: string;
  attributes?: UserAttributes;
}

/**
 * NotificationCenter allows registration and triggering of callback functions using
 * notification event types defined in NOTIFICATION_TYPES of utils/enums/index.js:
 * - ACTIVATE: An impression event will be sent to Optimizely.
 * - TRACK a conversion event will be sent to Optimizely
 */
export class NotificationCenter {
  private logger: LogHandler;
  private errorHandler: ErrorHandler;
  //TODO: define notificationListeners type
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  private notificationListeners: any;
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
  addNotificationListener<T extends ListenerPayload>(
    notificationType: string,
    callback: NotificationListener<T>
  ): number {
    try {
      const isNotificationTypeValid = objectValues(NOTIFICATION_TYPES ).indexOf(notificationType as notificationTypesEnum) > -1;
      if (!isNotificationTypeValid) {
        return -1;
      }
  
      if (!this.notificationListeners[notificationType]) {
        this.notificationListeners[notificationType] = [];
      }
  
      let callbackAlreadyAdded = false;
      (this.notificationListeners[notificationType] || []).forEach(
        //TODO: remove any after notificationListeners type is defined
        // eslint-disable-next-line  @typescript-eslint/no-explicit-any
        (listenerEntry: any) => {
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
    } catch (e) {
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
        (notificationType: string): boolean | void => {
          const listenersForType = this.notificationListeners[notificationType];
          //TODO: remove any after notificationListeners type is defined
          // eslint-disable-next-line  @typescript-eslint/no-explicit-any
          (listenersForType || []).every((listenerEntry: any, i: number) => {
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
        }
      );
  
      if (indexToRemove !== undefined && typeToRemove !== undefined) {
        this.notificationListeners[typeToRemove].splice(indexToRemove, 1);
        return true;
      }
    } catch (e) {
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
        (notificationTypeEnum: notificationTypesEnum) => {
          this.notificationListeners[notificationTypeEnum] = [];
        }
      );
    } catch (e) {
      this.logger.log(LOG_LEVEL.ERROR, e.message);
      this.errorHandler.handleError(e);
    }
  }

  /**
   * Remove all previously added notification listeners for the argument type
   * @param   {notificationTypesEnum}    notificationType One of NOTIFICATION_TYPES
   */
  clearNotificationListeners(notificationType: notificationTypesEnum): void {
    try {
      this.notificationListeners[notificationType] = [];
    } catch (e) {
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
  sendNotifications<T extends ListenerPayload>(notificationType: string, notificationData?: T): void {
    try {
      (this.notificationListeners[notificationType] || []).forEach(
        //TODO: remove any after notificationListeners type is defined
        // eslint-disable-next-line  @typescript-eslint/no-explicit-any
        (listenerEntry: any) => {
          const callback = listenerEntry.callback;
          try {
            callback(notificationData as T);
          } catch (ex) {
            this.logger.log(
              LOG_LEVEL.ERROR,
              sprintf(LOG_MESSAGES.NOTIFICATION_LISTENER_EXCEPTION, MODULE_NAME, notificationType, ex.message)
            );
          }
        }
      );
    } catch (e) {
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
export function createNotificationCenter(options: NotificationCenterOptions): NotificationCenter {
  return new NotificationCenter(options);
}
