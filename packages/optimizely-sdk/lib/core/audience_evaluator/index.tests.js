/**
 * Copyright 2016, 2018-2020, Optimizely
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
import sinon from 'sinon';
import { assert } from 'chai';
import { getLogger } from '@optimizely/js-sdk-logging';

import { createAudienceEvaluator } from './index';
import * as conditionTreeEvaluator from '../condition_tree_evaluator';
import * as customAttributeConditionEvaluator from '../custom_attribute_condition_evaluator';

var mockLogger = getLogger();

var chromeUserAudience = {
  conditions: [
    'and',
    {
      name: 'browser_type',
      value: 'chrome',
      type: 'custom_attribute',
    },
  ],
};
var iphoneUserAudience = {
  conditions: [
    'and',
    {
      name: 'device_model',
      value: 'iphone',
      type: 'custom_attribute',
    },
  ],
};
var specialConditionTypeAudience = {
  conditions: [
    'and',
    {
      match: 'interest_level',
      value: 'special',
      type: 'special_condition_type',
    },
  ],
};
var conditionsPassingWithNoAttrs = [
  'not',
  {
    match: 'exists',
    name: 'input_value',
    type: 'custom_attribute',
  },
];
var conditionsPassingWithNoAttrsAudience = {
  conditions: conditionsPassingWithNoAttrs,
};
var audiencesById = {
  0: chromeUserAudience,
  1: iphoneUserAudience,
  2: conditionsPassingWithNoAttrsAudience,
  3: specialConditionTypeAudience,
};

describe('lib/core/audience_evaluator', function() {
  var audienceEvaluator;

  beforeEach(function() {
    sinon.stub(mockLogger, 'log');
  });

  afterEach(function() {
    mockLogger.log.restore();
  });

  describe('APIs', function() {
    context('with default condition evaluator', function() {
      beforeEach(function() {
        audienceEvaluator = createAudienceEvaluator();
      });
      describe('evaluate', function() {
        it('should return true if there are no audiences', function() {
          assert.isTrue(audienceEvaluator.evaluate([], audiencesById, {}));
        });

        it('should return false if there are audiences but no attributes', function() {
          assert.isFalse(audienceEvaluator.evaluate(['0'], audiencesById, {}));
        });

        it('should return true if any of the audience conditions are met', function() {
          var iphoneUsers = {
            device_model: 'iphone',
          };

          var chromeUsers = {
            browser_type: 'chrome',
          };

          var iphoneChromeUsers = {
            browser_type: 'chrome',
            device_model: 'iphone',
          };

          assert.isTrue(audienceEvaluator.evaluate(['0', '1'], audiencesById, iphoneUsers));
          assert.isTrue(audienceEvaluator.evaluate(['0', '1'], audiencesById, chromeUsers));
          assert.isTrue(audienceEvaluator.evaluate(['0', '1'], audiencesById, iphoneChromeUsers));
        });

        it('should return false if none of the audience conditions are met', function() {
          var nexusUsers = {
            device_model: 'nexus5',
          };

          var safariUsers = {
            browser_type: 'safari',
          };

          var nexusSafariUsers = {
            browser_type: 'safari',
            device_model: 'nexus5',
          };

          assert.isFalse(audienceEvaluator.evaluate(['0', '1'], audiencesById, nexusUsers));
          assert.isFalse(audienceEvaluator.evaluate(['0', '1'], audiencesById, safariUsers));
          assert.isFalse(audienceEvaluator.evaluate(['0', '1'], audiencesById, nexusSafariUsers));
        });

        it('should return true if no attributes are passed and the audience conditions evaluate to true in the absence of attributes', function() {
          assert.isTrue(audienceEvaluator.evaluate(['2'], audiencesById));
        });

        describe('complex audience conditions', function() {
          it('should return true if any of the audiences in an "OR" condition pass', function() {
            var result = audienceEvaluator.evaluate(['or', '0', '1'], audiencesById, { browser_type: 'chrome' });
            assert.isTrue(result);
          });

          it('should return true if all of the audiences in an "AND" condition pass', function() {
            var result = audienceEvaluator.evaluate(['and', '0', '1'], audiencesById, {
              browser_type: 'chrome',
              device_model: 'iphone',
            });
            assert.isTrue(result);
          });

          it('should return true if the audience in a "NOT" condition does not pass', function() {
            var result = audienceEvaluator.evaluate(['not', '1'], audiencesById, { device_model: 'android' });
            assert.isTrue(result);
          });
        });

        describe('integration with dependencies', function() {
          var sandbox = sinon.sandbox.create();

          beforeEach(function() {
            sandbox.stub(conditionTreeEvaluator, 'evaluate');
            sandbox.stub(customAttributeConditionEvaluator, 'evaluate');
          });

          afterEach(function() {
            sandbox.restore();
          });

          it('returns true if conditionTreeEvaluator.evaluate returns true', function() {
            conditionTreeEvaluator.evaluate.returns(true);
            var result = audienceEvaluator.evaluate(['or', '0', '1'], audiencesById, { browser_type: 'chrome' });
            assert.isTrue(result);
          });

          it('returns false if conditionTreeEvaluator.evaluate returns false', function() {
            conditionTreeEvaluator.evaluate.returns(false);
            var result = audienceEvaluator.evaluate(['or', '0', '1'], audiencesById, { browser_type: 'safari' });
            assert.isFalse(result);
          });

          it('returns false if conditionTreeEvaluator.evaluate returns null', function() {
            conditionTreeEvaluator.evaluate.returns(null);
            var result = audienceEvaluator.evaluate(['or', '0', '1'], audiencesById, { state: 'California' });
            assert.isFalse(result);
          });

          it('calls customAttributeConditionEvaluator.evaluate in the leaf evaluator for audience conditions', function() {
            conditionTreeEvaluator.evaluate.callsFake(function(conditions, leafEvaluator) {
              return leafEvaluator(conditions[1]);
            });
            customAttributeConditionEvaluator.evaluate.returns(false);
            var userAttributes = { device_model: 'android' };
            var result = audienceEvaluator.evaluate(['or', '1'], audiencesById, userAttributes);
            sinon.assert.calledOnce(customAttributeConditionEvaluator.evaluate);
            sinon.assert.calledWithExactly(
              customAttributeConditionEvaluator.evaluate,
              iphoneUserAudience.conditions[1],
              userAttributes,
            );
            assert.isFalse(result);
          });
        });

        describe('Audience evaluation logging', function() {
          var sandbox = sinon.sandbox.create();

          beforeEach(function() {
            sandbox.stub(conditionTreeEvaluator, 'evaluate');
            sandbox.stub(customAttributeConditionEvaluator, 'evaluate');
          });

          afterEach(function() {
            sandbox.restore();
          });

          it('logs correctly when conditionTreeEvaluator.evaluate returns null', function() {
            conditionTreeEvaluator.evaluate.callsFake(function(conditions, leafEvaluator) {
              return leafEvaluator(conditions[1]);
            });
            customAttributeConditionEvaluator.evaluate.returns(null);
            var userAttributes = { device_model: 5.5 };
            var result = audienceEvaluator.evaluate(['or', '1'], audiencesById, userAttributes);
            sinon.assert.calledOnce(customAttributeConditionEvaluator.evaluate);
            sinon.assert.calledWithExactly(
              customAttributeConditionEvaluator.evaluate,
              iphoneUserAudience.conditions[1],
              userAttributes,
            );
            assert.isFalse(result);
            assert.strictEqual(2, mockLogger.log.callCount);
            assert.strictEqual(
              mockLogger.log.args[0][1],
              'AUDIENCE_EVALUATOR: Starting to evaluate audience "1" with conditions: ["and",{"name":"device_model","value":"iphone","type":"custom_attribute"}].'
            );
            assert.strictEqual(mockLogger.log.args[1][1], 'AUDIENCE_EVALUATOR: Audience "1" evaluated to UNKNOWN.');
          });

          it('logs correctly when conditionTreeEvaluator.evaluate returns true', function() {
            conditionTreeEvaluator.evaluate.callsFake(function(conditions, leafEvaluator) {
              return leafEvaluator(conditions[1]);
            });
            customAttributeConditionEvaluator.evaluate.returns(true);
            var userAttributes = { device_model: 'iphone' };
            var result = audienceEvaluator.evaluate(['or', '1'], audiencesById, userAttributes);
            sinon.assert.calledOnce(customAttributeConditionEvaluator.evaluate);
            sinon.assert.calledWithExactly(
              customAttributeConditionEvaluator.evaluate,
              iphoneUserAudience.conditions[1],
              userAttributes,
            );
            assert.isTrue(result);
            assert.strictEqual(2, mockLogger.log.callCount);
            assert.strictEqual(
              mockLogger.log.args[0][1],
              'AUDIENCE_EVALUATOR: Starting to evaluate audience "1" with conditions: ["and",{"name":"device_model","value":"iphone","type":"custom_attribute"}].'
            );
            assert.strictEqual(mockLogger.log.args[1][1], 'AUDIENCE_EVALUATOR: Audience "1" evaluated to TRUE.');
          });

          it('logs correctly when conditionTreeEvaluator.evaluate returns false', function() {
            conditionTreeEvaluator.evaluate.callsFake(function(conditions, leafEvaluator) {
              return leafEvaluator(conditions[1]);
            });
            customAttributeConditionEvaluator.evaluate.returns(false);
            var userAttributes = { device_model: 'android' };
            var result = audienceEvaluator.evaluate(['or', '1'], audiencesById, userAttributes);
            sinon.assert.calledOnce(customAttributeConditionEvaluator.evaluate);
            sinon.assert.calledWithExactly(
              customAttributeConditionEvaluator.evaluate,
              iphoneUserAudience.conditions[1],
              userAttributes,
            );
            assert.isFalse(result);
            assert.strictEqual(2, mockLogger.log.callCount);
            assert.strictEqual(
              mockLogger.log.args[0][1],
              'AUDIENCE_EVALUATOR: Starting to evaluate audience "1" with conditions: ["and",{"name":"device_model","value":"iphone","type":"custom_attribute"}].'
            );
            assert.strictEqual(mockLogger.log.args[1][1], 'AUDIENCE_EVALUATOR: Audience "1" evaluated to FALSE.');
          });
        });
      });
    });

    context('with additional custom condition evaluator', function() {
      describe('when passing a valid additional evaluator', function() {
        beforeEach(function() {
          const mockEnvironment = {
            special: true,
          };
          audienceEvaluator = createAudienceEvaluator({
            special_condition_type: {
              evaluate: function(condition, userAttributes) {
                const result = mockEnvironment[condition.value] && userAttributes[condition.match] > 0;
                return result;
              },
            },
          });
        });

        it('should evaluate an audience properly using the custom condition evaluator', function() {
          assert.isFalse(audienceEvaluator.evaluate(['3'], audiencesById, { interest_level: 0 }));
          assert.isTrue(audienceEvaluator.evaluate(['3'], audiencesById, { interest_level: 1 }));
        });
      });

      describe('when passing an invalid additional evaluator', function() {
        beforeEach(function() {
          audienceEvaluator = createAudienceEvaluator({
            custom_attribute: {
              evaluate: function() {
                return false;
              },
            },
          });
        });

        it('should not be able to overwrite built in `custom_attribute` evaluator', function() {
          assert.isTrue(
            audienceEvaluator.evaluate(['0'], audiencesById, {
              browser_type: 'chrome',
            })
          );
        });
      });
    });
  });
});
