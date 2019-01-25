/// <reference path="../OptimizelySDK.d.ts" />
import { OptimizelySDKWrapper } from './OptimizelySDKWrapper';
export { OptimizelySDKWrapper } from './OptimizelySDKWrapper';
import * as optimizelyEnums from '@optimizely/optimizely-sdk/lib/utils/enums';
export function createInstance(config) {
    return new OptimizelySDKWrapper(config);
}
export var enums = optimizelyEnums;
//# sourceMappingURL=index.js.map