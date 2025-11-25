import { Platform } from './../platform_support';

/**
 * Copyright 2024-2025, Optimizely
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

export const __platforms: Platform[] = ['__universal__'];

export type Fn  = () => unknown;
export type AsyncFn = () => Promise<unknown>;
export type AsyncTransformer<A, B> = (arg: A) => Promise<B>;
export type Transformer<A, B> = (arg: A) => B;

export type Consumer<T> = (arg: T) => void;
export type AsyncComsumer<T> = (arg: T) => Promise<void>;

export type Producer<T> = () => T;
export type AsyncProducer<T> = () => Promise<T>;

export type Maybe<T> = T | undefined;

export type Either<A, B> = { type: 'left', value: A } | { type: 'right', value: B };

export type OpType = 'sync' | 'async';
export type OpValue<O extends OpType, V> = O extends 'sync' ? V : Promise<V>;

export type OrNull<T> = T | null;

export type Nullable<T, K extends keyof T> = {
  [P in keyof T]: P extends K ? OrNull<T[P]> : T[P];
}
