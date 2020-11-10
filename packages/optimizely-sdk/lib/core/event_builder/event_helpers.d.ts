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
import { ProjectConfig } from '../project_config';
import { DecisionObj } from '../decision_service';
import { EventTags, UserAttributes } from '../../shared_types';

interface ImpressionConfig {
  decisionObj: DecisionObj;
  userId: string;
  flagKey: string;
  enabled: boolean;
  userAttributes?: UserAttributes;
  clientEngine: string;
  clientVersion: string;
  configObj: ProjectConfig;
}
type  VisitorAttribute = {
  entityId: string;
  key: string;
  value: string | number | boolean;
}
type EventContext = {
  accountId: string;
  projectId: string;
  revision: string;
  clientName: string;
  clientVersion: string;
  anonymizeIP: boolean;
  botFiltering: boolean | undefined;
}

interface ImpressionEvent {
  type: 'impression';
  timestamp: number;
  uuid: string;
  user: {
      id: string;
      attributes: VisitorAttribute[];
  };
  context: EventContext;
  layer: {
      id: string;
  };
  experiment: {
      id: string;
      key: string;
  } | null;
  variation: {
      id: string;
      key: string;
  } | null;

  ruleKey: string,
  flagKey: string,
  ruleType: string,
  enabled: boolean,
}

interface ConversionConfig {
  eventKey: string;
  eventTags?: EventTags;
  userId: string;
  userAttributes?: UserAttributes;
  clientEngine: string;
  clientVersion: string;
  configObj: ProjectConfig;
}

interface ConversionEvent {
  type: 'conversion';
  timestamp: number;
  uuid: string;
  user: {
    id: string;
    attributes: VisitorAttribute[];
  };
  context: EventContext;
  experiment: {
    id: string;
    key: string;
  };
  event: {
    id: string;
    key: string;
 };
  revenue: number | null;
  value: number | null;
  tags: EventTags;
}

/**
 * Creates an ImpressionEvent object from decision data
 * @param {ImpressionConfig} config
 * @return {ImpressionEvent} an ImpressionEvent object
 */
export function buildImpressionEvent(config: ImpressionConfig): ImpressionEvent;

/**
 * Creates a ConversionEvent object from track
 * @param {ConversionConfig} config
 * @return {ConversionEvent} a ConversionEvent object
 */
export function buildConversionEvent(config: ConversionConfig): ConversionEvent;
