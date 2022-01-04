/****************************************************************************
 * Copyright 2020-2022, Optimizely, Inc. and contributors                   *
 *                                                                          *
 * Licensed under the Apache License, Version 2.0 (the "License");          *
 * you may not use this file except in compliance with the License.         *
 * You may obtain a copy of the License at                                  *
 *                                                                          *
 *    http://www.apache.org/licenses/LICENSE-2.0                            *
 *                                                                          *
 * Unless required by applicable law or agreed to in writing, software      *
 * distributed under the License is distributed on an "AS IS" BASIS,        *
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. *
 * See the License for the specific language governing permissions and      *
 * limitations under the License.                                           *
 ***************************************************************************/
import { find, sprintf, objectValues, NotificationCenter } from '@optimizely/js-sdk-utils';
import { LoggerFacade, ErrorHandler } from '@optimizely/js-sdk-logging';
import { EventProcessor } from '@optimizely/js-sdk-event-processor';

import {
  UserAttributes,
  EventTags,
  OptimizelyConfig,
  OnReadyResult,
  UserProfileService,
  Variation,
  FeatureFlag,
  FeatureVariable,
  OptimizelyVariation,
  OptimizelyOptions,
  OptimizelyDecideOption,
  OptimizelyDecision
} from '../shared_types';
import { newErrorDecision } from '../optimizely_decision';
import OptimizelyUserContext from '../optimizely_user_context';
import { createProjectConfigManager, ProjectConfigManager } from '../core/project_config/project_config_manager';
import { createDecisionService, DecisionService, DecisionObj } from '../core/decision_service';
import { getImpressionEvent, getConversionEvent } from '../core/event_builder';
import { buildImpressionEvent, buildConversionEvent } from '../core/event_builder/event_helpers';
import fns from '../utils/fns'
import { validate } from '../utils/attributes_validator';
import * as enums from '../utils/enums';
import * as eventTagsValidator from '../utils/event_tags_validator';
import * as projectConfig from '../core/project_config';
import * as userProfileServiceValidator from '../utils/user_profile_service_validator';
import * as stringValidator from '../utils/string_value_validator';
import * as decision from '../core/decision';
import {
  ERROR_MESSAGES,
  LOG_LEVEL,
  LOG_MESSAGES,
  DECISION_SOURCES,
  DECISION_MESSAGES,
  FEATURE_VARIABLE_TYPES,
  DECISION_NOTIFICATION_TYPES,
  NOTIFICATION_TYPES
} from '../utils/enums';

const MODULE_NAME = 'OPTIMIZELY';

const DEFAULT_ONREADY_TIMEOUT = 30000;

// TODO: Make feature_key, user_id, variable_key, experiment_key, event_key camelCase
type InputKey = 'feature_key' | 'user_id' | 'variable_key' | 'experiment_key' | 'event_key' | 'variation_id';

type StringInputs = Partial<Record<InputKey, unknown>>;

export default class Optimizely {
  private isOptimizelyConfigValid: boolean;
  private disposeOnUpdate: (() => void) | null;
  private readyPromise: Promise<{ success: boolean; reason?: string }>;
  // readyTimeout is specified as any to make this work in both browser & Node
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readyTimeouts: { [key: string]: { readyTimeout: any; onClose: () => void } };
  private nextReadyTimeoutId: number;
  private clientEngine: string;
  private clientVersion: string;
  private errorHandler: ErrorHandler;
  private logger: LoggerFacade;
  private projectConfigManager: ProjectConfigManager;
  private notificationCenter: NotificationCenter;
  private decisionService: DecisionService;
  private eventProcessor: EventProcessor;
  private defaultDecideOptions: { [key: string]: boolean };

  constructor(config: OptimizelyOptions) {
    let clientEngine = config.clientEngine;
    if (!clientEngine) {
      config.logger.log(
        LOG_LEVEL.INFO,
        LOG_MESSAGES.INVALID_CLIENT_ENGINE,
        MODULE_NAME,
        clientEngine,
      );
      clientEngine = enums.NODE_CLIENT_ENGINE;
    }

    this.clientEngine = clientEngine;
    this.clientVersion = config.clientVersion || enums.NODE_CLIENT_VERSION;
    this.errorHandler = config.errorHandler;
    this.isOptimizelyConfigValid = config.isValidInstance;
    this.logger = config.logger;

    let decideOptionsArray = config.defaultDecideOptions ?? [];
    if (!Array.isArray(decideOptionsArray)) {
      this.logger.log(LOG_LEVEL.DEBUG, LOG_MESSAGES.INVALID_DEFAULT_DECIDE_OPTIONS, MODULE_NAME);
      decideOptionsArray = [];
    }

    const defaultDecideOptions: { [key: string]: boolean } = {};
    decideOptionsArray.forEach((option) => {
      // Filter out all provided default decide options that are not in OptimizelyDecideOption[]
      if (OptimizelyDecideOption[option]) {
        defaultDecideOptions[option] = true;
      } else {
        this.logger.log(
          LOG_LEVEL.WARNING,
          LOG_MESSAGES.UNRECOGNIZED_DECIDE_OPTION,
          MODULE_NAME,
          option,
        );
      }
    });
    this.defaultDecideOptions = defaultDecideOptions;
    this.projectConfigManager = createProjectConfigManager({
      datafile: config.datafile,
      jsonSchemaValidator: config.jsonSchemaValidator,
      sdkKey: config.sdkKey,
      datafileManager: config.datafileManager
    });

    this.disposeOnUpdate = this.projectConfigManager.onUpdate(
      (configObj: projectConfig.ProjectConfig) => {
        this.logger.log(
          LOG_LEVEL.INFO,
          LOG_MESSAGES.UPDATED_OPTIMIZELY_CONFIG,
          MODULE_NAME,
          configObj.revision,
          configObj.projectId,
        );
        this.notificationCenter.sendNotifications(NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE);
      }
    );

    const projectConfigManagerReadyPromise = this.projectConfigManager.onReady();

    let userProfileService: UserProfileService | null = null;
    if (config.userProfileService) {
      try {
        if (userProfileServiceValidator.validate(config.userProfileService)) {
          userProfileService = config.userProfileService;
          this.logger.log(LOG_LEVEL.INFO, LOG_MESSAGES.VALID_USER_PROFILE_SERVICE, MODULE_NAME);
        }
      } catch (ex) {
        this.logger.log(LOG_LEVEL.WARNING, ex.message);
      }
    }

    this.decisionService = createDecisionService({
      userProfileService: userProfileService,
      logger: this.logger,
      UNSTABLE_conditionEvaluators: config.UNSTABLE_conditionEvaluators,
    });

    this.notificationCenter = config.notificationCenter;

    this.eventProcessor = config.eventProcessor;

    const eventProcessorStartedPromise = this.eventProcessor.start();

    this.readyPromise = Promise.all([projectConfigManagerReadyPromise, eventProcessorStartedPromise]).then(function(promiseResults) {
      // Only return status from project config promise because event processor promise does not return any status.
      return promiseResults[0];
    })

    this.readyTimeouts = {};
    this.nextReadyTimeoutId = 0;
  }

  /**
   * Returns a truthy value if this instance currently has a valid project config
   * object, and the initial configuration object that was passed into the
   * constructor was also valid.
   * @return {boolean}
   */
  isValidInstance(): boolean {
    return this.isOptimizelyConfigValid && !!this.projectConfigManager.getConfig();
  }

  /**
   * Buckets visitor and sends impression event to Optimizely.
   * @param  {string}             experimentKey
   * @param  {string}             userId
   * @param  {UserAttributes}     attributes
   * @return {string|null}        variation key
   */
  activate(experimentKey: string, userId: string, attributes?: UserAttributes): string | null {
    try {
      if (!this.isValidInstance()) {
        this.logger.log(LOG_LEVEL.ERROR, LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME, 'activate');
        return null;
      }

      if (!this.validateInputs({ experiment_key: experimentKey, user_id: userId }, attributes)) {
        return this.notActivatingExperiment(experimentKey, userId);
      }

      const configObj = this.projectConfigManager.getConfig();
      if (!configObj) {
        return null;
      }

      try {
        const variationKey = this.getVariation(experimentKey, userId, attributes);
        if (variationKey === null) {
          return this.notActivatingExperiment(experimentKey, userId);
        }

        // If experiment is not set to 'Running' status, log accordingly and return variation key
        if (!projectConfig.isRunning(configObj, experimentKey)) {
          this.logger.log(
            LOG_LEVEL.DEBUG,
            LOG_MESSAGES.SHOULD_NOT_DISPATCH_ACTIVATE,
            MODULE_NAME,
            experimentKey,
          );
          return variationKey;
        }

        const experiment = projectConfig.getExperimentFromKey(configObj, experimentKey);
        const variation = experiment.variationKeyMap[variationKey];
        const decisionObj = {
          experiment: experiment,
          variation: variation,
          decisionSource: enums.DECISION_SOURCES.EXPERIMENT
        }

        this.sendImpressionEvent(
          decisionObj,
          '',
          userId,
          true,
          attributes
        );
        return variationKey;
      } catch (ex) {
        this.logger.log(LOG_LEVEL.ERROR, ex.message);
        this.logger.log(
          LOG_LEVEL.INFO,
          LOG_MESSAGES.NOT_ACTIVATING_USER,
          MODULE_NAME,
          userId,
          experimentKey,
        );
        this.errorHandler.handleError(ex);
        return null;
      }
    } catch (e) {
      this.logger.log(LOG_LEVEL.ERROR, e.message);
      this.errorHandler.handleError(e);
      return null;
    }
  }

  /**
   * Create an impression event and call the event dispatcher's dispatch method to
   * send this event to Optimizely. Then use the notification center to trigger
   * any notification listeners for the ACTIVATE notification type.
   * @param {DecisionObj}    decisionObj    Decision Object
   * @param {string}         flagKey        Key for a feature flag
   * @param {string}         userId         ID of user to whom the variation was shown
   * @param {UserAttributes} attributes     Optional user attributes
   * @param {boolean}        enabled        Boolean representing if feature is enabled
   */
  private sendImpressionEvent(
    decisionObj: DecisionObj,
    flagKey: string,
    userId: string,
    enabled: boolean,
    attributes?: UserAttributes,
  ): void {
    const configObj = this.projectConfigManager.getConfig();
    if (!configObj) {
      return;
    }
    const impressionEvent = buildImpressionEvent({
      decisionObj: decisionObj,
      flagKey: flagKey,
      enabled: enabled,
      userId: userId,
      userAttributes: attributes,
      clientEngine: this.clientEngine,
      clientVersion: this.clientVersion,
      configObj: configObj,
    });
    // TODO is it okay to not pass a projectConfig as second argument
    this.eventProcessor.process(impressionEvent);
    this.emitNotificationCenterActivate(decisionObj, flagKey, userId, enabled, attributes);
  }

  /**
   * Emit the ACTIVATE notification on the notificationCenter
   * @param  {DecisionObj}    decisionObj    Decision object
   * @param  {string}         flagKey        Key for a feature flag
   * @param  {string}         userId         ID of user to whom the variation was shown
   * @param  {boolean}        enabled        Boolean representing if feature is enabled
   * @param  {UserAttributes} attributes     Optional user attributes
   */
  private emitNotificationCenterActivate(
    decisionObj: DecisionObj,
    flagKey: string,
    userId: string,
    enabled: boolean,
    attributes?: UserAttributes
  ): void {
    const configObj = this.projectConfigManager.getConfig();
    if (!configObj) {
      return;
    }

    const ruleType = decisionObj.decisionSource;
    const experimentKey = decision.getExperimentKey(decisionObj);
    const experimentId = decision.getExperimentId(decisionObj);
    const variationKey = decision.getVariationKey(decisionObj);
    const variationId = decision.getVariationId(decisionObj);

    let experiment;

    if (experimentId !== null && variationKey !== '') {
      experiment = configObj.experimentIdMap[experimentId];
    }

    const impressionEventOptions = {
      attributes: attributes,
      clientEngine: this.clientEngine,
      clientVersion: this.clientVersion,
      configObj: configObj,
      experimentId: experimentId,
      ruleKey: experimentKey,
      flagKey: flagKey,
      ruleType: ruleType,
      userId: userId,
      enabled: enabled,
      variationId: variationId,
      logger: this.logger,
    };
    const impressionEvent = getImpressionEvent(impressionEventOptions);
    let variation;
    if (experiment && experiment.variationKeyMap && variationKey !== '') {
      variation = experiment.variationKeyMap[variationKey];
    }
    this.notificationCenter.sendNotifications(NOTIFICATION_TYPES.ACTIVATE, {
      experiment: experiment,
      userId: userId,
      attributes: attributes,
      variation: variation,
      logEvent: impressionEvent,
    });
  }

  /**
   * Sends conversion event to Optimizely.
   * @param  {string}         eventKey
   * @param  {string}         userId
   * @param  {UserAttributes} attributes
   * @param  {EventTags}      eventTags Values associated with the event.
   */
  track(eventKey: string, userId: string, attributes?: UserAttributes, eventTags?: EventTags): void {
    try {
      if (!this.isValidInstance()) {
        this.logger.log(LOG_LEVEL.ERROR, LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME, 'track');
        return;
      }

      if (!this.validateInputs({ user_id: userId, event_key: eventKey }, attributes, eventTags)) {
        return;
      }

      const configObj = this.projectConfigManager.getConfig();
      if (!configObj) {
        return;
      }

      if (!projectConfig.eventWithKeyExists(configObj, eventKey)) {
        this.logger.log(
          LOG_LEVEL.WARNING,
          enums.LOG_MESSAGES.EVENT_KEY_NOT_FOUND,
          MODULE_NAME,
          eventKey,
        );
        this.logger.log(LOG_LEVEL.WARNING, LOG_MESSAGES.NOT_TRACKING_USER, MODULE_NAME, userId);
        return;
      }

      // remove null values from eventTags
      eventTags = this.filterEmptyValues(eventTags);
      const conversionEvent = buildConversionEvent({
        eventKey: eventKey,
        eventTags: eventTags,
        userId: userId,
        userAttributes: attributes,
        clientEngine: this.clientEngine,
        clientVersion: this.clientVersion,
        configObj: configObj,
      });
      this.logger.log(LOG_LEVEL.INFO, enums.LOG_MESSAGES.TRACK_EVENT, MODULE_NAME, eventKey, userId);
      // TODO is it okay to not pass a projectConfig as second argument
      this.eventProcessor.process(conversionEvent);
      this.emitNotificationCenterTrack(eventKey, userId, attributes, eventTags);
    } catch (e) {
      this.logger.log(LOG_LEVEL.ERROR, e.message);
      this.errorHandler.handleError(e);
      this.logger.log(LOG_LEVEL.ERROR, LOG_MESSAGES.NOT_TRACKING_USER, MODULE_NAME, userId);
    }
  }
  /**
   * Send TRACK event to notificationCenter
   * @param  {string}         eventKey
   * @param  {string}         userId
   * @param  {UserAttributes} attributes
   * @param  {EventTags}      eventTags Values associated with the event.
   */
  private emitNotificationCenterTrack(eventKey: string, userId: string, attributes?: UserAttributes, eventTags?: EventTags): void {
    try {
      const configObj = this.projectConfigManager.getConfig();
      if (!configObj) {
        return;
      }

      const conversionEventOptions = {
        attributes: attributes,
        clientEngine: this.clientEngine,
        clientVersion: this.clientVersion,
        configObj: configObj,
        eventKey: eventKey,
        eventTags: eventTags,
        logger: this.logger,
        userId: userId,
      };
      const conversionEvent = getConversionEvent(conversionEventOptions);

      this.notificationCenter.sendNotifications(NOTIFICATION_TYPES.TRACK, {
        eventKey: eventKey,
        userId: userId,
        attributes: attributes,
        eventTags: eventTags,
        logEvent: conversionEvent,
      });
    } catch (ex) {
      this.logger.log(LOG_LEVEL.ERROR, ex.message);
      this.errorHandler.handleError(ex);
    }
  }

  /**
   * Gets variation where visitor will be bucketed.
   * @param  {string}              experimentKey
   * @param  {string}              userId
   * @param  {UserAttributes}      attributes
   * @return {string|null}         variation key
   */
  getVariation(experimentKey: string, userId: string, attributes?: UserAttributes): string | null {
    try {
      if (!this.isValidInstance()) {
        this.logger.log(LOG_LEVEL.ERROR, LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME, 'getVariation');
        return null;
      }

      try {
        if (!this.validateInputs({ experiment_key: experimentKey, user_id: userId }, attributes)) {
          return null;
        }

        const configObj = this.projectConfigManager.getConfig();
        if (!configObj) {
          return null;
        }

        const experiment = configObj.experimentKeyMap[experimentKey];
        if (!experiment) {
          this.logger.log(
            LOG_LEVEL.DEBUG,
            ERROR_MESSAGES.INVALID_EXPERIMENT_KEY,
            MODULE_NAME,
            experimentKey,
          );
          return null;
        }

        const variationKey = this.decisionService.getVariation(
          configObj,
          experiment,
          this.createUserContext(userId, attributes) as OptimizelyUserContext
        ).result;
        const decisionNotificationType = projectConfig.isFeatureExperiment(configObj, experiment.id)
          ? DECISION_NOTIFICATION_TYPES.FEATURE_TEST
          : DECISION_NOTIFICATION_TYPES.AB_TEST;

        this.notificationCenter.sendNotifications(NOTIFICATION_TYPES.DECISION, {
          type: decisionNotificationType,
          userId: userId,
          attributes: attributes || {},
          decisionInfo: {
            experimentKey: experimentKey,
            variationKey: variationKey,
          },
        });

        return variationKey;
      } catch (ex) {
        this.logger.log(LOG_LEVEL.ERROR, ex.message);
        this.errorHandler.handleError(ex);
        return null;
      }
    } catch (e) {
      this.logger.log(LOG_LEVEL.ERROR, e.message);
      this.errorHandler.handleError(e);
      return null;
    }
  }

  /**
   * Force a user into a variation for a given experiment.
   * @param  {string}      experimentKey
   * @param  {string}      userId
   * @param  {string|null} variationKey   user will be forced into. If null,
   *                                      then clear the existing experiment-to-variation mapping.
   * @return {boolean}                    A boolean value that indicates if the set completed successfully.
   */
  setForcedVariation(experimentKey: string, userId: string, variationKey: string | null): boolean {
    if (!this.validateInputs({ experiment_key: experimentKey, user_id: userId })) {
      return false;
    }

    const configObj = this.projectConfigManager.getConfig();
    if (!configObj) {
      return false;
    }

    try {
      return this.decisionService.setForcedVariation(configObj, experimentKey, userId, variationKey);
    } catch (ex) {
      this.logger.log(LOG_LEVEL.ERROR, ex.message);
      this.errorHandler.handleError(ex);
      return false;
    }
  }

  /**
   * Gets the forced variation for a given user and experiment.
   * @param  {string}      experimentKey
   * @param  {string}      userId
   * @return {string|null} The forced variation key.
   */
  getForcedVariation(experimentKey: string, userId: string): string | null {
    if (!this.validateInputs({ experiment_key: experimentKey, user_id: userId })) {
      return null;
    }

    const configObj = this.projectConfigManager.getConfig();
    if (!configObj) {
      return null;
    }

    try {
      return this.decisionService.getForcedVariation(configObj, experimentKey, userId).result;
    } catch (ex) {
      this.logger.log(LOG_LEVEL.ERROR, ex.message);
      this.errorHandler.handleError(ex);
      return null;
    }
  }

  /**
   * Validate string inputs, user attributes and event tags.
   * @param  {StringInputs}  stringInputs   Map of string keys and associated values
   * @param  {unknown}       userAttributes Optional parameter for user's attributes
   * @param  {unknown}       eventTags      Optional parameter for event tags
   * @return {boolean}                      True if inputs are valid
   *
   */
  private validateInputs(
    stringInputs: StringInputs,
    userAttributes?: unknown,
    eventTags?: unknown
  ): boolean {
    try {
      if (stringInputs.hasOwnProperty('user_id')) {
        const userId = stringInputs['user_id'];
        if (typeof userId !== 'string' || userId === null || userId === 'undefined') {
          throw new Error(sprintf(ERROR_MESSAGES.INVALID_INPUT_FORMAT, MODULE_NAME, 'user_id'));
        }

        delete stringInputs['user_id'];
      }
      Object.keys(stringInputs).forEach(key => {
        if (!stringValidator.validate(stringInputs[key as InputKey])) {
          throw new Error(sprintf(ERROR_MESSAGES.INVALID_INPUT_FORMAT, MODULE_NAME, key));
        }
      })
      if (userAttributes) {
        validate(userAttributes);
      }
      if (eventTags) {
        eventTagsValidator.validate(eventTags);
      }
      return true;

    } catch (ex) {
      this.logger.log(LOG_LEVEL.ERROR, ex.message);
      this.errorHandler.handleError(ex);
      return false;
    }

  }

  /**
   * Shows failed activation log message and returns null when user is not activated in experiment
   * @param  {string} experimentKey
   * @param  {string} userId
   * @return {null}
   */
  private notActivatingExperiment(experimentKey: string, userId: string): null {
    this.logger.log(
      LOG_LEVEL.INFO,
      LOG_MESSAGES.NOT_ACTIVATING_USER,
      MODULE_NAME,
      userId,
      experimentKey,
    );
    return null;
  }

  /**
   * Filters out attributes/eventTags with null or undefined values
   * @param   {EventTags | undefined} map
   * @returns {EventTags | undefined}
   */
  private filterEmptyValues(map: EventTags | undefined): EventTags | undefined {
    for (const key in map) {
      if (map.hasOwnProperty(key) && (map[key] === null || map[key] === undefined)) {
        delete map[key];
      }
    }
    return map;
  }

  /**
   * Returns true if the feature is enabled for the given user.
   * @param  {string}         featureKey   Key of feature which will be checked
   * @param  {string}         userId       ID of user which will be checked
   * @param  {UserAttributes} attributes   Optional user attributes
   * @return {boolean}                     true if the feature is enabled for the user, false otherwise
   */
  isFeatureEnabled(featureKey: string, userId: string, attributes?: UserAttributes): boolean {
    try {
      if (!this.isValidInstance()) {
        this.logger.log(
          LOG_LEVEL.ERROR,
          LOG_MESSAGES.INVALID_OBJECT,
          MODULE_NAME,
          'isFeatureEnabled',
        );
        return false;
      }

      if (!this.validateInputs({ feature_key: featureKey, user_id: userId }, attributes)) {
        return false;
      }

      const configObj = this.projectConfigManager.getConfig();
      if (!configObj) {
        return false;
      }

      const feature = projectConfig.getFeatureFromKey(configObj, featureKey, this.logger);
      if (!feature) {
        return false;
      }

      let sourceInfo = {};
      const user = this.createUserContext(userId, attributes) as OptimizelyUserContext;
      const decisionObj = this.decisionService.getVariationForFeature(configObj, feature, user).result;
      const decisionSource = decisionObj.decisionSource;
      const experimentKey = decision.getExperimentKey(decisionObj);
      const variationKey = decision.getVariationKey(decisionObj);

      let featureEnabled = decision.getFeatureEnabledFromVariation(decisionObj);

      if (decisionSource === DECISION_SOURCES.FEATURE_TEST) {
        sourceInfo = {
          experimentKey: experimentKey,
          variationKey: variationKey,
        };
      }

      if (
        decisionSource === DECISION_SOURCES.FEATURE_TEST ||
        decisionSource === DECISION_SOURCES.ROLLOUT && projectConfig.getSendFlagDecisionsValue(configObj)
      ) {
        this.sendImpressionEvent(
          decisionObj,
          feature.key,
          userId,
          featureEnabled,
          attributes
        );
      }

      if (featureEnabled === true) {
        this.logger.log(
          LOG_LEVEL.INFO,
          LOG_MESSAGES.FEATURE_ENABLED_FOR_USER,
          MODULE_NAME,
          featureKey,
          userId,
        );
      } else {
        this.logger.log(
          LOG_LEVEL.INFO,
          LOG_MESSAGES.FEATURE_NOT_ENABLED_FOR_USER,
          MODULE_NAME,
          featureKey,
          userId,
        );
        featureEnabled = false;
      }

      const featureInfo = {
        featureKey: featureKey,
        featureEnabled: featureEnabled,
        source: decisionObj.decisionSource,
        sourceInfo: sourceInfo,
      };

      this.notificationCenter.sendNotifications(NOTIFICATION_TYPES.DECISION, {
        type: DECISION_NOTIFICATION_TYPES.FEATURE,
        userId: userId,
        attributes: attributes || {},
        decisionInfo: featureInfo,
      });

      return featureEnabled;
    } catch (e) {
      this.logger.log(LOG_LEVEL.ERROR, e.message);
      this.errorHandler.handleError(e);
      return false;
    }
  }

  /**
   * Returns an Array containing the keys of all features in the project that are
   * enabled for the given user.
   * @param  {string}         userId
   * @param  {UserAttributes} attributes
   * @return {string[]}       Array of feature keys (strings)
   */
  getEnabledFeatures(userId: string, attributes?: UserAttributes): string[] {
    try {
      const enabledFeatures: string[] = [];
      if (!this.isValidInstance()) {
        this.logger.log(
          LOG_LEVEL.ERROR,
          LOG_MESSAGES.INVALID_OBJECT,
          MODULE_NAME,
          'getEnabledFeatures',
        );
        return enabledFeatures;
      }

      if (!this.validateInputs({ user_id: userId })) {
        return enabledFeatures;
      }

      const configObj = this.projectConfigManager.getConfig();
      if (!configObj) {
        return enabledFeatures;
      }

      objectValues(configObj.featureKeyMap).forEach(
        (feature: FeatureFlag) => {
          if (this.isFeatureEnabled(feature.key, userId, attributes)) {
            enabledFeatures.push(feature.key);
          }
        }
      );

      return enabledFeatures;
    } catch (e) {
      this.logger.log(LOG_LEVEL.ERROR, e.message);
      this.errorHandler.handleError(e);
      return [];
    }
  }

  /**
   * Returns dynamically-typed value of the variable attached to the given
   * feature flag. Returns null if the feature key or variable key is invalid.
   *
   * @param  {string}          featureKey           Key of the feature whose variable's
   *                                                value is being accessed
   * @param  {string}          variableKey          Key of the variable whose value is
   *                                                being accessed
   * @param  {string}          userId               ID for the user
   * @param  {UserAttributes}  attributes           Optional user attributes
   * @return {unknown}                              Value of the variable cast to the appropriate
   *                                                type, or null if the feature key is invalid or
   *                                                the variable key is invalid
   */
  getFeatureVariable(
    featureKey: string,
    variableKey: string,
    userId: string,
    attributes?: UserAttributes
  ): unknown {
    try {
      if (!this.isValidInstance()) {
        this.logger.log(LOG_LEVEL.ERROR, LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME, 'getFeatureVariable');
        return null;
      }
      return this.getFeatureVariableForType(featureKey, variableKey, null, userId, attributes);
    } catch (e) {
      this.logger.log(LOG_LEVEL.ERROR, e.message);
      this.errorHandler.handleError(e);
      return null;
    }
  }

  /**
   * Helper method to get the value for a variable of a certain type attached to a
   * feature flag. Returns null if the feature key is invalid, the variable key is
   * invalid, the given variable type does not match the variable's actual type,
   * or the variable value cannot be cast to the required type. If the given variable
   * type is null, the value of the variable cast to the appropriate type is returned.
   *
   * @param   {string}         featureKey           Key of the feature whose variable's value is
   *                                                being accessed
   * @param   {string}         variableKey          Key of the variable whose value is being
   *                                                accessed
   * @param   {string|null}    variableType         Type of the variable whose value is being
   *                                                accessed (must be one of FEATURE_VARIABLE_TYPES
   *                                                in lib/utils/enums/index.js), or null to return the
   *                                                value of the variable cast to the appropriate type
   * @param   {string}         userId               ID for the user
   * @param   {UserAttributes} attributes           Optional user attributes
   * @return  {unknown}                             Value of the variable cast to the appropriate
   *                                                type, or null if the feature key is invalid, thevariable
   *                                                key is invalid, or there is a mismatch with the type of
   *                                                the variable
   */
  private getFeatureVariableForType(
    featureKey: string,
    variableKey: string,
    variableType: string | null,
    userId: string,
    attributes?: UserAttributes): unknown {
    if (!this.validateInputs({ feature_key: featureKey, variable_key: variableKey, user_id: userId }, attributes)) {
      return null;
    }

    const configObj = this.projectConfigManager.getConfig();
    if (!configObj) {
      return null;
    }

    const featureFlag = projectConfig.getFeatureFromKey(configObj, featureKey, this.logger);
    if (!featureFlag) {
      return null;
    }

    const variable = projectConfig.getVariableForFeature(configObj, featureKey, variableKey, this.logger);
    if (!variable) {
      return null;
    }

    if (variableType && variable.type !== variableType) {
      this.logger.log(
        LOG_LEVEL.WARNING,
        LOG_MESSAGES.VARIABLE_REQUESTED_WITH_WRONG_TYPE,
        MODULE_NAME,
        variableType,
        variable.type,
      );
      return null;
    }

    const user = this.createUserContext(userId, attributes) as OptimizelyUserContext;
    const decisionObj = this.decisionService.getVariationForFeature(configObj, featureFlag, user).result;
    const featureEnabled = decision.getFeatureEnabledFromVariation(decisionObj);
    const variableValue = this.getFeatureVariableValueFromVariation(featureKey, featureEnabled, decisionObj.variation, variable, userId);
    let sourceInfo = {};
    if (
      decisionObj.decisionSource === DECISION_SOURCES.FEATURE_TEST &&
      decisionObj.experiment !== null &&
      decisionObj.variation !== null
    ) {
      sourceInfo = {
        experimentKey: decisionObj.experiment.key,
        variationKey: decisionObj.variation.key,
      };
    }

    this.notificationCenter.sendNotifications(NOTIFICATION_TYPES.DECISION, {
      type: DECISION_NOTIFICATION_TYPES.FEATURE_VARIABLE,
      userId: userId,
      attributes: attributes || {},
      decisionInfo: {
        featureKey: featureKey,
        featureEnabled: featureEnabled,
        source: decisionObj.decisionSource,
        variableKey: variableKey,
        variableValue: variableValue,
        variableType: variable.type,
        sourceInfo: sourceInfo,
      },
    });
    return variableValue;
  }

  /**
   * Helper method to get the non type-casted value for a variable attached to a
   * feature flag. Returns appropriate variable value depending on whether there
   * was a matching variation, feature was enabled or not or varible was part of the
   * available variation or not. Also logs the appropriate message explaining how it
   * evaluated the value of the variable.
   *
   * @param  {string}          featureKey           Key of the feature whose variable's value is
   *                                                being accessed
   * @param  {boolean}         featureEnabled       Boolean indicating if feature is enabled or not
   * @param  {Variation}       variation            variation returned by decision service
   * @param  {FeatureVariable} variable             varible whose value is being evaluated
   * @param  {string}          userId               ID for the user
   * @return {unknown}                              Value of the variable or null if the
   *                                                config Obj is null
   */
  private getFeatureVariableValueFromVariation(
    featureKey: string,
    featureEnabled: boolean,
    variation: Variation | null,
    variable: FeatureVariable,
    userId: string
  ): unknown {
    const configObj = this.projectConfigManager.getConfig();
    if (!configObj) {
      return null;
    }

    let variableValue = variable.defaultValue;
    if (variation !== null) {
      const value = projectConfig.getVariableValueForVariation(configObj, variable, variation, this.logger);
      if (value !== null) {
        if (featureEnabled) {
          variableValue = value;
          this.logger.log(
            LOG_LEVEL.INFO,
            LOG_MESSAGES.USER_RECEIVED_VARIABLE_VALUE,
            MODULE_NAME,
            variableValue,
            variable.key,
            featureKey,
          );
        } else {
          this.logger.log(
            LOG_LEVEL.INFO,
            LOG_MESSAGES.FEATURE_NOT_ENABLED_RETURN_DEFAULT_VARIABLE_VALUE,
            MODULE_NAME,
            featureKey,
            userId,
            variableValue,
          );
        }
      } else {
        this.logger.log(
          LOG_LEVEL.INFO,
          LOG_MESSAGES.VARIABLE_NOT_USED_RETURN_DEFAULT_VARIABLE_VALUE,
          MODULE_NAME,
          variable.key,
          variation.key,
        );
      }
    } else {
      this.logger.log(
        LOG_LEVEL.INFO,
        LOG_MESSAGES.USER_RECEIVED_DEFAULT_VARIABLE_VALUE,
        MODULE_NAME,
        userId,
        variable.key,
        featureKey,
      );
    }

    return projectConfig.getTypeCastValue(variableValue, variable.type, this.logger);
  }

  /**
   * Returns value for the given boolean variable attached to the given feature
   * flag.
   * @param  {string}         featureKey   Key of the feature whose variable's value is
   *                                       being accessed
   * @param  {string}         variableKey  Key of the variable whose value is being
   *                                       accessed
   * @param  {string}         userId       ID for the user
   * @param  {UserAttributes} attributes   Optional user attributes
   * @return {boolean|null}                Boolean value of the variable, or null if the
   *                                       feature key is invalid, the variable key is invalid,
   *                                       or there is a mismatch with the type of the variable.
   */
  getFeatureVariableBoolean(
    featureKey: string,
    variableKey: string,
    userId: string,
    attributes?: UserAttributes
  ): boolean | null {
    try {
      if (!this.isValidInstance()) {
        this.logger.log(LOG_LEVEL.ERROR, LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME, 'getFeatureVariableBoolean');
        return null;
      }
      return this.getFeatureVariableForType(featureKey, variableKey, FEATURE_VARIABLE_TYPES.BOOLEAN, userId, attributes) as boolean | null;
    } catch (e) {
      this.logger.log(LOG_LEVEL.ERROR, e.message);
      this.errorHandler.handleError(e);
      return null;
    }
  }

  /**
   * Returns value for the given double variable attached to the given feature
   * flag.
   * @param  {string} featureKey           Key of the feature whose variable's value is
   *                                       being accessed
   * @param  {string} variableKey          Key of the variable whose value is being
   *                                       accessed
   * @param  {string} userId               ID for the user
   * @param  {UserAttributes} attributes   Optional user attributes
   * @return {number|null}                 Number value of the variable, or null if the
   *                                       feature key is invalid, the variable key is
   *                                       invalid, or there is a mismatch with the type
   *                                       of the variable
   */
  getFeatureVariableDouble(
    featureKey: string,
    variableKey: string,
    userId: string,
    attributes?: UserAttributes
  ): number | null {
    try {
      if (!this.isValidInstance()) {
        this.logger.log(LOG_LEVEL.ERROR, LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME, 'getFeatureVariableDouble');
        return null;
      }
      return this.getFeatureVariableForType(featureKey, variableKey, FEATURE_VARIABLE_TYPES.DOUBLE, userId, attributes) as number | null;
    } catch (e) {
      this.logger.log(LOG_LEVEL.ERROR, e.message);
      this.errorHandler.handleError(e);
      return null;
    }
  }

  /**
   * Returns value for the given integer variable attached to the given feature
   * flag.
   * @param  {string}         featureKey   Key of the feature whose variable's value is
   *                                       being accessed
   * @param  {string}         variableKey  Key of the variable whose value is being
   *                                       accessed
   * @param  {string}         userId       ID for the user
   * @param  {UserAttributes} attributes   Optional user attributes
   * @return {number|null}                 Number value of the variable, or null if the
   *                                       feature key is invalid, the variable key is
   *                                       invalid, or there is a mismatch with the type
   *                                       of the variable
   */
  getFeatureVariableInteger(
    featureKey: string,
    variableKey: string,
    userId: string,
    attributes?: UserAttributes
  ): number | null {
    try {
      if (!this.isValidInstance()) {
        this.logger.log(LOG_LEVEL.ERROR, LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME, 'getFeatureVariableInteger');
        return null;
      }
      return this.getFeatureVariableForType(featureKey, variableKey, FEATURE_VARIABLE_TYPES.INTEGER, userId, attributes) as number | null;
    } catch (e) {
      this.logger.log(LOG_LEVEL.ERROR, e.message);
      this.errorHandler.handleError(e);
      return null;
    }
  }

  /**
   * Returns value for the given string variable attached to the given feature
   * flag.
   * @param  {string}         featureKey   Key of the feature whose variable's value is
   *                                       being accessed
   * @param  {string}         variableKey  Key of the variable whose value is being
   *                                       accessed
   * @param  {string}         userId       ID for the user
   * @param  {UserAttributes} attributes   Optional user attributes
   * @return {string|null}                 String value of the variable, or null if the
   *                                       feature key is invalid, the variable key is
   *                                       invalid, or there is a mismatch with the type
   *                                       of the variable
   */
  getFeatureVariableString(
    featureKey: string,
    variableKey: string,
    userId: string,
    attributes?: UserAttributes
  ): string | null {
    try {
      if (!this.isValidInstance()) {
        this.logger.log(LOG_LEVEL.ERROR, LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME, 'getFeatureVariableString');
        return null;
      }
      return this.getFeatureVariableForType(featureKey, variableKey, FEATURE_VARIABLE_TYPES.STRING, userId, attributes) as string | null;
    } catch (e) {
      this.logger.log(LOG_LEVEL.ERROR, e.message);
      this.errorHandler.handleError(e);
      return null;
    }
  }

  /**
   * Returns value for the given json variable attached to the given feature
   * flag.
   * @param  {string}         featureKey   Key of the feature whose variable's value is
   *                                       being accessed
   * @param  {string}         variableKey  Key of the variable whose value is being
   *                                       accessed
   * @param  {string}         userId       ID for the user
   * @param  {UserAttributes} attributes   Optional user attributes
   * @return {unknown}                     Object value of the variable, or null if the
   *                                       feature key is invalid, the variable key is
   *                                       invalid, or there is a mismatch with the type
   *                                       of the variable
   */
  getFeatureVariableJSON(
    featureKey: string,
    variableKey: string,
    userId: string,
    attributes: UserAttributes
  ): unknown {
    try {
      if (!this.isValidInstance()) {
        this.logger.log(LOG_LEVEL.ERROR, LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME, 'getFeatureVariableJSON');
        return null;
      }
      return this.getFeatureVariableForType(featureKey, variableKey, FEATURE_VARIABLE_TYPES.JSON, userId, attributes);
    } catch (e) {
      this.logger.log(LOG_LEVEL.ERROR, e.message);
      this.errorHandler.handleError(e);
      return null;
    }
  }

  /**
   * Returns values for all the variables attached to the given feature
   * flag.
   * @param  {string}         featureKey   Key of the feature whose variables are being
   *                                       accessed
   * @param  {string}         userId       ID for the user
   * @param  {UserAttributes} attributes   Optional user attributes
   * @return {object|null}                 Object containing all the variables, or null if the
   *                                       feature key is invalid
   */
  getAllFeatureVariables(
    featureKey: string,
    userId: string,
    attributes?: UserAttributes
  ): { [variableKey: string]: unknown } | null {
    try {
      if (!this.isValidInstance()) {
        this.logger.log(LOG_LEVEL.ERROR, LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME, 'getAllFeatureVariables');
        return null;
      }

      if (!this.validateInputs({ feature_key: featureKey, user_id: userId }, attributes)) {
        return null;
      }

      const configObj = this.projectConfigManager.getConfig();
      if (!configObj) {
        return null;
      }

      const featureFlag = projectConfig.getFeatureFromKey(configObj, featureKey, this.logger);
      if (!featureFlag) {
        return null;
      }

      const user = this.createUserContext(userId, attributes) as OptimizelyUserContext;

      const decisionObj = this.decisionService.getVariationForFeature(configObj, featureFlag, user).result;
      const featureEnabled = decision.getFeatureEnabledFromVariation(decisionObj);
      const allVariables: { [variableKey: string]: unknown } = {};

      featureFlag.variables.forEach((variable: FeatureVariable) => {
        allVariables[variable.key] = this.getFeatureVariableValueFromVariation(featureKey, featureEnabled, decisionObj.variation, variable, userId);
      });

      let sourceInfo = {};
      if (decisionObj.decisionSource === DECISION_SOURCES.FEATURE_TEST &&
        decisionObj.experiment !== null &&
        decisionObj.variation !== null
      ) {
        sourceInfo = {
          experimentKey: decisionObj.experiment.key,
          variationKey: decisionObj.variation.key,
        };
      }
      this.notificationCenter.sendNotifications(NOTIFICATION_TYPES.DECISION, {
        type: DECISION_NOTIFICATION_TYPES.ALL_FEATURE_VARIABLES,
        userId: userId,
        attributes: attributes || {},
        decisionInfo: {
          featureKey: featureKey,
          featureEnabled: featureEnabled,
          source: decisionObj.decisionSource,
          variableValues: allVariables,
          sourceInfo: sourceInfo,
        },
      });

      return allVariables;
    } catch (e) {
      this.logger.log(LOG_LEVEL.ERROR, e.message);
      this.errorHandler.handleError(e);
      return null;
    }
  }

  /**
   * Returns OptimizelyConfig object containing experiments and features data
   * @return {OptimizelyConfig|null}
   *
   * OptimizelyConfig Object Schema
   * {
   *   'experimentsMap': {
   *     'my-fist-experiment': {
   *       'id': '111111',
   *       'key': 'my-fist-experiment'
   *       'variationsMap': {
   *         'variation_1': {
   *           'id': '121212',
   *           'key': 'variation_1',
   *           'variablesMap': {
   *             'age': {
   *               'id': '222222',
   *               'key': 'age',
   *               'type': 'integer',
   *               'value': '0',
   *             }
   *           }
   *         }
   *       }
   *     }
   *   },
   *   'featuresMap': {
   *     'awesome-feature': {
   *       'id': '333333',
   *       'key': 'awesome-feature',
   *       'experimentsMap': Object,
   *       'variationsMap': Object,
   *     }
   *   }
   * }
   */
  getOptimizelyConfig(): OptimizelyConfig | null {
    try {
      const configObj = this.projectConfigManager.getConfig();
      if (!configObj) {
        return null;
      }
      return this.projectConfigManager.getOptimizelyConfig();
    } catch (e) {
      this.logger.log(LOG_LEVEL.ERROR, e.message);
      this.errorHandler.handleError(e);
      return null;
    }
  }

  /**
   * Stop background processes belonging to this instance, including:
   *
   * - Active datafile requests
   * - Pending datafile requests
   * - Pending event queue flushes
   *
   * In-flight datafile requests will be aborted. Any events waiting to be sent
   * as part of a batched event request will be immediately flushed to the event
   * dispatcher.
   *
   * Returns a Promise that fulfills after all in-flight event dispatcher requests
   * (including any final request resulting from flushing the queue as described
   * above) are complete. If there are no in-flight event dispatcher requests and
   * no queued events waiting to be sent, returns an immediately-fulfilled Promise.
   *
   * Returned Promises are fulfilled with result objects containing these
   * properties:
   *    - success (boolean): true if the event dispatcher signaled completion of
   *                         all in-flight and final requests, or if there were no
   *                         queued events and no in-flight requests. false if an
   *                         unexpected error was encountered during the close
   *                         process.
   *    - reason (string=):  If success is false, this is a string property with
   *                         an explanatory message.
   *
   * NOTE: After close is called, this instance is no longer usable - any events
   * generated will no longer be sent to the event dispatcher.
   *
   * @return {Promise}
   */
  close(): Promise<{ success: boolean; reason?: string }> {
    try {
      const eventProcessorStoppedPromise = this.eventProcessor.stop();
      if (this.disposeOnUpdate) {
        this.disposeOnUpdate();
        this.disposeOnUpdate = null;
      }
      if (this.projectConfigManager) {
        this.projectConfigManager.stop();
      }
      Object.keys(this.readyTimeouts).forEach(
        (readyTimeoutId: string) => {
          const readyTimeoutRecord = this.readyTimeouts[readyTimeoutId];
          clearTimeout(readyTimeoutRecord.readyTimeout);
          readyTimeoutRecord.onClose();
        }
      );
      this.readyTimeouts = {};
      return eventProcessorStoppedPromise.then(
        function() {
          return {
            success: true,
          };
        },
        function(err) {
          return {
            success: false,
            reason: String(err),
          };
        }
      );
    } catch (err) {
      this.logger.log(LOG_LEVEL.ERROR, err.message);
      this.errorHandler.handleError(err);
      return Promise.resolve({
        success: false,
        reason: String(err),
      });
    }
  }

  /**
   * Returns a Promise that fulfills when this instance is ready to use (meaning
   * it has a valid datafile), or has failed to become ready within a period of
   * time (configurable by the timeout property of the options argument), or when
   * this instance is closed via the close method.
   *
   * If a valid datafile was provided in the constructor, the returned Promise is
   * immediately fulfilled. If an sdkKey was provided, a manager will be used to
   * fetch  a datafile, and the returned promise will fulfill if that fetch
   * succeeds or fails before the timeout. The default timeout is 30 seconds,
   * which will be used if no timeout is provided in the argument options object.
   *
   * The returned Promise is fulfilled with a result object containing these
   * properties:
   *    - success (boolean): True if this instance is ready to use with a valid
   *                         datafile, or false if this instance failed to become
   *                         ready or was closed prior to becoming ready.
   *    - reason (string=):  If success is false, this is a string property with
   *                         an explanatory message. Failure could be due to
   *                         expiration of the timeout, network errors,
   *                         unsuccessful responses, datafile parse errors,
   *                         datafile validation errors, or the instance being
   *                         closed
   * @param  {Object=}          options
   * @param  {number|undefined} options.timeout
   * @return {Promise}
   */
  onReady(options?: { timeout?: number }): Promise<OnReadyResult> {
    let timeoutValue: number | undefined;
    if (typeof options === 'object' && options !== null) {
      if (options.timeout !== undefined) {
        timeoutValue = options.timeout;
      }
    }
    if (!fns.isSafeInteger(timeoutValue)) {
      timeoutValue = DEFAULT_ONREADY_TIMEOUT;
    }

    let resolveTimeoutPromise: (value: OnReadyResult) => void;
    const timeoutPromise = new Promise<OnReadyResult>(
      (resolve) => {
        resolveTimeoutPromise = resolve;
      }
    );

    const timeoutId = this.nextReadyTimeoutId;
    this.nextReadyTimeoutId++;

    const onReadyTimeout = (() => {
      delete this.readyTimeouts[timeoutId];
      resolveTimeoutPromise({
        success: false,
        reason: sprintf('onReady timeout expired after %s ms', timeoutValue),
      });
    });
    const readyTimeout = setTimeout(onReadyTimeout, timeoutValue);
    const onClose = function() {
      resolveTimeoutPromise({
        success: false,
        reason: 'Instance closed',
      });
    };

    this.readyTimeouts[timeoutId] = {
      readyTimeout: readyTimeout,
      onClose: onClose,
    };

    this.readyPromise.then(() => {
      clearTimeout(readyTimeout);
      delete this.readyTimeouts[timeoutId];
      resolveTimeoutPromise({
        success: true,
      });
    });

    return Promise.race([this.readyPromise, timeoutPromise]);
  }

  //============ decide ============//

  /**
   * Creates a context of the user for which decision APIs will be called.
   *
   * A user context will be created successfully even when the SDK is not fully configured yet, so no
   * this.isValidInstance() check is performed here.
   *
   * @param  {string}          userId      The user ID to be used for bucketing.
   * @param  {UserAttributes}  attributes  Optional user attributes.
   * @return {OptimizelyUserContext|null}  An OptimizelyUserContext associated with this OptimizelyClient or
   *                                       null if provided inputs are invalid
   */
  createUserContext(userId: string, attributes?: UserAttributes): OptimizelyUserContext | null {
    if (!this.validateInputs({ user_id: userId }, attributes)) {
      return null;
    }

    return new OptimizelyUserContext({
      optimizely: this,
      userId,
      attributes
    });
  }

  decide(
    user: OptimizelyUserContext,
    key: string,
    options: OptimizelyDecideOption[] = []
  ): OptimizelyDecision {
    const userId = user.getUserId();
    const attributes = user.getAttributes();
    const configObj = this.projectConfigManager.getConfig();
    const reasons: (string | number)[][] = [];
    let decisionObj: DecisionObj;
    if (!this.isValidInstance() || !configObj) {
      this.logger.log(LOG_LEVEL.INFO, LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME, 'decide');
      return newErrorDecision(key, user, [DECISION_MESSAGES.SDK_NOT_READY]);
    }

    const feature = configObj.featureKeyMap[key];
    if (!feature) {
      this.logger.log(LOG_LEVEL.ERROR, ERROR_MESSAGES.FEATURE_NOT_IN_DATAFILE, MODULE_NAME, key);
      return newErrorDecision(key, user, [sprintf(DECISION_MESSAGES.FLAG_KEY_INVALID, key)]);
    }

    const allDecideOptions = this.getAllDecideOptions(options);

    const forcedDecisionResponse = this.decisionService.findValidatedForcedDecision(configObj, user, key);
    reasons.push(...forcedDecisionResponse.reasons);
    const variation = forcedDecisionResponse.result;
    if (variation) {
      decisionObj = {
        experiment: null,
        variation: variation,
        decisionSource: DECISION_SOURCES.FEATURE_TEST
      }
    } else {
      const decisionVariation = this.decisionService.getVariationForFeature(
        configObj,
        feature,
        user,
        allDecideOptions,
      );
      reasons.push(...decisionVariation.reasons);
      decisionObj = decisionVariation.result;
    }
    const decisionSource = decisionObj.decisionSource;
    const experimentKey = decisionObj.experiment?.key ?? null;
    const variationKey = decisionObj.variation?.key ?? null;
    const flagEnabled: boolean = decision.getFeatureEnabledFromVariation(decisionObj);
    if (flagEnabled === true) {
      this.logger.log(
        LOG_LEVEL.INFO,
        LOG_MESSAGES.FEATURE_ENABLED_FOR_USER,
        MODULE_NAME,
        key,
        userId,
      );
    } else {
      this.logger.log(
        LOG_LEVEL.INFO,
        LOG_MESSAGES.FEATURE_NOT_ENABLED_FOR_USER,
        MODULE_NAME,
        key,
        userId,
      );
    }

    const variablesMap: { [key: string]: unknown } = {};
    let decisionEventDispatched = false;

    if (!allDecideOptions[OptimizelyDecideOption.EXCLUDE_VARIABLES]) {
      feature.variables.forEach(variable => {
        variablesMap[variable.key] =
          this.getFeatureVariableValueFromVariation(
            key,
            flagEnabled,
            decisionObj.variation,
            variable,
            userId
          );
      });
    }

    if (
      !allDecideOptions[OptimizelyDecideOption.DISABLE_DECISION_EVENT] && (
        decisionSource === DECISION_SOURCES.FEATURE_TEST ||
        decisionSource === DECISION_SOURCES.ROLLOUT && projectConfig.getSendFlagDecisionsValue(configObj))
    ) {
      this.sendImpressionEvent(
        decisionObj,
        key,
        userId,
        flagEnabled,
        attributes
      )
      decisionEventDispatched = true;
    }

    const shouldIncludeReasons = allDecideOptions[OptimizelyDecideOption.INCLUDE_REASONS];

    let reportedReasons: string[] = [];
    if (shouldIncludeReasons) {
      reportedReasons = reasons.map((reason) => sprintf(reason[0] as string, ...reason.slice(1)));
    }

    const featureInfo = {
      flagKey: key,
      enabled: flagEnabled,
      variationKey: variationKey,
      ruleKey: experimentKey,
      variables: variablesMap,
      reasons: reportedReasons,
      decisionEventDispatched: decisionEventDispatched,
    };

    this.notificationCenter.sendNotifications(NOTIFICATION_TYPES.DECISION, {
      type: DECISION_NOTIFICATION_TYPES.FLAG,
      userId: userId,
      attributes: attributes,
      decisionInfo: featureInfo,
    });

    return {
      variationKey: variationKey,
      enabled: flagEnabled,
      variables: variablesMap,
      ruleKey: experimentKey,
      flagKey: key,
      userContext: user,
      reasons: reportedReasons,
    };
  }

  /**
   * Get all decide options.
   * @param  {OptimizelyDecideOption[]}          options   decide options
   * @return {[key: string]: boolean}             Map of all provided decide options including default decide options
   */
  private getAllDecideOptions(options: OptimizelyDecideOption[]): { [key: string]: boolean } {
    const allDecideOptions = { ...this.defaultDecideOptions };
    if (!Array.isArray(options)) {
      this.logger.log(LOG_LEVEL.DEBUG, LOG_MESSAGES.INVALID_DECIDE_OPTIONS, MODULE_NAME);
    } else {
      options.forEach((option) => {
        // Filter out all provided decide options that are not in OptimizelyDecideOption[]
        if (OptimizelyDecideOption[option]) {
          allDecideOptions[option] = true;
        } else {
          this.logger.log(
            LOG_LEVEL.WARNING,
            LOG_MESSAGES.UNRECOGNIZED_DECIDE_OPTION,
            MODULE_NAME,
            option,
          );
        }
      });
    }

    return allDecideOptions;
  }

  /**
   * Returns an object of decision results for multiple flag keys and a user context.
   * If the SDK finds an error for a key, the response will include a decision for the key showing reasons for the error.
   * The SDK will always return an object of decisions. When it cannot process requests, it will return an empty object after logging the errors.
   * @param     {OptimizelyUserContext}      user        A user context associated with this OptimizelyClient
   * @param     {string[]}                   keys        An array of flag keys for which decisions will be made.
   * @param     {OptimizelyDecideOption[]}  options     An array of options for decision-making.
   * @return    {[key: string]: OptimizelyDecision}      An object of decision results mapped by flag keys.
   */
  decideForKeys(
    user: OptimizelyUserContext,
    keys: string[],
    options: OptimizelyDecideOption[] = []
  ): { [key: string]: OptimizelyDecision } {
    const decisionMap: { [key: string]: OptimizelyDecision } = {};
    if (!this.isValidInstance()) {
      this.logger.log(LOG_LEVEL.ERROR, LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME, 'decideForKeys');
      return decisionMap;
    }
    if (keys.length === 0) {
      return decisionMap;
    }

    const allDecideOptions = this.getAllDecideOptions(options);
    keys.forEach(key => {
      const optimizelyDecision: OptimizelyDecision = this.decide(user, key, options);
      if (!allDecideOptions[OptimizelyDecideOption.ENABLED_FLAGS_ONLY] || optimizelyDecision.enabled) {
        decisionMap[key] = optimizelyDecision;
      }
    });

    return decisionMap;
  }

  /**
   * Returns an object of decision results for all active flag keys.
   * @param     {OptimizelyUserContext}      user        A user context associated with this OptimizelyClient
   * @param     {OptimizelyDecideOption[]}  options     An array of options for decision-making.
   * @return    {[key: string]: OptimizelyDecision}      An object of all decision results mapped by flag keys.
   */
  decideAll(
    user: OptimizelyUserContext,
    options: OptimizelyDecideOption[] = []
  ): { [key: string]: OptimizelyDecision } {
    const configObj = this.projectConfigManager.getConfig();
    const decisionMap: { [key: string]: OptimizelyDecision } = {};
    if (!this.isValidInstance() || !configObj) {
      this.logger.log(LOG_LEVEL.ERROR, LOG_MESSAGES.INVALID_OBJECT, MODULE_NAME, 'decideAll');
      return decisionMap;
    }

    const allFlagKeys = Object.keys(configObj.featureKeyMap);

    return this.decideForKeys(user, allFlagKeys, options);
  }

}
