import { test, vi, expect } from 'vitest';

import { StaticProjectConfigManager } from './static_project_config_manager';
import { ServiceState } from '../service';
import testData from '../tests/test_data';
import { advanceTimersByTime } from '../../tests/testUtils';

test('state is New on instatiation', () => {
  const configManagaer = new StaticProjectConfigManager({});
  expect(configManagaer.getState()).toEqual(ServiceState.New);
});

test('promise returned from onRunning is is not fulfilled until start() is called', async() => {
  const configManagaer = new StaticProjectConfigManager({});
  const startSpy = vi.spyOn(configManagaer, 'start');
  const promiseSpy = vi.fn();

  configManagaer.onRunning().then(promiseSpy, promiseSpy);

  vi.useFakeTimers();
  await advanceTimersByTime(10000);

  expect(promiseSpy).not.toHaveBeenCalled();

  configManagaer.start();
  await Promise.resolve();

  expect(promiseSpy).toHaveBeenCalledOnce();
  vi.useRealTimers();
});

test('promise returned from onRunning is rejected in case of invalid datafile', () => {
  const configManagaer = new StaticProjectConfigManager({});
  configManagaer.start();
  expect(configManagaer.onRunning()).rejects.toBeInstanceOf(Error);
});

test('promise returned from onRunning is rejected in case of invalid datafile', () => {
  const configManagaer = new StaticProjectConfigManager({});
  configManagaer.start();
  expect(configManagaer.onRunning()).rejects.toBeInstanceOf(Error);
});

test('promise returned from onRunning is resolved in case of valid datafile', () => {
  const configManagaer = new StaticProjectConfigManager(testData.getTestProjectConfig());
  configManagaer.start();
  expect(configManagaer.onRunning()).resolves.toBeUndefined();
});
