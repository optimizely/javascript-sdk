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
exports.makeGetRequest = void 0;
var http_1 = __importDefault(require("http"));
var https_1 = __importDefault(require("https"));
var url_1 = __importDefault(require("url"));
var config_1 = require("./config");
var decompress_response_1 = __importDefault(require("decompress-response"));
function getRequestOptionsFromUrl(url) {
    return {
        hostname: url.hostname,
        path: url.path,
        port: url.port,
        protocol: url.protocol,
    };
}
/**
 * Convert incomingMessage.headers (which has type http.IncomingHttpHeaders) into our Headers type defined in src/http.ts.
 *
 * Our Headers type is simplified and can't represent mutliple values for the same header name.
 *
 * We don't currently need multiple values support, and the consumer code becomes simpler if it can assume at-most 1 value
 * per header name.
 *
 */
function createHeadersFromNodeIncomingMessage(incomingMessage) {
    var headers = {};
    Object.keys(incomingMessage.headers).forEach(function (headerName) {
        var headerValue = incomingMessage.headers[headerName];
        if (typeof headerValue === 'string') {
            headers[headerName] = headerValue;
        }
        else if (typeof headerValue === 'undefined') {
            // no value provided for this header
        }
        else {
            // array
            if (headerValue.length > 0) {
                // We don't care about multiple values - just take the first one
                headers[headerName] = headerValue[0];
            }
        }
    });
    return headers;
}
function getResponseFromRequest(request) {
    // TODO: When we drop support for Node 6, consider using util.promisify instead of
    // constructing own Promise
    return new Promise(function (resolve, reject) {
        var timeout = setTimeout(function () {
            request.abort();
            reject(new Error('Request timed out'));
        }, config_1.REQUEST_TIMEOUT_MS);
        request.once('response', function (incomingMessage) {
            if (request.aborted) {
                return;
            }
            var response = (0, decompress_response_1.default)(incomingMessage);
            response.setEncoding('utf8');
            var responseData = '';
            response.on('data', function (chunk) {
                if (!request.aborted) {
                    responseData += chunk;
                }
            });
            response.on('end', function () {
                if (request.aborted) {
                    return;
                }
                clearTimeout(timeout);
                resolve({
                    statusCode: incomingMessage.statusCode,
                    body: responseData,
                    headers: createHeadersFromNodeIncomingMessage(incomingMessage),
                });
            });
        });
        request.on('error', function (err) {
            clearTimeout(timeout);
            if (err instanceof Error) {
                reject(err);
            }
            else if (typeof err === 'string') {
                reject(new Error(err));
            }
            else {
                reject(new Error('Request error'));
            }
        });
    });
}
function makeGetRequest(reqUrl, headers) {
    // TODO: Use non-legacy URL parsing when we drop support for Node 6
    var parsedUrl = url_1.default.parse(reqUrl);
    var requester;
    if (parsedUrl.protocol === 'http:') {
        requester = http_1.default.request;
    }
    else if (parsedUrl.protocol === 'https:') {
        requester = https_1.default.request;
    }
    else {
        return {
            responsePromise: Promise.reject(new Error("Unsupported protocol: ".concat(parsedUrl.protocol))),
            abort: function () { },
        };
    }
    var requestOptions = __assign(__assign({}, getRequestOptionsFromUrl(parsedUrl)), { method: 'GET', headers: __assign(__assign({}, headers), { 'accept-encoding': 'gzip,deflate' }) });
    var request = requester(requestOptions);
    var responsePromise = getResponseFromRequest(request);
    request.end();
    return {
        abort: function () {
            request.abort();
        },
        responsePromise: responsePromise,
    };
}
exports.makeGetRequest = makeGetRequest;
