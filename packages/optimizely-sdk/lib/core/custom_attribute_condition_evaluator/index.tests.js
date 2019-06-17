/****************************************************************************
 * Copyright 2018-2019, Optimizely, Inc. and contributors                        *
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

var customAttributeEvaluator = require('./');
var enums = require('../../utils/enums');
var LOG_LEVEL = enums.LOG_LEVEL;
var logger = require('../../plugins/logger');

var chai = require('chai');
var sinon = require('sinon');
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

describe('lib/core/custom_attribute_condition_evaluator', function() {
  var mockLogger = logger.createLogger({logLevel: LOG_LEVEL.INFO});

  beforeEach(function () {
    sinon.stub(mockLogger, 'log');
  });

  afterEach(function () {
    mockLogger.log.restore();
  });

  it('should return true when the attributes pass the audience conditions and no match type is provided', function() {
    var userAttributes = {
      browser_type: 'safari',
    };

    assert.isTrue(customAttributeEvaluator.evaluate(browserConditionSafari, userAttributes, mockLogger));
  });

  it('should return false when the attributes do not pass the audience conditions and no match type is provided', function() {
    var userAttributes = {
      browser_type: 'firefox',
    };

    assert.isFalse(customAttributeEvaluator.evaluate(browserConditionSafari, userAttributes, mockLogger));
  });

  it('should evaluate different typed attributes', function() {
    var userAttributes = {
      browser_type: 'safari',
      is_firefox: true,
      num_users: 10,
      pi_value: 3.14,
    };

    assert.isTrue(customAttributeEvaluator.evaluate(browserConditionSafari, userAttributes, mockLogger));
    assert.isTrue(customAttributeEvaluator.evaluate(booleanCondition, userAttributes, mockLogger));
    assert.isTrue(customAttributeEvaluator.evaluate(integerCondition, userAttributes, mockLogger));
    assert.isTrue(customAttributeEvaluator.evaluate(doubleCondition, userAttributes, mockLogger));
  });

  it('should log and return null when condition has an invalid match property', function() {
    var result = customAttributeEvaluator.evaluate(
      { match: 'weird', name: 'weird_condition', type: 'custom_attribute', value: 'hi' },
      { weird_condition: 'bye' },
      mockLogger
    );
    assert.isNull(result);
    sinon.assert.calledOnce(mockLogger.log);
    sinon.assert.calledWithExactly(mockLogger.log, LOG_LEVEL.WARNING,
      'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR: Audience condition {"match":"weird","name":"weird_condition","type":"custom_attribute","value":"hi"} uses an unknown match type. You may need to upgrade to a newer release of the Optimizely SDK.');
  });

  describe('exists match type', function() {
    var existsCondition = {
      match: 'exists',
      name: 'input_value',
      type: 'custom_attribute',
    };

    it('should return false if there is no user-provided value', function() {
      var result = customAttributeEvaluator.evaluate(existsCondition, {}, mockLogger);
      assert.isFalse(result);
      sinon.assert.notCalled(mockLogger.log);
    });

    it('should return false if the user-provided value is undefined', function() {
      var result = customAttributeEvaluator.evaluate(existsCondition, { input_value: undefined }, mockLogger);
      assert.isFalse(result);
    });

    it('should return false if the user-provided value is null', function() {
      var result = customAttributeEvaluator.evaluate(existsCondition, { input_value: null }, mockLogger);
      assert.isFalse(result);
    });

    it('should return true if the user-provided value is a string', function() {
      var result = customAttributeEvaluator.evaluate(existsCondition, { input_value: 'hi' }, mockLogger);
      assert.isTrue(result);
    });

    it('should return true if the user-provided value is a number', function() {
      var result = customAttributeEvaluator.evaluate(existsCondition, { input_value: 10 }, mockLogger);
      assert.isTrue(result);
    });

    it('should return true if the user-provided value is a boolean', function() {
      var result = customAttributeEvaluator.evaluate(existsCondition, { input_value: true }, mockLogger);
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
        var result = customAttributeEvaluator.evaluate(exactStringCondition, { favorite_constellation: 'Lacerta' }, mockLogger);
        assert.isTrue(result);
      });

      it('should return false if the user-provided value is not equal to the condition value', function() {
        var result = customAttributeEvaluator.evaluate(exactStringCondition, { favorite_constellation: 'The Big Dipper' }, mockLogger);
        assert.isFalse(result);
      });

      it('should log and return null if condition value is of an unexpected type', function() {
        var invalidExactCondition = {
          match: 'exact',
          name: 'favorite_constellation',
          type: 'custom_attribute',
          value: [],
        };
        var result = customAttributeEvaluator.evaluate(invalidExactCondition, { favorite_constellation: 'Lacerta' }, mockLogger);
        assert.isNull(result);
        sinon.assert.calledOnce(mockLogger.log);
        sinon.assert.calledWithExactly(mockLogger.log, LOG_LEVEL.WARNING,
          'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR: Audience condition {"match":"exact","name":"favorite_constellation","type":"custom_attribute","value":[]} evaluated to UNKNOWN because the condition value is not supported.');
      });

      it('should log and return null if the user-provided value is of a different type than the condition value', function() {
        var result = customAttributeEvaluator.evaluate(exactStringCondition, { favorite_constellation: false }, mockLogger);
        assert.isNull(result);
        sinon.assert.calledOnce(mockLogger.log);
        sinon.assert.calledWithExactly(mockLogger.log, LOG_LEVEL.WARNING,
          'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR: Audience condition {"match":"exact","name":"favorite_constellation","type":"custom_attribute","value":"Lacerta"} evaluated to UNKNOWN because a value of type "boolean" was passed for user attribute "favorite_constellation".');
      });

      it('should log and return null if the user-provided value is null', function() {
        var result = customAttributeEvaluator.evaluate(exactStringCondition, { favorite_constellation: null }, mockLogger);
        assert.isNull(result);
        sinon.assert.calledOnce(mockLogger.log);
        sinon.assert.calledWithExactly(mockLogger.log, LOG_LEVEL.DEBUG,
          'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR: Audience condition {"match":"exact","name":"favorite_constellation","type":"custom_attribute","value":"Lacerta"} evaluated to UNKNOWN because a null value was passed for user attribute "favorite_constellation".');
      });

      it('should log and return null if there is no user-provided value', function() {
        var result = customAttributeEvaluator.evaluate(exactStringCondition, {}, mockLogger);
        assert.isNull(result);
        sinon.assert.calledOnce(mockLogger.log);
        sinon.assert.calledWithExactly(mockLogger.log, LOG_LEVEL.DEBUG,
          'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR: Audience condition {"match":"exact","name":"favorite_constellation","type":"custom_attribute","value":"Lacerta"} evaluated to UNKNOWN because no value was passed for user attribute "favorite_constellation".');
      });

      it('should log and return null if the user-provided value is of an unexpected type', function() {
        var result = customAttributeEvaluator.evaluate(exactStringCondition, { favorite_constellation: [] }, mockLogger);
        assert.isNull(result);
        sinon.assert.calledOnce(mockLogger.log);
        sinon.assert.calledWithExactly(mockLogger.log, LOG_LEVEL.WARNING,
          'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR: Audience condition {"match":"exact","name":"favorite_constellation","type":"custom_attribute","value":"Lacerta"} evaluated to UNKNOWN because a value of type "object" was passed for user attribute "favorite_constellation".');
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
        var result = customAttributeEvaluator.evaluate(exactNumberCondition, { lasers_count: 9000 }, mockLogger);
        assert.isTrue(result);
      });

      it('should return false if the user-provided value is not equal to the condition value', function() {
        var result = customAttributeEvaluator.evaluate(exactNumberCondition, { lasers_count: 8000 }, mockLogger);
        assert.isFalse(result);
      });

      it('should log and return null if the user-provided value is of a different type than the condition value', function() {
        var result = customAttributeEvaluator.evaluate(exactNumberCondition, { lasers_count: 'yes' }, mockLogger);
        assert.isNull(result);

        result = customAttributeEvaluator.evaluate(exactNumberCondition, { lasers_count: '1000' }, mockLogger);
        assert.isNull(result);

        assert.strictEqual(2, mockLogger.log.callCount);
        assert.strictEqual(mockLogger.log.args[0][0], LOG_LEVEL.WARNING);
        assert.strictEqual(mockLogger.log.args[0][1],
          'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR: Audience condition {"match":"exact","name":"lasers_count","type":"custom_attribute","value":9000} evaluated to UNKNOWN because a value of type "string" was passed for user attribute "lasers_count".');
        assert.strictEqual(mockLogger.log.args[1][0], LOG_LEVEL.WARNING);
        assert.strictEqual(mockLogger.log.args[1][1],
          'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR: Audience condition {"match":"exact","name":"lasers_count","type":"custom_attribute","value":9000} evaluated to UNKNOWN because a value of type "string" was passed for user attribute "lasers_count".');
      });

      it('should log and return null if the user-provided number value is out of bounds', function() {
        var result = customAttributeEvaluator.evaluate(exactNumberCondition, { lasers_count: -Infinity }, mockLogger);
        assert.isNull(result);

        result = customAttributeEvaluator.evaluate(exactNumberCondition, { lasers_count: -Math.pow(2, 53) - 2 }, mockLogger);
        assert.isNull(result);

        assert.strictEqual(2, mockLogger.log.callCount);
        assert.strictEqual(mockLogger.log.args[0][0], LOG_LEVEL.WARNING);
        assert.strictEqual(mockLogger.log.args[0][1],
          'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR: Audience condition {"match":"exact","name":"lasers_count","type":"custom_attribute","value":9000} evaluated to UNKNOWN because the number value for user attribute "lasers_count" is not in the range [-2^53, +2^53].');
        assert.strictEqual(mockLogger.log.args[1][0], LOG_LEVEL.WARNING);
        assert.strictEqual(mockLogger.log.args[1][1],
          'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR: Audience condition {"match":"exact","name":"lasers_count","type":"custom_attribute","value":9000} evaluated to UNKNOWN because the number value for user attribute "lasers_count" is not in the range [-2^53, +2^53].');
      });

      it('should return null if there is no user-provided value', function() {
        var result = customAttributeEvaluator.evaluate(exactNumberCondition, {}, mockLogger);
        assert.isNull(result);
      });

      it('should return null if the condition value is not finite', function() {
        var invalidValueCondition = {
          match: 'exact',
          name: 'lasers_count',
          type: 'custom_attribute',
          value: Infinity,
        };
        var result = customAttributeEvaluator.evaluate(invalidValueCondition, { lasers_count: 9000 }, mockLogger);
        assert.isNull(result);

        invalidValueCondition.value = Math.pow(2, 53) + 2;
        result = customAttributeEvaluator.evaluate(invalidValueCondition, { lasers_count: 9000 }, mockLogger);
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
        var result = customAttributeEvaluator.evaluate(exactBoolCondition, { did_register_user: false }, mockLogger);
        assert.isTrue(result);
      });

      it('should return false if the user-provided value is not equal to the condition value', function() {
        var result = customAttributeEvaluator.evaluate(exactBoolCondition, { did_register_user: true }, mockLogger);
        assert.isFalse(result);
      });

      it('should return null if the user-provided value is of a different type than the condition value', function() {
        var result = customAttributeEvaluator.evaluate(exactBoolCondition, { did_register_user: 10 }, mockLogger);
        assert.isNull(result);
      });

      it('should return null if there is no user-provided value', function() {
        var result = customAttributeEvaluator.evaluate(exactBoolCondition, {}, mockLogger);
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
      }, mockLogger);
      assert.isTrue(result);
    });

    it('should return false if the user-provided value is not a substring of the condition value', function() {
      var result = customAttributeEvaluator.evaluate(substringCondition, {
        headline_text: 'Breaking news!',
      }, mockLogger);
      assert.isFalse(result);
    });

    it('should log and return null if the user-provided value is not a string', function() {
      var result = customAttributeEvaluator.evaluate(substringCondition, {
        headline_text: 10,
      }, mockLogger);
      assert.isNull(result);
      sinon.assert.calledOnce(mockLogger.log);
      sinon.assert.calledWithExactly(mockLogger.log, LOG_LEVEL.WARNING,
        'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR: Audience condition {"match":"substring","name":"headline_text","type":"custom_attribute","value":"buy now"} evaluated to UNKNOWN because a value of type "number" was passed for user attribute "headline_text".');
    });

    it('should log and return null if the condition value is not a string', function() {
      var nonStringCondition = {
        match: 'substring',
        name: 'headline_text',
        type: 'custom_attribute',
        value: 10,
      };

      var result = customAttributeEvaluator.evaluate(nonStringCondition, {headline_text: 'hello'}, mockLogger);
      assert.isNull(result);
      sinon.assert.calledOnce(mockLogger.log);
      sinon.assert.calledWithExactly(mockLogger.log, LOG_LEVEL.WARNING,
        'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR: Audience condition {"match":"substring","name":"headline_text","type":"custom_attribute","value":10} evaluated to UNKNOWN because the condition value is not supported.');
    });

    it('should log and return null if the user-provided value is null', function() {
      var result = customAttributeEvaluator.evaluate(substringCondition, { headline_text: null }, mockLogger);
      assert.isNull(result);
      sinon.assert.calledOnce(mockLogger.log);
      sinon.assert.calledWithExactly(mockLogger.log, LOG_LEVEL.DEBUG,
        'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR: Audience condition {"match":"substring","name":"headline_text","type":"custom_attribute","value":"buy now"} evaluated to UNKNOWN because a null value was passed for user attribute "headline_text".');
    });

    it('should return null if there is no user-provided value', function() {
      var result = customAttributeEvaluator.evaluate(substringCondition, {}, mockLogger);
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
      }, mockLogger);
      assert.isTrue(result);
    });

    it('should return false if the user-provided value is not greater than the condition value', function() {
      var result = customAttributeEvaluator.evaluate(gtCondition, {
        meters_travelled: 20,
      }, mockLogger);
      assert.isFalse(result);
    });

    it('should log and return null if the user-provided value is not a number', function() {
      var result = customAttributeEvaluator.evaluate(gtCondition, {
        meters_travelled: 'a long way',
      }, mockLogger);
      assert.isNull(result);

      result = customAttributeEvaluator.evaluate(gtCondition, {
        meters_travelled: '1000',
      }, mockLogger);
      assert.isNull(result);

      assert.strictEqual(2, mockLogger.log.callCount);
      assert.strictEqual(mockLogger.log.args[0][1],
        'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR: Audience condition {"match":"gt","name":"meters_travelled","type":"custom_attribute","value":48.2} evaluated to UNKNOWN because a value of type "string" was passed for user attribute "meters_travelled".');
      assert.strictEqual(mockLogger.log.args[1][1],
        'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR: Audience condition {"match":"gt","name":"meters_travelled","type":"custom_attribute","value":48.2} evaluated to UNKNOWN because a value of type "string" was passed for user attribute "meters_travelled".');
    });

    it('should log and return null if the user-provided number value is out of bounds', function() {
      var result = customAttributeEvaluator.evaluate(gtCondition, {
        meters_travelled: -Infinity,
      }, mockLogger);
      assert.isNull(result);

      result = customAttributeEvaluator.evaluate(gtCondition, {
        meters_travelled: Math.pow(2, 53) + 2,
      }, mockLogger);
      assert.isNull(result);

      assert.strictEqual(2, mockLogger.log.callCount);
      assert.strictEqual(mockLogger.log.args[0][0], LOG_LEVEL.WARNING);
      assert.strictEqual(mockLogger.log.args[0][1],
        'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR: Audience condition {"match":"gt","name":"meters_travelled","type":"custom_attribute","value":48.2} evaluated to UNKNOWN because the number value for user attribute "meters_travelled" is not in the range [-2^53, +2^53].');
      assert.strictEqual(mockLogger.log.args[1][0], LOG_LEVEL.WARNING);
      assert.strictEqual(mockLogger.log.args[1][1],
        'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR: Audience condition {"match":"gt","name":"meters_travelled","type":"custom_attribute","value":48.2} evaluated to UNKNOWN because the number value for user attribute "meters_travelled" is not in the range [-2^53, +2^53].');
    });

    it('should log and return null if the user-provided value is null', function() {
      var result = customAttributeEvaluator.evaluate(gtCondition, { meters_travelled: null }, mockLogger);
      assert.isNull(result);
      sinon.assert.calledOnce(mockLogger.log);
      sinon.assert.calledWithExactly(mockLogger.log, LOG_LEVEL.DEBUG,
        'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR: Audience condition {"match":"gt","name":"meters_travelled","type":"custom_attribute","value":48.2} evaluated to UNKNOWN because a null value was passed for user attribute "meters_travelled".');
    });

    it('should return null if there is no user-provided value', function() {
      var result = customAttributeEvaluator.evaluate(gtCondition, {}, mockLogger);
      assert.isNull(result);
    });

    it('should return null if the condition value is not a finite number', function() {
      var userAttributes = { meters_travelled: 58.4 };
      var invalidValueCondition = {
        match: 'gt',
        name: 'meters_travelled',
        type: 'custom_attribute',
        value: Infinity,
      };
      var result = customAttributeEvaluator.evaluate(invalidValueCondition, userAttributes, mockLogger);
      assert.isNull(result);

      invalidValueCondition.value = null;
      result = customAttributeEvaluator.evaluate(invalidValueCondition, userAttributes, mockLogger);
      assert.isNull(result);

      invalidValueCondition.value = Math.pow(2, 53) + 2;
      result = customAttributeEvaluator.evaluate(invalidValueCondition, userAttributes, mockLogger);
      assert.isNull(result);

      sinon.assert.calledThrice(mockLogger.log);
      var logMessage = mockLogger.log.args[2][1];
      assert.strictEqual(logMessage,
        'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR: Audience condition {"match":"gt","name":"meters_travelled","type":"custom_attribute","value":9007199254740994} evaluated to UNKNOWN because the condition value is not supported.');
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
      }, mockLogger);
      assert.isTrue(result);
    });

    it('should return false if the user-provided value is not less than the condition value', function() {
      var result = customAttributeEvaluator.evaluate(ltCondition, {
        meters_travelled: 64.64,
      }, mockLogger);
      assert.isFalse(result);
    });

    it('should log and return null if the user-provided value is not a number', function() {
      var result = customAttributeEvaluator.evaluate(ltCondition, {
        meters_travelled: true,
      }, mockLogger);
      assert.isNull(result);

      result = customAttributeEvaluator.evaluate(ltCondition, {
        meters_travelled: '48.2',
      }, mockLogger);
      assert.isNull(result);

      assert.strictEqual(2, mockLogger.log.callCount);
      assert.strictEqual(mockLogger.log.args[0][1],
        'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR: Audience condition {"match":"lt","name":"meters_travelled","type":"custom_attribute","value":48.2} evaluated to UNKNOWN because a value of type "boolean" was passed for user attribute "meters_travelled".');
      assert.strictEqual(mockLogger.log.args[1][1],
        'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR: Audience condition {"match":"lt","name":"meters_travelled","type":"custom_attribute","value":48.2} evaluated to UNKNOWN because a value of type "string" was passed for user attribute "meters_travelled".');
    });

    it('should log and return null if the user-provided number value is out of bounds', function() {
      var result = customAttributeEvaluator.evaluate(ltCondition, {
        meters_travelled: Infinity,
      }, mockLogger);
      assert.isNull(result);

      result = customAttributeEvaluator.evaluate(ltCondition, {
        meters_travelled: Math.pow(2, 53) + 2,
      }, mockLogger);
      assert.isNull(result);

      assert.strictEqual(2, mockLogger.log.callCount);
      assert.strictEqual(mockLogger.log.args[0][0], LOG_LEVEL.WARNING);
      assert.strictEqual(mockLogger.log.args[0][1],
        'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR: Audience condition {"match":"lt","name":"meters_travelled","type":"custom_attribute","value":48.2} evaluated to UNKNOWN because the number value for user attribute "meters_travelled" is not in the range [-2^53, +2^53].');
      assert.strictEqual(mockLogger.log.args[1][0], LOG_LEVEL.WARNING);
      assert.strictEqual(mockLogger.log.args[1][1],
        'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR: Audience condition {"match":"lt","name":"meters_travelled","type":"custom_attribute","value":48.2} evaluated to UNKNOWN because the number value for user attribute "meters_travelled" is not in the range [-2^53, +2^53].');
    });

    it('should log and return null if the user-provided value is null', function() {
      var result = customAttributeEvaluator.evaluate(ltCondition, { meters_travelled: null }, mockLogger);
      assert.isNull(result);
      sinon.assert.calledOnce(mockLogger.log);
      sinon.assert.calledWithExactly(mockLogger.log, LOG_LEVEL.DEBUG,
        'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR: Audience condition {"match":"lt","name":"meters_travelled","type":"custom_attribute","value":48.2} evaluated to UNKNOWN because a null value was passed for user attribute "meters_travelled".');
    });

    it('should return null if there is no user-provided value', function() {
      var result = customAttributeEvaluator.evaluate(ltCondition, {}, mockLogger);
      assert.isNull(result);
    });

    it('should return null if the condition value is not a finite number', function() {
      var userAttributes = { meters_travelled: 10 };
      var invalidValueCondition = {
        match: 'lt',
        name: 'meters_travelled',
        type: 'custom_attribute',
        value: Infinity,
      };
      var result = customAttributeEvaluator.evaluate(invalidValueCondition, userAttributes, mockLogger);
      assert.isNull(result);

      invalidValueCondition.value = {};
      result = customAttributeEvaluator.evaluate(invalidValueCondition, userAttributes, mockLogger);
      assert.isNull(result);

      invalidValueCondition.value = Math.pow(2, 53) + 2;
      result = customAttributeEvaluator.evaluate(invalidValueCondition, userAttributes, mockLogger);
      assert.isNull(result);

      sinon.assert.calledThrice(mockLogger.log);
      var logMessage = mockLogger.log.args[2][1];
      assert.strictEqual(logMessage,
        'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR: Audience condition {"match":"lt","name":"meters_travelled","type":"custom_attribute","value":9007199254740994} evaluated to UNKNOWN because the condition value is not supported.');
    });
  });
});
