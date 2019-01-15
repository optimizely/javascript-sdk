'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var React = require('react');
var reactBroadcast = require('react-broadcast');

/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */
/* global Reflect, Promise */

var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return extendStatics(d, b);
};

function __extends(d, b) {
    extendStatics(d, b);
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}

var __assign = function() {
    __assign = Object.assign || function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};

// @ts-ignore
var _a = reactBroadcast.createContext({
    optimizely: null,
    timeout: 0,
}), Consumer = _a.Consumer, Provider = _a.Provider;
var OptimizelyContextConsumer = Consumer;
var OptimizelyContextProvider = Provider;

var OptimizelyProvider = /** @class */ (function (_super) {
    __extends(OptimizelyProvider, _super);
    function OptimizelyProvider(props) {
        var _this = _super.call(this, props) || this;
        var timeout = props.timeout, optimizely = props.optimizely;
        _this.sdkWrapper = optimizely;
        return _this;
    }
    OptimizelyProvider.prototype.render = function () {
        var _a = this.props, children = _a.children, timeout = _a.timeout;
        var value = {
            optimizely: this.sdkWrapper,
        };
        if (timeout !== undefined) {
            value['timeout'] = timeout;
        }
        return (React.createElement(OptimizelyContextProvider, { value: value }, children));
    };
    return OptimizelyProvider;
}(React.Component));

function withOptimizely(Component) {
    return /** @class */ (function (_super) {
        __extends(WithOptimizely, _super);
        function WithOptimizely() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        WithOptimizely.prototype.render = function () {
            var _this = this;
            return (React.createElement(OptimizelyContextConsumer, null, function (value) { return (React.createElement(Component, __assign({}, _this.props, { optimizely: value.optimizely, optimizelyReadyTimeout: value.timeout }))); }));
        };
        return WithOptimizely;
    }(React.Component));
}

var FeatureComponent = /** @class */ (function (_super) {
    __extends(FeatureComponent, _super);
    function FeatureComponent(props) {
        var _this = _super.call(this, props) || this;
        _this.state = {
            canRender: false,
            isEnabled: false,
            variables: {},
        };
        return _this;
    }
    FeatureComponent.prototype.componentDidMount = function () {
        var _this = this;
        var _a = this.props, feature = _a.feature, optimizely = _a.optimizely, optimizelyReadyTimeout = _a.optimizelyReadyTimeout;
        if (optimizely === null) {
            throw new Error('optimizely prop must be supplied');
        }
        optimizely.onReady({ timeout: optimizelyReadyTimeout }).then(function () {
            var isEnabled = optimizely.isFeatureEnabled(feature);
            var variables = optimizely.getFeatureVariables(feature);
            _this.setState({
                canRender: true,
                isEnabled: isEnabled,
                variables: variables,
            });
        });
    };
    FeatureComponent.prototype.render = function () {
        var children = this.props.children;
        var _a = this.state, isEnabled = _a.isEnabled, variables = _a.variables, canRender = _a.canRender;
        if (!canRender) {
            return null;
        }
        return children(isEnabled, variables);
    };
    return FeatureComponent;
}(React.Component));
var OptimizelyFeature = withOptimizely(FeatureComponent);

var Experiment = /** @class */ (function (_super) {
    __extends(Experiment, _super);
    function Experiment(props) {
        var _this = _super.call(this, props) || this;
        _this.state = {
            canRender: false,
            variation: null,
        };
        return _this;
    }
    Experiment.prototype.componentDidMount = function () {
        var _this = this;
        var _a = this.props, experiment = _a.experiment, optimizely = _a.optimizely, optimizelyReadyTimeout = _a.optimizelyReadyTimeout;
        if (!optimizely) {
            throw new Error('optimizely prop must be supplied');
        }
        optimizely.onReady({ timeout: optimizelyReadyTimeout }).then(function () {
            var variation = optimizely.activate(experiment);
            _this.setState({
                canRender: true,
                variation: variation,
            });
        });
    };
    Experiment.prototype.render = function () {
        var children = this.props.children;
        var _a = this.state, variation = _a.variation, canRender = _a.canRender;
        if (!canRender) {
            return null;
        }
        if (children != null && typeof children === 'function') {
            return children(variation);
        }
        var match = null;
        // We use React.Children.forEach instead of React.Children.toArray().find()
        // here because toArray adds keys to all child elements and we do not want
        // to trigger an unmount/remount
        React.Children.forEach(this.props.children, function (child) {
            if (match || !React.isValidElement(child)) {
                return;
            }
            if (child.props.variation) {
                if (variation === child.props.variation) {
                    match = child;
                }
            }
            else if (child.props.default) {
                match = child;
            }
        });
        return match
            ? React.cloneElement(match, { variation: variation })
            : null;
    };
    return Experiment;
}(React.Component));
var OptimizelyExperiment = withOptimizely(Experiment);

var Variation = /** @class */ (function (_super) {
    __extends(Variation, _super);
    function Variation() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Variation.prototype.render = function () {
        return this.props.children;
    };
    return Variation;
}(React.Component));
var OptimizelyVariation = Variation;

exports.OptimizelyProvider = OptimizelyProvider;
exports.OptimizelyFeature = OptimizelyFeature;
exports.withOptimizely = withOptimizely;
exports.OptimizelyExperiment = OptimizelyExperiment;
exports.OptimizelyVariation = OptimizelyVariation;
