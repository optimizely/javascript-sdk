var Resource = /** @class */ (function () {
    function Resource(loader) {
        this.loader = loader;
        this._hasLoaded = false;
        this.promise = this.load();
    }
    Object.defineProperty(Resource.prototype, "value", {
        get: function () {
            return this._value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Resource.prototype, "hasLoaded", {
        get: function () {
            return this._hasLoaded;
        },
        enumerable: true,
        configurable: true
    });
    Resource.prototype.updateStateFromLoadResult = function (value) {
        this._value = value;
        this._hasLoaded = true;
    };
    Resource.prototype.load = function () {
        var _this = this;
        var maybeValue = this.loader.load();
        // TODO: test does this work with polyfilled promise?
        if (maybeValue instanceof Promise) {
            return maybeValue.then(function (value) {
                _this.updateStateFromLoadResult(value);
                return value;
            });
        }
        this.updateStateFromLoadResult(maybeValue);
        return Promise.resolve(maybeValue);
    };
    return Resource;
}());
export { Resource };
//# sourceMappingURL=ResourceManager.js.map