import * as React from 'react';
import { WithOptimizelyProps } from './withOptimizely';
import { VariableValuesObject } from '@optimizely/js-web-sdk';
export interface FeatureProps extends WithOptimizelyProps {
    feature: string;
    children: (isEnabled: boolean, variables: VariableValuesObject) => React.ReactNode;
}
export interface FeatureState {
    canRender: boolean;
    isEnabled: boolean;
    variables: VariableValuesObject;
}
export declare const OptimizelyFeature: {
    new (props: Readonly<Pick<FeatureProps, "children" | "feature">>): {
        render(): JSX.Element;
        context: any;
        setState<K extends never>(state: {} | ((prevState: Readonly<{}>, props: Readonly<Pick<FeatureProps, "children" | "feature">>) => {} | Pick<{}, K> | null) | Pick<{}, K> | null, callback?: (() => void) | undefined): void;
        forceUpdate(callBack?: (() => void) | undefined): void;
        readonly props: Readonly<{
            children?: React.ReactNode;
        }> & Readonly<Pick<FeatureProps, "children" | "feature">>;
        state: Readonly<{}>;
        refs: {
            [key: string]: React.ReactInstance;
        };
    };
    new (props: Pick<FeatureProps, "children" | "feature">, context?: any): {
        render(): JSX.Element;
        context: any;
        setState<K extends never>(state: {} | ((prevState: Readonly<{}>, props: Readonly<Pick<FeatureProps, "children" | "feature">>) => {} | Pick<{}, K> | null) | Pick<{}, K> | null, callback?: (() => void) | undefined): void;
        forceUpdate(callBack?: (() => void) | undefined): void;
        readonly props: Readonly<{
            children?: React.ReactNode;
        }> & Readonly<Pick<FeatureProps, "children" | "feature">>;
        state: Readonly<{}>;
        refs: {
            [key: string]: React.ReactInstance;
        };
    };
    contextType?: React.Context<any> | undefined;
};
