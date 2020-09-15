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

declare module '@optimizely/optimizely-sdk/lib/core/decision_service' { 
  import { LogHandler } from '@optimizely/js-sdk-logging';

  export function createDecisionService(options: Options): DecisionService;

  export interface UserProfileService {
    lookup(userId: string): UserProfile;
    save(profile: UserProfile): void;
  }

  interface DecisionService {
    getVariation(experimentKey: string, userId: string, attributes?: UserAttributes): string | null;
    getVariationForFeature(configObj: ConfigObj, feature: FeatureFlag, userId: string, attributes: unknown): Decision;
    removeForcedVariation(userId: unknown, experimentId: string, experimentKey: string): void;
    getForcedVariation(configObj: ConfigObj, experimentKey: string, userId: string): string | null;
    setForcedVariation(configObj: ConfigObj, experimentKey: string, userId: string, variationKey: unknown): boolean;
  }

  // Information about past bucketing decisions for a user.
  interface UserProfile {
    user_id: string;
    experiment_bucket_map: {
      [experiment_id: string]: {
        variation_id: string;
      };
    };
  }

  interface Options {
    userProfileService: UserProfileService | null;
    logger: LogHandler;
    UNSTABLE_conditionEvaluators: unknown;
  }

  interface ConfigObj {
    events: Event[];
    featureFlags: FeatureFlag[];
    experiments: Experiment[];
    anonymizeIP: boolean;
    botFiltering: boolean;
    audiences: Audience[];
    revision: string;
    groups: Group[];
    attributes: UserAttributes;
    rollouts: Rollout[];
    projectId: string;
    accountId: string;
    version: string;
    variables: FeatureVariable[];
    audiencesById: {[key : string]: Audience};
    attributeKeyMap: attributeKeyMap;
    groupIdMap: {[key: string]: Group};
    rolloutIdMap: {[key:string]: Rollout};
    experimentKeyMap: {[key: string]: Experiment}
    experimentIdMap: {[key: string]: Experiment};
    variationIdMap: {[key: string]: Variation};
    variationVariableUsageMap: {[key: string]: ExperimentVariableByID};
    experimentFeatureMap: {[key: string]: string[]};
    featureKeyMap: {[key: string]: FeatureFlag};
  }

  interface Event {
    key: string;
    id: string;
    experimentIds: string[]
  }

  interface FeatureFlag {
    rolloutId: string;
    key: string;
    id: string;
    experimentIds: string[],
    variables: FeatureVariable[],
    variableKeyMap?: {[key: string]: FeatureVariable}
  }

  interface FeatureVariable {
    type: string;
    subType?: string;
    key: string;
    id: string;
    defaultValue: string;
  }

  interface Experiment {
  id: string;
  key: string;
  status: string;
  layerId: string;
  variations: Variation[];
  trafficAllocation: Array<TrafficAllocationEntity>;
  audienceIds: string[];
    // TODO[OASIS-6649]: Don't use object type
    // eslint-disable-next-line  @typescript-eslint/ban-types
  forcedVariations: object;
  variationKeyMap?: {[key: string]: Variation};
  }

  interface Variation {
    id: string;
    key: string;
    featureEnabled: boolean;
    variables: ExperimentVariable[];
  }
  
  interface Audience {
    id: string;
    name: string;
    conditions: ConditionTree<Condition>;
  }

  interface Group {
    policy: string;
    id: string;
    experiments: Experiment[];
    trafficAllocation: Array<TrafficAllocationEntity>;
  }

  type UserAttributes = {
    // TODO[OASIS-6649]: Don't use any type
    // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    [name: string]: any;
  }

  type Condition = {
    name: string;
    type: string;
    match?: string;
    value: string | number | boolean | null;
  }
  
  type ConditionTree<Leaf> = Leaf | unknown[];

  interface TrafficAllocationEntity {
    endOfRange: number;
    entityId: string;
  }

  interface Rollout {
    id: string;
    experiments: Experiment[];
  }

  interface Attribute {
    id: string;
    key: string;
  }

  interface attributeKeyMap {
    [key: string]: Attribute;
  }

  type ExperimentVariable = {
    id: string;
    value: string;
  }

  type ExperimentVariableByID = {
    [key: string]: ExperimentVariable;
  }

  interface Decision {
    experiment: Experiment | null;
    variation: Variation | null;
    decisionSource: string;
  }
}
