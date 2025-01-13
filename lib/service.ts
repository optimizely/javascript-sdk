/**
 * Copyright 2024 Optimizely
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

import { LoggerFacade, LogLevel } from "./modules/logging";
import { resolvablePromise, ResolvablePromise } from "./utils/promise/resolvablePromise";


/**
 * The service interface represents an object with an operational state,
 * with methods to start and stop. The design of this interface in modelled
 * after Guava Service interface (https://github.com/google/guava/wiki/ServiceExplained).
 */

export enum ServiceState {
  New,
  Starting,
  Running,
  Stopping,
  Terminated,
  Failed,
}

export type StartupLog = {
  level: LogLevel;
  message: string;
  params: any[];
}

export interface Service {
  getState(): ServiceState;
  start(): void;
  // onRunning will reject if the service fails to start
  // or stopped before it could start.
  // It will resolve if the service is starts successfully.
  onRunning(): Promise<void>;
  stop(): void;
  // onTerminated will reject if the service enters a failed state
  // either by failing to start or stop.
  // It will resolve if the service is stopped successfully.
  onTerminated(): Promise<void>;
  makeDisposable(): void;
}

export abstract class BaseService implements Service {
  protected state: ServiceState;
  protected startPromise: ResolvablePromise<void>;
  protected stopPromise: ResolvablePromise<void>;
  protected logger?: LoggerFacade;
  protected startupLogs: StartupLog[];
  protected disposable = false;
  constructor(startupLogs: StartupLog[] = []) {
    this.state = ServiceState.New;
    this.startPromise = resolvablePromise();
    this.stopPromise = resolvablePromise();
    this.startupLogs = startupLogs;
    
    // avoid unhandled promise rejection
    this.startPromise.promise.catch(() => {});
    this.stopPromise.promise.catch(() => {});
  }

  makeDisposable(): void {
    this.disposable = true;
  }

  setLogger(logger: LoggerFacade): void {
    this.logger = logger;
  }

  protected printStartupLogs(): void {
    this.startupLogs.forEach(({ level, message, params }) => {
      this.logger?.log(level, message, ...params);
    });
  }

  onRunning(): Promise<void> {
    return this.startPromise.promise;
  }

  onTerminated(): Promise<void> {
    return this.stopPromise.promise;
  }

  getState(): ServiceState {
    return this.state;
  }

  isStarting(): boolean {
    return this.state === ServiceState.Starting;
  }

  isRunning(): boolean {
    return this.state === ServiceState.Running;
  }
  
  isNew(): boolean {
    return this.state === ServiceState.New;
  }
  
  isDone(): boolean {
    return [
      ServiceState.Stopping,
      ServiceState.Terminated,
      ServiceState.Failed
    ].includes(this.state);
  }

  start(): void {
    this.printStartupLogs();
  }
  
  abstract stop(): void;
}
