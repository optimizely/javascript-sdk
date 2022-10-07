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

/// <reference types="jest" />

import { ODP_USER_KEY } from './../../../utils/enums/index';
import { RequestHandler } from './../../../utils/http_request_handler/http';
import { GraphQLManager } from './../../../plugins/odp/graphql_manager';
import { mock, resetCalls, instance, verify, anything, when } from 'ts-mockito';

import { LogHandler } from './../../../../../logging/src/models';
import { LRUCache } from './../lru_cache/LRUCache';

import { assert } from 'chai';
import { OdpConfig } from '../OdpConfig';
import { OdpSegmentManager } from './OdpSegmentManager';
import { OptimizelyOdpOption } from '../OdpOption';

describe('/lib/core/odp/segment_manager (Default)', () => {
  class MockZaiusApiManager extends GraphQLManager {
    public async fetchSegments(
      apiKey: string,
      apiHost: string,
      userKey: ODP_USER_KEY,
      userValue: string,
      segmentsToCheck: string[]
    ): Promise<string[] | null> {
      if (apiKey == 'invalid-key') return null;
      return segmentsToCheck;
    }
  }

  const mockLogHandler = mock<LogHandler>();
  const mockRequestHandler = mock<RequestHandler>();

  let manager: OdpSegmentManager;
  let odpConfig: OdpConfig;
  const apiManager = new MockZaiusApiManager(instance(mockRequestHandler), instance(mockLogHandler));

  let options: Array<OptimizelyOdpOption> = [];

  const userKey: ODP_USER_KEY = ODP_USER_KEY.VUID;
  const userValue = 'test-user';

  beforeEach(() => {
    resetCalls(mockLogHandler);
    resetCalls(mockRequestHandler);

    odpConfig = new OdpConfig();
    const segmentsCache = new LRUCache<string, Array<string>>({
      maxSize: 1000,
      timeout: 1000,
    });

    manager = new OdpSegmentManager(odpConfig, segmentsCache, apiManager);
  });

  it('should fetch segments successfully on cache miss.', async () => {
    odpConfig.update('host', 'valid', ['new-customer']);
    setCache(userKey, '123', ['a']);

    const segments = await manager.fetchQualifiedSegments(userKey, userValue, options);
    assert.deepEqual(segments, ['new-customer']);
  });

  it('should fetch segments successfully on cache hit.', async () => {
    odpConfig.update('host', 'valid', ['new-customer']);
    setCache(userKey, userValue, ['a']);

    const segments = await manager.fetchQualifiedSegments(userKey, userValue, options);
    assert.deepEqual(segments, ['a']);
  });

  it('should throw an error when fetching segments returns an error.', async () => {
    odpConfig.update('host', 'invalid-key', ['new-customer']);

    const segments = await manager.fetchQualifiedSegments(userKey, userValue, []);
    assert.isNull(segments);
  });

  it('should ignore the cache if the option is included in the options array.', async () => {
    odpConfig.update('host', 'valid', ['new-customer']);
    setCache(userKey, userValue, ['a']);
    options = [OptimizelyOdpOption.IGNORE_CACHE];

    const segments = await manager.fetchQualifiedSegments(userKey, userValue, options);
    assert.deepEqual(segments, ['new-customer']);
    assert.equal(cacheCount(), 1);
  });

  it('should reset the cache if the option is included in the options array.', async () => {
    odpConfig.update('host', 'valid', ['new-customer']);
    setCache(userKey, userValue, ['a']);
    setCache(userKey, '123', ['a']);
    setCache(userKey, '456', ['a']);
    options = [OptimizelyOdpOption.RESET_CACHE];

    const segments = await manager.fetchQualifiedSegments(userKey, userValue, options);
    assert.deepEqual(segments, ['new-customer']);
    assert.deepEqual(peekCache(userKey, userValue), segments);
    assert.equal(cacheCount(), 1);
  });

  it('should make a valid cache key.', () => {
    assert.equal('vuid-$-test-user', manager.makeCacheKey(userKey, userValue));
  });

  // Utility Functions

  function setCache(userKey: string, userValue: string, value: Array<string>) {
    const cacheKey = manager.makeCacheKey(userKey, userValue);
    manager.segmentsCache.save({
      key: cacheKey,
      value,
    });
  }

  function peekCache(userKey: string, userValue: string): Array<string> | null {
    const cacheKey = manager.makeCacheKey(userKey, userValue);
    return manager.segmentsCache.peek(cacheKey);
  }

  const cacheCount = () => manager.segmentsCache.map.size;
});
