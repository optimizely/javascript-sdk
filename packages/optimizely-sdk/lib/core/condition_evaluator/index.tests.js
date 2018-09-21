/**
 * Copyright 2016, 2018, Optimizely
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
var conditionEvaluator = require('./');

var browserConditionSafari = {'name': 'browser_type', 'value': 'safari'};
var deviceConditionIphone = {'name': 'device_model', 'value': 'iphone6'};
var booleanCondition = {'name': 'is_firefox', 'value': true};
var integerCondition = {'name': 'num_users', 'value': 10};
var doubleCondition = {'name': 'pi_value', 'value': 3.14};
var exactSafariCondition = {
  name: 'browser_type',
  match: 'exact',
  type: 'custom_attribute',
  value: 'safari',
};
var exactIphoneCondition = {
  name: 'device_model',
  match: 'exact',
  type: 'custom_attribute',
  value: 'iphone6',
};
var exactLocationCondition = {
  name: 'location',
  match: 'exact',
  type: 'custom_attribute',
  value: 'CA',
};


describe('lib/core/condition_evaluator', function() {
  describe('APIs', function() {
    describe('evaluate', function() {
      it('should return true there is a match', function() {
        var userAttributes = {
          browser_type: 'safari',
        };

        assert.isTrue(conditionEvaluator.evaluate(['and', browserConditionSafari], userAttributes));
      });

      it('should return false when there is no match', function() {
        var userAttributes = {
          browser_type: 'firefox',
        };

        assert.isFalse(conditionEvaluator.evaluate(['and', browserConditionSafari], userAttributes));
      });

      it('should evaluate different typed attributes', function() {
        var userAttributes = {
          browser_type: 'safari',
          is_firefox: true,
          num_users: 10,
          pi_value: 3.14,
        };

        assert.isTrue(conditionEvaluator.evaluate(['and', browserConditionSafari, booleanCondition, integerCondition, doubleCondition], userAttributes));
      });

      it('should return null when condition has an invalid type property', function() {
        var result = conditionEvaluator.evaluate(
          ['and', { match: 'exact', name: 'weird_condition', type: 'weird', value: 'hi' }],
          { weird_condition: 'bye' }
        );
        assert.isNull(result);
      });

      it('should return null when condition has an invalid match property', function() {
        var result = conditionEvaluator.evaluate(
          ['and', { match: 'weird', name: 'weird_condition', type: 'custom_attribute', value: 'hi' }],
          { weird_condition: 'bye' }
        );
        assert.isNull(result);
      });

      describe('and evaluation', function() {
        it('should return true when ALL conditions evaluate to true', function() {
          var userAttributes = {
            'browser_type': 'safari',
            'device_model': 'iphone6',
          };

          assert.isTrue(conditionEvaluator.evaluate(['and', browserConditionSafari, deviceConditionIphone], userAttributes));
        });

        it('should return false if one condition evaluates to false', function() {
          var userAttributes = {
            'browser_type': 'safari',
            'device_model': 'nexus7',
          };

          assert.isFalse(conditionEvaluator.evaluate(['and', browserConditionSafari, deviceConditionIphone], userAttributes));
        });

        describe('null handling', function() {
          it('should return null when all operands evaluate to null', function() {
            var userAttributes = {
              browser_type: 4.5,
              device_model: false,
            };
            assert.isNull(conditionEvaluator.evaluate(['and', exactSafariCondition, exactIphoneCondition], userAttributes));
          });

          it('should return null when operands evaluate to trues and nulls', function() {
            var userAttributes = {
              browser_type: 'safari',
              device_model: false,
            };
            assert.isNull(conditionEvaluator.evaluate(['and', exactSafariCondition, exactIphoneCondition], userAttributes));
          });

          it('should return false when operands evaluate to falses and nulls', function() {
            var userAttributes = {
              browser_type: 'firefox',
              device_model: false,
            };
            assert.isFalse(conditionEvaluator.evaluate(['and', exactSafariCondition, exactIphoneCondition], userAttributes));
          });

          it('should return false when operands evaluate to trues, falses, and nulls', function() {
            var userAttributes = {
              browser_type: 'safari',
              device_model: false,
              location: 'NY',
            };
            assert.isFalse(conditionEvaluator.evaluate(['and', exactSafariCondition, exactIphoneCondition, exactLocationCondition], userAttributes));
          });
        });
      });

      describe('or evaluation', function() {
        it('should return true if any condition evaluates to true', function() {
          var userAttributes = {
            'browser_type': 'safari',
            'device_model': 'nexus5',
          };

          assert.isTrue(conditionEvaluator.evaluate(['or', browserConditionSafari, deviceConditionIphone], userAttributes));
        });

        it('should return false if all conditions evaluate to false', function() {
          var userAttributes = {
            'browser_type': 'chrome',
            'device_model': 'nexus6',
          };

          assert.isFalse(conditionEvaluator.evaluate(['or', browserConditionSafari, deviceConditionIphone], userAttributes));
        });

        describe('null handling', function() {
          it('should return null when all operands evaluate to null', function() {
            var userAttributes = {
              browser_type: 4.5,
              device_model: false,
            };
            assert.isNull(conditionEvaluator.evaluate(['or', exactSafariCondition, exactIphoneCondition], userAttributes));
          });

          it('should return true when operands evaluate to trues and nulls', function() {
            var userAttributes = {
              browser_type: 'safari',
              device_model: false,
            };
            assert.isTrue(conditionEvaluator.evaluate(['or', exactSafariCondition, exactIphoneCondition], userAttributes));
          });

          it('should return null when operands evaluate to falses and nulls', function() {
            var userAttributes = {
              browser_type: 'firefox',
              device_model: false,
            };
            assert.isNull(conditionEvaluator.evaluate(['or', exactSafariCondition, exactIphoneCondition], userAttributes));
          });

          it('should return true when operands evaluate to trues, falses, and nulls', function() {
            var userAttributes = {
              browser_type: 'safari',
              device_model: false,
              location: 'NY',
            };
            assert.isTrue(conditionEvaluator.evaluate(['or', exactSafariCondition, exactIphoneCondition, exactLocationCondition], userAttributes));
          });
        });
      });

      describe('not evaluation', function() {
        it('should return true if the condition evaluates to false', function() {
          var userAttributes = {
            'browser_type': 'chrome',
          };

          assert.isTrue(conditionEvaluator.evaluate(['not', browserConditionSafari], userAttributes));
        });

        it('should return false if the condition evaluates to true', function() {
          var userAttributes = {
            'device_model': 'iphone6',
          };

          assert.isFalse(conditionEvaluator.evaluate(['not', deviceConditionIphone], userAttributes));
        });

        describe('null handling', function() {
          it('should return null when operand evaluates to null', function() {
            var userAttributes = {
              browser_type: 4.5,
            };
            assert.isNull(conditionEvaluator.evaluate(['not', exactSafariCondition], userAttributes));
          });
        });
      });

      describe('implicit operator', function() {
        it('should behave like an "or" operator when the first item in the array is not a recognized operator', function() {
          var userAttributes = {
            browser_type: 'safari',
            device_model: 'nexus5',
          };
          assert.isTrue(conditionEvaluator.evaluate([browserConditionSafari, deviceConditionIphone], userAttributes));
          userAttributes = {
            browser_type: 'chrome',
            device_model: 'nexus6',
          };
          assert.isFalse(conditionEvaluator.evaluate([browserConditionSafari, deviceConditionIphone], userAttributes));
        });
      });

      describe('exists match type', function() {
        var existsConditions = ['and', {
          match: 'exists',
          name: 'input_value',
          type: 'custom_attribute',
        }];

        it('should return false if there is no user-provided value', function() {
          var result = conditionEvaluator.evaluate(existsConditions, {});
          assert.isFalse(result);
        });

        it('should return false if the user-provided value is undefined', function() {
          var result = conditionEvaluator.evaluate(existsConditions, { input_value: undefined });
          assert.isFalse(result);
        });

        it('should return false if the user-provided value is null', function() {
          var result = conditionEvaluator.evaluate(existsConditions, { input_value: null });
          assert.isFalse(result);
        });

        it('should return true if the user-provided value is a string', function() {
          var result = conditionEvaluator.evaluate(existsConditions, { input_value: 'hi' });
          assert.isTrue(result);
        });

        it('should return true if the user-provided value is a number', function() {
          var result = conditionEvaluator.evaluate(existsConditions, { input_value: 10 });
          assert.isTrue(result);
        });

        it('should return true if the user-provided value is a boolean', function() {
          var result = conditionEvaluator.evaluate(existsConditions, { input_value: true });
          assert.isTrue(result);
        });
      });

      describe('exact match type', function() {
        describe('with a string condition value', function() {
          var exactStringConditions = ['and', {
            match: 'exact',
            name: 'favorite_constellation',
            type: 'custom_attribute',
            value: 'Lacerta',
          }];

          it('should return true if the user-provided value is equal to the condition value', function() {
            var result = conditionEvaluator.evaluate(exactStringConditions, { favorite_constellation: 'Lacerta' });
            assert.isTrue(result);
          });

          it('should return false if the user-provided value is not equal to the condition value', function() {
            var result = conditionEvaluator.evaluate(exactStringConditions, { favorite_constellation: 'The Big Dipper' });
            assert.isFalse(result);
          });

          it('should return null if the user-provided value is of a different type than the condition value', function() {
            var result = conditionEvaluator.evaluate(exactStringConditions, { favorite_constellation: false });
            assert.isNull(result);
          });

          it('should return null if there is no user-provided value', function() {
            var result = conditionEvaluator.evaluate(exactStringConditions, {});
            assert.isNull(result);
          });
        });

        describe('with a number condition value', function() {
          var exactNumberConditions = ['and', {
            match: 'exact',
            name: 'lasers_count',
            type: 'custom_attribute',
            value: 9000,
          }];

          it('should return true if the user-provided value is equal to the condition value', function() {
            var result = conditionEvaluator.evaluate(exactNumberConditions, { lasers_count: 9000 });
            assert.isTrue(result);
          });

          it('should return false if the user-provided value is not equal to the condition value', function() {
            var result = conditionEvaluator.evaluate(exactNumberConditions, { lasers_count: 8000 });
            assert.isFalse(result);
          });

          it('should return null if the user-provided value is of a different type than the condition value', function() {
            var result = conditionEvaluator.evaluate(exactNumberConditions, { lasers_count: 'yes' });
            assert.isNull(result);
          });

          it('should return null if there is no user-provided value', function() {
            var result = conditionEvaluator.evaluate(exactNumberConditions, {});
            assert.isNull(result);
          });
        });

        describe('with a boolean condition value', function() {
          var boolExactConditions = ['and', {
            match: 'exact',
            name: 'did_register_user',
            type: 'custom_attribute',
            value: false,
          }];

          it('should return true if the user-provided value is equal to the condition value', function() {
            var result = conditionEvaluator.evaluate(boolExactConditions, { did_register_user: false });
            assert.isTrue(result);
          });

          it('should return false if the user-provided value is not equal to the condition value', function() {
            var result = conditionEvaluator.evaluate(boolExactConditions, { did_register_user: true });
            assert.isFalse(result);
          });

          it('should return null if the user-provided value is of a different type than the condition value', function() {
            var result = conditionEvaluator.evaluate(boolExactConditions, { did_register_user: 10 });
            assert.isNull(result);
          });

          it('should return null if there is no user-provided value', function() {
            var result = conditionEvaluator.evaluate(boolExactConditions, {});
            assert.isNull(result);
          });
        });
      });

      describe('substring match type', function() {
        var substringConditions = ['and', {
          match: 'substring',
          name: 'headline_text',
          type: 'custom_attribute',
          value: 'buy now',
        }];

        it('should return true if the condition value is a substring of the user-provided value', function() {
          var result = conditionEvaluator.evaluate(substringConditions, {
            headline_text: 'Limited time, buy now!',
          });
          assert.isTrue(result);
        });

        it('should return false if the user-provided value is not a substring of the condition value', function() {
          var result = conditionEvaluator.evaluate(substringConditions, {
            headline_text: 'Breaking news!',
          });
          assert.isFalse(result);
        });

        it('should return null if the user-provided value is not a string', function() {
          var result = conditionEvaluator.evaluate(substringConditions, {
            headline_text: 10,
          });
          assert.isNull(result);
        });

        it('should return null if there is no user-provided value', function() {
          var result = conditionEvaluator.evaluate(substringConditions, {});
          assert.isNull(result);
        });
      });

      describe('greater than match type', function() {
        var gtConditions = ['and', {
          match: 'gt',
          name: 'meters_travelled',
          type: 'custom_attribute',
          value: 48.2,
        }];

        it('should return true if the user-provided value is greater than the condition value', function() {
          var result = conditionEvaluator.evaluate(gtConditions, {
            meters_travelled: 58.4,
          });
          assert.isTrue(result);
        });

        it('should return false if the user-provided value is not greater than the condition value', function() {
          var result = conditionEvaluator.evaluate(gtConditions, {
            meters_travelled: 20,
          });
          assert.isFalse(result);
        });

        it('should return null if the user-provided value is not a number', function() {
          var result = conditionEvaluator.evaluate(gtConditions, {
            meters_travelled: 'a long way',
          });
          assert.isNull(result);
        });

        it('should return null if there is no user-provided value', function() {
          var result = conditionEvaluator.evaluate(gtConditions, {});
          assert.isNull(result);
        });
      });

      describe('less than match type', function() {
        var ltConditions = ['and', {
          match: 'lt',
          name: 'meters_travelled',
          type: 'custom_attribute',
          value: 48.2,
        }];

        it('should return true if the user-provided value is less than the condition value', function() {
          var result = conditionEvaluator.evaluate(ltConditions, {
            meters_travelled: 10,
          });
          assert.isTrue(result);
        });

        it('should return false if the user-provided value is not less than the condition value', function() {
          var result = conditionEvaluator.evaluate(ltConditions, {
            meters_travelled: 64.64,
          });
          assert.isFalse(result);
        });

        it('should return null if the user-provided value is not a number', function() {
          var result = conditionEvaluator.evaluate(ltConditions, {
            meters_travelled: true,
          });
          assert.isNull(result);
        });

        it('should return null if there is no user-provided value', function() {
          var result = conditionEvaluator.evaluate(ltConditions, {});
          assert.isNull(result);
        });
      });
    });
  });
});
