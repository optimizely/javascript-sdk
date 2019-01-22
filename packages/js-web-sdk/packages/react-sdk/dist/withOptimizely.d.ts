import * as React from 'react';
import { UserWrappedOptimizelySDK } from './createUserWrapper';
export interface WithOptimizelyProps {
    optimizely: UserWrappedOptimizelySDK | null;
    optimizelyReadyTimeout: number | undefined;
}
export declare function withOptimizely<P extends WithOptimizelyProps>(Component: React.ComponentType<P>): {
    new (props: Readonly<Pick<P, import("utility-types/dist/mapped-types").SetDifference<keyof P, "optimizely" | "optimizelyReadyTimeout">>>): {
        render(): JSX.Element;
        context: any;
        setState<K extends never>(state: {} | ((prevState: Readonly<{}>, props: Readonly<Pick<P, import("utility-types/dist/mapped-types").SetDifference<keyof P, "optimizely" | "optimizelyReadyTimeout">>>) => {} | Pick<{}, K> | null) | Pick<{}, K> | null, callback?: (() => void) | undefined): void;
        forceUpdate(callBack?: (() => void) | undefined): void;
        readonly props: Readonly<{
            children?: React.ReactNode;
        }> & Readonly<Pick<P, import("utility-types/dist/mapped-types").SetDifference<keyof P, "optimizely" | "optimizelyReadyTimeout">>>;
        state: Readonly<{}>;
        refs: {
            [key: string]: React.ReactInstance;
        };
    };
    new (props: Pick<P, import("utility-types/dist/mapped-types").SetDifference<keyof P, "optimizely" | "optimizelyReadyTimeout">>, context?: any): {
        render(): JSX.Element;
        context: any;
        setState<K extends never>(state: {} | ((prevState: Readonly<{}>, props: Readonly<Pick<P, import("utility-types/dist/mapped-types").SetDifference<keyof P, "optimizely" | "optimizelyReadyTimeout">>>) => {} | Pick<{}, K> | null) | Pick<{}, K> | null, callback?: (() => void) | undefined): void;
        forceUpdate(callBack?: (() => void) | undefined): void;
        readonly props: Readonly<{
            children?: React.ReactNode;
        }> & Readonly<Pick<P, import("utility-types/dist/mapped-types").SetDifference<keyof P, "optimizely" | "optimizelyReadyTimeout">>>;
        state: Readonly<{}>;
        refs: {
            [key: string]: React.ReactInstance;
        };
    };
    contextType?: React.Context<any> | undefined;
};
