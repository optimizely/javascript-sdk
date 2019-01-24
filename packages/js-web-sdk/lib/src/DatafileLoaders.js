var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var ProvidedDatafileLoader = /** @class */ (function () {
    function ProvidedDatafileLoader(config) {
        this.datafile = config.datafile;
    }
    ProvidedDatafileLoader.prototype.load = function () {
        return this.datafile;
    };
    return ProvidedDatafileLoader;
}());
export { ProvidedDatafileLoader };
var FetchUrlDatafileLoader = /** @class */ (function () {
    function FetchUrlDatafileLoader(config) {
        this.sdkKey = config.sdkKey;
        this.localStorageKey = config.localStorageKey || 'optly_fs_datafile';
    }
    FetchUrlDatafileLoader.prototype.load = function () {
        var _this = this;
        var cacheResult = this.getFromCache();
        var freshDatafileFetch = this.fetchDatafile().then(function (datafile) {
            _this.saveToCache(datafile);
            return datafile;
        });
        if (cacheResult && this.shouldUseCache(cacheResult)) {
            return cacheResult.datafile;
        }
        return freshDatafileFetch;
    };
    FetchUrlDatafileLoader.prototype.saveToCache = function (datafileToSave) {
        var _this = this;
        if (typeof window !== 'undefined') {
            var cacheEntry_1 = {
                datafile: datafileToSave,
                metadata: {
                    timestampCached: Date.now(),
                },
            };
            // use setTimeout as to not block on a potentially expensive JSON.stringify
            setTimeout(function () {
                window.localStorage.setItem(_this.localStorageKey, JSON.stringify(cacheEntry_1));
            }, 0);
        }
    };
    FetchUrlDatafileLoader.prototype.shouldUseCache = function (cacheResult) {
        return (Date.now() - cacheResult.metadata.timestampCached) <= FetchUrlDatafileLoader.MAX_CACHE_AGE_MS;
    };
    FetchUrlDatafileLoader.prototype.fetchDatafile = function () {
        return __awaiter(this, void 0, void 0, function () {
            var datafileUrl;
            return __generator(this, function (_a) {
                datafileUrl = "https://cdn.optimizely.com/datafiles/" + this.sdkKey + ".json";
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        var req = new XMLHttpRequest();
                        req.open(FetchUrlDatafileLoader.GET_METHOD, datafileUrl, true);
                        req.onreadystatechange = function () {
                            if (req.readyState === FetchUrlDatafileLoader.READY_STATE_COMPLETE) {
                                // TODO: Improve & add more error handling
                                if (req.status >= 400) {
                                    reject('Error response fetching datafile');
                                    return;
                                }
                                var datafile = void 0;
                                try {
                                    datafile = JSON.parse(req.response);
                                }
                                catch (e) {
                                    reject("Datafile was not valid JSON. Got: " + req.response);
                                    return;
                                }
                                resolve(datafile);
                            }
                        };
                        req.send();
                    })];
            });
        });
    };
    FetchUrlDatafileLoader.prototype.getFromCache = function () {
        if (typeof window === 'undefined') {
            return null;
        }
        var item = window.localStorage.getItem(this.localStorageKey);
        if (!item) {
            return null;
        }
        var toReturn;
        try {
            toReturn = JSON.parse(item);
        }
        catch (e) {
            toReturn = null;
        }
        return toReturn;
    };
    // 1 week in ms = 7 days * 24 hours * 60 minutes * 60 seconds * 1000 ms
    FetchUrlDatafileLoader.MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000;
    FetchUrlDatafileLoader.GET_METHOD = 'GET';
    FetchUrlDatafileLoader.READY_STATE_COMPLETE = 4;
    return FetchUrlDatafileLoader;
}());
export { FetchUrlDatafileLoader };
//# sourceMappingURL=DatafileLoaders.js.map