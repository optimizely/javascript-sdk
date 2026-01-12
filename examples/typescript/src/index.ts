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
import {
  createBatchEventProcessor,
  createErrorNotifier,
  createForwardingEventProcessor,
  createInstance,
  createLogger,
  createOdpManager,
  createPollingProjectConfigManager,
  createStaticProjectConfigManager,
  createVuidManager,
  eventDispatcher,
  INFO,
  NOTIFICATION_TYPES,
  type Client,
  type Config,
  type DecisionNotificationPayload,
  type ErrorHandler,
  type EventDispatcher,
  type LogHandler,
  type OpaqueConfigManager,
  type OpaqueErrorNotifier,
  type OpaqueEventProcessor,
  type OpaqueLogger,
  type OpaqueOdpManager,
  type OpaqueVuidManager,
  type OptimizelyDecision,
  type OptimizelyUserContext,
  type UserAttributes
} from '@optimizely/optimizely-sdk';
import * as fs from 'fs';
import * as path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename: string = fileURLToPath(import.meta.url);
const __dirname: string = dirname(__filename);

const datafilePath: string = path.join(__dirname, '..', 'datafile.json');
const testDatafile: string = fs.readFileSync(datafilePath, 'utf8');

async function testStaticConfigSetup(): Promise<void> {
  const logger: OpaqueLogger = createLogger({
    level: INFO,
  });

  const errorHandler: ErrorHandler = {
    handleError: (error: Error): void => {
      console.error(`[ErrorHandler] ${error.message}`);
    },
  };
  const errorNotifier: OpaqueErrorNotifier = createErrorNotifier(errorHandler);

  const staticConfigManager: OpaqueConfigManager = createStaticProjectConfigManager({
    datafile: testDatafile,
  });

  const dispatcher: EventDispatcher = eventDispatcher;

  const forwardingProcessor: OpaqueEventProcessor = createForwardingEventProcessor(dispatcher);

  const odpManager: OpaqueOdpManager = createOdpManager();

  const vuidManager: OpaqueVuidManager = createVuidManager();

  const config: Config = {
    projectConfigManager: staticConfigManager,
    eventProcessor: forwardingProcessor,
    odpManager: odpManager,
    vuidManager: vuidManager,
    logger: logger,
    errorNotifier: errorNotifier,
  };

  const optimizelyClient: Client = createInstance(config);

  await optimizelyClient.onReady();

  const listenerId: number = optimizelyClient.notificationCenter.addNotificationListener(
    NOTIFICATION_TYPES.DECISION,
    (notification: DecisionNotificationPayload) => {
      console.log('Decision notification received:', {
        type: notification.type,
        userId: notification.userId,
      });
    }
  );

  const userAttributes: UserAttributes = { age: 25, browser: 'chrome' };
  const userContext: OptimizelyUserContext = optimizelyClient.createUserContext(
    'test_user_1',
    userAttributes
  );

  const decision: OptimizelyDecision = userContext.decide('flag_1');
  if (typeof decision.variationKey !== 'string' || decision.variationKey.length === 0) {
    throw new Error(`Expected non-empty string for variationKey, got: ${decision.variationKey}`);
  }
  console.log(`variationKey: ${decision.variationKey}`);

  const vuid: string | undefined = optimizelyClient.getVuid();
  void vuid;

  optimizelyClient.notificationCenter.removeNotificationListener(listenerId);

  optimizelyClient.close();
}

async function testPollingConfigSetup(): Promise<void> {
  const logHandler: LogHandler = {
    log: (_level: number, message: string): void => {
      console.log(`[Logger] ${message}`);
    },
  };
  const logger: OpaqueLogger = createLogger({
    level: INFO,
    logHandler: logHandler,
  });

  const errorHandler: ErrorHandler = {
    handleError: (error: Error): void => {
      console.error(`[ErrorHandler] ${error.message}`);
    },
  };
  const errorNotifier: OpaqueErrorNotifier = createErrorNotifier(errorHandler);

  const pollingManager: OpaqueConfigManager = createPollingProjectConfigManager({
    sdkKey: 'sdk_key',
    urlTemplate: 'http://localhost:8910',
    updateInterval: 10000,
  });

  const dispatcher: EventDispatcher = eventDispatcher;

  const batchProcessor: OpaqueEventProcessor = createBatchEventProcessor({
    eventDispatcher: dispatcher,
    batchSize: 10,
    flushInterval: 30000,
  });

  const odpManager: OpaqueOdpManager = createOdpManager({
    segmentsCacheSize: 5000,
    segmentsCacheTimeout: 300000,
    eventBatchSize: 20,
    eventFlushInterval: 5000,
  });

  const vuidManager: OpaqueVuidManager = createVuidManager();

  const config: Config = {
    projectConfigManager: pollingManager,
    eventProcessor: batchProcessor,
    odpManager: odpManager,
    vuidManager: vuidManager,
    logger: logger,
    errorNotifier: errorNotifier,
  };

  const optimizelyClient: Client = createInstance(config);

  await optimizelyClient.onReady();

  const listenerId: number = optimizelyClient.notificationCenter.addNotificationListener(
    NOTIFICATION_TYPES.DECISION,
    (notification: DecisionNotificationPayload) => {
      console.log('Decision notification received:', {
        type: notification.type,
        userId: notification.userId,
      });
    }
  );

  const userAttributes: UserAttributes = { age: 30, location: 'US' };
  const userContext: OptimizelyUserContext = optimizelyClient.createUserContext(
    'test_user_2',
    userAttributes
  );

  const decision: OptimizelyDecision = userContext.decide('flag_2');
  if (typeof decision.variationKey !== 'string' || decision.variationKey.length === 0) {
    throw new Error(`Expected non-empty string for variationKey, got: ${decision.variationKey}`);
  }
  console.log(`variationKey: ${decision.variationKey}`);

  const vuid: string | undefined = optimizelyClient.getVuid();
  void vuid;

  optimizelyClient.notificationCenter.removeNotificationListener(listenerId);

  optimizelyClient.close();
}

async function main(): Promise<void> {
  try {
    await testStaticConfigSetup();
    await testPollingConfigSetup();
    process.exit(0);
  } catch (error) {
    console.error('Error running tests:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
