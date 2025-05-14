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

import { Transformer } from '../../utils/type';
import { Maybe } from '../../utils/type';
import { OpType, OpValue } from '../../utils/type';

export interface OpStore<OP extends OpType, V> {
  operation: OP;
  set(key: string, value: V): OpValue<OP, unknown>;
  get(key: string): OpValue<OP, Maybe<V>>;
  remove(key: string): OpValue<OP, unknown>;
  getKeys(): OpValue<OP, string[]>;
}

export type SyncStore<V> = OpStore<'sync', V>;
export type AsyncStore<V> = OpStore<'async', V>;
export type Store<V> = SyncStore<V> | AsyncStore<V>;

export abstract class SyncStoreWithBatchedGet<V> implements SyncStore<V> {
  operation = 'sync' as const;
  abstract set(key: string, value: V): unknown; 
  abstract get(key: string): Maybe<V>;
  abstract remove(key: string): unknown;
  abstract getKeys(): string[];
  abstract getBatched(keys: string[]): Maybe<V>[];
}

export abstract class AsyncStoreWithBatchedGet<V> implements AsyncStore<V> {
  operation = 'async' as const;
  abstract set(key: string, value: V): Promise<unknown>; 
  abstract get(key: string): Promise<Maybe<V>>;
  abstract remove(key: string): Promise<unknown>;
  abstract getKeys(): Promise<string[]>;
  abstract getBatched(keys: string[]): Promise<Maybe<V>[]>;
}

export const getBatchedSync = <V>(store: SyncStore<V>, keys: string[]): Maybe<V>[] => {
  if (store instanceof SyncStoreWithBatchedGet) {
    return store.getBatched(keys);
  }
  return keys.map((key) => store.get(key));
};

export const getBatchedAsync = <V>(store: AsyncStore<V>, keys: string[]): Promise<Maybe<V>[]> => {
  if (store instanceof AsyncStoreWithBatchedGet) {
    return store.getBatched(keys);
  }
  return Promise.all(keys.map((key) => store.get(key)));
};

export class SyncPrefixStore<U, V> extends SyncStoreWithBatchedGet<V> implements SyncStore<V> {
  private store: SyncStore<U>;
  private prefix: string;
  private transformGet: Transformer<U, V>;
  private transformSet: Transformer<V, U>;

  public readonly operation = 'sync';

  constructor(
    store: SyncStore<U>, 
    prefix: string,
    transformGet: Transformer<U, V>,
    transformSet: Transformer<V, U>
  ) {
    super();
    this.store = store;
    this.prefix = prefix;
    this.transformGet = transformGet;
    this.transformSet = transformSet;
  }

  private addPrefix(key: string): string {
    return `${this.prefix}${key}`;
  }

  private removePrefix(key: string): string {
    return key.substring(this.prefix.length);
  }

  set(key: string, value: V): unknown {
    return this.store.set(this.addPrefix(key), this.transformSet(value));
  }

  get(key: string): V | undefined {
    const value = this.store.get(this.addPrefix(key));
    return value ? this.transformGet(value) : undefined;
  }

  remove(key: string): unknown {
    return this.store.remove(this.addPrefix(key));
  }
  
  private getInternalKeys(): string[] {
    return this.store.getKeys().filter((key) => key.startsWith(this.prefix));
  }

  getKeys(): string[] {
    return this.getInternalKeys().map((key) => this.removePrefix(key));
  }

  getBatched(keys: string[]): Maybe<V>[] {
    return getBatchedSync(this.store, keys.map((key) => this.addPrefix(key)))
        .map((value) => value ? this.transformGet(value) : undefined);
  }
}

export class AsyncPrefixStore<U, V> implements AsyncStore<V> {
  private cache: AsyncStore<U>;
  private prefix: string;
  private transformGet: Transformer<U, V>;
  private transformSet: Transformer<V, U>;

  public readonly operation = 'async';

  constructor(
    cache: AsyncStore<U>, 
    prefix: string,
    transformGet: Transformer<U, V>,
    transformSet: Transformer<V, U>
  ) {
    this.cache = cache;
    this.prefix = prefix;
    this.transformGet = transformGet;
    this.transformSet = transformSet;
  }

  private addPrefix(key: string): string {
    return `${this.prefix}${key}`;
  }

  private removePrefix(key: string): string {
    return key.substring(this.prefix.length);
  }

  set(key: string, value: V): Promise<unknown> {
    return this.cache.set(this.addPrefix(key), this.transformSet(value));
  }

  async get(key: string): Promise<V | undefined> {
    const value = await this.cache.get(this.addPrefix(key));
    return value ? this.transformGet(value) : undefined;
  }

  remove(key: string): Promise<unknown> {
    return this.cache.remove(this.addPrefix(key));
  }
  
  private async getInternalKeys(): Promise<string[]> {
    return this.cache.getKeys().then((keys) => keys.filter((key) => key.startsWith(this.prefix)));
  }

  async getKeys(): Promise<string[]> {
    return this.getInternalKeys().then((keys) => keys.map((key) => this.removePrefix(key)));
  }

  async getBatched(keys: string[]): Promise<Maybe<V>[]> {
    const values = await getBatchedAsync(this.cache, keys.map((key) => this.addPrefix(key)));
    return values.map((value) => value ? this.transformGet(value) : undefined);
  }
}
