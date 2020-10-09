/**
 * Copyright 2019-2020 Optimizely
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
import { assert } from 'chai';

import fns from './';

describe('lib/utils/fns', function() {
  describe('APIs', function() {
    describe('isFinite', function() {
      it('should return false for invalid numbers', function() {
        assert.isFalse(fns.isSafeInteger(Infinity));
        assert.isFalse(fns.isSafeInteger(-Infinity));
        assert.isFalse(fns.isSafeInteger(NaN));
        assert.isFalse(fns.isSafeInteger(undefined));
        assert.isFalse(fns.isSafeInteger('3'));
        assert.isFalse(fns.isSafeInteger(Math.pow(2, 53) + 2));
        assert.isFalse(fns.isSafeInteger(-Math.pow(2, 53) - 2));
      });

      it('should return true for valid numbers', function() {
        assert.isTrue(fns.isSafeInteger(0));
        assert.isTrue(fns.isSafeInteger(10));
        assert.isTrue(fns.isSafeInteger(10.5));
        assert.isTrue(fns.isSafeInteger(Math.pow(2, 53)));
        assert.isTrue(fns.isSafeInteger(-Math.pow(2, 53)));
      });
    });

    describe('keyBy', function() {
      it('should return correct object when a key is provided', function() {
        var arr = [
          { key1: 'row1', key2: 'key2row1' },
          { key1: 'row2', key2: 'key2row2' },
          { key1: 'row3', key2: 'key2row3' },
          { key1: 'row4', key2: 'key2row4' },
        ];

        var obj = fns.keyBy(arr, 'key1');

        assert.deepEqual(obj, {
          row1: { key1: 'row1', key2: 'key2row1' },
          row2: { key1: 'row2', key2: 'key2row2' },
          row3: { key1: 'row3', key2: 'key2row3' },
          row4: { key1: 'row4', key2: 'key2row4' },
        });
      });

      it('should return empty object when first argument is null or undefined', function() {
        var obj = fns.keyBy(null, 'key1');
        assert.isEmpty(obj);

        obj = fns.keyBy(undefined, 'key1');
        assert.isEmpty(obj);
      });
    });

    describe('isNumber', function() {
      it('should return true in case of number', function() {
        assert.isTrue(fns.isNumber(3));
      });
      it('should return true in case of value from Number object ', function() {
        assert.isTrue(fns.isNumber(Number.MIN_VALUE));
      });
      it('should return true in case of Infinity ', function() {
        assert.isTrue(fns.isNumber(Infinity));
      });
      it('should return false in case of string', function() {
        assert.isFalse(fns.isNumber('3'));
      });
      it('should return false in case of null', function() {
        assert.isFalse(fns.isNumber(null));
      });
    });
  });
});
