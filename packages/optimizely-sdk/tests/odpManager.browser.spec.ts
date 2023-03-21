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

import { anything, capture, instance, mock, resetCalls, verify } from 'ts-mockito';

import { LOG_MESSAGES, ODP_DEFAULT_EVENT_TYPE, ODP_EVENT_ACTION } from './../lib/utils/enums/index';
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
import { OdpEvent } from '../lib/core/odp/odp_event';

const keyA = 'key-a';
const hostA = 'host-a';
const segmentsA = ['a'];
const userA = 'fs-user-a';
const vuidA = 'vuid_a';
const odpConfigA = new OdpConfig(keyA, hostA, segmentsA);

const keyB = 'key-b';
const hostB = 'host-b';
const segmentsB = ['b'];
const userB = 'fs-user-b';
const vuidB = 'vuid_b';
const odpConfigB = new OdpConfig(keyB, hostB, segmentsB);

describe('OdpManager', () => {
  let odpConfig: OdpConfig;

  let mockLogger: LogHandler;
  let fakeLogger: LogHandler;

  let mockRequestHandler: RequestHandler;
  let fakeRequestHandler: RequestHandler;

  let mockEventApiManager: OdpEventApiManager;
  let fakeEventApiManager: OdpEventApiManager;

  let mockEventManager: OdpEventManager;
  let fakeEventManager: OdpEventManager;

  let mockSegmentApiManager: OdpSegmentApiManager;
  let fakeSegmentApiManager: OdpSegmentApiManager;

  let mockSegmentManager: OdpSegmentManager;
  let fakeSegmentManager: OdpSegmentManager;

  let mockBrowserOdpManager: BrowserOdpManager;
  let fakeBrowserOdpManager: BrowserOdpManager;

  beforeAll(() => {
    mockLogger = mock<LogHandler>();
    mockRequestHandler = mock<RequestHandler>();

    odpConfig = new OdpConfig();
    fakeLogger = instance(mockLogger);
    fakeRequestHandler = instance(mockRequestHandler);

    mockEventApiManager = mock<OdpEventApiManager>();
    mockEventManager = mock<OdpEventManager>();
    mockSegmentApiManager = mock<OdpSegmentApiManager>();
    mockSegmentManager = mock<OdpSegmentManager>();
    mockBrowserOdpManager = mock<BrowserOdpManager>();

    fakeEventApiManager = instance(mockEventApiManager);
    fakeEventManager = instance(mockEventManager);
    fakeSegmentApiManager = instance(mockSegmentApiManager);
    fakeSegmentManager = instance(mockSegmentManager);
    fakeBrowserOdpManager = instance(mockBrowserOdpManager);
  });

  beforeEach(() => {
    resetCalls(mockLogger);
    resetCalls(mockRequestHandler);
    resetCalls(mockEventApiManager);
    resetCalls(mockEventManager);
    resetCalls(mockSegmentManager);
  });

  const browserOdpManagerInstance = () =>
    new BrowserOdpManager({
      disable: false,
      eventManager: fakeEventManager,
      segmentManager: fakeSegmentManager,
    });

  it('should register VUID automatically on BrowserOdpManager initialization', async () => {
    const browserOdpManager = browserOdpManagerInstance();
    const vuidManager = await VuidManager.instance(BrowserOdpManager.cache);
    expect(browserOdpManager.vuid).toBe(vuidManager.vuid);
  });

  it('should drop relevant calls when OdpManager is initialized with the disabled flag, except for VUID', async () => {
    const browserOdpManager = new BrowserOdpManager({ disable: true, logger: fakeLogger });

    verify(mockLogger.log(LogLevel.INFO, LOG_MESSAGES.ODP_DISABLED)).once();

    browserOdpManager.updateSettings(new OdpConfig('valid', 'host', []));
    expect(browserOdpManager.odpConfig).toBeUndefined;

    await browserOdpManager.fetchQualifiedSegments('vuid_user1', []);
    verify(mockLogger.log(LogLevel.ERROR, ERROR_MESSAGES.ODP_NOT_ENABLED)).once();

    browserOdpManager.identifyUser('vuid_user1');
    verify(mockLogger.log(LogLevel.DEBUG, LOG_MESSAGES.ODP_IDENTIFY_FAILED_ODP_DISABLED)).once();

    expect(browserOdpManager.eventManager).toBeUndefined;
    expect(browserOdpManager.segmentManager).toBeUndefined;

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
      eventManager: fakeEventManager,
    });

    expect(browserOdpManager.eventManager).toBeDefined();
    verify(mockEventManager.updateSettings(anything())).once();
    verify(mockEventManager.start()).once();

    await new Promise(resolve => setTimeout(resolve, 200)); // Wait for VuidManager to fetch from cache.

    verify(mockEventManager.registerVuid(anything())).once();

    const didUpdateA = browserOdpManager.updateSettings(odpConfigA);
    expect(didUpdateA).toBe(true);
    expect(browserOdpManager.odpConfig.equals(odpConfigA)).toBe(true);

    const updateSettingsArgsA = capture(mockEventManager.updateSettings).last();
    expect(updateSettingsArgsA[0]).toStrictEqual(odpConfigA);

    browserOdpManager.identifyUser(userA);
    const identifyUserArgsA = capture(mockEventManager.identifyUser).last();
    expect(identifyUserArgsA[0]).toStrictEqual(userA);

    const didUpdateB = browserOdpManager.updateSettings(odpConfigB);
    expect(didUpdateB).toBe(true);
    expect(browserOdpManager.odpConfig.equals(odpConfigB)).toBe(true);

    const updateSettingsArgsB = capture(mockEventManager.updateSettings).last();
    expect(updateSettingsArgsB[0]).toStrictEqual(odpConfigB);

    browserOdpManager.eventManager!.identifyUser(userB);
    const identifyUserArgsB = capture(mockEventManager.identifyUser).last();
    expect(identifyUserArgsB[0]).toStrictEqual(userB);
  });

  it('should use new settings in segment manager when ODP Config is updated', () => {
    const browserOdpManager = new BrowserOdpManager({
      disable: false,
      segmentManager: new OdpSegmentManager(odpConfig, new BrowserLRUCache<string, string[]>(), fakeSegmentApiManager),
    });

    const didUpdateA = browserOdpManager.updateSettings(new OdpConfig(keyA, hostA, segmentsA));
    expect(didUpdateA).toBe(true);

    browserOdpManager.fetchQualifiedSegments(vuidA);
    const fetchQualifiedSegmentsArgsA = capture(mockSegmentApiManager.fetchSegments).last();
    expect(fetchQualifiedSegmentsArgsA).toStrictEqual([keyA, hostA, ODP_USER_KEY.VUID, vuidA, segmentsA]);

    const didUpdateB = browserOdpManager.updateSettings(new OdpConfig(keyB, hostB, segmentsB));
    expect(didUpdateB).toBe(true);

    browserOdpManager.fetchQualifiedSegments(vuidB);

    const fetchQualifiedSegmentsArgsB = capture(mockSegmentApiManager.fetchSegments).last();
    expect(fetchQualifiedSegmentsArgsB).toStrictEqual([keyB, hostB, ODP_USER_KEY.VUID, vuidB, segmentsB]);
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

  it("should call event manager's sendEvent if ODP Event is valid", () => {
    const browserOdpManager = new BrowserOdpManager({
      disable: false,
      eventManager: fakeEventManager,
    });

    const odpConfig = new OdpConfig('key', 'host', []);

    browserOdpManager.updateSettings(odpConfig);

    // Test Valid OdpEvent - calls event manager with valid OdpEvent object
    const validIdentifiers = new Map();
    validIdentifiers.set('vuid', vuidA);

    const validOdpEvent = new OdpEvent(ODP_DEFAULT_EVENT_TYPE, ODP_EVENT_ACTION.INITIALIZED, validIdentifiers);

    browserOdpManager.sendEvent(validOdpEvent);
    verify(mockEventManager.sendEvent(anything())).once();

    // Test Invalid OdpEvents - logs error and short circuits
    // Does not include `vuid` in identifiers does not have a local this.vuid populated in BrowserOdpManager
    const invalidOdpEvent = new OdpEvent(ODP_DEFAULT_EVENT_TYPE, ODP_EVENT_ACTION.INITIALIZED, undefined);

    expect(() => {
      browserOdpManager.sendEvent(invalidOdpEvent);
    }).toThrow(ERROR_MESSAGES.ODP_SEND_EVENT_FAILED_VUID_MISSING);
  });

  describe('createBrowserOdpManager()', () => {
    it('should instantiate BrowserOdpManager correctly when calling createBrowserOdpManager with custom OdpOptions', () => {
      // const browserOdpManager = createBrowserOdpManager({
      // TODO Test OdpOptions
      // })
      // TODO Assert for OdpOptions
    });
  });
});
