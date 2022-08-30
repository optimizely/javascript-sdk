/**
 * Copyright 2019-2020, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { DatafileManager, DatafileManagerConfig, DatafileUpdate } from './datafileManager';
import { Disposer } from './eventEmitter';
import { AbortableRequest, Headers } from './http';
export default abstract class HttpPollingDatafileManager implements DatafileManager {
    protected abstract makeGetRequest(reqUrl: string, headers: Headers): AbortableRequest;
    protected abstract getConfigDefaults(): Partial<DatafileManagerConfig>;
    private currentDatafile;
    private readonly readyPromise;
    private isReadyPromiseSettled;
    private readyPromiseResolver;
    private readyPromiseRejecter;
    private readonly emitter;
    private readonly autoUpdate;
    private readonly updateInterval;
    private currentTimeout;
    private isStarted;
    private lastResponseLastModified?;
    private datafileUrl;
    private currentRequest;
    private backoffController;
    private cacheKey;
    private cache;
    private syncOnCurrentRequestComplete;
    constructor(config: DatafileManagerConfig);
    get(): string;
    start(): void;
    stop(): Promise<void>;
    onReady(): Promise<void>;
    on(eventName: string, listener: (datafileUpdate: DatafileUpdate) => void): Disposer;
    private onRequestRejected;
    private onRequestResolved;
    private onRequestComplete;
    private syncDatafile;
    private resolveReadyPromise;
    private rejectReadyPromise;
    private scheduleNextUpdate;
    private getNextDatafileFromResponse;
    private trySavingLastModified;
    setDatafileFromCacheIfAvailable(): void;
}
