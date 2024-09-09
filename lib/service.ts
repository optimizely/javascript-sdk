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

export interface Service {
  getState(): ServiceState;
  start(): void;
  onRunning(): Promise<void>;
  stop(): void;
  onTerminated(): Promise<void>;
}

export abstract class BaseService implements Service {
  protected state: ServiceState;
  protected startPromise: ResolvablePromise<void>;
  protected stopPromise: ResolvablePromise<void>;

  constructor() {
    this.state = ServiceState.New;
    this.startPromise = resolvablePromise();
    this.stopPromise = resolvablePromise();
    
    // avoid unhandled promise rejection
    this.startPromise.promise.catch(() => {});
    this.stopPromise.promise.catch(() => {});
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

  protected isNew(): boolean {
    return this.state === ServiceState.New;
  }
  
  protected isDone(): boolean {
    return [
      ServiceState.Stopping,
      ServiceState.Terminated,
      ServiceState.Failed
    ].includes(this.state);
  }

  abstract start(): void;
  abstract stop(): void;
}
