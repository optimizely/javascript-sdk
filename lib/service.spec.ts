/**
 * Copyright 2024, Optimizely
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

import { it, expect } from 'vitest';
import { BaseService, ServiceState, StartupLog } from './service';
import { LogLevel } from './logging/logger';
import { getMockLogger } from './tests/mock/mock_logger';
class TestService extends BaseService {
  constructor(startUpLogs?: StartupLog[]) {
    super(startUpLogs);
  }

  start(): void {
    super.start();
    this.setState(ServiceState.Running);
    this.startPromise.resolve();
  }

  failStart(): void {
    this.setState(ServiceState.Failed);
    this.startPromise.reject();
  }

  stop(): void {
    this.setState(ServiceState.Running);
    this.startPromise.resolve();
  }

  failStop(): void { 
    this.setState(ServiceState.Failed);
    this.startPromise.reject();
  }
  
  setState(state: ServiceState): void {
    this.state = state;
  }
}


it('should set state to New on construction', async () => {
  const service = new TestService();
  expect(service.getState()).toBe(ServiceState.New);
});

it('should return correct state when getState() is called', () => {
  const service = new TestService();
  expect(service.getState()).toBe(ServiceState.New);
  service.setState(ServiceState.Running);
  expect(service.getState()).toBe(ServiceState.Running);
  service.setState(ServiceState.Terminated);
  expect(service.getState()).toBe(ServiceState.Terminated);
  service.setState(ServiceState.Failed);
  expect(service.getState()).toBe(ServiceState.Failed);
});

it('should log startupLogs on start', () => {
  const startUpLogs: StartupLog[] = [
    {
      level: LogLevel.Warn,
      message: 'warn message',
      params: [1, 2]
    },
    {
      level: LogLevel.Error,
      message: 'error message',
      params: [3, 4]
    },
  ];

  const logger = getMockLogger();
  const service = new TestService(startUpLogs);
  service.setLogger(logger);
  service.start();

  expect(logger.warn).toHaveBeenCalledTimes(1);
  expect(logger.error).toHaveBeenCalledTimes(1);
  expect(logger.warn).toHaveBeenCalledWith('warn message', 1, 2);
  expect(logger.error).toHaveBeenCalledWith('error message', 3, 4);
});

it('should return an appropraite promise when onRunning() is called', () => {
  const service1 = new TestService();
  const onRunning1 = service1.onRunning();

  const service2 = new TestService();
  const onRunning2 = service2.onRunning();

  return new Promise<void>((done) => {
    Promise.all([
      onRunning1.then(() => {
        expect(service1.getState()).toBe(ServiceState.Running);
      }), onRunning2.catch(() => {
        expect(service2.getState()).toBe(ServiceState.Failed);
      })
    ]).then(() => done());

    service1.start();
    service2.failStart();
  });
});

it('should return an appropraite promise when onRunning() is called', () => {
  const service1 = new TestService();
  const onRunning1 = service1.onRunning();

  const service2 = new TestService();
  const onRunning2 = service2.onRunning();

  return new Promise<void>((done) => {
    Promise.all([
      onRunning1.then(() => {
        expect(service1.getState()).toBe(ServiceState.Running);
      }), onRunning2.catch(() => {
        expect(service2.getState()).toBe(ServiceState.Failed);
      })
    ]).then(() => done());

    service1.start();
    service2.failStart();
  });
});
