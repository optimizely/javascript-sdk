import { describe, it, expect, vi } from 'vitest';
import { buildImpressionEvent, buildConversionEvent } from './user_event';
import { createProjectConfig, ProjectConfig } from '../../project_config/project_config';
import { DecisionObj } from '../../core/decision_service';
import testData from '../../tests/test_data';

describe('buildImpressionEvent', () => {
  it('should use correct region from projectConfig in event context', () => {
    const projectConfig = createProjectConfig(
      testData.getTestProjectConfig(),
    )

    const experiment = projectConfig.experiments[0];
    const variation = experiment.variations[0];

    const decisionObj = {
      experiment,
      variation,
      decisionSource: 'experiment',
    } as DecisionObj;


    const impressionEvent = buildImpressionEvent({
      configObj: projectConfig,
      decisionObj,
      userId: 'test_user',
      flagKey: 'test_flag',
      enabled: true,
      clientEngine: 'node-sdk',
      clientVersion: '1.0.0',
    });

    expect(impressionEvent.context.region).toBe('US');

    projectConfig.region = 'EU';
    
    const impressionEventEU = buildImpressionEvent({
      configObj: projectConfig,
      decisionObj,
      userId: 'test_user',
      flagKey: 'test_flag',
      enabled: true,
      clientEngine: 'node-sdk',
      clientVersion: '1.0.0', 
    });

    expect(impressionEventEU.context.region).toBe('EU');
  });
});

describe('buildConversionEvent', () => {
  it('should use correct region from projectConfig in event context', () => {
    const projectConfig = createProjectConfig(
      testData.getTestProjectConfig(),
    )

    const conversionEvent = buildConversionEvent({
      configObj: projectConfig,
      userId: 'test_user',
      eventKey: 'test_event',
      eventTags: { revenue: 1000 },
      clientEngine: 'node-sdk',
      clientVersion: '1.0.0',
    });

    expect(conversionEvent.context.region).toBe('US');

    projectConfig.region = 'EU';
    
    const conversionEventEU = buildConversionEvent({
      configObj: projectConfig,
      userId: 'test_user',
      eventKey: 'test_event',
      eventTags: { revenue: 1000 },
      clientEngine: 'node-sdk',
      clientVersion: '1.0.0',
    });

    expect(conversionEventEU.context.region).toBe('EU');
  });
});
