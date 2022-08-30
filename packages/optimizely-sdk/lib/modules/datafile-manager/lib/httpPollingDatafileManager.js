"use strict";
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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var js_sdk_logging_1 = require("@optimizely/js-sdk-logging");
var js_sdk_utils_1 = require("@optimizely/js-sdk-utils");
var eventEmitter_1 = __importDefault(require("./eventEmitter"));
var config_1 = require("./config");
var backoffController_1 = __importDefault(require("./backoffController"));
var logger = (0, js_sdk_logging_1.getLogger)('DatafileManager');
var UPDATE_EVT = 'update';
function isValidUpdateInterval(updateInterval) {
    return updateInterval >= config_1.MIN_UPDATE_INTERVAL;
}
function isSuccessStatusCode(statusCode) {
    return statusCode >= 200 && statusCode < 400;
}
var noOpKeyValueCache = {
    get: function () {
        return Promise.resolve('');
    },
    set: function () {
        return Promise.resolve();
    },
    contains: function () {
        return Promise.resolve(false);
    },
    remove: function () {
        return Promise.resolve();
    },
};
var HttpPollingDatafileManager = /** @class */ (function () {
    function HttpPollingDatafileManager(config) {
        var _this = this;
        var configWithDefaultsApplied = __assign(__assign({}, this.getConfigDefaults()), config);
        var datafile = configWithDefaultsApplied.datafile, _a = configWithDefaultsApplied.autoUpdate, autoUpdate = _a === void 0 ? false : _a, sdkKey = configWithDefaultsApplied.sdkKey, _b = configWithDefaultsApplied.updateInterval, updateInterval = _b === void 0 ? config_1.DEFAULT_UPDATE_INTERVAL : _b, _c = configWithDefaultsApplied.urlTemplate, urlTemplate = _c === void 0 ? config_1.DEFAULT_URL_TEMPLATE : _c, _d = configWithDefaultsApplied.cache, cache = _d === void 0 ? noOpKeyValueCache : _d;
        this.cache = cache;
        this.cacheKey = 'opt-datafile-' + sdkKey;
        this.isReadyPromiseSettled = false;
        this.readyPromiseResolver = function () { };
        this.readyPromiseRejecter = function () { };
        this.readyPromise = new Promise(function (resolve, reject) {
            _this.readyPromiseResolver = resolve;
            _this.readyPromiseRejecter = reject;
        });
        if (datafile) {
            this.currentDatafile = datafile;
            if (!sdkKey) {
                this.resolveReadyPromise();
            }
        }
        else {
            this.currentDatafile = '';
        }
        this.isStarted = false;
        this.datafileUrl = (0, js_sdk_utils_1.sprintf)(urlTemplate, sdkKey);
        this.emitter = new eventEmitter_1.default();
        this.autoUpdate = autoUpdate;
        if (isValidUpdateInterval(updateInterval)) {
            this.updateInterval = updateInterval;
        }
        else {
            logger.warn('Invalid updateInterval %s, defaulting to %s', updateInterval, config_1.DEFAULT_UPDATE_INTERVAL);
            this.updateInterval = config_1.DEFAULT_UPDATE_INTERVAL;
        }
        this.currentTimeout = null;
        this.currentRequest = null;
        this.backoffController = new backoffController_1.default();
        this.syncOnCurrentRequestComplete = false;
    }
    HttpPollingDatafileManager.prototype.get = function () {
        return this.currentDatafile;
    };
    HttpPollingDatafileManager.prototype.start = function () {
        if (!this.isStarted) {
            logger.debug('Datafile manager started');
            this.isStarted = true;
            this.backoffController.reset();
            this.setDatafileFromCacheIfAvailable();
            this.syncDatafile();
        }
    };
    HttpPollingDatafileManager.prototype.stop = function () {
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
    };
    HttpPollingDatafileManager.prototype.onReady = function () {
        return this.readyPromise;
    };
    HttpPollingDatafileManager.prototype.on = function (eventName, listener) {
        return this.emitter.on(eventName, listener);
    };
    HttpPollingDatafileManager.prototype.onRequestRejected = function (err) {
        if (!this.isStarted) {
            return;
        }
        this.backoffController.countError();
        if (err instanceof Error) {
            logger.error('Error fetching datafile: %s', err.message, err);
        }
        else if (typeof err === 'string') {
            logger.error('Error fetching datafile: %s', err);
        }
        else {
            logger.error('Error fetching datafile');
        }
    };
    HttpPollingDatafileManager.prototype.onRequestResolved = function (response) {
        if (!this.isStarted) {
            return;
        }
        if (typeof response.statusCode !== 'undefined' && isSuccessStatusCode(response.statusCode)) {
            this.backoffController.reset();
        }
        else {
            this.backoffController.countError();
        }
        this.trySavingLastModified(response.headers);
        var datafile = this.getNextDatafileFromResponse(response);
        if (datafile !== '') {
            logger.info('Updating datafile from response');
            this.currentDatafile = datafile;
            this.cache.set(this.cacheKey, datafile);
            if (!this.isReadyPromiseSettled) {
                this.resolveReadyPromise();
            }
            else {
                var datafileUpdate = {
                    datafile: datafile,
                };
                this.emitter.emit(UPDATE_EVT, datafileUpdate);
            }
        }
    };
    HttpPollingDatafileManager.prototype.onRequestComplete = function () {
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
    };
    HttpPollingDatafileManager.prototype.syncDatafile = function () {
        var _this = this;
        var headers = {};
        if (this.lastResponseLastModified) {
            headers['if-modified-since'] = this.lastResponseLastModified;
        }
        logger.debug('Making datafile request to url %s with headers: %s', this.datafileUrl, function () { return JSON.stringify(headers); });
        this.currentRequest = this.makeGetRequest(this.datafileUrl, headers);
        var onRequestComplete = function () {
            _this.onRequestComplete();
        };
        var onRequestResolved = function (response) {
            _this.onRequestResolved(response);
        };
        var onRequestRejected = function (err) {
            _this.onRequestRejected(err);
        };
        this.currentRequest.responsePromise
            .then(onRequestResolved, onRequestRejected)
            .then(onRequestComplete, onRequestComplete);
        if (this.autoUpdate) {
            this.scheduleNextUpdate();
        }
    };
    HttpPollingDatafileManager.prototype.resolveReadyPromise = function () {
        this.readyPromiseResolver();
        this.isReadyPromiseSettled = true;
    };
    HttpPollingDatafileManager.prototype.rejectReadyPromise = function (err) {
        this.readyPromiseRejecter(err);
        this.isReadyPromiseSettled = true;
    };
    HttpPollingDatafileManager.prototype.scheduleNextUpdate = function () {
        var _this = this;
        var currentBackoffDelay = this.backoffController.getDelay();
        var nextUpdateDelay = Math.max(currentBackoffDelay, this.updateInterval);
        logger.debug('Scheduling sync in %s ms', nextUpdateDelay);
        this.currentTimeout = setTimeout(function () {
            if (_this.currentRequest) {
                _this.syncOnCurrentRequestComplete = true;
            }
            else {
                _this.syncDatafile();
            }
        }, nextUpdateDelay);
    };
    HttpPollingDatafileManager.prototype.getNextDatafileFromResponse = function (response) {
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
    };
    HttpPollingDatafileManager.prototype.trySavingLastModified = function (headers) {
        var lastModifiedHeader = headers['last-modified'] || headers['Last-Modified'];
        if (typeof lastModifiedHeader !== 'undefined') {
            this.lastResponseLastModified = lastModifiedHeader;
            logger.debug('Saved last modified header value from response: %s', this.lastResponseLastModified);
        }
    };
    HttpPollingDatafileManager.prototype.setDatafileFromCacheIfAvailable = function () {
        var _this = this;
        this.cache.get(this.cacheKey).then(function (datafile) {
            if (_this.isStarted && !_this.isReadyPromiseSettled && datafile !== '') {
                logger.debug('Using datafile from cache');
                _this.currentDatafile = datafile;
                _this.resolveReadyPromise();
            }
        });
    };
    return HttpPollingDatafileManager;
}());
exports.default = HttpPollingDatafileManager;
