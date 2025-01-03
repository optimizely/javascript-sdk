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
} from '../utils/enums';

import { NOTIFICATION_TYPES } from './type';
import { NotificationType, NotificationPayload } from './type';
import { Consumer, Fn } from '../utils/type';
import { EventEmitter } from '../utils/event_emitter/event_emitter';
import { NOTIFICATION_LISTENER_EXCEPTION } from '../log_messages';

const MODULE_NAME = 'NOTIFICATION_CENTER';

interface NotificationCenterOptions {
  logger: LogHandler;
  errorHandler: ErrorHandler;
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

  private removerId = 1;
  private eventEmitter: EventEmitter<NotificationPayload> = new EventEmitter();
  private removers: Map<number, Fn> = new Map();

  /**
   * @constructor
   * @param   {NotificationCenterOptions}  options
   * @param   {LogHandler}                 options.logger       An instance of a logger to log messages with
   * @param   {ErrorHandler}               options.errorHandler An instance of errorHandler to handle any unexpected error
   */
  constructor(options: NotificationCenterOptions) {
    this.logger = options.logger;
    this.errorHandler = options.errorHandler;
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
    const notificationTypeValues: string[] = objectValues(NOTIFICATION_TYPES);
    const isNotificationTypeValid = notificationTypeValues.indexOf(notificationType) > -1;
    if (!isNotificationTypeValid) {
      return -1;
    }

    const returnId = this.removerId++;
    const remover = this.eventEmitter.on(
      notificationType, this.wrapWithErrorHandling(notificationType, callback));
    this.removers.set(returnId, remover);
    return returnId;
  }

  private wrapWithErrorHandling<N extends NotificationType>(
    notificationType: N,
    callback: Consumer<NotificationPayload[N]>
  ): Consumer<NotificationPayload[N]> {
    return (notificationData: NotificationPayload[N]) => {
      try {
        callback(notificationData);
      } catch (ex: any) {
        this.logger.log(
          LOG_LEVEL.ERROR,
          NOTIFICATION_LISTENER_EXCEPTION,
          MODULE_NAME,
          notificationType,
          ex.message,
        );
      }
    };
  }

  /**
   * Remove a previously added notification callback
   * @param   {number}                 listenerId ID of listener to be removed
   * @returns {boolean}                Returns true if the listener was found and removed, and false
   * otherwise.
   */
  removeNotificationListener(listenerId: number): boolean {
    const remover = this.removers.get(listenerId);
    if (remover) {
      remover();
      return true;
    }
    return false
  }

  /**
   * Removes all previously added notification listeners, for all notification types
   */
  clearAllNotificationListeners(): void {
    this.eventEmitter.removeAllListeners();
  }

  /**
   * Remove all previously added notification listeners for the argument type
   * @param   {NotificationType}    notificationType One of NotificationType
   */
  clearNotificationListeners(notificationType: NotificationType): void {
    this.eventEmitter.removeListeners(notificationType);
  }

  /**
   * Fires notifications for the argument type. All registered callbacks for this type will be
   * called. The notificationData object will be passed on to callbacks called.
   * @param {NotificationType} notificationType One of NotificationType
   * @param {Object} notificationData Will be passed to callbacks called
   */
  sendNotifications<N extends NotificationType>(
    notificationType: N,
    notificationData: NotificationPayload[N]
  ): void {
    this.eventEmitter.emit(notificationType, notificationData);
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
