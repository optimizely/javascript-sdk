/**
 * Copyright 2023 Optimizely
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

import { anyString, anything, instance, mock, resetCalls, verify } from 'ts-mockito';
import { LogLevel, LoggerFacade, setLogHandler, setLogLevel } from '../lib/modules/logging';
import { DatafileManagerConfig } from '../lib/modules/datafile-manager/datafileManager';
import { UPDATE_INTERVAL_BELOW_MINIMUM_MESSAGE } from '../lib/modules/datafile-manager/config';
import HttpPollingDatafileManager from '../lib/modules/datafile-manager/httpPollingDatafileManager';
import { Headers, AbortableRequest } from '../lib/modules/datafile-manager/http';

describe('HttpPollingDatafileManager polling', () => {
    let mockLogger: LoggerFacade = mock<LoggerFacade>();

    const loggerName = 'DatafileManager';
    const sdkKey = 'not-real-sdk';

    beforeAll(() => {
        mockLogger = mock<LoggerFacade>();
        setLogLevel(LogLevel.DEBUG);
        setLogHandler(instance(mockLogger));
    });

    beforeEach(() => {
        resetCalls(mockLogger);
    });


    it('should log polling interval below 30 seconds', () => {
        const below30Seconds = 29 * 1000;

        new TestDatafileManager({
            sdkKey,
            updateInterval: below30Seconds,
        });

        verify(mockLogger.warn(`${loggerName}: ${UPDATE_INTERVAL_BELOW_MINIMUM_MESSAGE}`)).once();
    });

    it('should not log when polling interval above 30s', () => {
        const oneMinute = 60 * 1000;

        new TestDatafileManager({
            sdkKey,
            updateInterval: oneMinute,
        });

        verify(mockLogger.log(anything(), anyString())).never();
    });
});

class TestDatafileManager extends HttpPollingDatafileManager {
    protected getConfigDefaults(): Partial<DatafileManagerConfig> {
        return {};
    }

    protected makeGetRequest(reqUrl: string, headers: Headers): AbortableRequest {
        throw new Error(`Method not implemented: ${reqUrl} with headers ${headers}`);
    }
}