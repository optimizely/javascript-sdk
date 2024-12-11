/**
 * Copyright 2024, Optimizely
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

import { LogEvent } from '../event_processor/event_dispatcher/event_dispatcher';
import { EventTags, Experiment, UserAttributes, Variation } from '../shared_types';

export type UserEventListenerPayload = {
  userId: string;
  attributes?: UserAttributes;
}

export type ActivateListenerPayload = UserEventListenerPayload & {
  experiment: Experiment | null;
  variation: Variation | null;
  logEvent: LogEvent;
}

export type TrackListenerPayload = UserEventListenerPayload & {
  eventKey: string;
  eventTags?: EventTags;
  logEvent: LogEvent;
}

export const DECISION_NOTIFICATION_TYPES = {
  AB_TEST: 'ab-test',
  FEATURE: 'feature',
  FEATURE_TEST: 'feature-test',
  FEATURE_VARIABLE: 'feature-variable',
  ALL_FEATURE_VARIABLES: 'all-feature-variables',
  FLAG: 'flag',
} as const;

export type DecisionNotificationType = typeof DECISION_NOTIFICATION_TYPES[keyof typeof DECISION_NOTIFICATION_TYPES];

// TODO: Add more specific types for decision info
export type OptimizelyDecisionInfo = Record<string, any>;

export type DecisionListenerPayload = UserEventListenerPayload & {
  type: DecisionNotificationType;
  decisionInfo: OptimizelyDecisionInfo;
}

export type LogEventListenerPayload = LogEvent;

export type OptimizelyConfigUpdateListenerPayload = undefined;

export type NotificationPayload = {
  ACTIVATE: ActivateListenerPayload;
  DECISION: DecisionListenerPayload;
  TRACK: TrackListenerPayload;
  LOG_EVENT: LogEventListenerPayload;
  OPTIMIZELY_CONFIG_UPDATE: OptimizelyConfigUpdateListenerPayload;
};

export type NotificationType = keyof NotificationPayload;

export type NotificationTypeValues = {
  [key in NotificationType]: key;
}

export const NOTIFICATION_TYPES: NotificationTypeValues = {
  ACTIVATE: 'ACTIVATE',
  DECISION: 'DECISION',
  LOG_EVENT: 'LOG_EVENT',
  OPTIMIZELY_CONFIG_UPDATE: 'OPTIMIZELY_CONFIG_UPDATE',
  TRACK: 'TRACK',
};
