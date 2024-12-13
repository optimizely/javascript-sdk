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
import * as logger from '../plugins/logger';
import * as jsonSchemaValidator from '../utils/json_schema_validator';
import { LOG_LEVEL } from '../common_exports';
import { createNotificationCenter } from '../notification_center';
import testData from '../tests/test_data';
import { getForwardingEventProcessor } from '../event_processor/forwarding_event_processor';
import { LoggerFacade } from '../modules/logging';
import { createProjectConfig } from '../project_config/project_config';
import { getMockLogger } from '../tests/mock/mock_logger';

describe('Optimizely', () => {
  const errorHandler = { handleError: function() {} };

  const eventDispatcher = {
    dispatchEvent: () => Promise.resolve({ statusCode: 200 }),
  };

  const eventProcessor = getForwardingEventProcessor(eventDispatcher);

  const logger = getMockLogger();

  const notificationCenter = createNotificationCenter({ logger, errorHandler });

  it('should pass ssr to the project config manager', () => {
    const projectConfigManager = getMockProjectConfigManager({
      initConfig: createProjectConfig(testData.getTestProjectConfig()),
    });

    vi.spyOn(projectConfigManager, 'setSsr');

    const instance = new Optimizely({
      clientEngine: 'node-sdk',
      projectConfigManager,
      errorHandler,
      jsonSchemaValidator,
      logger,
      notificationCenter,
      eventProcessor,
      isSsr: true,
      isValidInstance: true,
    });

    expect(projectConfigManager.setSsr).toHaveBeenCalledWith(true);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(instance.getProjectConfig()).toBe(projectConfigManager.config);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(projectConfigManager.isSsr).toBe(true);
  });
});
