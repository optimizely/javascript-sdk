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
import { LoggerFacade } from '../modules/logging';
import { createOptimizelyConfig } from '../core/optimizely_config';
import {  OptimizelyConfig } from '../shared_types';
import { DatafileManager } from './datafile_manager';
import { ProjectConfig, toDatafile, tryCreatingProjectConfig } from './project_config';
import { scheduleMicrotask } from '../utils/microtask';
import { Service, ServiceState, BaseService } from '../service';
import { Consumer, Fn, Transformer } from '../utils/type';
import { EventEmitter } from '../utils/event_emitter/event_emitter';

interface ProjectConfigManagerConfig {
  // TODO: Don't use object type
  // eslint-disable-next-line  @typescript-eslint/ban-types
  datafile?: string | object;
  jsonSchemaValidator?: Transformer<unknown, boolean>,
  datafileManager?: DatafileManager;
  logger?: LoggerFacade;
}

export interface ProjectConfigManager extends Service {
  setLogger(logger: LoggerFacade): void;
  setSsr(isSsr?: boolean): void;
  getConfig(): ProjectConfig | undefined;
  getOptimizelyConfig(): OptimizelyConfig | undefined;
  onUpdate(listener: Consumer<ProjectConfig>): Fn;
}

/**
 * ProjectConfigManager provides project config objects via its methods
 * getConfig and onUpdate. It uses a DatafileManager to fetch datafile if provided.
 * It is responsible for parsing and validating datafiles, and converting datafile
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
  private isSsr = true;

  constructor(config: ProjectConfigManagerConfig) {
    super();
    this.logger = config.logger;
    this.jsonSchemaValidator = config.jsonSchemaValidator;
    this.datafile = config.datafile;
    this.datafileManager = config.datafileManager;
  }
  
  setLogger(logger: LoggerFacade): void {
    this.logger = logger;
  }

  start(): void {
    if (!this.isNew()) {
      return;
    }
    
    this.state = ServiceState.Starting;

    if(this.isSsr) {
      // If isSsr is true, we don't need to poll for datafile updates 
      this.datafileManager = undefined 
    }

    if (!this.datafile && !this.datafileManager) {
      const errorMessage = this.isSsr
        ? 'You must provide datafile in SSR'
        : 'You must provide at least one of sdkKey or datafile';
      // TODO: replace message with imported constants
      this.handleInitError(new Error(errorMessage));
      return;
    }

    if (this.datafile) {
      this.handleNewDatafile(this.datafile, true);
    }

    this.datafileManager?.start();

    // This handles the case where the datafile manager starts successfully. The 
    // datafile manager will only start successfully when it has downloaded a datafile,
    // an will fire an onUpdate event.
    this.datafileManager?.onUpdate(this.handleNewDatafile.bind(this));

    // If the datafile manager runs successfully, it will emit a onUpdate event. We can
    // handle the success case in the onUpdate handler. Hanlding the error case in the
    // catch callback
    this.datafileManager?.onRunning().catch((err) => {
      this.handleDatafileManagerError(err);
    });
  }

  private handleInitError(error: Error): void {
    this.logger?.error(error);
    this.state = ServiceState.Failed;
    this.datafileManager?.stop();
    this.startPromise.reject(error);
    this.stopPromise.reject(error);
  }

  private handleDatafileManagerError(err: Error): void {
    // TODO: replace message with imported constants
    this.logger?.error('datafile manager failed to start', err);

    // If datafile manager onRunning() promise is rejected, and the project config manager 
    // is still in starting state, that means a datafile was not provided in cofig or was invalid, 
    // otherwise the state would have already been set to running synchronously.
    // In this case, we cannot recover.
    if (this.isStarting()) {
      this.handleInitError(err);
    }
  }

  /**
   * Handle new datafile by attemping to create a new Project Config object. If successful and
   * the new config object's revision is newer than the current one, sets/updates the project config
   * and emits onUpdate event. If unsuccessful,
   * the project config and optimizely config objects will not be updated. If the error
   * is fatal, handleInitError will be called.
   */
  private handleNewDatafile(newDatafile: string | object, fromConfig = false): void {
    if (this.isDone()) {
      return;
    }

    try {
      const config = tryCreatingProjectConfig({
        datafile: newDatafile,
        jsonSchemaValidator: this.jsonSchemaValidator,
        logger: this.logger,
      });

      if(this.isStarting()) {
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
    } catch (err) {
      this.logger?.error(err);

      // if the state is starting and no datafileManager is provided, we cannot recover.
      // If the state is starting and the datafileManager has emitted a datafile,
      // that means a datafile was not provided in config or an invalid datafile was provided,
      // otherwise the state would have already been set to running synchronously.
      // If the first datafile emitted by the datafileManager is invalid, 
      // we consider this to be an initialization error as well.
      const fatalError = (this.isStarting() && !this.datafileManager) ||
        (this.isStarting() && !fromConfig);
      if (fatalError) {
        this.handleInitError(err);
      }
    }
  }

  getConfig(): ProjectConfig | undefined {
    return this.projectConfig;
  }

  getOptimizelyConfig(): OptimizelyConfig | undefined {
    if (!this.optimizelyConfig && this.projectConfig) {
      this.optimizelyConfig = createOptimizelyConfig(this.projectConfig, toDatafile(this.projectConfig), this.logger);
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

  stop(): void {
    if (this.isDone()) {
      return;
    }

    if (this.isNew() || this.isStarting()) {
      // TOOD: replace message with imported constants
      this.startPromise.reject(new Error('Datafile manager stopped before it could be started'));
    }

    this.state = ServiceState.Stopping;
    this.eventEmitter.removeAllListeners();
    if (!this.datafileManager) {
      this.state = ServiceState.Terminated;
      this.stopPromise.resolve();
      return;
    }

    this.datafileManager.stop();
    this.datafileManager.onTerminated().then(() => {
      this.state = ServiceState.Terminated;
      this.stopPromise.resolve();
    }).catch((err) => {
      this.state = ServiceState.Failed;
      this.stopPromise.reject(err);
    });
  }

  /**
   * Set the isSsr flag to indicate if the project config manager is being used in a server side rendering environment 
   * @param {Boolean} isSsr  
   * @returns {void}
   */
  setSsr(isSsr: boolean): void {
    this.isSsr = isSsr;
  }
}
