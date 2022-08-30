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
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
var nodeRequest_1 = require("./nodeRequest");
var httpPollingDatafileManager_1 = __importDefault(require("./httpPollingDatafileManager"));
var config_1 = require("./config");
var logger = (0, js_sdk_logging_1.getLogger)('NodeDatafileManager');
var NodeDatafileManager = /** @class */ (function (_super) {
    __extends(NodeDatafileManager, _super);
    function NodeDatafileManager(config) {
        var _this = this;
        var defaultUrlTemplate = config.datafileAccessToken ? config_1.DEFAULT_AUTHENTICATED_URL_TEMPLATE : config_1.DEFAULT_URL_TEMPLATE;
        _this = _super.call(this, __assign(__assign({}, config), { urlTemplate: config.urlTemplate || defaultUrlTemplate })) || this;
        _this.accessToken = config.datafileAccessToken;
        return _this;
    }
    NodeDatafileManager.prototype.makeGetRequest = function (reqUrl, headers) {
        var requestHeaders = Object.assign({}, headers);
        if (this.accessToken) {
            logger.debug('Adding Authorization header with Bearer Token');
            requestHeaders['Authorization'] = "Bearer ".concat(this.accessToken);
        }
        return (0, nodeRequest_1.makeGetRequest)(reqUrl, requestHeaders);
    };
    NodeDatafileManager.prototype.getConfigDefaults = function () {
        return {
            autoUpdate: true,
        };
    };
    return NodeDatafileManager;
}(httpPollingDatafileManager_1.default));
exports.default = NodeDatafileManager;
