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
import { EventDispatcher, formatEvents, makeBatchedEventV1 } from '.';

import { createImpressionEvent } from '../tests/mock/create_event';
import exp from 'constants';
import { ServiceState } from '../service';

const getMockEventDispatcher = (): EventDispatcher => {
  return {
    dispatchEvent: vi.fn().mockResolvedValue({ statusCode: 200 }),
  };
};

describe('ForwardingEventProcessor', () => {
  it('should resolve onRunning() when start is called', async () => {
    const dispatcher = getMockEventDispatcher();
    const mockDispatch = vi.mocked(dispatcher.dispatchEvent);

    const processor = getForwardingEventProcessor(dispatcher);
    
    processor.start();
    await expect(processor.onRunning()).resolves.not.toThrow();
  });

  it('should dispatch event immediately when process is called', async() => {
    const dispatcher = getMockEventDispatcher();
    const mockDispatch = vi.mocked(dispatcher.dispatchEvent);

    const processor = getForwardingEventProcessor(dispatcher);
    
    processor.start();
    await processor.onRunning();

    const event = createImpressionEvent();
    processor.process(event);
    expect(dispatcher.dispatchEvent).toHaveBeenCalledOnce();
    const data = mockDispatch.mock.calls[0][0].params;
    expect(data).toEqual(makeBatchedEventV1([event]));
  });

  it('should emit dispatch event when event is dispatched', async() => {
    const dispatcher = getMockEventDispatcher();
    const mockDispatch = vi.mocked(dispatcher.dispatchEvent);

    const processor = getForwardingEventProcessor(dispatcher);
    
    processor.start();
    await processor.onRunning();

    const listener = vi.fn();
    processor.onDispatch(listener);

    const event = createImpressionEvent();
    processor.process(event);
    expect(dispatcher.dispatchEvent).toHaveBeenCalledOnce();
    expect(dispatcher.dispatchEvent).toHaveBeenCalledWith(formatEvents([event]));
    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(formatEvents([event]));
  });

  it('should remove dispatch listener when the function returned from onDispatch is called', async() => {
    const dispatcher = getMockEventDispatcher();
    const mockDispatch = vi.mocked(dispatcher.dispatchEvent);

    const processor = getForwardingEventProcessor(dispatcher);
    
    processor.start();
    await processor.onRunning();

    const listener = vi.fn();
    const unsub = processor.onDispatch(listener);

    let event = createImpressionEvent();
    processor.process(event);
    expect(dispatcher.dispatchEvent).toHaveBeenCalledOnce();
    expect(dispatcher.dispatchEvent).toHaveBeenCalledWith(formatEvents([event]));
    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(formatEvents([event]));

    unsub();
    event = createImpressionEvent('id-a');
    processor.process(event);
    expect(listener).toHaveBeenCalledOnce();
  });

  it('should resolve onTerminated promise when stop is called', async () => {
    const dispatcher = getMockEventDispatcher();
    const processor = getForwardingEventProcessor(dispatcher);
    processor.start();
    await processor.onRunning();

    expect(processor.getState()).toEqual(ServiceState.Running);

    processor.stop();
    await expect(processor.onTerminated()).resolves.not.toThrow();
  });

  it('should reject onRunning promise when stop is called in New state', async () => {
    const dispatcher = getMockEventDispatcher();
    const processor = getForwardingEventProcessor(dispatcher);

    expect(processor.getState()).toEqual(ServiceState.New);

    processor.stop();
    await expect(processor.onRunning()).rejects.toThrow();
  });
 });
