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

import { BrowserLRUCache } from './../lib/utils/lru_cache/browser_lru_cache';
import { OdpSegmentManager } from './../lib/core/odp/odp_segment_manager';
import { LOG_MESSAGES } from './../lib/utils/enums/index';
import { ERROR_MESSAGES, ODP_USER_KEY } from './../lib/utils/enums/index';
import { OdpManager } from './../lib/core/odp/odp_manager';
import { OdpConfig } from '../lib/core/odp/odp_config';
import { anything, capture, instance, mock, resetCalls, spy, verify, when } from 'ts-mockito';
import { LogHandler, LogLevel } from '../lib/modules/logging';
import { RequestHandler } from '../lib/utils/http_request_handler/http';
import { LRUCache } from '../lib/utils/lru_cache';
import { expect } from 'chai';
import { OdpSegmentApiManager } from '../lib/core/odp/odp_segment_api_manager';
import { OdpEventManager, STATE } from '../lib/core/odp/odp_event_manager';

const API_KEY = 'JUs7AFak3aP1K3y';
const API_HOST = 'https://odp.example.com';
const UPDATED_API_KEY = 'D1fF3rEn7kEy';
const UPDATED_ODP_ENDPOINT = 'https://an-updated-odp-endpoint.example.com';
const TEST_EVENT_TYPE = 'event-type';
const TEST_EVENT_ACTION = 'event-action';
const VALID_FS_USER_ID = 'valid-test-fs-user-id';

const EMPTY_SEGMENTS_LIST = [];
const UPDATED_SEGMENTS_LIST = ['updated-segment-1', 'updated-segment-2'];

describe('OdpManager', () => {
  let mockLogger: LogHandler;
  let mockRequestHandler: RequestHandler;

  let odpConfig: OdpConfig;
  let logger: LogHandler;
  let requestHandler: RequestHandler;

  let mockEventManager: OdpEventManager;
  let mockSegmentManager: OdpSegmentManager;

  const segmentsCache = new LRUCache<string, Array<string>>({
    maxSize: 1000,
    timeout: 1000,
  });

  beforeAll(() => {
    mockLogger = mock<LogHandler>();
    mockRequestHandler = mock<RequestHandler>();

    odpConfig = new OdpConfig(API_KEY, API_HOST, []);
    logger = instance(mockLogger);
    requestHandler = instance(mockRequestHandler);

    mockEventManager = mock<OdpEventManager>();
    mockSegmentManager = mock<OdpSegmentManager>();
  });

  beforeEach(() => {
    resetCalls(mockLogger);
    resetCalls(mockRequestHandler);
    resetCalls(mockEventManager);
    resetCalls(mockSegmentManager);
  });

  it('should drop relevant calls when OdpManager is initialized with the disabled flag', async () => {
    const manager = new OdpManager(true, requestHandler, logger);

    manager.updateSettings('valid', 'host', []);
    expect(manager.odpConfig.apiKey).to.equal('');
    expect(manager.odpConfig.apiHost).to.equal('');

    await manager.fetchQualifiedSegments(ODP_USER_KEY.FS_USER_ID, 'user1', []);
    verify(mockLogger.log(LogLevel.ERROR, ERROR_MESSAGES.ODP_NOT_ENABLED)).twice();

    manager.identifyUser('user1');
    verify(mockLogger.log(LogLevel.DEBUG, LOG_MESSAGES.ODP_IDENTIFY_FAILED_ODP_DISABLED)).once();

    expect(manager.eventManager).to.be.null;
    expect(manager.segmentManager).to.be.null;
  });

  it('should start ODP Event manager when ODP Manager is initialized', async () => {
    const manager = new OdpManager(false, requestHandler, logger, undefined, mockSegmentManager, mockEventManager);
    expect(manager.eventManager?.state).to.equal(STATE.RUNNING);
  });

  it('should be able to fetch qualified segments with a valid OdpConfig and enabled OdpManager instance', async () => {
    // const segmentManager = new OdpSegmentManager(
    //   new OdpConfig(API_KEY, API_HOST, []),
    //   new BrowserLRUCache(),
    //   new OdpSegmentApiManager(requestHandler, logger),
    //   logger
    // );

    const manager = new OdpManager(false, requestHandler, logger, undefined, mockSegmentManager);
    expect(manager.segmentManager).to.exist;

    // await manager.fetchQualifiedSegments(ODP_USER_KEY.FS_USER_ID, 'user1', []);
    // verify(manager.segmentManager?.fetchQualifiedSegments(ODP_USER_KEY.FS_USER_ID, 'user1', [])).once();
  });
});
