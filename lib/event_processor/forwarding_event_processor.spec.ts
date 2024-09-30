/**
 * Copyright 2021, 2024 Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */ 
import { expect, describe, it, vi } from 'vitest';

import { getForwardingEventProcessor } from './forwarding_event_processor';
import { EventDispatcher, makeBatchedEventV1 } from '.';

function createImpressionEvent() {
  return {
    type: 'impression' as const,
    timestamp: 69,
    uuid: 'uuid',

    context: {
      accountId: 'accountId',
      projectId: 'projectId',
      clientName: 'node-sdk',
      clientVersion: '3.0.0',
      revision: '1',
      botFiltering: true,
      anonymizeIP: true,
    },

    user: {
      id: 'userId',
      attributes: [{ entityId: 'attr1-id', key: 'attr1-key', value: 'attr1-value' }],
    },

    layer: {
      id: 'layerId',
    },

    experiment: {
      id: 'expId',
      key: 'expKey',
    },

    variation: {
      id: 'varId',
      key: 'varKey',
    },

    ruleKey: 'expKey',
    flagKey: 'flagKey1',
    ruleType: 'experiment',
    enabled: true,
  }
}

const getMockEventDispatcher = (): EventDispatcher => {
  return {
    dispatchEvent: vi.fn().mockResolvedValue({ statusCode: 200 }),
  };
};

const getMockNotificationCenter = () => {
  return {
    sendNotifications: vi.fn(),
  };
}

describe('ForwardingEventProcessor', function() {
  it('should dispatch event immediately when process is called', () => {
    const dispatcher = getMockEventDispatcher();
    const mockDispatch = vi.mocked(dispatcher.dispatchEvent);
    const notificationCenter = getMockNotificationCenter();
    const processor = getForwardingEventProcessor(dispatcher, notificationCenter);
    processor.start();
    const event = createImpressionEvent();
    processor.process(event);
    expect(dispatcher.dispatchEvent).toHaveBeenCalledOnce();
    const data = mockDispatch.mock.calls[0][0].params;
    expect(data).toEqual(makeBatchedEventV1([event]));
    expect(notificationCenter.sendNotifications).toHaveBeenCalledOnce();
  });

  it('should return a resolved promise when stop is called', async () => {
    const dispatcher = getMockEventDispatcher();
    const notificationCenter = getMockNotificationCenter();
    const processor = getForwardingEventProcessor(dispatcher, notificationCenter);
    processor.start();
    const stopPromise = processor.stop();
    expect(stopPromise).resolves.not.toThrow();
  });
 });
