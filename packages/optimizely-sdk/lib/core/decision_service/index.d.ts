/**
 * Copyright 2018-2020, Optimizely
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

  export interface DecisionService {
    getVariation(experimentKey: string, userId: string, attributes?: UserAttributes): string | null;
    // getVariationForFeature(configObj, feature, userId, attributes):
  }

  export interface ConfigObj {
    __datafileStr: string;
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
      // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    variables: any; //to be defined
    audiencesById: {[key : string]: Audience};
    attributeKeyMap: attributeKeyMap;
    groupIdMap: {[key: string]: Group};
    rolloutIdMap: {[key:string]: Rollout};
    experimentKeyMap: {[key: string]: Experiment} //look into this one closer
    experimentIdMap: {[key: string]: Experiment};
    variationIdMap: {[key: string]: Variation};
    variationVariableUsageMap: {[key: string]: ExperimentVariableByID};
    experimentFeatureMap: {[key: string]: string[]};
    featureKeyMap: {[key: string]: FeatureFlag}; //look into this one closer
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
    variableKeyMap: {[key: string]: FeatureVariable}
  }

  interface FeatureVariable {
    type: string;
    key: string;
    id: string;
    defaultValue: string;
  }

  export interface Experiment {
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
  variationKeyMap: {[key: string]: Variation}
  }

  export interface Variation {
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
  
  interface TrafficAllocationEntity {
    endOfRange: number;
    entityId: string;
  }

  type ConditionTree<Leaf> = Leaf | unknown[];


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
    [key: string]: ExperimentVariable
  }
}
