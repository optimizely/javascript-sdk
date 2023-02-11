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

import { expect, describe, it, beforeAll, beforeEach } from '@jest/globals';
import { anything, instance, mock, resetCalls, verify } from 'ts-mockito';

import { LOG_MESSAGES } from './../lib/utils/enums/index';
import { ERROR_MESSAGES, ODP_USER_KEY } from './../lib/utils/enums/index';

import { LogHandler, LogLevel } from '../lib/modules/logging';
import { RequestHandler } from '../lib/utils/http_request_handler/http';
import { BrowserLRUCache } from './../lib/utils/lru_cache/browser_lru_cache';

import { BrowserOdpManager } from './../lib/plugins/odp_manager/index.browser';
import { OdpConfig } from '../lib/core/odp/odp_config';
import { OdpEventApiManager } from '../lib/core/odp/odp_event_api_manager';
import { OdpEventManager, STATE } from '../lib/core/odp/odp_event_manager';
import { OdpSegmentManager } from './../lib/core/odp/odp_segment_manager';
import { OdpSegmentApiManager } from '../lib/core/odp/odp_segment_api_manager';
import { VuidManager } from '../lib/plugins/vuid_manager';

const keyA = 'key-a';
const hostA = 'host-a';
const segmentsA = ['a'];
const userA = 'fs-user-a';

const keyB = 'key-b';
const hostB = 'host-b';
const segmentsB = ['b'];
const userB = 'fs-user-b';

describe('OdpManager', () => {
  let mockLogger: LogHandler;
  let mockRequestHandler: RequestHandler;

  let odpConfig: OdpConfig;
  let logger: LogHandler;
  let requestHandler: RequestHandler;

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

    odpConfig = new OdpConfig();
    logger = instance(mockLogger);
    requestHandler = instance(mockRequestHandler);

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

  const browserOdpManagerInstance = (config?: OdpConfig) =>
    new BrowserOdpManager({
      disable: false,
      odpConfig: config || undefined,
      eventManager,
      segmentManager,
    });

  it('should register VUID automatically on BrowserOdpManager initialization', async () => {
    const browserOdpManager = browserOdpManagerInstance();
    const vuidManager = await VuidManager.instance(BrowserOdpManager.cache);
  });

  it('should drop relevant calls when OdpManager is initialized with the disabled flag, except for VUID', async () => {
    const browserOdpManager = new BrowserOdpManager({ disable: true, logger });
    await new Promise(resolve => setTimeout(resolve, 400));

    verify(mockLogger.log(LogLevel.INFO, ERROR_MESSAGES.ODP_NOT_ENABLED)).once();

    browserOdpManager.updateSettings(new OdpConfig('valid', 'host', []));
    expect(browserOdpManager.odpConfig).toBeUndefined;

    await browserOdpManager.fetchQualifiedSegments(ODP_USER_KEY.VUID, 'vuid_user1', []);
    verify(mockLogger.log(LogLevel.ERROR, ERROR_MESSAGES.ODP_NOT_ENABLED)).once();

    browserOdpManager.identifyUser('vuid_user1');
    verify(mockLogger.log(LogLevel.DEBUG, LOG_MESSAGES.ODP_IDENTIFY_FAILED_ODP_DISABLED)).once();

    expect(browserOdpManager.eventManager).toBeUndefined;
    expect(browserOdpManager.segmentManager).toBeUndefined;

    verify(mockEventManager.registerVuid(anything())).once();
    const vuidManager = await VuidManager.instance(BrowserOdpManager.cache);
    expect(vuidManager.vuid.slice(0, 5)).toBe('vuid_');
  });

  it('should start ODP Event Manager when ODP Manager is initialized', () => {
    const browserOdpManager = browserOdpManagerInstance();
    verify(mockEventManager.start()).once();
    expect(browserOdpManager.eventManager).not.toBeUndefined();
  });

  it('should stop ODP Event Manager when close is called', () => {
    const browserOdpManager = browserOdpManagerInstance();
    verify(mockEventManager.stop()).never();

    browserOdpManager.close();
    verify(mockEventManager.stop()).once();
  });

  it('should use new settings in event manager when ODP Config is updated', async () => {
    const browserOdpManager = new BrowserOdpManager({
      disable: false,
      odpConfig: new OdpConfig(keyA, hostA, segmentsA),
      eventManager: new OdpEventManager({
        odpConfig,
        apiManager: eventApiManager,
        logger,
        clientEngine: '',
        clientVersion: '',
        batchSize: 1,
        flushInterval: 250,
      }),
    });

    await new Promise(resolve => setTimeout(resolve, 400));
    verify(mockEventApiManager.sendEvents(keyA, hostA, anything())).once(); // Called once with intializeVuid

    browserOdpManager.identifyUser(userA);

    await new Promise(resolve => setTimeout(resolve, 400));

    verify(mockEventApiManager.sendEvents(keyA, hostA, anything())).twice(); // Called again with identifyUser

    browserOdpManager.updateSettings(new OdpConfig(keyB, hostB, segmentsB));
    browserOdpManager.eventManager.identifyUser(userB);

    await new Promise(resolve => setTimeout(resolve, 400));
    verify(mockEventApiManager.sendEvents(keyB, hostB, anything())).once();
  });

  it('should use new settings in segment manager when ODP Config is updated', async () => {
    const browserOdpManager = new BrowserOdpManager({
      disable: false,
      odpConfig: new OdpConfig(keyA, hostA, segmentsA),
      segmentManager: new OdpSegmentManager(odpConfig, new BrowserLRUCache<string, string[]>(), segmentApiManager),
    });

    browserOdpManager.fetchQualifiedSegments(ODP_USER_KEY.VUID, userA);

    await new Promise(resolve => setTimeout(resolve, 400));
    verify(mockSegmentApiManager.fetchSegments(keyA, hostA, ODP_USER_KEY.VUID, userA, anything())).once();

    browserOdpManager.updateSettings(new OdpConfig(keyB, hostB, segmentsB));
    browserOdpManager.fetchQualifiedSegments(ODP_USER_KEY.VUID, userB);

    await new Promise(resolve => setTimeout(resolve, 400));
    verify(mockSegmentApiManager.fetchSegments(keyB, hostB, ODP_USER_KEY.VUID, userB, anything())).once();
  });

  it('should get event manager', () => {
    const browserOdpManagerA = browserOdpManagerInstance();
    expect(browserOdpManagerA.eventManager).not.toBe(null);

    const browserOdpManagerB = new BrowserOdpManager({
      disable: false,
    });
    expect(browserOdpManagerB.eventManager).not.toBe(null);
  });

  it('should get segment manager', () => {
    const browserOdpManagerA = browserOdpManagerInstance();
    expect(browserOdpManagerA.segmentManager).not.toBe(null);

    const browserOdpManagerB = new BrowserOdpManager({
      disable: false,
    });
    expect(browserOdpManagerB.eventManager).not.toBe(null);
  });
});
