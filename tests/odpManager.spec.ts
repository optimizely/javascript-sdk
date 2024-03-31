/**
 * Copyright 2023, Optimizely
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

import { LOG_MESSAGES } from './../lib/utils/enums/index';
import { ERROR_MESSAGES, ODP_USER_KEY } from './../lib/utils/enums/index';

import { LogHandler, LogLevel } from '../lib/modules/logging';
import { RequestHandler } from '../lib/utils/http_request_handler/http';
import { BrowserLRUCache } from './../lib/utils/lru_cache/browser_lru_cache';

import { OdpManager, Status } from '../lib/core/odp/odp_manager';
import { OdpConfig, OdpIntegratedConfig, OdpIntegrationConfig, OdpNotIntegratedConfig } from '../lib/core/odp/odp_config';
import { NodeOdpEventApiManager as OdpEventApiManager } from '../lib/plugins/odp/event_api_manager/index.node';
import { NodeOdpEventManager as OdpEventManager } from '../lib/plugins/odp/event_manager/index.node';
import { IOdpSegmentManager, OdpSegmentManager } from './../lib/core/odp/odp_segment_manager';
import { OdpSegmentApiManager } from '../lib/core/odp/odp_segment_api_manager';
import { IOdpEventManager } from '../lib/shared_types';
import { wait } from './testUtils';
import { resolvablePromise } from '../lib/utils/promise/resolvablePromise';
import exp from 'constants';

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

  // const odpManagerInstance = (config?: OdpConfig) =>
  //   new OdpManager({
  //     odpOptions: {
  //       eventManager,
  //       segmentManager,
  //       segmentsRequestHandler: defaultRequestHandler,
  //       eventRequestHandler: defaultRequestHandler,
  //     },
  //   });

  // it('should drop relevant calls when OdpManager is initialized with the disabled flag', async () => {
  //   const odpManager = new OdpManager({
  //     logger,
  //     odpOptions: {
  //       disabled: true,
  //       segmentsRequestHandler: defaultRequestHandler,
  //       eventRequestHandler: defaultRequestHandler,
  //     },
  //   });
  //   verify(mockLogger.log(LogLevel.INFO, LOG_MESSAGES.ODP_DISABLED)).once();

  //   odpManager.updateSettings(new OdpConfig('valid', 'host', 'pixel-url', []));
  //   expect(odpManager.odpConfig).toBeUndefined;

  //   await odpManager.fetchQualifiedSegments('user1', []);
  //   verify(mockLogger.log(LogLevel.ERROR, ERROR_MESSAGES.ODP_NOT_ENABLED)).once();

  //   odpManager.identifyUser('user1');
  //   verify(mockLogger.log(LogLevel.DEBUG, LOG_MESSAGES.ODP_IDENTIFY_FAILED_ODP_DISABLED)).once();

  //   expect(odpManager.eventManager).toBeUndefined;
  //   expect(odpManager.segmentManager).toBeUndefined;
  // });

  
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

  // it('should use new settings in event manager when ODP Config is updated', async () => {
  //   const odpManager = new OdpManager({
  //     odpOptions: {
  //       segmentsRequestHandler: defaultRequestHandler,
  //       eventRequestHandler: defaultRequestHandler,
  //       eventManager: new OdpEventManager({
  //         odpConfig,
  //         apiManager: eventApiManager,
  //         logger,
  //         clientEngine: '',
  //         clientVersion: '',
  //         batchSize: 1,
  //         flushInterval: 250,
  //       }),
  //     },
  //   });

  //   odpManager.updateSettings(new OdpConfig(keyA, hostA, pixelA, segmentsA));

  //   expect(odpManager.odpConfig.apiKey).toBe(keyA);
  //   expect(odpManager.odpConfig.apiHost).toBe(hostA);
  //   expect(odpManager.odpConfig.pixelUrl).toBe(pixelA);

  //   // odpManager.identifyUser(userA);

  //   // verify(mockEventApiManager.sendEvents(keyA, hostA, anything())).once();

  //   odpManager.updateSettings(new OdpConfig(keyB, hostB, pixelB, segmentsB));
  //   expect(odpManager.odpConfig.apiKey).toBe(keyB);
  //   expect(odpManager.odpConfig.apiHost).toBe(hostB);
  //   expect(odpManager.odpConfig.pixelUrl).toBe(pixelB);

  //   // odpManager.identifyUser(userB);

  //   // verify(mockEventApiManager.sendEvents(keyB, hostB, anything())).once();
  // });

  // it('should use new settings in segment manager when ODP Config is updated', async () => {
  //   const odpManager = new OdpManager({
  //     odpOptions: {
  //       segmentManager: new OdpSegmentManager(odpConfig, new BrowserLRUCache<string, string[]>(), segmentApiManager),
  //       segmentsRequestHandler: defaultRequestHandler,
  //       eventRequestHandler: defaultRequestHandler,
  //     },
  //   });

  //   odpManager.updateSettings(new OdpConfig(keyA, hostA, pixelA, segmentsA));

  //   expect(odpManager.odpConfig.apiKey).toBe(keyA);
  //   expect(odpManager.odpConfig.apiHost).toBe(hostA);
  //   expect(odpManager.odpConfig.pixelUrl).toBe(pixelA);

  //   await odpManager.fetchQualifiedSegments(userA);
  //   verify(mockSegmentApiManager.fetchSegments(keyA, hostA, ODP_USER_KEY.FS_USER_ID, userA, anything())).once();

  //   odpManager.updateSettings(new OdpConfig(keyB, hostB, pixelB, segmentsB));
  //   expect(odpManager.odpConfig.apiKey).toBe(keyB);
  //   expect(odpManager.odpConfig.apiHost).toBe(hostB);
  //   expect(odpManager.odpConfig.pixelUrl).toBe(pixelB);

  //   await odpManager.fetchQualifiedSegments(userB);
  //   verify(mockSegmentApiManager.fetchSegments(keyB, hostB, ODP_USER_KEY.FS_USER_ID, userB, anything())).once();
  // });

  // it('should get event manager', () => {
  //   const odpManagerA = odpManagerInstance();
  //   expect(odpManagerA.eventManager).not.toBe(null);

  //   const odpManagerB = new OdpManager({
  //     logger,
  //     odpOptions: {
  //       segmentsRequestHandler: defaultRequestHandler,
  //       eventRequestHandler: defaultRequestHandler,
  //     },
  //   });
  //   expect(odpManagerB.eventManager).not.toBe(null);
  // });

  // it('should get segment manager', () => {
  //   const odpManagerA = odpManagerInstance();
  //   expect(odpManagerA.segmentManager).not.toBe(null);

  //   const odpManagerB = new OdpManager({
  //     odpOptions: {
  //       segmentsRequestHandler: defaultRequestHandler,
  //       eventRequestHandler: defaultRequestHandler,
  //     },
  //   });
  //   expect(odpManagerB.eventManager).not.toBe(null);
  // });
});
