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

// The test itself. Loads the SDK, decides, tracks, and records what happened for run.mjs to check.
import datafile from './datafile.json';

const testCase = globalThis.__CASE__;
const record = globalThis.__record;

// Which implementation provides each global the SDK uses.
const sources = () => {
  const TE = globalThis.TextEncoder;
  const getRandomValues = globalThis.crypto && globalThis.crypto.getRandomValues;
  return {
    textEncoder: !TE ? 'none'
      : TE === globalThis.__nativeTextEncoder ? 'native'
      : TE.name === 'CustomTextEncoder' ? 'custom'
      : 'fast-text-encoding',
    getRandomValues: !getRandomValues ? 'none'
      : getRandomValues.name === 'customGetRandomValues' ? 'custom'
      : 'package',
  };
};

class MemoryStore {
  constructor() {
    this.operation = 'sync';
    this.items = new Map();
  }
  set(key, value) { this.items.set(key, value); }
  get(key) { return this.items.get(key); }
  remove(key) { this.items.delete(key); }
  getKeys() { return [...this.items.keys()]; }
}

const waitFor = (check, timeoutMs) => new Promise((resolve) => {
  const start = Date.now();
  const tick = () => {
    if (check() || Date.now() - start > timeoutMs) resolve();
    else setTimeout(tick, 20);
  };
  tick();
});

const eventUuids = (request) => request.params.visitors.flatMap((visitor) =>
  visitor.snapshots.flatMap((snapshot) => snapshot.events.map((event) => event.uuid)));

const recordingDispatcher = (events) => ({
  dispatchEvent: (request) => {
    events.push(...eventUuids(request));
    return Promise.resolve({ statusCode: 200 });
  },
});

const failingDispatcher = (events) => ({
  dispatchEvent: (request) => {
    events.push(...eventUuids(request));
    return Promise.reject(new Error('intentional dispatch failure'));
  },
});

const createClient = (sdk, eventProcessor) => sdk.createInstance({
  projectConfigManager: sdk.createStaticProjectConfigManager({ datafile: JSON.stringify(datafile) }),
  eventProcessor,
});

async function runCase() {
  // Loaded here rather than imported, so the load happens on this tick, outside module loading.
  // As in an app, an error while the SDK loads is reported as fatal and require returns undefined.
  const sdk = require('@optimizely/optimizely-sdk');
  record('sdk', { loaded: !!sdk, sources: sources() });
  if (!sdk) return;

  const calls = { encode: 0, getRandomValues: 0 };
  const encode = globalThis.TextEncoder.prototype.encode;
  globalThis.TextEncoder.prototype.encode = function (...args) {
    calls.encode++;
    return encode.apply(this, args);
  };
  const getRandomValues = globalThis.crypto.getRandomValues.bind(globalThis.crypto);
  globalThis.crypto.getRandomValues = (array) => {
    calls.getRandomValues++;
    return getRandomValues(array);
  };

  // readBack: events are left in the default store by a failing dispatcher, then read back by a second client.
  const dispatched = [];
  const eventProcessor = sdk.createBatchEventProcessor({
    eventDispatcher: testCase.readBack ? failingDispatcher(dispatched) : recordingDispatcher(dispatched),
    eventStore: testCase.customStore ? new MemoryStore() : undefined,
    flushInterval: 50,
  });
  const client = createClient(sdk, eventProcessor);
  await client.onReady();

  const user = client.createUserContext('user-1');
  const decisions = user.decideAll();
  user.trackEvent('purchase');
  await waitFor(() => dispatched.length > 0, 3000);
  record('result', {
    decisions: Object.fromEntries(Object.entries(decisions).map(([key, decision]) => [key, decision.variationKey])),
    events: dispatched.slice(),
    calls,
  });
  await client.close();

  if (testCase.readBack) {
    const readBack = [];
    const clientB = createClient(sdk, sdk.createBatchEventProcessor({
      eventDispatcher: recordingDispatcher(readBack),
      flushInterval: 50,
    }));
    await clientB.onReady();
    await waitFor(() => readBack.length > 0, 3000);
    record('readBack', { events: readBack, storageCalls: [...new Set(globalThis.__asyncStorageCalls || [])] });
    await clientB.close();
  }
}

export async function run() {
  try {
    await runCase();
  } catch (e) {
    record('caughtError', { message: String((e && e.message) || e) });
  }
  globalThis.__done();
}
