/**
 * Copyright 2019, Optimizely
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
var logging = require('@optimizely/js-sdk-logging');

var attributesValidator = require('../../utils/attributes_validator');
var fns = require('../../utils/fns');
var eventTagUtils = require('../../utils/event_tag_utils');
var projectConfig = require('../project_config');

var logger = logging.getLogger('EVENT_BUILDER');

/**
 * Creates an ImpressionEvent object from decision data
 * @param {Object} config
 * @param {Object} config.configObj
 * @param {String} config.experimentKey
 * @param {String} config.variationKey
 * @param {String} config.userId
 * @param {Object} config.userAttributes
 * @param {String} config.clientEngine
 * @param {String} config.clientVersion
 * @return {Object} an ImpressionEvent object
 */
exports.buildImpressionEvent = function buildImpressionEvent(config) {
  var configObj = config.configObj;
  var experimentKey = config.experimentKey;
  var variationKey = config.variationKey;
  var userId = config.userId;
  var userAttributes = config.userAttributes;
  var clientEngine = config.clientEngine;
  var clientVersion = config.clientVersion;

  var variationId = projectConfig.getVariationIdFromExperimentAndVariationKey(configObj, experimentKey, variationKey);
  var experimentId = projectConfig.getExperimentId(configObj, experimentKey);
  var layerId = projectConfig.getLayerId(configObj, experimentId);

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
  };
};

/**
 * Creates a ConversionEvent object from track
 * @param {Object} config
 * @param {Object} config.configObj
 * @param {String} config.eventKey
 * @param {Object|undefined} config.eventTags
 * @param {String} config.userId
 * @param {Object} config.userAttributes
 * @param {String} config.clientEngine
 * @param {String} config.clientVersion
 * @return {Object} a ConversionEvent object
 */
exports.buildConversionEvent = function buildConversionEvent(config) {
  var configObj = config.configObj;
  var userId = config.userId;
  var userAttributes = config.userAttributes;
  var clientEngine = config.clientEngine;
  var clientVersion = config.clientVersion;

  var eventKey = config.eventKey;
  var eventTags = config.eventTags;
  var eventId = projectConfig.getEventId(configObj, eventKey);

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

    revenue: eventTagUtils.getRevenueValue(eventTags, logger),
    value: eventTagUtils.getEventValue(eventTags, logger),
    tags: eventTags,
  };
};

function buildVisitorAttributes(configObj, attributes) {
  var builtAttributes = [];
  // Omit attribute values that are not supported by the log endpoint.
  fns.forOwn(attributes, function(attributeValue, attributeKey) {
    if (attributesValidator.isAttributeValid(attributeKey, attributeValue)) {
      var attributeId = projectConfig.getAttributeId(configObj, attributeKey, logger);
      if (attributeId) {
        builtAttributes.push({
          entityId: attributeId,
          key: attributeKey,
          value: attributes[attributeKey],
        });
      }
    }
  });

  return builtAttributes;
}
