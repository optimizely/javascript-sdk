"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Copyright 2020, Optimizely
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
var async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
var ReactNativeAsyncStorageCache = /** @class */ (function () {
    function ReactNativeAsyncStorageCache() {
    }
    ReactNativeAsyncStorageCache.prototype.get = function (key) {
        return async_storage_1.default.getItem(key).then(function (val) {
            if (!val) {
                return '';
            }
            return val;
        });
    };
    ReactNativeAsyncStorageCache.prototype.set = function (key, val) {
        return async_storage_1.default.setItem(key, val);
    };
    ReactNativeAsyncStorageCache.prototype.contains = function (key) {
        return async_storage_1.default.getItem(key).then(function (val) { return val !== null; });
    };
    ReactNativeAsyncStorageCache.prototype.remove = function (key) {
        return async_storage_1.default.removeItem(key);
    };
    return ReactNativeAsyncStorageCache;
}());
exports.default = ReactNativeAsyncStorageCache;
