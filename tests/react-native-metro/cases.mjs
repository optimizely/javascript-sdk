/**
 * Copyright 2026, Optimizely
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

// Test cases. Every case runs on every fixture.
//
// modules: which optional packages are installed (decides how the bundle is built).
//   fastTextEncoding: the real fast-text-encoding package
//   getRandomValues:  a stand-in for react-native-get-random-values
//   asyncStorage:     'v2' (has multiGet), 'v3' (getMany only) or null (not installed)
// runtime: what the app does at runtime.
//   nativeTextEncoder:     the runtime has a TextEncoder (Hermes in RN 0.74+); otherwise it has none
//   customTextEncoder:     the app loads its own TextEncoder polyfill before the SDK
//   customGetRandomValues: the app loads its own crypto.getRandomValues polyfill before the SDK
//   customStore:           the event processor gets an in-memory store instead of AsyncStorage
//   readBack:              events left in the default store are read back by a second client
// expect: one of
//   works:  { textEncoder, getRandomValues } - which implementation the SDK must end up using
//           ('native' | 'fast-text-encoding' | 'package' | 'custom'), plus optional readBack: '<storage method>'
//   fatal:  the error reported as fatal while the SDK loads (a red box in an app)
//   caught: the error thrown to the app's code

export const FIXTURES = ['rn-0.73', 'rn-0.87'];

export const TEXT_ENCODER_ERROR = 'TextEncoder is not available in this environment';
export const GET_RANDOM_VALUES_ERROR = 'crypto.getRandomValues is not available in this environment';
export const ASYNC_STORAGE_ERROR = 'Module not found: @react-native-async-storage/async-storage';

const BOTH_POLYFILLS = { fastTextEncoding: true, getRandomValues: true, asyncStorage: 'v2' };

export const CASES = [
  // Polyfills, on a runtime without TextEncoder or crypto (Hermes before RN 0.74).
  {
    id: 'P1', description: 'fast-text-encoding and get-random-values installed',
    modules: BOTH_POLYFILLS, runtime: {},
    expect: { works: { textEncoder: 'fast-text-encoding', getRandomValues: 'package' } },
  },
  {
    id: 'P2', description: 'custom TextEncoder instead of fast-text-encoding',
    modules: { ...BOTH_POLYFILLS, fastTextEncoding: false }, runtime: { customTextEncoder: true },
    expect: { works: { textEncoder: 'custom', getRandomValues: 'package' } },
  },
  {
    id: 'P3', description: 'custom TextEncoder with fast-text-encoding also installed',
    modules: BOTH_POLYFILLS, runtime: { customTextEncoder: true },
    expect: { works: { textEncoder: 'custom', getRandomValues: 'package' } },
  },
  {
    id: 'P4', description: 'custom getRandomValues instead of get-random-values',
    modules: { ...BOTH_POLYFILLS, getRandomValues: false }, runtime: { customGetRandomValues: true },
    expect: { works: { textEncoder: 'fast-text-encoding', getRandomValues: 'custom' } },
  },
  {
    id: 'P5', description: 'neither package, both custom polyfills',
    modules: { ...BOTH_POLYFILLS, fastTextEncoding: false, getRandomValues: false },
    runtime: { customTextEncoder: true, customGetRandomValues: true },
    expect: { works: { textEncoder: 'custom', getRandomValues: 'custom' } },
  },
  {
    id: 'P6', description: 'no TextEncoder package or polyfill',
    modules: { ...BOTH_POLYFILLS, fastTextEncoding: false }, runtime: {},
    expect: { fatal: TEXT_ENCODER_ERROR },
  },
  {
    id: 'P7', description: 'no getRandomValues package or polyfill',
    modules: { ...BOTH_POLYFILLS, getRandomValues: false }, runtime: {},
    expect: { fatal: GET_RANDOM_VALUES_ERROR },
  },
  {
    id: 'P8', description: 'no polyfill packages or polyfills',
    modules: { ...BOTH_POLYFILLS, fastTextEncoding: false, getRandomValues: false }, runtime: {},
    expect: { fatal: TEXT_ENCODER_ERROR },
  },
  // Polyfills, on a runtime with a native TextEncoder (Hermes in RN 0.74+).
  {
    id: 'P9', description: 'native TextEncoder, no fast-text-encoding',
    modules: { ...BOTH_POLYFILLS, fastTextEncoding: false }, runtime: { nativeTextEncoder: true },
    expect: { works: { textEncoder: 'native', getRandomValues: 'package' } },
  },
  {
    id: 'P10', description: 'native TextEncoder kept when fast-text-encoding is installed',
    modules: BOTH_POLYFILLS, runtime: { nativeTextEncoder: true },
    expect: { works: { textEncoder: 'native', getRandomValues: 'package' } },
  },
  // AsyncStorage.
  {
    id: 'S1', description: 'AsyncStorage v1/v2: stored events read back with multiGet',
    modules: BOTH_POLYFILLS, runtime: { readBack: true },
    expect: { works: { textEncoder: 'fast-text-encoding', getRandomValues: 'package' }, readBack: 'multiGet' },
  },
  {
    id: 'S2', description: 'AsyncStorage v3: stored events read back through getMany',
    modules: { ...BOTH_POLYFILLS, asyncStorage: 'v3' }, runtime: { readBack: true },
    expect: { works: { textEncoder: 'fast-text-encoding', getRandomValues: 'package' }, readBack: 'getMany' },
  },
  {
    id: 'S3', description: 'no AsyncStorage, custom event store',
    modules: { ...BOTH_POLYFILLS, asyncStorage: null }, runtime: { customStore: true },
    expect: { works: { textEncoder: 'fast-text-encoding', getRandomValues: 'package' } },
  },
  {
    id: 'S4', description: 'no AsyncStorage, default event store',
    modules: { ...BOTH_POLYFILLS, asyncStorage: null }, runtime: {},
    expect: { caught: ASYNC_STORAGE_ERROR },
  },
];
