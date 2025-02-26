/**
 * Copyright 2022-2024, Optimizely
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

export type CacheOp = 'sync' | 'async';
export type OpValue<Op extends CacheOp, V> = Op extends 'sync' ? V : Promise<V>;

export interface CacheWithOp<Op extends CacheOp, V> {
  operation: Op;
  set(key: string, value: V): OpValue<Op, unknown>;
  get(key: string): OpValue<Op, Maybe<V>>;
  remove(key: string): OpValue<Op, unknown>;
  clear(): OpValue<Op, unknown>;
  getKeys(): OpValue<Op, string[]>;
  getBatched(keys: string[]): OpValue<Op, Maybe<V>[]>;
}

export type SyncCache<V> = CacheWithOp<'sync', V>;
export type AsyncCache<V> = CacheWithOp<'async', V>;
export type Cache<V> = SyncCache<V> | AsyncCache<V>;

export class SyncPrefixCache<U, V> implements SyncCache<V> {
  private cache: SyncCache<U>;
  private prefix: string;
  private transformGet: Transformer<U, V>;
  private transformSet: Transformer<V, U>;

  public readonly operation = 'sync';

  constructor(
    cache: SyncCache<U>, 
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

  set(key: string, value: V): unknown {
    return this.cache.set(this.addPrefix(key), this.transformSet(value));
  }

  get(key: string): V | undefined {
    const value = this.cache.get(this.addPrefix(key));
    return value ? this.transformGet(value) : undefined;
  }

  remove(key: string): unknown {
    return this.cache.remove(this.addPrefix(key));
  }

  clear(): void {
    this.getInternalKeys().forEach((key) => this.cache.remove(key));
  }
  
  private getInternalKeys(): string[] {
    return this.cache.getKeys().filter((key) => key.startsWith(this.prefix));
  }

  getKeys(): string[] {
    return this.getInternalKeys().map((key) => this.removePrefix(key));
  }

  getBatched(keys: string[]): Maybe<V>[] {
    return this.cache.getBatched(keys.map((key) => this.addPrefix(key)))
      .map((value) => value ? this.transformGet(value) : undefined);
  }
}

export class AsyncPrefixCache<U, V> implements AsyncCache<V> {
  private cache: AsyncCache<U>;
  private prefix: string;
  private transformGet: Transformer<U, V>;
  private transformSet: Transformer<V, U>;

  public readonly operation = 'async';

  constructor(
    cache: AsyncCache<U>, 
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

  async clear(): Promise<void> {
    const keys = await this.getInternalKeys();
    await Promise.all(keys.map((key) => this.cache.remove(key)));
  }
  
  private async getInternalKeys(): Promise<string[]> {
    return this.cache.getKeys().then((keys) => keys.filter((key) => key.startsWith(this.prefix)));
  }

  async getKeys(): Promise<string[]> {
    return this.getInternalKeys().then((keys) => keys.map((key) => this.removePrefix(key)));
  }

  async getBatched(keys: string[]): Promise<Maybe<V>[]> {
    const values = await this.cache.getBatched(keys.map((key) => this.addPrefix(key)));
    return values.map((value) => value ? this.transformGet(value) : undefined);
  }
}
