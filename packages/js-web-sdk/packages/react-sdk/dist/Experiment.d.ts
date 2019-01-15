import * as React from 'react';
import { WithOptimizelyProps } from './withOptimizely';
import { VariableValuesObject } from '@optimizely/js-web-sdk';
export declare type ChildrenRenderFunction = (variableValues: VariableValuesObject) => React.ReactNode;
declare type ChildRenderFunction = (variation: string | null) => React.ReactNode;
export interface ExperimentProps extends WithOptimizelyProps {
    experiment: string;
    children: React.ReactNode | ChildRenderFunction;
}
export interface ExperimentState {
    canRender: boolean;
    variation: string | null;
}
export declare class Experiment extends React.Component<ExperimentProps, ExperimentState> {
    constructor(props: ExperimentProps);
    componentDidMount(): void;
    render(): {} | null | undefined;
}
export declare const OptimizelyExperiment: {
    new (props: Readonly<Pick<ExperimentProps, "children" | "experiment">>): {
        render(): JSX.Element;
        context: any;
        setState<K extends never>(state: {} | ((prevState: Readonly<{}>, props: Readonly<Pick<ExperimentProps, "children" | "experiment">>) => {} | Pick<{}, K> | null) | Pick<{}, K> | null, callback?: (() => void) | undefined): void;
        forceUpdate(callBack?: (() => void) | undefined): void;
        readonly props: Readonly<{
            children?: React.ReactNode;
        }> & Readonly<Pick<ExperimentProps, "children" | "experiment">>;
        state: Readonly<{}>;
        refs: {
            [key: string]: React.ReactInstance;
        };
    };
    new (props: Pick<ExperimentProps, "children" | "experiment">, context?: any): {
        render(): JSX.Element;
        context: any;
        setState<K extends never>(state: {} | ((prevState: Readonly<{}>, props: Readonly<Pick<ExperimentProps, "children" | "experiment">>) => {} | Pick<{}, K> | null) | Pick<{}, K> | null, callback?: (() => void) | undefined): void;
        forceUpdate(callBack?: (() => void) | undefined): void;
        readonly props: Readonly<{
            children?: React.ReactNode;
        }> & Readonly<Pick<ExperimentProps, "children" | "experiment">>;
        state: Readonly<{}>;
        refs: {
            [key: string]: React.ReactInstance;
        };
    };
    contextType?: React.Context<any> | undefined;
};
export {};
