import * as optimizely from '@optimizely/optimizely-sdk';
import { OptimizelyDatafile, VariableValue, VariableValuesObject, VariableDef } from './Datafile';
import { Resource } from './ResourceManager';
export { OptimizelyDatafile };
export { VariableValuesObject, VariableValue };
declare type Partial<T> = {
    [P in keyof T]?: T[P];
};
declare type UserAttributes = {
    [attribute: string]: any;
};
export interface OptimizelySDKWrapperConfig extends Partial<optimizely.Config> {
    datafile?: OptimizelyDatafile;
    sdkKey?: string;
}
/**
 * @export
 * @class OptimizelySDKWrapper
 * @implements {IOptimizelySDKWrapper}
 */
export declare class OptimizelySDKWrapper {
    instance: optimizely.Client;
    isInitialized: boolean;
    datafileResource: Resource<OptimizelyDatafile>;
    datafile: OptimizelyDatafile | null;
    private initialConfig;
    private trackEventQueue;
    private initializingPromise;
    /**
     * Creates an instance of OptimizelySDKWrapper.
     * @param {OptimizelySDKWrapperConfig} [config={}]
     * @memberof OptimizelySDKWrapper
     */
    constructor(config?: OptimizelySDKWrapperConfig);
    /**
     * onReady happens when the datafile and attributes are fully loaded
     * Returns a promise where the resolved value is a boolean indicating whether
     * the optimizely instance has been initialized.  This only is false when
     * you supply a timeout
  
     * @param {{ timeout?: number }} [config={}]
     * @returns {Promise<boolean>}
     * @memberof OptimizelySDKWrapper
     */
    onReady(config?: {
        timeout?: number;
    }): Promise<boolean>;
    /**
     * @param {string} experimentKey
     * @param {string} userId
     * @param {UserAttributes} [attributes]
     * @returns {(string | null)}
     * @memberof OptimizelySDKWrapper
     */
    activate(experimentKey: string, userId: string, attributes?: UserAttributes): string | null;
    /**
     *
     *
     * @param {string} experimentKey
     * @param {string} userId
     * @param {UserAttributes} [attributes]
     * @returns {(string | null)}
     * @memberof OptimizelySDKWrapper
     */
    getVariation(experimentKey: string, userId: string, attributes?: UserAttributes): string | null;
    /**
     * @param {string} eventKey
     * @param {string} userId
     * @param {UserAttributes} [attributes]
     * @param {optimizely.EventTags} [eventTags]
     * @memberof OptimizelySDKWrapper
     */
    track(eventKey: string, userId: string, attributes?: UserAttributes, eventTags?: optimizely.EventTags): void;
    /**
     * Note: in the case where the feature isnt in the datafile or the datafile hasnt been
     * loaded, this will return `false`
     *
     * @param {string} feature
     * @param {string} userId
     * @param {UserAttributes} [attributes]
     * @returns {boolean}
     * @memberof OptimizelySDKWrapper
     */
    isFeatureEnabled(feature: string, userId: string, attributes?: UserAttributes): boolean;
    /**
     * Get all variables for a feature, regardless of the feature being enabled/disabled
     *
     * @param {string} feature
     * @param {string} userId
     * @param {UserAttributes} [attributes]
     * @returns {VariableValuesObject}
     * @memberof OptimizelySDKWrapper
     */
    getFeatureVariables(feature: string, userId: string, attributes?: UserAttributes): VariableValuesObject;
    /**
     * @param {string} feature
     * @param {string} variable
     * @param {string} userId
     * @param {UserAttributes} [attributes]
     * @returns {(string | null)}
     * @memberof OptimizelySDKWrapper
     */
    getFeatureVariableString(feature: string, variable: string, userId: string, attributes?: UserAttributes): string | null;
    /**
     * @param {string} feature
     * @param {string} variable
     * @param {string} userId
     * @param {UserAttributes} [attributes]
     * @returns {(boolean | null)}
     * @memberof OptimizelySDKWrapper
     */
    getFeatureVariableBoolean(feature: string, variable: string, userId: string, attributes?: UserAttributes): boolean | null;
    /**
     * @param {string} feature
     * @param {string} variable
     * @param {string} userId
     * @param {UserAttributes} [attributes]
     * @returns {(number | null)}
     * @memberof OptimizelySDKWrapper
     */
    getFeatureVariableInteger(feature: string, variable: string, userId: string, attributes?: UserAttributes): number | null;
    /**
     * @param {string} feature
     * @param {string} variable
     * @param {string} userId
     * @param {UserAttributes} [attributes]
     * @returns {(number | null)}
     * @memberof OptimizelySDKWrapper
     */
    getFeatureVariableDouble(feature: string, variable: string, userId: string, attributes?: UserAttributes): number | null;
    /**
     * Get an array of all enabled features
     *
     * @param {string} userId
     * @param {UserAttributes} [attributes]
     * @returns {Array<string>}
     * @memberof OptimizelySDKWrapper
     */
    getEnabledFeatures(userId: string, attributes?: UserAttributes): Array<string>;
    /**
     * @param {string} experiment
     * @param {string} userId
     * @returns {(string | null)}
     * @memberof OptimizelySDKWrapper
     */
    getForcedVariation(experiment: string, userId: string): string | null;
    /**
     * @param {string} experiment
     * @param {string} userId
     * @param {string} variationKey
     * @returns {boolean}
     * @memberof OptimizelySDKWrapper
     */
    setForcedVariation(experiment: string, userId: string, variationKey: string): boolean;
    protected getVariableDefsForFeature(feature: string): VariableDef[] | null;
    private flushTrackEventQueue;
    private setupDatafileResource;
    private onInitialized;
}
