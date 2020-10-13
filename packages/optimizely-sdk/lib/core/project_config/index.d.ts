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
import { LogHandler } from '@optimizely/js-sdk-logging';
import { FeatureFlag, FeatureVariable, Experiment, Variation  } from './entities';

export interface ProjectConfig {
  revision: string;
  projectId: string;
  sendFlagDecisions?: boolean;
  experimentKeyMap:{[key: string]: Experiment};
  featureKeyMap: {
    [key: string]: FeatureFlag
  };
}
/**
 * Determine for given experiment if event is running, which determines whether should be dispatched or not
 * @param  {ProjectConfig} configObj        Object representing project configuration
 * @param  {string}        experimentKey    Experiment key for which the status is to be determined
 * @return {boolean}                        True is the experiment is running
 *                                          False is the experiment is not running
 *
 */
export function isRunning(configObj: ProjectConfig, experimentKey: string): boolean;

/**
 * Get the variation ID given the experiment key and variation key
 * @param  {ProjectConfig} configObj        Object representing project configuration
 * @param  {string}        experimentKey    Key of the experiment the variation belongs to
 * @param  {string}        variationKey     The variation key
 * @return {string}                         the variation ID
 */
export function getVariationIdFromExperimentAndVariationKey(
  configObj: ProjectConfig,
  experimentKey: string,
  variationKey: string | null
): string;

/**
 * Get experiment ID for the provided experiment key
 * @param  {ProjectConfig} configObj        Object representing project configuration
 * @param  {string}        experimentKey    Experiment key for which ID is to be determined
 * @return {string}                         Experiment ID corresponding to the provided experiment key
 * @throws                                  If experiment key is not in datafile
 */
export function getExperimentId(configObj: ProjectConfig, experimentKey: string): string | never;

/**
 * Check if the event with a specific key is present in the datafile
 * @param   {ProjectConfig} configObj       Object representing project configuration
 * @param   {string}        eventKey        Event key for which event is to be determined
 * @returns {boolean}                       True if key exists in the datafile
 *                                          False if key does not exist in the datafile
 */
export function eventWithKeyExists(configObj: ProjectConfig, eventKey: string): boolean;

/**
 * Check if the experiment is belongs to any feature
 * @param   {ProjectConfig} configObj       Object representing project configuration
 * @param   {string}        experimentId    Experiment ID of an experiment
 * @returns {boolean}                       True if experiement belongs to any feature
 *                                          False if experiement does not belong to any feature
 */
export function isFeatureExperiment(configObj: ProjectConfig, experimentId: string): boolean;

/**
 * Get feature from provided feature key. Log an error if no feature exists in
 * the project config with the given key.
 * @param   {ProjectConfig} configObj       Object representing project configuration
 * @param   {string}        featureKey      Key of a feature for which feature is to be determined
 * @param   {LogHandler}    logger          Logger instance
 * @return  {FeatureFlag|null}              Feature object, or null if no feature with the given
 *                                          key exists
 */
export function getFeatureFromKey(configObj: ProjectConfig, featureKey: string, logger: LogHandler): FeatureFlag | null;

/**
 * Get the variable with the given key associated with the feature with the
 * given key. If the feature key or the variable key are invalid, log an error
 * message.
 * @param  {ProjectConfig}  configObj         Object representing project configuration
 * @param  {string}         featureKey        Key of a feature for which feature is to be determined
 * @param  {string}         variableKey       Key of a variable for which variable is to be determined
 * @param  {LogHandler}     logger            Logger instances
 * @return {FeatureVariable|null}             Variable object, or null one or both of the given
 *                                            feature and variable keys are invalid
 */
export function getVariableForFeature(configObj: ProjectConfig, featureKey: string, variableKey: string, logger: LogHandler): FeatureVariable | null;

/**
 * Given a variable value in string form, try to cast it to the argument type.
 * If the type cast succeeds, return the type casted value, otherwise log an
 * error and return null.
 * @param  {string}         variableValue     Variable value in string form
 * @param  {string}         type              Type of the variable whose value was passed
 *                                            in the first argument. Must be one of
 *                                            FEATURE_VARIABLE_TYPES in
 *                                            lib/utils/enums/index.js. The return value's
 *                                            type is determined by this argument (boolean
 *                                            for BOOLEAN, number for INTEGER or DOUBLE,
 *                                            and string for STRING).
 * @param   {LogHandler}    logger            Logger instance
 * @returns {unknown}                         Variable value of the appropriate type, or
 *                                            null if the type cast failed
 */
// TODO:[OASIS-7189] define type as enum
export function getTypeCastValue(variableValue: string, type: string, logger: LogHandler): unknown;

/**
 * Get the value of the given variable for the given variation. If the given
 * variable has no value for the given variation, return null. Log an error message if the variation is invalid. If the
 * variable or variation are invalid, return null.
 * @param  {ProjectConfig}   projectConfig
 * @param  {FeatureVariable} variable
 * @param  {Variation}       variation
 * @param  {LogHandler}      logger
 * @return {string|null}     The value of the given variable for the given
 *                           variation, or null if the given variable has no value
 *                           for the given variation or if the variation or variable are invalid
 */
export function getVariableValueForVariation(
  projectConfig: ProjectConfig,
  variable: FeatureVariable,
  variation: Variation,
  logger: LogHandler
): string | null;

/**
 * Get the send flag decisions value
 * @param  {ProjectConfig}   projectConfig
 * @return {boolean}         A boolean value that indicates if we should send flag decisions
 */
export function getSendFlagDecisionsValue(configObj: ProjectConfig): boolean;
