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

export type UserAttributes = {
  // TODO[OASIS-6649]: Don't use any type
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  [name: string]: any;
};

export type EventTags = {
  [key: string]: string | number | boolean;
};

export type ConditionTree<Leaf> = Leaf | unknown[];

export interface Variation {
  id: string;
  key: string;
}

export type TrafficAllocation = {
  entityId: string;
  endOfRange: number;
};

export interface Experiment {
  id: string;
  key: string;
  status: string;
  layerId: string;
  variations: Variation[];
  trafficAllocation: TrafficAllocation[];
  audienceIds: string[];
  // TODO[OASIS-6649]: Don't use object type
  // eslint-disable-next-line  @typescript-eslint/ban-types
  forcedVariations: object;
}

export interface Group {
  experiments: Experiment[];
  id: string;
  policy: string;
  trafficAllocation: TrafficAllocation[];
}

export type Condition = {
  name: string;
  type: string;
  match?: string;
  value: string | number | boolean | null;
};

export interface Audience {
  id: string;
  conditions: ConditionTree<Condition>;
  name: string;
}

export interface Event {
  experimentIds: string[];
  id: string;
  key: string;
}

export interface FeatureVariable {
  defaultValue: string;
  id: string;
  key: string;
  subType?: string;
  type: string;
}

export interface Rollout {
  experiments: Experiment[];
  id: string;
}

export interface FeatureFlag {
  experimentIds: string[];
  id: string;
  key: string;
  rolloutId: string;
  variables: FeatureVariable[];
}

export interface Attribute {
  id: string;
  key: string;
}
