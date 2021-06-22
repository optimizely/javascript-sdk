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
import { sprintf } from '@optimizely/js-sdk-utils';
import { getLogger } from '@optimizely/js-sdk-logging';

import { DefaultHttpPollingDatafileManager, createHttpPollingDatafileManager } from '../datafile_manager';
import fns from '../../utils/fns';
import { ERROR_MESSAGES } from '../../utils/enums';
import projectConfig from '../../core/project_config';
import { createOptimizelyConfig } from '../optimizely_config';
import { OptimizelyConfig, DatafileOptions } from '../../shared_types';
import { ProjectConfig } from '../project_config';

const logger = getLogger();
const MODULE_NAME = 'PROJECT_CONFIG_MANAGER';

interface ProjectConfigManagerConfig {
  datafile?: string,
  datafileOptions?: DatafileOptions,
  jsonSchemaValidator?: {
    validate(jsonObject: unknown): boolean,
  };
  sdkKey?: string,
}

interface DatafileManagerConfig {
  sdkKey: string,
  datafile?: string;
}

/**
 * Return an error message derived from a thrown value. If the thrown value is
 * an error, return the error's message property. Otherwise, return a default
 * provided by the second argument.
 * @param  {Error|null}                   maybeError
 * @param  {string}                       defaultMessage
 * @return {string}
 */
function getErrorMessage(maybeError: Error | null, defaultMessage?: string): string {
  if (maybeError instanceof Error) {
    return maybeError.message;
  }
  return defaultMessage || 'Unknown error';
}

/**
 * ProjectConfigManager provides project config objects via its methods
 * getConfig and onUpdate. It uses a DatafileManager to fetch datafiles. It is
 * responsible for parsing and validating datafiles, and converting datafile
 * string into project config objects.
 * @param {ProjectConfigManagerConfig}    config
 */
export class ProjectConfigManager {
  private updateListeners: Array<(config: ProjectConfig) => void>;
  private configObj: ProjectConfig | null;
  private optimizelyConfigObj: OptimizelyConfig | null;
  private readyPromise: Promise<{ success: boolean; reason?: string }>;
  private jsonSchemaValidator: { validate(jsonObject: unknown): boolean } | undefined;
  private datafileManager: DefaultHttpPollingDatafileManager | null;

  constructor(config: ProjectConfigManagerConfig) {
    try {
      this.configObj = null;
      this.optimizelyConfigObj = null;
      this.updateListeners = [];
      this.jsonSchemaValidator = config.jsonSchemaValidator;
      this.datafileManager = null;

      if (!config.datafile && !config.sdkKey) {
        const datafileAndSdkKeyMissingError = new Error(sprintf(ERROR_MESSAGES.DATAFILE_AND_SDK_KEY_MISSING, MODULE_NAME));
        this.readyPromise = Promise.resolve({
          success: false,
          reason: getErrorMessage(datafileAndSdkKeyMissingError),
        });
        logger.error(datafileAndSdkKeyMissingError);
        return;
      }

      let handleNewDatafileException = null;
      if (config.datafile) {
        handleNewDatafileException = this.handleNewDatafile(config.datafile);
      }

      if (config.sdkKey) {
        const datafileManagerConfig: DatafileManagerConfig = {
          sdkKey: config.sdkKey,
        };
        if (this.validateDatafileOptions(config.datafileOptions)) {
          fns.assign(datafileManagerConfig, config.datafileOptions);
        }
        if (this.configObj) {
          datafileManagerConfig.datafile = projectConfig.toDatafile(this.configObj)
        }
        this.datafileManager = createHttpPollingDatafileManager(datafileManagerConfig);
        this.datafileManager.start();
        this.readyPromise = this.datafileManager
          .onReady()
          .then(this.onDatafileManagerReadyFulfill.bind(this), this.onDatafileManagerReadyReject.bind(this));
        this.datafileManager.on('update', this.onDatafileManagerUpdate.bind(this));
      } else if (this.configObj) {
        this.readyPromise = Promise.resolve({
          success: true,
        });
      } else {
        this.readyPromise = Promise.resolve({
          success: false,
          reason: getErrorMessage(handleNewDatafileException, 'Invalid datafile'),
        });
      }
    } catch (ex) {
      logger.error(ex);
      this.updateListeners = [];
      this.configObj = null;
      this.optimizelyConfigObj = null;
      this.datafileManager = null;
      this.readyPromise = Promise.resolve({
        success: false,
        reason: getErrorMessage(ex, 'Error in initialize'),
      });
    }
  }

  /**
   * Respond to datafile manager's onReady promise becoming fulfilled.
   * If there are validation or parse failures using the datafile provided by
   * DatafileManager, ProjectConfigManager's ready promise is resolved with an
   * unsuccessful result. Otherwise, ProjectConfigManager updates its own project
   * config object from the new datafile, and its ready promise is resolved with a
   * successful result.
   */
  private onDatafileManagerReadyFulfill(): { success: boolean; reason?: string } {
    if (this.datafileManager) {
      const newDatafileError = this.handleNewDatafile(this.datafileManager.get());
      if (newDatafileError) {
        return {
          success: false,
          reason: getErrorMessage(newDatafileError),
        };
      }
      return { success: true };
    }

    return {
      success: false,
      reason: getErrorMessage(null, 'Datafile manager is not provided'),
    }
  }

  /**
   * Respond to datafile manager's onReady promise becoming rejected.
   * When DatafileManager's onReady promise is rejected, there is no possibility
   * of obtaining a datafile. In this case, ProjectConfigManager's ready promise
   * is fulfilled with an unsuccessful result.
   * @param   {Error}   err
   * @returns {Object}
   */
  private onDatafileManagerReadyReject(err: Error): { success: boolean; reason: string } {
    return {
      success: false,
      reason: getErrorMessage(err, 'Failed to become ready'),
    };
  }

  /**
   * Respond to datafile manager's update event. Attempt to update own config
   * object using latest datafile from datafile manager. Call own registered
   * update listeners if successful
   */
  private onDatafileManagerUpdate(): void {
    if (this.datafileManager) {
      this.handleNewDatafile(this.datafileManager.get());
    }
  }

  /**
   * Validate user-provided datafileOptions. It should be an object or undefined.
   * @param {DatafileOptions|undefined} datafileOptions
   * @returns {boolean}
   */
  private validateDatafileOptions(datafileOptions: DatafileOptions | undefined): boolean {
    if (typeof datafileOptions === 'undefined') {
      return true;
    }

    if (typeof datafileOptions === 'object') {
      return datafileOptions !== null;
    }

    return false;
  }

  /**
   * Handle new datafile by attemping to create a new Project Config object. If successful and
   * the new config object's revision is newer than the current one, sets/updates the project config
   * and optimizely config object instance variables and returns null for the error. If unsuccessful,
   * the project config and optimizely config objects will not be updated, and the error is returned.
   * @param   {string}        newDatafile
   * @returns {Error|null}    error
   */
  private handleNewDatafile(newDatafile: string): Error | null {
    const { configObj, error } = projectConfig.tryCreatingProjectConfig({
      datafile: newDatafile,
      jsonSchemaValidator: this.jsonSchemaValidator,
      logger: logger
    });

    if (error) {
      logger.error(error);
    } else {
      const oldRevision = this.configObj ? this.configObj.revision : 'null';
      if (configObj && oldRevision !== configObj.revision) {
        this.configObj = configObj;
        this.optimizelyConfigObj = createOptimizelyConfig(this.configObj, projectConfig.toDatafile(this.configObj));
        this.updateListeners.forEach((listener) => {
          listener(configObj);
        });
      }
    }

    return error;
  }

  /**
   * Returns the current project config object, or null if no project config object
   * is available
   * @return {ProjectConfig|null}
   */
  getConfig(): ProjectConfig | null {
    return this.configObj;
  }

  /**
   * Returns the optimizely config object or null
   * @return {OptimizelyConfig|null}
   */
  getOptimizelyConfig(): OptimizelyConfig | null {
    return this.optimizelyConfigObj;
  }

  /**
   * Returns a Promise that fulfills when this ProjectConfigManager is ready to
   * use (meaning it has a valid project config object), or has failed to become
   * ready.
   *
   * Failure can be caused by the following:
   * - At least one of sdkKey or datafile is not provided in the constructor argument
   * - The provided datafile was invalid
   * - The datafile provided by the datafile manager was invalid
   * - The datafile manager failed to fetch a datafile
   *
   * The returned Promise is fulfilled with a result object containing these
   * properties:
   *    - success (boolean): True if this instance is ready to use with a valid
   *                         project config object, or false if it failed to
   *                         become ready
   *    - reason (string=):  If success is false, this is a string property with
   *                         an explanatory message.
   * @return {Promise}
   */
  onReady(): Promise<{ success: boolean; reason?: string }> {
    return this.readyPromise;
  }

  /**
   * Add a listener for project config updates. The listener will be called
   * whenever this instance has a new project config object available.
   * Returns a dispose function that removes the subscription
   * @param  {Function} listener
   * @return {Function}
   */
  onUpdate(listener: (config: ProjectConfig) => void): (() => void) {
    this.updateListeners.push(listener);
    return () => {
      const index = this.updateListeners.indexOf(listener);
      if (index > -1) {
        this.updateListeners.splice(index, 1);
      }
    };
  }

  /**
   * Stop the internal datafile manager and remove all update listeners
   */
  stop(): void {
    if (this.datafileManager) {
      this.datafileManager.stop();
    }
    this.updateListeners = [];
  }
}

export function createProjectConfigManager(config: ProjectConfigManagerConfig): ProjectConfigManager {
  return new ProjectConfigManager(config);
}
