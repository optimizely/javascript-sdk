/**
 * Copyright 2020, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

declare module '@optimizely/optimizely-sdk/lib/core/project_config' {
  import { LogHandler } from '@optimizely/js-sdk-logging';
  import { Experiment, Variation } from '@optimizely/optimizely-sdk';

  interface Config {
    // TODO[OASIS-6649]: Don't use object type
    // eslint-disable-next-line  @typescript-eslint/ban-types
    datafile: object;
    logger: LogHandler;
    // TODO[OASIS-6649]: Don't use object type
    // eslint-disable-next-line  @typescript-eslint/ban-types
    jsonSchemaValidator: object;
  }

  interface Group {
    experiments: Experiment[]  
    id: string
    policy: string
    trafficAllocation: Array<{
      entityId: string;
      endOfRange: number;
    }>
  } 
  
  interface Audience {
    id: string;
    conditions: unknown[];
    name: string;
  }
  
  interface Event {
    experimentIds: string[];
    id: string;
    key: string;
  }

  interface FeatureVariable {
    defaultValue: string;
    id: string;
    key: string;
    subType?: string;
    type: string;
  }

  interface Rollout {
    experiments: Experiment[];
    id: string;
  }

  interface FeatureFlag {
    experimentIds: string[];
    id: string;
    key: string;
    rolloutId: string;
    variables: FeatureVariable[];
  }

  interface Attribute {
    id: string;
    key: string;
  }

  export interface ProjectConfig {
    __datafileStr: string;
    accountId: string;
    attributeKeyMap: {[key: string]: Attribute};
    attributes: Attribute[];
    audiences: Audience[];
    audiencesById: {[id: string]: Audience};
    eventKeyMap: {[key: string]: Event};
    events: Event[];
    // TODO[OASIS-6649]: Don't use object type
    // eslint-disable-next-line  @typescript-eslint/ban-types
    experimentFeatureMap: object;
    experimentIdMap: {[id: string]: Experiment};
    experimentKeyMap: {[key: string]: Experiment};
    experiments: Experiment[];
    featureFlags: FeatureFlag[];
    featureKeyMap: {[key: string]: FeatureFlag};
    groupIdMap: {[id: string]: Group};
    groups: Group[];
    projectId: string;
    rolloutIdMap: {[id: string]: Rollout};
    rollouts: Rollout[];
    variationIdMap: {[id: string]: Variation};
    // TODO[OASIS-6649]: Don't use object type
    // eslint-disable-next-line  @typescript-eslint/ban-types
    variationVariableUsageMap: object;
    version: string;
    revision: string;

    // TODO[OASIS-6649]: Don't use object type
    // eslint-disable-next-line  @typescript-eslint/ban-types
    createMutationSafeDatafileCopy(datafile: object): object;
    // TODO[OASIS-6649]: Don't use object type
    // eslint-disable-next-line  @typescript-eslint/ban-types
    createProjectConfig(datafile: object, datafileString: string | null): ProjectConfig
    getExperimentId(projectConfig: ProjectConfig, experimentKey: string): string | null
    getLayerId(projectConfig: ProjectConfig, experimentId: string): string | null
    getAttributeId(projectConfig: ProjectConfig, attributeKey: string, logger: LogHandler): string | null
    getEventId(projectConfig: ProjectConfig, eventKey: string): string | null
    getExperimentStatus(projectConfig: ProjectConfig, experimentKey: string): string | null
    isActive(projectConfig: ProjectConfig, experimentKey: string): boolean
    isRunning(projectConfig: ProjectConfig, experimentKey:string): boolean
    getExperimentAudienceConditions(projectConfig: ProjectConfig, experimentKey:string): string[]
    getVariationKeyFromId(projectConfig: ProjectConfig, variationId: string): string | null 
    getVariationIdFromExperimentAndVariationKey(projectConfig: ProjectConfig, experimentKey: string, variationKey: string): string | null
    getExperimentFromKey(projectConfig: ProjectConfig, experimentKey: string): Experiment | null
    getTrafficAllocation(projectConfig: ProjectConfig, experimentKey: string): Array<{entityId: string; endOfRange: number;}>
    getExperimentFromId(projectConfig: ProjectConfig, experimentId: string, logger: LogHandler): Experiment | null
    getFeatureFromKey(projectConfig: ProjectConfig, featureKey: string, logger: LogHandler): FeatureFlag | null
    getVariableForFeature(projectConfig: ProjectConfig, featureKey: string, variableKey: string, logger: LogHandler): FeatureVariable | null
    getVariableValueForVariation(projectConfig: ProjectConfig, variable: FeatureVariable, variation: Variation, logger: LogHandler) : string | null
    // TODO[OASIS-6649]: Don't use any type
    // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    getTypeCastValue(variableValue: string, variableType: string, logger: LogHandler): any
    getAudiencesById(projectConfig: ProjectConfig): {[id: string]: Audience}
    eventWithKeyExists(projectConfig: ProjectConfig, eventKey: string): boolean
    isFeatureExperiment(projectConfig: ProjectConfig, experimentId: string): boolean
    toDatafile(projectConfig: ProjectConfig): string
    tryCreatingProjectConfig(config: Config): { config: ProjectConfig, error: string | null}
  }
}
