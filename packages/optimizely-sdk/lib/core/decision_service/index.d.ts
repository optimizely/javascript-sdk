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
  import { ProjectConfig, Experiment, Variation, FeatureFlag } from '@optimizely/optimizely-sdk/lib/core/project_config';

  export function createDecisionService(options: Options): DecisionService;

  export interface UserProfileService {
    lookup(userId: string): UserProfile;
    save(profile: UserProfile): void;
  }

  export type UserAttributes = {
    // TODO[OASIS-6649]: Don't use any type
    // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    [name: string]: any;
  }

  interface DecisionService {
    getVariation(experimentKey: string, userId: string, attributes?: UserAttributes): string | null;
    getVariationForFeature(configObj: ProjectConfig, feature: FeatureFlag, userId: string, attributes: unknown): Decision;
    removeForcedVariation(userId: unknown, experimentId: string, experimentKey: string): void;
    getForcedVariation(configObj: ProjectConfig, experimentKey: string, userId: string): string | null;
    setForcedVariation(configObj: ProjectConfig, experimentKey: string, userId: string, variationKey: unknown): boolean;
  }

  interface Options {
    userProfileService: UserProfileService | null;
    logger: LogHandler;
    UNSTABLE_conditionEvaluators: unknown;
  }

  interface Decision {
    experiment: Experiment | null;
    variation: Variation | null;
    decisionSource: string;
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
}
