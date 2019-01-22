import * as React from 'react';
import { OptimizelySDKWrapper } from '@optimizely/js-web-sdk';
import { UserAttributes, UserWrappedOptimizelySDK } from './createUserWrapper';
interface OptimizelyProviderProps {
    optimizely: OptimizelySDKWrapper;
    userId: string;
    timeout?: number;
    userAttributes?: UserAttributes;
}
interface OptimizelyProviderState {
    userId: string;
    attributes: {
        [key: string]: string;
    } | undefined;
}
export declare class OptimizelyProvider extends React.Component<OptimizelyProviderProps, OptimizelyProviderState> {
    sdkWrapper: UserWrappedOptimizelySDK;
    constructor(props: OptimizelyProviderProps);
    render(): JSX.Element;
}
export {};
