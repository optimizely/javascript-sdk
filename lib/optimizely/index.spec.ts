/**
 * Copyright 2024-2025, Optimizely
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
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Optimizely from '.';
import { getMockProjectConfigManager } from '../tests/mock/mock_project_config_manager';
import * as jsonSchemaValidator from '../utils/json_schema_validator';
import testData from '../tests/test_data';
import { getForwardingEventProcessor } from '../event_processor/event_processor_factory';
import { createProjectConfig } from '../project_config/project_config';
import { getMockLogger } from '../tests/mock/mock_logger';
import { createOdpManager } from '../odp/odp_manager_factory.node';
import { extractOdpManager } from '../odp/odp_manager_factory';
import { Value } from '../utils/promise/operation_value';
import { getDecisionTestDatafile } from '../tests/decision_test_datafile';
import { DECISION_SOURCES } from '../utils/enums';
import OptimizelyUserContext from '../optimizely_user_context';
import { newErrorDecision } from '../optimizely_decision';
import { ImpressionEvent } from '../event_processor/event_builder/user_event';

describe('Optimizely', () => {
  const eventDispatcher = {
    dispatchEvent: () => Promise.resolve({ statusCode: 200 }),
  };

  const eventProcessor = getForwardingEventProcessor(eventDispatcher);
  const odpManager = extractOdpManager(createOdpManager({}));
  const logger = getMockLogger();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should pass disposable options to the respective services', () => {
    const projectConfigManager = getMockProjectConfigManager({
      initConfig: createProjectConfig(testData.getTestProjectConfig()),
    });

    vi.spyOn(projectConfigManager, 'makeDisposable');
    vi.spyOn(eventProcessor, 'makeDisposable');
    vi.spyOn(odpManager!, 'makeDisposable');

    new Optimizely({
      clientEngine: 'node-sdk',
      projectConfigManager,
      jsonSchemaValidator,
      logger,
      eventProcessor,
      odpManager,
      disposable: true,
      cmabService: {} as any
    });

    expect(projectConfigManager.makeDisposable).toHaveBeenCalled();
    expect(eventProcessor.makeDisposable).toHaveBeenCalled();
    expect(odpManager!.makeDisposable).toHaveBeenCalled();
  });

  it('should set child logger to respective services', () => {
    const projectConfigManager = getMockProjectConfigManager({
      initConfig: createProjectConfig(testData.getTestProjectConfig()),
    });

    const eventProcessor = getForwardingEventProcessor(eventDispatcher);
    const odpManager = extractOdpManager(createOdpManager({}));

    vi.spyOn(projectConfigManager, 'setLogger');
    vi.spyOn(eventProcessor, 'setLogger');
    vi.spyOn(odpManager!, 'setLogger');

    const logger = getMockLogger();
    const configChildLogger = getMockLogger();
    const eventProcessorChildLogger = getMockLogger();
    const odpManagerChildLogger = getMockLogger();
    vi.spyOn(logger, 'child').mockReturnValueOnce(configChildLogger)
      .mockReturnValueOnce(eventProcessorChildLogger)
      .mockReturnValueOnce(odpManagerChildLogger);

    new Optimizely({
      clientEngine: 'node-sdk',
      projectConfigManager,
      jsonSchemaValidator,
      logger,
      eventProcessor,
      odpManager,
      disposable: true,
      cmabService: {} as any
    });

    expect(projectConfigManager.setLogger).toHaveBeenCalledWith(configChildLogger);
    expect(eventProcessor.setLogger).toHaveBeenCalledWith(eventProcessorChildLogger);
    expect(odpManager!.setLogger).toHaveBeenCalledWith(odpManagerChildLogger);
  });

  describe('decideAsync', () => {
    it('should return an error decision with correct reasons if decisionService returns error', async () => {
      const projectConfig = createProjectConfig(getDecisionTestDatafile());

      const projectConfigManager = getMockProjectConfigManager({
        initConfig: projectConfig,
      });

      const optimizely = new Optimizely({
        clientEngine: 'node-sdk',
        projectConfigManager,
        jsonSchemaValidator,
        logger,
        eventProcessor,
        odpManager,
        disposable: true,
        cmabService: {} as any
      });

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const decisionService = optimizely.decisionService;
      vi.spyOn(decisionService, 'resolveVariationsForFeatureList').mockImplementation(() => {
        return Value.of('async', [{
          error: true,
          result: {
            variation: null,
            experiment: projectConfig.experimentKeyMap['exp_3'],
            decisionSource: DECISION_SOURCES.FEATURE_TEST,
          },
          reasons:[
            ['test reason %s', '1'],
            ['test reason %s', '2'],
          ]
        }]);
      });

      const user = new OptimizelyUserContext({
        optimizely: {} as any,
        userId: 'tester',
        attributes: {
          country: 'BD',
          age: 80, // should satisfy audience condition for exp_3 which is cmab and not others
        },
      });

      const decision = await optimizely.decideAsync(user, 'flag_1', []);

      expect(decision).toEqual(newErrorDecision('flag_1', user, ['test reason 1', 'test reason 2']));
    });

    it('should include cmab uuid in dispatched event if decisionService returns a cmab uuid', async () => {
      const projectConfig = createProjectConfig(getDecisionTestDatafile());

      const projectConfigManager = getMockProjectConfigManager({
        initConfig: projectConfig,
      });

      const eventProcessor = getForwardingEventProcessor(eventDispatcher);
      const processSpy = vi.spyOn(eventProcessor, 'process');

      const optimizely = new Optimizely({
        clientEngine: 'node-sdk',
        projectConfigManager,
        eventProcessor,
        jsonSchemaValidator,
        logger,
        odpManager,
        disposable: true,
        cmabService: {} as any
      });

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const decisionService = optimizely.decisionService;
      vi.spyOn(decisionService, 'resolveVariationsForFeatureList').mockImplementation(() => {
        return Value.of('async', [{
          error: false,
          result: {
            cmabUuid: 'uuid-cmab',
            variation: projectConfig.variationIdMap['5003'],
            experiment: projectConfig.experimentKeyMap['exp_3'],
            decisionSource: DECISION_SOURCES.FEATURE_TEST,
          },
          reasons: [],
        }]);
      });

      const user = new OptimizelyUserContext({
        optimizely: {} as any,
        userId: 'tester',
        attributes: {
          country: 'BD',
          age: 80, // should satisfy audience condition for exp_3 which is cmab and not others
        },
      });

      const decision = await optimizely.decideAsync(user, 'flag_1', []);

      expect(decision.ruleKey).toBe('exp_3');
      expect(decision.flagKey).toBe('flag_1');
      expect(decision.variationKey).toBe('variation_3');
      expect(decision.enabled).toBe(true);

      expect(eventProcessor.process).toHaveBeenCalledOnce();
      const event = processSpy.mock.calls[0][0] as ImpressionEvent;
      expect(event.cmabUuid).toBe('uuid-cmab');
    });
  });
});
