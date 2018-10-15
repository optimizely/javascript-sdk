/****************************************************************************
 * Copyright 2016, 2018, Optimizely, Inc. and contributors                  *
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

var chai = require('chai');
var sinon = require('sinon');
var assert = chai.assert;
var conditionEvaluator = require('./');

var conditionA = {
  name: 'browser_type',
  value: 'safari',
  type: 'custom_attribute',
};
var conditionB = {
  name: 'device_model',
  value: 'iphone6',
  type: 'custom_attribute',
};
var conditionC = {
  name: 'location',
  match: 'exact',
  type: 'custom_attribute',
  value: 'CA',
};

describe('lib/core/condition_tree_evaluator', function() {
  describe('APIs', function() {
    describe('evaluate', function() {
      it('should return true for a leaf condition when the leaf condition evaluator returns true', function() {
        assert.isTrue(conditionEvaluator.evaluate(conditionA, function() { return true; }));
      });

      it('should return false for a leaf condition when the leaf condition evaluator returns false', function() {
        assert.isFalse(conditionEvaluator.evaluate(conditionA, function() { return false; }));
      });

      describe('and evaluation', function() {
        it('should return true when ALL conditions evaluate to true', function() {
          assert.isTrue(conditionEvaluator.evaluate(
            ['and', conditionA, conditionB],
            function() { return true; }
          ));
        });

        it('should return false if one condition evaluates to false', function() {
          var leafEvaluator = sinon.stub();
          leafEvaluator.onCall(0).returns(true);
          leafEvaluator.onCall(1).returns(false);
          assert.isFalse(conditionEvaluator.evaluate(
            ['and', conditionA, conditionB],
            leafEvaluator
          ));
        });

        describe('null handling', function() {
          it('should return null when all operands evaluate to null', function() {
            assert.isNull(conditionEvaluator.evaluate(
              ['and', conditionA, conditionB],
              function() { return null; }
            ));
          });

          it('should return null when operands evaluate to trues and nulls', function() {
            var leafEvaluator = sinon.stub();
            leafEvaluator.onCall(0).returns(true);
            leafEvaluator.onCall(1).returns(null);
            assert.isNull(conditionEvaluator.evaluate(
              ['and', conditionA, conditionB],
              leafEvaluator
            ));
          });

          it('should return false when operands evaluate to falses and nulls', function() {
            var leafEvaluator = sinon.stub();
            leafEvaluator.onCall(0).returns(false);
            leafEvaluator.onCall(1).returns(null);
            assert.isFalse(conditionEvaluator.evaluate(
              ['and', conditionA, conditionB],
              leafEvaluator
            ));
          });

          it('should return false when operands evaluate to trues, falses, and nulls', function() {
            var leafEvaluator = sinon.stub();
            leafEvaluator.onCall(0).returns(true);
            leafEvaluator.onCall(1).returns(false);
            leafEvaluator.onCall(2).returns(null);
            assert.isFalse(conditionEvaluator.evaluate(
              ['and', conditionA, conditionB, conditionC],
              leafEvaluator
            ));
          });
        });
      });

      describe('or evaluation', function() {
        it('should return true if any condition evaluates to true', function() {
          var leafEvaluator = sinon.stub();
          leafEvaluator.onCall(0).returns(false);
          leafEvaluator.onCall(1).returns(true);
          assert.isTrue(conditionEvaluator.evaluate(
            ['or', conditionA, conditionB],
            leafEvaluator
          ));
        });

        it('should return false if all conditions evaluate to false', function() {
          assert.isFalse(conditionEvaluator.evaluate(
            ['or', conditionA, conditionB],
            function() { return false; }
          ));
        });

        describe('null handling', function() {
          it('should return null when all operands evaluate to null', function() {
            assert.isNull(conditionEvaluator.evaluate(
              ['or', conditionA, conditionB],
              function() { return null; }
            ));
          });

          it('should return true when operands evaluate to trues and nulls', function() {
            var leafEvaluator = sinon.stub();
            leafEvaluator.onCall(0).returns(true);
            leafEvaluator.onCall(1).returns(null);
            assert.isTrue(conditionEvaluator.evaluate(
              ['or', conditionA, conditionB],
              leafEvaluator
            ));
          });

          it('should return null when operands evaluate to falses and nulls', function() {
            var leafEvaluator = sinon.stub();
            leafEvaluator.onCall(0).returns(null);
            leafEvaluator.onCall(1).returns(false);
            assert.isNull(conditionEvaluator.evaluate(
              ['or', conditionA, conditionB],
              leafEvaluator
            ));
          });

          it('should return true when operands evaluate to trues, falses, and nulls', function() {
            var leafEvaluator = sinon.stub();
            leafEvaluator.onCall(0).returns(true);
            leafEvaluator.onCall(1).returns(null);
            leafEvaluator.onCall(2).returns(false);
            assert.isTrue(conditionEvaluator.evaluate(
              ['or', conditionA, conditionB, conditionC],
              leafEvaluator
            ));
          });
        });
      });

      describe('not evaluation', function() {
        it('should return true if the condition evaluates to false', function() {
          assert.isTrue(conditionEvaluator.evaluate(['not', conditionA], function() { return false; }));
        });

        it('should return false if the condition evaluates to true', function() {
          assert.isFalse(conditionEvaluator.evaluate(['not', conditionB], function() { return true; }));
        });

        describe('null handling', function() {
          it('should return null when operand evaluates to null', function() {
            assert.isNull(conditionEvaluator.evaluate(['not', conditionA], function() { return null; }));
          });
        });
      });

      describe('implicit operator', function() {
        it('should behave like an "or" operator when the first item in the array is not a recognized operator', function() {
          var leafEvaluator = sinon.stub();
          leafEvaluator.onCall(0).returns(true);
          leafEvaluator.onCall(1).returns(false);
          assert.isTrue(conditionEvaluator.evaluate(
            [conditionA, conditionB],
            leafEvaluator
          ));
          assert.isFalse(conditionEvaluator.evaluate(
            [conditionA, conditionB],
            function() { return false; }
          ));
        });
      });
    });
  });
});
