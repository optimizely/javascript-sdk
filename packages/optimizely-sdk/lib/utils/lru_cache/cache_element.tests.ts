/**
 * Copyright 2022, Optimizely
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

import { assert } from 'chai';
import { CacheElement } from './cache_element';

const sleep = async (ms: number) => {
  return await new Promise(r => setTimeout(r, ms));
};

describe('/odp/lru_cache/CacheElement', () => {
  let element: CacheElement<string>;

  beforeEach(() => {
    element = new CacheElement('foo');
  });

  it('should initialize a valid CacheElement', () => {
    assert.exists(element);
    assert.equal(element.value, 'foo');
    assert.isNotNull(element.time);
    assert.doesNotThrow(() => element.is_stale(0));
  });

  it('should return false if not stale based on timeout', () => {
    const timeoutLong = 1000;
    assert.equal(element.is_stale(timeoutLong), false);
  });

  it('should return false if not stale because timeout is less than or equal to 0', () => {
    const timeoutNone = 0;
    assert.equal(element.is_stale(timeoutNone), false);
  });

  it('should return true if stale based on timeout', async () => {
    await sleep(100);
    const timeoutShort = 1;
    assert.equal(element.is_stale(timeoutShort), true);
  });
});
