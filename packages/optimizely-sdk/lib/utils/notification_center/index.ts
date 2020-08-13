/*
 * Notification types for use with NotificationCenter
 * Format is EVENT: <list of parameters to callback>
 *
 * SDK consumers can use these to register callbacks with the notification center.
 *
 *  @deprecated since 3.1.0
 *  ACTIVATE: An impression event will be sent to Optimizely
 *  Callbacks will receive an object argument with the following properties:
 *    - experiment {Object}
 *    - userId {string}
 *    - attributes {Object|undefined}
 *    - variation {Object}
 *    - logEvent {Object}
 *
 *  DECISION: A decision is made in the system. i.e. user activation,
 *  feature access or feature-variable value retrieval
 *  Callbacks will receive an object argument with the following properties:
 *    - type {string}
 *    - userId {string}
 *    - attributes {Object|undefined}
 *    - decisionInfo {Object|undefined}
 *
 *  LOG_EVENT: A batch of events, which could contain impressions and/or conversions,
 *  will be sent to Optimizely
 *  Callbacks will receive an object argument with the following properties:
 *    - url {string}
 *    - httpVerb {string}
 *    - params {Object}
 *
 *  OPTIMIZELY_CONFIG_UPDATE: This Optimizely instance has been updated with a new
 *  config
 *
 *  TRACK: A conversion event will be sent to Optimizely
 *  Callbacks will receive the an object argument with the following properties:
 *    - eventKey {string}
 *    - userId {string}
 *    - attributes {Object|undefined}
 *    - eventTags {Object|undefined}
 *    - logEvent {Object}
 *
 */
export enum NOTIFICATION_TYPES {
  ACTIVATE = 'ACTIVATE:experiment, user_id,attributes, variation, event',
  DECISION = 'DECISION:type, userId, attributes, decisionInfo',
  LOG_EVENT = 'LOG_EVENT:logEvent',
  OPTIMIZELY_CONFIG_UPDATE = 'OPTIMIZELY_CONFIG_UPDATE',
  TRACK = 'TRACK:event_key, user_id, attributes, event_tags, event',
}

export interface NotificationCenter {
  sendNotifications(notificationType: NOTIFICATION_TYPES, notificationData?: any): void
}
