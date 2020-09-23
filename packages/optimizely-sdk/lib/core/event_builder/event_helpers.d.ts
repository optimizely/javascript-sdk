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

declare module '@optimizely/optimizely-sdk/lib/core/event_builder' {
  import { ProjectConfig } from '@optimizely/optimizely-sdk/lib/core/project_config';
  import { EventTags, UserAttributes } from '@optimizely/optimizely-sdk';

  interface ImpressionConfig {
    experimentKey: string;
    variationKey: string;
    userId: string;
    userAttributes: UserAttributes;
    clientEngine: string;
    clientVersion: string;
    configObj: ProjectConfig;
  }

  // eslint-disable-next-line  @typescript-eslint/no-empty-interface
  interface ImpressionEvent {}

  interface ConversionConfig {
    eventKey: string;
    eventTags: EventTags;
    userId: string;
    userAttributes: UserAttributes;
    clientEngine: string;
    clientVersion: string;
    configObj: ProjectConfig;
  }

  // eslint-disable-next-line  @typescript-eslint/no-empty-interface
  interface ConversionEvent {}

  export interface EventHelpers {
    /**
     * Creates an ImpressionEvent object from decision data
     * @param {ImpressionConfig} config
     * @return {ImpressionEvent} an ImpressionEvent object
     */
    buildImpressionEvent(config: ImpressionConfig): ImpressionEvent;
    /**
     * Creates a ConversionEvent object from track
     * @param {ConversionConfig} config
     * @return {ConversionEvent} a ConversionEvent object
     */
    buildConversionEvent(config: ConversionConfig): ConversionEvent;
  }
}
