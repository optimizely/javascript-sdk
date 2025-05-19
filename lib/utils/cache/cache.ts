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
