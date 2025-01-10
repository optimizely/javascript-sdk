/**
 * Copyright 2020-2024, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { LoggerFacade } from '../logging/logger';
import { sprintf, objectValues } from '../utils/fns';
import { createNotificationCenter, DefaultNotificationCenter, NotificationCenter } from '../notification_center';
import { EventProcessor } from '../event_processor/event_processor';

import { OdpManager } from '../odp/odp_manager';
import { VuidManager } from '../vuid/vuid_manager';
import { OdpEvent } from '../odp/event_manager/odp_event';
import { OptimizelySegmentOption } from '../odp/segment_manager/optimizely_segment_option';

import {
  UserAttributes,
  EventTags,
  OptimizelyConfig,
  UserProfileService,
  Variation,
  FeatureFlag,
  FeatureVariable,
  OptimizelyOptions,
  OptimizelyDecideOption,
  FeatureVariableValue,
  OptimizelyDecision,
  Client,
} from '../shared_types';
import { newErrorDecision } from '../optimizely_decision';
import OptimizelyUserContext from '../optimizely_user_context';
import { ProjectConfigManager } from '../project_config/project_config_manager';
import { createDecisionService, DecisionService, DecisionObj } from '../core/decision_service';
import { buildLogEvent } from '../event_processor/event_builder/log_event';
import { buildImpressionEvent, buildConversionEvent, ImpressionEvent } from '../event_processor/event_builder/user_event';
import fns from '../utils/fns';
import { validate } from '../utils/attributes_validator';
import * as eventTagsValidator from '../utils/event_tags_validator';
import * as projectConfig from '../project_config/project_config';
import * as userProfileServiceValidator from '../utils/user_profile_service_validator';
import * as stringValidator from '../utils/string_value_validator';
import * as decision from '../core/decision';

import {
  LOG_LEVEL,
  DECISION_SOURCES,
  DECISION_MESSAGES,
  FEATURE_VARIABLE_TYPES,
  // DECISION_NOTIFICATION_TYPES,
  // NOTIFICATION_TYPES,
  NODE_CLIENT_ENGINE,
  CLIENT_VERSION,
} from '../utils/enums';
import { Fn } from '../utils/type';
import { resolvablePromise } from '../utils/promise/resolvablePromise';

import { NOTIFICATION_TYPES, DecisionNotificationType, DECISION_NOTIFICATION_TYPES } from '../notification_center/type';
import {
  FEATURE_NOT_IN_DATAFILE,
  INVALID_EXPERIMENT_KEY,
  INVALID_INPUT_FORMAT,
  NO_EVENT_PROCESSOR,
  ODP_EVENT_FAILED,
  ODP_EVENT_FAILED_ODP_MANAGER_MISSING,
  UNABLE_TO_GET_VUID_VUID_MANAGER_NOT_AVAILABLE,
  UNRECOGNIZED_DECIDE_OPTION,
  INVALID_OBJECT,
  EVENT_KEY_NOT_FOUND,
  NOT_TRACKING_USER,
  VARIABLE_REQUESTED_WITH_WRONG_TYPE,
} from '../error_messages';

import {
  FEATURE_ENABLED_FOR_USER,
  FEATURE_NOT_ENABLED_FOR_USER,
  FEATURE_NOT_ENABLED_RETURN_DEFAULT_VARIABLE_VALUE,
  INVALID_CLIENT_ENGINE,
  INVALID_DECIDE_OPTIONS,
  INVALID_DEFAULT_DECIDE_OPTIONS,
  NOT_ACTIVATING_USER,
  SHOULD_NOT_DISPATCH_ACTIVATE,
  TRACK_EVENT,
  UPDATED_OPTIMIZELY_CONFIG,
  USER_RECEIVED_DEFAULT_VARIABLE_VALUE,
  USER_RECEIVED_VARIABLE_VALUE,
  VALID_USER_PROFILE_SERVICE,
  VARIABLE_NOT_USED_RETURN_DEFAULT_VARIABLE_VALUE,
} from '../log_messages';
import { INSTANCE_CLOSED } from '../exception_messages';
import { ErrorNotifier } from '../error/error_notifier';
import { ErrorReporter } from '../error/error_reporter';

const MODULE_NAME = 'OPTIMIZELY';

const DEFAULT_ONREADY_TIMEOUT = 30000;

// TODO: Make feature_key, user_id, variable_key, experiment_key, event_key camelCase
type InputKey = 'feature_key' | 'user_id' | 'variable_key' | 'experiment_key' | 'event_key' | 'variation_id';

type StringInputs = Partial<Record<InputKey, unknown>>;

type DecisionReasons = (string | number)[];

export default class Optimizely implements Client {
  private disposeOnUpdate?: Fn;
  private readyPromise: Promise<unknown>;
  // readyTimeout is specified as any to make this work in both browser & Node
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readyTimeouts: { [key: string]: { readyTimeout: any; onClose: () => void } };
  private nextReadyTimeoutId: number;
  private clientEngine: string;
  private clientVersion: string;
  private errorNotifier?: ErrorNotifier;
  private errorReporter: ErrorReporter;
  protected logger?: LoggerFacade;
  private projectConfigManager: ProjectConfigManager;
  private decisionService: DecisionService;
  private eventProcessor?: EventProcessor;
  private defaultDecideOptions: { [key: string]: boolean };
  private odpManager?: OdpManager;
  public notificationCenter: DefaultNotificationCenter;
  private vuidManager?: VuidManager;

  constructor(config: OptimizelyOptions) {
    let clientEngine = config.clientEngine;
    if (!clientEngine) {
      config.logger?.info(INVALID_CLIENT_ENGINE, clientEngine);
      clientEngine = NODE_CLIENT_ENGINE;
    }

    this.clientEngine = clientEngine;
    this.clientVersion = config.clientVersion || CLIENT_VERSION;
    this.errorNotifier = config.errorNotifier;
    this.logger = config.logger;
    this.projectConfigManager = config.projectConfigManager;
    this.errorReporter = new ErrorReporter(this.logger, this.errorNotifier);
    this.odpManager = config.odpManager;
    this.vuidManager = config.vuidManager;
    this.eventProcessor = config.eventProcessor;

    if(config.disposable) {
      this.projectConfigManager.makeDisposable();
      this.eventProcessor?.makeDisposable();
      this.odpManager?.makeDisposable();
    }

    let decideOptionsArray = config.defaultDecideOptions ?? [];

    if (!Array.isArray(decideOptionsArray)) {
      this.logger?.debug(INVALID_DEFAULT_DECIDE_OPTIONS);
      decideOptionsArray = [];
    }

    const defaultDecideOptions: { [key: string]: boolean } = {};
    decideOptionsArray.forEach(option => {
      // Filter out all provided default decide options that are not in OptimizelyDecideOption[]
      if (OptimizelyDecideOption[option]) {
        defaultDecideOptions[option] = true;
      } else {
        this.logger?.warn(UNRECOGNIZED_DECIDE_OPTION, option);
      }
    });
    this.defaultDecideOptions = defaultDecideOptions;

    this.disposeOnUpdate = this.projectConfigManager.onUpdate((configObj: projectConfig.ProjectConfig) => {
      this.logger?.info(
        UPDATED_OPTIMIZELY_CONFIG,
        configObj.revision,
        configObj.projectId
      );

      this.notificationCenter.sendNotifications(NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE, undefined);

      this.updateOdpSettings();
    });

    this.projectConfigManager.start();
    const projectConfigManagerRunningPromise = this.projectConfigManager.onRunning();

    let userProfileService: UserProfileService | null = null;
    if (config.userProfileService) {
      try {
        if (userProfileServiceValidator.validate(config.userProfileService)) {
          userProfileService = config.userProfileService;
          this.logger?.info(VALID_USER_PROFILE_SERVICE);
        }
      } catch (ex) {
        this.logger?.warn(ex);
      }
    }

    this.decisionService = createDecisionService({
      userProfileService: userProfileService,
      logger: this.logger,
      UNSTABLE_conditionEvaluators: config.UNSTABLE_conditionEvaluators,
    });

    this.notificationCenter = createNotificationCenter({ logger: this.logger, errorNotifier: this.errorNotifier });

    this.eventProcessor = config.eventProcessor;

    this.eventProcessor?.start();
    const eventProcessorRunningPromise = this.eventProcessor ? this.eventProcessor.onRunning() :
      Promise.resolve(undefined);

    this.eventProcessor?.onDispatch((event) => {
      this.notificationCenter.sendNotifications(NOTIFICATION_TYPES.LOG_EVENT, event);
    });

    this.odpManager?.start();

    this.readyPromise = Promise.all([
      projectConfigManagerRunningPromise,
      eventProcessorRunningPromise,
      config.odpManager ? config.odpManager.onRunning() : Promise.resolve(),
      config.vuidManager ? config.vuidManager.initialize() : Promise.resolve(),
    ]);

    this.readyPromise.then(() => {
      const vuid = this.vuidManager?.getVuid();
      if (vuid) {
        this.odpManager?.setVuid(vuid);
      }
    });

    this.readyTimeouts = {};
    this.nextReadyTimeoutId = 0;
  }

  /**
   * Returns the project configuration retrieved from projectConfigManager
   * @return {projectConfig.ProjectConfig}
   */
  getProjectConfig(): projectConfig.ProjectConfig | null {
    return this.projectConfigManager.getConfig() || null;
  }

  /**
   * Returns a truthy value if this instance currently has a valid project config
   * object, and the initial configuration object that was passed into the
   * constructor was also valid.
   * @return {boolean}
   */
  isValidInstance(): boolean {
    return !!this.projectConfigManager.getConfig();
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
        this.logger?.error(INVALID_OBJECT, 'activate');
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
          this.logger?.debug(SHOULD_NOT_DISPATCH_ACTIVATE, experimentKey);
          return variationKey;
        }

        const experiment = projectConfig.getExperimentFromKey(configObj, experimentKey);
        const variation = experiment.variationKeyMap[variationKey];
        const decisionObj = {
          experiment: experiment,
          variation: variation,
          decisionSource: DECISION_SOURCES.EXPERIMENT,
        };

        this.sendImpressionEvent(decisionObj, '', userId, true, attributes);
        return variationKey;
      } catch (ex) {
        this.logger?.info(NOT_ACTIVATING_USER, userId, experimentKey);
        this.errorReporter.report(ex);
        return null;
      }
    } catch (e) {
      this.errorReporter.report(e);
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
    attributes?: UserAttributes
  ): void {
    if (!this.eventProcessor) {
      this.logger?.error(NO_EVENT_PROCESSOR);
      return;
    }

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

    this.eventProcessor.process(impressionEvent);

    const logEvent = buildLogEvent([impressionEvent]);
    this.notificationCenter.sendNotifications(NOTIFICATION_TYPES.ACTIVATE, {
      experiment: decisionObj.experiment,
      userId: userId,
      attributes: attributes,
      variation: decisionObj.variation,
      logEvent,
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
      if (!this.eventProcessor) {
        this.logger?.error(NO_EVENT_PROCESSOR);
        return;
      }

      if (!this.isValidInstance()) {
        this.logger?.error(INVALID_OBJECT, MODULE_NAME, 'track');
        return;
      }

      if (!this.validateInputs({ user_id: userId, event_key: eventKey }, attributes, eventTags)) {
        return;
      }

      const configObj = this.projectConfigManager.getConfig();
      if (!configObj) {
        return;
      }

      console.log(eventKey, userId, attributes, eventTags);

      if (!projectConfig.eventWithKeyExists(configObj, eventKey)) {
        console.log('eventKey not found',);
        this.logger?.warn(EVENT_KEY_NOT_FOUND, eventKey);
        this.logger?.warn(NOT_TRACKING_USER, userId);
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
      }, this.logger);
      this.logger?.info(TRACK_EVENT, eventKey, userId);
      // TODO is it okay to not pass a projectConfig as second argument
      this.eventProcessor.process(conversionEvent);

      const logEvent = buildLogEvent([conversionEvent]);
      this.notificationCenter.sendNotifications(NOTIFICATION_TYPES.TRACK, {
        eventKey,
        userId,
        attributes,
        eventTags,
        logEvent,
      });
    } catch (e) {
      this.errorReporter.report(e);
      this.logger?.error(NOT_TRACKING_USER, userId);
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
        this.logger?.error(INVALID_OBJECT, 'getVariation');
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
        if (!experiment || experiment.isRollout) {
          this.logger?.debug(INVALID_EXPERIMENT_KEY, experimentKey);
          return null;
        }

        const variationKey = this.decisionService.getVariation(
          configObj,
          experiment,
          this.createInternalUserContext(userId, attributes) as OptimizelyUserContext
        ).result;
        const decisionNotificationType: DecisionNotificationType = projectConfig.isFeatureExperiment(configObj, experiment.id)
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
        this.errorReporter.report(ex);
        return null;
      }
    } catch (e) {
      this.errorReporter.report(e);
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
      this.errorReporter.report(ex);
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
      this.errorReporter.report(ex);
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
  protected validateInputs(stringInputs: StringInputs, userAttributes?: unknown, eventTags?: unknown): boolean {
    try {
      if (stringInputs.hasOwnProperty('user_id')) {
        const userId = stringInputs['user_id'];
        if (typeof userId !== 'string' || userId === null || userId === 'undefined') {
          throw new Error(sprintf(INVALID_INPUT_FORMAT, MODULE_NAME, 'user_id'));
        }

        delete stringInputs['user_id'];
      }
      Object.keys(stringInputs).forEach(key => {
        if (!stringValidator.validate(stringInputs[key as InputKey])) {
          throw new Error(sprintf(INVALID_INPUT_FORMAT, MODULE_NAME, key));
        }
      });
      if (userAttributes) {
        validate(userAttributes);
      }
      if (eventTags) {
        eventTagsValidator.validate(eventTags);
      }
      return true;
    } catch (ex) {
      this.errorReporter.report(ex);
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
    this.logger?.info(NOT_ACTIVATING_USER, userId, experimentKey);
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
        this.logger?.error(INVALID_OBJECT, 'isFeatureEnabled');
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
      const user = this.createInternalUserContext(userId, attributes) as OptimizelyUserContext;
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
        (decisionSource === DECISION_SOURCES.ROLLOUT && projectConfig.getSendFlagDecisionsValue(configObj))
      ) {
        this.sendImpressionEvent(decisionObj, feature.key, userId, featureEnabled, attributes);
      }

      if (featureEnabled === true) {
        this.logger?.info(FEATURE_ENABLED_FOR_USER, featureKey, userId);
      } else {
        this.logger?.info(FEATURE_NOT_ENABLED_FOR_USER, featureKey, userId);
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
      this.errorReporter.report(e);
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
        this.logger?.error(INVALID_OBJECT, 'getEnabledFeatures');
        return enabledFeatures;
      }

      if (!this.validateInputs({ user_id: userId })) {
        return enabledFeatures;
      }

      const configObj = this.projectConfigManager.getConfig();
      if (!configObj) {
        return enabledFeatures;
      }

      objectValues(configObj.featureKeyMap).forEach((feature: FeatureFlag) => {
        if (this.isFeatureEnabled(feature.key, userId, attributes)) {
          enabledFeatures.push(feature.key);
        }
      });

      return enabledFeatures;
    } catch (e) {
      this.errorReporter.report(e);
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
  ): FeatureVariableValue {
    try {
      if (!this.isValidInstance()) {
        this.logger?.error(INVALID_OBJECT, 'getFeatureVariable');
        return null;
      }
      return this.getFeatureVariableForType(featureKey, variableKey, null, userId, attributes);
    } catch (e) {
      this.errorReporter.report(e);
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
    attributes?: UserAttributes
  ): FeatureVariableValue {
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
      this.logger?.warn(
        VARIABLE_REQUESTED_WITH_WRONG_TYPE,
        variableType,
        variable.type
      );
      return null;
    }

    const user = this.createInternalUserContext(userId, attributes) as OptimizelyUserContext;
    const decisionObj = this.decisionService.getVariationForFeature(configObj, featureFlag, user).result;
    const featureEnabled = decision.getFeatureEnabledFromVariation(decisionObj);
    const variableValue = this.getFeatureVariableValueFromVariation(
      featureKey,
      featureEnabled,
      decisionObj.variation,
      variable,
      userId
    );
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
  ): FeatureVariableValue {
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
          this.logger?.info(
            USER_RECEIVED_VARIABLE_VALUE,
            variableValue,
            variable.key,
            featureKey
          );
        } else {
          this.logger?.info(
            FEATURE_NOT_ENABLED_RETURN_DEFAULT_VARIABLE_VALUE,
            featureKey,
            userId,
            variableValue
          );
        }
      } else {
        this.logger?.info(
          VARIABLE_NOT_USED_RETURN_DEFAULT_VARIABLE_VALUE,
          variable.key,
          variation.key
        );
      }
    } else {
      this.logger?.info(
        USER_RECEIVED_DEFAULT_VARIABLE_VALUE,
        userId,
        variable.key,
        featureKey
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
        this.logger?.error(INVALID_OBJECT, 'getFeatureVariableBoolean');
        return null;
      }
      return this.getFeatureVariableForType(
        featureKey,
        variableKey,
        FEATURE_VARIABLE_TYPES.BOOLEAN,
        userId,
        attributes
      ) as boolean | null;
    } catch (e) {
      this.errorReporter.report(e);
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
        this.logger?.error(INVALID_OBJECT, 'getFeatureVariableDouble');
        return null;
      }
      return this.getFeatureVariableForType(
        featureKey,
        variableKey,
        FEATURE_VARIABLE_TYPES.DOUBLE,
        userId,
        attributes
      ) as number | null;
    } catch (e) {
      this.errorReporter.report(e);
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
        this.logger?.error(INVALID_OBJECT, 'getFeatureVariableInteger');
        return null;
      }
      return this.getFeatureVariableForType(
        featureKey,
        variableKey,
        FEATURE_VARIABLE_TYPES.INTEGER,
        userId,
        attributes
      ) as number | null;
    } catch (e) {
      this.errorReporter.report(e);
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
        this.logger?.error(INVALID_OBJECT, MODULE_NAME, 'getFeatureVariableString');
        return null;
      }
      return this.getFeatureVariableForType(
        featureKey,
        variableKey,
        FEATURE_VARIABLE_TYPES.STRING,
        userId,
        attributes
      ) as string | null;
    } catch (e) {
      this.errorReporter.report(e);
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
  getFeatureVariableJSON(featureKey: string, variableKey: string, userId: string, attributes: UserAttributes): unknown {
    try {
      if (!this.isValidInstance()) {
        this.logger?.error(INVALID_OBJECT, 'getFeatureVariableJSON');
        return null;
      }
      return this.getFeatureVariableForType(featureKey, variableKey, FEATURE_VARIABLE_TYPES.JSON, userId, attributes);
    } catch (e) {
      this.errorReporter.report(e);
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
        this.logger?.error(INVALID_OBJECT, 'getAllFeatureVariables');
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

      const user = this.createInternalUserContext(userId, attributes) as OptimizelyUserContext;

      const decisionObj = this.decisionService.getVariationForFeature(configObj, featureFlag, user).result;
      const featureEnabled = decision.getFeatureEnabledFromVariation(decisionObj);
      const allVariables: { [variableKey: string]: unknown } = {};

      featureFlag.variables.forEach((variable: FeatureVariable) => {
        allVariables[variable.key] = this.getFeatureVariableValueFromVariation(
          featureKey,
          featureEnabled,
          decisionObj.variation,
          variable,
          userId
        );
      });

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
      this.errorReporter.report(e);
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
      return this.projectConfigManager.getOptimizelyConfig() || null;
    } catch (e) {
      this.errorReporter.report(e);
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
      this.projectConfigManager.stop();
      this.eventProcessor?.stop();
      this.odpManager?.stop();
      this.notificationCenter.clearAllNotificationListeners();

      const eventProcessorStoppedPromise = this.eventProcessor ? this.eventProcessor.onTerminated() :
        Promise.resolve();
        
      if (this.disposeOnUpdate) {
        this.disposeOnUpdate();
        this.disposeOnUpdate = undefined;
      }

      Object.keys(this.readyTimeouts).forEach((readyTimeoutId: string) => {
        const readyTimeoutRecord = this.readyTimeouts[readyTimeoutId];
        clearTimeout(readyTimeoutRecord.readyTimeout);
        readyTimeoutRecord.onClose();
      });
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
      this.errorReporter.report(err);
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
  onReady(options?: { timeout?: number }): Promise<unknown> {
    let timeoutValue: number | undefined;
    if (typeof options === 'object' && options !== null) {
      if (options.timeout !== undefined) {
        timeoutValue = options.timeout;
      }
    }
    if (!fns.isSafeInteger(timeoutValue)) {
      timeoutValue = DEFAULT_ONREADY_TIMEOUT;
    }

    const timeoutPromise = resolvablePromise();

    const timeoutId = this.nextReadyTimeoutId++;

    const onReadyTimeout = () => {
      delete this.readyTimeouts[timeoutId];
      timeoutPromise.reject(new Error(
        sprintf('onReady timeout expired after %s ms', timeoutValue)
      ));
    };
    
    const readyTimeout = setTimeout(onReadyTimeout, timeoutValue);
    const onClose = function() {
      timeoutPromise.reject(new Error(INSTANCE_CLOSED));
    };

    this.readyTimeouts[timeoutId] = {
      readyTimeout: readyTimeout,
      onClose: onClose,
    };

    this.readyPromise.then(() => {
      clearTimeout(readyTimeout);
      delete this.readyTimeouts[timeoutId];
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
   * @param  {string}          userId      (Optional) The user ID to be used for bucketing.
   * @param  {UserAttributes}  attributes  (Optional) user attributes.
   * @return {OptimizelyUserContext|null}  An OptimizelyUserContext associated with this OptimizelyClient or
   *                                       null if provided inputs are invalid
   */
  createUserContext(userId?: string, attributes?: UserAttributes): OptimizelyUserContext | null {
    const userIdentifier = userId ?? this.vuidManager?.getVuid();

    if (userIdentifier === undefined || !this.validateInputs({ user_id: userIdentifier }, attributes)) {
      return null;
    }

    return new OptimizelyUserContext({
      optimizely: this,
      userId: userIdentifier,
      attributes,
      shouldIdentifyUser: true,
    });
  }

  /**
   * Creates an internal context of the user for which decision APIs will be called.
   *
   * A user context will be created successfully even when the SDK is not fully configured yet, so no
   * this.isValidInstance() check is performed here.
   *
   * @param  {string}          userId      The user ID to be used for bucketing.
   * @param  {UserAttributes}  attributes  Optional user attributes.
   * @return {OptimizelyUserContext|null}  An OptimizelyUserContext associated with this OptimizelyClient or
   *                                       null if provided inputs are invalid
   */
  private createInternalUserContext(userId: string, attributes?: UserAttributes): OptimizelyUserContext | null {
    return new OptimizelyUserContext({
      optimizely: this,
      userId,
      attributes,
      shouldIdentifyUser: false,
    });
  }

  decide(user: OptimizelyUserContext, key: string, options: OptimizelyDecideOption[] = []): OptimizelyDecision {
    const configObj = this.projectConfigManager.getConfig();

    if (!this.isValidInstance() || !configObj) {
      this.logger?.error(INVALID_OBJECT, 'decide');
      return newErrorDecision(key, user, [DECISION_MESSAGES.SDK_NOT_READY]);
    }

    return this.decideForKeys(user, [key], options, true)[key];
  }

  /**
   * Get all decide options.
   * @param  {OptimizelyDecideOption[]}          options   decide options
   * @return {[key: string]: boolean}             Map of all provided decide options including default decide options
   */
  private getAllDecideOptions(options: OptimizelyDecideOption[]): { [key: string]: boolean } {
    const allDecideOptions = { ...this.defaultDecideOptions };
    if (!Array.isArray(options)) {
      this.logger?.debug(INVALID_DECIDE_OPTIONS);
    } else {
      options.forEach(option => {
        // Filter out all provided decide options that are not in OptimizelyDecideOption[]
        if (OptimizelyDecideOption[option]) {
          allDecideOptions[option] = true;
        } else {
          this.logger?.warn(UNRECOGNIZED_DECIDE_OPTION, option);
        }
      });
    }

    return allDecideOptions;
  }

  /**
   * Makes a decision for a given feature key.
   *
   * @param {OptimizelyUserContext} user - The user context associated with this Optimizely client.
   * @param {string} key - The feature key for which a decision will be made.
   * @param {DecisionObj} decisionObj - The decision object containing decision details.
   * @param {DecisionReasons[]} reasons - An array of reasons for the decision.
   * @param {Record<string, boolean>} options - A map of options for decision-making.
   * @param {projectConfig.ProjectConfig} configObj - The project configuration object.
   * @returns {OptimizelyDecision} - The decision object for the feature flag.
   */
  private generateDecision(
    user: OptimizelyUserContext,
    key: string,
    decisionObj: DecisionObj,
    reasons: DecisionReasons[], 
    options: Record<string, boolean>,
    configObj: projectConfig.ProjectConfig,
  ): OptimizelyDecision {
      const userId = user.getUserId()
      const attributes = user.getAttributes()
      const feature = configObj.featureKeyMap[key]
      const decisionSource = decisionObj.decisionSource;
      const experimentKey = decisionObj.experiment?.key ?? null;
      const variationKey = decisionObj.variation?.key ?? null;
      const flagEnabled: boolean = decision.getFeatureEnabledFromVariation(decisionObj);
      const variablesMap: { [key: string]: unknown } = {};
      let decisionEventDispatched = false;

      if (flagEnabled) {
        this.logger?.info(FEATURE_ENABLED_FOR_USER, key, userId);
      } else {
        this.logger?.info(FEATURE_NOT_ENABLED_FOR_USER, key, userId);
      }

      if (!options[OptimizelyDecideOption.EXCLUDE_VARIABLES]) {
        feature.variables.forEach(variable => {
          variablesMap[variable.key] = this.getFeatureVariableValueFromVariation(
            key,
            flagEnabled,
            decisionObj.variation,
            variable,
            userId
          );
        });
      }

      if (
        !options[OptimizelyDecideOption.DISABLE_DECISION_EVENT] &&
        (decisionSource === DECISION_SOURCES.FEATURE_TEST ||
          (decisionSource === DECISION_SOURCES.ROLLOUT && projectConfig.getSendFlagDecisionsValue(configObj)))
      ) {
        this.sendImpressionEvent(decisionObj, key, userId, flagEnabled, attributes);
        decisionEventDispatched = true;
      }

      const shouldIncludeReasons = options[OptimizelyDecideOption.INCLUDE_REASONS];

      let reportedReasons: string[] = [];
      if (shouldIncludeReasons) {
        reportedReasons = reasons.map(reason => sprintf(reason[0] as string, ...reason.slice(1)));
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
    options: OptimizelyDecideOption[] = [],
    ignoreEnabledFlagOption?:boolean
  ): Record<string, OptimizelyDecision> {
    const decisionMap: Record<string, OptimizelyDecision> = {};
    const flagDecisions: Record<string, DecisionObj> = {};
    const decisionReasonsMap: Record<string, DecisionReasons[]> = {};
    const flagsWithoutForcedDecision = [];
    const validKeys = [];

    const configObj = this.projectConfigManager.getConfig()

    if (!this.isValidInstance() || !configObj) {
      this.logger?.error(INVALID_OBJECT, 'decideForKeys');
      return decisionMap;
    }
    if (keys.length === 0) {
      return decisionMap;
    }

    const allDecideOptions = this.getAllDecideOptions(options);

    if (ignoreEnabledFlagOption) {
      delete allDecideOptions[OptimizelyDecideOption.ENABLED_FLAGS_ONLY];
    }

    for(const key of keys) {
      const feature = configObj.featureKeyMap[key];
      if (!feature) {
        this.logger?.error(FEATURE_NOT_IN_DATAFILE, key);
        decisionMap[key] = newErrorDecision(key, user, [sprintf(DECISION_MESSAGES.FLAG_KEY_INVALID, key)]); 
        continue
      }

      validKeys.push(key);
      const forcedDecisionResponse = this.decisionService.findValidatedForcedDecision(configObj, user, key);
      decisionReasonsMap[key] = forcedDecisionResponse.reasons
      const variation = forcedDecisionResponse.result;

      if (variation) {
        flagDecisions[key] = {
          experiment: null,
          variation: variation,
          decisionSource: DECISION_SOURCES.FEATURE_TEST,
        };
      } else {
        flagsWithoutForcedDecision.push(feature)
      }
    }

    const decisionList = this.decisionService.getVariationsForFeatureList(configObj, flagsWithoutForcedDecision, user, allDecideOptions);

    for(let i = 0; i < flagsWithoutForcedDecision.length; i++) {
      const key = flagsWithoutForcedDecision[i].key;
      const decision = decisionList[i];
      flagDecisions[key] = decision.result;
      decisionReasonsMap[key] = [...decisionReasonsMap[key], ...decision.reasons];
    }

    for(const validKey of validKeys) {
      const decision = this.generateDecision(user, validKey, flagDecisions[validKey], decisionReasonsMap[validKey], allDecideOptions, configObj);

      if(!allDecideOptions[OptimizelyDecideOption.ENABLED_FLAGS_ONLY] || decision.enabled) {
        decisionMap[validKey] = decision;
      }
    }

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
      this.logger?.error(INVALID_OBJECT, MODULE_NAME, 'decideAll');
      return decisionMap;
    }

    const allFlagKeys = Object.keys(configObj.featureKeyMap);

    return this.decideForKeys(user, allFlagKeys, options);
  }

  /**
   * Updates ODP Config with most recent ODP key, host, pixelUrl, and segments from the project config
   */
  private updateOdpSettings(): void {
    const projectConfig = this.projectConfigManager.getConfig();

    if (!projectConfig) {
      return;
    }

    if (this.odpManager) {
      this.odpManager.updateConfig(projectConfig.odpIntegrationConfig);
    }
  }

  /**
   * Sends an action as an ODP Event with optional custom parameters including type, identifiers, and data
   * Note: Since this depends on this.odpManager, it must await Optimizely client's onReady() promise resolution.
   * @param {string}              action         Subcategory of the event type (i.e. "client_initialized", "identified", or a custom action)
   * @param {string}              type           (Optional) Type of event (Defaults to "fullstack")
   * @param {Map<string, string>} identifiers    (Optional) Key-value map of user identifiers
   * @param {Map<string, string>} data           (Optional) Event data in a key-value map.
   */
  public sendOdpEvent(
    action: string,
    type?: string,
    identifiers?: Map<string, string>,
    data?: Map<string, unknown>
  ): void {
    if (!this.odpManager) {
      this.logger?.error(ODP_EVENT_FAILED_ODP_MANAGER_MISSING);
      return;
    }

    try {
      const odpEvent = new OdpEvent(type || '', action, identifiers, data);
      this.odpManager.sendEvent(odpEvent);
    } catch (e) {
      this.logger?.error(ODP_EVENT_FAILED, e);
    }
  }
  /**
   * Checks if ODP (Optimizely Data Platform) is integrated into the project.
   * @returns { boolean } `true` if ODP settings were found in the datafile otherwise `false`
   */
  public isOdpIntegrated(): boolean {
    return this.projectConfigManager.getConfig()?.odpIntegrationConfig?.integrated ?? false;
  }

  /**
   * Identifies user with ODP server in a fire-and-forget manner.
   * Should be called only after the instance is ready
   * @param {string} userId
   */
  public identifyUser(userId: string): void {
    if (this.odpManager && this.isOdpIntegrated()) {
      this.odpManager.identifyUser(userId);
    }
  }

  /**
   * Fetches list of qualified segments from ODP for a particular userId.
   * @param {string}                          userId
   * @param {Array<OptimizelySegmentOption>}  options
   * @returns {Promise<string[] | null>}
   */
  public async fetchQualifiedSegments(
    userId: string,
    options?: Array<OptimizelySegmentOption>
  ): Promise<string[] | null> {
    if (!this.odpManager) {
      return null;
    }

    return await this.odpManager.fetchQualifiedSegments(userId, options);
  }

  /**
   * @returns {string|undefined}    Currently provisioned VUID from local ODP Manager or undefined if
   *                                ODP Manager has not been instantiated yet for any reason.
   */
  public getVuid(): string | undefined {
    if (!this.vuidManager) {
      this.logger?.error(UNABLE_TO_GET_VUID_VUID_MANAGER_NOT_AVAILABLE);
      return undefined;
    }

    return this.vuidManager.getVuid();
  }
}
