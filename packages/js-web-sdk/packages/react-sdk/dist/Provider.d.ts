import * as React from 'react';
import { OptimizelySDKWrapper } from '@optimizely/js-web-sdk';
interface OptimizelyProviderProps {
    optimizely: OptimizelySDKWrapper;
    timeout?: number;
}
interface OptimizelyProviderState {
    userId: string;
    attributes: {
        [key: string]: string;
    } | undefined;
}
export declare class OptimizelyProvider extends React.Component<OptimizelyProviderProps, OptimizelyProviderState> {
    sdkWrapper: OptimizelySDKWrapper;
    constructor(props: OptimizelyProviderProps);
    render(): JSX.Element;
}
export {};
