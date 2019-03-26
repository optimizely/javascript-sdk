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
  describe('dispatchEvent', function() {
    afterEach(function() {
      nock.cleanAll();
    });

    describe('when POST returns 200', function() {
      beforeEach(function() {
        nock('https://cdn.com')
          .post('/event')
          .reply(200, {
            ok: true,
          });
      });

      it('should send a POST and callback invoked with success=true', function(done) {
        var eventObj = {
          url: 'https://cdn.com/event',
          params: {
            id: 123,
          },
          httpVerb: 'POST',
        };

        eventDispatcher.dispatchEvent(eventObj, function(success) {
          assert.isTrue(success);
          done();
        });
      });
    });

    describe('when POST returns 204', function() {
      beforeEach(function() {
        nock('https://cdn.com')
          .post('/event')
          .reply(204, {
            ok: true,
          });
      });

      it('should send a POST and callback invoked with success=true', function(done) {
        var eventObj = {
          url: 'https://cdn.com/event',
          params: {
            id: 123,
          },
          httpVerb: 'POST',
        };

        eventDispatcher.dispatchEvent(eventObj, function(success) {
          assert.isTrue(success);
          done();
        });
      });
    });

    describe('when POST returns 400', function() {
      beforeEach(function() {
        nock('https://cdn.com')
          .post('/event')
          .reply(400, {
            ok: false,
          });
      });

      it('should send a POST and callback invoked with success=false', function(done) {
        var eventObj = {
          url: 'https://cdn.com/event',
          params: {
            id: 123,
          },
          httpVerb: 'POST',
        };

        eventDispatcher.dispatchEvent(eventObj, function(success) {
          assert.isFalse(success);
          done();
        });
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
