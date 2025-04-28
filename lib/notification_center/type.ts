/**
 * Copyright 2024-2025, Optimizely
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
import { EventTags, Experiment, FeatureVariableValue, UserAttributes, VariableType, Variation } from '../shared_types';
import { DecisionSource } from '../utils/enums';
import { Nullable } from '../utils/type';

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

export type ExperimentAndVariationInfo = {
  experimentKey: string;
  variationKey: string;
}

export type DecisionSourceInfo = Partial<ExperimentAndVariationInfo>;

export type AbTestDecisonInfo = Nullable<ExperimentAndVariationInfo, 'variationKey'>;

type FeatureDecisionInfo = {
  featureKey: string,
  featureEnabled: boolean,
  source: DecisionSource,
  sourceInfo: DecisionSourceInfo,
}

export type FeatureTestDecisionInfo = Nullable<ExperimentAndVariationInfo, 'variationKey'>;

export type FeatureVariableDecisionInfo = {
  featureKey: string,
  featureEnabled: boolean,
  source: DecisionSource,
  variableKey: string,
  variableValue: FeatureVariableValue,
  variableType: VariableType,
  sourceInfo: DecisionSourceInfo,
};

export type VariablesMap = { [variableKey: string]: unknown }

export type AllFeatureVariablesDecisionInfo = {
  featureKey: string,
  featureEnabled: boolean,
  source: DecisionSource,
  variableValues: VariablesMap,
  sourceInfo: DecisionSourceInfo,
};

export type FlagDecisionInfo = {
  flagKey: string,
  enabled: boolean,
  variationKey: string | null,
  ruleKey: string | null,
  variables: VariablesMap,
  reasons: string[],
  decisionEventDispatched: boolean,
  experimentId: string | null,
  variationId: string | null,
};

export type DecisionInfo = {
  [DECISION_NOTIFICATION_TYPES.AB_TEST]: AbTestDecisonInfo;
  [DECISION_NOTIFICATION_TYPES.FEATURE]: FeatureDecisionInfo;
  [DECISION_NOTIFICATION_TYPES.FEATURE_TEST]: FeatureTestDecisionInfo;
  [DECISION_NOTIFICATION_TYPES.FEATURE_VARIABLE]: FeatureVariableDecisionInfo;
  [DECISION_NOTIFICATION_TYPES.ALL_FEATURE_VARIABLES]: AllFeatureVariablesDecisionInfo;
  [DECISION_NOTIFICATION_TYPES.FLAG]: FlagDecisionInfo;
}

export type DecisionListenerPayloadForType<T extends DecisionNotificationType> = UserEventListenerPayload & {
  type: T;
  decisionInfo: DecisionInfo[T];
}

export type DecisionListenerPayload = {
  [T in DecisionNotificationType]: DecisionListenerPayloadForType<T>;
}[DecisionNotificationType];

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
