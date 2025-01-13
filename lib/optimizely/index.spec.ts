/**
 * Copyright 2024, Optimizely
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
import { describe, it, expect, vi } from 'vitest';
import Optimizely from '.';
import { getMockProjectConfigManager } from '../tests/mock/mock_project_config_manager';
import * as jsonSchemaValidator from '../utils/json_schema_validator';
import { createNotificationCenter } from '../notification_center';
import testData from '../tests/test_data';
import { getForwardingEventProcessor } from '../event_processor/forwarding_event_processor';
import { createProjectConfig } from '../project_config/project_config';
import { getMockLogger } from '../tests/mock/mock_logger';
import { createOdpManager } from '../odp/odp_manager_factory.node';

describe('Optimizely', () => {
  const errorHandler = { handleError: function() {} };

  const eventDispatcher = {
    dispatchEvent: () => Promise.resolve({ statusCode: 200 }),
  };

  const eventProcessor = getForwardingEventProcessor(eventDispatcher);
  const odpManager = createOdpManager({});
  const logger = getMockLogger();
  const notificationCenter = createNotificationCenter({ logger, errorHandler });

  it('should pass disposable options to the respective services', () => {
    const projectConfigManager = getMockProjectConfigManager({
      initConfig: createProjectConfig(testData.getTestProjectConfig()),
    });

    vi.spyOn(projectConfigManager, 'makeDisposable');
    vi.spyOn(eventProcessor, 'makeDisposable');
    vi.spyOn(odpManager, 'makeDisposable');

    new Optimizely({
      clientEngine: 'node-sdk',
      projectConfigManager,
      errorHandler,
      jsonSchemaValidator,
      logger,
      notificationCenter,
      eventProcessor,
      odpManager,
      disposable: true,
      isValidInstance: true,
    });

    expect(projectConfigManager.makeDisposable).toHaveBeenCalled();
    expect(eventProcessor.makeDisposable).toHaveBeenCalled();
    expect(odpManager.makeDisposable).toHaveBeenCalled();
  });
});
