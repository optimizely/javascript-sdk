/****************************************************************************
 * Copyright 2018, 2020-2021, Optimizely, Inc. and contributors                  *
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
import sinon from 'sinon';
import { assert } from 'chai';

import * as conditionTreeEvaluator from './';

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
        assert.isTrue(
          conditionTreeEvaluator.evaluate(conditionA, function() {
            return true;
          })
        );
      });

      it('should return false for a leaf condition when the leaf condition evaluator returns false', function() {
        assert.isFalse(
          conditionTreeEvaluator.evaluate(conditionA, function() {
            return false;
          })
        );
      });

      describe('and evaluation', function() {
        it('should return true when ALL conditions evaluate to true', function() {
          assert.isTrue(
            conditionTreeEvaluator.evaluate(['and', conditionA, conditionB], function() {
              return true;
            })
          );
        });

        it('should return false if one condition evaluates to false', function() {
          var leafEvaluator = sinon.stub();
          leafEvaluator.onCall(0).returns(true);
          leafEvaluator.onCall(1).returns(false);
          assert.isFalse(conditionTreeEvaluator.evaluate(['and', conditionA, conditionB], leafEvaluator));
        });

        describe('null handling', function() {
          it('should return null when all operands evaluate to null', function() {
            assert.isNull(
              conditionTreeEvaluator.evaluate(['and', conditionA, conditionB], function() {
                return null;
              })
            );
          });

          it('should return null when operands evaluate to trues and nulls', function() {
            var leafEvaluator = sinon.stub();
            leafEvaluator.onCall(0).returns(true);
            leafEvaluator.onCall(1).returns(null);
            assert.isNull(conditionTreeEvaluator.evaluate(['and', conditionA, conditionB], leafEvaluator));
          });

          it('should return false when operands evaluate to falses and nulls', function() {
            var leafEvaluator = sinon.stub();
            leafEvaluator.onCall(0).returns(false);
            leafEvaluator.onCall(1).returns(null);
            assert.isFalse(conditionTreeEvaluator.evaluate(['and', conditionA, conditionB], leafEvaluator));

            leafEvaluator.reset();
            leafEvaluator.onCall(0).returns(null);
            leafEvaluator.onCall(1).returns(false);
            assert.isFalse(conditionTreeEvaluator.evaluate(['and', conditionA, conditionB], leafEvaluator));
          });

          it('should return false when operands evaluate to trues, falses, and nulls', function() {
            var leafEvaluator = sinon.stub();
            leafEvaluator.onCall(0).returns(true);
            leafEvaluator.onCall(1).returns(false);
            leafEvaluator.onCall(2).returns(null);
            assert.isFalse(conditionTreeEvaluator.evaluate(['and', conditionA, conditionB, conditionC], leafEvaluator));
          });
        });
      });

      describe('or evaluation', function() {
        it('should return true if any condition evaluates to true', function() {
          var leafEvaluator = sinon.stub();
          leafEvaluator.onCall(0).returns(false);
          leafEvaluator.onCall(1).returns(true);
          assert.isTrue(conditionTreeEvaluator.evaluate(['or', conditionA, conditionB], leafEvaluator));
        });

        it('should return false if all conditions evaluate to false', function() {
          assert.isFalse(
            conditionTreeEvaluator.evaluate(['or', conditionA, conditionB], function() {
              return false;
            })
          );
        });

        describe('null handling', function() {
          it('should return null when all operands evaluate to null', function() {
            assert.isNull(
              conditionTreeEvaluator.evaluate(['or', conditionA, conditionB], function() {
                return null;
              })
            );
          });

          it('should return true when operands evaluate to trues and nulls', function() {
            var leafEvaluator = sinon.stub();
            leafEvaluator.onCall(0).returns(true);
            leafEvaluator.onCall(1).returns(null);
            assert.isTrue(conditionTreeEvaluator.evaluate(['or', conditionA, conditionB], leafEvaluator));
          });

          it('should return null when operands evaluate to falses and nulls', function() {
            var leafEvaluator = sinon.stub();
            leafEvaluator.onCall(0).returns(null);
            leafEvaluator.onCall(1).returns(false);
            assert.isNull(conditionTreeEvaluator.evaluate(['or', conditionA, conditionB], leafEvaluator));

            leafEvaluator.reset();
            leafEvaluator.onCall(0).returns(false);
            leafEvaluator.onCall(1).returns(null);
            assert.isNull(conditionTreeEvaluator.evaluate(['or', conditionA, conditionB], leafEvaluator));
          });

          it('should return true when operands evaluate to trues, falses, and nulls', function() {
            var leafEvaluator = sinon.stub();
            leafEvaluator.onCall(0).returns(true);
            leafEvaluator.onCall(1).returns(null);
            leafEvaluator.onCall(2).returns(false);
            assert.isTrue(conditionTreeEvaluator.evaluate(['or', conditionA, conditionB, conditionC], leafEvaluator));
          });
        });
      });

      describe('not evaluation', function() {
        it('should return true if the condition evaluates to false', function() {
          assert.isTrue(
            conditionTreeEvaluator.evaluate(['not', conditionA], function() {
              return false;
            })
          );
        });

        it('should return false if the condition evaluates to true', function() {
          assert.isFalse(
            conditionTreeEvaluator.evaluate(['not', conditionB], function() {
              return true;
            })
          );
        });

        it('should return the result of negating the first condition, and ignore any additional conditions', function() {
          var result = conditionTreeEvaluator.evaluate(['not', '1', '2', '1'], function(id) {
            return id === '1';
          });
          assert.isFalse(result);
          result = conditionTreeEvaluator.evaluate(['not', '1', '2', '1'], function(id) {
            return id === '2';
          });
          assert.isTrue(result);
          result = conditionTreeEvaluator.evaluate(['not', '1', '2', '3'], function(id) {
            return id === '1' ? null : id === '3';
          });
          assert.isNull(result);
        });

        describe('null handling', function() {
          it('should return null when operand evaluates to null', function() {
            assert.isNull(
              conditionTreeEvaluator.evaluate(['not', conditionA], function() {
                return null;
              })
            );
          });

          it('should return null when there are no operands', function() {
            assert.isNull(
              conditionTreeEvaluator.evaluate(['not'], function() {
                return null;
              })
            );
          });
        });
      });

      describe('implicit operator', function() {
        it('should behave like an "or" operator when the first item in the array is not a recognized operator', function() {
          var leafEvaluator = sinon.stub();
          leafEvaluator.onCall(0).returns(true);
          leafEvaluator.onCall(1).returns(false);
          assert.isTrue(conditionTreeEvaluator.evaluate([conditionA, conditionB], leafEvaluator));
          assert.isFalse(
            conditionTreeEvaluator.evaluate([conditionA, conditionB], function() {
              return false;
            })
          );
        });
      });
    });
  });
});
