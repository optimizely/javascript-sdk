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
