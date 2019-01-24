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
import { OptimizelySDKWrapper } from './index';
var localDatafile = { "version": "4", "rollouts": [{ "experiments": [{ "status": "Running", "key": "12135000122", "layerId": "12103610772", "trafficAllocation": [{ "entityId": "12097940344", "endOfRange": 10000 }], "audienceIds": [], "variations": [{ "variables": [{ "id": "12134130361", "value": "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.  shit dog" }, { "id": "12103830477", "value": "Hi Jess!" }], "id": "12097940344", "key": "12097940344", "featureEnabled": true }], "forcedVariations": {}, "id": "12135000122" }], "id": "12103610772" }, { "experiments": [{ "status": "Not started", "key": "12117090566", "layerId": "12109830659", "trafficAllocation": [{ "entityId": "12103740615", "endOfRange": 0 }], "audienceIds": [], "variations": [{ "variables": [], "id": "12103740615", "key": "12103740615", "featureEnabled": false }], "forcedVariations": {}, "id": "12117090566" }], "id": "12109830659" }], "typedAudiences": [], "anonymizeIP": false, "projectId": "12122640456", "variables": [], "featureFlags": [{ "experimentIds": [], "rolloutId": "12103610772", "variables": [{ "defaultValue": "Hi Jess!", "type": "string", "id": "12103830477", "key": "header" }, { "defaultValue": "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.  shit dog", "type": "string", "id": "12134130361", "key": "content" }], "id": "12113321010", "key": "feature1" }, { "experimentIds": [], "rolloutId": "12109830659", "variables": [{ "defaultValue": "", "type": "string", "id": "12097810491", "key": "str" }, { "defaultValue": "0.0", "type": "double", "id": "12103850480", "key": "double" }, { "defaultValue": "false", "type": "boolean", "id": "12105540346", "key": "bool" }, { "defaultValue": "0", "type": "integer", "id": "12126320466", "key": "int" }], "id": "12126690667", "key": "allvars" }], "experiments": [], "audiences": [], "groups": [], "attributes": [], "botFiltering": false, "accountId": "804231466", "events": [], "revision": "17" };
function testLocalDatafile() {
    console.log('testLocalDatafile');
    var optimizely = new OptimizelySDKWrapper({
        datafile: localDatafile,
        userProfileService: {
            lookup: function (userId) {
                console.log('lookup', userId);
                var a = 'foo';
                return a;
            },
            save: function (data) {
            }
        }
    });
    optimizely.isFeatureEnabled('feature1', 'jordan');
    optimizely.getFeatureVariables('feature1', 'jordan');
    console.log(optimizely.isInitialized);
}
function testUrlLoad() {
    return __awaiter(this, void 0, void 0, function () {
        var optimizely, optimizely2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    optimizely = new OptimizelySDKWrapper({
                        sdkKey: 'GaXr9RoDhRcqXJm3ruskRa',
                    });
                    optimizely.track('foo', 'jordan');
                    optimizely.track('foo', 'jordan', {
                        plan_type: 'bronze'
                    });
                    optimizely.track('foo', 'jodran', { plan_type: 'bronze' }, { revenue: 123 });
                    return [4 /*yield*/, optimizely.onReady()];
                case 1:
                    _a.sent();
                    console.log('optly1 - feature1', optimizely.isFeatureEnabled('feature1', 'jordan'));
                    optimizely2 = new OptimizelySDKWrapper({
                        sdkKey: 'GaXr9RoDhRcqXJm3ruskRa',
                    });
                    console.log('optly2 - feature1', optimizely2.isFeatureEnabled('feature1', 'jordan'));
                    return [2 /*return*/];
            }
        });
    });
}
testLocalDatafile();
testUrlLoad();
//# sourceMappingURL=test.js.map