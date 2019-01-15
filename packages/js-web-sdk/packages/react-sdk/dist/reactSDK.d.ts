import { OptimizelySDKWrapper } from '@optimizely/js-web-sdk';
export declare function initialize({ instance, timeout, }: {
    instance: OptimizelySDKWrapper;
    timeout?: number;
}): void;
export declare function getTimeout(): number | undefined;
export declare function getInstance(): OptimizelySDKWrapper;
