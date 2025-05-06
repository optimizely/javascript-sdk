/**
 * Copyright 2020-2025, Optimizely
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
import { createNotificationCenter, DefaultNotificationCenter } from '../notification_center';
import { EventProcessor } from '../event_processor/event_processor';

import { OdpManager } from '../odp/odp_manager';
import { VuidManager } from '../vuid/vuid_manager';
import { OdpEvent } from '../odp/event_manager/odp_event';
import { OptimizelySegmentOption } from '../odp/segment_manager/optimizely_segment_option';
import { BaseService, ServiceState } from '../service';

import {
  UserAttributes,
  EventTags,
  OptimizelyConfig,
  UserProfileService,
  Variation,
  FeatureFlag,
  FeatureVariable,
  OptimizelyDecideOption,
  FeatureVariableValue,
  OptimizelyDecision,
  Client,
  UserProfileServiceAsync,
} from '../shared_types';
import { newErrorDecision } from '../optimizely_decision';
import OptimizelyUserContext from '../optimizely_user_context';
import { ProjectConfigManager } from '../project_config/project_config_manager';
import { createDecisionService, DecisionService, DecisionObj } from '../core/decision_service';
import { buildLogEvent } from '../event_processor/event_builder/log_event';
import { buildImpressionEvent, buildConversionEvent } from '../event_processor/event_builder/user_event';
import { isSafeInteger } from '../utils/fns';
import { validate } from '../utils/attributes_validator';
import * as eventTagsValidator from '../utils/event_tags_validator';
import * as projectConfig from '../project_config/project_config';
import * as userProfileServiceValidator from '../utils/user_profile_service_validator';
import * as stringValidator from '../utils/string_value_validator';
import * as decision from '../core/decision';

import {
  DECISION_SOURCES,
  DECISION_MESSAGES,
  FEATURE_VARIABLE_TYPES,
  NODE_CLIENT_ENGINE,
  CLIENT_VERSION,
} from '../utils/enums';
import { Fn, Maybe, OpType } from '../utils/type';
import { resolvablePromise } from '../utils/promise/resolvablePromise';

import { NOTIFICATION_TYPES, DecisionNotificationType, DECISION_NOTIFICATION_TYPES } from '../notification_center/type';
import {
  FEATURE_NOT_IN_DATAFILE,
  INVALID_INPUT_FORMAT,
  NO_EVENT_PROCESSOR,
  ODP_EVENT_FAILED,
  ODP_EVENT_FAILED_ODP_MANAGER_MISSING,
  UNABLE_TO_GET_VUID_VUID_MANAGER_NOT_AVAILABLE,
  UNRECOGNIZED_DECIDE_OPTION,
  NO_PROJECT_CONFIG_FAILURE,
  EVENT_KEY_NOT_FOUND,
  NOT_TRACKING_USER,
  VARIABLE_REQUESTED_WITH_WRONG_TYPE,
} from 'error_message';

import {
  FEATURE_ENABLED_FOR_USER,
  FEATURE_NOT_ENABLED_FOR_USER,
  FEATURE_NOT_ENABLED_RETURN_DEFAULT_VARIABLE_VALUE,
  INVALID_CLIENT_ENGINE,
  INVALID_DECIDE_OPTIONS,
  INVALID_DEFAULT_DECIDE_OPTIONS,
  INVALID_EXPERIMENT_KEY_INFO,
  NOT_ACTIVATING_USER,
  SHOULD_NOT_DISPATCH_ACTIVATE,
  TRACK_EVENT,
  UPDATED_OPTIMIZELY_CONFIG,
  USER_RECEIVED_DEFAULT_VARIABLE_VALUE,
  USER_RECEIVED_VARIABLE_VALUE,
  VALID_USER_PROFILE_SERVICE,
  VARIABLE_NOT_USED_RETURN_DEFAULT_VARIABLE_VALUE,
} from 'log_message';

import { SERVICE_STOPPED_BEFORE_RUNNING } from '../service';

import { ErrorNotifier } from '../error/error_notifier';
import { ErrorReporter } from '../error/error_reporter';
import { OptimizelyError } from '../error/optimizly_error';
import { Value } from '../utils/promise/operation_value';
import { CmabService } from '../core/decision_service/cmab/cmab_service';

const DEFAULT_ONREADY_TIMEOUT = 30000;

// TODO: Make feature_key, user_id, variable_key, experiment_key, event_key camelCase
type InputKey = 'feature_key' | 'user_id' | 'variable_key' | 'experiment_key' | 'event_key' | 'variation_id';

type StringInputs = Partial<Record<InputKey, unknown>>;

type DecisionReasons = (string | number)[];

export const INSTANCE_CLOSED = 'Instance closed';
export const ONREADY_TIMEOUT = 'onReady timeout expired after %s ms';

/**
 * options required to create optimizely object
 */
export type OptimizelyOptions = {
  projectConfigManager: ProjectConfigManager;
  UNSTABLE_conditionEvaluators?: unknown;
  cmabService: CmabService;
  clientEngine: string;
  clientVersion?: string;
  errorNotifier?: ErrorNotifier;
  eventProcessor?: EventProcessor;
  jsonSchemaValidator?: {
    validate(jsonObject: unknown): boolean;
  };
  logger?: LoggerFacade;
  userProfileService?: UserProfileService | null;
  userProfileServiceAsync?: UserProfileServiceAsync | null;
  defaultDecideOptions?: OptimizelyDecideOption[];
  odpManager?: OdpManager;
  vuidManager?: VuidManager
  disposable?: boolean;
}

export default class Optimizely extends BaseService implements Client {
  private cleanupTasks: Map<number, Fn> = new Map();
  private nextCleanupTaskId = 0;
  private clientEngine: string;
  private clientVersion: string;
  private errorNotifier?: ErrorNotifier;
  private errorReporter: ErrorReporter;
  private projectConfigManager: ProjectConfigManager;
  private decisionService: DecisionService;
  private eventProcessor?: EventProcessor;
  private defaultDecideOptions: { [key: string]: boolean };
  private odpManager?: OdpManager;
  public notificationCenter: DefaultNotificationCenter;
  private vuidManager?: VuidManager;

  constructor(config: OptimizelyOptions) {
    super();
    
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

    // pass a child logger to sub-components
    if (this.logger) {
      this.projectConfigManager.setLogger(this.logger.child());
      this.eventProcessor?.setLogger(this.logger.child());
      this.odpManager?.setLogger(this.logger.child());
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

    this.projectConfigManager = config.projectConfigManager;
    this.projectConfigManager.onUpdate((configObj: projectConfig.ProjectConfig) => {
      this.logger?.info(
        UPDATED_OPTIMIZELY_CONFIG,
        configObj.revision,
        configObj.projectId
      );

      this.notificationCenter.sendNotifications(NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE, undefined);

      this.updateOdpSettings();
    });

    this.eventProcessor = config.eventProcessor;
    this.eventProcessor?.onDispatch((event) => {
      this.notificationCenter.sendNotifications(NOTIFICATION_TYPES.LOG_EVENT, event);
    });

    this.odpManager = config.odpManager;

    let userProfileService: Maybe<UserProfileService> = undefined;
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
      userProfileServiceAsync: config.userProfileServiceAsync || undefined,
      cmabService: config.cmabService,
      logger: this.logger,
      UNSTABLE_conditionEvaluators: config.UNSTABLE_conditionEvaluators,
    });

    this.notificationCenter = createNotificationCenter({ logger: this.logger, errorNotifier: this.errorNotifier });

    this.start();
  }

  start(): void {
    if (!this.isNew()) {
      return;
    }

    super.start();

    this.state = ServiceState.Starting;
    this.projectConfigManager.start();
    this.eventProcessor?.start();
    this.odpManager?.start();

    Promise.all([
      this.projectConfigManager.onRunning(),
      this.eventProcessor ? this.eventProcessor.onRunning() : Promise.resolve(),
      this.odpManager ? this.odpManager.onRunning() : Promise.resolve(),
      this.vuidManager ? this.vuidManager.initialize() : Promise.resolve(),
    ]).then(() => {
      this.state = ServiceState.Running;
      this.startPromise.resolve();

      const vuid = this.vuidManager?.getVuid();
      if (vuid) {
        this.odpManager?.setVuid(vuid);
      }
    }).catch((err) => {
      this.state = ServiceState.Failed;
      this.errorReporter.report(err);
      this.startPromise.reject(err);
    });
  }

  /**
   * Returns the project configuration retrieved from projectConfigManager
   * @return {projectConfig.ProjectConfig}
   */
  getProjectConfig(): projectConfig.ProjectConfig | null {
    return this.projectConfigManager.getConfig() || null;
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
      const configObj = this.getProjectConfig();
      if (!configObj) {
        this.errorReporter.report(NO_PROJECT_CONFIG_FAILURE, 'activate');
        return null;
      }

      if (!this.validateInputs({ experiment_key: experimentKey, user_id: userId }, attributes)) {
        return this.notActivatingExperiment(experimentKey, userId);
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

    const configObj = this.getProjectConfig();
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

      const configObj = this.getProjectConfig();
      if (!configObj) {
        this.errorReporter.report(NO_PROJECT_CONFIG_FAILURE, 'track');
        return;
      }

      if (!this.validateInputs({ user_id: userId, event_key: eventKey }, attributes, eventTags)) {
        return;
      }


      if (!projectConfig.eventWithKeyExists(configObj, eventKey)) {
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
      const configObj = this.getProjectConfig();
      if (!configObj) {
        this.errorReporter.report(NO_PROJECT_CONFIG_FAILURE, 'getVariation');
        return null;
      }

      try {
        if (!this.validateInputs({ experiment_key: experimentKey, user_id: userId }, attributes)) {
          return null;
        }

        const experiment = configObj.experimentKeyMap[experimentKey];
        if (!experiment || experiment.isRollout) {
          this.logger?.debug(INVALID_EXPERIMENT_KEY_INFO, experimentKey);
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

    const configObj = this.getProjectConfig();
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

    const configObj = this.getProjectConfig();
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
          throw new OptimizelyError(INVALID_INPUT_FORMAT, 'user_id');
        }

        delete stringInputs['user_id'];
      }
      Object.keys(stringInputs).forEach(key => {
        if (!stringValidator.validate(stringInputs[key as InputKey])) {
          throw new OptimizelyError(INVALID_INPUT_FORMAT, key);
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
      const typedKey = key as keyof EventTags;
      if (map.hasOwnProperty(typedKey) && (map[typedKey] === null || map[typedKey] === undefined)) {
        delete map[typedKey];
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
      const configObj = this.getProjectConfig();
      if (!configObj) {
        this.errorReporter.report(NO_PROJECT_CONFIG_FAILURE, 'isFeatureEnabled');
        return false;
      }

      if (!this.validateInputs({ feature_key: featureKey, user_id: userId }, attributes)) {
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

      const configObj = this.getProjectConfig();
      if (!configObj) {
        this.errorReporter.report(NO_PROJECT_CONFIG_FAILURE, 'getEnabledFeatures');
        return enabledFeatures;
      }

      if (!this.validateInputs({ user_id: userId })) {
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
      if (!this.getProjectConfig()) {
        this.errorReporter.report(NO_PROJECT_CONFIG_FAILURE, 'getFeatureVariable');
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

    const configObj = this.getProjectConfig();
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
    const configObj = this.getProjectConfig();
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
      if (!this.getProjectConfig()) {
        this.errorReporter.report(NO_PROJECT_CONFIG_FAILURE, 'getFeatureVariableBoolean');
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
      if (!this.getProjectConfig()) {
        this.errorReporter.report(NO_PROJECT_CONFIG_FAILURE, 'getFeatureVariableDouble');
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
      if (!this.getProjectConfig()) {
        this.errorReporter.report(NO_PROJECT_CONFIG_FAILURE, 'getFeatureVariableInteger');
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
      if (!this.getProjectConfig()) {
        this.errorReporter.report(NO_PROJECT_CONFIG_FAILURE, 'getFeatureVariableString');
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
      if (!this.getProjectConfig()) {
        this.errorReporter.report(NO_PROJECT_CONFIG_FAILURE, 'getFeatureVariableJSON');
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
      const configObj = this.getProjectConfig();

      if (!configObj) {
        this.errorReporter.report(NO_PROJECT_CONFIG_FAILURE, 'getAllFeatureVariables');
        return null;
      }

      if (!this.validateInputs({ feature_key: featureKey, user_id: userId }, attributes)) {
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
      const configObj = this.getProjectConfig();
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
   *
   * NOTE: After close is called, this instance is no longer usable - any events
   * generated will no longer be sent to the event dispatcher.
   *
   * @return {Promise}
   */
  close(): Promise<unknown> {    
    this.stop();
    return this.onTerminated();
  }

  stop(): void {
    if (this.isDone()) {
      return;
    }

    if (!this.isRunning()) {
      this.startPromise.reject(new Error(
        sprintf(SERVICE_STOPPED_BEFORE_RUNNING, 'Client')
      ));
    }

    this.state = ServiceState.Stopping;

    this.projectConfigManager.stop();
    this.eventProcessor?.stop();
    this.odpManager?.stop();
    this.notificationCenter.clearAllNotificationListeners();

    this.cleanupTasks.forEach((onClose) => onClose());

    Promise.all([
      this.projectConfigManager.onTerminated(),
      this.eventProcessor ? this.eventProcessor.onTerminated() : Promise.resolve(),
      this.odpManager ? this.odpManager.onTerminated() : Promise.resolve(),
    ]).then(() => {
      this.state = ServiceState.Terminated;
      this.stopPromise.resolve()
    }).catch((err) => {
      this.errorReporter.report(err);
      this.state = ServiceState.Failed;
      this.stopPromise.reject(err);
    });
  }

  /**
   * Returns a Promise that fulfills when this instance is ready to use (meaning
   * it has a valid datafile), or rejects when it has failed to become ready within a period of
   * time (configurable by the timeout property of the options argument), or when
   * this instance is closed via the close method before it became ready.
   *
   * If a static project config manager with a valid datafile was provided in the constructor,
   * the returned Promise is immediately fulfilled. If a polling config manager was provided, 
   * it will be used to fetch  a datafile, and the returned promise will fulfill if that fetch
   * succeeds, or it will reject if the datafile fetch does not complete before the timeout.
   * The default timeout is 30 seconds.
   *
   * The returned Promise is fulfilled with an unknown result which is not needed to 
   * be inspected to know that the instance is ready. If the promise is fulfilled, it
   * is guaranteed that the instance is ready to use. If the promise is rejected, it
   * means the instance is not ready to use, and the reason for the promise rejection 
   * will contain an error denoting the cause of failure.

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
    if (!isSafeInteger(timeoutValue)) {
      timeoutValue = DEFAULT_ONREADY_TIMEOUT;
    }

    const timeoutPromise = resolvablePromise();

    const cleanupTaskId = this.nextCleanupTaskId++;

    const onReadyTimeout = () => {
      this.cleanupTasks.delete(cleanupTaskId);
      timeoutPromise.reject(new Error(
        sprintf(ONREADY_TIMEOUT, timeoutValue)
      ));
    };
    
    const readyTimeout = setTimeout(onReadyTimeout, timeoutValue);
    
    this.cleanupTasks.set(cleanupTaskId, () => {
      clearTimeout(readyTimeout);
      timeoutPromise.reject(new Error(INSTANCE_CLOSED));
    });

    return Promise.race([this.onRunning().then(() => {
      clearTimeout(readyTimeout);
      this.cleanupTasks.delete(cleanupTaskId);
    }), timeoutPromise]);
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

    const userContext = new OptimizelyUserContext({
      optimizely: this,
      userId: userIdentifier,
      attributes,
    });

    this.onRunning().then(() => {
      if (this.odpManager && this.isOdpIntegrated()) {
        this.odpManager.identifyUser(userIdentifier);
      }
    }).catch(() => {});

    return userContext;
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
    });
  }

  decide(user: OptimizelyUserContext, key: string, options: OptimizelyDecideOption[] = []): OptimizelyDecision {
    const configObj = this.getProjectConfig();

    if (!configObj) {
      this.errorReporter.report(NO_PROJECT_CONFIG_FAILURE, 'decide');
      return newErrorDecision(key, user, [DECISION_MESSAGES.SDK_NOT_READY]);
    }

    return this.decideForKeys(user, [key], options, true)[key];
  }

  async decideAsync(user: OptimizelyUserContext, key: string, options: OptimizelyDecideOption[] = []): Promise<OptimizelyDecision> {
    const configObj = this.getProjectConfig();

    if (!configObj) {
      this.errorReporter.report(NO_PROJECT_CONFIG_FAILURE, 'decide');
      return newErrorDecision(key, user, [DECISION_MESSAGES.SDK_NOT_READY]);
    }

    const result = await this.decideForKeysAsync(user, [key], options, true);
    return result[key];
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
    return this.getDecisionForKeys('sync', user, keys, options, ignoreEnabledFlagOption).get();
  }

  decideForKeysAsync(
    user: OptimizelyUserContext,
    keys: string[],
    options: OptimizelyDecideOption[] = [],
    ignoreEnabledFlagOption?:boolean
  ): Promise<Record<string, OptimizelyDecision>> {
    return this.getDecisionForKeys('async', user, keys, options, ignoreEnabledFlagOption).get();
  }

  private getDecisionForKeys<OP extends OpType>(
    op: OP,
    user: OptimizelyUserContext,
    keys: string[],
    options: OptimizelyDecideOption[] = [],
    ignoreEnabledFlagOption?:boolean
  ): Value<OP, Record<string, OptimizelyDecision>> {
    const decisionMap: Record<string, OptimizelyDecision> = {};
    const flagDecisions: Record<string, DecisionObj> = {};
    const decisionReasonsMap: Record<string, DecisionReasons[]> = {};

    const configObj = this.getProjectConfig()

    if (!configObj) {
      this.errorReporter.report(NO_PROJECT_CONFIG_FAILURE, 'decideForKeys');
      return Value.of(op, decisionMap);
    }

    if (keys.length === 0) {
      return Value.of(op, decisionMap);
    }

    const allDecideOptions = this.getAllDecideOptions(options);

    if (ignoreEnabledFlagOption) {
      delete allDecideOptions[OptimizelyDecideOption.ENABLED_FLAGS_ONLY];
    }

    const validFlags: FeatureFlag[] = [];

    for(const key of keys) {
      const feature = configObj.featureKeyMap[key];
      if (!feature) {
        this.logger?.error(FEATURE_NOT_IN_DATAFILE, key);
        decisionMap[key] = newErrorDecision(key, user, [sprintf(DECISION_MESSAGES.FLAG_KEY_INVALID, key)]); 
        continue;
      }

      validFlags.push(feature);
    }

    return this.decisionService.resolveVariationsForFeatureList(op, configObj, validFlags, user, allDecideOptions)
      .then((decisionList) => {
        for(let i = 0; i < validFlags.length; i++) {
          const key = validFlags[i].key;
          const decision = decisionList[i];

          if(decision.error) {
            decisionMap[key] = newErrorDecision(key, user, decision.reasons.map(r => sprintf(r[0], ...r.slice(1))));
          } else {
            flagDecisions[key] = decision.result;
            decisionReasonsMap[key] = decision.reasons;
          }
        }

        for(const validFlag of validFlags) {
          const validKey = validFlag.key;

          // if there is already a value for this flag, that must have come from 
          // the newErrorDecision above, so we skip it
          if (decisionMap[validKey]) {
            continue;
          } 

          const decision = this.generateDecision(user, validKey, flagDecisions[validKey], decisionReasonsMap[validKey], allDecideOptions, configObj);

          if(!allDecideOptions[OptimizelyDecideOption.ENABLED_FLAGS_ONLY] || decision.enabled) {
            decisionMap[validKey] = decision;
          }
        }

        return Value.of(op, decisionMap);
      },
    );
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
    const decisionMap: { [key: string]: OptimizelyDecision } = {};
    const configObj = this.getProjectConfig();
    if (!configObj) {
      this.errorReporter.report(NO_PROJECT_CONFIG_FAILURE, 'decideAll');
      return decisionMap;
    }

    const allFlagKeys = Object.keys(configObj.featureKeyMap);

    return this.decideForKeys(user, allFlagKeys, options);
  }

  async decideAllAsync(
    user: OptimizelyUserContext,
    options: OptimizelyDecideOption[] = []
  ): Promise<Record<string, OptimizelyDecision>> {
    const decisionMap: { [key: string]: OptimizelyDecision } = {};
    const configObj = this.getProjectConfig();
    if (!configObj) {
      this.errorReporter.report(NO_PROJECT_CONFIG_FAILURE, 'decideAll');
      return decisionMap;
    }

    const allFlagKeys = Object.keys(configObj.featureKeyMap);

    return this.decideForKeysAsync(user, allFlagKeys, options);
  }

  /**
   * Updates ODP Config with most recent ODP key, host, pixelUrl, and segments from the project config
   */
  private updateOdpSettings(): void {
    const projectConfig = this.getProjectConfig();

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
    return this.getProjectConfig()?.odpIntegrationConfig?.integrated ?? false;
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
