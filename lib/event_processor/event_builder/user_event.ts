/**
 * Copyright 2022, 2024, Optimizely
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
import { DecisionObj } from '../../core/decision_service';
import * as decision from '../../core/decision';
import { isAttributeValid } from '../../utils/attributes_validator';
import * as eventTagUtils from '../../utils/event_tag_utils';
import fns from '../../utils/fns';
import {
  getAttributeId,
  getEventId,
  getLayerId,
  ProjectConfig,
  Region,
} from '../../project_config/project_config';

import { EventTags, UserAttributes } from '../../shared_types';
import { LoggerFacade } from '../../logging/logger';
import { DECISION_SOURCES } from '../../common_exports';
import { Platform } from '../../platform_support';

export const __supportedPlatforms: Platform[] = ['__universal__'];

export type VisitorAttribute = {
  entityId: string
  key: string
  value: string | number | boolean
}

type EventContext = {
  region?: Region;
  accountId: string;
  projectId: string;
  revision: string;
  clientName: string;
  clientVersion: string;
  anonymizeIP: boolean;
  botFiltering?: boolean;
}

type EventType = 'impression' | 'conversion';


export type BaseUserEvent<T extends EventType> = {
  type: T;
  timestamp: number;
  uuid: string;
  context: EventContext;
  user: {
    id: string;
    attributes: VisitorAttribute[];
  };
};

export type ImpressionEvent = BaseUserEvent<'impression'> & {
  layer: {
    id: string | null;
  } | null;

  experiment: {
    id: string | null;
    key: string;
  } | null;

  variation: {
    id: string | null;
    key: string;
  } | null;

  ruleKey: string;
  flagKey: string;
  ruleType: string;
  enabled: boolean;
  cmabUuid?: string;
};

export type ConversionEvent = BaseUserEvent<'conversion'> & {
  event: {
    id: string | null;
    key: string;
  }

  revenue: number | null;
  value: number | null;
  tags?: EventTags;
}

export type UserEvent = ImpressionEvent | ConversionEvent;

export const areEventContextsEqual = (eventA: UserEvent, eventB: UserEvent): boolean => {
  const contextA = eventA.context
  const contextB = eventB.context

  const regionA: Region = contextA.region || 'US';
  const regionB: Region = contextB.region || 'US';

  return (
    regionA === regionB &&
    contextA.accountId === contextB.accountId &&
    contextA.projectId === contextB.projectId &&
    contextA.clientName === contextB.clientName &&
    contextA.clientVersion === contextB.clientVersion &&
    contextA.revision === contextB.revision &&
    contextA.anonymizeIP === contextB.anonymizeIP &&
    contextA.botFiltering === contextB.botFiltering
  )
}

const buildBaseEvent = <T extends  EventType>({
  configObj,
  userId,
  userAttributes,
  clientEngine,
  clientVersion,
  type,
}: {
  configObj: ProjectConfig;
  userId: string;
  userAttributes?: UserAttributes;
  clientEngine: string;
  clientVersion: string;
  type: T;
}): BaseUserEvent<T> => {
  return {
    type,
    timestamp: fns.currentTimestamp(),
    uuid: fns.uuid(),
    context: {
      region: configObj.region,
      accountId: configObj.accountId,
      projectId: configObj.projectId,
      revision: configObj.revision,
      clientName: clientEngine,
      clientVersion: clientVersion,
      anonymizeIP: configObj.anonymizeIP || false,
      botFiltering: configObj.botFiltering,
    },
    user: {
      id: userId,
      attributes: buildVisitorAttributes(configObj, userAttributes),
    },
  };

}

export type ImpressionConfig = {
  decisionObj: DecisionObj;
  userId: string;
  flagKey: string;
  enabled: boolean;
  userAttributes?: UserAttributes;
  clientEngine: string;
  clientVersion: string;
  configObj: ProjectConfig;
}

/**
 * Creates an ImpressionEvent object from decision data
 * @param  {ImpressionConfig}  config
 * @return {ImpressionEvent}   an ImpressionEvent object
 */
export const buildImpressionEvent = function({
  configObj,
  decisionObj,
  userId,
  flagKey,
  enabled,
  userAttributes,
  clientEngine,
  clientVersion,
}: ImpressionConfig): ImpressionEvent {

  const ruleType = decisionObj.decisionSource;
  const experimentKey = decision.getExperimentKey(decisionObj);
  const experimentId = decision.getExperimentId(decisionObj);
  const variationKey = decision.getVariationKey(decisionObj);
  const variationId = decision.getVariationId(decisionObj);
  const cmabUuid = decisionObj.cmabUuid;
  const layerId =
    experimentId !== null ? (ruleType === DECISION_SOURCES.HOLDOUT ? '' : getLayerId(configObj, experimentId)) : null;

  return {
    ...buildBaseEvent({
      configObj,
      userId,
      userAttributes,
      clientEngine,
      clientVersion,
      type: 'impression',
    }),

    layer: {
      id: layerId,
    },

    experiment: {
      id: experimentId,
      key: experimentKey,
    },

    variation: {
      id: variationId,
      key: variationKey,
    },

    ruleKey: experimentKey,
    flagKey: flagKey,
    ruleType: ruleType,
    enabled: enabled,
    cmabUuid,
  };
};

export type ConversionConfig = {
  eventKey: string;
  eventTags?: EventTags;
  userId: string;
  userAttributes?: UserAttributes;
  clientEngine: string;
  clientVersion: string;
  configObj: ProjectConfig;
}

/**
 * Creates a ConversionEvent object from track
 * @param  {ConversionConfig} config
 * @return {ConversionEvent}  a ConversionEvent object
 */
export const buildConversionEvent = function({
  configObj,
  userId,
  userAttributes,
  clientEngine,
  clientVersion,
  eventKey,
  eventTags,  
}: ConversionConfig, logger?: LoggerFacade): ConversionEvent {

  const eventId = getEventId(configObj, eventKey);

  const revenue = eventTags ? eventTagUtils.getRevenueValue(eventTags, logger) : null;
  const eventValue = eventTags ? eventTagUtils.getEventValue(eventTags, logger) : null;

  return {
    ...buildBaseEvent({
      configObj,
      userId,
      userAttributes,
      clientEngine,
      clientVersion,
      type: 'conversion',
    }),

    event: {
      id: eventId,
      key: eventKey,
    },

    revenue: revenue,
    value: eventValue,
    tags: eventTags,
  };
};


const buildVisitorAttributes = (
  configObj: ProjectConfig,
  attributes?: UserAttributes,
  logger?: LoggerFacade
): VisitorAttribute[]  => {
  if (!attributes) {
    return [];
  }

  // Omit attribute values that are not supported by the log endpoint.
  const builtAttributes: VisitorAttribute[] = [];
  Object.keys(attributes).forEach(function(attributeKey) {
    const attributeValue = attributes[attributeKey];

    if (typeof attributeValue === 'object' || typeof attributeValue === 'undefined') {
      return;
    }

    if (isAttributeValid(attributeKey, attributeValue)) {
      const attributeId = getAttributeId(configObj, attributeKey, logger);
      if (attributeId) {
        builtAttributes.push({
          entityId: attributeId,
          key: attributeKey,
          value: attributeValue,
        });
      }
    }
  });

  return builtAttributes;
}
