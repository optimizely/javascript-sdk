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

var chai = require('chai');
var assert = chai.assert;
var fns = require('./');

describe('lib/utils/fns', function() {
  describe('APIs', function() {
    describe('isFinite', function() {
      it('should return false for invalid numbers', function() {
        assert.isFalse(fns.isFinite(Infinity));
        assert.isFalse(fns.isFinite(-Infinity));
        assert.isFalse(fns.isFinite(NaN));
        assert.isFalse(fns.isFinite(Math.pow(2, 53) + 2));
        assert.isFalse(fns.isFinite(-Math.pow(2, 53) - 2));
      });

      it('should return true for valid numbers', function() {
        assert.isTrue(fns.isFinite(0));
        assert.isTrue(fns.isFinite(10));
        assert.isTrue(fns.isFinite(10.5));
        assert.isTrue(fns.isFinite(Math.pow(2, 53)));
        assert.isTrue(fns.isFinite(-Math.pow(2, 53)));
      });
    });
    
    describe('forOwn', function() {
      it('should return early if false is returned', function() {
        var obj = {
          prop1: 'prop1',
          prop2: 'prop2',
          prop3: 'prop3',
          prop4: 'prop4'
        }
        var calledCount = 0;
        fns.forOwn(obj, function(val) {
          calledCount ++;
          if (val === 'prop3') {
            return false;
          }
        });
        assert.equal(calledCount, 3);
      });

      it('should not crash when first argument is null or undefined', function() {
        fns.forOwn(null, function() {});
        fns.forOwn(undefined, function() {});
      });
    });
  });
});