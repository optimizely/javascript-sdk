import { LoggerFacade } from '../modules/logging';
import { ProjectConfigManager } from './project_config_manager';
import { ServiceState } from '../service';
import { EventEmitter } from '../utils/event_emitter/event_emitter';
import { ResolvablePromise, resolvablePromise } from '../utils/promise/resolvablePromise';
import { ProjectConfig, tryCreatingProjectConfig, toDatafile } from '../core/project_config';
import { createOptimizelyConfig } from '../core/optimizely_config';
import { Consumer, Fn } from '../utils/type';
import { OptimizelyConfig } from '../shared_types';

export class StaticProjectConfigManager implements ProjectConfigManager {
  private datafile: string | object;
  private logger?: LoggerFacade;
  private config?: ProjectConfig;
  private optimizelyConfig?: OptimizelyConfig;
  private state: ServiceState;

  private startPromise: ResolvablePromise<void>;
  private stopPrommise: ResolvablePromise<void>;

  private eventEmitter: EventEmitter<{ update: ProjectConfig }> = new EventEmitter();

  constructor(datafile: string | object, logger?: LoggerFacade) {
    this.state = ServiceState.New;
    this.datafile = datafile;
    this.logger = logger;
    this.startPromise = resolvablePromise();
    this.stopPrommise = resolvablePromise();
  }

  getOptimizelyConfig(): OptimizelyConfig | undefined {
    return this.optimizelyConfig;
  }

  getState(): ServiceState {
    return this.state;
  }

  setLogger(logger: LoggerFacade) {
    this.logger = logger;
  }
  
  
  start() {
    if (this.state != ServiceState.New) {
      return;
    }

    const { configObj: config, error } = tryCreatingProjectConfig({
      datafile: this.datafile,
      logger: this.logger,
    });

    this.config = config || undefined;

    if (this.config) {
      this.optimizelyConfig = createOptimizelyConfig(
        this.config, toDatafile(this.config), this.logger);
      this.state = ServiceState.Running;
      this.startPromise.resolve();
      this.eventEmitter.emit('update', this.config);
    } else {
      this.state = ServiceState.Failed;
      this.startPromise.reject(error);
      this.stopPrommise.resolve();
    }
  }

  onRunning(): Promise<void> {
    return this.startPromise.promise;
  }

  getConfig(): ProjectConfig | undefined {
    return this.config;
  }

  onUpdate(listener: Consumer<ProjectConfig>): Fn {
    return this.eventEmitter.on('update', listener);
  }

  isInTerminalState() {
    return (this.state === ServiceState.Failed 
      || this.state === ServiceState.Terminated);
  }

  stop() {
    if (this.isInTerminalState()) {
      return;
    }

    this.state = ServiceState.Terminated;
    this.stopPrommise.resolve();
  }

  onTerminated() {
    return this.stopPrommise.promise;
  }
}
