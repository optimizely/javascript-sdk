/**
 * Copyright 2018, Optimizely
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

declare module '@optimizely/optimizely-sdk' {
    import enums = require('@optimizely/optimizely-sdk/lib/utils/enums');
  
    export function createInstance(config: Config): Client;
  
    // The options object given to Optimizely.createInstance.
    export interface Config {
        datafile: object;
        errorHandler?: object;
        eventDispatcher?: object;
        logger?: object;
        logLevel?: enums.LOG_LEVEL.DEBUG | enums.LOG_LEVEL.ERROR | enums.LOG_LEVEL.INFO | enums.LOG_LEVEL.NOTSET | enums.LOG_LEVEL.WARNING;
        skipJSONValidation?: boolean;
        jsonSchemaValidator?: object;
        userProfileService?: UserProfileService | null;
    }
  
    export interface Client {
        notificationCenter: NotificationCenter;
        activate(experimentKey: string, userId: string, attributes?: UserAttributes): string | null;
        track(eventKey: string, userId: string, attributes?: UserAttributes, eventTags?: EventTags): void;
        getVariation(experimentKey: string, userId: string, attributes?: UserAttributes): string | null;
        setForcedVariation(experimentKey: string, userId: string, variationKey: string | null): boolean;
        getForcedVariation(experimentKey: string, userId: string): string | null;
        isFeatureEnabled(featureKey: string, userId: string, attributes?: UserAttributes): boolean;
        getEnabledFeatures(userId: string, attributes?: UserAttributes): string[];
        getFeatureVariableBoolean(featureKey: string, variableKey: string, userId: string, attributes?: UserAttributes): boolean | null;
        getFeatureVariableDouble(featureKey: string, variableKey: string, userId: string, attributes?: UserAttributes): number | null;
        getFeatureVariableInteger(featureKey: string, variableKey: string, userId: string, attributes?: UserAttributes): number | null;
        getFeatureVariableString(featureKey: string, variableKey: string, userId: string, attributes?: UserAttributes): string | null;
    }
  
    // An event to be submitted to Optimizely, enabling tracking the reach and impact of
    // tests and feature rollouts.
    export interface Event {
        // URL to which to send the HTTP request.
        url: string,
        // HTTP method with which to send the event.
        httpVerb: 'POST',
        // Value to send in the request body, JSON-serialized.
        params: any,
    }
  
    export interface EventDispatcher {
        /**
         * @param event
         *        Event being submitted for eventual dispatch.
         * @param callback
         *        After the event has at least been queued for dispatch, call this function to return
         *        control back to the Client.
         */
        dispatchEvent: (event: Event, callback: () => void) => void,
    }
  
    export interface UserProfileService {
        lookup: (userId: string) => UserProfile,
        save: (profile: UserProfile) => void,
    }
  
    // NotificationCenter-related types
    export interface NotificationCenter {
        addNotificationListener<T extends ListenerPayload>(notificationType: string, callback: NotificationListener<T>): number;
        removeNotificationListener(listenerId: number): boolean;
        clearAllNotificationListeners(): void;
        clearNotificationListeners(notificationType: enums.NOTIFICATION_TYPES): void;
    }
  
    export type NotificationListener<T extends ListenerPayload> = (notificationData: T) => void;
  
    export interface ListenerPayload {
        userId: string;
        attributes: UserAttributes;
    }
  
    export interface ActivateListenerPayload extends ListenerPayload {
        experiment: Experiment;
        variation: Variation;
        logEvent: Event;
    }
  
    export type UserAttributes = {
        [name: string]: string
    };
  
    export type EventTags = {
        [key: string]: string | number | boolean,
    };
  
    export interface TrackListenerPayload extends ListenerPayload {
        eventKey: string;
        eventTags: EventTags;
        logEvent: Event;
    }
  
    interface Experiment {
        id: string,
        key: string,
        status: string,
        layerId: string,
        variations: Variation[],
        trafficAllocation: Array<{
            entityId: string,
            endOfRange: number,
        }>,
        audienceIds: string[],
        forcedVariations: object,
    }
  
    interface Variation {
        id: string,
        key: string,
    }
  
    export interface Logger {
        log: (logLevel: enums.LOG_LEVEL, message: string) => void,
    }
  
    // Information about past bucketing decisions for a user.
    export interface UserProfile {
        user_id: string,
        experiment_bucket_map: {
            [experiment_id: string]: {
                variation_id: string,
            },
        },
    }
  }
  
  declare module '@optimizely/optimizely-sdk/lib/utils/enums'{
    export enum LOG_LEVEL{
        NOTSET = 0,
        DEBUG = 1,
        INFO = 2,
        WARNING =  3,
        ERROR = 4,
    }
    export enum NOTIFICATION_TYPES { 
        ACTIVATE = 'ACTIVATE:experiment, user_id, attributes, variation, events',
        TRACK = 'TRACK:event_key, user_id, attributes, event_tags, event',
    }
  }
  
  declare module '@optimizely/optimizely-sdk/lib/plugins/event_dispatcher/index.node.js' {
  
  }
  
  declare module '@optimizely/optimizely-sdk/lib/utils/json_schema_validator' {
  
  }
  
  declare module '@optimizely/optimizely-sdk/lib/plugins/error_handler' {
  }
  
  declare module '@optimizely/optimizely-sdk/lib/plugins/logger' {
    import * as Optimizely from '@optimizely/optimizely-sdk';
    import * as enums from '@optimizely/optimizely-sdk/lib/utils/enums';
  
    export interface Config {
        logLevel?: enums.LOG_LEVEL,
        logToConsole?: boolean,
        prefix?: string,
    }
    export function createLogger(config: Config): Optimizely.Logger;
    export function createNoOpLogger(): Optimizely.Logger;
  }