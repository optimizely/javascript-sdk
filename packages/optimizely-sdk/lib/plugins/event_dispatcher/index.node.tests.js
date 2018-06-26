/**
 * Copyright 2016-2018, Optimizely
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
var eventDispatcher = require('./index.node');
var chai = require('chai');
var assert = chai.assert;
var nock = require('nock');
var sinon = require('sinon');

describe('lib/plugins/event_dispatcher/node', function() {
  describe('APIs', function() {
    describe('dispatchEvent', function() {
      var stubCallback = {
        callback: function() {}
      };

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
        var eventObj = {
          url: 'https://cdn.com/event',
          params: {
            id: 123,
          },
          httpVerb: 'POST',
        };

        eventDispatcher.dispatchEvent(eventObj, function(resp) {
          assert.equal(200, resp.statusCode);
          done();
        });
      });

      it('should execute the callback passed to event dispatcher', function(done) {
        var eventObj = {
          url: 'https://cdn.com/event',
          params: {
            id: 123,
          },
          httpVerb: 'POST',
        };

        eventDispatcher.dispatchEvent(eventObj, stubCallback.callback)
        .on('response', function(response) {
          sinon.assert.calledOnce(stubCallback.callback);
          done();
        })
        .on('error', function(error) {
          assert.fail('status code okay', 'status code not okay', '');
        });
      });

      it('rejects GET httpVerb', function() {
        var eventObj = {
          url: 'https://cdn.com/event',
          params: {
            id: 123,
          },
          httpVerb: 'GET',
        };

        var callback = sinon.spy();
        eventDispatcher.dispatchEvent(eventObj, callback);
        sinon.assert.notCalled(callback);
      });
    });

    it('does not throw in the event of an error', function() {
      var eventObj = {
        url: 'https://example',
        params: {},
        httpVerb: 'POST',
      };

      var callback = sinon.spy();
      eventDispatcher.dispatchEvent(eventObj, callback);
      sinon.assert.notCalled(callback);
    });
  });
});
