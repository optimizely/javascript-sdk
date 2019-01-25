/// <reference path="../../optimizely-sdk/lib/index.d.ts" />
import { OptimizelySDKWrapperConfig, OptimizelySDKWrapper } from './OptimizelySDKWrapper'

export { OptimizelySDKWrapper } from './OptimizelySDKWrapper'
export { OptimizelyDatafile, VariableValuesObject } from './Datafile'
import * as optimizelyEnums from '@optimizely/optimizely-sdk/lib/utils/enums'

export function createInstance(config: OptimizelySDKWrapperConfig): OptimizelySDKWrapper {
  return new OptimizelySDKWrapper(config)
}

export const enums = optimizelyEnums