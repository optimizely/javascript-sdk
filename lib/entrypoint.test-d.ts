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

import { expectTypeOf } from 'vitest';

import * as browserEntrypoint from './index.browser';
import * as nodeEntrypoint from './index.node';
import * as reactNativeEntrypoint from './index.react_native';

import { Config, Client } from './shared_types';

export type Entrypoint = {
  createInstance: (config: Config) => Client | null;
}


// these type tests will be fixed in a future PR

// expectTypeOf(browserEntrypoint).toEqualTypeOf<Entrypoint>();
// expectTypeOf(nodeEntrypoint).toEqualTypeOf<Entrypoint>();
// expectTypeOf(reactNativeEntrypoint).toEqualTypeOf<Entrypoint>();

// expectTypeOf(browserEntrypoint).toEqualTypeOf(nodeEntrypoint);
// expectTypeOf(browserEntrypoint).toEqualTypeOf(reactNativeEntrypoint);
// expectTypeOf(nodeEntrypoint).toEqualTypeOf(reactNativeEntrypoint);
