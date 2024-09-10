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
import { describe, beforeEach, beforeAll, it, vi, expect } from 'vitest';

import { anything, capture, instance, mock, resetCalls, verify, when } from 'ts-mockito';

import { LOG_MESSAGES, ODP_DEFAULT_EVENT_TYPE, ODP_EVENT_ACTION } from './../lib/utils/enums/index';
import { ERROR_MESSAGES, ODP_USER_KEY } from './../lib/utils/enums/index';

import { LogHandler, LogLevel } from '../lib/modules/logging';
import { RequestHandler } from '../lib/utils/http_request_handler/http';
import { BrowserLRUCache } from './../lib/utils/lru_cache/browser_lru_cache';

import { BrowserOdpManager } from './../lib/plugins/odp_manager/index.browser';
import { IOdpEventManager, OdpOptions } from './../lib/shared_types';
import { OdpConfig } from '../lib/core/odp/odp_config';
import { BrowserOdpEventApiManager } from '../lib/plugins/odp/event_api_manager/index.browser';
import { OdpSegmentManager } from './../lib/core/odp/odp_segment_manager';
import { OdpSegmentApiManager } from '../lib/core/odp/odp_segment_api_manager';
import { VuidManager } from '../lib/plugins/vuid_manager';
import { BrowserRequestHandler } from '../lib/utils/http_request_handler/browser_request_handler';
import { IUserAgentParser } from '../lib/core/odp/user_agent_parser';
import { UserAgentInfo } from '../lib/core/odp/user_agent_info';
import { OdpEvent } from '../lib/core/odp/odp_event';
import { LRUCache } from '../lib/utils/lru_cache';
import { BrowserOdpEventManager } from '../lib/plugins/odp/event_manager/index.browser';
import { OdpManager } from '../lib/core/odp/odp_manager';

const keyA = 'key-a';
const hostA = 'host-a';
const pixelA = 'pixel-a';
const segmentsA = ['a'];
const userA = 'fs-user-a';
const vuidA = 'vuid_a';
const odpConfigA = new OdpConfig(keyA, hostA, pixelA, segmentsA);

const keyB = 'key-b';
const hostB = 'host-b';
const pixelB = 'pixel-b';
const segmentsB = ['b'];
const userB = 'fs-user-b';
const vuidB = 'vuid_b';
const odpConfigB = new OdpConfig(keyB, hostB, pixelB, segmentsB);

describe('OdpManager', () => {
  let odpConfig: OdpConfig;

  let mockLogger: LogHandler;
  let fakeLogger: LogHandler;

  let mockRequestHandler: RequestHandler;
  let fakeRequestHandler: RequestHandler;

  let mockEventApiManager: BrowserOdpEventApiManager;
  let fakeEventApiManager: BrowserOdpEventApiManager;

  let mockEventManager: BrowserOdpEventManager;
  let fakeEventManager: BrowserOdpEventManager;

  let mockSegmentApiManager: OdpSegmentApiManager;
  let fakeSegmentApiManager: OdpSegmentApiManager;

  let mockSegmentManager: OdpSegmentManager;
  let fakeSegmentManager: OdpSegmentManager;

  let mockBrowserOdpManager: BrowserOdpManager;
  let fakeBrowserOdpManager: BrowserOdpManager;

  beforeAll(() => {
    mockLogger = mock<LogHandler>();
    mockRequestHandler = mock<RequestHandler>();

    odpConfig = new OdpConfig(keyA, hostA, pixelA, segmentsA);
    fakeLogger = instance(mockLogger);
    fakeRequestHandler = instance(mockRequestHandler);

    mockEventApiManager = mock<BrowserOdpEventApiManager>();
    mockEventManager = mock<BrowserOdpEventManager>();
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
    BrowserOdpManager.createInstance({
      odpOptions: {
        eventManager: fakeEventManager,
        segmentManager: fakeSegmentManager,
      },
    });

  it('should create VUID automatically on BrowserOdpManager initialization', async () => {
    const browserOdpManager = browserOdpManagerInstance();
    const vuidManager = await VuidManager.instance(BrowserOdpManager.cache);
    expect(browserOdpManager.vuid).toBe(vuidManager.vuid);
  });

  describe('Populates BrowserOdpManager correctly with all odpOptions', () => {
    beforeAll(() => {

    });

    it('Custom odpOptions.segmentsCache overrides default LRUCache', () => {
      const odpOptions: OdpOptions = {
        segmentsCache: new BrowserLRUCache<string, string[]>({
          maxSize: 2,
          timeout: 4000,
        }),
      };        

      const browserOdpManager = BrowserOdpManager.createInstance({
        odpOptions,
      });

      const segmentManager = browserOdpManager['segmentManager'] as OdpSegmentManager;

      // @ts-ignore
      expect(browserOdpManager.segmentManager._segmentsCache.maxSize).toBe(2);

      // @ts-ignore
      expect(browserOdpManager.segmentManager._segmentsCache.timeout).toBe(4000);
    });

    it('Custom odpOptions.segmentsCacheSize overrides default LRUCache size', () => {
      const odpOptions: OdpOptions = {
        segmentsCacheSize: 2,
      };

      const browserOdpManager = BrowserOdpManager.createInstance({
        odpOptions,
      });

      // @ts-ignore
      expect(browserOdpManager.segmentManager._segmentsCache.maxSize).toBe(2);
    });

    it('Custom odpOptions.segmentsCacheTimeout overrides default LRUCache timeout', () => {
      const odpOptions: OdpOptions = {
        segmentsCacheTimeout: 4000,
      };

      const browserOdpManager = BrowserOdpManager.createInstance({
        odpOptions,
      });

      // @ts-ignore
      expect(browserOdpManager.segmentManager._segmentsCache.timeout).toBe(4000);
    });

    it('Custom odpOptions.segmentsApiTimeout overrides default Segment API Request Handler timeout', () => {
      const odpOptions: OdpOptions = {
        segmentsApiTimeout: 4000,
      };

      const browserOdpManager = BrowserOdpManager.createInstance({
        odpOptions,
      });

      // @ts-ignore
      expect(browserOdpManager.segmentManager.odpSegmentApiManager.requestHandler.timeout).toBe(4000);
    });

    it('Browser default Segments API Request Handler timeout should be used when odpOptions does not include segmentsApiTimeout', () => {
      const browserOdpManager = BrowserOdpManager.createInstance({});

      // @ts-ignore
      expect(browserOdpManager.segmentManager.odpSegmentApiManager.requestHandler.timeout).toBe(10000);
    });

    it('Custom odpOptions.segmentsRequestHandler overrides default Segment API Request Handler', () => {
      const odpOptions: OdpOptions = {
        segmentsRequestHandler: new BrowserRequestHandler({ logger: fakeLogger, timeout: 4000 }),
      };

      const browserOdpManager = BrowserOdpManager.createInstance({
        odpOptions,
      });

      // @ts-ignore
      expect(browserOdpManager.segmentManager.odpSegmentApiManager.requestHandler.timeout).toBe(4000);
    });

    it('Custom odpOptions.segmentRequestHandler override takes precedence over odpOptions.eventApiTimeout', () => {
      const odpOptions: OdpOptions = {
        segmentsApiTimeout: 2,
        segmentsRequestHandler: new BrowserRequestHandler({ logger: fakeLogger, timeout: 1 }),
      };

      const browserOdpManager = BrowserOdpManager.createInstance({
        odpOptions,
      });

      // @ts-ignore
      expect(browserOdpManager.segmentManager.odpSegmentApiManager.requestHandler.timeout).toBe(1);
    });

    it('Custom odpOptions.segmentManager overrides default Segment Manager', () => {
      const customSegmentManager = new OdpSegmentManager(
        new BrowserLRUCache<string, string[]>(),
        fakeSegmentApiManager,
        fakeLogger,
        odpConfig,
      );

      const odpOptions: OdpOptions = {
        segmentManager: customSegmentManager,
      };

      const browserOdpManager = BrowserOdpManager.createInstance({
        odpOptions,
      });

      // @ts-ignore
      expect(browserOdpManager.segmentManager).toBe(customSegmentManager);
    });

    it('Custom odpOptions.segmentManager override takes precedence over all other segments-related odpOptions', () => {
      const customSegmentManager = new OdpSegmentManager(
        new BrowserLRUCache<string, string[]>({
          maxSize: 1,
          timeout: 1,
        }),
        new OdpSegmentApiManager(new BrowserRequestHandler({ logger: fakeLogger, timeout: 1 }), fakeLogger),
        fakeLogger,
        odpConfig,
      );

      const odpOptions: OdpOptions = {
        segmentsCacheSize: 2,
        segmentsCacheTimeout: 2,
        segmentsCache: new BrowserLRUCache<string, string[]>({ maxSize: 2, timeout: 2 }),
        segmentsApiTimeout: 2,
        segmentsRequestHandler: new BrowserRequestHandler({ logger: fakeLogger, timeout: 2 }),
        segmentManager: customSegmentManager,
      };

      const browserOdpManager = BrowserOdpManager.createInstance({
        odpOptions,
      });

      // @ts-ignore
      expect(browserOdpManager.segmentManager?._segmentsCache.maxSize).toBe(1);

      // @ts-ignore
      expect(browserOdpManager.segmentManager?._segmentsCache.timeout).toBe(1);

      // @ts-ignore
      expect(browserOdpManager.segmentManager.odpSegmentApiManager.requestHandler.timeout).toBe(1);

      // @ts-ignore
      expect(browserOdpManager.segmentManager).toBe(customSegmentManager);
    });

    it('Custom odpOptions.eventApiTimeout overrides default Event API Request Handler timeout', () => {
      const odpOptions: OdpOptions = {
        eventApiTimeout: 4000,
      };

      const browserOdpManager = BrowserOdpManager.createInstance({
        odpOptions,
      });

      // @ts-ignore
      expect(browserOdpManager.eventManager.apiManager.requestHandler.timeout).toBe(4000);
    });

    it('Browser default Events API Request Handler timeout should be used when odpOptions does not include eventsApiTimeout', () => {
      const odpOptions: OdpOptions = {};

      const browserOdpManager = BrowserOdpManager.createInstance({
        odpOptions,
      });

      // @ts-ignore
      expect(browserOdpManager.eventManager.apiManager.requestHandler.timeout).toBe(10000);
    });

    it('Custom odpOptions.eventFlushInterval cannot override the default Event Manager flush interval', () => {
      const odpOptions: OdpOptions = {
        eventFlushInterval: 4000,
      };

      const browserOdpManager = BrowserOdpManager.createInstance({
        odpOptions,
      });

      // @ts-ignore
      expect(browserOdpManager.eventManager.flushInterval).toBe(0); // Note: Browser flush interval is always 0 due to use of Pixel API
    });

    it('Default ODP event flush interval is used when odpOptions does not include eventFlushInterval', () => {
      const odpOptions: OdpOptions = {};

      const browserOdpManager = BrowserOdpManager.createInstance({
        odpOptions,
      });

      // @ts-ignore
      expect(browserOdpManager.eventManager.flushInterval).toBe(0);
    });

    it('ODP event batch size set to one when odpOptions.eventFlushInterval set to 0', () => {
      const odpOptions: OdpOptions = {
        eventFlushInterval: 0,
      };

      const browserOdpManager = BrowserOdpManager.createInstance({
        odpOptions,
      });

      // @ts-ignore
      expect(browserOdpManager.eventManager.flushInterval).toBe(0);

      // @ts-ignore
      expect(browserOdpManager.eventManager.batchSize).toBe(1);
    });

    it('Custom odpOptions.eventBatchSize does not override default Event Manager batch size', () => {
      const odpOptions: OdpOptions = {
        eventBatchSize: 2,
      };

      const browserOdpManager = BrowserOdpManager.createInstance({
        odpOptions,
      });

      // @ts-ignore
      expect(browserOdpManager.eventManager.batchSize).toBe(1); // Note: Browser event batch size is always 1 due to use of Pixel API
    });

    it('Custom odpOptions.eventQueueSize overrides default Event Manager queue size', () => {
      const odpOptions: OdpOptions = {
        eventQueueSize: 2,
      };

      const browserOdpManager = BrowserOdpManager.createInstance({
        odpOptions,
      });

      // @ts-ignore
      expect(browserOdpManager.eventManager.queueSize).toBe(2);
    });

    it('Custom odpOptions.eventRequestHandler overrides default Event Manager request handler', () => {
      const odpOptions: OdpOptions = {
        eventRequestHandler: new BrowserRequestHandler({ logger: fakeLogger, timeout: 4000 }),
      };

      const browserOdpManager = BrowserOdpManager.createInstance({
        odpOptions,
      });

      // @ts-ignore
      expect(browserOdpManager.eventManager.apiManager.requestHandler.timeout).toBe(4000);
    });

    it('Custom odpOptions.eventRequestHandler override takes precedence over odpOptions.eventApiTimeout', () => {
      const odpOptions: OdpOptions = {
        eventApiTimeout: 2,
        eventBatchSize: 2,
        eventFlushInterval: 2,
        eventQueueSize: 2,
        eventRequestHandler: new BrowserRequestHandler({ logger: fakeLogger, timeout: 1 }),
      };

      const browserOdpManager = BrowserOdpManager.createInstance({
        odpOptions,
      });

      // @ts-ignore
      expect(browserOdpManager.eventManager.apiManager.requestHandler.timeout).toBe(1);
    });

    it('Custom odpOptions.eventManager overrides default Event Manager', () => {
      const fakeClientEngine = 'test-javascript-sdk';
      const fakeClientVersion = '1.2.3';

      const customEventManager = new BrowserOdpEventManager({
        odpConfig,
        apiManager: fakeEventApiManager,
        logger: fakeLogger,
        clientEngine: fakeClientEngine,
        clientVersion: fakeClientVersion,
      });

      const odpOptions: OdpOptions = {
        eventManager: customEventManager,
      };

      const browserOdpManager = BrowserOdpManager.createInstance({
        odpOptions,
      });

      // @ts-ignore
      expect(browserOdpManager.eventManager).toBe(customEventManager);

      // @ts-ignore
      expect(browserOdpManager.eventManager.clientEngine).toBe(fakeClientEngine);

      // @ts-ignore
      expect(browserOdpManager.eventManager.clientVersion).toBe(fakeClientVersion);
    });

    it('Custom odpOptions.eventManager override takes precedence over all other event-related odpOptions', () => {
      const fakeClientEngine = 'test-javascript-sdk';
      const fakeClientVersion = '1.2.3';

      const customEventManager = new BrowserOdpEventManager({
        odpConfig,
        apiManager: new BrowserOdpEventApiManager(new BrowserRequestHandler({ logger: fakeLogger, timeout: 1 }), fakeLogger),
        logger: fakeLogger,
        clientEngine: fakeClientEngine,
        clientVersion: fakeClientVersion,
        queueSize: 1,
        batchSize: 1,
        flushInterval: 1,
      });

      const odpOptions: OdpOptions = {
        eventApiTimeout: 2,
        eventBatchSize: 2,
        eventFlushInterval: 2,
        eventQueueSize: 2,
        eventRequestHandler: new BrowserRequestHandler({ logger: fakeLogger, timeout: 3 }),
        eventManager: customEventManager,
      };

      const browserOdpManager = BrowserOdpManager.createInstance({
        odpOptions,
      });

      // @ts-ignore
      expect(browserOdpManager.eventManager).toBe(customEventManager);

      // @ts-ignore
      expect(browserOdpManager.eventManager.clientEngine).toBe(fakeClientEngine);

      // @ts-ignore
      expect(browserOdpManager.eventManager.clientVersion).toBe(fakeClientVersion);

      // @ts-ignore
      expect(browserOdpManager.eventManager.batchSize).toBe(1);

      // @ts-ignore
      expect(browserOdpManager.eventManager.flushInterval).toBe(0); // Note: Browser event flush interval will always be 0 due to use of Pixel API

      // @ts-ignore
      expect(browserOdpManager.eventManager.queueSize).toBe(1);

      // @ts-ignore
      expect(browserOdpManager.eventManager.apiManager.requestHandler.timeout).toBe(1);
    });

    it('Custom odpOptions micro values (non-request/manager) override all expected fields for both segments and event managers', () => {
      const odpOptions: OdpOptions = {
        segmentsCacheSize: 4,
        segmentsCacheTimeout: 4,
        segmentsCache: new BrowserLRUCache<string, string[]>({ maxSize: 4, timeout: 4 }),
        segmentsApiTimeout: 4,
        eventApiTimeout: 4,
        eventBatchSize: 4,
        eventFlushInterval: 4,
        eventQueueSize: 4,
      };

      const browserOdpManager = BrowserOdpManager.createInstance({
        odpOptions,
      });

      // @ts-ignore
      expect(browserOdpManager.segmentManager?._segmentsCache.maxSize).toBe(4);

      // @ts-ignore
      expect(browserOdpManager.segmentManager?._segmentsCache.timeout).toBe(4);

      // @ts-ignore
      expect(browserOdpManager.segmentManager.odpSegmentApiManager.requestHandler.timeout).toBe(4);

      // @ts-ignore
      expect(browserOdpManager.eventManager.batchSize).toBe(1); // Note: Browser batch size will always be 1 due to use of Pixel API

      // @ts-ignore
      expect(browserOdpManager.eventManager.flushInterval).toBe(0); // Note: Browser event flush interval will always be 0 due to use of Pixel API

      // @ts-ignore
      expect(browserOdpManager.eventManager.queueSize).toBe(4);

      // @ts-ignore
      expect(browserOdpManager.eventManager.apiManager.requestHandler.timeout).toBe(4);
    });
  });
});
