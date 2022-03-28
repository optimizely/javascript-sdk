/**
 * Copyright 2017, 2019-2020, Optimizely
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
import v4 from 'uuid';

const MAX_SAFE_INTEGER_LIMIT = Math.pow(2, 53);

// eslint-disable-next-line
function assign(target: any, ...sources: any[]): any {
  if (!target) {
    return {};
  }
  if (typeof Object.assign === 'function') {
    return Object.assign(target, ...sources);
  } else {
    const to = Object(target);
    for (let index = 0; index < sources.length; index++) {
      const nextSource = sources[index];
      if (nextSource !== null && nextSource !== undefined) {
        for (const nextKey in nextSource) {
          // Avoid bugs when hasOwnProperty is shadowed
          if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
            to[nextKey] = nextSource[nextKey];
          }
        }
      }
    }
    return to;
  }
}

function currentTimestamp(): number {
  return Math.round(new Date().getTime());
}

function isSafeInteger(number: unknown): boolean {
  return typeof number == 'number' && Math.abs(number) <= MAX_SAFE_INTEGER_LIMIT;
}

function keyBy<K>(arr: K[], key: string): { [key: string]: K } {
  if (!arr) return {};
  return keyByUtil(arr, function (item) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (item as any)[key];
  });
}

function isNumber(value: unknown): boolean {
  return typeof value === 'number';
}

 export function uuid(): string {
   return v4()
 }
 
 export type Omit<T, K> = Pick<T, Exclude<keyof T, K>>
 
 export function getTimestamp(): number {
   return new Date().getTime()
 }
 
 /**
  * Validates a value is a valid TypeScript enum
  *
  * @export
  * @param {object} enumToCheck
  * @param {*} value
  * @returns {boolean}
  */

 // TODO[OASIS-6649]: Don't use any type
 // eslint-disable-next-line  @typescript-eslint/no-explicit-any
 export function isValidEnum(enumToCheck: { [key: string]: any }, value: any): boolean {
   let found = false
 
   const keys = Object.keys(enumToCheck)
   for (let index = 0; index < keys.length; index++) {
     if (value === enumToCheck[keys[index]]) {
       found = true
       break
     }
   }
   return found
 }
 
 export function groupBy<K>(arr: K[], grouperFn: (item: K) => string): Array<K[]> {
   const grouper: { [key: string]: K[] } = {}
 
   arr.forEach(item => {
     const key = grouperFn(item)
     grouper[key] = grouper[key] || []
     grouper[key].push(item)
   })
 
   return objectValues(grouper)
 }
 
 export function objectValues<K>(obj: { [key: string]: K }): K[] {
   return Object.keys(obj).map(key => obj[key])
 }
 
 export function objectEntries<K>(obj: { [key: string]: K }): [string, K][] {
   return Object.keys(obj).map(key => [key, obj[key]])
 }
 
 export function find<K>(arr: K[], cond: (arg: K) => boolean): K | undefined {
   let found
 
   for (const item of arr) {
     if (cond(item)) {
       found = item
       break
     }
   }
 
   return found
 }
 
 export function keyByUtil<K>(arr: K[], keyByFn: (item: K) => string): { [key: string]: K } {
   const map: { [key: string]: K } = {}
   arr.forEach(item => {
     const key = keyByFn(item)
     map[key] = item
   })
   return map
 }
 
 // TODO[OASIS-6649]: Don't use any type
 // eslint-disable-next-line  @typescript-eslint/no-explicit-any
 export function sprintf(format: string, ...args: any[]): string {
   let i = 0
   return format.replace(/%s/g, function() {
     const arg = args[i++]
     const type = typeof arg
     if (type === 'function') {
       return arg()
     } else if (type === 'string') {
       return arg
     } else {
       return String(arg)
     }
   })
 }
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
   // TODO[OASIS-6649]: Don't use any type
   // eslint-disable-next-line  @typescript-eslint/no-explicit-any
   sendNotifications(notificationType: NOTIFICATION_TYPES, notificationData?: any): void
 }

export default {
  assign,
  currentTimestamp,
  isSafeInteger,
  keyBy,
  uuid,
  isNumber,
}
