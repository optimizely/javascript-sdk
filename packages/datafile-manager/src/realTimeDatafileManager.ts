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

import {getLogger} from '@optimizely/js-sdk-logging';
import {sprintf} from '@optimizely/js-sdk-utils';
import {DatafileManager, DatafileUpdate, RealtimeDatafileManagerConfig} from './datafileManager';
import EventEmitter, {Disposer} from './eventEmitter';
import {AbortableRequest, Headers, Response} from './http';
import {DEFAULT_UPDATE_INTERVAL, DEFAULT_URL_TEMPLATE, MIN_UPDATE_INTERVAL} from './config';
import BackoffController from './backoffController';
import PersistentKeyValueCache from './persistentKeyValueCache';
import Ably from "ably/callbacks";
import jsonPatch from 'fast-json-patch';

const logger = getLogger('DatafileManager');

const UPDATE_EVT = 'update';

function isValidUpdateInterval(updateInterval: number): boolean {
    return updateInterval >= MIN_UPDATE_INTERVAL;
}

function isSuccessStatusCode(statusCode: number): boolean {
    return statusCode >= 200 && statusCode < 400;
}

const noOpKeyValueCache: PersistentKeyValueCache = {
    get(): Promise<string> {
        return Promise.resolve('');
    },

    set(): Promise<void> {
        return Promise.resolve();
    },

    contains(): Promise<boolean> {
        return Promise.resolve(false);
    },

    remove(): Promise<void> {
        return Promise.resolve();
    },
};

export default abstract class RealtimeDatafileManager implements DatafileManager {
    // Make an HTTP get request to the given URL with the given headers
    // Return an AbortableRequest, which has a promise for a Response.
    // If we can't get a response, the promise is rejected.
    // The request will be aborted if the manager is stopped while the request is in flight.
    protected abstract makeGetRequest(reqUrl: string, headers: Headers): AbortableRequest;

    // Return any default configuration options that should be applied
    protected abstract getConfigDefaults(): Partial<RealtimeDatafileManagerConfig>;

    private currentDatafile: string;

    private readonly readyPromise: Promise<void>;

    private isReadyPromiseSettled: boolean;

    private readyPromiseResolver: () => void;

    private readyPromiseRejecter: (err: Error) => void;

    private readonly emitter: EventEmitter;

    private readonly autoUpdate: boolean;

    private readonly updateInterval: number;

    private currentTimeout: any;

    private isStarted: boolean;

    private lastResponseLastModified?: string;

    private datafileUrl: string;

    private currentRequest: AbortableRequest | null;

    private backoffController: BackoffController;

    private cacheKey: string;

    private cache: PersistentKeyValueCache;

    // When true, this means the update interval timeout fired before the current
    // sync completed. In that case, we should sync again immediately upon
    // completion of the current request, instead of waiting another update
    // interval.
    private syncOnCurrentRequestComplete: boolean;

    private readonly isNotificationEnabled: boolean = false; // TODO: fix config not setting isNotificationEnabled in constructor

    private readonly isStreamingEnabled: boolean = true; // TODO: fix config not setting isStreamingEnabled in constructor

    constructor(config: RealtimeDatafileManagerConfig) {
        const configWithDefaultsApplied: RealtimeDatafileManagerConfig = {
            ...this.getConfigDefaults(),
            ...config,
        };
        const {
            datafile,
            autoUpdate = false,
            sdkKey,
            updateInterval = DEFAULT_UPDATE_INTERVAL,
            urlTemplate = DEFAULT_URL_TEMPLATE,
            cache = noOpKeyValueCache,
        } = configWithDefaultsApplied;

        this.cache = cache;
        this.cacheKey = 'opt-datafile-' + sdkKey;
        this.isReadyPromiseSettled = false;
        this.readyPromiseResolver = (): void => {
        };
        this.readyPromiseRejecter = (): void => {
        };
        this.readyPromise = new Promise((resolve, reject) => {
            this.readyPromiseResolver = resolve;
            this.readyPromiseRejecter = reject;
        });

        if (datafile) {
            this.currentDatafile = datafile;
            if (!sdkKey) {
                this.resolveReadyPromise();
            }
        } else {
            this.currentDatafile = '';
        }

        this.isStarted = false;

        this.datafileUrl = sprintf(urlTemplate, sdkKey);

        this.emitter = new EventEmitter();
        this.autoUpdate = autoUpdate;
        if (isValidUpdateInterval(updateInterval)) {
            this.updateInterval = updateInterval;
        } else {
            logger.warn('Invalid updateInterval %s, defaulting to %s', updateInterval, DEFAULT_UPDATE_INTERVAL);
            this.updateInterval = DEFAULT_UPDATE_INTERVAL;
        }
        this.currentTimeout = null;
        this.currentRequest = null;
        this.backoffController = new BackoffController();
        this.syncOnCurrentRequestComplete = false;

        this.isNotificationEnabled = config.enableRealtimeUpdateNotification ?? this.isNotificationEnabled;
        this.isStreamingEnabled = config.enableStreaming ?? this.isStreamingEnabled;
    }

    get(): string {
        return this.currentDatafile;
    }

    start(): void {
        console.log('------ INSIDE THE REAL TIME DATAFILE MANAGER 2 ------');
        if (!this.isStarted) {
            logger.debug('Datafile manager started');
            this.isStarted = true;
            this.backoffController.reset();
            this.setDatafileFromCacheIfAvailable();
            this.syncDatafile();
            if (this.isNotificationEnabled || this.isStreamingEnabled) {
                this.connectToAbly();
            }
        }
    }

    stop(): Promise<void> {
        logger.debug('Datafile manager stopped');
        this.isStarted = false;
        if (this.currentTimeout) {
            clearTimeout(this.currentTimeout);
            this.currentTimeout = null;
        }

        this.emitter.removeAllListeners();

        if (this.currentRequest) {
            this.currentRequest.abort();
            this.currentRequest = null;
        }

        return Promise.resolve();
    }

    onReady(): Promise<void> {
        return this.readyPromise;
    }

    on(eventName: string, listener: (datafileUpdate: DatafileUpdate) => void): Disposer {
        return this.emitter.on(eventName, listener);
    }

    private connectToAbly(): void {
        if (!this.isStarted) {
            return;
        }

        // Subscriber API Key
        // const ably = new Ably.Realtime('1ZS5wg.g5H34w:Q9kxDvOBljjdhQ5LcK9eTWqp64e4b5iHioyT3zI_5_g');
        const ably = new Ably.Realtime('8bjSyw.iy4dIQ:HKthbSWnyzYtAAwr5gKhMfaFZcX6C7gmbJonomGTfpI');
        ably.connection.on('connected', () => {
            console.log('SDK connected to Ably.');

            const channel = ably.channels.get("21468570738_development");
            channel.subscribe('datafile-updated',this.handleAblyDatafileUpdated);
        });
    }

    private handleAblyDatafileUpdated(response: any): void {
        console.log("Received message from Ably.");
        console.dir(response);

        // TODO: this.currentDatafile is undefined in the js bundle in the browser
        const previousDatafile = this.currentDatafile;
        // I tried moving this handleAblyDatafileUpdated() into the channel.subscribe() which solved the problem but...

        // when I get into this function...
        this.updateCurrentDatafile(response.data);

        const datafileUpdate: DatafileUpdate = {
            datafile: this.currentDatafile,
        };
        if (previousDatafile.length > 0) {
            datafileUpdate.changedFlags = this.findAffectedFlags(previousDatafile);
        }
        this.emitter.emit(UPDATE_EVT, datafileUpdate);
    }

    private updateCurrentDatafile(patch: any): void {
        if (this.isStreamingEnabled && patch.length > 0) {
            console.log("Patching datafile from JSON Patch from Ably push");
            // ...and then into this patchDatafile()....
            this.patchDatafile(patch);
        }
        if (this.isNotificationEnabled) {
            console.log("Pulling datafile from CDN [legacy syncDatafile()]");
            // TODO: make async/await
            this.syncDatafile();
        }
    }

    private patchDatafile(patch: any): void {
        console.log("Patching current datafile");
        console.dir(patch);

        // ...once again this.currentDatafile is undefined in the bundle
        const currentDatafileObject = JSON.parse(this.currentDatafile);
        // I considered moving to ably/promises or restructuring with dependency injection but...

        const patchedDatafileObject = jsonPatch.applyPatch(currentDatafileObject, patch);

        const patchedDatafileString = JSON.stringify(patchedDatafileObject);

        // ...ultimately I need the class's context
        this.currentDatafile = patchedDatafileString;
        this.cache.set(this.cacheKey, patchedDatafileString);
    }

    private findAffectedFlags(previousDatafileString: string): string[] {
        console.log("Finding affected flags for event emit");

        const previousDatafile = JSON.parse(previousDatafileString);
        const newDatafile = JSON.parse(this.currentDatafile);

        const patches = jsonPatch.compare(previousDatafile, newDatafile);

        // @ts-ignore
        const allTargetPaths = patches.map(patch => patch.path.match(/(\/featureFlags\/\d)|(\/rollouts\/\d)|(\/experiments\/\d)|(\/audiences\/\d)/gm)[0]);

        const distinctTargetPaths = [...new Set(allTargetPaths)];

        const distinctTargetObjects = distinctTargetPaths.map(path => {
            let foundObject = jsonPatch.getValueByPointer(newDatafile, path);

            // if a node was removed then look at previous
            if (typeof foundObject === "undefined") {
                foundObject = jsonPatch.getValueByPointer(previousDatafile, path);
            }

            // set the type of object
            if (path.startsWith("/featureFlags/")) {
                foundObject.type = "flag";
            } else if (path.startsWith("/rollouts/")) {
                foundObject.type = "rollout";
            } else if (path.startsWith("/experiments/")) {
                foundObject.type = "experiment";
            } else if (path.startsWith("/audiences/")) {
                foundObject.type = "audience";
            } else {
                throw new Error("Unknown JSON Pointer type found");
            }

            return foundObject;
        });

        const allFeatureFlags = [...newDatafile.featureFlags, ...previousDatafile.featureFlags];
        const allRollouts = [...newDatafile.rollouts, ...previousDatafile.rollouts];
        const experimentsFromRollouts = allRollouts.map(rollout => [...rollout.experiments]).reduce((accumulator, experiment) => [...accumulator, ...experiment]);
        const experimentsFromExperiments = [...newDatafile.experiments, ...previousDatafile.experiments];
        const allExperiments = [...experimentsFromRollouts, ...experimentsFromExperiments];

        const featureFlagsSearchBy = {
            flag: (featureFlag: any) => {
                return [featureFlag];
            },
            rollout: (rollout: any) => {
                const rolloutId = rollout.id.toString();
                const foundFeatureFlags = allFeatureFlags.filter(featureFlag => featureFlag.rolloutId === rolloutId);
                return foundFeatureFlags;
            },
            experiment: (experiment: any) => {
                const experimentId = experiment.id.toString();
                const foundFeatureFlags = allFeatureFlags.filter(featureFlag => featureFlag.experimentIds.includes(experimentId));
                return foundFeatureFlags;
            },
            audience: (audience: any) => {
                const audienceId = audience.id.toString();
                const experimentsContainingAudienceId = allExperiments.filter(experiment => experiment.audienceIds.includes(audienceId));
                const foundFeatureFlags = allFeatureFlags.filter(featureFlag => experimentsContainingAudienceId.find(experiment => featureFlag.experimentIds.includes(experiment.id)));
                return foundFeatureFlags;
            },
        };

        const affectedFeatureFlagKeys = distinctTargetObjects.map(target => {
            // @ts-ignore
            const foundFeatureFlags = featureFlagsSearchBy[target.type](target);
            const featureFlagKeys = foundFeatureFlags.map((featureFlag: any) => featureFlag.key as string);
            return featureFlagKeys;
        });

        const distinctAffectedFeatureFlagKeys = [...new Set(this.flat(affectedFeatureFlagKeys.filter(key => key.length > 0)))];
        // @ts-ignore
        return distinctAffectedFeatureFlagKeys;
    }

    // https://vanillajstoolkit.com/polyfills/arrayflat/  Array.flat() added in ES2019 (we're not there yet)
    private flat(arr: any[], depth: number = 1): any[] {
        // Recursively reduce sub-arrays to the specified depth
        const flatten = (arr: any[], depth: number): any[] => {

            // If depth is 0, return the array as-is
            if (depth < 1) {
                return arr.slice();
            }

            // Otherwise, concatenate into the parent array
            return arr.reduce(function (acc, val) {
                return acc.concat(Array.isArray(val) ? flatten(val, depth - 1) : val);
            }, []);
        };

        return flatten(arr, depth);
    }

    private onRequestRejected(err: any): void {
        if (!this.isStarted) {
            return;
        }

        this.backoffController.countError();

        if (err instanceof Error) {
            logger.error('Error fetching datafile: %s', err.message, err);
        } else if (typeof err === 'string') {
            logger.error('Error fetching datafile: %s', err);
        } else {
            logger.error('Error fetching datafile');
        }
    }

    private onRequestResolved(response: Response): void {
        if (!this.isStarted) {
            return;
        }

        if (typeof response.statusCode !== 'undefined' && isSuccessStatusCode(response.statusCode)) {
            this.backoffController.reset();
        } else {
            this.backoffController.countError();
        }

        this.trySavingLastModified(response.headers);

        const datafile = this.getNextDatafileFromResponse(response);
        if (datafile !== '') {
            logger.info('Updating datafile from response');
            this.currentDatafile = datafile;
            this.cache.set(this.cacheKey, datafile);
            if (!this.isReadyPromiseSettled) {
                this.resolveReadyPromise();
            }
        }
    }

    private onRequestComplete(this: RealtimeDatafileManager): void {
        if (!this.isStarted) {
            return;
        }

        this.currentRequest = null;

        if (!this.isReadyPromiseSettled && !this.autoUpdate) {
            // We will never resolve ready, so reject it
            this.rejectReadyPromise(new Error('Failed to become ready'));
        }

        if (this.autoUpdate && this.syncOnCurrentRequestComplete) {
            this.syncDatafile();
        }
        this.syncOnCurrentRequestComplete = false;
    }

    private syncDatafile(): void {
        const headers: Headers = {};
        if (this.lastResponseLastModified) {
            headers['if-modified-since'] = this.lastResponseLastModified;
        }

        logger.debug('Making datafile request to url %s with headers: %s', this.datafileUrl, () => JSON.stringify(headers));
        this.currentRequest = this.makeGetRequest(this.datafileUrl, headers);

        const onRequestComplete = (): void => {
            this.onRequestComplete();
        };
        const onRequestResolved = (response: Response): void => {
            this.onRequestResolved(response);
        };
        const onRequestRejected = (err: any): void => {
            this.onRequestRejected(err);
        };
        this.currentRequest.responsePromise
            .then(onRequestResolved, onRequestRejected)
            .then(onRequestComplete, onRequestComplete);
    }

    private resolveReadyPromise(): void {
        this.readyPromiseResolver();
        this.isReadyPromiseSettled = true;
    }

    private rejectReadyPromise(err: Error): void {
        this.readyPromiseRejecter(err);
        this.isReadyPromiseSettled = true;
    }

    private getNextDatafileFromResponse(response: Response): string {
        logger.debug('Response status code: %s', response.statusCode);
        if (typeof response.statusCode === 'undefined') {
            return '';
        }
        if (response.statusCode === 304) {
            return '';
        }
        if (isSuccessStatusCode(response.statusCode)) {
            return response.body;
        }
        return '';
    }

    private trySavingLastModified(headers: Headers): void {
        const lastModifiedHeader = headers['last-modified'] || headers['Last-Modified'];
        if (typeof lastModifiedHeader !== 'undefined') {
            this.lastResponseLastModified = lastModifiedHeader;
            logger.debug('Saved last modified header value from response: %s', this.lastResponseLastModified);
        }
    }

    setDatafileFromCacheIfAvailable(): void {
        this.cache.get(this.cacheKey).then(datafile => {
            if (this.isStarted && !this.isReadyPromiseSettled && datafile !== '') {
                logger.debug('Using datafile from cache');
                this.currentDatafile = datafile;
                this.resolveReadyPromise();
            }
        });
    }
}
