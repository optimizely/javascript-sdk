/**
 * Copyright 2019, Optimizely
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
var EventDispatcherBridge = require('./event_dispatcher_bridge');
var chai = require('chai');
var assert = chai.assert;
var sinon = require('sinon');

describe('lib/optimizely/event_dispatcher_bridge', function() {
  var legacyDispatcher;
  var eventSpy;

  describe("when the legacy eventDispatcher uses a callback, and callback's success=true", function() {
    beforeEach(function() {
      eventSpy = sinon.spy();
      legacyDispatcher = {
        dispatchEvent: function(event, callback) {
          eventSpy(event);
          callback(true);
        },
      };
    });

    it('should invoke the legacy dispatcher with the correct parameters', function(done) {
      var bridge = new EventDispatcherBridge(legacyDispatcher);
      var params = { foo: 'bar' };
      var request = {
        method: 'POST',
        url: 'http://test.com',
        headers: {},
        event: params,
      };

      bridge.dispatch(request, function(success) {
        assert.isTrue(success);
        sinon.assert.calledOnce(eventSpy);

        sinon.assert.calledWithExactly(eventSpy, {
          httpVerb: 'POST',
          url: 'http://test.com',
          params: params,
        });
        done();
      });
    });
  });

  describe("when the legacy eventDispatcher uses a callback, and callback's success=false", function() {
    beforeEach(function() {
      eventSpy = sinon.spy();
      legacyDispatcher = {
        dispatchEvent: function(event, callback) {
          eventSpy(event);
          callback(false);
        },
      };
    });

    it('should invoke the legacy dispatcher with the correct parameters', function(done) {
      var bridge = new EventDispatcherBridge(legacyDispatcher);
      var params = { foo: 'bar' };
      var request = {
        method: 'POST',
        url: 'http://test.com',
        headers: {},
        event: params,
      };

      bridge.dispatch(request, function(success) {
        assert.isFalse(success);
        sinon.assert.calledOnce(eventSpy);

        sinon.assert.calledWithExactly(eventSpy, {
          httpVerb: 'POST',
          url: 'http://test.com',
          params: params,
        });
        done();
      });
    });
  });

  describe('when the legacy dispatcher returns a promise', function() {
    beforeEach(function() {
      eventSpy = sinon.spy();
      legacyDispatcher = {
        dispatchEvent: function(event, callback) {
          eventSpy(event);
          return new Promise(function(resolve) {
            resolve(true);
          });
        },
      };
    });

    it('should invoke the legacy dispatcher with the correct parameters', function(done) {
      var bridge = new EventDispatcherBridge(legacyDispatcher);
      var params = { foo: 'bar' };
      var request = {
        method: 'POST',
        url: 'http://test.com',
        headers: {},
        event: params,
      };

      bridge.dispatch(request, function(success) {
        assert.isTrue(success);
        sinon.assert.calledOnce(eventSpy);

        sinon.assert.calledWithExactly(eventSpy, {
          httpVerb: 'POST',
          url: 'http://test.com',
          params: params,
        });
        done();
      });
    });
  });
});
