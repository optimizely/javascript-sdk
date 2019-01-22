/// <reference path="../../js-web-sdk/src/OptimizelySDK.d.ts" />
import { OptimizelySDKWrapper } from '@optimizely/js-web-sdk';
declare type UserAttributes = {
    [attribute: string]: any;
};
declare type EventTags = {
    [tagKey: string]: boolean | number | string;
};
/**
 * Wrapper to memoize the userId / userAttributes around an OptimizelySDKWrapper instance
 *
 * @param {{
 *   instance: OptimizelySDKWrapper
 *   userId: string
 *   attributes?: UserAttributes
 * }} {
 *   instance,
 *   userId,
 *   attributes,
 * }
 * @returns
 */
export declare function createWrapper({ instance, userId, userAttributes, }: {
    instance: OptimizelySDKWrapper;
    userId: string;
    userAttributes?: UserAttributes;
}): {
    activate(experimentKey: string, overrideUserId?: string | undefined, overrideAttributes?: UserAttributes | undefined): string | null;
    getVariation(experimentKey: string, overrideUserId?: string | undefined, overrideAttributes?: UserAttributes | undefined): string | null;
    getFeatureVariables(featureKey: string, overrideUserId?: string | undefined, overrideAttributes?: UserAttributes | undefined): import("@optimizely/js-web-sdk/lib/Datafile").VariableValuesObject;
    getFeatureVariableInteger(featureKey: string, variableKey: string, overrideUserId?: string | undefined, overrideAttributes?: UserAttributes | undefined): number | null;
    getFeatureVariableString(featureKey: string, variableKey: string, overrideUserId?: string | undefined, overrideAttributes?: UserAttributes | undefined): string | null;
    getFeatureVariableBoolean(featureKey: string, variableKey: string, overrideUserId?: string | undefined, overrideAttributes?: UserAttributes | undefined): boolean | null;
    getFeatureVariableDouble(featureKey: string, variableKey: string, overrideUserId?: string | undefined, overrideAttributes?: UserAttributes | undefined): number | null;
    isFeatureEnabled(featureKey: string, overrideUserId?: string | undefined, overrideAttributes?: UserAttributes | undefined): boolean;
    track(eventKey: string, overrideUserId?: string | EventTags | undefined, overrideAttributes?: UserAttributes | undefined, eventTags?: EventTags | undefined): void;
    instance: import("@optimizely/optimizely-sdk").Client;
    isInitialized: boolean;
    datafile: import("@optimizely/js-web-sdk/lib/Datafile").OptimizelyDatafile | null;
};
export {};
