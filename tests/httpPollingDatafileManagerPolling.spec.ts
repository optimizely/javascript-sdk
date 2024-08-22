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
import { describe, beforeEach, afterEach, beforeAll, it, expect, vi, MockInstance } from 'vitest';

import { resetCalls, spy, verify } from 'ts-mockito';
import { LogLevel, LoggerFacade, getLogger, setLogLevel } from '../lib/modules/logging';
import { UPDATE_INTERVAL_BELOW_MINIMUM_MESSAGE } from '../lib/modules/datafile-manager/config';
import { TestDatafileManager } from './httpPollingDatafileManager.spec';

describe('HttpPollingDatafileManager polling', () => {
    let spiedLogger: LoggerFacade;

    const loggerName = 'DatafileManager';
    const sdkKey = 'not-real-sdk';

    beforeAll(() => {
        setLogLevel(LogLevel.DEBUG);
        const actualLogger = getLogger(loggerName);
        spiedLogger = spy(actualLogger);
    });

    beforeEach(() => {
        resetCalls(spiedLogger);
    });


    it('should log polling interval below 30 seconds', () => {
        const below30Seconds = 29 * 1000;

        new TestDatafileManager({
            sdkKey,
            updateInterval: below30Seconds,
        });

        
        verify(spiedLogger.warn(UPDATE_INTERVAL_BELOW_MINIMUM_MESSAGE)).once();
    });

    it('should not log when polling interval above 30s', () => {
        const oneMinute = 60 * 1000;

        new TestDatafileManager({
            sdkKey,
            updateInterval: oneMinute,
        });

        verify(spiedLogger.warn(UPDATE_INTERVAL_BELOW_MINIMUM_MESSAGE)).never();
    });
});
