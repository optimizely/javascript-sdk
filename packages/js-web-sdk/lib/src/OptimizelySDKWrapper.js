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
import * as optimizely from '@optimizely/optimizely-sdk';
import { find } from './utils';
import { ProvidedDatafileLoader, FetchUrlDatafileLoader } from './DatafileLoaders';
import { Resource } from './ResourceManager';
/**
 * @export
 * @class OptimizelySDKWrapper
 * @implements {IOptimizelySDKWrapper}
 */
var OptimizelySDKWrapper = /** @class */ (function () {
    /**
     * Creates an instance of OptimizelySDKWrapper.
     * @param {OptimizelySDKWrapperConfig} [config={}]
     * @memberof OptimizelySDKWrapper
     */
    function OptimizelySDKWrapper(config) {
        if (config === void 0) { config = {}; }
        var _this = this;
        this.initialConfig = config;
        this.isInitialized = false;
        this.datafile = null;
        this.trackEventQueue = [];
        this.datafileResource = this.setupDatafileResource(config);
        if (this.datafileResource.hasLoaded) {
            this.onInitialized();
            this.initializingPromise = Promise.resolve();
        }
        else {
            this.initializingPromise = this.datafileResource.promise.then(function () {
                _this.onInitialized();
            });
        }
    }
    /**
     * onReady happens when the datafile and attributes are fully loaded
     * Returns a promise where the resolved value is a boolean indicating whether
     * the optimizely instance has been initialized.  This only is false when
     * you supply a timeout
  
     * @param {{ timeout?: number }} [config={}]
     * @returns {Promise<boolean>}
     * @memberof OptimizelySDKWrapper
     */
    OptimizelySDKWrapper.prototype.onReady = function (config) {
        if (config === void 0) { config = {}; }
        return __awaiter(this, void 0, void 0, function () {
            var timeoutId;
            var _this = this;
            return __generator(this, function (_a) {
                if (config.timeout == null) {
                    return [2 /*return*/, this.initializingPromise.then(function () { return true; }, function (reason) { return false; })];
                }
                else {
                    // handle the case where its not initialized and timeout is set
                    return [2 /*return*/, Promise.race([
                            this.initializingPromise,
                            new Promise(function (resolve) {
                                timeoutId = setTimeout(function () { return resolve(); }, config.timeout);
                            }),
                        ]).then(function () {
                            if (_this.isInitialized && timeoutId) {
                                clearTimeout(timeoutId);
                            }
                            return _this.isInitialized;
                        })];
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * @param {string} experimentKey
     * @param {string} userId
     * @param {UserAttributes} [attributes]
     * @returns {(string | null)}
     * @memberof OptimizelySDKWrapper
     */
    OptimizelySDKWrapper.prototype.activate = function (experimentKey, userId, attributes) {
        if (!this.isInitialized) {
            return null;
        }
        return this.instance.activate(experimentKey, userId, attributes);
    };
    /**
     *
     *
     * @param {string} experimentKey
     * @param {string} userId
     * @param {UserAttributes} [attributes]
     * @returns {(string | null)}
     * @memberof OptimizelySDKWrapper
     */
    OptimizelySDKWrapper.prototype.getVariation = function (experimentKey, userId, attributes) {
        if (!this.isInitialized) {
            return null;
        }
        return this.instance.getVariation(experimentKey, userId, attributes);
    };
    /**
     * @param {string} eventKey
     * @param {string} userId
     * @param {UserAttributes} [attributes]
     * @param {optimizely.EventTags} [eventTags]
     * @memberof OptimizelySDKWrapper
     */
    OptimizelySDKWrapper.prototype.track = function (eventKey, userId, attributes, eventTags) {
        if (!this.isInitialized) {
            this.trackEventQueue.push([eventKey, userId, attributes, eventTags]);
            return;
        }
        this.instance.track(eventKey, userId, attributes, eventTags);
    };
    /**
     * Note: in the case where the feature isnt in the datafile or the datafile hasnt been
     * loaded, this will return `false`
     *
     * @param {string} feature
     * @param {string} userId
     * @param {UserAttributes} [attributes]
     * @returns {boolean}
     * @memberof OptimizelySDKWrapper
     */
    OptimizelySDKWrapper.prototype.isFeatureEnabled = function (feature, userId, attributes) {
        if (!this.isInitialized) {
            return false;
        }
        return this.instance.isFeatureEnabled(feature, userId, attributes);
    };
    /**
     * Get all variables for a feature, regardless of the feature being enabled/disabled
     *
     * @param {string} feature
     * @param {string} userId
     * @param {UserAttributes} [attributes]
     * @returns {VariableValuesObject}
     * @memberof OptimizelySDKWrapper
     */
    OptimizelySDKWrapper.prototype.getFeatureVariables = function (feature, userId, attributes) {
        var _this = this;
        if (!this.isInitialized) {
            return {};
        }
        var variableDefs = this.getVariableDefsForFeature(feature);
        if (!variableDefs) {
            // TODO: error
            return {};
        }
        var variableObj = {};
        variableDefs.forEach(function (_a) {
            var key = _a.key, type = _a.type;
            switch (type) {
                case 'string':
                    variableObj[key] = _this.instance.getFeatureVariableString(feature, key, userId, attributes);
                    break;
                case 'boolean':
                    variableObj[key] = _this.instance.getFeatureVariableBoolean(feature, key, userId, attributes);
                    break;
                case 'integer':
                    variableObj[key] = _this.instance.getFeatureVariableInteger(feature, key, userId, attributes);
                    break;
                case 'double':
                    variableObj[key] = _this.instance.getFeatureVariableDouble(feature, key, userId, attributes);
                    break;
            }
        });
        return variableObj;
    };
    /**
     * @param {string} feature
     * @param {string} variable
     * @param {string} userId
     * @param {UserAttributes} [attributes]
     * @returns {(string | null)}
     * @memberof OptimizelySDKWrapper
     */
    OptimizelySDKWrapper.prototype.getFeatureVariableString = function (feature, variable, userId, attributes) {
        if (!this.isInitialized) {
            return null;
        }
        return this.instance.getFeatureVariableString(feature, variable, userId, attributes);
    };
    /**
     * @param {string} feature
     * @param {string} variable
     * @param {string} userId
     * @param {UserAttributes} [attributes]
     * @returns {(boolean | null)}
     * @memberof OptimizelySDKWrapper
     */
    OptimizelySDKWrapper.prototype.getFeatureVariableBoolean = function (feature, variable, userId, attributes) {
        if (!this.isInitialized) {
            return null;
        }
        return this.instance.getFeatureVariableBoolean(feature, variable, userId, attributes);
    };
    /**
     * @param {string} feature
     * @param {string} variable
     * @param {string} userId
     * @param {UserAttributes} [attributes]
     * @returns {(number | null)}
     * @memberof OptimizelySDKWrapper
     */
    OptimizelySDKWrapper.prototype.getFeatureVariableInteger = function (feature, variable, userId, attributes) {
        if (!this.isInitialized) {
            return null;
        }
        return this.instance.getFeatureVariableInteger(feature, variable, userId, attributes);
    };
    /**
     * @param {string} feature
     * @param {string} variable
     * @param {string} userId
     * @param {UserAttributes} [attributes]
     * @returns {(number | null)}
     * @memberof OptimizelySDKWrapper
     */
    OptimizelySDKWrapper.prototype.getFeatureVariableDouble = function (feature, variable, userId, attributes) {
        if (!this.isInitialized) {
            return null;
        }
        return this.instance.getFeatureVariableDouble(feature, variable, userId, attributes);
    };
    /**
     * Get an array of all enabled features
     *
     * @param {string} userId
     * @param {UserAttributes} [attributes]
     * @returns {Array<string>}
     * @memberof OptimizelySDKWrapper
     */
    OptimizelySDKWrapper.prototype.getEnabledFeatures = function (userId, attributes) {
        if (!this.isInitialized) {
            return [];
        }
        return this.instance.getEnabledFeatures(userId, attributes);
    };
    /**
     * @param {string} experiment
     * @param {string} userId
     * @returns {(string | null)}
     * @memberof OptimizelySDKWrapper
     */
    OptimizelySDKWrapper.prototype.getForcedVariation = function (experiment, userId) {
        return this.instance.getForcedVariation(experiment, userId);
    };
    /**
     * @param {string} experiment
     * @param {string} userId
     * @param {string} variationKey
     * @returns {boolean}
     * @memberof OptimizelySDKWrapper
     */
    OptimizelySDKWrapper.prototype.setForcedVariation = function (experiment, userId, variationKey) {
        return this.instance.setForcedVariation(experiment, userId, variationKey);
    };
    OptimizelySDKWrapper.prototype.getVariableDefsForFeature = function (feature) {
        if (!this.datafile) {
            return null;
        }
        var featureDef = find(this.datafile.featureFlags, function (entry) { return entry.key === feature; });
        if (!featureDef) {
            return null;
        }
        return featureDef.variables;
    };
    OptimizelySDKWrapper.prototype.flushTrackEventQueue = function () {
        while (this.trackEventQueue.length) {
            var args = this.trackEventQueue.shift();
            this.track.apply(this, args);
        }
    };
    OptimizelySDKWrapper.prototype.setupDatafileResource = function (config) {
        var datafileLoader;
        if (config.datafile) {
            datafileLoader = new ProvidedDatafileLoader({
                datafile: config.datafile,
            });
        }
        else if (config.sdkKey) {
            datafileLoader = new FetchUrlDatafileLoader({
                sdkKey: config.sdkKey,
            });
        }
        else {
            throw new Error('Must supply either "datafile", "SDKKey"');
        }
        return new Resource(datafileLoader);
    };
    OptimizelySDKWrapper.prototype.onInitialized = function () {
        var datafile = this.datafileResource.value;
        if (datafile) {
            this.datafile = datafile;
        }
        // can initialize check
        if (!this.datafile) {
            return;
        }
        this.isInitialized = true;
        this.instance = optimizely.createInstance(__assign({}, this.initialConfig, { datafile: this.datafile }));
        // TODO: make sure this is flushed after notification listeners can be added
        this.flushTrackEventQueue();
    };
    return OptimizelySDKWrapper;
}());
export { OptimizelySDKWrapper };
//# sourceMappingURL=OptimizelySDKWrapper.js.map