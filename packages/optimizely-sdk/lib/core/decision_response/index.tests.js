/****************************************************************************
 * Copyright 2021, Optimizely, Inc. and contributors                   *
 *                                                                          *
 * Licensed under the Apache License, Version 2.0 (the "License");          *
 * you may not use this file except in compliance with the License.         *
 * You may obtain a copy of the License at                                  *
 *                                                                          *
 *    http://www.apache.org/licenses/LICENSE-2.0                            *
 *                                                                          *
 * Unless required by applicable law or agreed to in writing, software      *
 * distributed under the License is distributed on an "AS IS" BASIS,        *
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. *
 * See the License for the specific language governing permissions and      *
 * limitations under the License.                                           *
 ***************************************************************************/
import { assert } from 'chai';
import DecisionResponse from './';

describe('lib/core/decision_response', function() {
  var decisionResponse;
  describe('#getResult', function() {
    it('should create decision response and return null when result null provided', function() {
      decisionResponse = new DecisionResponse(null, []);
      assert.deepEqual(decisionResponse.getResult(), null);
    });
    it('should create decision response when and return result', function() {
      var variation = 'variation';
      decisionResponse = new DecisionResponse(variation, []);
      assert.deepEqual(decisionResponse.getResult(), variation);
    });
  });

  describe('#getReasons', function() {
    it('should return reasons', function() {
      var reasons = [ 'reason1', 'reason2' ];
      decisionResponse = new DecisionResponse(null, reasons);
      assert.deepEqual(decisionResponse.getReasons(), reasons);
    });
  });
});
