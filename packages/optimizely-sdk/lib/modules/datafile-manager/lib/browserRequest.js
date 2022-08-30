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
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeGetRequest = void 0;
var config_1 = require("./config");
var js_sdk_logging_1 = require("@optimizely/js-sdk-logging");
var logger = (0, js_sdk_logging_1.getLogger)('DatafileManager');
var GET_METHOD = 'GET';
var READY_STATE_DONE = 4;
function parseHeadersFromXhr(req) {
    var allHeadersString = req.getAllResponseHeaders();
    if (allHeadersString === null) {
        return {};
    }
    var headerLines = allHeadersString.split('\r\n');
    var headers = {};
    headerLines.forEach(function (headerLine) {
        var separatorIndex = headerLine.indexOf(': ');
        if (separatorIndex > -1) {
            var headerName = headerLine.slice(0, separatorIndex);
            var headerValue = headerLine.slice(separatorIndex + 2);
            if (headerValue.length > 0) {
                headers[headerName] = headerValue;
            }
        }
    });
    return headers;
}
function setHeadersInXhr(headers, req) {
    Object.keys(headers).forEach(function (headerName) {
        var header = headers[headerName];
        req.setRequestHeader(headerName, header);
    });
}
function makeGetRequest(reqUrl, headers) {
    var req = new XMLHttpRequest();
    var responsePromise = new Promise(function (resolve, reject) {
        req.open(GET_METHOD, reqUrl, true);
        setHeadersInXhr(headers, req);
        req.onreadystatechange = function () {
            if (req.readyState === READY_STATE_DONE) {
                var statusCode = req.status;
                if (statusCode === 0) {
                    reject(new Error('Request error'));
                    return;
                }
                var headers_1 = parseHeadersFromXhr(req);
                var resp = {
                    statusCode: req.status,
                    body: req.responseText,
                    headers: headers_1,
                };
                resolve(resp);
            }
        };
        req.timeout = config_1.REQUEST_TIMEOUT_MS;
        req.ontimeout = function () {
            logger.error('Request timed out');
        };
        req.send();
    });
    return {
        responsePromise: responsePromise,
        abort: function () {
            req.abort();
        },
    };
}
exports.makeGetRequest = makeGetRequest;
