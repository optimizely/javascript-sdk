/**
 * Copyright 2016-2021, Optimizely
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
import { LoggerFacade } from '@optimizely/js-sdk-logging';
import { EventV1 as CommonEventParams } from '@optimizely/js-sdk-event-processor';

import fns from '../../utils/fns';
import { CONTROL_ATTRIBUTES, RESERVED_EVENT_KEYWORDS } from '../../utils/enums';
import {
  getAttributeId,
  getEventId,
  getLayerId,
  getVariationKeyFromId,
  ProjectConfig,
} from '../project_config';
import * as eventTagUtils from '../../utils/event_tag_utils';
import { isAttributeValid } from '../../utils/attributes_validator';
import { EventTags, UserAttributes, Event as EventLoggingEndpoint } from '../../shared_types';

const ACTIVATE_EVENT_KEY = 'campaign_activated';
const CUSTOM_ATTRIBUTE_FEATURE_TYPE = 'custom';
const ENDPOINT = 'https://logx.optimizely.com/v1/events';
const HTTP_VERB = 'POST';

interface ImpressionOptions {
  // Object representing user attributes and values which need to be recorded
  attributes?: UserAttributes;
  // The client we are using: node or javascript
  clientEngine: string;
  // The version of the client
  clientVersion: string;
  // Object representing project configuration, including datafile information and mappings for quick lookup
  configObj: ProjectConfig;
  // Experiment for which impression needs to be recorded
  experimentId: string | null;
  // Key of an experiment for which impression needs to be recorded
  ruleKey: string;
  // Key for a feature flag
  flagKey: string;
  // Boolean representing if feature is enabled
  enabled: boolean;
  // Type for the decision source
  ruleType: string;
  // Event key representing the event which needs to be recorded
  eventKey?: string;
  // ID for variation which would be presented to user
  variationId: string | null;
  // Logger object
  logger: LoggerFacade;
  // ID for user
  userId: string;
}

interface ConversionEventOptions {
  // Object representing user attributes and values which need to be recorded
  attributes?: UserAttributes;
  // The client we are using: node or javascript
  clientEngine: string;
  // The version of the client
  clientVersion: string;
  // Object representing project configuration, including datafile information and mappings for quick lookup
  configObj: ProjectConfig;
  // Event key representing the event which needs to be recorded
  eventKey: string;
  // Logger object
  logger: LoggerFacade;
  // ID for user
  userId: string;
  // Object with event-specific tags
  eventTags?: EventTags;
}

type Metadata = {
  flag_key: string;
  rule_key: string;
  rule_type: string;
  variation_key: string;
  enabled: boolean;
}

type Decision = {
  campaign_id: string | null;
  experiment_id: string | null;
  variation_id: string | null;
  metadata: Metadata;
}

type SnapshotEvent = {
  entity_id: string | null;
  timestamp: number;
  uuid: string;
  key: string;
  revenue?: number;
  value?: number;
  tags?: EventTags;
}

interface Snapshot {
  decisions?: Decision[];
  events: SnapshotEvent[];
}

/**
 * Get params which are used same in both conversion and impression events
 * @param  {ImpressionOptions|ConversionEventOptions} options    Object containing values needed to build impression/conversion event
 * @return {CommonEventParams}                                   Common params with properties that are used in both conversion and impression events
 */
function getCommonEventParams({
  attributes,
  userId,
  clientEngine,
  clientVersion,
  configObj,
  logger,
}: ImpressionOptions | ConversionEventOptions): CommonEventParams {

  const anonymize_ip = configObj.anonymizeIP ? configObj.anonymizeIP : false;
  const botFiltering = configObj.botFiltering;

  const visitor = {
    snapshots: [],
    visitor_id: userId,
    attributes: [],
  };

  const commonParams: CommonEventParams = {
    account_id: configObj.accountId,
    project_id: configObj.projectId,
    visitors: [visitor],
    revision: configObj.revision,
    client_name: clientEngine,
    client_version: clientVersion,
    anonymize_ip: anonymize_ip,
    enrich_decisions: true,
  };

  if (attributes) {
    // Omit attribute values that are not supported by the log endpoint.
    Object.keys(attributes || {}).forEach(function(attributeKey) {
      const attributeValue = attributes[attributeKey];
      if (isAttributeValid(attributeKey, attributeValue)) {
        const attributeId = getAttributeId(configObj, attributeKey, logger);
        if (attributeId) {
          commonParams.visitors[0].attributes.push({
            entity_id: attributeId,
            key: attributeKey,
            type: CUSTOM_ATTRIBUTE_FEATURE_TYPE,
            value: attributes[attributeKey],
          });
        }
      }
    });
  }


  if (typeof botFiltering === 'boolean') {
    commonParams.visitors[0].attributes.push({
      entity_id: CONTROL_ATTRIBUTES.BOT_FILTERING,
      key: CONTROL_ATTRIBUTES.BOT_FILTERING,
      type: CUSTOM_ATTRIBUTE_FEATURE_TYPE,
      value: botFiltering,
    });
  }

  return commonParams;
}

/**
 * Creates object of params specific to impression events
 * @param  {ProjectConfig}       configObj    Object representing project configuration
 * @param  {string|null}         experimentId ID of experiment for which impression needs to be recorded
 * @param  {string|null}         variationId  ID for variation which would be presented to user
 * @param  {string}              ruleKey      Key of experiment for which impression needs to be recorded
 * @param  {string}              ruleType     Type for the decision source
 * @param  {string}              flagKey      Key for a feature flag
 * @param  {boolean}             enabled      Boolean representing if feature is enabled
 * @return {Snapshot}                         Impression event params
 */
function getImpressionEventParams(
  configObj: ProjectConfig,
  experimentId: string | null,
  variationId: string | null,
  ruleKey: string,
  ruleType: string,
  flagKey: string,
  enabled: boolean
): Snapshot {

  const campaignId = experimentId ? getLayerId(configObj, experimentId) : null;

  let variationKey = variationId ? getVariationKeyFromId(configObj, variationId) : null;
  variationKey = variationKey || '';

  const impressionEventParams = {
    decisions: [
      {
        campaign_id: campaignId,
        experiment_id: experimentId,
        variation_id: variationId,
        metadata: {
          flag_key: flagKey,
          rule_key: ruleKey,
          rule_type: ruleType,
          variation_key: variationKey,
          enabled: enabled,
        }
      },
    ],
    events: [
      {
        entity_id: campaignId,
        timestamp: fns.currentTimestamp(),
        key: ACTIVATE_EVENT_KEY,
        uuid: fns.uuid(),
      },
    ],
  };

  return impressionEventParams;
}

/**
 * Creates object of params specific to conversion events
 * @param  {ProjectConfig} configObj                 Object representing project configuration
 * @param  {string}        eventKey                  Event key representing the event which needs to be recorded
 * @param  {LoggerFacade}  logger                    Logger object
 * @param  {EventTags}     eventTags                 Values associated with the event.
 * @return {Snapshot}                                Conversion event params
 */
function getVisitorSnapshot(
  configObj: ProjectConfig,
  eventKey: string,
  logger: LoggerFacade,
  eventTags?: EventTags,
): Snapshot {
  const snapshot: Snapshot = {
    events: [],
  };

  const eventDict: SnapshotEvent = {
    entity_id: getEventId(configObj, eventKey),
    timestamp: fns.currentTimestamp(),
    uuid: fns.uuid(),
    key: eventKey,
  };

  if (eventTags) {
    const revenue = eventTagUtils.getRevenueValue(eventTags, logger);
    if (revenue !== null) {
      eventDict[RESERVED_EVENT_KEYWORDS.REVENUE] = revenue;
    }

    const eventValue = eventTagUtils.getEventValue(eventTags, logger);
    if (eventValue !== null) {
      eventDict[RESERVED_EVENT_KEYWORDS.VALUE] = eventValue;
    }

    eventDict['tags'] = eventTags;
  }
  snapshot.events.push(eventDict);

  return snapshot;
}

/**
 * Create impression event params to be sent to the logging endpoint
 * @param  {ImpressionOptions}    options    Object containing values needed to build impression event
 * @return {EventLoggingEndpoint}            Params to be used in impression event logging endpoint call
 */
export function getImpressionEvent(options: ImpressionOptions): EventLoggingEndpoint {
  const commonParams = getCommonEventParams(options);
  const impressionEventParams = getImpressionEventParams(
    options.configObj,
    options.experimentId,
    options.variationId,
    options.ruleKey,
    options.ruleType,
    options.flagKey,
    options.enabled,
  );
  commonParams.visitors[0].snapshots.push(impressionEventParams);

  const impressionEvent: EventLoggingEndpoint = {
    httpVerb: HTTP_VERB,
    url: ENDPOINT,
    params: commonParams,
  }

  return impressionEvent;
}

/**
 * Create conversion event params to be sent to the logging endpoint
 * @param  {ConversionEventOptions}  options   Object containing values needed to build conversion event
 * @return {EventLoggingEndpoint}              Params to be used in conversion event logging endpoint call
 */
export function getConversionEvent(options: ConversionEventOptions): EventLoggingEndpoint {

  const commonParams = getCommonEventParams(options);
  const snapshot = getVisitorSnapshot(options.configObj, options.eventKey, options.logger, options.eventTags);
  commonParams.visitors[0].snapshots = [snapshot];

  const conversionEvent: EventLoggingEndpoint = {
    httpVerb: HTTP_VERB,
    url: ENDPOINT,
    params: commonParams,
  }

  return conversionEvent;
}
