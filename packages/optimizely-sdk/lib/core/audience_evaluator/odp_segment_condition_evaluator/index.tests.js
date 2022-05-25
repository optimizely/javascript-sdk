/****************************************************************************
 * Copyright 2018-2020, Optimizely, Inc. and contributors                   *
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
import { sprintf } from '@optimizely/js-sdk-utils';

import {
  LOG_LEVEL,
  LOG_MESSAGES,
} from '../../utils/enums';
import * as logging from '@optimizely/js-sdk-logging';
import * as customAttributeEvaluator from './';

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
  var stubLogHandler;

  beforeEach(function() {
    stubLogHandler = {
      log: sinon.stub(),
    };
    logging.setLogLevel('notset');
    logging.setLogHandler(stubLogHandler);
  });

  afterEach(function() {
    logging.resetLogger();
  });

  it('should return true when the attributes pass the audience conditions and no match type is provided', function() {
    var userAttributes = {
      browser_type: 'safari',
    };

    assert.isTrue(customAttributeEvaluator.evaluate(browserConditionSafari, userAttributes));
  });

  it('should return false when the attributes do not pass the audience conditions and no match type is provided', function() {
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

  it('should log and return null when condition has an invalid match property', function() {
    var invalidMatchCondition = { match: 'weird', name: 'weird_condition', type: 'custom_attribute', value: 'hi' };
    var result = customAttributeEvaluator.evaluate(
      invalidMatchCondition,
      { weird_condition: 'bye' }
    );
    assert.isNull(result);
    sinon.assert.calledOnce(stubLogHandler.log);
    assert.strictEqual(stubLogHandler.log.args[0][0], LOG_LEVEL.WARNING);
    var logMessage = stubLogHandler.log.args[0][1];
    assert.strictEqual(logMessage, sprintf(LOG_MESSAGES.UNKNOWN_MATCH_TYPE, 'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR', JSON.stringify(invalidMatchCondition)));
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
      sinon.assert.notCalled(stubLogHandler.log);
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
        var result = customAttributeEvaluator.evaluate(
          exactStringCondition,
          { favorite_constellation: 'Lacerta' }
        );
        assert.isTrue(result);
      });

      it('should return false if the user-provided value is not equal to the condition value', function() {
        var result = customAttributeEvaluator.evaluate(
          exactStringCondition,
          { favorite_constellation: 'The Big Dipper' }
        );
        assert.isFalse(result);
      });

      it('should log and return null if condition value is of an unexpected type', function() {
        var invalidExactCondition = {
          match: 'exact',
          name: 'favorite_constellation',
          type: 'custom_attribute',
          value: [],
        };
        var result = customAttributeEvaluator.evaluate(
          invalidExactCondition,
          { favorite_constellation: 'Lacerta' }
        );
        assert.isNull(result);
        sinon.assert.calledOnce(stubLogHandler.log);
        assert.strictEqual(stubLogHandler.log.args[0][0], LOG_LEVEL.WARNING);
        var logMessage = stubLogHandler.log.args[0][1];
        assert.strictEqual(logMessage, sprintf(LOG_MESSAGES.UNEXPECTED_CONDITION_VALUE, 'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR', JSON.stringify(invalidExactCondition)));
      });

      it('should log and return null if the user-provided value is of a different type than the condition value', function() {
        var unexpectedTypeUserAttributes = { favorite_constellation: false };
        var result = customAttributeEvaluator.evaluate(
          exactStringCondition,
          unexpectedTypeUserAttributes
        );
        assert.isNull(result);

        var userValue = unexpectedTypeUserAttributes[exactStringCondition.name];
        var userValueType = typeof userValue;
        sinon.assert.calledOnce(stubLogHandler.log);
        assert.strictEqual(stubLogHandler.log.args[0][0], LOG_LEVEL.WARNING);
        var logMessage = stubLogHandler.log.args[0][1];
        assert.strictEqual(
          logMessage,
          sprintf(LOG_MESSAGES.UNEXPECTED_TYPE, 'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR', JSON.stringify(exactStringCondition), userValueType, exactStringCondition.name)
        );
      });

      it('should log and return null if the user-provided value is null', function() {
        var result = customAttributeEvaluator.evaluate(
          exactStringCondition,
          { favorite_constellation: null }
        );
        assert.isNull(result);
        sinon.assert.calledOnce(stubLogHandler.log);
        assert.strictEqual(stubLogHandler.log.args[0][0], LOG_LEVEL.DEBUG);
        var logMessage = stubLogHandler.log.args[0][1];
        assert.strictEqual(
          logMessage,
          sprintf(LOG_MESSAGES.UNEXPECTED_TYPE_NULL, 'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR', JSON.stringify(exactStringCondition), exactStringCondition.name)
        );
      });

      it('should log and return null if there is no user-provided value', function() {
        var result = customAttributeEvaluator.evaluate(exactStringCondition, {});
        assert.isNull(result);
        sinon.assert.calledOnce(stubLogHandler.log);
        assert.strictEqual(stubLogHandler.log.args[0][0], LOG_LEVEL.DEBUG);
        var logMessage = stubLogHandler.log.args[0][1];
        assert.strictEqual(
          logMessage,
          sprintf(LOG_MESSAGES.MISSING_ATTRIBUTE_VALUE, 'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR', JSON.stringify(exactStringCondition), exactStringCondition.name)
        );
      });

      it('should log and return null if the user-provided value is of an unexpected type', function() {
        var unexpectedTypeUserAttributes = { favorite_constellation: [] };
        var result = customAttributeEvaluator.evaluate(
          exactStringCondition,
          unexpectedTypeUserAttributes
        );
        assert.isNull(result);
        var userValue = unexpectedTypeUserAttributes[exactStringCondition.name];
        var userValueType = typeof userValue;
        sinon.assert.calledOnce(stubLogHandler.log);
        assert.strictEqual(stubLogHandler.log.args[0][0], LOG_LEVEL.WARNING);
        var logMessage = stubLogHandler.log.args[0][1];
        assert.strictEqual(
          logMessage,
          sprintf(LOG_MESSAGES.UNEXPECTED_TYPE, 'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR', JSON.stringify(exactStringCondition), userValueType, exactStringCondition.name)
        );
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

      it('should log and return null if the user-provided value is of a different type than the condition value', function() {
        var unexpectedTypeUserAttributes1 = { lasers_count: 'yes' };
        var result = customAttributeEvaluator.evaluate(
          exactNumberCondition,
          unexpectedTypeUserAttributes1
        );
        assert.isNull(result);

        var unexpectedTypeUserAttributes2 = { lasers_count: '1000' };
        result = customAttributeEvaluator.evaluate(
          exactNumberCondition,
          unexpectedTypeUserAttributes2
        );
        assert.isNull(result);

        var userValue1 = unexpectedTypeUserAttributes1[exactNumberCondition.name];
        var userValueType1 = typeof userValue1;
        var userValue2 = unexpectedTypeUserAttributes2[exactNumberCondition.name];
        var userValueType2 = typeof userValue2;
        assert.strictEqual(2, stubLogHandler.log.callCount);
        assert.strictEqual(stubLogHandler.log.args[0][0], LOG_LEVEL.WARNING);
        assert.strictEqual(stubLogHandler.log.args[1][0], LOG_LEVEL.WARNING);

        var logMessage1 = stubLogHandler.log.args[0][1];
        var logMessage2 = stubLogHandler.log.args[1][1];
        assert.strictEqual(
          logMessage1,
          sprintf(LOG_MESSAGES.UNEXPECTED_TYPE, 'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR', JSON.stringify(exactNumberCondition), userValueType1, exactNumberCondition.name)
        );
        assert.strictEqual(
          logMessage2,
          sprintf(LOG_MESSAGES.UNEXPECTED_TYPE, 'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR', JSON.stringify(exactNumberCondition), userValueType2, exactNumberCondition.name)
        );
      });

      it('should log and return null if the user-provided number value is out of bounds', function() {
        var result = customAttributeEvaluator.evaluate(exactNumberCondition, { lasers_count: -Infinity });
        assert.isNull(result);

        result = customAttributeEvaluator.evaluate(
          exactNumberCondition,
          { lasers_count: -Math.pow(2, 53) - 2 }
        );
        assert.isNull(result);

        assert.strictEqual(2, stubLogHandler.log.callCount);
        assert.strictEqual(stubLogHandler.log.args[0][0], LOG_LEVEL.WARNING);
        assert.strictEqual(stubLogHandler.log.args[1][0], LOG_LEVEL.WARNING);

        var logMessage1 = stubLogHandler.log.args[0][1];
        var logMessage2 = stubLogHandler.log.args[1][1];
        assert.strictEqual(
          logMessage1,
          sprintf(LOG_MESSAGES.OUT_OF_BOUNDS, 'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR', JSON.stringify(exactNumberCondition), exactNumberCondition.name)
        );
        assert.strictEqual(
          logMessage2,
          sprintf(LOG_MESSAGES.OUT_OF_BOUNDS, 'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR', JSON.stringify(exactNumberCondition), exactNumberCondition.name)
        );
      });

      it('should return null if there is no user-provided value', function() {
        var result = customAttributeEvaluator.evaluate(exactNumberCondition, {});
        assert.isNull(result);
      });

      it('should log and return null if the condition value is not finite', function() {
        var invalidValueCondition1 = {
          match: 'exact',
          name: 'lasers_count',
          type: 'custom_attribute',
          value: Infinity,
        };
        var result = customAttributeEvaluator.evaluate(invalidValueCondition1, { lasers_count: 9000 });
        assert.isNull(result);

        var invalidValueCondition2 = {
          match: 'exact',
          name: 'lasers_count',
          type: 'custom_attribute',
          value: Math.pow(2, 53) + 2,
        };
        result = customAttributeEvaluator.evaluate(invalidValueCondition2, { lasers_count: 9000 });
        assert.isNull(result);

        assert.strictEqual(2, stubLogHandler.log.callCount);
        assert.strictEqual(stubLogHandler.log.args[0][0], LOG_LEVEL.WARNING);
        assert.strictEqual(stubLogHandler.log.args[1][0], LOG_LEVEL.WARNING);

        var logMessage1 = stubLogHandler.log.args[0][1];
        var logMessage2 = stubLogHandler.log.args[1][1];
        assert.strictEqual(
          logMessage1,
          sprintf(LOG_MESSAGES.UNEXPECTED_CONDITION_VALUE, 'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR', JSON.stringify(invalidValueCondition1))
        );
        assert.strictEqual(
          logMessage2,
          sprintf(LOG_MESSAGES.UNEXPECTED_CONDITION_VALUE, 'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR', JSON.stringify(invalidValueCondition2))
        );
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
      var result = customAttributeEvaluator.evaluate(
        substringCondition,
        {
          headline_text: 'Limited time, buy now!',
        }
      );
      assert.isTrue(result);
    });

    it('should return false if the user-provided value is not a substring of the condition value', function() {
      var result = customAttributeEvaluator.evaluate(
        substringCondition,
        {
          headline_text: 'Breaking news!',
        }
      );
      assert.isFalse(result);
    });

    it('should log and return null if the user-provided value is not a string', function() {
      var unexpectedTypeUserAttributes = { headline_text: 10 };
      var result = customAttributeEvaluator.evaluate(
        substringCondition,
        unexpectedTypeUserAttributes
      );
      assert.isNull(result);
      var userValue = unexpectedTypeUserAttributes[substringCondition.name];
      var userValueType = typeof userValue;
      sinon.assert.calledOnce(stubLogHandler.log);
      assert.strictEqual(stubLogHandler.log.args[0][0], LOG_LEVEL.WARNING);
      var logMessage = stubLogHandler.log.args[0][1];
      assert.strictEqual(
        logMessage,
        sprintf(LOG_MESSAGES.UNEXPECTED_TYPE, 'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR', JSON.stringify(substringCondition), userValueType, substringCondition.name)
      );
    });

    it('should log and return null if the condition value is not a string', function() {
      var nonStringCondition = {
        match: 'substring',
        name: 'headline_text',
        type: 'custom_attribute',
        value: 10,
      };

      var result = customAttributeEvaluator.evaluate(nonStringCondition, { headline_text: 'hello' });
      assert.isNull(result);
      sinon.assert.calledOnce(stubLogHandler.log);
      assert.strictEqual(stubLogHandler.log.args[0][0], LOG_LEVEL.WARNING);
      var logMessage = stubLogHandler.log.args[0][1];
      assert.strictEqual(
        logMessage,
        sprintf(LOG_MESSAGES.UNEXPECTED_CONDITION_VALUE, 'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR', JSON.stringify(nonStringCondition))
      );
    });

    it('should log and return null if the user-provided value is null', function() {
      var result = customAttributeEvaluator.evaluate(substringCondition, { headline_text: null });
      assert.isNull(result);
      sinon.assert.calledOnce(stubLogHandler.log);
      assert.strictEqual(stubLogHandler.log.args[0][0], LOG_LEVEL.DEBUG);
      var logMessage = stubLogHandler.log.args[0][1];
      assert.strictEqual(
        logMessage,
        sprintf(LOG_MESSAGES.UNEXPECTED_TYPE_NULL, 'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR', JSON.stringify(substringCondition), substringCondition.name)
      );
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
      var result = customAttributeEvaluator.evaluate(
        gtCondition,
        {
          meters_travelled: 58.4,
        }
      );
      assert.isTrue(result);
    });

    it('should return false if the user-provided value is not greater than the condition value', function() {
      var result = customAttributeEvaluator.evaluate(
        gtCondition,
        {
          meters_travelled: 20,
        }
      );
      assert.isFalse(result);
    });

    it('should log and return null if the user-provided value is not a number', function() {
      var unexpectedTypeUserAttributes1 = { meters_travelled: 'a long way' };
      var result = customAttributeEvaluator.evaluate(
        gtCondition,
        unexpectedTypeUserAttributes1
      );
      assert.isNull(result);

      var unexpectedTypeUserAttributes2 = { meters_travelled: '1000' };
      result = customAttributeEvaluator.evaluate(
        gtCondition,
        unexpectedTypeUserAttributes2
      );
      assert.isNull(result);

      var userValue1 = unexpectedTypeUserAttributes1[gtCondition.name];
      var userValueType1 = typeof userValue1;
      var userValue2 = unexpectedTypeUserAttributes2[gtCondition.name];
      var userValueType2 = typeof userValue2;
      assert.strictEqual(2, stubLogHandler.log.callCount);
      assert.strictEqual(stubLogHandler.log.args[0][0], LOG_LEVEL.WARNING);
      assert.strictEqual(stubLogHandler.log.args[1][0], LOG_LEVEL.WARNING);

      var logMessage1 = stubLogHandler.log.args[0][1];
      var logMessage2 = stubLogHandler.log.args[1][1];
      assert.strictEqual(
        logMessage1,
        sprintf(LOG_MESSAGES.UNEXPECTED_TYPE, 'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR', JSON.stringify(gtCondition), userValueType1, gtCondition.name)
      );
      assert.strictEqual(
        logMessage2,
        sprintf(LOG_MESSAGES.UNEXPECTED_TYPE, 'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR', JSON.stringify(gtCondition), userValueType2, gtCondition.name)
      );
    });

    it('should log and return null if the user-provided number value is out of bounds', function() {
      var result = customAttributeEvaluator.evaluate(
        gtCondition,
        { meters_travelled: -Infinity }
      );
      assert.isNull(result);

      result = customAttributeEvaluator.evaluate(
        gtCondition,
        { meters_travelled: Math.pow(2, 53) + 2 }
      );
      assert.isNull(result);

      assert.strictEqual(2, stubLogHandler.log.callCount);
      assert.strictEqual(stubLogHandler.log.args[0][0], LOG_LEVEL.WARNING);
      assert.strictEqual(stubLogHandler.log.args[1][0], LOG_LEVEL.WARNING);

      var logMessage1 = stubLogHandler.log.args[0][1];
      var logMessage2 = stubLogHandler.log.args[1][1];
      assert.strictEqual(
        logMessage1,
        sprintf(LOG_MESSAGES.OUT_OF_BOUNDS, 'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR', JSON.stringify(gtCondition), gtCondition.name)
      );
      assert.strictEqual(
        logMessage2,
        sprintf(LOG_MESSAGES.OUT_OF_BOUNDS, 'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR', JSON.stringify(gtCondition), gtCondition.name)
      );
    });

    it('should log and return null if the user-provided value is null', function() {
      var result = customAttributeEvaluator.evaluate(gtCondition, { meters_travelled: null });
      assert.isNull(result);
      sinon.assert.calledOnce(stubLogHandler.log);
      assert.strictEqual(stubLogHandler.log.args[0][0], LOG_LEVEL.DEBUG);
      var logMessage = stubLogHandler.log.args[0][1];
      assert.strictEqual(
        logMessage,
        sprintf(LOG_MESSAGES.UNEXPECTED_TYPE_NULL, 'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR', JSON.stringify(gtCondition), gtCondition.name)
      );
    });

    it('should return null if there is no user-provided value', function() {
      var result = customAttributeEvaluator.evaluate(gtCondition, {});
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
      var result = customAttributeEvaluator.evaluate(invalidValueCondition, userAttributes);
      assert.isNull(result);

      invalidValueCondition.value = null;
      result = customAttributeEvaluator.evaluate(invalidValueCondition, userAttributes);
      assert.isNull(result);

      invalidValueCondition.value = Math.pow(2, 53) + 2;
      result = customAttributeEvaluator.evaluate(invalidValueCondition, userAttributes);
      assert.isNull(result);

      sinon.assert.calledThrice(stubLogHandler.log);
      var logMessage = stubLogHandler.log.args[2][1];
      assert.strictEqual(
        logMessage,
        sprintf(LOG_MESSAGES.UNEXPECTED_CONDITION_VALUE, 'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR', JSON.stringify(invalidValueCondition))
      );
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
      var result = customAttributeEvaluator.evaluate(
        ltCondition,
        {
          meters_travelled: 10,
        }
      );
      assert.isTrue(result);
    });

    it('should return false if the user-provided value is not less than the condition value', function() {
      var result = customAttributeEvaluator.evaluate(
        ltCondition,
        {
          meters_travelled: 64.64,
        }
      );
      assert.isFalse(result);
    });

    it('should log and return null if the user-provided value is not a number', function() {
      var unexpectedTypeUserAttributes1 = { meters_travelled: true };
      var result = customAttributeEvaluator.evaluate(
        ltCondition,
        unexpectedTypeUserAttributes1
      );
      assert.isNull(result);

      var unexpectedTypeUserAttributes2 = { meters_travelled: '48.2' };
      result = customAttributeEvaluator.evaluate(
        ltCondition,
        unexpectedTypeUserAttributes2
      );
      assert.isNull(result);

      var userValue1 = unexpectedTypeUserAttributes1[ltCondition.name];
      var userValueType1 = typeof userValue1;
      var userValue2 = unexpectedTypeUserAttributes2[ltCondition.name];
      var userValueType2 = typeof userValue2;
      assert.strictEqual(2, stubLogHandler.log.callCount);
      assert.strictEqual(stubLogHandler.log.args[0][0], LOG_LEVEL.WARNING);
      assert.strictEqual(stubLogHandler.log.args[1][0], LOG_LEVEL.WARNING);

      var logMessage1 = stubLogHandler.log.args[0][1];
      var logMessage2 = stubLogHandler.log.args[1][1];
      assert.strictEqual(
        logMessage1,
        sprintf(LOG_MESSAGES.UNEXPECTED_TYPE, 'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR', JSON.stringify(ltCondition), userValueType1, ltCondition.name)
      );
      assert.strictEqual(
        logMessage2,
        sprintf(LOG_MESSAGES.UNEXPECTED_TYPE, 'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR', JSON.stringify(ltCondition), userValueType2, ltCondition.name)
      );
    });

    it('should log and return null if the user-provided number value is out of bounds', function() {
      var result = customAttributeEvaluator.evaluate(
        ltCondition,
        {
          meters_travelled: Infinity,
        }
      );
      assert.isNull(result);

      result = customAttributeEvaluator.evaluate(
        ltCondition,
        {
          meters_travelled: Math.pow(2, 53) + 2,
        }
      );
      assert.isNull(result);

      assert.strictEqual(2, stubLogHandler.log.callCount);
      assert.strictEqual(stubLogHandler.log.args[0][0], LOG_LEVEL.WARNING);
      assert.strictEqual(stubLogHandler.log.args[1][0], LOG_LEVEL.WARNING);

      var logMessage1 = stubLogHandler.log.args[0][1];
      var logMessage2 = stubLogHandler.log.args[1][1];
      assert.strictEqual(
        logMessage1,
        sprintf(LOG_MESSAGES.OUT_OF_BOUNDS, 'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR', JSON.stringify(ltCondition), ltCondition.name)
      );
      assert.strictEqual(
        logMessage2,
        sprintf(LOG_MESSAGES.OUT_OF_BOUNDS, 'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR', JSON.stringify(ltCondition), ltCondition.name)
      );
    });

    it('should log and return null if the user-provided value is null', function() {
      var result = customAttributeEvaluator.evaluate(ltCondition, { meters_travelled: null });
      assert.isNull(result);
      sinon.assert.calledOnce(stubLogHandler.log);
      assert.strictEqual(stubLogHandler.log.args[0][0], LOG_LEVEL.DEBUG);
      var logMessage = stubLogHandler.log.args[0][1];
      assert.strictEqual(
        logMessage,
        sprintf(LOG_MESSAGES.UNEXPECTED_TYPE_NULL, 'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR', JSON.stringify(ltCondition), ltCondition.name)
      );
    });

    it('should return null if there is no user-provided value', function() {
      var result = customAttributeEvaluator.evaluate(ltCondition, {});
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
      var result = customAttributeEvaluator.evaluate(invalidValueCondition, userAttributes);
      assert.isNull(result);

      invalidValueCondition.value = {};
      result = customAttributeEvaluator.evaluate(invalidValueCondition, userAttributes);
      assert.isNull(result);

      invalidValueCondition.value = Math.pow(2, 53) + 2;
      result = customAttributeEvaluator.evaluate(invalidValueCondition, userAttributes);
      assert.isNull(result);

      sinon.assert.calledThrice(stubLogHandler.log);
      var logMessage = stubLogHandler.log.args[2][1];
      assert.strictEqual(
        logMessage,
        sprintf(LOG_MESSAGES.UNEXPECTED_CONDITION_VALUE, 'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR', JSON.stringify(invalidValueCondition))
      );
    });
  });
  describe('less than or equal to match type', function() {
    var leCondition = {
      match: 'le',
      name: 'meters_travelled',
      type: 'custom_attribute',
      value: 48.2,
    };

    it('should return false if the user-provided value is greater than the condition value', function() {
      var result = customAttributeEvaluator.evaluate(
        leCondition,
        {
          meters_travelled: 48.3,
        }
      );
      assert.isFalse(result);
    });

    it('should return true if the user-provided value is less than or equal to the condition value', function() {
      var versions = [48, 48.2];
      for (let userValue of versions) {
        var result = customAttributeEvaluator.evaluate(
          leCondition,
          {
            meters_travelled: userValue,
          }
        );
        assert.isTrue(result, `Got result ${result}. Failed for condition value: ${leCondition.value} and user value: ${userValue}`);
      }
    });
  });


  describe('greater than and equal to match type', function() {
    var geCondition = {
      match: 'ge',
      name: 'meters_travelled',
      type: 'custom_attribute',
      value: 48.2,
    };

    it('should return false if the user-provided value is less than the condition value', function() {
      var result = customAttributeEvaluator.evaluate(
        geCondition,
        {
          meters_travelled: 48,
        }
      );
      assert.isFalse(result);
    });

    it('should return true if the user-provided value is less than or equal to the condition value', function() {
      var versions = [100, 48.2];
      for (let userValue of versions) {
        var result = customAttributeEvaluator.evaluate(
          geCondition,
          {
            meters_travelled: userValue,
          }
        );
        assert.isTrue(result, `Got result ${result}. Failed for condition value: ${geCondition.value} and user value: ${userValue}`);
      }
    });
  });

  describe('semver greater than match type', function() {
    var semvergtCondition = {
      match: 'semver_gt',
      name: 'app_version',
      type: 'custom_attribute',
      value: '2.0.0',
    };

    it('should return true if the user-provided version is greater than the condition version', function() {
      var versions = [
        ['1.8.1', '1.9']
      ];
      for (let [targetVersion, userVersion] of versions) {
        var customSemvergtCondition = {
          match: 'semver_gt',
          name: 'app_version',
          type: 'custom_attribute',
          value: targetVersion,
        };
        var result = customAttributeEvaluator.evaluate(
          customSemvergtCondition,
          {
            app_version: userVersion,
          }
        );
        assert.isTrue(result, `Got result ${result}. Failed for target version: ${targetVersion} and user version: ${userVersion}`);
      }
    });

    it('should return false if the user-provided version is not greater than the condition version', function() {
      var versions = [
        ['2.0.1', '2.0.1'],
        ['2.0', '2.0.0'],
        ['2.0', '2.0.1'],
        ['2.0.1', '2.0.0'],
      ];
      for (let [targetVersion, userVersion] of versions) {
        var customSemvergtCondition = {
          match: 'semver_gt',
          name: 'app_version',
          type: 'custom_attribute',
          value: targetVersion,
        };
        var result = customAttributeEvaluator.evaluate(
          customSemvergtCondition,
          {
            app_version: userVersion,
          }
        );
        assert.isFalse(result, `Got result ${result}. Failed for target version: ${targetVersion} and user version: ${userVersion}`);
      }
    });

    it('should log and return null if the user-provided version is not a string', function() {
      var result = customAttributeEvaluator.evaluate(
        semvergtCondition,
        {
          app_version: 22,
        }
      );
      assert.isNull(result);

      result = customAttributeEvaluator.evaluate(
        semvergtCondition,
        {
          app_version: false,
        }
      );
      assert.isNull(result);

      assert.strictEqual(2, stubLogHandler.log.callCount);
      assert.strictEqual(
        stubLogHandler.log.args[0][1],
        'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR: Audience condition {"match":"semver_gt","name":"app_version","type":"custom_attribute","value":"2.0.0"} evaluated to UNKNOWN because a value of type "number" was passed for user attribute "app_version".'
      );
      assert.strictEqual(
        stubLogHandler.log.args[1][1],
        'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR: Audience condition {"match":"semver_gt","name":"app_version","type":"custom_attribute","value":"2.0.0"} evaluated to UNKNOWN because a value of type "boolean" was passed for user attribute "app_version".'
      );
    });

    it('should log and return null if the user-provided value is null', function() {
      var result = customAttributeEvaluator.evaluate(semvergtCondition, { app_version: null });
      assert.isNull(result);
      sinon.assert.calledOnce(stubLogHandler.log);
      sinon.assert.calledWithExactly(
        stubLogHandler.log,
        LOG_LEVEL.DEBUG,
        'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR: Audience condition {"match":"semver_gt","name":"app_version","type":"custom_attribute","value":"2.0.0"} evaluated to UNKNOWN because a null value was passed for user attribute "app_version".'
      );
    });

    it('should return null if there is no user-provided value', function() {
      var result = customAttributeEvaluator.evaluate(semvergtCondition, {});
      assert.isNull(result);
    });
  });

  describe('semver less than match type', function() {
    var semverltCondition = {
      match: 'semver_lt',
      name: 'app_version',
      type: 'custom_attribute',
      value: '2.0.0',
    };

    it('should return false if the user-provided version is greater than the condition version', function() {
      var versions = [
        ['2.0.0', '2.0.1'],
        ['1.9', '2.0.0'],
        ['2.0.0', '2.0.0'],

      ];
      for (let [targetVersion, userVersion] of versions) {
        var customSemverltCondition = {
          match: 'semver_lt',
          name: 'app_version',
          type: 'custom_attribute',
          value: targetVersion,
        };
        var result = customAttributeEvaluator.evaluate(
          customSemverltCondition,
          {
            app_version: userVersion,
          }
        );
        assert.isFalse(result, `Got result ${result}. Failed for target version: ${targetVersion} and user version: ${userVersion}`);
      }
    });

    it('should return true if the user-provided version is less than the condition version', function() {
      var versions = [
        ['2.0.1', '2.0.0'],
        ['2.0.0', '1.9']
      ];
      for (let [targetVersion, userVersion] of versions) {
        var customSemverltCondition = {
          match: 'semver_lt',
          name: 'app_version',
          type: 'custom_attribute',
          value: targetVersion,
        };
        var result = customAttributeEvaluator.evaluate(
          customSemverltCondition,
          {
            app_version: userVersion,
          }
        );
        assert.isTrue(result, `Got result ${result}. Failed for target version: ${targetVersion} and user version: ${userVersion}`);
      }
    });

    it('should log and return null if the user-provided version is not a string', function() {
      var result = customAttributeEvaluator.evaluate(
        semverltCondition,
        {
          app_version: 22,
        }
      );
      assert.isNull(result);

      result = customAttributeEvaluator.evaluate(
        semverltCondition,
        {
          app_version: false,
        }
      );
      assert.isNull(result);

      assert.strictEqual(2, stubLogHandler.log.callCount);
      assert.strictEqual(
        stubLogHandler.log.args[0][1],
        'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR: Audience condition {"match":"semver_lt","name":"app_version","type":"custom_attribute","value":"2.0.0"} evaluated to UNKNOWN because a value of type "number" was passed for user attribute "app_version".'
      );
      assert.strictEqual(
        stubLogHandler.log.args[1][1],
        'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR: Audience condition {"match":"semver_lt","name":"app_version","type":"custom_attribute","value":"2.0.0"} evaluated to UNKNOWN because a value of type "boolean" was passed for user attribute "app_version".'
      );
    });

    it('should log and return null if the user-provided value is null', function() {
      var result = customAttributeEvaluator.evaluate(semverltCondition, { app_version: null });
      assert.isNull(result);
      sinon.assert.calledOnce(stubLogHandler.log);
      sinon.assert.calledWithExactly(
        stubLogHandler.log,
        LOG_LEVEL.DEBUG,
        'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR: Audience condition {"match":"semver_lt","name":"app_version","type":"custom_attribute","value":"2.0.0"} evaluated to UNKNOWN because a null value was passed for user attribute "app_version".'
      );
    });

    it('should return null if there is no user-provided value', function() {
      var result = customAttributeEvaluator.evaluate(semverltCondition, {});
      assert.isNull(result);
    });
  });

  describe('semver equal to match type', function() {
    var semvereqCondition = {
      match: 'semver_eq',
      name: 'app_version',
      type: 'custom_attribute',
      value: '2.0',
    };

    it('should return false if the user-provided version is greater than the condition version', function() {
      var versions = [
        ['2.0.0', '2.0.1'],
        ['2.0.1', '2.0.0'],
        ['1.9.1', '1.9']
      ];
      for (let [targetVersion, userVersion] of versions) {
        var customSemvereqCondition = {
          match: 'semver_eq',
          name: 'app_version',
          type: 'custom_attribute',
          value: targetVersion,
        };
        var result = customAttributeEvaluator.evaluate(
          customSemvereqCondition,
          {
            app_version: userVersion,
          }
        );
        assert.isFalse(result, `Got result ${result}. Failed for target version: ${targetVersion} and user version: ${userVersion}`);
      }
    });

    it('should return true if the user-provided version is equal to the condition version', function() {
      var versions = [
        ['2.0.1', '2.0.1'],
        ['1.9', '1.9.1']
      ];
      for (let [targetVersion, userVersion] of versions) {
        var customSemvereqCondition = {
          match: 'semver_eq',
          name: 'app_version',
          type: 'custom_attribute',
          value: targetVersion,
        };
        var result = customAttributeEvaluator.evaluate(
          customSemvereqCondition,
          {
            app_version: userVersion,
          }
        );
        assert.isTrue(result, `Got result ${result}. Failed for target version: ${targetVersion} and user version: ${userVersion}`);
      }
    });

    it('should log and return null if the user-provided version is not a string', function() {
      var result = customAttributeEvaluator.evaluate(
        semvereqCondition,
        {
          app_version: 22,
        }
      );
      assert.isNull(result);

      result = customAttributeEvaluator.evaluate(
        semvereqCondition,
        {
          app_version: false,
        }
      );
      assert.isNull(result);

      assert.strictEqual(2, stubLogHandler.log.callCount);
      assert.strictEqual(
        stubLogHandler.log.args[0][1],
        'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR: Audience condition {"match":"semver_eq","name":"app_version","type":"custom_attribute","value":"2.0"} evaluated to UNKNOWN because a value of type "number" was passed for user attribute "app_version".'
      );
      assert.strictEqual(
        stubLogHandler.log.args[1][1],
        'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR: Audience condition {"match":"semver_eq","name":"app_version","type":"custom_attribute","value":"2.0"} evaluated to UNKNOWN because a value of type "boolean" was passed for user attribute "app_version".'
      );
    });

    it('should log and return null if the user-provided value is null', function() {
      var result = customAttributeEvaluator.evaluate(semvereqCondition, { app_version: null });
      assert.isNull(result);
      sinon.assert.calledOnce(stubLogHandler.log);
      sinon.assert.calledWithExactly(
        stubLogHandler.log,
        LOG_LEVEL.DEBUG,
        'CUSTOM_ATTRIBUTE_CONDITION_EVALUATOR: Audience condition {"match":"semver_eq","name":"app_version","type":"custom_attribute","value":"2.0"} evaluated to UNKNOWN because a null value was passed for user attribute "app_version".'
      );
    });

    it('should return null if there is no user-provided value', function() {
      var result = customAttributeEvaluator.evaluate(semvereqCondition, {});
      assert.isNull(result);
    });
  });

  describe('semver less than or equal to match type', function() {
    var semverleCondition = {
      match: 'semver_le',
      name: 'app_version',
      type: 'custom_attribute',
      value: '2.0.0',
    };

    it('should return false if the user-provided version is greater than the condition version', function() {
      var versions = [
        ['2.0.0', '2.0.1']
      ]
      for (let [targetVersion, userVersion] of versions) {
        var customSemvereqCondition = {
          match: 'semver_le',
          name: 'app_version',
          type: 'custom_attribute',
          value: targetVersion,
        };
        var result = customAttributeEvaluator.evaluate(
          customSemvereqCondition,
          {
            app_version: userVersion,
          }
        );
        assert.isFalse(result, `Got result ${result}. Failed for target version: ${targetVersion} and user version: ${userVersion}`);
      }
    });

    it('should return true if the user-provided version is less than or equal to the condition version', function() {
      var versions = [
        ['2.0.1', '2.0.0'],
        ['2.0.1', '2.0.1'],
        ['1.9', '1.9.1'],
        ['1.9.1', '1.9'],
      ];     for (let [targetVersion, userVersion] of versions) {
        var customSemvereqCondition = {
          match: 'semver_le',
          name: 'app_version',
          type: 'custom_attribute',
          value: targetVersion,
        };
        var result = customAttributeEvaluator.evaluate(
          customSemvereqCondition,
          {
            app_version: userVersion,
          }
        );
        assert.isTrue(result, `Got result ${result}. Failed for target version: ${targetVersion} and user version: ${userVersion}`);
      }
    });

    it('should return true if the user-provided version is equal to the condition version', function() {
      var result = customAttributeEvaluator.evaluate(
        semverleCondition,
        {
          app_version: '2.0',
        }
      );
      assert.isTrue(result);
    });
  });

  describe('semver greater than or equal to match type', function() {
    var semvergeCondition = {
      match: 'semver_ge',
      name: 'app_version',
      type: 'custom_attribute',
      value: '2.0',
    };

    it('should return true if the user-provided version is greater than or equal to the condition version', function() {
      var versions = [
        ['2.0.0', '2.0.1'],
        ['2.0.1', '2.0.1'],
        ['1.9', '1.9.1']
      ];
      for (let [targetVersion, userVersion] of versions) {
        var customSemvereqCondition = {
          match: 'semver_ge',
          name: 'app_version',
          type: 'custom_attribute',
          value: targetVersion,
        };
        var result = customAttributeEvaluator.evaluate(
          customSemvereqCondition,
          {
            app_version: userVersion,
          }
        );
        assert.isTrue(result, `Got result ${result}. Failed for target version: ${targetVersion} and user version: ${userVersion}`);
      }
    });

    it('should return false if the user-provided version is less than the condition version', function() {
      var versions = [
        ['2.0.1', '2.0.0'],
        ['1.9.1', '1.9']
      ];
      for (let [targetVersion, userVersion] of versions) {
        var customSemvereqCondition = {
          match: 'semver_ge',
          name: 'app_version',
          type: 'custom_attribute',
          value: targetVersion,
        };
        var result = customAttributeEvaluator.evaluate(
          customSemvereqCondition,
          {
            app_version: userVersion,
          }
        );
        assert.isFalse(result, `Got result ${result}. Failed for target version: ${targetVersion} and user version: ${userVersion}`);
      }
    });
  });
});
