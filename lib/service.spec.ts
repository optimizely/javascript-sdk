import { it, expect } from 'vitest';
import { BaseService, ServiceState } from './service';

class TestService extends BaseService {
  constructor() {
    super();
  }

  start(): void {
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
