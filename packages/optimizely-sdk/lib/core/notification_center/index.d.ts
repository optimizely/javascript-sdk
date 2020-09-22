/* eslint-disable no-shadow */
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

import { UserAttributes, Experiment, Variation } from '@optimizely/optimizely-sdk';
import { LogHandler, ErrorHandler } from '@optimizely/js-sdk-logging';

declare module '@optimizely/optimizely-sdk/lib/core/notification_center' {
  export enum NOTIFICATION_TYPES {
    ACTIVATE = 'ACTIVATE:experiment, user_id,attributes, variation, event',
    DECISION = 'DECISION:type, userId, attributes, decisionInfo',
    LOG_EVENT = 'LOG_EVENT:logEvent',
    OPTIMIZELY_CONFIG_UPDATE = 'OPTIMIZELY_CONFIG_UPDATE',
    TRACK = 'TRACK:event_key, user_id, attributes, event_tags, event',
  }

  export enum DECISION_NOTIFICATION_TYPES {
    AB_TEST = 'ab-test',
    FEATURE = 'feature',
    FEATURE_TEST = 'feature-test',
    FEATURE_VARIABLE = 'feature-variable',
    ALL_FEATURE_VARIABLES = 'all-feature-variables',
  }

  export type Options =  {
    logger: LogHandler;
    errorHandle: ErrorHandler;
  }

  export type SourceInfo = {
    experimentKey?: string;
    variationKey?: string;
  }

  export type VariableValues = {
    [name: string]: unknown;
  };

  export type DecisionInfo =  {
    experimentKey?: string;
    variationKey?: string;
    featureKey?: string;
    featureEnabled?: boolean;
    source?: string;
    sourceInfo?: SourceInfo;
    variableKey?: string;
    variableValue?: unknown;
    variableValues?: VariableValues;
    variableType?: string;
  }

  export interface NotificationData {
    type?: DECISION_NOTIFICATION_TYPES;
    userId?: string;
    attributes?: UserAttributes;
    decisionInfo?: DecisionInfo;
    experiment?: Experiment;
    variation?: Variation;
    logEvent?: string;
    eventKey?: string;
    eventTags?: string;
  }

  export interface NotificationCenter {
    /**
     * Fires notifications for the argument type. All registered callbacks for this type will be
     * called. The notificationData object will be passed on to callbacks called.
     * @param {NOTIFICATION_TYPES} notificationType One of NOTIFICATION_TYPES
     * @param {NotificationData} notificationData Will be passed to callbacks called
     */
    sendNotifications(notificationType: NOTIFICATION_TYPES, notificationData: NotificationData): void;
  }

  /**
   * Create an instance of NotificationCenter
   * @param {Options} options
   * @returns {NotificationCenter} An instance of NotificationCenter
   */
  export function createNotificationCenter(options: Options): NotificationCenter;
}
