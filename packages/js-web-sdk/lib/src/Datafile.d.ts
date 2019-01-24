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
    readonly events: Event[];
    readonly typedAudiences: Array<object>;
    readonly variables: Array<object>;
};
export declare type Event = {
    experimentIds: Array<string>;
    id: string;
    key: string;
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
    readonly defaultValue: string;
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
    readonly value: string;
};
declare namespace Experiment {
    type Variation = {
        readonly variables: ExperimentVariationVariables[];
        readonly id: string;
        readonly key: string;
        readonly featureEnabled?: boolean;
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
    [key: string]: VariableValue | null;
};
export {};
