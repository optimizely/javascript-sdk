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

import { Experiment } from '@optimizely/optimizely-sdk';
import { ConditionTree } from '../condition_tree_evaluator';

export interface Group {
  experiments: Experiment[];
  id: string;
  policy: string;
  trafficAllocation: Array<{
    entityId: string;
    endOfRange: number;
  }>;
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
