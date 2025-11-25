/**
 * Copyright 2022-2025, Optimizely
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
import { OpType, OpValue } from '../../utils/type';
import { Transformer } from '../../utils/type';
import { Platform } from '../../platform_support';



export interface OpCache<OP extends OpType, V> {
  operation: OP;
  save(key: string, value: V): OpValue<OP, unknown>;
  lookup(key: string): OpValue<OP, V | undefined>;
  reset(): OpValue<OP, unknown>;
}

export type SyncCache<V> = OpCache<'sync', V>;
export type AsyncCache<V> = OpCache<'async', V>;

export type Cache<V> = SyncCache<V> | AsyncCache<V>;

export interface OpCacheWithRemove<OP extends OpType, V> extends OpCache<OP, V> {
  remove(key: string): OpValue<OP, unknown>;
}

export type SyncCacheWithRemove<V> = OpCacheWithRemove<'sync', V>;
export type AsyncCacheWithRemove<V> = OpCacheWithRemove<'async', V>;
export type CacheWithRemove<V> = SyncCacheWithRemove<V> | AsyncCacheWithRemove<V>;

export const transformCache = <U, V> (
  cache: CacheWithRemove<U>,
  transformGet: Transformer<U, V>,
  transformSet: Transformer<V, U>,
): CacheWithRemove<V> => {
  const transform = <U, V>(value: U | undefined, transformer: Transformer<U, V>): V | undefined => {
    if (value === undefined) {
      return undefined;
    }
    return transformer(value);
  }

  const lookup: any = (key: string) => {
    if (cache.operation === 'sync') {
      return transform(cache.lookup(key), transformGet);
    }

    return cache.lookup(key).then((v) => transform(v, transformGet));
  }

  const save: any = (key: string, value: V) => {
    return cache.save(key, transformSet(value));
  }

  const transformedCache = {
    lookup,
    save,
  };

  Object.setPrototypeOf(transformedCache, cache);

  return transformedCache as CacheWithRemove<V>;
};

export const __platforms: Platform[] = ['__universal__'];
