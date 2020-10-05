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
export interface FeatureVariable {
  type: string;
  key: string;
  id: string;
  defaultValue: string;
}

export interface FeatureFlag {
  rolloutId: string;
  key: string;
  id: string;
  experimentIds: string[],
  variables: FeatureVariable[],
  variableKeyMap: {[key: string]: FeatureVariable}
}

export interface FeatureKeyMap {
  [key: string]: FeatureFlag
}

export interface Variation {
  id: string;
  key: string;
  featureEnabled: boolean;
  variables: VariationVariable[];
}

export interface VariationVariable {
  id: string;
  value: string;
}

export interface Experiment {
  id: string;
  key: string;
  variationKeyMap: {[key: string]: Variation}
}
