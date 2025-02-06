import { expectTypeOf } from 'vitest';

import * as browserEntrypoint from './index.browser';
import * as nodeEntrypoint from './index.node';
import * as reactNativeEntrypoint from './index.react_native';

import { Config, Client } from './shared_types';

export type Entrypoint = {
  createInstance: (config: Config) => Client | null;
}

expectTypeOf(browserEntrypoint).toMatchTypeOf<Entrypoint>();
expectTypeOf(nodeEntrypoint).toMatchTypeOf<Entrypoint>();
expectTypeOf(reactNativeEntrypoint).toMatchTypeOf<Entrypoint>();
