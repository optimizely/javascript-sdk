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
/// <reference types="jest" />

import { anything, capture, instance, mock, resetCalls, verify, when } from 'ts-mockito';

import { ERROR_MESSAGES, ODP_USER_KEY } from './../lib/utils/enums/index';

import { LogHandler, LogLevel } from '../lib/modules/logging';
import { RequestHandler } from '../lib/utils/http_request_handler/http';
import { OdpManager, Status } from '../lib/core/odp/odp_manager';
import { OdpConfig, OdpIntegratedConfig, OdpIntegrationConfig, OdpNotIntegratedConfig } from '../lib/core/odp/odp_config';
import { NodeOdpEventApiManager as OdpEventApiManager } from '../lib/plugins/odp/event_api_manager/index.node';
import { NodeOdpEventManager as OdpEventManager } from '../lib/plugins/odp/event_manager/index.node';
import { IOdpSegmentManager, OdpSegmentManager } from './../lib/core/odp/odp_segment_manager';
import { IOdpEventManager } from '../lib/shared_types';
import { wait } from './testUtils';
import { resolvablePromise } from '../lib/utils/promise/resolvablePromise';

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

const testOdpManager = ({
  odpIntegrationConfig,
  segmentManager,
  eventManager,
  logger,
  vuidEnabled,
  vuid,
  vuidInitializer,
}: {
  odpIntegrationConfig?: OdpIntegrationConfig;
  segmentManager: IOdpSegmentManager;
  eventManager: IOdpEventManager;
  logger: LogHandler;
  vuidEnabled?: boolean;
  vuid?: string;
  vuidInitializer?: () => Promise<void>;
}): OdpManager => {
  class TestOdpManager extends OdpManager{
    constructor() {
      super({ odpIntegrationConfig, segmentManager, eventManager, logger });
    }
    isVuidEnabled(): boolean {
      return vuidEnabled ?? false;
    }
    getVuid(): string {
      return vuid ?? 'vuid_123';
    }
    protected initializeVuid(): Promise<void> {
      return vuidInitializer?.() ?? Promise.resolve();
    }
    registerVuid(vuid: string | undefined): void {
      throw new Error('Method not implemented.' + vuid || '');
    }
  }
  return new TestOdpManager();
}

describe('OdpManager', () => {
  let mockLogger: LogHandler;
  let mockRequestHandler: RequestHandler;

  let odpConfig: OdpConfig;
  let logger: LogHandler;
  let defaultRequestHandler: RequestHandler;

  let mockEventApiManager: OdpEventApiManager;
  let mockEventManager: OdpEventManager;
  let mockSegmentApiManager: OdpSegmentApiManager;
  let mockSegmentManager: OdpSegmentManager;

  let eventApiManager: OdpEventApiManager;
  let eventManager: OdpEventManager;
  let segmentApiManager: OdpSegmentApiManager;
  let segmentManager: OdpSegmentManager;

  beforeAll(() => {
    mockLogger = mock<LogHandler>();
    mockRequestHandler = mock<RequestHandler>();

    logger = instance(mockLogger);
    defaultRequestHandler = instance(mockRequestHandler);

    mockEventApiManager = mock<OdpEventApiManager>();
    mockEventManager = mock<OdpEventManager>();
    mockSegmentApiManager = mock<OdpSegmentApiManager>();
    mockSegmentManager = mock<OdpSegmentManager>();

    eventApiManager = instance(mockEventApiManager);
    eventManager = instance(mockEventManager);
    segmentApiManager = instance(mockSegmentApiManager);
    segmentManager = instance(mockSegmentManager);
  });

  beforeEach(() => {
    resetCalls(mockLogger);
    resetCalls(mockRequestHandler);
    resetCalls(mockEventApiManager);
    resetCalls(mockEventManager);
    resetCalls(mockSegmentManager);
  });


  it('should be in stopped status and not ready if constructed without odpIntegrationConfig', () => {
    const odpManager = testOdpManager({
      segmentManager,
      eventManager,
      logger,
    });

    expect(odpManager.isReady()).toBe(false);
    expect(odpManager.getStatus()).toEqual(Status.Stopped);
  });

  it('should call initialzeVuid on construction if vuid is enabled', () => {
    const vuidInitializer = jest.fn();

    const odpManager = testOdpManager({
      segmentManager,
      eventManager,
      logger,
      vuidEnabled: true,
      vuidInitializer: vuidInitializer,
    });

    expect(vuidInitializer).toHaveBeenCalledTimes(1);
  });

  it('should become ready only after odpIntegrationConfig is provided if vuid is not enabled', async () => {
    const odpManager = testOdpManager({
      segmentManager,
      eventManager,
      logger,
      vuidEnabled: false,
    });

    // should not be ready untill odpIntegrationConfig is provided
    await wait(500);
    expect(odpManager.isReady()).toBe(false);

    const odpIntegrationConfig: OdpNotIntegratedConfig = { integrated: false };
    odpManager.updateSettings(odpIntegrationConfig);

    await odpManager.onReady();
    expect(odpManager.isReady()).toBe(true);
  });

  it('should become ready if odpIntegrationConfig is provided in constructor and then initialzeVuid', async () => {
    const vuidPromise = resolvablePromise<void>();
    const odpIntegrationConfig: OdpNotIntegratedConfig = { integrated: false };

    const vuidInitializer = () => {
      return vuidPromise.promise;
    }

    const odpManager = testOdpManager({
      odpIntegrationConfig,
      segmentManager,
      eventManager,
      logger,
      vuidEnabled: true,
      vuidInitializer,
    });

    await wait(500);
    expect(odpManager.isReady()).toBe(false);

    vuidPromise.resolve();

    await odpManager.onReady();
    expect(odpManager.isReady()).toBe(true);
  });

  it('should become ready after odpIntegrationConfig is provided using updateSettings() and then initialzeVuid finishes', async () => {
    const vuidPromise = resolvablePromise<void>();

    const vuidInitializer = () => {
      return vuidPromise.promise;
    }

    const odpManager = testOdpManager({
      segmentManager,
      eventManager,
      logger,
      vuidEnabled: true,
      vuidInitializer,
    });


    expect(odpManager.isReady()).toBe(false);

    const odpIntegrationConfig: OdpNotIntegratedConfig = { integrated: false };
    odpManager.updateSettings(odpIntegrationConfig);
    
    await wait(500);
    expect(odpManager.isReady()).toBe(false);

    vuidPromise.resolve();

    await odpManager.onReady();
    expect(odpManager.isReady()).toBe(true);
  });

  it('should become ready after initialzeVuid finishes and then odpIntegrationConfig is provided using updateSettings()', async () => {
    const vuidPromise = resolvablePromise<void>();

    const vuidInitializer = () => {
      return vuidPromise.promise;
    }

    const odpManager = testOdpManager({
      segmentManager,
      eventManager,
      logger,
      vuidEnabled: true,
      vuidInitializer,
    });

    expect(odpManager.isReady()).toBe(false);
    vuidPromise.resolve();

    await wait(500);
    expect(odpManager.isReady()).toBe(false);

    const odpIntegrationConfig: OdpNotIntegratedConfig = { integrated: false };
    odpManager.updateSettings(odpIntegrationConfig);

    await odpManager.onReady();
    expect(odpManager.isReady()).toBe(true);
  });

  it('should become ready and stay in stopped state and not start eventManager if OdpNotIntegrated config is provided', async () => {
    const vuidPromise = resolvablePromise<void>();

    const odpManager = testOdpManager({
      segmentManager,
      eventManager,
      logger,
      vuidEnabled: true,
    });

    const odpIntegrationConfig: OdpNotIntegratedConfig = { integrated: false };
    odpManager.updateSettings(odpIntegrationConfig);

    await odpManager.onReady();
    expect(odpManager.isReady()).toBe(true);
    expect(odpManager.getStatus()).toEqual(Status.Stopped);
    verify(mockEventManager.start()).never();    
  });

  it('should pass the integrated odp config given in constructor to eventManger and segmentManager', async () => {
    when(mockEventManager.updateSettings(anything())).thenReturn(undefined);
    when(mockSegmentManager.updateSettings(anything())).thenReturn(undefined);

    const odpIntegrationConfig: OdpIntegratedConfig = { 
      integrated: true, 
      odpConfig: new OdpConfig(keyA, hostA, pixelA, segmentsA) 
    };

    const odpManager = testOdpManager({
      odpIntegrationConfig,
      segmentManager,
      eventManager,
      logger,
      vuidEnabled: true,
    });

    verify(mockEventManager.updateSettings(anything())).once();
    const [eventOdpConfig] = capture(mockEventManager.updateSettings).first();
    expect(eventOdpConfig.equals(odpIntegrationConfig.odpConfig)).toBe(true);

    verify(mockSegmentManager.updateSettings(anything())).once();
    const [segmentOdpConfig] = capture(mockEventManager.updateSettings).first();
    expect(segmentOdpConfig.equals(odpIntegrationConfig.odpConfig)).toBe(true);
  });

  it('should pass the integrated odp config given in updateSettings() to eventManger and segmentManager', async () => {
    when(mockEventManager.updateSettings(anything())).thenReturn(undefined);
    when(mockSegmentManager.updateSettings(anything())).thenReturn(undefined);

    const odpIntegrationConfig: OdpIntegratedConfig = { 
      integrated: true, 
      odpConfig: new OdpConfig(keyA, hostA, pixelA, segmentsA) 
    };

    const odpManager = testOdpManager({
      segmentManager,
      eventManager,
      logger,
      vuidEnabled: true,
    });

    odpManager.updateSettings(odpIntegrationConfig);

    verify(mockEventManager.updateSettings(anything())).once();
    const [eventOdpConfig] = capture(mockEventManager.updateSettings).first();
    expect(eventOdpConfig.equals(odpIntegrationConfig.odpConfig)).toBe(true);

    verify(mockSegmentManager.updateSettings(anything())).once();
    const [segmentOdpConfig] = capture(mockEventManager.updateSettings).first();
    expect(segmentOdpConfig.equals(odpIntegrationConfig.odpConfig)).toBe(true);
  });

  it('should start if odp is integrated and start odpEventManger', async () => {
    const odpManager = testOdpManager({
      segmentManager,
      eventManager,
      logger,
      vuidEnabled: true,
    });

    const odpIntegrationConfig: OdpIntegratedConfig = { 
      integrated: true, 
      odpConfig: new OdpConfig(keyA, hostA, pixelA, segmentsA) 
    };

    odpManager.updateSettings(odpIntegrationConfig);
    await odpManager.onReady();
    expect(odpManager.isReady()).toBe(true);
    expect(odpManager.getStatus()).toEqual(Status.Running);
  });

  it('should just update config when updateSettings is called in running state', async () => {
    const odpManager = testOdpManager({
      segmentManager,
      eventManager,
      logger,
      vuidEnabled: true,
    });

    const odpIntegrationConfig: OdpIntegratedConfig = { 
      integrated: true, 
      odpConfig: new OdpConfig(keyA, hostA, pixelA, segmentsA) 
    };

    odpManager.updateSettings(odpIntegrationConfig);

    await odpManager.onReady();
    expect(odpManager.isReady()).toBe(true);
    expect(odpManager.getStatus()).toEqual(Status.Running);

    const newOdpIntegrationConfig: OdpIntegratedConfig = { 
      integrated: true, 
      odpConfig: new OdpConfig(keyB, hostB, pixelB, segmentsB) 
    };

    odpManager.updateSettings(newOdpIntegrationConfig);

    verify(mockEventManager.start()).once();
    verify(mockEventManager.stop()).never();
    verify(mockEventManager.updateSettings(anything())).twice();
    const [firstEventOdpConfig] = capture(mockEventManager.updateSettings).first();
    expect(firstEventOdpConfig.equals(odpIntegrationConfig.odpConfig)).toBe(true);
    const [secondEventOdpConfig] = capture(mockEventManager.updateSettings).second();
    expect(secondEventOdpConfig.equals(newOdpIntegrationConfig.odpConfig)).toBe(true);

    verify(mockSegmentManager.updateSettings(anything())).twice();
    const [firstSegmentOdpConfig] = capture(mockEventManager.updateSettings).first();
    expect(firstSegmentOdpConfig.equals(odpIntegrationConfig.odpConfig)).toBe(true);
    const [secondSegmentOdpConfig] = capture(mockEventManager.updateSettings).second();
    expect(secondSegmentOdpConfig.equals(newOdpIntegrationConfig.odpConfig)).toBe(true);
  });

  it('should stop and stop eventManager if OdpNotIntegrated config is updated in running state', async () => {
    const odpIntegrationConfig: OdpIntegratedConfig = { 
      integrated: true, 
      odpConfig: new OdpConfig(keyA, hostA, pixelA, segmentsA) 
    };

    const odpManager = testOdpManager({
      odpIntegrationConfig,
      segmentManager,
      eventManager,
      logger,
      vuidEnabled: true,
    });

    await odpManager.onReady();

    expect(odpManager.isReady()).toBe(true);
    expect(odpManager.getStatus()).toEqual(Status.Running);

    const newOdpIntegrationConfig: OdpNotIntegratedConfig = { 
      integrated: false, 
    };

    odpManager.updateSettings(newOdpIntegrationConfig);

    expect(odpManager.getStatus()).toEqual(Status.Stopped);
    verify(mockEventManager.stop()).once();
  });

  it('should register vuid after becoming ready if odp is integrated', async () => {
    const odpIntegrationConfig: OdpIntegratedConfig = { 
      integrated: true, 
      odpConfig: new OdpConfig(keyA, hostA, pixelA, segmentsA) 
    };

    const odpManager = testOdpManager({
      odpIntegrationConfig,
      segmentManager,
      eventManager,
      logger,
      vuidEnabled: true,
    });

    await odpManager.onReady();
    
    verify(mockEventManager.registerVuid(anything())).once();
  });

  it('should call eventManager.identifyUser with correct parameters when identifyUser is called', async () => {
    const odpIntegrationConfig: OdpIntegratedConfig = { 
      integrated: true, 
      odpConfig: new OdpConfig(keyA, hostA, pixelA, segmentsA) 
    };

    const odpManager = testOdpManager({
      odpIntegrationConfig,
      segmentManager,
      eventManager,
      logger,
      vuidEnabled: true,
    });

    await odpManager.onReady();

    const userId = 'user123';
    const vuid = 'vuid_123';

    odpManager.identifyUser(userId, vuid);
    const [userIdArg, vuidArg] = capture(mockEventManager.identifyUser).byCallIndex(0);
    expect(userIdArg).toEqual(userId);
    expect(vuidArg).toEqual(vuid);

    odpManager.identifyUser(userId);
    const [userIdArg2, vuidArg2] = capture(mockEventManager.identifyUser).byCallIndex(1);
    expect(userIdArg2).toEqual(userId);
    expect(vuidArg2).toEqual(undefined);

    odpManager.identifyUser(vuid);
    const [userIdArg3, vuidArg3] = capture(mockEventManager.identifyUser).byCallIndex(2);
    expect(userIdArg3).toEqual(undefined);
    expect(vuidArg3).toEqual(vuid);
  });

  it('should send event with correct parameters', async () => {
    const odpIntegrationConfig: OdpIntegratedConfig = { 
      integrated: true, 
      odpConfig: new OdpConfig(keyA, hostA, pixelA, segmentsA) 
    };

    const odpManager = testOdpManager({
      odpIntegrationConfig,
      segmentManager,
      eventManager,
      logger,
      vuidEnabled: true,
    });

    await odpManager.onReady();

    const identifiers = new Map([['email', 'a@b.com']]);
    const data = new Map([['key1', 'value1'], ['key2', 'value2']]);

    odpManager.sendEvent({
      action: 'action',
      type: 'type',
      identifiers,
      data,
    });

    const [event] = capture(mockEventManager.sendEvent).byCallIndex(0);
    expect(event.action).toEqual('action');
    expect(event.type).toEqual('type');
    expect(event.identifiers).toEqual(identifiers);
    expect(event.data).toEqual(data);

    // should use `fullstack` as type if empty string is provided
    odpManager.sendEvent({
      type: '',
      action: 'action',
      identifiers,
      data,
    });

    const [event2] = capture(mockEventManager.sendEvent).byCallIndex(1);
    expect(event2.action).toEqual('action');
    expect(event2.type).toEqual('fullstack');
    expect(event2.identifiers).toEqual(identifiers);
  });


  it('should throw an error if event action is empty string and not call eventManager', async () => {
    const odpIntegrationConfig: OdpIntegratedConfig = { 
      integrated: true, 
      odpConfig: new OdpConfig(keyA, hostA, pixelA, segmentsA) 
    };

    const odpManager = testOdpManager({
      odpIntegrationConfig,
      segmentManager,
      eventManager,
      logger,
      vuidEnabled: true,
    });

    await odpManager.onReady();

    const identifiers = new Map([['email', 'a@b.com']]);
    const data = new Map([['key1', 'value1'], ['key2', 'value2']]);

    const sendEvent = () => odpManager.sendEvent({
      action: '',
      type: 'type',
      identifiers,
      data,
    });

    expect(sendEvent).toThrow('ODP action is not valid');
    verify(mockEventManager.sendEvent(anything())).never();
  });

  it('should throw an error if event data is invalid', async () => {
    const odpIntegrationConfig: OdpIntegratedConfig = { 
      integrated: true, 
      odpConfig: new OdpConfig(keyA, hostA, pixelA, segmentsA) 
    };

    const odpManager = testOdpManager({
      odpIntegrationConfig,
      segmentManager,
      eventManager,
      logger,
      vuidEnabled: true,
    });

    await odpManager.onReady();

    const identifiers = new Map([['email', 'a@b.com']]);
    const data = new Map([['key1', {}]]);

    const sendEvent = () => odpManager.sendEvent({
      action: 'action',
      type: 'type',
      identifiers,
      data,
    });

    expect(sendEvent).toThrow(ERROR_MESSAGES.ODP_INVALID_DATA);
    verify(mockEventManager.sendEvent(anything())).never();
  });

  it.only('should fetch qualified segments correctly for both fs_user_id and vuid', async () => {
    const userId = 'user123';
    const vuid = 'vuid_123';

    when(mockSegmentManager.fetchQualifiedSegments(ODP_USER_KEY.FS_USER_ID, userId, anything()))
      .thenResolve(['fs1', 'fs2']);

    when(mockSegmentManager.fetchQualifiedSegments(ODP_USER_KEY.VUID, vuid, anything()))
      .thenResolve(['vuid1', 'vuid2']);

    const odpIntegrationConfig: OdpIntegratedConfig = { 
      integrated: true, 
      odpConfig: new OdpConfig(keyA, hostA, pixelA, segmentsA) 
    };

    const odpManager = testOdpManager({
      odpIntegrationConfig,
      segmentManager: instance(mockSegmentManager),
      eventManager,
      logger,
      vuidEnabled: true,
    });

    await odpManager.onReady();

    const fsSegments = await odpManager.fetchQualifiedSegments(userId);
    expect(fsSegments).toEqual(['fs1', 'fs2']);

    const vuidSegments = await odpManager.fetchQualifiedSegments(vuid);
    expect(vuidSegments).toEqual(['vuid1', 'vuid2']);
  });


  it('should stop itself and eventManager if stop is called', async () => {
    const odpIntegrationConfig: OdpIntegratedConfig = { 
      integrated: true, 
      odpConfig: new OdpConfig(keyA, hostA, pixelA, segmentsA) 
    };

    const odpManager = testOdpManager({
      odpIntegrationConfig,
      segmentManager,
      eventManager,
      logger,
      vuidEnabled: true,
    });

    await odpManager.onReady();

    odpManager.stop();

    expect(odpManager.getStatus()).toEqual(Status.Stopped);
    verify(mockEventManager.stop()).once();
  });



  it('should drop relevant calls and log error when odpIntegrationConfig is not available', async () => {
    const odpManager = testOdpManager({
      odpIntegrationConfig: undefined,
      segmentManager,
      eventManager,
      logger,
      vuidEnabled: true,
    });

    const segments = await odpManager.fetchQualifiedSegments('vuid_user1', []);
    verify(mockLogger.log(LogLevel.ERROR, ERROR_MESSAGES.ODP_CONFIG_NOT_AVAILABLE)).once();
    expect(segments).toBeNull();

    odpManager.identifyUser('vuid_user1');
    verify(mockLogger.log(LogLevel.ERROR, ERROR_MESSAGES.ODP_CONFIG_NOT_AVAILABLE)).twice();
    verify(mockEventManager.identifyUser(anything(), anything())).never();

    const identifiers = new Map([['email', 'a@b.com']]);
    const data = new Map([['key1', {}]]);

    odpManager.sendEvent({
      action: 'action',
      type: 'type',
      identifiers,
      data,
    });

    verify(mockLogger.log(LogLevel.ERROR, ERROR_MESSAGES.ODP_CONFIG_NOT_AVAILABLE)).thrice();
    verify(mockEventManager.sendEvent(anything())).never();

  });

  it('should drop relevant calls and log error when odp is not integrated', async () => {
    const odpManager = testOdpManager({
      odpIntegrationConfig: { integrated: false },
      segmentManager,
      eventManager,
      logger,
      vuidEnabled: true,
    });

    await odpManager.onReady();

    const segments = await odpManager.fetchQualifiedSegments('vuid_user1', []);
    verify(mockLogger.log(LogLevel.ERROR, ERROR_MESSAGES.ODP_NOT_INTEGRATED)).once();
    expect(segments).toBeNull();

    odpManager.identifyUser('vuid_user1');
    verify(mockLogger.log(LogLevel.ERROR, ERROR_MESSAGES.ODP_NOT_INTEGRATED)).twice();
    verify(mockEventManager.identifyUser(anything(), anything())).never();

    const identifiers = new Map([['email', 'a@b.com']]);
    const data = new Map([['key1', {}]]);

    odpManager.sendEvent({
      action: 'action',
      type: 'type',
      identifiers,
      data,
    });

    verify(mockLogger.log(LogLevel.ERROR, ERROR_MESSAGES.ODP_NOT_INTEGRATED)).thrice();
    verify(mockEventManager.sendEvent(anything())).never();
  });
});

