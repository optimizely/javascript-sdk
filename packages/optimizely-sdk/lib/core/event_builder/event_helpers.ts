/**
 * Copyright 2019-2021, Optimizely
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
import { getLogger } from '@optimizely/js-sdk-logging';

import fns from '../../utils/fns';
import * as eventTagUtils from '../../utils/event_tag_utils';
import * as attributesValidator from '../../utils/attributes_validator';
import * as decision from '../decision';

import { EventTags, UserAttributes } from '../../shared_types';
import { DecisionObj } from '../decision_service';
import {
  getAttributeId,
  getEventId,
  getLayerId,
  getVariationIdFromExperimentIdAndVariationKey,
  ProjectConfig,
} from '../project_config';

const logger = getLogger('EVENT_BUILDER');

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

type VisitorAttribute = {
  entityId: string;
  key: string;
  value: string | number | boolean;
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
    id: string | null;
  };
  experiment: {
    id: string | null;
    key: string;
  } | null;
  variation: {
    id: string | null;
    key: string;
  } | null;

  ruleKey: string,
  flagKey: string,
  ruleType: string,
  enabled: boolean,
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
  event: {
    id: string | null;
    key: string;
  };
  revenue: number | null;
  value: number | null;
  tags: EventTags | undefined;
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

  const variationId = experimentId !== null && variationKey !== '' ? getVariationIdFromExperimentIdAndVariationKey(configObj, experimentId, variationKey) : null;
  const layerId = experimentId !== null ? getLayerId(configObj, experimentId) : null;

  return {
    type: 'impression',
    timestamp: fns.currentTimestamp(),
    uuid: fns.uuid(),

    user: {
      id: userId,
      attributes: buildVisitorAttributes(configObj, userAttributes),
    },

    context: {
      accountId: configObj.accountId,
      projectId: configObj.projectId,
      revision: configObj.revision,
      clientName: clientEngine,
      clientVersion: clientVersion,
      anonymizeIP: configObj.anonymizeIP || false,
      botFiltering: configObj.botFiltering,
    },

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
  };
};

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
}: ConversionConfig): ConversionEvent {

  const eventId = getEventId(configObj, eventKey);

  const revenue = eventTags ? eventTagUtils.getRevenueValue(eventTags, logger) : null;
  const eventValue = eventTags ? eventTagUtils.getEventValue(eventTags, logger) : null;

  return {
    type: 'conversion',
    timestamp: fns.currentTimestamp(),
    uuid: fns.uuid(),

    user: {
      id: userId,
      attributes: buildVisitorAttributes(configObj, userAttributes),
    },

    context: {
      accountId: configObj.accountId,
      projectId: configObj.projectId,
      revision: configObj.revision,
      clientName: clientEngine,
      clientVersion: clientVersion,
      anonymizeIP: configObj.anonymizeIP || false,
      botFiltering: configObj.botFiltering,
    },

    event: {
      id: eventId,
      key: eventKey,
    },

    revenue: revenue,
    value: eventValue,
    tags: eventTags,
  };
};

function buildVisitorAttributes(
  configObj: ProjectConfig,
  attributes?: UserAttributes
): VisitorAttribute[] {
  const builtAttributes: VisitorAttribute[] = [];
  // Omit attribute values that are not supported by the log endpoint.
  if (attributes) {
    Object.keys(attributes || {}).forEach(function(attributeKey) {
      const attributeValue = attributes[attributeKey];
      if (attributesValidator.isAttributeValid(attributeKey, attributeValue)) {
        const attributeId = getAttributeId(configObj, attributeKey, logger);
        if (attributeId) {
          builtAttributes.push({
            entityId: attributeId,
            key: attributeKey,
            value: attributes[attributeKey],
          });
        }
      }
    });
  }

  return builtAttributes;
}
