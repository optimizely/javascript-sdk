import { OptimizelySDKWrapper, VariableValuesObject } from '@optimizely/js-web-sdk';
export declare type UserAttributes = {
    [attribute: string]: any;
};
declare type EventTags = {
    [tagKey: string]: boolean | number | string;
};
export interface UserWrappedOptimizelySDK extends OptimizelySDKWrapper {
    activate(experimentKey: string, overrideUserId?: string, overrideAttributes?: UserAttributes): string | null;
    getVariation(experimentKey: string, overrideUserId?: string, overrideAttributes?: UserAttributes): string | null;
    getFeatureVariables(featureKey: string, overrideUserId?: string, overrideAttributes?: UserAttributes): VariableValuesObject;
    getFeatureVariableString(featureKey: string, variableKey: string, overrideUserId?: string, overrideAttributes?: UserAttributes): string | null;
    getFeatureVariableInteger(featureKey: string, variableKey: string, overrideUserId?: string, overrideAttributes?: UserAttributes): number | null;
    getFeatureVariableBoolean(featureKey: string, variableKey: string, overrideUserId?: string, overrideAttributes?: UserAttributes): boolean | null;
    getFeatureVariableDouble(featureKey: string, variableKey: string, overrideUserId?: string, overrideAttributes?: UserAttributes): number | null;
    isFeatureEnabled(featureKey: string, overrideUserId?: string, overrideAttributes?: UserAttributes): boolean;
    track(eventKey: string, overrideUserId?: string | EventTags, overrideAttributes?: UserAttributes, eventTags?: EventTags): void;
}
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
export declare function createUserWrapper({ instance, userId, userAttributes, }: {
    instance: OptimizelySDKWrapper;
    userId: string;
    userAttributes?: UserAttributes;
}): UserWrappedOptimizelySDK;
export {};
