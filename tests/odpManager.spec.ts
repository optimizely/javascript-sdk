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

import { instance, mock, resetCalls, verify } from 'ts-mockito';

import { LOG_MESSAGES } from './../lib/utils/enums/index';
import { ERROR_MESSAGES } from './../lib/utils/enums/index';

import { LogHandler, LogLevel } from '../lib/modules/logging';
import { RequestHandler } from '../lib/utils/http_request_handler/http';
import { BrowserLRUCache } from './../lib/utils/lru_cache/browser_lru_cache';

import { NodeOdpManager as OdpManager } from './../lib/plugins/odp_manager/index.node';
import { OdpConfig } from '../lib/core/odp/odp_config';
import { NodeOdpEventApiManager as OdpEventApiManager } from '../lib/plugins/odp/event_api_manager/index.node';
import { NodeOdpEventManager as OdpEventManager } from '../lib/plugins/odp/event_manager/index.node';
import { OdpSegmentManager } from './../lib/core/odp/odp_segment_manager';
import { OdpSegmentApiManager } from '../lib/core/odp/odp_segment_api_manager';

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

    odpConfig = new OdpConfig();
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

  const odpManagerInstance = () =>
    new OdpManager({
      odpOptions: {
        eventManager,
        segmentManager,
        segmentsRequestHandler: defaultRequestHandler,
        eventRequestHandler: defaultRequestHandler,
      },
    });

  it('should drop relevant calls when OdpManager is initialized with the disabled flag', async () => {
    const odpManager = new OdpManager({
      logger,
      odpOptions: {
        disabled: true,
        segmentsRequestHandler: defaultRequestHandler,
        eventRequestHandler: defaultRequestHandler,
      },
    });
    verify(mockLogger.log(LogLevel.INFO, LOG_MESSAGES.ODP_DISABLED)).once();

    odpManager.updateSettings(new OdpConfig('valid', 'host', []));
    expect(odpManager.odpConfig).toBeUndefined;

    await odpManager.fetchQualifiedSegments('user1', []);
    verify(mockLogger.log(LogLevel.ERROR, ERROR_MESSAGES.ODP_NOT_ENABLED)).once();

    odpManager.identifyUser('user1');
    verify(mockLogger.log(LogLevel.DEBUG, LOG_MESSAGES.ODP_IDENTIFY_FAILED_ODP_DISABLED)).once();

    expect(odpManager.eventManager).toBeUndefined;
    expect(odpManager.segmentManager).toBeUndefined;
  });

  it('should start ODP Event Manager when ODP Manager is initialized', () => {
    const odpManager = odpManagerInstance();
    verify(mockEventManager.start()).once();
    expect(odpManager.eventManager).not.toBeUndefined();
  });

  it('should stop ODP Event Manager when close is called', () => {
    const odpManager = odpManagerInstance();
    verify(mockEventManager.stop()).never();

    odpManager.close();
    verify(mockEventManager.stop()).once();
  });

  it('should use new settings in event manager when ODP Config is updated', async () => {
    const odpManager = new OdpManager({
      odpOptions: {
        segmentsRequestHandler: defaultRequestHandler,
        eventRequestHandler: defaultRequestHandler,
        eventManager: new OdpEventManager({
          odpConfig,
          apiManager: eventApiManager,
          logger,
          clientEngine: '',
          clientVersion: '',
          batchSize: 1,
          flushInterval: 250,
        }),
      },
    });

    odpManager.updateSettings(new OdpConfig(keyA, hostA, segmentsA));

    expect(odpManager.odpConfig.apiKey).toBe(keyA);
    expect(odpManager.odpConfig.apiHost).toBe(hostA);

    // odpManager.identifyUser(userA);

    // verify(mockEventApiManager.sendEvents(keyA, hostA, anything())).once();

    odpManager.updateSettings(new OdpConfig(keyB, hostB, segmentsB));
    expect(odpManager.odpConfig.apiKey).toBe(keyB);
    expect(odpManager.odpConfig.apiHost).toBe(hostB);

    // odpManager.identifyUser(userB);

    // verify(mockEventApiManager.sendEvents(keyB, hostB, anything())).once();
  });

  it('should use new settings in segment manager when ODP Config is updated', async () => {
    const odpManager = new OdpManager({
      odpOptions: {
        segmentManager: new OdpSegmentManager(odpConfig, new BrowserLRUCache<string, string[]>(), segmentApiManager),
        segmentsRequestHandler: defaultRequestHandler,
        eventRequestHandler: defaultRequestHandler,
      },
    });

    odpManager.updateSettings(new OdpConfig(keyA, hostA, segmentsA));

    expect(odpManager.odpConfig.apiKey).toBe(keyA);
    expect(odpManager.odpConfig.apiHost).toBe(hostA);

    await odpManager.fetchQualifiedSegments(userA);

    odpManager.updateSettings(new OdpConfig(keyB, hostB, segmentsB));
    expect(odpManager.odpConfig.apiKey).toBe(keyB);
    expect(odpManager.odpConfig.apiHost).toBe(hostB);

    await odpManager.fetchQualifiedSegments(userB);
  });

  it('should get event manager', () => {
    const odpManagerA = odpManagerInstance();
    expect(odpManagerA.eventManager).not.toBe(null);

    const odpManagerB = new OdpManager({
      logger,
      odpOptions: {
        segmentsRequestHandler: defaultRequestHandler,
        eventRequestHandler: defaultRequestHandler,
      },
    });
    expect(odpManagerB.eventManager).not.toBe(null);
  });

  it('should get segment manager', () => {
    const odpManagerA = odpManagerInstance();
    expect(odpManagerA.segmentManager).not.toBe(null);

    const odpManagerB = new OdpManager({
      odpOptions: {
        segmentsRequestHandler: defaultRequestHandler,
        eventRequestHandler: defaultRequestHandler,
      },
    });
    expect(odpManagerB.eventManager).not.toBe(null);
  });
});
