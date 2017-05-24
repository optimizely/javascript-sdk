/**
 * Copyright 2016-2017, Optimizely
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
var eventDispatcher = require('./');
var chai = require('chai');
var assert = chai.assert;
var nock = require('nock');
var sinon = require('sinon');

describe('lib/plugins/event_dispatcher', function() {
  describe('APIs', function() {
    describe('dispatchEvent', function() {
      var stubCallback = {
        callback: function() {
        }
      }

      beforeEach(function() {
        sinon.stub(stubCallback, 'callback');
        nock('https://cdn.com')
          .post('/event')
          .reply(200, {
            ok: true,
          });
      });

      afterEach(function() {
        stubCallback.callback.restore();
        nock.cleanAll();
      });

      it('should send a POST request with the specified params', function(done) {
        var eventParams = {'testParam': 'testParamValue'};
        var eventObj = {
          url: 'https://cdn.com/event',
          body: {
            id: 123,
          },
          httpVerb: 'POST',
          params: eventParams
        };

        var caller = function(resp) {
          stubCallback.callback();
          assert.strictEqual(resp, JSON.stringify(eventParams));
          done();
        }

        eventDispatcher.dispatchEvent(eventObj, caller);
      });

      it('should execute the callback passed to event dispatcher with a post', function(done) {
        var eventObj = {
          url: 'https://cdn.com/event',
          body: {
            id: 123,
          },
          httpVerb: 'POST'
        };

        var caller = function() {
          stubCallback.callback();
          sinon.assert.calledOnce(stubCallback.callback);
          done();
        }

        eventDispatcher.dispatchEvent(eventObj, caller);
      });

      it('should execute the callback passed to event dispatcher with a get', function(done) {
        var eventObj = {
          url: 'https://cdn.com/event',
          httpVerb: 'GET'
        };

        var caller = function() {
          stubCallback.callback();
          sinon.assert.calledOnce(stubCallback.callback);
          done();
        }

        eventDispatcher.dispatchEvent(eventObj, caller);
      });

    });
  });
});
