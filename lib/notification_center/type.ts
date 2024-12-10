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

export type NotiticationTypeValues = {
  [key in NotificationType]: key;
}

export const NOTIFICATION_TYPES: NotiticationTypeValues = {
  ACTIVATE: 'ACTIVATE',
  DECISION: 'DECISION',
  LOG_EVENT: 'LOG_EVENT',
  OPTIMIZELY_CONFIG_UPDATE: 'OPTIMIZELY_CONFIG_UPDATE',
  TRACK: 'TRACK',
};
