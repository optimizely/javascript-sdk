/**
 * Copyright 2023-2024, Optimizely
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
import { describe, it, vi, expect } from 'vitest';


import { DefaultOdpManager } from './odp_manager';
import { ServiceState } from '../service';
import { resolvablePromise } from '../utils/promise/resolvablePromise';
import { OdpConfig } from './odp_config';
import { exhaustMicrotasks } from '../tests/testUtils';
import { ODP_USER_KEY } from './constant';
import { OptimizelySegmentOption } from './segment_manager/optimizely_segment_option';
import { OdpEventManager } from './event_manager/odp_event_manager';
import exp from 'constants';
import { CLIENT_VERSION, JAVASCRIPT_CLIENT_ENGINE } from '../utils/enums';

const keyA = 'key-a';
const hostA = 'host-a';
const pixelA = 'pixel-a';
const segmentsA = ['a'];
const userA = 'fs-user-a';

const keyB = 'key-b';
const hostB = 'host-b';
const pixelB = 'pixel-b';
const segmentsB = ['b'];
const userB = 'fs-user-b';

const config = new OdpConfig(keyA, hostA, pixelA, segmentsA);
const updatedConfig = new OdpConfig(keyB, hostB, pixelB, segmentsB);

const getMockOdpEventManager = () => {
  return {
    start: vi.fn(),
    stop: vi.fn(),
    onRunning: vi.fn(),
    onTerminated: vi.fn(),
    getState: vi.fn(),
    updateConfig: vi.fn(),
    sendEvent: vi.fn(),
  };
};

const getMockOdpSegmentManager = () => {
  return {
    fetchQualifiedSegments: vi.fn(),
    updateConfig: vi.fn(),
  };
};

describe('DefaultOdpManager', () => {
  // let mockLogger: LogHandler;
  // let mockRequestHandler: RequestHandler;

  // let odpConfig: OdpConfig;
  // let logger: LogHandler;
  // let defaultRequestHandler: RequestHandler;

  // let mockEventApiManager: OdpEventApiManager;
  // let mockEventManager: OdpEventManager;
  // let mockSegmentApiManager: OdpSegmentApiManager;
  // let mockSegmentManager: OdpSegmentManager;

  // let eventApiManager: OdpEventApiManager;
  // let eventManager: OdpEventManager;
  // let segmentApiManager: OdpSegmentApiManager;
  // let segmentManager: OdpSegmentManager;

  // beforeAll(() => {
  //   mockLogger = mock<LogHandler>();
  //   mockRequestHandler = mock<RequestHandler>();

  //   logger = instance(mockLogger);
  //   defaultRequestHandler = instance(mockRequestHandler);

  //   mockEventApiManager = mock<OdpEventApiManager>();
  //   mockEventManager = mock<OdpEventManager>();
  //   mockSegmentApiManager = mock<OdpSegmentApiManager>();
  //   mockSegmentManager = mock<OdpSegmentManager>();

  //   eventApiManager = instance(mockEventApiManager);
  //   eventManager = instance(mockEventManager);
  //   segmentApiManager = instance(mockSegmentApiManager);
  //   segmentManager = instance(mockSegmentManager);
  // });

  // beforeEach(() => {
  //   resetCalls(mockLogger);
  //   resetCalls(mockRequestHandler);
  //   resetCalls(mockEventApiManager);
  //   resetCalls(mockEventManager);
  //   resetCalls(mockSegmentManager);
  // });

  it('should be in new state on construction', () => {
    const odpManager = new DefaultOdpManager({
      segmentManager: getMockOdpSegmentManager(),
      eventManager: getMockOdpEventManager(),
    });

    expect(odpManager.getState()).toEqual(ServiceState.New);
  });

  it('should be in starting state after start is called', () => {
    const odpManager = new DefaultOdpManager({
      segmentManager: getMockOdpSegmentManager(),
      eventManager: getMockOdpEventManager(),
    });

    odpManager.start();

    expect(odpManager.getState()).toEqual(ServiceState.Starting);
  });
  
  it('should start eventManager after start is called', () => {
    const eventManager = getMockOdpEventManager();

    const odpManager = new DefaultOdpManager({
      segmentManager: getMockOdpSegmentManager(),
      eventManager,
    });

    odpManager.start();
    expect(eventManager.start).toHaveBeenCalled();
  });

  it('should stay in starting state if updateConfig is called but eventManager is still not running', async () => {
    const eventManager = getMockOdpEventManager();
    eventManager.onRunning.mockReturnValue(resolvablePromise<void>().promise);

    const odpManager = new DefaultOdpManager({
      segmentManager: getMockOdpSegmentManager(),
      eventManager,
    });

    odpManager.start();
    expect(odpManager.getState()).toEqual(ServiceState.Starting);

    odpManager.updateConfig({ integrated: true, odpConfig: config });
    await exhaustMicrotasks();
    expect(odpManager.getState()).toEqual(ServiceState.Starting);
  });

  it('should stay in starting state if eventManager is running but config is not yet available', async () => {
    const eventManager = getMockOdpEventManager();
    eventManager.onRunning.mockReturnValue(Promise.resolve());

    const odpManager = new DefaultOdpManager({
      segmentManager: getMockOdpSegmentManager(),
      eventManager,
    });

    odpManager.start();
    expect(odpManager.getState()).toEqual(ServiceState.Starting);

    await exhaustMicrotasks();
    expect(odpManager.getState()).toEqual(ServiceState.Starting);
  });

  it('should go to running state and resolve onRunning() if updateConfig is called and eventManager is running', async () => {
    const eventManager = getMockOdpEventManager();
    const eventManagerPromise = resolvablePromise<void>();
    eventManager.onRunning.mockReturnValue(eventManagerPromise.promise);

    const odpManager = new DefaultOdpManager({
      segmentManager: getMockOdpSegmentManager(),
      eventManager,
    });

    odpManager.start();
    expect(odpManager.getState()).toEqual(ServiceState.Starting);

    odpManager.updateConfig({ integrated: true, odpConfig: config });
    await exhaustMicrotasks();

    expect(odpManager.getState()).toEqual(ServiceState.Starting);
    eventManagerPromise.resolve();

    await expect(odpManager.onRunning()).resolves.not.toThrow();
    expect(odpManager.getState()).toEqual(ServiceState.Running);
  });

  it('should go to failed state and reject onRunning(), onTerminated() if updateConfig is called and eventManager fails to start', async () => {
    const eventManager = getMockOdpEventManager();
    const eventManagerPromise = resolvablePromise<void>();
    eventManager.onRunning.mockReturnValue(eventManagerPromise.promise);

    const odpManager = new DefaultOdpManager({
      segmentManager: getMockOdpSegmentManager(),
      eventManager,
    });

    odpManager.start();
    expect(odpManager.getState()).toEqual(ServiceState.Starting);

    odpManager.updateConfig({ integrated: true, odpConfig: config });
    await exhaustMicrotasks();

    expect(odpManager.getState()).toEqual(ServiceState.Starting);
    eventManagerPromise.reject(new Error('Failed to start'));

    await expect(odpManager.onRunning()).rejects.toThrow();
    await expect(odpManager.onTerminated()).rejects.toThrow();
    expect(odpManager.getState()).toEqual(ServiceState.Failed);
  });

  it('should go to failed state and reject onRunning(), onTerminated() if eventManager fails to start before updateSettings()', async () => {
    const eventManager = getMockOdpEventManager();
    const eventManagerPromise = resolvablePromise<void>();
    eventManager.onRunning.mockReturnValue(eventManagerPromise.promise);

    const odpManager = new DefaultOdpManager({
      segmentManager: getMockOdpSegmentManager(),
      eventManager,
    });

    odpManager.start();
    expect(odpManager.getState()).toEqual(ServiceState.Starting);

    eventManagerPromise.reject(new Error('Failed to start'));

    await expect(odpManager.onRunning()).rejects.toThrow();
    await expect(odpManager.onTerminated()).rejects.toThrow();
    expect(odpManager.getState()).toEqual(ServiceState.Failed);
  });

  it('should pass the changed config to eventManager and segmentManager', async () => {
    const eventManager = getMockOdpEventManager();
    const segmentManager = getMockOdpSegmentManager();

    eventManager.onRunning.mockReturnValue(Promise.resolve());

    const odpManager = new DefaultOdpManager({
      segmentManager,
      eventManager,
    });

    odpManager.start();
    odpManager.updateConfig({ integrated: true, odpConfig: config });
    await odpManager.onRunning();

    expect(eventManager.updateConfig).toHaveBeenNthCalledWith(1, { integrated: true, odpConfig: config });
    expect(segmentManager.updateConfig).toHaveBeenNthCalledWith(1, { integrated: true, odpConfig: config });

    odpManager.updateConfig({ integrated: true, odpConfig: updatedConfig });

    expect(eventManager.updateConfig).toHaveBeenNthCalledWith(2, { integrated: true, odpConfig: updatedConfig });
    expect(segmentManager.updateConfig).toHaveBeenNthCalledWith(2, { integrated: true, odpConfig: updatedConfig });
    expect(eventManager.updateConfig).toHaveBeenCalledTimes(2);
    expect(segmentManager.updateConfig).toHaveBeenCalledTimes(2);
  });

  it('should not call eventManager and segmentManager updateConfig if config does not change', async () => {
    const eventManager = getMockOdpEventManager();
    const segmentManager = getMockOdpSegmentManager();

    eventManager.onRunning.mockReturnValue(Promise.resolve());

    const odpManager = new DefaultOdpManager({
      segmentManager,
      eventManager,
    });

    odpManager.start();
    odpManager.updateConfig({ integrated: true, odpConfig: config });
    await odpManager.onRunning();

    expect(eventManager.updateConfig).toHaveBeenNthCalledWith(1, { integrated: true, odpConfig: config });
    expect(segmentManager.updateConfig).toHaveBeenNthCalledWith(1, { integrated: true, odpConfig: config });

    odpManager.updateConfig({ integrated: true, odpConfig: JSON.parse(JSON.stringify(config)) });

    expect(eventManager.updateConfig).toHaveBeenCalledTimes(1);
    expect(segmentManager.updateConfig).toHaveBeenCalledTimes(1);
  });

  it('fetches qualified segments correctly for both fs_user_id and vuid from segmentManager', async () => {
    const segmentManager = getMockOdpSegmentManager();
    segmentManager.fetchQualifiedSegments.mockImplementation((key: ODP_USER_KEY, ...arg) => {
      if (key === ODP_USER_KEY.FS_USER_ID) {
        return Promise.resolve(['fs1', 'fs2']);
      }
      return Promise.resolve(['vuid1', 'vuid2']);
    });

    const odpManager = new DefaultOdpManager({
      segmentManager,
      eventManager: getMockOdpEventManager(),
    });

    odpManager.start();
    odpManager.updateConfig({ integrated: true, odpConfig: config });
    await odpManager.onRunning();

    const fsSegments = await odpManager.fetchQualifiedSegments(userA);
    expect(fsSegments).toEqual(['fs1', 'fs2']);
    expect(segmentManager.fetchQualifiedSegments).toHaveBeenNthCalledWith(1, ODP_USER_KEY.FS_USER_ID, userA, []);

    const vuidSegments = await odpManager.fetchQualifiedSegments('vuid_abcd');
    expect(vuidSegments).toEqual(['vuid1', 'vuid2']);
    expect(segmentManager.fetchQualifiedSegments).toHaveBeenNthCalledWith(2, ODP_USER_KEY.VUID, 'vuid_abcd', []);
  });

  it('returns null from fetchQualifiedSegments if segmentManger returns null', async () => {
    const segmentManager = getMockOdpSegmentManager();
    segmentManager.fetchQualifiedSegments.mockResolvedValue(null);

    const odpManager = new DefaultOdpManager({
      segmentManager,
      eventManager: getMockOdpEventManager(),
    });

    odpManager.start();
    odpManager.updateConfig({ integrated: true, odpConfig: config });
    await odpManager.onRunning();

    const fsSegments = await odpManager.fetchQualifiedSegments(userA);
    expect(fsSegments).toBeNull();

    const vuidSegments = await odpManager.fetchQualifiedSegments('vuid_abcd');
    expect(vuidSegments).toBeNull();
  });

  it('passes options to segmentManager correctly', async () => {
    const segmentManager = getMockOdpSegmentManager();
    segmentManager.fetchQualifiedSegments.mockResolvedValue(null);

    const odpManager = new DefaultOdpManager({
      segmentManager,
      eventManager: getMockOdpEventManager(),
    });

    odpManager.start();
    odpManager.updateConfig({ integrated: true, odpConfig: config });
    await odpManager.onRunning();

    const options = [OptimizelySegmentOption.IGNORE_CACHE, OptimizelySegmentOption.RESET_CACHE];
    await odpManager.fetchQualifiedSegments(userA, options);
    expect(segmentManager.fetchQualifiedSegments).toHaveBeenNthCalledWith(1, ODP_USER_KEY.FS_USER_ID, userA, options);

    await odpManager.fetchQualifiedSegments('vuid_abcd', options);
    expect(segmentManager.fetchQualifiedSegments).toHaveBeenNthCalledWith(2, ODP_USER_KEY.VUID, 'vuid_abcd', options);

    await odpManager.fetchQualifiedSegments(userA, [OptimizelySegmentOption.IGNORE_CACHE]);
    expect(segmentManager.fetchQualifiedSegments).toHaveBeenNthCalledWith(
      3, ODP_USER_KEY.FS_USER_ID, userA, [OptimizelySegmentOption.IGNORE_CACHE]);

    await odpManager.fetchQualifiedSegments('vuid_abcd', []);
    expect(segmentManager.fetchQualifiedSegments).toHaveBeenNthCalledWith(4, ODP_USER_KEY.VUID, 'vuid_abcd', []);
  });

  it('sends a client_intialized event with the vuid after becoming ready if setVuid is called and odp is integrated', async () => {
    const eventManager = getMockOdpEventManager();
    eventManager.onRunning.mockReturnValue(Promise.resolve());

    const mockSendEvents = vi.mocked(eventManager.sendEvent as OdpEventManager['sendEvent']);
    const odpManager = new DefaultOdpManager({
      segmentManager: getMockOdpSegmentManager(),
      eventManager,
    });

    odpManager.start();
    odpManager.setVuid('vuid_123');

    await exhaustMicrotasks();
    expect(eventManager.sendEvent).not.toHaveBeenCalled();

    odpManager.updateConfig({ integrated: true, odpConfig: config });
    await odpManager.onRunning();

    expect(mockSendEvents).toHaveBeenCalledOnce();

    const { type, action, identifiers } = mockSendEvents.mock.calls[0][0];
    expect(type).toEqual('fullstack');
    expect(action).toEqual('client_initialized');
    expect(identifiers).toEqual(new Map([['vuid', 'vuid_123']]));
  });

  it('does not send a client_intialized event with the vuid after becoming ready if setVuid is called and odp is not integrated', async () => {
    const eventManager = getMockOdpEventManager();
    eventManager.onRunning.mockReturnValue(Promise.resolve());

    const mockSendEvents = vi.mocked(eventManager.sendEvent as OdpEventManager['sendEvent']);
    const odpManager = new DefaultOdpManager({
      segmentManager: getMockOdpSegmentManager(),
      eventManager,
    });

    odpManager.start();
    odpManager.setVuid('vuid_123');

    await exhaustMicrotasks();
    expect(eventManager.sendEvent).not.toHaveBeenCalled();

    odpManager.updateConfig({ integrated: false });
    await odpManager.onRunning();
    
    await exhaustMicrotasks();
    expect(mockSendEvents).not.toHaveBeenCalled();
  });

  it('includes the available vuid in events sent via sendEvent', async () => {
    const eventManager = getMockOdpEventManager();
    eventManager.onRunning.mockReturnValue(Promise.resolve());

    const mockSendEvents = vi.mocked(eventManager.sendEvent as OdpEventManager['sendEvent']);

    const odpManager = new DefaultOdpManager({
      segmentManager: getMockOdpSegmentManager(),
      eventManager,
    });

    odpManager.start();
    odpManager.updateConfig({ integrated: true, odpConfig: config });
    await odpManager.onRunning();

    odpManager.setVuid('vuid_123');

    const event = {
      type: 'type',
      action: 'action',
      identifiers: new Map([['email', 'a@b.com']]),
      data: new Map([['key1', 'value1'], ['key2', 'value2']]),
    };

    odpManager.sendEvent(event);
    const { identifiers } = mockSendEvents.mock.calls[0][0];
    expect(identifiers).toEqual(new Map([['email', 'a@b.com'], ['vuid', 'vuid_123']]));
  });

  it('does not override the vuid in events sent via sendEvent', async () => {
    const eventManager = getMockOdpEventManager();
    eventManager.onRunning.mockReturnValue(Promise.resolve());

    const mockSendEvents = vi.mocked(eventManager.sendEvent as OdpEventManager['sendEvent']);

    const odpManager = new DefaultOdpManager({
      segmentManager: getMockOdpSegmentManager(),
      eventManager,
    });

    odpManager.start();
    odpManager.updateConfig({ integrated: true, odpConfig: config });
    await odpManager.onRunning();

    odpManager.setVuid('vuid_123');

    const event = {
      type: 'type',
      action: 'action',
      identifiers: new Map([['email', 'a@b.com'], ['vuid', 'vuid_456']]),
      data: new Map([['key1', 'value1'], ['key2', 'value2']]),
    };

    odpManager.sendEvent(event);
    const { identifiers } = mockSendEvents.mock.calls[0][0];
    expect(identifiers).toEqual(new Map([['email', 'a@b.com'], ['vuid', 'vuid_456']]));
  });

  it('augments the data with common data before sending the event', async () => {
    const eventManager = getMockOdpEventManager();
    eventManager.onRunning.mockReturnValue(Promise.resolve());

    const mockSendEvents = vi.mocked(eventManager.sendEvent as OdpEventManager['sendEvent']);

    const odpManager = new DefaultOdpManager({
      segmentManager: getMockOdpSegmentManager(),
      eventManager,
    });

    odpManager.start();
    odpManager.updateConfig({ integrated: true, odpConfig: config });
    await odpManager.onRunning();

    const event = {
      type: 'type',
      action: 'action',
      identifiers: new Map([['email', 'a@b.com']]),
      data: new Map([['key1', 'value1'], ['key2', 'value2']]),
    };

    odpManager.sendEvent(event);
    const { data } = mockSendEvents.mock.calls[0][0];
    expect(data.get('idempotence_id')).toBeDefined();
    expect(data.get('data_source_type')).toEqual('sdk');
    expect(data.get('data_source')).toEqual(JAVASCRIPT_CLIENT_ENGINE);
    expect(data.get('data_source_version')).toEqual(CLIENT_VERSION);
    expect(data.get('key1')).toEqual('value1');
    expect(data.get('key2')).toEqual('value2');
  });

  it('uses the clientInfo provided by setClientInfo() when augmenting the data', async () => {
    const eventManager = getMockOdpEventManager();
    eventManager.onRunning.mockReturnValue(Promise.resolve());

    const mockSendEvents = vi.mocked(eventManager.sendEvent as OdpEventManager['sendEvent']);

    const odpManager = new DefaultOdpManager({
      segmentManager: getMockOdpSegmentManager(),
      eventManager,
    });

    odpManager.start();
    odpManager.updateConfig({ integrated: true, odpConfig: config });
    await odpManager.onRunning();

    odpManager.setClientInfo('client', 'version');

    const event = {
      type: 'type',
      action: 'action',
      identifiers: new Map([['email', 'a@b.com']]),
      data: new Map([['key1', 'value1'], ['key2', 'value2']]),
    };

    odpManager.sendEvent(event);
    const { data } = mockSendEvents.mock.calls[0][0];
    expect(data.get('data_source')).toEqual('client');
    expect(data.get('data_source_version')).toEqual('version');
  });

  it('augments the data with user agent data before sending the event if userAgentParser is provided ', async () => {
    const eventManager = getMockOdpEventManager();
    eventManager.onRunning.mockReturnValue(Promise.resolve());

    const mockSendEvents = vi.mocked(eventManager.sendEvent as OdpEventManager['sendEvent']);

    const odpManager = new DefaultOdpManager({
      segmentManager: getMockOdpSegmentManager(),
      eventManager,
      userAgentParser: {
        parseUserAgentInfo: () => ({
          os: { name: 'os', version: '1.0' },
          device: { type: 'phone', model: 'model' },
        }),
      },
    });

    odpManager.start();
    odpManager.updateConfig({ integrated: true, odpConfig: config });
    await odpManager.onRunning();

    const event = {
      type: 'type',
      action: 'action',
      identifiers: new Map([['email', 'a@b.com']]),
      data: new Map([['key1', 'value1'], ['key2', 'value2']]),
    };

    odpManager.sendEvent(event);
    const { data } = mockSendEvents.mock.calls[0][0];
    expect(data.get('os')).toEqual('os');
    expect(data.get('os_version')).toEqual('1.0');
    expect(data.get('device_type')).toEqual('phone');
    expect(data.get('model')).toEqual('model');
  });
  
  // it('should call eventManager.identifyUser with correct parameters when identifyUser is called', async () => {
  //   const odpIntegrationConfig: OdpIntegratedConfig = { 
  //     integrated: true, 
  //     odpConfig: new OdpConfig(keyA, hostA, pixelA, segmentsA) 
  //   };

  //   const odpManager = testOdpManager({
  //     odpIntegrationConfig,
  //     segmentManager,
  //     eventManager,
  //     logger,
  //     vuidEnabled: true,
  //   });

  //   await odpManager.onReady();

  //   const userId = 'user123';
  //   const vuid = 'vuid_123';

  //   odpManager.identifyUser(userId, vuid);
  //   const [userIdArg, vuidArg] = capture(mockEventManager.identifyUser).byCallIndex(0);
  //   expect(userIdArg).toEqual(userId);
  //   expect(vuidArg).toEqual(vuid);

  //   odpManager.identifyUser(userId);
  //   const [userIdArg2, vuidArg2] = capture(mockEventManager.identifyUser).byCallIndex(1);
  //   expect(userIdArg2).toEqual(userId);
  //   expect(vuidArg2).toEqual(undefined);
    
  //   odpManager.identifyUser(vuid);
  //   const [userIdArg3, vuidArg3] = capture(mockEventManager.identifyUser).byCallIndex(2);
  //   expect(userIdArg3).toEqual(undefined);
  //   expect(vuidArg3).toEqual(vuid);
  // });

  // it('should send event with correct parameters', async () => {
  //   const odpIntegrationConfig: OdpIntegratedConfig = { 
  //     integrated: true, 
  //     odpConfig: new OdpConfig(keyA, hostA, pixelA, segmentsA) 
  //   };

  //   const odpManager = testOdpManager({
  //     odpIntegrationConfig,
  //     segmentManager,
  //     eventManager,
  //     logger,
  //     vuidEnabled: true,
  //   });

  //   await odpManager.onReady();

  //   const identifiers = new Map([['email', 'a@b.com']]);
  //   const data = new Map([['key1', 'value1'], ['key2', 'value2']]);

  //   odpManager.sendEvent({
  //     action: 'action',
  //     type: 'type',
  //     identifiers,
  //     data,
  //   });

  //   const [event] = capture(mockEventManager.sendEvent).byCallIndex(0);
  //   expect(event.action).toEqual('action');
  //   expect(event.type).toEqual('type');
  //   expect(event.identifiers).toEqual(identifiers);
  //   expect(event.data).toEqual(data);

  //   // should use `fullstack` as type if empty string is provided
  //   odpManager.sendEvent({
  //     type: '',
  //     action: 'action',
  //     identifiers,
  //     data,
  //   });

  //   const [event2] = capture(mockEventManager.sendEvent).byCallIndex(1);
  //   expect(event2.action).toEqual('action');
  //   expect(event2.type).toEqual('fullstack');
  //   expect(event2.identifiers).toEqual(identifiers);
  // });


  // it('should throw an error if event action is empty string and not call eventManager', async () => {
  //   const odpIntegrationConfig: OdpIntegratedConfig = { 
  //     integrated: true, 
  //     odpConfig: new OdpConfig(keyA, hostA, pixelA, segmentsA) 
  //   };

  //   const odpManager = testOdpManager({
  //     odpIntegrationConfig,
  //     segmentManager,
  //     eventManager,
  //     logger,
  //     vuidEnabled: true,
  //   });

  //   await odpManager.onReady();

  //   const identifiers = new Map([['email', 'a@b.com']]);
  //   const data = new Map([['key1', 'value1'], ['key2', 'value2']]);

  //   const sendEvent = () => odpManager.sendEvent({
  //     action: '',
  //     type: 'type',
  //     identifiers,
  //     data,
  //   });

  //   expect(sendEvent).toThrow('ODP action is not valid');
  //   verify(mockEventManager.sendEvent(anything())).never();
  // });

  // it('should throw an error if event data is invalid', async () => {
  //   const odpIntegrationConfig: OdpIntegratedConfig = { 
  //     integrated: true, 
  //     odpConfig: new OdpConfig(keyA, hostA, pixelA, segmentsA) 
  //   };

  //   const odpManager = testOdpManager({
  //     odpIntegrationConfig,
  //     segmentManager,
  //     eventManager,
  //     logger,
  //     vuidEnabled: true,
  //   });

  //   await odpManager.onReady();

  //   const identifiers = new Map([['email', 'a@b.com']]);
  //   const data = new Map([['key1', {}]]);

  //   const sendEvent = () => odpManager.sendEvent({
  //     action: 'action',
  //     type: 'type',
  //     identifiers,
  //     data,
  //   });

  //   expect(sendEvent).toThrow(ERROR_MESSAGES.ODP_INVALID_DATA);
  //   verify(mockEventManager.sendEvent(anything())).never();
  // });

  // it('should fetch qualified segments correctly for both fs_user_id and vuid', async () => {
  //   const userId = 'user123';
  //   const vuid = 'vuid_123';

  //   when(mockSegmentManager.fetchQualifiedSegments(ODP_USER_KEY.FS_USER_ID, userId, anything()))
  //     .thenResolve(['fs1', 'fs2']);

  //   when(mockSegmentManager.fetchQualifiedSegments(ODP_USER_KEY.VUID, vuid, anything()))
  //     .thenResolve(['vuid1', 'vuid2']);

  //   const odpIntegrationConfig: OdpIntegratedConfig = { 
  //     integrated: true, 
  //     odpConfig: new OdpConfig(keyA, hostA, pixelA, segmentsA) 
  //   };

  //   const odpManager = testOdpManager({
  //     odpIntegrationConfig,
  //     segmentManager: instance(mockSegmentManager),
  //     eventManager,
  //     logger,
  //     vuidEnabled: true,
  //   });

  //   await odpManager.onReady();

  //   const fsSegments = await odpManager.fetchQualifiedSegments(userId);
  //   expect(fsSegments).toEqual(['fs1', 'fs2']);

  //   const vuidSegments = await odpManager.fetchQualifiedSegments(vuid);
  //   expect(vuidSegments).toEqual(['vuid1', 'vuid2']);
  // });


  // it('should stop itself and eventManager if stop is called', async () => {
  //   const odpIntegrationConfig: OdpIntegratedConfig = { 
  //     integrated: true, 
  //     odpConfig: new OdpConfig(keyA, hostA, pixelA, segmentsA) 
  //   };

  //   const odpManager = testOdpManager({
  //     odpIntegrationConfig,
  //     segmentManager,
  //     eventManager,
  //     logger,
  //     vuidEnabled: true,
  //   });

  //   await odpManager.onReady();

  //   odpManager.stop();

  //   expect(odpManager.getStatus()).toEqual(Status.Stopped);
  //   verify(mockEventManager.stop()).once();
  // });



  // it('should drop relevant calls and log error when odpIntegrationConfig is not available', async () => {
  //   const odpManager = testOdpManager({
  //     odpIntegrationConfig: undefined,
  //     segmentManager,
  //     eventManager,
  //     logger,
  //     vuidEnabled: true,
  //   });

  //   const segments = await odpManager.fetchQualifiedSegments('vuid_user1', []);
  //   verify(mockLogger.log(LogLevel.ERROR, ERROR_MESSAGES.ODP_CONFIG_NOT_AVAILABLE)).once();
  //   expect(segments).toBeNull();

  //   odpManager.identifyUser('vuid_user1');
  //   verify(mockLogger.log(LogLevel.ERROR, ERROR_MESSAGES.ODP_CONFIG_NOT_AVAILABLE)).twice();
  //   verify(mockEventManager.identifyUser(anything(), anything())).never();

  //   const identifiers = new Map([['email', 'a@b.com']]);
  //   const data = new Map([['key1', {}]]);

  //   odpManager.sendEvent({
  //     action: 'action',
  //     type: 'type',
  //     identifiers,
  //     data,
  //   });

  //   verify(mockLogger.log(LogLevel.ERROR, ERROR_MESSAGES.ODP_CONFIG_NOT_AVAILABLE)).thrice();
  //   verify(mockEventManager.sendEvent(anything())).never();

  // });

  // it('should drop relevant calls and log error when odp is not integrated', async () => {
  //   const odpManager = testOdpManager({
  //     odpIntegrationConfig: { integrated: false },
  //     segmentManager,
  //     eventManager,
  //     logger,
  //     vuidEnabled: true,
  //   });

  //   await odpManager.onReady();

  //   const segments = await odpManager.fetchQualifiedSegments('vuid_user1', []);
  //   verify(mockLogger.log(LogLevel.ERROR, ERROR_MESSAGES.ODP_NOT_INTEGRATED)).once();
  //   expect(segments).toBeNull();

  //   odpManager.identifyUser('vuid_user1');
  //   verify(mockLogger.log(LogLevel.INFO, ERROR_MESSAGES.ODP_NOT_INTEGRATED)).once();
  //   verify(mockEventManager.identifyUser(anything(), anything())).never();

  //   const identifiers = new Map([['email', 'a@b.com']]);
  //   const data = new Map([['key1', {}]]);

  //   odpManager.sendEvent({
  //     action: 'action',
  //     type: 'type',
  //     identifiers,
  //     data,
  //   });

  //   verify(mockLogger.log(LogLevel.ERROR, ERROR_MESSAGES.ODP_NOT_INTEGRATED)).twice();
  //   verify(mockEventManager.sendEvent(anything())).never();
  // });
});

