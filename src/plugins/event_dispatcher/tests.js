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
import { dispatchEvent } from './'
import chai from 'chai'
import sinon from 'sinon'

const assert = chai.assert

describe('src/plugins/event_dispatcher', function() {
  describe('APIs', function() {
    describe('dispatchEvent', function() {
      var xhr;
      var requests;
      beforeEach(function() {
        xhr = sinon.useFakeXMLHttpRequest();
        global.XMLHttpRequest = xhr;
        requests = [];
        xhr.onCreate = function (xhr) {
            requests.push(xhr);
        };
      });

      afterEach(function() {
        xhr.restore();
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

        var callback = sinon.spy();
        dispatchEvent(eventObj, callback);
        assert.strictEqual(1, requests.length);
        assert.strictEqual(requests[0].method, 'POST');
        assert.strictEqual(requests[0].requestBody, JSON.stringify(eventParams));
        done();
      });

      it('should execute the callback passed to event dispatcher with a post', function(done) {
        var eventParams = {'testParam': 'testParamValue'};
        var eventObj = {
          url: 'https://cdn.com/event',
          body: {
            id: 123,
          },
          httpVerb: 'POST',
          params: eventParams
        };

        var callback = sinon.spy();
        dispatchEvent(eventObj, callback);
        requests[ 0 ].respond([ 200, {}, '{"url":"https://cdn.com/event","body":{"id":123},"httpVerb":"POST","params":{"testParam":"testParamValue"}}' ]);
        sinon.assert.calledOnce(callback);
        done();
      });

      it('should execute the callback passed to event dispatcher with a get', function(done) {
        var eventObj = {
          url: 'https://cdn.com/event',
          httpVerb: 'GET'
        };

        var callback = sinon.spy();
        dispatchEvent(eventObj, callback);
        requests[ 0 ].respond([ 200, {}, '{"url":"https://cdn.com/event","httpVerb":"GET"' ]);
        sinon.assert.calledOnce(callback);
        done();
      });

    });
  });
});
