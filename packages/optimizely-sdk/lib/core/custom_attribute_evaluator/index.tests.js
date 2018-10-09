/****************************************************************************
 * Copyright 2018, Optimizely, Inc. and contributors                        *
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
var customAttributeEvaluator = require('./');

var assert = chai.assert;

var browserConditionSafari = {
  name: 'browser_type',
  value: 'safari',
  type: 'custom_attribute',
};
var booleanCondition = {
  name: 'is_firefox',
  value: true,
  type: 'custom_attribute',
};
var integerCondition = {
  name: 'num_users',
  value: 10,
  type: 'custom_attribute',
};
var doubleCondition = {
  name: 'pi_value',
  value: 3.14,
  type: 'custom_attribute',
};

describe('lib/core/custom_attribute_evaluator', function() {
  it('should return true there is a match', function() {
    var userAttributes = {
      browser_type: 'safari',
    };

    assert.isTrue(customAttributeEvaluator.evaluate(browserConditionSafari, userAttributes));
  });

  it('should return false when there is no match', function() {
    var userAttributes = {
      browser_type: 'firefox',
    };

    assert.isFalse(customAttributeEvaluator.evaluate(browserConditionSafari, userAttributes));
  });

  it('should evaluate different typed attributes', function() {
    var userAttributes = {
      browser_type: 'safari',
      is_firefox: true,
      num_users: 10,
      pi_value: 3.14,
    };

    assert.isTrue(customAttributeEvaluator.evaluate(browserConditionSafari, userAttributes));
    assert.isTrue(customAttributeEvaluator.evaluate(booleanCondition, userAttributes));
    assert.isTrue(customAttributeEvaluator.evaluate(integerCondition, userAttributes));
    assert.isTrue(customAttributeEvaluator.evaluate(doubleCondition, userAttributes));
  });

  it('should return null when condition has an invalid type property', function() {
    var result = customAttributeEvaluator.evaluate(
      { match: 'exact', name: 'weird_condition', type: 'weird', value: 'hi' },
      { weird_condition: 'bye' }
    );
    assert.isNull(result);
  });

  it('should return null when condition has an invalid match property', function() {
    var result = customAttributeEvaluator.evaluate(
      { match: 'weird', name: 'weird_condition', type: 'custom_attribute', value: 'hi' },
      { weird_condition: 'bye' }
    );
    assert.isNull(result);
  });

  describe('exists match type', function() {
    var existsCondition = {
      match: 'exists',
      name: 'input_value',
      type: 'custom_attribute',
    };

    it('should return false if there is no user-provided value', function() {
      var result = customAttributeEvaluator.evaluate(existsCondition, {});
      assert.isFalse(result);
    });

    it('should return false if the user-provided value is undefined', function() {
      var result = customAttributeEvaluator.evaluate(existsCondition, { input_value: undefined });
      assert.isFalse(result);
    });

    it('should return false if the user-provided value is null', function() {
      var result = customAttributeEvaluator.evaluate(existsCondition, { input_value: null });
      assert.isFalse(result);
    });

    it('should return true if the user-provided value is a string', function() {
      var result = customAttributeEvaluator.evaluate(existsCondition, { input_value: 'hi' });
      assert.isTrue(result);
    });

    it('should return true if the user-provided value is a number', function() {
      var result = customAttributeEvaluator.evaluate(existsCondition, { input_value: 10 });
      assert.isTrue(result);
    });

    it('should return true if the user-provided value is a boolean', function() {
      var result = customAttributeEvaluator.evaluate(existsCondition, { input_value: true });
      assert.isTrue(result);
    });
  });

  describe('exact match type', function() {
    describe('with a string condition value', function() {
      var exactStringCondition = {
        match: 'exact',
        name: 'favorite_constellation',
        type: 'custom_attribute',
        value: 'Lacerta',
      };

      it('should return true if the user-provided value is equal to the condition value', function() {
        var result = customAttributeEvaluator.evaluate(exactStringCondition, { favorite_constellation: 'Lacerta' });
        assert.isTrue(result);
      });

      it('should return false if the user-provided value is not equal to the condition value', function() {
        var result = customAttributeEvaluator.evaluate(exactStringCondition, { favorite_constellation: 'The Big Dipper' });
        assert.isFalse(result);
      });

      it('should return null if the user-provided value is of a different type than the condition value', function() {
        var result = customAttributeEvaluator.evaluate(exactStringCondition, { favorite_constellation: false });
        assert.isNull(result);
      });

      it('should return null if there is no user-provided value', function() {
        var result = customAttributeEvaluator.evaluate(exactStringCondition, {});
        assert.isNull(result);
      });
    });

    describe('with a number condition value', function() {
      var exactNumberCondition = {
        match: 'exact',
        name: 'lasers_count',
        type: 'custom_attribute',
        value: 9000,
      };

      it('should return true if the user-provided value is equal to the condition value', function() {
        var result = customAttributeEvaluator.evaluate(exactNumberCondition, { lasers_count: 9000 });
        assert.isTrue(result);
      });

      it('should return false if the user-provided value is not equal to the condition value', function() {
        var result = customAttributeEvaluator.evaluate(exactNumberCondition, { lasers_count: 8000 });
        assert.isFalse(result);
      });

      it('should return null if the user-provided value is of a different type than the condition value', function() {
        var result = customAttributeEvaluator.evaluate(exactNumberCondition, { lasers_count: 'yes' });
        assert.isNull(result);
      });

      it('should return null if there is no user-provided value', function() {
        var result = customAttributeEvaluator.evaluate(exactNumberCondition, {});
        assert.isNull(result);
      });
    });

    describe('with a boolean condition value', function() {
      var exactBoolCondition = {
        match: 'exact',
        name: 'did_register_user',
        type: 'custom_attribute',
        value: false,
      };

      it('should return true if the user-provided value is equal to the condition value', function() {
        var result = customAttributeEvaluator.evaluate(exactBoolCondition, { did_register_user: false });
        assert.isTrue(result);
      });

      it('should return false if the user-provided value is not equal to the condition value', function() {
        var result = customAttributeEvaluator.evaluate(exactBoolCondition, { did_register_user: true });
        assert.isFalse(result);
      });

      it('should return null if the user-provided value is of a different type than the condition value', function() {
        var result = customAttributeEvaluator.evaluate(exactBoolCondition, { did_register_user: 10 });
        assert.isNull(result);
      });

      it('should return null if there is no user-provided value', function() {
        var result = customAttributeEvaluator.evaluate(exactBoolCondition, {});
        assert.isNull(result);
      });
    });
  });

  describe('substring match type', function() {
    var substringCondition = {
      match: 'substring',
      name: 'headline_text',
      type: 'custom_attribute',
      value: 'buy now',
    };

    it('should return true if the condition value is a substring of the user-provided value', function() {
      var result = customAttributeEvaluator.evaluate(substringCondition, {
        headline_text: 'Limited time, buy now!',
      });
      assert.isTrue(result);
    });

    it('should return false if the user-provided value is not a substring of the condition value', function() {
      var result = customAttributeEvaluator.evaluate(substringCondition, {
        headline_text: 'Breaking news!',
      });
      assert.isFalse(result);
    });

    it('should return null if the user-provided value is not a string', function() {
      var result = customAttributeEvaluator.evaluate(substringCondition, {
        headline_text: 10,
      });
      assert.isNull(result);
    });

    it('should return null if there is no user-provided value', function() {
      var result = customAttributeEvaluator.evaluate(substringCondition, {});
      assert.isNull(result);
    });
  });

  describe('greater than match type', function() {
    var gtCondition = {
      match: 'gt',
      name: 'meters_travelled',
      type: 'custom_attribute',
      value: 48.2,
    };

    it('should return true if the user-provided value is greater than the condition value', function() {
      var result = customAttributeEvaluator.evaluate(gtCondition, {
        meters_travelled: 58.4,
      });
      assert.isTrue(result);
    });

    it('should return false if the user-provided value is not greater than the condition value', function() {
      var result = customAttributeEvaluator.evaluate(gtCondition, {
        meters_travelled: 20,
      });
      assert.isFalse(result);
    });

    it('should return null if the user-provided value is not a number', function() {
      var result = customAttributeEvaluator.evaluate(gtCondition, {
        meters_travelled: 'a long way',
      });
      assert.isNull(result);
    });

    it('should return null if there is no user-provided value', function() {
      var result = customAttributeEvaluator.evaluate(gtCondition, {});
      assert.isNull(result);
    });
  });

  describe('less than match type', function() {
    var ltCondition = {
      match: 'lt',
      name: 'meters_travelled',
      type: 'custom_attribute',
      value: 48.2,
    };

    it('should return true if the user-provided value is less than the condition value', function() {
      var result = customAttributeEvaluator.evaluate(ltCondition, {
        meters_travelled: 10,
      });
      assert.isTrue(result);
    });

    it('should return false if the user-provided value is not less than the condition value', function() {
      var result = customAttributeEvaluator.evaluate(ltCondition, {
        meters_travelled: 64.64,
      });
      assert.isFalse(result);
    });

    it('should return null if the user-provided value is not a number', function() {
      var result = customAttributeEvaluator.evaluate(ltCondition, {
        meters_travelled: true,
      });
      assert.isNull(result);
    });

    it('should return null if there is no user-provided value', function() {
      var result = customAttributeEvaluator.evaluate(ltCondition, {});
      assert.isNull(result);
    });
  });
});
