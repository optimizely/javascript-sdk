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
import { sprintf, objectValues } from '@optimizely/js-sdk-utils';

import fns from '../../utils/fns';
import {
  ERROR_MESSAGES,
  LOG_LEVEL,
  LOG_MESSAGES,
  FEATURE_VARIABLE_TYPES,
} from '../../utils/enums';
import configValidator from '../../utils/config_validator';

import { LogHandler } from '@optimizely/js-sdk-logging';
import {
  Audience,
  Experiment,
  FeatureFlag,
  FeatureVariable,
  Group,
  OptimizelyVariation,
  Rollout,
  TrafficAllocation,
  Variation,
  VariableType,
  VariationVariable,
} from '../../shared_types';

interface TryCreatingProjectConfigConfig {
  datafile: string;
  jsonSchemaValidator?: {
    validate(jsonObject: unknown): boolean,
  };
  logger: LogHandler;
}

interface Event {
  key: string;
  id: string;
  experimentsIds: string[];
}

interface VariableUsageMap {
  [id: string]: VariationVariable;
}

export interface ProjectConfig {
  revision: string;
  projectId: string;
  sdkKey: string;
  environmentKey: string;
  sendFlagDecisions?: boolean;
  experimentKeyMap: { [key: string]: Experiment };
  featureKeyMap: {
    [key: string]: FeatureFlag;
  };
  rollouts: Rollout[];
  featureFlags: FeatureFlag[];
  experimentIdMap: { [id: string]: Experiment };
  experimentFeatureMap: { [key: string]: string[] };
  experiments: Experiment[];
  eventKeyMap: { [key: string]: Event };
  audiences: Audience[];
  attributeKeyMap: { [key: string]: { id: string } };
  variationIdMap: { [id: string]: OptimizelyVariation };
  variationVariableUsageMap: { [id: string]: VariableUsageMap };
  audiencesById: { [id: string]: Audience };
  __datafileStr: string;
  groupIdMap: { [id: string]: Group };
  groups: Group[];
  events: Event[];
  attributes: Array<{ id: string; key: string }>;
  typedAudiences: Audience[];
  rolloutIdMap: { [id: string]: Rollout };
  anonymizeIP?: boolean | null;
  botFiltering?: boolean;
  accountId: string;
}

const EXPERIMENT_RUNNING_STATUS = 'Running';
const RESERVED_ATTRIBUTE_PREFIX = '$opt_';
const MODULE_NAME = 'PROJECT_CONFIG';

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
function createMutationSafeDatafileCopy(datafile: any): ProjectConfig {
  const datafileCopy = fns.assign({}, datafile);
  datafileCopy.audiences = (datafile.audiences || []).map((audience: Audience) => {
    return fns.assign({}, audience);
  });
  datafileCopy.experiments = (datafile.experiments || []).map((experiment: Experiment) => {
    return fns.assign({}, experiment);
  });
  datafileCopy.featureFlags = (datafile.featureFlags || []).map((featureFlag: FeatureFlag) => {
    return fns.assign({}, featureFlag);
  });
  datafileCopy.groups = (datafile.groups || []).map((group: Group) => {
    const groupCopy = fns.assign({}, group);
    groupCopy.experiments = (group.experiments || []).map((experiment) => {
      return fns.assign({}, experiment);
    });
    return groupCopy;
  });
  datafileCopy.rollouts = (datafile.rollouts || []).map((rollout: Rollout) => {
    const rolloutCopy = fns.assign({}, rollout);
    rolloutCopy.experiments = (rollout.experiments || []).map((experiment) => {
      return fns.assign({}, experiment);
    });
    return rolloutCopy;
  });

  datafileCopy.environmentKey = datafile.environmentKey ?? '';
  datafileCopy.sdkKey = datafile.sdkKey ?? '';

  return datafileCopy;
}

/**
 * Creates projectConfig object to be used for quick project property lookup
 * @param  {Object}        datafileObj   JSON datafile representing the project
 * @param  {string|null}   datafileStr   JSON string representation of the datafile
 * @return {ProjectConfig} Object representing project configuration
 */
export const createProjectConfig = function(
  datafileObj?: JSON,
  datafileStr: string | null = null
): ProjectConfig {
  const projectConfig = createMutationSafeDatafileCopy(datafileObj);

  projectConfig.__datafileStr = datafileStr === null ? JSON.stringify(datafileObj) : datafileStr;

  /*
   * Conditions of audiences in projectConfig.typedAudiences are not
   * expected to be string-encoded as they are here in projectConfig.audiences.
   */
  (projectConfig.audiences || []).forEach((audience) => {
    audience.conditions = JSON.parse(audience.conditions as string);
  });
  projectConfig.audiencesById = fns.keyBy(projectConfig.audiences, 'id');
  fns.assign(projectConfig.audiencesById, fns.keyBy(projectConfig.typedAudiences, 'id'));

  projectConfig.attributeKeyMap = fns.keyBy(projectConfig.attributes, 'key');
  projectConfig.eventKeyMap = fns.keyBy(projectConfig.events, 'key');
  projectConfig.groupIdMap = fns.keyBy(projectConfig.groups, 'id');

  let experiments;
  Object.keys(projectConfig.groupIdMap || {}).forEach((Id) => {
    experiments = projectConfig.groupIdMap[Id].experiments;
    (experiments || []).forEach((experiment) => {
      projectConfig.experiments.push(fns.assign(experiment, { groupId: Id }));
    });
  });

  projectConfig.rolloutIdMap = fns.keyBy(projectConfig.rollouts || [], 'id');
  objectValues(projectConfig.rolloutIdMap || {}).forEach(
    (rollout) => {
      (rollout.experiments || []).forEach((experiment) => {
        projectConfig.experiments.push(experiment);
        // Creates { <variationKey>: <variation> } map inside of the experiment
        experiment.variationKeyMap = fns.keyBy(experiment.variations, 'key');
      });
    }
  );

  projectConfig.experimentKeyMap = fns.keyBy(projectConfig.experiments, 'key');
  projectConfig.experimentIdMap = fns.keyBy(projectConfig.experiments, 'id');

  projectConfig.variationIdMap = {};
  projectConfig.variationVariableUsageMap = {};
  (projectConfig.experiments || []).forEach((experiment) => {
    // Creates { <variationKey>: <variation> } map inside of the experiment
    experiment.variationKeyMap = fns.keyBy(experiment.variations, 'key');

    // Creates { <variationId>: { key: <variationKey>, id: <variationId> } } mapping for quick lookup
    fns.assign(projectConfig.variationIdMap, fns.keyBy(experiment.variations, 'id'));
    objectValues(experiment.variationKeyMap || {}).forEach((variation) => {
      if (variation.variables) {
        projectConfig.variationVariableUsageMap[variation.id] = fns.keyBy(variation.variables, 'id');
      }
    });
  });

  // Object containing experiment Ids that exist in any feature
  // for checking that experiment is a feature experiment or not.
  projectConfig.experimentFeatureMap = {};

  projectConfig.featureKeyMap = fns.keyBy(projectConfig.featureFlags || [], 'key');
  objectValues(projectConfig.featureKeyMap || {}).forEach(
    (feature) => {
      // Json type is represented in datafile as a subtype of string for the sake of backwards compatibility.
      // Converting it to a first-class json type while creating Project Config
      feature.variables.forEach((variable) => {
        if (variable.type === FEATURE_VARIABLE_TYPES.STRING && variable.subType === FEATURE_VARIABLE_TYPES.JSON) {
          variable.type = FEATURE_VARIABLE_TYPES.JSON as VariableType;
          delete variable.subType;
        }
      });

      feature.variableKeyMap = fns.keyBy(feature.variables, 'key');
      (feature.experimentIds || []).forEach((experimentId) => {
        // Add this experiment in experiment-feature map.
        if (projectConfig.experimentFeatureMap[experimentId]) {
          projectConfig.experimentFeatureMap[experimentId].push(feature.id);
        } else {
          projectConfig.experimentFeatureMap[experimentId] = [feature.id];
        }
      });
    }
  );

  return projectConfig;
};

/**
 * Get experiment ID for the provided experiment key
 * @param  {ProjectConfig}    projectConfig   Object representing project configuration
 * @param  {string}           experimentKey   Experiment key for which ID is to be determined
 * @return {string}                           Experiment ID corresponding to the provided experiment key
 * @throws If experiment key is not in datafile
 */
export const getExperimentId = function(projectConfig: ProjectConfig, experimentKey: string): string {
  const experiment = projectConfig.experimentKeyMap[experimentKey];
  if (!experiment) {
    throw new Error(sprintf(ERROR_MESSAGES.INVALID_EXPERIMENT_KEY, MODULE_NAME, experimentKey));
  }
  return experiment.id;
};

/**
 * Get layer ID for the provided experiment key
 * @param  {ProjectConfig}    projectConfig   Object representing project configuration
 * @param  {string}           experimentId    Experiment ID for which layer ID is to be determined
 * @return {string}                           Layer ID corresponding to the provided experiment key
 * @throws If experiment key is not in datafile
 */
export const getLayerId = function(projectConfig: ProjectConfig, experimentId: string): string {
  const experiment = projectConfig.experimentIdMap[experimentId];
  if (!experiment) {
    throw new Error(sprintf(ERROR_MESSAGES.INVALID_EXPERIMENT_ID, MODULE_NAME, experimentId));
  }
  return experiment.layerId;
};

/**
 * Get attribute ID for the provided attribute key
 * @param  {ProjectConfig}   projectConfig    Object representing project configuration
 * @param  {string}          attributeKey     Attribute key for which ID is to be determined
 * @param  {LogHandler}      logger
 * @return {string|null}     Attribute ID corresponding to the provided attribute key. Attribute key if it is a reserved attribute.
 */
export const getAttributeId = function(
  projectConfig: ProjectConfig,
  attributeKey: string,
  logger: LogHandler
): string | null {
  const attribute = projectConfig.attributeKeyMap[attributeKey];
  const hasReservedPrefix = attributeKey.indexOf(RESERVED_ATTRIBUTE_PREFIX) === 0;
  if (attribute) {
    if (hasReservedPrefix) {
      logger.log(
        LOG_LEVEL.WARNING,
        sprintf(
          'Attribute %s unexpectedly has reserved prefix %s; using attribute ID instead of reserved attribute name.',
          attributeKey,
          RESERVED_ATTRIBUTE_PREFIX
        )
      );
    }
    return attribute.id;
  } else if (hasReservedPrefix) {
    return attributeKey;
  }

  logger.log(LOG_LEVEL.DEBUG, sprintf(ERROR_MESSAGES.UNRECOGNIZED_ATTRIBUTE, MODULE_NAME, attributeKey));
  return null;
};

/**
 * Get event ID for the provided
 * @param  {ProjectConfig}   projectConfig  Object representing project configuration
 * @param  {string}          eventKey       Event key for which ID is to be determined
 * @return {string|null}     Event ID corresponding to the provided event key
 */
export const getEventId = function(projectConfig: ProjectConfig, eventKey: string): string | null {
  const event = projectConfig.eventKeyMap[eventKey];
  if (event) {
    return event.id;
  }
  return null;
};

/**
 * Get experiment status for the provided experiment key
 * @param  {ProjectConfig}  projectConfig   Object representing project configuration
 * @param  {string}         experimentKey   Experiment key for which status is to be determined
 * @return {string}         Experiment status corresponding to the provided experiment key
 * @throws If experiment key is not in datafile
 */
export const getExperimentStatus = function(projectConfig: ProjectConfig, experimentKey: string): string {
  const experiment = projectConfig.experimentKeyMap[experimentKey];
  if (!experiment) {
    throw new Error(sprintf(ERROR_MESSAGES.INVALID_EXPERIMENT_KEY, MODULE_NAME, experimentKey));
  }
  return experiment.status;
};

/**
 * Returns whether experiment has a status of 'Running'
 * @param  {ProjectConfig}  projectConfig   Object representing project configuration
 * @param  {string}         experimentKey   Experiment key for which status is to be compared with 'Running'
 * @return {boolean}                        True if experiment status is set to 'Running', false otherwise
 */
export const isActive = function(projectConfig: ProjectConfig, experimentKey: string): boolean {
  return getExperimentStatus(projectConfig, experimentKey) === EXPERIMENT_RUNNING_STATUS;
};

/**
 * Determine for given experiment if event is running, which determines whether should be dispatched or not
 * @param  {ProjectConfig}  configObj       Object representing project configuration
 * @param  {string}         experimentKey   Experiment key for which the status is to be determined
 * @return {boolean}                        True if the experiment is running
 *                                          False if the experiment is not running
 *
 */
export const isRunning = function(projectConfig: ProjectConfig, experimentKey: string): boolean {
  return getExperimentStatus(projectConfig, experimentKey) === EXPERIMENT_RUNNING_STATUS;
};

/**
 * Get audience conditions for the experiment
 * @param  {ProjectConfig}  projectConfig   Object representing project configuration
 * @param  {string}         experimentId    Experiment id for which audience conditions are to be determined
 * @return {Array<string|string[]>}         Audience conditions for the experiment - can be an array of audience IDs, or a
 *                                          nested array of conditions
 *                                          Examples: ["5", "6"], ["and", ["or", "1", "2"], "3"]
 * @throws If experiment key is not in datafile
 */
export const getExperimentAudienceConditions = function(
  projectConfig: ProjectConfig,
  experimentId: string
): Array<string | string[]> {
  const experiment = projectConfig.experimentIdMap[experimentId];
  if (!experiment) {
    throw new Error(sprintf(ERROR_MESSAGES.INVALID_EXPERIMENT_ID, MODULE_NAME, experimentId));
  }

  return experiment.audienceConditions || experiment.audienceIds;
};

/**
 * Get variation key given experiment key and variation ID
 * @param  {ProjectConfig}  projectConfig   Object representing project configuration
 * @param  {string}         variationId     ID of the variation
 * @return {string|null}    Variation key or null if the variation ID is not found
 */
export const getVariationKeyFromId = function(projectConfig: ProjectConfig, variationId: string): string | null {
  if (projectConfig.variationIdMap.hasOwnProperty(variationId)) {
    return projectConfig.variationIdMap[variationId].key;
  }

  return null;
};

/**
 * Get the variation ID given the experiment key and variation key
 * @param  {ProjectConfig}  projectConfig   Object representing project configuration
 * @param  {string}         experimentKey   Key of the experiment the variation belongs to
 * @param  {string}         variationKey    The variation key
 * @return {string|null}    Variation ID or null
 */
export const getVariationIdFromExperimentAndVariationKey = function(
  projectConfig: ProjectConfig,
  experimentKey: string,
  variationKey: string
): string | null {
  const experiment = projectConfig.experimentKeyMap[experimentKey];
  if (experiment.variationKeyMap.hasOwnProperty(variationKey)) {
    return experiment.variationKeyMap[variationKey].id;
  }

  return null;
};

/**
 * Get the variation ID given the experiment id and variation key
 * @param  {ProjectConfig}  projectConfig   Object representing project configuration
 * @param  {string}         experimentId    Id of the experiment the variation belongs to
 * @param  {string}         variationKey    The variation key
 * @return {string|null}    Variation ID or null
 */
export const getVariationIdFromExperimentIdAndVariationKey = function(
  projectConfig: ProjectConfig,
  experimentId: string,
  variationKey: string
): string | null {
  const experiment = projectConfig.experimentIdMap[experimentId];
  if (experiment.variationKeyMap.hasOwnProperty(variationKey)) {
    return experiment.variationKeyMap[variationKey].id;
  }

  return null;
};

/**
 * Get experiment from provided experiment key
 * @param  {ProjectConfig}  projectConfig  Object representing project configuration
 * @param  {string}         experimentKey  Event key for which experiment IDs are to be retrieved
 * @return {Experiment}     Experiment
 * @throws If experiment key is not in datafile
 */
export const getExperimentFromKey = function(projectConfig: ProjectConfig, experimentKey: string): Experiment {
  if (projectConfig.experimentKeyMap.hasOwnProperty(experimentKey)) {
    const experiment = projectConfig.experimentKeyMap[experimentKey];
    if (experiment) {
      return experiment;
    }
  }

  throw new Error(sprintf(ERROR_MESSAGES.EXPERIMENT_KEY_NOT_IN_DATAFILE, MODULE_NAME, experimentKey));
};

/**
 * Given an experiment id, returns the traffic allocation within that experiment
 * @param  {ProjectConfig}  projectConfig  Object representing project configuration
 * @param  {string}         experimentId   Id representing the experiment
 * @return {TrafficAllocation[]}           Traffic allocation for the experiment
 * @throws If experiment key is not in datafile
 */
export const getTrafficAllocation = function(projectConfig: ProjectConfig, experimentId: string): TrafficAllocation[] {
  const experiment = projectConfig.experimentIdMap[experimentId];
  if (!experiment) {
    throw new Error(sprintf(ERROR_MESSAGES.INVALID_EXPERIMENT_ID, MODULE_NAME, experimentId));
  }
  return experiment.trafficAllocation;
};

/**
 * Get experiment from provided experiment id. Log an error if no experiment
 * exists in the project config with the given ID.
 * @param  {ProjectConfig}  projectConfig  Object representing project configuration
 * @param  {string}         experimentId   ID of desired experiment object
 * @param  {LogHandler}     logger
 * @return {Experiment|null}               Experiment object or null
 */
export const getExperimentFromId = function(
  projectConfig: ProjectConfig,
  experimentId: string,
  logger: LogHandler
): Experiment | null {
  if (projectConfig.experimentIdMap.hasOwnProperty(experimentId)) {
    const experiment = projectConfig.experimentIdMap[experimentId];
    if (experiment) {
      return experiment;
    }
  }

  logger.log(LOG_LEVEL.ERROR, sprintf(ERROR_MESSAGES.INVALID_EXPERIMENT_ID, MODULE_NAME, experimentId));
  return null;
};

/**
 * Get feature from provided feature key. Log an error if no feature exists in
 * the project config with the given key.
 * @param  {ProjectConfig}    projectConfig
 * @param  {string}           featureKey
 * @param  {LogHandler}       logger
 * @return {FeatureFlag|null} Feature object, or null if no feature with the given
 *                            key exists
 */
export const getFeatureFromKey = function(
  projectConfig: ProjectConfig,
  featureKey: string,
  logger: LogHandler
): FeatureFlag | null {
  if (projectConfig.featureKeyMap.hasOwnProperty(featureKey)) {
    const feature = projectConfig.featureKeyMap[featureKey];
    if (feature) {
      return feature;
    }
  }

  logger.log(LOG_LEVEL.ERROR, sprintf(ERROR_MESSAGES.FEATURE_NOT_IN_DATAFILE, MODULE_NAME, featureKey));
  return null;
};

/**
 * Get the variable with the given key associated with the feature with the
 * given key. If the feature key or the variable key are invalid, log an error
 * message.
 * @param  {ProjectConfig}        projectConfig
 * @param  {string}               featureKey
 * @param  {string}               variableKey
 * @param  {LogHandler}           logger
 * @return {FeatureVariable|null} Variable object, or null one or both of the given
 * feature and variable keys are invalid
 */
export const getVariableForFeature = function(
  projectConfig: ProjectConfig,
  featureKey: string,
  variableKey: string,
  logger: LogHandler
): FeatureVariable | null {
  const feature = projectConfig.featureKeyMap[featureKey];
  if (!feature) {
    logger.log(LOG_LEVEL.ERROR, sprintf(ERROR_MESSAGES.FEATURE_NOT_IN_DATAFILE, MODULE_NAME, featureKey));
    return null;
  }

  const variable = feature.variableKeyMap[variableKey];
  if (!variable) {
    logger.log(
      LOG_LEVEL.ERROR,
      sprintf(ERROR_MESSAGES.VARIABLE_KEY_NOT_IN_DATAFILE, MODULE_NAME, variableKey, featureKey)
    );
    return null;
  }

  return variable;
};

/**
 * Get the value of the given variable for the given variation. If the given
 * variable has no value for the given variation, return null. Log an error message if the variation is invalid. If the
 * variable or variation are invalid, return null.
 * @param  {ProjectConfig}     projectConfig
 * @param  {FeatureVariable}   variable
 * @param  {Variation}         variation
 * @param  {LogHandler}        logger
 * @return {string|null}       The value of the given variable for the given
 * variation, or null if the given variable has no value
 * for the given variation or if the variation or variable are invalid
 */
export const getVariableValueForVariation = function(
  projectConfig: ProjectConfig,
  variable: FeatureVariable,
  variation: Variation,
  logger: LogHandler
): string | null {
  if (!variable || !variation) {
    return null;
  }

  if (!projectConfig.variationVariableUsageMap.hasOwnProperty(variation.id)) {
    logger.log(
      LOG_LEVEL.ERROR,
      sprintf(ERROR_MESSAGES.VARIATION_ID_NOT_IN_DATAFILE_NO_EXPERIMENT, MODULE_NAME, variation.id)
    );
    return null;
  }

  const variableUsages = projectConfig.variationVariableUsageMap[variation.id];
  const variableUsage = variableUsages[variable.id];

  return variableUsage ? variableUsage.value : null;
};

/**
 * Given a variable value in string form, try to cast it to the argument type.
 * If the type cast succeeds, return the type casted value, otherwise log an
 * error and return null.
 * @param {string}     variableValue  Variable value in string form
 * @param {string}     variableType   Type of the variable whose value was passed
 *                                    in the first argument. Must be one of
 *                                    FEATURE_VARIABLE_TYPES in
 *                                    lib/utils/enums/index.js. The return value's
 *                                    type is determined by this argument (boolean
 *                                    for BOOLEAN, number for INTEGER or DOUBLE,
 *                                    and string for STRING).
 * @param {LogHandler} logger         Logger instance
 * @returns {*}                       Variable value of the appropriate type, or
 *                                    null if the type cast failed
 */
export const getTypeCastValue = function(
  variableValue: string,
  variableType: VariableType,
  logger: LogHandler
): unknown {
  let castValue;

  switch (variableType) {
    case FEATURE_VARIABLE_TYPES.BOOLEAN:
      if (variableValue !== 'true' && variableValue !== 'false') {
        logger.log(
          LOG_LEVEL.ERROR,
          sprintf(ERROR_MESSAGES.UNABLE_TO_CAST_VALUE, MODULE_NAME, variableValue, variableType)
        );
        castValue = null;
      } else {
        castValue = variableValue === 'true';
      }
      break;

    case FEATURE_VARIABLE_TYPES.INTEGER:
      castValue = parseInt(variableValue, 10);
      if (isNaN(castValue)) {
        logger.log(
          LOG_LEVEL.ERROR,
          sprintf(ERROR_MESSAGES.UNABLE_TO_CAST_VALUE, MODULE_NAME, variableValue, variableType)
        );
        castValue = null;
      }
      break;

    case FEATURE_VARIABLE_TYPES.DOUBLE:
      castValue = parseFloat(variableValue);
      if (isNaN(castValue)) {
        logger.log(
          LOG_LEVEL.ERROR,
          sprintf(ERROR_MESSAGES.UNABLE_TO_CAST_VALUE, MODULE_NAME, variableValue, variableType)
        );
        castValue = null;
      }
      break;

    case FEATURE_VARIABLE_TYPES.JSON:
      try {
        castValue = JSON.parse(variableValue);
      } catch (e) {
        logger.log(
          LOG_LEVEL.ERROR,
          sprintf(ERROR_MESSAGES.UNABLE_TO_CAST_VALUE, MODULE_NAME, variableValue, variableType)
        );
        castValue = null;
      }
      break;

    default:
      // type is STRING
      castValue = variableValue;
      break;
  }

  return castValue;
};

/**
 * Returns an object containing all audiences in the project config. Keys are audience IDs
 * and values are audience objects.
 * @param   {ProjectConfig}     projectConfig
 * @returns {{ [id: string]: Audience }}
 */
export const getAudiencesById = function(projectConfig: ProjectConfig): { [id: string]: Audience } {
  return projectConfig.audiencesById;
};

/**
 * Returns true if an event with the given key exists in the datafile, and false otherwise
 * @param   {ProjectConfig}     projectConfig
 * @param   {string}            eventKey
 * @returns {boolean}
 */
export const eventWithKeyExists = function(projectConfig: ProjectConfig, eventKey: string): boolean {
  return projectConfig.eventKeyMap.hasOwnProperty(eventKey);
};

/**
 * Returns true if experiment belongs to any feature, false otherwise.
 * @param   {ProjectConfig}       projectConfig
 * @param   {string}              experimentId
 * @returns {boolean} 
 */
export const isFeatureExperiment = function(projectConfig: ProjectConfig, experimentId: string): boolean {
  return projectConfig.experimentFeatureMap.hasOwnProperty(experimentId);
};

/**
 * Returns the JSON string representation of the datafile
 * @param   {ProjectConfig}       projectConfig
 * @returns {string}
 */
export const toDatafile = function(projectConfig: ProjectConfig): string {
  return projectConfig.__datafileStr;
}

/**
 * @typedef   {Object}
 * @property  {Object|null} configObj
 * @property  {Error|null}  error
 */

/**
 * Try to create a project config object from the given datafile and
 * configuration properties.
 * Returns an object with configObj and error properties.
 * If successful, configObj is the project config object, and error is null.
 * Otherwise, configObj is null and error is an error with more information.
 * @param   {Object}         config
 * @param   {Object|string}  config.datafile
 * @param   {Object}         config.jsonSchemaValidator
 * @param   {Object}         config.logger
 * @returns {Object}         Object containing configObj and error properties
 */
export const tryCreatingProjectConfig = function(
  config: TryCreatingProjectConfigConfig
): { configObj: ProjectConfig | null; error: Error | null } {
  let newDatafileObj;
  try {
    newDatafileObj = configValidator.validateDatafile(config.datafile);
  } catch (error) {
    return { configObj: null, error };
  }

  if (config.jsonSchemaValidator) {
    try {
      config.jsonSchemaValidator.validate(newDatafileObj);
      config.logger.log(LOG_LEVEL.INFO, sprintf(LOG_MESSAGES.VALID_DATAFILE, MODULE_NAME));
    } catch (error) {
      return { configObj: null, error };
    }
  } else {
    config.logger.log(LOG_LEVEL.INFO, sprintf(LOG_MESSAGES.SKIPPING_JSON_VALIDATION, MODULE_NAME));
  }

  const createProjectConfigArgs = [newDatafileObj];
  if (typeof config.datafile === 'string') {
    // Since config.datafile was validated above, we know that it is a valid JSON string
    createProjectConfigArgs.push(config.datafile);
  }

  const newConfigObj = createProjectConfig(...createProjectConfigArgs);

  return {
    configObj: newConfigObj,
    error: null,
  };
};

/**
 * Get the send flag decisions value
 * @param  {ProjectConfig}   projectConfig
 * @return {boolean}         A boolean value that indicates if we should send flag decisions
 */
export const getSendFlagDecisionsValue = function(projectConfig: ProjectConfig): boolean {
  return !!projectConfig.sendFlagDecisions;
}

export default {
  createProjectConfig,
  getExperimentId,
  getLayerId,
  getAttributeId,
  getEventId,
  getExperimentStatus,
  isActive,
  isRunning,
  getExperimentAudienceConditions,
  getVariationKeyFromId,
  getVariationIdFromExperimentAndVariationKey,
  getVariationIdFromExperimentIdAndVariationKey,
  getExperimentFromKey,
  getTrafficAllocation,
  getExperimentFromId,
  getFeatureFromKey,
  getVariableForFeature,
  getVariableValueForVariation,
  getTypeCastValue,
  getSendFlagDecisionsValue,
  getAudiencesById,
  eventWithKeyExists,
  isFeatureExperiment,
  toDatafile,
  tryCreatingProjectConfig,
};
