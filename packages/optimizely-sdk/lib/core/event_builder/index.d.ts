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
  import { LogHandler } from '@optimizely/js-sdk-logging';
  import { EventTags, UserAttributes } from '@optimizely/optimizely-sdk';
  import { Event as EventLoggingEndpoint } from '@optimizely/optimizely-sdk';
  export type Attributes = {
    [name: string]: unknown;
  };

  interface ImpressionOptions {
    attributes: Attributes;
    clientEngine: string;
    clientVersion: string;
    configObj: ProjectConfig;
    experimentId: string;
    eventKey: string;
    variationId: string;
    logger: LogHandler;
    userId: string;
  }

  interface ImpressionConfig {
    experimentKey: string;
    variationKey: string;
    userId: string;
    userAttributes: UserAttributes;
    clientEngine: string;
    clientVersion: string;
    configObj: ProjectConfig;
  }

  // TODO[OASIS-6649]: Don't use any type
  // eslint-disable-next-line  @typescript-eslint/no-empty-interface
  interface ImpressionEvent {}

  interface ConversionEventOptions {
    attributes: Attributes;
    clientEngine: string;
    clientVersion: string;
    configObj: ProjectConfig;
    eventKey: string;
    logger: LogHandler;
    userId: string;
    eventTags: EventTags;
  }

  interface ConversionConfig {
    eventKey: string;
    eventTags: EventTags;
    userId: string;
    userAttributes: UserAttributes;
    clientEngine: string;
    clientVersion: string;
    configObj: ProjectConfig;
  }

  // TODO[OASIS-6649]: Don't use any type
  // eslint-disable-next-line  @typescript-eslint/no-empty-interface
  interface ConversionEvent {}

  export interface EventBuilder {
    /**
     * Create impression event params to be sent to the logging endpoint
     * @param  {ImpressionOptions} options Object containing values needed to build impression event
     * @return {EventLoggingEndpoint} Params to be used in impression event logging endpoint call
     */
    getImpressionEvent(options: ImpressionOptions): EventLoggingEndpoint;
    /**
     * Create conversion event params to be sent to the logging endpoint
     * @param  {ConversionEventOptions} options  Object containing values needed to build conversion event
     * @return {EventLoggingEndpoint} Params to be used in conversion event logging endpoint call
     */
    getConversionEvent(options: ConversionEventOptions): EventLoggingEndpoint;

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
