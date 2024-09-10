/**
 * Copyright 2019-2022, 2024, Optimizely
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
import { getLogger, LoggerFacade } from '../modules/logging';
import { sprintf } from '../utils/fns';

import { ERROR_MESSAGES } from '../utils/enums';
import { createOptimizelyConfig } from '../core/optimizely_config';
import {  OptimizelyConfig } from '../shared_types';
import { DatafileManager } from './datafileManager';
import { ProjectConfig, toDatafile, tryCreatingProjectConfig } from '../project_config';
import { scheduleMicrotask } from '../utils/microtask';
import { Service, ServiceState, BaseService } from '../service';
import { Consumer, Fn, Transformer } from '../utils/type';
import { EventEmitter } from '../utils/event_emitter/eventEmitter';


const logger = getLogger();
const MODULE_NAME = 'PROJECT_CONFIG_MANAGER';

interface ProjectConfigManagerConfig {
  // TODO[OASIS-6649]: Don't use object type
  // eslint-disable-next-line  @typescript-eslint/ban-types
  datafile?: string | object;
  jsonSchemaValidator?: Transformer<unknown, boolean>,
  datafileManager?: DatafileManager;
}

export interface ProjectConfigManager extends Service {
  setLogger(logger: LoggerFacade): void;
  getConfig(): ProjectConfig | undefined;
  getOptimizelyConfig(): OptimizelyConfig | undefined;
  onUpdate(listener: Consumer<ProjectConfig>): Fn;
}

/**
 * ProjectConfigManager provides project config objects via its methods
 * getConfig and onUpdate. It uses a DatafileManager to fetch datafiles. It is
 * responsible for parsing and validating datafiles, and converting datafile
 * string into project config objects.
 * @param {ProjectConfigManagerConfig}    config
 */
export class ProjectConfigManagerImpl extends BaseService implements ProjectConfigManager {
  private datafile?: string | object;
  private projectConfig?: ProjectConfig;
  private optimizelyConfig?: OptimizelyConfig;
  public jsonSchemaValidator?: Transformer<unknown, boolean>;
  public datafileManager?: DatafileManager;
  private eventEmitter: EventEmitter<{ update: ProjectConfig }> = new EventEmitter();
  private logger?: LoggerFacade;

  constructor(config: ProjectConfigManagerConfig) {
    super();

    this.jsonSchemaValidator = config.jsonSchemaValidator;
    this.datafile = config.datafile;
    this.datafileManager = config.datafileManager;
  }
  
  setLogger(logger: LoggerFacade): void {
    this.logger = logger;
  }

  getState(): ServiceState {
    return this.state;
  }

  onRunning(): Promise<void> {
    return this.startPromise.promise;
  }

  onTerminated(): Promise<void> {
    return this.stopPromise.promise;
  }

  start() {
    if (!this.datafile && !this.datafileManager) {
      this.handleInitError(new Error('You must provide at least one of sdkKey or datafile'));
      return;
    }

    if (this.datafile) {
      this.handleNewDatafile(this.datafile);
    }

    this.datafileManager?.start();
    this.datafileManager?.onUpdate((this.handleNewDatafile.bind(this)));
    this.datafileManager?.onRunning().catch((err) => {
      this.handleDatafileManagerError(err);
    });
  }

    // try {
    //   if (!config.datafile && !config.sdkKey) {
    //     const datafileAndSdkKeyMissingError = new Error(
    //       sprintf(ERROR_MESSAGES.DATAFILE_AND_SDK_KEY_MISSING, MODULE_NAME)
    //     );
    //     this.readyPromise = Promise.resolve({
    //       success: false,
    //       reason: getErrorMessage(datafileAndSdkKeyMissingError),
    //     });
    //     logger.error(datafileAndSdkKeyMissingError);
    //     return;
    //   }

    //   let handleNewDatafileException = null;
    //   if (config.datafile) {
    //     handleNewDatafileException = this.handleNewDatafile(config.datafile);
    //   }

    //   if (config.sdkKey && config.datafileManager) {
    //     this.datafileManager = config.datafileManager;
    //     this.datafileManager.start();

    //     this.readyPromise = this.datafileManager
    //       .onReady()
    //       .then(this.onDatafileManagerReadyFulfill.bind(this), this.onDatafileManagerReadyReject.bind(this));
    //     this.datafileManager.on('update', this.onDatafileManagerUpdate.bind(this));
    //   } else if (this.projectConfig) {
    //     this.readyPromise = Promise.resolve({
    //       success: true,
    //     });
    //   } else {
    //     this.readyPromise = Promise.resolve({
    //       success: false,
    //       reason: getErrorMessage(handleNewDatafileException, 'Invalid datafile'),
    //     });
    //   }
    // } catch (ex) {
    //   logger.error(ex);
    //   this.readyPromise = Promise.resolve({
    //     success: false,
    //     reason: getErrorMessage(ex, 'Error in initialize'),
    //   });
    // }
  // }

  private handleInitError(error: Error): void {
    logger.error(error);
    this.state = ServiceState.Failed;
    this.datafileManager?.stop();
    this.startPromise.reject(error);
    this.stopPromise.reject(error);
  }

  /**
   * Respond to datafile manager's onReady promise becoming fulfilled.
   * If there are validation or parse failures using the datafile provided by
   * DatafileManager, ProjectConfigManager's ready promise is resolved with an
   * unsuccessful result. Otherwise, ProjectConfigManager updates its own project
   * config object from the new datafile, and its ready promise is resolved with a
   * successful result.
   */
  // private onDatafileManagerReadyFulfill(): OnReadyResult {
  //   if (this.datafileManager) {
  //     const newDatafileError = this.handleNewDatafile(this.datafileManager.get());
  //     if (newDatafileError) {
  //       return {
  //         success: false,
  //         reason: getErrorMessage(newDatafileError),
  //       };
  //     }
  //     return { success: true };
  //   }

  //   return {
  //     success: false,
  //     reason: getErrorMessage(null, 'Datafile manager is not provided'),
  //   };
  // }

  /**
   * Respond to datafile manager's onRunning promise becoming rejected.
   * When DatafileManager's onReady promise is rejected, if a datafile was not provided and therefore
   * the projectConfigManager is still in New state, there is no possibility
   * of obtaining a datafile. In this case, ProjectConfigManager's ready promise
   * is fulfilled with an unsuccessful result.
   * @param   {Error}   err
   * @returns {Object}
   */
  private handleDatafileManagerError(err: Error): void {
    if (this.isNew()) {
      this.handleInitError(err);
    }
  }

  /**
   * Handle new datafile by attemping to create a new Project Config object. If successful and
   * the new config object's revision is newer than the current one, sets/updates the project config
   * and optimizely config object instance variables and returns null for the error. If unsuccessful,
   * the project config and optimizely config objects will not be updated, and the error is returned.
   * @param   {string | object}        newDatafile
   * @returns {Error|null}    error or null
   */
  private handleNewDatafile(newDatafile: string | object): void {
    const configOrError = tryCreatingProjectConfig({
      datafile: newDatafile,
      jsonSchemaValidator: this.jsonSchemaValidator,
      logger: logger,
    });

    if (configOrError instanceof Error) {
      logger.error(configOrError);
      // the provided datafile is invalid
      // and no datafile manager is provided
      // so there is no way to recover
      if (this.isNew() && !this.datafileManager) {
        this.handleInitError(configOrError);
      }
      return;
    }

    const config = configOrError;

    if(this.isNew()) {
      this.state = ServiceState.Running;
      this.startPromise.resolve();
    }

    if (this.projectConfig?.revision !== config.revision) {
      this.projectConfig = config;
      this.optimizelyConfig = undefined;
      scheduleMicrotask(() => {
        this.eventEmitter.emit('update', config);
      }) 
    }
  }

  /**
   * Returns the current project config object, or null if no project config object
   * is available
   * @return {ProjectConfig|null}
   */
  getConfig(): ProjectConfig | undefined {
    return this.projectConfig;
  }

  /**
   * Returns the optimizely config object or null
   * @return {OptimizelyConfig|null}
   */
  getOptimizelyConfig(): OptimizelyConfig | undefined {
    if (!this.optimizelyConfig && this.projectConfig) {
      this.optimizelyConfig = createOptimizelyConfig(this.projectConfig, toDatafile(this.projectConfig), logger);
    }
    return this.optimizelyConfig;
  }

  /**
   * Add a listener for project config updates. The listener will be called
   * whenever this instance has a new project config object available.
   * Returns a dispose function that removes the subscription
   * @param  {Function} listener
   * @return {Function}
   */
  onUpdate(listener: Consumer<ProjectConfig>): Fn {
    return this.eventEmitter.on('update', listener);
  }

  /**
   * Stop the internal datafile manager and remove all update listeners
   */
  stop(): void {
    this.state = ServiceState.Stopping;
    this.state = ServiceState.Stopping;
    this.eventEmitter.removeAllListeners();

    if (this.datafileManager) {
      this.datafileManager.stop();
      this.datafileManager.onTerminated().then(() => {
        this.state = ServiceState.Terminated;
        this.stopPromise.resolve();
      }).catch((err) => {
        this.state = ServiceState.Failed;
        this.stopPromise.reject(err);
      });
    }
  }
}
