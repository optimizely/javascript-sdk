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

const fs = require('fs');
const path = require('path');

const {
  createInstance,
  createStaticProjectConfigManager,
  createForwardingEventProcessor,
  createLogger,
  createErrorNotifier,
  INFO,
} = require('@optimizely/optimizely-sdk');

const datafilePath = path.join(__dirname, '..', 'shared', 'datafile.json');
const testDatafile = fs.readFileSync(datafilePath, 'utf8');

const TIMEOUT_MS = 10000;

async function testCommonJsRequire() {
  let resolveUuid;
  const uuidPromise = new Promise((resolve, reject) => {
    resolveUuid = resolve;
    setTimeout(() => reject(new Error('Timed out waiting for event dispatch')), TIMEOUT_MS);
  });

  const dispatcher = {
    dispatchEvent(logEvent) {
      const uuid = logEvent.params.visitors[0].snapshots[0].events[0].uuid;
      console.log(`Dispatched event with uuid: ${uuid}`);

      if (typeof uuid === 'string' && uuid.length > 0) {
        resolveUuid(uuid);
      }

      return Promise.resolve({});
    },
  };

  const configManager = createStaticProjectConfigManager({
    datafile: testDatafile,
  });

  const eventProcessor = createForwardingEventProcessor(dispatcher);

  const client = createInstance({
    projectConfigManager: configManager,
    eventProcessor: eventProcessor,
  });

  await client.onReady();

  const userContext = client.createUserContext('test_user', { age: 22 });
  userContext.decide('flag_1');

  const uuid = await uuidPromise;
  console.log(`Test passed: event contained valid uuid "${uuid}"`);

  client.close();
}

testCommonJsRequire()
  .then(() => {
    console.log('\n=== CommonJS example completed successfully! ===\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
