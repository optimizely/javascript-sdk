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
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { SerialRunner } from './serial_runner';
import { resolvablePromise } from '../promise/resolvablePromise';
import { exhaustMicrotasks } from '../../tests/testUtils';
import { Maybe } from '../type';

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
    // events to track execution order
    // begin_1 means call 1 started
    // end_1 means call 1 ended ... 
    const events: string[] = [];

    const nCall = 10;

    const promises = Array.from({ length: nCall }, () => resolvablePromise());
    const getFn = (i: number) => {
      return async (): Promise<number> => {
        events.push(`begin_${i}`);
        await promises[i];
        events.push(`end_${i}`);
        return i;
      }
    } 

    const resultPromises = [];
    for (let i = 0; i < nCall; i++) {
      resultPromises.push(serialRunner.run(getFn(i)));
    }

    await exhaustMicrotasks();
    
    const expectedEvents = ['begin_0'];

    expect(events).toEqual(expectedEvents);

    for(let i = 0; i < nCall - 1; i++) {
      promises[i].resolve('');
      await exhaustMicrotasks();

      expectedEvents.push(`end_${i}`);
      expectedEvents.push(`begin_${i+1}`);
      
      expect(events).toEqual(expectedEvents);
    }

    promises[nCall - 1].resolve('');
    await exhaustMicrotasks();
    
    expectedEvents.push(`end_${nCall - 1}`);
    expect(events).toEqual(expectedEvents);

    for(let i = 0; i < nCall; i++) {
      await expect(resultPromises[i]).resolves.toBe(i);
    }
  });

  it('should continue execution even if one function throws an error', async () => {
    const events: string[] = [];

    const nCall = 5;
    const err = [false, true, false, true, true];

    const promises = Array.from({ length: nCall }, () => resolvablePromise());

    const getFn = (i: number) => {
      return async (): Promise<number> => {
        events.push(`begin_${i}`);
        let err = false;
        try {
          await promises[i];
        } catch(e) {
          err = true;
        }

        events.push(`end_${i}`);
        if (err) {
          throw new Error(`error_${i}`);
        }
        return i;
      }
    } 

    const resultPromises = [];
    for (let i = 0; i < nCall; i++) {
      resultPromises.push(serialRunner.run(getFn(i)));
    }

    await exhaustMicrotasks();
    
    const expectedEvents = ['begin_0'];

    expect(events).toEqual(expectedEvents);

    const endFn = (i: number) => {
      if (err[i]) {
        promises[i].reject(new Error('error'));
      } else {
        promises[i].resolve('');
      }
    }

    for(let i = 0; i < nCall - 1; i++) {
      endFn(i);

      await exhaustMicrotasks();

      expectedEvents.push(`end_${i}`);
      expectedEvents.push(`begin_${i+1}`);
      
      expect(events).toEqual(expectedEvents);
    }

    endFn(nCall - 1);
    await exhaustMicrotasks();
    
    expectedEvents.push(`end_${nCall - 1}`);
    expect(events).toEqual(expectedEvents);

    for(let i = 0; i < nCall; i++) {
      if (err[i]) {
        await expect(resultPromises[i]).rejects.toThrow(`error_${i}`);
      } else {
        await expect(resultPromises[i]).resolves.toBe(i);
      }
    }
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