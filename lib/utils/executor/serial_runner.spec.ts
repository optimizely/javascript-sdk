/**
 * Copyright 2025, Optimizely
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
import { describe, it, expect, beforeEach } from 'vitest';

import { SerialRunner } from './serial_runner';
import { resolvablePromise } from '../promise/resolvablePromise';
import { exhaustMicrotasks } from '../../tests/testUtils';

describe('SerialRunner', () => {
  let serialRunner: SerialRunner;

  beforeEach(() => {
    serialRunner = new SerialRunner();
  });

  it('should return result from a single async function', async () => {
    const fn = () => Promise.resolve('result');
    
    const result = await serialRunner.run(fn);
    
    expect(result).toBe('result');
  });

  it('should reject with same error when the passed function rejects', async () => {
    const error = new Error('test error');
    const fn = () => Promise.reject(error);
    
    await expect(serialRunner.run(fn)).rejects.toThrow(error);
  });

 it('should execute multiple async functions in order', async () => {
    const executionOrder: number[] = [];
    const promises = [resolvablePromise(), resolvablePromise(), resolvablePromise()];

    const createTask = (id: number) => async () => {
      executionOrder.push(id);
      await promises[id];
      return id;
    };

    const results = [serialRunner.run(createTask(0)), serialRunner.run(createTask(1)), serialRunner.run(createTask(2))];

    // only first task should have started
    await exhaustMicrotasks();
    expect(executionOrder).toEqual([0]);

    // Resolve first task - second should start
    promises[0].resolve('');
    await exhaustMicrotasks();
    expect(executionOrder).toEqual([0, 1]);

    // Resolve second task - third should start
    promises[1].resolve('');
    await exhaustMicrotasks();
    expect(executionOrder).toEqual([0, 1, 2]);

    // Resolve third task - all done
    promises[2].resolve('');

    // Verify all results are correct
    expect(await results[0]).toBe(0);
    expect(await results[1]).toBe(1);
    expect(await results[2]).toBe(2);
  });

  it('should continue execution even if one function throws an error', async () => {
    const executionOrder: number[] = [];
    const promises = [resolvablePromise(), resolvablePromise(), resolvablePromise()];

    const createTask = (id: number) => async () => {
      executionOrder.push(id);
      await promises[id];
      return id;
    };

    const results = [serialRunner.run(createTask(0)), serialRunner.run(createTask(1)), serialRunner.run(createTask(2))];

    // only first task should have started
    await exhaustMicrotasks();
    expect(executionOrder).toEqual([0]);

    // reject first task - second should still start
    promises[0].reject(new Error('first error'));
    await exhaustMicrotasks();
    expect(executionOrder).toEqual([0, 1]);

    // reject second task - third should still start
    promises[1].reject(new Error('second error'));
    await exhaustMicrotasks();
    expect(executionOrder).toEqual([0, 1, 2]);

    // Resolve third task - all done
    promises[2].resolve('');

    // Verify results - first and third succeed, second fails
    await expect(results[0]).rejects.toThrow('first error');
    await expect(results[1]).rejects.toThrow('second error');
    await expect(results[2]).resolves.toBe(2);
  });

  it('should handle functions that return different types', async () => {
    const numberFn = () => Promise.resolve(42);
    const stringFn = () => Promise.resolve('hello');
    const objectFn = () => Promise.resolve({ key: 'value' });
    const arrayFn = () => Promise.resolve([1, 2, 3]);
    const booleanFn = () => Promise.resolve(true);
    const nullFn = () => Promise.resolve(null);
    const undefinedFn = () => Promise.resolve(undefined);

    const results = await Promise.all([
      serialRunner.run(numberFn),
      serialRunner.run(stringFn),
      serialRunner.run(objectFn),
      serialRunner.run(arrayFn),
      serialRunner.run(booleanFn),
      serialRunner.run(nullFn),
      serialRunner.run(undefinedFn),
    ]);

    expect(results).toEqual([42, 'hello', { key: 'value' }, [1, 2, 3], true, null, undefined]);
  });

  it('should handle empty function that returns undefined', async () => {
    const emptyFn = () => Promise.resolve(undefined);
    
    const result = await serialRunner.run(emptyFn);
    
    expect(result).toBeUndefined();
  });
});