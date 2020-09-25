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
  import { Event as EventLoggingEndpoint } from '@optimizely/optimizely-sdk';

  interface ImpressionOptions {
    attributes: import('../../shared_types').UserAttributes;
    clientEngine: string;
    clientVersion: string;
    configObj: ProjectConfig;
    experimentId: string;
    eventKey: string;
    variationId: string;
    logger: LogHandler;
    userId: string;
  }

  interface ConversionEventOptions {
    attributes: import('../../shared_types').UserAttributes;
    clientEngine: string;
    clientVersion: string;
    configObj: ProjectConfig;
    eventKey: string;
    logger: LogHandler;
    userId: string;
    eventTags: import('../../shared_types').EventTags;
  }

  // eslint-disable-next-line  @typescript-eslint/no-empty-interface
  export interface EventBuilder {}

  /**
   * Create impression event params to be sent to the logging endpoint
   * @param  {ImpressionOptions} options Object containing values needed to build impression event
   * @return {EventLoggingEndpoint} Params to be used in impression event logging endpoint call
   */
  export function getImpressionEvent(options: ImpressionOptions): EventLoggingEndpoint;
  
  /**
   * Create conversion event params to be sent to the logging endpoint
   * @param  {ConversionEventOptions} options  Object containing values needed to build conversion event
   * @return {EventLoggingEndpoint} Params to be used in conversion event logging endpoint call
   */
  export function getConversionEvent(options: ConversionEventOptions): EventLoggingEndpoint;
}
