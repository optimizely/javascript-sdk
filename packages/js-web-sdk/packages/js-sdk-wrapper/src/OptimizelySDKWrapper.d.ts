import * as optimizely from '@optimizely/optimizely-sdk';
export declare type VariableValue = string | boolean | number;
export declare type OptimizelyDatafile = {
    readonly version: string;
    readonly projectId: string;
    readonly accountId: string;
    readonly rollouts: RolloutGroup[];
    readonly featureFlags: FeatureFlag[];
    readonly attributes: Attribute[];
    readonly audiences: Audience[];
    readonly groups: Group[];
    readonly experiments: Experiment[];
    readonly anonymizeIP: boolean;
    readonly botFiltering: boolean;
    readonly revision: string;
    readonly typedAudiences: Array<object>;
    readonly variables: Array<object>;
};
export declare type Group = {
    readonly id: string;
    readonly policy: 'random';
    readonly trafficAllocation: TrafficAllocation[];
    readonly experiments: Experiment[];
};
export declare type Audience = {
    readonly id: string;
    readonly conditions: string;
    readonly name: string;
};
export declare type Attribute = {
    readonly id: string;
    readonly key: string;
};
export declare type VariableDef = {
    readonly defaultValue: string | number | boolean;
    readonly type: VariableType;
    readonly id: string;
    readonly key: string;
};
export declare type VariableType = 'string' | 'double' | 'integer' | 'boolean';
export declare type FeatureFlag = {
    readonly id: string;
    readonly key: string;
    readonly experimentIds: string[];
    readonly rolloutId: string;
    readonly variables: VariableDef[];
};
export declare type RolloutGroup = {
    readonly id: string;
    readonly experiments: Experiment[];
};
export declare type TrafficAllocation = {
    readonly entityId: string;
    readonly endOfRange: number;
};
export declare type ExperimentVariationVariables = {
    readonly id: string;
    readonly value: string | boolean | number;
};
declare namespace Experiment {
    type Variation = {
        readonly variables: ExperimentVariationVariables;
        readonly id: string;
        readonly key: string;
        readonly featureEnabled: boolean;
    };
}
export declare type Experiment = {
    readonly id: string;
    readonly status: 'Running' | 'Paused' | 'Not started';
    readonly key: string;
    readonly layerId: string;
    readonly trafficAllocation: TrafficAllocation[];
    readonly audienceIds: string[];
    readonly variations: Experiment.Variation[];
    readonly forcedVariations: object; /** readonly TODO: type */
};
export declare type VariableValuesObject = {
    [key: string]: VariableValue;
};
export interface IOptimizelySDKWrapper {
    datafile: OptimizelyDatafile;
    instance: optimizely.Client;
    getFeatureVariable: (feature: string, variable: string) => VariableValue | null;
    getFeatureVariables: (feature: string) => VariableValuesObject;
    isFeatureEnabled: (feature: string) => boolean;
    activate: (experimentKey: string) => string | null;
    track: (eventKey: string, eventTags?: optimizely.EventTags) => void;
}
export declare type OptimizelySDKWrapperConfig = {
    datafile: OptimizelyDatafile;
    userId: string;
    attributes?: optimizely.UserAttributes;
    bucketingId?: string;
};
export declare class OptimizelySDKWrapper implements IOptimizelySDKWrapper {
    datafile: OptimizelyDatafile;
    instance: optimizely.Client;
    userId: string;
    bucketingId: string | undefined;
    attributes: optimizely.UserAttributes | undefined;
    featureVariableGetters: {
        string: (feature: string, variable: string, userid: string, attributes: object | undefined) => string;
        boolean: (feature: string, variable: string, userid: string, attributes: object | undefined) => boolean;
        double: (feature: string, variable: string, userid: string, attributes: object | undefined) => number;
        integer: (feature: string, variable: string, userid: string, attributes: object | undefined) => number;
    };
    constructor(config: OptimizelySDKWrapperConfig);
    activate(experimentKey: string): string | null;
    track(eventKey: string, eventTags?: optimizely.EventTags): void;
    isFeatureEnabled(feature: string): boolean;
    getFeatureVariables: (feature: string) => VariableValuesObject;
    getFeatureVariable: (feature: string, variable: string) => string | number | boolean | null;
    protected getVariableDefsForFeature(feature: string): VariableDef[] | null;
    protected getFeatureVariableType(feature: string, variable: string): VariableType | null;
    protected getVariableDef(feature: string, variable: string): VariableDef | null;
}
export {};

